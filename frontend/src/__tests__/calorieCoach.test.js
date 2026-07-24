// frontend/src/__tests__/calorieCoach.test.js
import { computeCalorieSuggestion, rescaleMacros, suggestionSignature } from '../features/today/calorieCoach';

const base = { currentCalories: 2000 };

describe('computeCalorieSuggestion', () => {
  test('needs 2 weeks — null weeklyDiff → null', () => {
    expect(computeCalorieSuggestion({ status: 'NORMAL_BULK', weeklyDiff: null, ...base })).toBeNull();
  });

  test('no calorie goal → null', () => {
    expect(computeCalorieSuggestion({ status: 'NORMAL_BULK', weeklyDiff: 0.05, currentCalories: 0 })).toBeNull();
  });

  test('normal bulk stalled (+0.05) → add 150', () => {
    const r = computeCalorieSuggestion({ status: 'NORMAL_BULK', weeklyDiff: 0.05, ...base });
    expect(r.direction).toBe('up');
    expect(r.newCalories).toBe(2150);
  });

  test('normal bulk in band (+0.25) → null', () => {
    expect(computeCalorieSuggestion({ status: 'NORMAL_BULK', weeklyDiff: 0.25, ...base })).toBeNull();
  });

  test('normal bulk too fast (+0.70) → reduce 150', () => {
    const r = computeCalorieSuggestion({ status: 'NORMAL_BULK', weeklyDiff: 0.70, ...base });
    expect(r.direction).toBe('down');
    expect(r.newCalories).toBe(1850);
  });

  test('normal cut too slow (-0.10) → cut 150 (deeper deficit)', () => {
    const r = computeCalorieSuggestion({ status: 'NORMAL_CUT', weeklyDiff: -0.10, ...base });
    expect(r.direction).toBe('down');
    expect(r.newCalories).toBe(1850);
  });

  test('normal cut in band (-0.50) → null', () => {
    expect(computeCalorieSuggestion({ status: 'NORMAL_CUT', weeklyDiff: -0.50, ...base })).toBeNull();
  });

  test('fast cut too fast (-1.20) → add 150 to slow it', () => {
    const r = computeCalorieSuggestion({ status: 'FAST_CUT', weeklyDiff: -1.20, ...base });
    expect(r.direction).toBe('up');
    expect(r.newCalories).toBe(2150);
  });

  test('cut but GAINING (+0.20) → still too slow → cut', () => {
    const r = computeCalorieSuggestion({ status: 'SLOW_CUT', weeklyDiff: 0.20, ...base });
    expect(r.direction).toBe('down');
  });

  test('maintain small drift (+0.05) → null', () => {
    expect(computeCalorieSuggestion({ status: 'MAINTAINING', weeklyDiff: 0.05, ...base })).toBeNull();
  });

  test('maintain gaining (+0.40) → reduce', () => {
    const r = computeCalorieSuggestion({ status: 'MAINTAINING', weeklyDiff: 0.40, ...base });
    expect(r.direction).toBe('down');
  });

  test('maintain losing (-0.40) → add', () => {
    const r = computeCalorieSuggestion({ status: 'MAINTAINING', weeklyDiff: -0.40, ...base });
    expect(r.direction).toBe('up');
  });

  test('unknown status → null', () => {
    expect(computeCalorieSuggestion({ status: 'FROBNICATE', weeklyDiff: 0.5, ...base })).toBeNull();
  });
});

describe('rescaleMacros', () => {
  test('scales macros proportionally', () => {
    const g = { calories: 2000, protein: 150, carbs: 200, fat: 60 };
    const r = rescaleMacros(g, 2150); // ×1.075
    expect(r.calories).toBe(2150);
    expect(r.protein).toBeCloseTo(161.3, 0);
    expect(r.carbs).toBeCloseTo(215, 0);
    expect(r.fat).toBeCloseTo(64.5, 0);
  });

  test('falls back to a split when old calories are 0', () => {
    const r = rescaleMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 }, 2000);
    expect(r.calories).toBe(2000);
    expect(r.protein).toBeGreaterThan(0);
    expect(r.carbs).toBeGreaterThan(0);
    expect(r.fat).toBeGreaterThan(0);
  });
});

describe('suggestionSignature', () => {
  test('same trend → same signature; different → different; ignores calories', () => {
    const a = suggestionSignature('NORMAL_BULK', 0.05);
    const b = suggestionSignature('NORMAL_BULK', 0.06); // rounds to same 0.05 bucket
    const c = suggestionSignature('NORMAL_BULK', 0.25);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    // Calories are not part of the signature (apply changes them, trend didn't).
    expect(suggestionSignature('NORMAL_BULK', 0.05)).toBe(a);
  });
});
