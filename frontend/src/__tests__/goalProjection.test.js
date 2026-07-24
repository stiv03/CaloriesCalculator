// frontend/src/__tests__/goalProjection.test.js
import { computeGoalETA } from '../features/profile/goalProjection';

const today = new Date('2026-06-01T00:00:00');

describe('computeGoalETA', () => {
  test('no goal set → no-goal', () => {
    expect(computeGoalETA({ weightRecords: [], goalWeight: null, today }).status).toBe('no-goal');
  });

  test('fewer than 2 weekly averages → insufficient', () => {
    const records = [{ date: '2026-05-25', weight: 80 }];
    expect(computeGoalETA({ weightRecords: records, goalWeight: 75, today }).status).toBe('insufficient');
  });

  test('already at goal → reached', () => {
    const records = [
      { date: '2026-05-18', weight: 75.1 },
      { date: '2026-05-25', weight: 75.0 },
    ];
    expect(computeGoalETA({ weightRecords: records, goalWeight: 75, today }).status).toBe('reached');
  });

  test('cutting toward a lower goal → on-track with future ETA', () => {
    // ~ -1 kg/week over three weeks: 82 -> 81 -> 80, goal 78.
    const records = [
      { date: '2026-05-11', weight: 82 },
      { date: '2026-05-18', weight: 81 },
      { date: '2026-05-25', weight: 80 },
    ];
    const r = computeGoalETA({ weightRecords: records, goalWeight: 78, today });
    expect(r.status).toBe('on-track');
    expect(r.rateKgPerWeek).toBeCloseTo(-1, 1);
    // gap = 78 - 80 = -2, rate -1 → ~2 weeks out.
    expect(r.weeksToGoal).toBeCloseTo(2, 0);
    expect(r.etaDate > '2026-06-01').toBe(true);
  });

  test('gaining while goal is below current → wrong-direction', () => {
    const records = [
      { date: '2026-05-11', weight: 80 },
      { date: '2026-05-18', weight: 81 },
      { date: '2026-05-25', weight: 82 },
    ];
    const r = computeGoalETA({ weightRecords: records, goalWeight: 78, today });
    expect(r.status).toBe('wrong-direction');
  });

  test('flat trend → stalled (no bogus ETA)', () => {
    const records = [
      { date: '2026-05-11', weight: 80 },
      { date: '2026-05-18', weight: 80 },
      { date: '2026-05-25', weight: 80 },
    ];
    const r = computeGoalETA({ weightRecords: records, goalWeight: 78, today });
    expect(r.status).toBe('stalled');
    expect(r.etaDate).toBeUndefined();
  });

  test('bulking toward a higher goal → on-track', () => {
    const records = [
      { date: '2026-05-11', weight: 70 },
      { date: '2026-05-18', weight: 70.5 },
      { date: '2026-05-25', weight: 71 },
    ];
    const r = computeGoalETA({ weightRecords: records, goalWeight: 73, today });
    expect(r.status).toBe('on-track');
    expect(r.rateKgPerWeek).toBeGreaterThan(0);
    expect(r.weeksToGoal).toBeGreaterThan(0);
  });

  test('two consecutive weeks report the true week-over-week rate', () => {
    // Reproduces the reported bug: last week 84.75, this week 88.50, goal 95.
    // The rate must equal the +3.75 kg/wk the weekly card shows — not an
    // inflated regression artifact.
    const records = [
      { date: '2026-06-15', weight: 84.75 }, // week 15-21.06
      { date: '2026-06-22', weight: 88.50 }, // week 22-28.06
    ];
    const r = computeGoalETA({ weightRecords: records, goalWeight: 95, today: new Date('2026-06-24T00:00:00') });
    expect(r.status).toBe('on-track');
    expect(r.rateKgPerWeek).toBeCloseTo(3.75, 2);
    expect(r.weeksToGoal).toBeCloseTo(1.73, 1);
  });

  test('a long logging gap does NOT inflate the rate', () => {
    // An old data point months before two recent consecutive weeks must be
    // ignored (the trailing consecutive run is used), so no absurd rate.
    const records = [
      { date: '2026-01-05', weight: 70 },    // months earlier — a gap follows
      { date: '2026-06-15', weight: 84.75 },
      { date: '2026-06-22', weight: 88.50 },
    ];
    const r = computeGoalETA({ weightRecords: records, goalWeight: 95, today: new Date('2026-06-24T00:00:00') });
    expect(r.status).toBe('on-track');
    expect(r.rateKgPerWeek).toBeCloseTo(3.75, 2); // from the recent run, not the gap
  });

  test('implausibly steep rate is rejected, not shown as an ETA', () => {
    const records = [
      { date: '2026-06-15', weight: 70 },
      { date: '2026-06-22', weight: 85 }, // +15 kg in one week → not credible
    ];
    const r = computeGoalETA({ weightRecords: records, goalWeight: 95, today: new Date('2026-06-24T00:00:00') });
    expect(r.status).toBe('insufficient');
    expect(r.etaDate).toBeUndefined();
  });
});
