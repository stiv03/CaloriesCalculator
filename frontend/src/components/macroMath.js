// frontend/src/components/macroMath.js
/**
 * Compute SVG stroke-dashoffset for a progress ring.
 * @param {number} value      Eaten amount.
 * @param {number} goal       Daily goal.
 * @param {number} circumference   2 * pi * r of the ring.
 * @returns {number} dashoffset in user units. 0 = full ring; circumference = empty.
 */
export function ringDashOffset(value, goal, circumference) {
  if (!goal || goal <= 0) return circumference;
  const pct = Math.min(value / goal, 1);
  return circumference * (1 - pct);
}

/** Used for color-coding. Mirrors the original CaloriesCalculator over-limit logic. */
export function statusForPercent(value, goal) {
  if (!goal || goal <= 0) return 'under';
  const pct = (value / goal) * 100;
  if (pct > 105) return 'over';
  if (pct >= 100) return 'near';
  return 'under';
}
