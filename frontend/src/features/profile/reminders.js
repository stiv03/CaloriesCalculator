// frontend/src/features/profile/reminders.js

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
};

export function needsWeightReminder(lastDateStr) {
  const days = daysSince(lastDateStr);
  return days != null && days >= 1;
}

export function needsMeasurementReminder(lastDateStr) {
  const days = daysSince(lastDateStr);
  return days != null && days >= 7;
}
