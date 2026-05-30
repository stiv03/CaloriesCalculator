// frontend/src/__tests__/weeklyAverages.test.js
import { computeWeeklyAverages } from '../features/profile/weeklyAverages';

describe('computeWeeklyAverages', () => {
  test('empty input → all null', () => {
    expect(computeWeeklyAverages([])).toEqual({ thisWeek: null, lastWeek: null, diff: null });
  });

  test('only this week → lastWeek null, diff null', () => {
    const records = [
      { date: '2026-05-25', weight: 80 }, // Mon
      { date: '2026-05-26', weight: 80.5 },
    ];
    const r = computeWeeklyAverages(records);
    expect(r.thisWeek).toBeCloseTo(80.25);
    expect(r.lastWeek).toBeNull();
    expect(r.diff).toBeNull();
  });

  test('this and last week → diff is thisWeek - lastWeek', () => {
    // Anchor: 2026-05-30 (Sat). ISO week starts Mon 2026-05-25.
    // Last week: 2026-05-18 .. 2026-05-24.
    const records = [
      { date: '2026-05-19', weight: 80 },
      { date: '2026-05-20', weight: 80 },
      { date: '2026-05-26', weight: 79 },
      { date: '2026-05-30', weight: 79 },
    ];
    const r = computeWeeklyAverages(records);
    expect(r.thisWeek).toBeCloseTo(79);
    expect(r.lastWeek).toBeCloseTo(80);
    expect(r.diff).toBeCloseTo(-1);
  });
});
