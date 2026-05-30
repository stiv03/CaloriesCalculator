// frontend/src/features/profile/weeklyAverages.js

const toMidnight = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

const startOfISOWeek = (d) => {
  const x = toMidnight(d);
  const day = x.getDay() || 7; // Sun=0 -> 7
  x.setDate(x.getDate() - (day - 1));
  return x;
};

const formatWeekRange = (start, end) => {
  const pad = (n) => String(n).padStart(2, '0');
  const sDay = pad(start.getDate());
  const sMonth = pad(start.getMonth() + 1);
  const eDay = pad(end.getDate());
  const eMonth = pad(end.getMonth() + 1);
  return `${sDay}-${eDay}.${sMonth}.${start.getFullYear()}`;
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
  let m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(str);
  if (m) { const [, dd, mm, yyyy] = m; return toMidnight(new Date(`${yyyy}-${mm}-${dd}T00:00:00`)); }
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (m) { const [, dd, mm, yyyy] = m; return toMidnight(new Date(`${yyyy}-${mm}-${dd}T00:00:00`)); }
  const d = new Date(str.replace(' ', 'T'));
  return isNaN(d) ? null : toMidnight(d);
};

export function computeWeeklyAverages(records) {
  if (!records || records.length === 0) {
    return { thisWeek: null, lastWeek: null, diff: null };
  }

  const parsed = [];
  for (const r of records) {
    const d = parseDateLoose(r?.date);
    const w = parseFloat(r?.weight);
    if (d && !Number.isNaN(w)) parsed.push({ d, w });
  }
  if (!parsed.length) return { thisWeek: null, lastWeek: null, diff: null };

  const latestDate = new Date(Math.max(...parsed.map((p) => +p.d)));
  const startThis = startOfISOWeek(latestDate);
  const endThis = new Date(startThis); endThis.setDate(startThis.getDate() + 7);
  const startLast = new Date(startThis); startLast.setDate(startThis.getDate() - 7);
  const endLast = new Date(startThis);

  const thisWeek = [];
  const lastWeek = [];
  for (const p of parsed) {
    if (p.d >= startThis && p.d < endThis) thisWeek.push(p.w);
    else if (p.d >= startLast && p.d < endLast) lastWeek.push(p.w);
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const aThis = avg(thisWeek);
  const aLast = avg(lastWeek);
  const diff = aThis != null && aLast != null ? aThis - aLast : null;

  return {
    thisWeek: aThis,
    lastWeek: aLast,
    diff,
    rangeThis: formatWeekRange(startThis, new Date(endThis.getTime() - 1)),
    rangeLast: formatWeekRange(startLast, new Date(endLast.getTime() - 1)),
  };
}
