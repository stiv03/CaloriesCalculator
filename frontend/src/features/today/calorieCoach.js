// frontend/src/features/today/calorieCoach.js
//
// Suggests a calorie-goal adjustment by comparing the recent weekly weight
// trend against the rate the user's status implies. Pure and testable — no
// React, no I/O.

const KCAL_STEP = 150;

/**
 * Target weekly weight-change band (kg/week) per status. Bulks aim positive,
 * cuts aim negative. Below the band's `min` magnitude = too slow / stalled;
 * above `max` = too fast.
 */
export const RATE_BANDS = {
  SLOW_BULK:   { min: 0.10, max: 0.20, dir: 1 },
  NORMAL_BULK: { min: 0.20, max: 0.35, dir: 1 },
  FAST_BULK:   { min: 0.35, max: 0.50, dir: 1 },
  SLOW_CUT:    { min: 0.20, max: 0.40, dir: -1 },
  NORMAL_CUT:  { min: 0.40, max: 0.60, dir: -1 },
  FAST_CUT:    { min: 0.60, max: 0.90, dir: -1 },
};

// Maintain: acceptable drift, and the point beyond which we nudge back to flat.
const MAINTAIN_DRIFT = 0.30;

/**
 * @param {object} args
 * @param {string} args.status        e.g. "NORMAL_BULK" (enum name)
 * @param {number|null} args.weeklyDiff  this-week minus last-week avg (kg). null = not enough data.
 * @param {number} args.currentCalories current calorie goal
 * @returns {null | { direction:'up'|'down', delta:number, newCalories:number, reason:string }}
 */
export function computeCalorieSuggestion({ status, weeklyDiff, currentCalories }) {
  if (weeklyDiff == null || Number.isNaN(weeklyDiff)) return null; // need 2 weeks
  if (!currentCalories || currentCalories <= 0) return null;
  const s = (status || '').toUpperCase();

  const up = () => ({
    direction: 'up', delta: KCAL_STEP,
    newCalories: currentCalories + KCAL_STEP,
  });
  const down = () => ({
    direction: 'down', delta: KCAL_STEP,
    newCalories: Math.max(0, currentCalories - KCAL_STEP),
  });

  if (s === 'MAINTAINING') {
    if (weeklyDiff > MAINTAIN_DRIFT) return { ...down(), reason: `Weight drifting up (${fmt(weeklyDiff)}/wk) — trim ${KCAL_STEP} kcal to hold steady` };
    if (weeklyDiff < -MAINTAIN_DRIFT) return { ...up(), reason: `Weight drifting down (${fmt(weeklyDiff)}/wk) — add ${KCAL_STEP} kcal to hold steady` };
    return null;
  }

  const band = RATE_BANDS[s];
  if (!band) return null; // unknown status

  // Signed rate in the intended direction (positive = progressing as intended).
  const progress = weeklyDiff * band.dir;

  if (progress < band.min) {
    // Too slow / stalled → push harder toward the goal.
    if (band.dir > 0) return { ...up(), reason: `Bulking but only ${fmt(weeklyDiff)}/wk — add ${KCAL_STEP} kcal to progress` };
    return { ...down(), reason: `Cutting but only ${fmt(weeklyDiff)}/wk — cut ${KCAL_STEP} kcal to progress` };
  }
  if (progress > band.max) {
    // Too fast → ease off.
    if (band.dir > 0) return { ...down(), reason: `Gaining fast (${fmt(weeklyDiff)}/wk) — ease off ${KCAL_STEP} kcal` };
    return { ...up(), reason: `Losing fast (${fmt(weeklyDiff)}/wk) — add ${KCAL_STEP} kcal to slow it` };
  }
  return null; // in band
}

/** Rescale macros proportionally to a new calorie target. Returns a GoalDTO shape. */
export function rescaleMacros(goal, newCalories) {
  const oldCals = goal?.calories || 0;
  if (oldCals > 0) {
    const k = newCalories / oldCals;
    return {
      calories: Math.round(newCalories),
      protein: round1((goal.protein || 0) * k),
      carbs: round1((goal.carbs || 0) * k),
      fat: round1((goal.fat || 0) * k),
    };
  }
  // No prior macros to scale — fall back to a standard split.
  const protein = round1((newCalories * 0.30) / 4);
  const fat = round1((newCalories * 0.25) / 9);
  const carbs = round1((newCalories - (protein * 4 + fat * 9)) / 4);
  return { calories: Math.round(newCalories), protein, carbs, fat };
}

/** Coarse signature for snoozing: status + rounded trend + calories. */
/**
 * Coarse signature for snoozing, keyed on status + rounded trend only — NOT
 * calories. Applying an adjustment changes calories but not the weight trend,
 * so keeping calories out means "Apply" and "Dismiss" both suppress the nudge
 * until the trend itself moves (new weight data), instead of the banner
 * re-firing against the same stale trend after every apply.
 */
export function suggestionSignature(status, weeklyDiff) {
  const d = weeklyDiff == null ? 'na' : (Math.round(weeklyDiff / 0.05) * 0.05).toFixed(2);
  return `${(status || '').toUpperCase()}|${d}`;
}

const fmt = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2)} kg`;
const round1 = (n) => Math.round(n * 10) / 10;
