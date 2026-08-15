// frontend/src/features/workout/nextUp.js

/**
 * Decide which workout day is "up next" given the plan and logged history.
 *
 * The plan (`templates`) is a fixed rotation in `sortOrder` (e.g. Push, Pull,
 * Legs, Chest & Back, Arms, Legs 2). "Up next" is the day that follows the most
 * recently logged one in that order, wrapping around after the last day.
 *
 * A logged workout is matched to a template by `templateId`; older logs without
 * one fall back to matching `exerciseType` + `label` (the same rule used
 * elsewhere in WorkoutPage).
 *
 * @param {Array} templates  plan days; each { id, exerciseType, label, sortOrder }
 * @param {Array} history    logged workouts, NEWEST-FIRST; each { templateId, exerciseType, label, date, isRestDay }
 * @returns {number|null} the template id that is up next, or null if there is no plan.
 */
export function nextUpTemplateId(templates, history) {
  if (!templates || templates.length === 0) return null;

  // Plan order by sortOrder (stable on id as a tiebreak), mirroring the list UI.
  const ordered = [...templates].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id - b.id),
  );

  const matches = (w, t) =>
    w.templateId === t.id ||
    (w.templateId == null &&
      w.exerciseType === t.exerciseType &&
      (w.label || '') === (t.label || ''));

  // history is newest-first — find the most recent real (non-rest) workout that
  // maps to a day still in the plan.
  let lastIdx = -1;
  for (const w of history || []) {
    if (w.isRestDay) continue;
    const idx = ordered.findIndex((t) => matches(w, t));
    if (idx !== -1) { lastIdx = idx; break; }
  }

  // No history (or nothing matches the current plan) → start at the first day.
  if (lastIdx === -1) return ordered[0].id;

  const nextIdx = (lastIdx + 1) % ordered.length;
  return ordered[nextIdx].id;
}
