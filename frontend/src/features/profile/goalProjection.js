// frontend/src/features/profile/goalProjection.js
//
// Projects when a user will reach their goal weight, based on the trend of
// recent *weekly* average weights (not noisy daily points). Pure and
// testable: `today` is injected, so no Date.now() in the core path.
//
// Returns one of these shapes:
//   { status: 'no-goal' }                          — no goalWeight set
//   { status: 'insufficient' }                     — <2 weekly averages to fit a trend
//   { status: 'reached' }                          — already at/past the goal
//   { status: 'stalled', rateKgPerWeek }           — trend ~flat, never converges
//   { status: 'wrong-direction', rateKgPerWeek }   — trend moves away from the goal
//   { status: 'on-track', rateKgPerWeek, weeksToGoal, etaDate: 'YYYY-MM-DD' }

const MS_PER_DAY = 86400000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MAX_WEEKS = 6;         // fit the slope over at most the last N weeks
const FLAT_EPS = 0.02;       // |kg/week| below this counts as "stalled"
const MAX_RATE = 5;          // sanity clamp: a real weekly weight trend never exceeds this (kg/week)

const toMidnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const startOfISOWeek = (d) => {
  const x = toMidnight(d);
  const day = x.getDay() || 7; // Sun=0 -> 7
  x.setDate(x.getDate() - (day - 1));
  return x;
};

const parseDateLoose = (s) => {
  if (s == null) return null;
  if (s instanceof Date && !isNaN(s)) return toMidnight(s);
  if (typeof s !== 'string') return null;
  const str = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return toMidnight(new Date(`${str}T00:00:00`));
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return toMidnight(new Date(str.replace(' ', 'T')));
  }
  const d = new Date(str.replace(' ', 'T'));
  return isNaN(d) ? null : toMidnight(d);
};

const isoKey = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Collapse records into one average per ISO week, sorted ascending by week start. */
function weeklyAverages(records) {
  const buckets = new Map(); // weekStartMs -> { sum, n }
  for (const r of records || []) {
    const d = parseDateLoose(r?.date);
    const w = parseFloat(r?.weight);
    if (!d || Number.isNaN(w)) continue;
    const key = +startOfISOWeek(d);
    const b = buckets.get(key) || { sum: 0, n: 0 };
    b.sum += w; b.n += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekStartMs, b]) => ({ weekStartMs, avg: b.sum / b.n }));
}

/**
 * Least-squares slope in kg per week, using each point's REAL time offset (in
 * weeks, from the first point) as x — NOT the array index. This matters when
 * logging has gaps: two weekly averages recorded months apart must not be
 * treated as one week apart, or the fitted rate explodes. Returns 0 for <2
 * points or a zero time span.
 */
function slopePerWeek(points) {
  const n = points.length;
  if (n < 2) return 0;
  const t0 = points[0].weekStartMs;
  const xs = points.map((p) => (p.weekStartMs - t0) / MS_PER_WEEK);
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  points.forEach((p, i) => {
    const x = xs[i];
    sx += x; sy += p.avg; sxy += x * p.avg; sxx += x * x;
  });
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}

/**
 * Take the trailing run of consecutive weekly points (each within ~10 days of
 * the previous, to tolerate slightly irregular logging), capped at `max`.
 * Walking backwards from the newest week, stop at the first gap.
 */
function trailingConsecutive(weeks, max) {
  if (weeks.length === 0) return [];
  const out = [weeks[weeks.length - 1]];
  for (let i = weeks.length - 2; i >= 0 && out.length < max; i--) {
    const gapMs = out[0].weekStartMs - weeks[i].weekStartMs;
    if (gapMs > 0 && gapMs <= Math.round(MS_PER_WEEK * 1.5)) {
      out.unshift(weeks[i]);
    } else {
      break; // gap → stop; older weeks aren't part of the current run
    }
  }
  return out;
}

/**
 * Smoothed weekly weight-change rate (kg/week) over the trailing run of
 * consecutive weekly averages — the same least-squares slope the goal ETA
 * uses. Returns null when there are fewer than 2 consecutive weeks of data, so
 * it never reports a rate off a single point. Not sanity-capped: callers decide
 * how to treat extreme values.
 */
export function computeWeeklyRate(weightRecords) {
  const weeks = weeklyAverages(weightRecords);
  const consecutive = trailingConsecutive(weeks, MAX_WEEKS);
  if (consecutive.length < 2) return null;
  return slopePerWeek(consecutive);
}

export function computeGoalETA({ weightRecords, goalWeight, today }) {
  if (goalWeight == null || Number.isNaN(parseFloat(goalWeight))) {
    return { status: 'no-goal' };
  }
  const goal = parseFloat(goalWeight);

  const weeks = weeklyAverages(weightRecords);
  if (weeks.length < 2) return { status: 'insufficient' };

  // Current position = most recent weekly average.
  const current = weeks[weeks.length - 1].avg;

  // Already there? (within half a kg either side.)
  if (Math.abs(current - goal) <= 0.5) return { status: 'reached' };

  // Use only the trailing run of *consecutive* weeks (each ~1 week after the
  // previous). A gap resets the run, so a fit is never stretched across a
  // logging break — that was producing absurd rates like +23 kg/week.
  const consecutive = trailingConsecutive(weeks, MAX_WEEKS);
  if (consecutive.length < 2) return { status: 'insufficient' };

  const rateKgPerWeek = slopePerWeek(consecutive);

  if (Math.abs(rateKgPerWeek) < FLAT_EPS) {
    return { status: 'stalled', rateKgPerWeek };
  }
  // Sanity guard: a genuine weekly weight trend never exceeds a few kg/week.
  // Anything larger means noisy/sparse data — don't fabricate an ETA.
  if (Math.abs(rateKgPerWeek) > MAX_RATE) {
    return { status: 'insufficient', rateKgPerWeek };
  }

  const gap = goal - current;                 // +ve: need to gain, -ve: need to lose
  // Trend must move toward the goal: sign of rate must match sign of gap.
  if (Math.sign(rateKgPerWeek) !== Math.sign(gap)) {
    return { status: 'wrong-direction', rateKgPerWeek };
  }

  const weeksToGoal = gap / rateKgPerWeek;     // guaranteed > 0 by the sign check
  if (!Number.isFinite(weeksToGoal) || weeksToGoal <= 0) {
    return { status: 'stalled', rateKgPerWeek };
  }

  const base = today ? toMidnight(today) : startOfISOWeek(new Date(consecutive[consecutive.length - 1].weekStartMs));
  const eta = new Date(+base + Math.round(weeksToGoal * 7) * MS_PER_DAY);

  return {
    status: 'on-track',
    rateKgPerWeek,
    weeksToGoal,
    etaDate: isoKey(eta),
  };
}
