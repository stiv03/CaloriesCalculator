// frontend/src/__tests__/reminders.test.js
import { needsWeightReminder, needsMeasurementReminder } from '../features/profile/reminders';

describe('needsWeightReminder', () => {
  test('null/undefined → false', () => {
    expect(needsWeightReminder(null)).toBe(false);
    expect(needsWeightReminder(undefined)).toBe(false);
  });
  test('today → false', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(needsWeightReminder(today)).toBe(false);
  });
  test('yesterday or earlier → true', () => {
    const y = new Date(); y.setDate(y.getDate() - 2);
    expect(needsWeightReminder(y.toISOString().slice(0, 10))).toBe(true);
  });
});

describe('needsMeasurementReminder', () => {
  test('null → false', () => {
    expect(needsMeasurementReminder(null)).toBe(false);
  });
  test('within last 6 days → false', () => {
    const d = new Date(); d.setDate(d.getDate() - 5);
    expect(needsMeasurementReminder(d.toISOString().slice(0, 10))).toBe(false);
  });
  test('7+ days ago → true', () => {
    const d = new Date(); d.setDate(d.getDate() - 8);
    expect(needsMeasurementReminder(d.toISOString().slice(0, 10))).toBe(true);
  });
});
