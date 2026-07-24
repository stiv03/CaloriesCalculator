// frontend/src/features/calendar/weeklySummary.js
// Pure aggregation of a week's worth of CalendarDayDTO objects into the numbers
// shown in the weekly progress dashboard. No side effects, no fetching — the
// caller passes the 7 day objects (some may be undefined for unlogged days).

/** Round to `d` decimals, returning a Number. */
function round(n, d = 0) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * @param {Array<object|undefined>} days  up to 7 CalendarDayDTO-shaped objects
 * @returns {{
 *   avgCalories: number|null, calorieGoal: number|null, daysLogged: number,
 *   weightChange: number|null, weighIns: number,
 *   workouts: number, restDays: number,
 *   avgProtein: number|null,
 *   suppTakenPct: number|null,
 *   insight: string|null
 * }}
 */
export function computeWeeklySummary(days) {
  const list = (days || []).filter(Boolean);

  // Calories — only count days that actually logged food (calories > 0).
  const calDays = list.filter((d) => (d.calories || 0) > 0);
  const daysLogged = calDays.length;
  const avgCalories = daysLogged
    ? round(calDays.reduce((s, d) => s + d.calories, 0) / daysLogged)
    : null;
  // Goal: use the most recent non-null calorieGoal seen in the week.
  const goalDay = [...list].reverse().find((d) => d.calorieGoal != null && d.calorieGoal > 0);
  const calorieGoal = goalDay ? goalDay.calorieGoal : null;

  // Weight — change from first to last weigh-in in the week.
  const weighs = list.filter((d) => d.weight != null);
  const weighIns = weighs.length;
  const weightChange = weighIns >= 2
    ? round(weighs[weighs.length - 1].weight - weighs[0].weight, 1)
    : null;

  // Training.
  const workouts = list.filter((d) => d.hasWorkout && !d.isRestDay).length;
  const restDays = list.filter((d) => d.isRestDay).length;

  // Protein — average over days that logged food.
  const proteinDays = calDays.filter((d) => d.protein != null);
  const avgProtein = proteinDays.length
    ? round(proteinDays.reduce((s, d) => s + d.protein, 0) / proteinDays.length)
    : null;

  // Supplements — taken / scheduled across days that had a routine.
  const suppDays = list.filter((d) => d.hasSupplementRoutine && d.supplementsTotal > 0);
  const suppTotal = suppDays.reduce((s, d) => s + d.supplementsTotal, 0);
  const suppTaken = suppDays.reduce((s, d) => s + d.supplementsTaken, 0);
  const suppTakenPct = suppTotal > 0 ? round((suppTaken / suppTotal) * 100) : null;

  return {
    avgCalories, calorieGoal, daysLogged,
    weightChange, weighIns,
    workouts, restDays,
    avgProtein,
    suppTakenPct,
    insight: buildInsight({
      daysLogged, avgCalories, calorieGoal, weightChange, workouts,
    }),
  };
}

/** One short, plain-language takeaway. Picks the most notable single fact. */
function buildInsight({ daysLogged, avgCalories, calorieGoal, weightChange, workouts }) {
  if (daysLogged === 0) return 'No meals logged this week yet.';
  if (daysLogged >= 6) return `Logged ${daysLogged}/7 days — great consistency.`;

  if (calorieGoal && avgCalories != null) {
    const diff = avgCalories - calorieGoal;
    if (diff > 200) return `Averaging ${Math.round(diff)} kcal over your goal this week.`;
    if (diff < -200) return `Averaging ${Math.round(-diff)} kcal under your goal this week.`;
  }
  if (weightChange != null && weightChange !== 0) {
    const dir = weightChange < 0 ? 'down' : 'up';
    return `Weight ${dir} ${Math.abs(weightChange)} kg over the week.`;
  }
  if (workouts >= 3) return `${workouts} workouts this week — strong training week.`;
  if (daysLogged > 0) return `Logged ${daysLogged}/7 days this week.`;
  return null;
}
