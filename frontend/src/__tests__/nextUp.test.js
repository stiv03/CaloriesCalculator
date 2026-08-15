// frontend/src/__tests__/nextUp.test.js
import { nextUpTemplateId } from '../features/workout/nextUp';

// Plan: Push(1), Pull(2), Legs(3), Chest & Back(4), Arms(5), Legs 2(6)
const PLAN = [
  { id: 1, exerciseType: 'PUSH', label: null, sortOrder: 0 },
  { id: 2, exerciseType: 'PULL', label: null, sortOrder: 1 },
  { id: 3, exerciseType: 'LEGS', label: null, sortOrder: 2 },
  { id: 4, exerciseType: 'CHEST_AND_BACK', label: null, sortOrder: 3 },
  { id: 5, exerciseType: 'ARMS', label: null, sortOrder: 4 },
  { id: 6, exerciseType: 'LEGS', label: 'Legs 2', sortOrder: 5 },
];

describe('nextUpTemplateId', () => {
  test('no plan → null', () => {
    expect(nextUpTemplateId([], [])).toBeNull();
    expect(nextUpTemplateId(null, [])).toBeNull();
  });

  test('no history → first day up next', () => {
    expect(nextUpTemplateId(PLAN, [])).toBe(1);
  });

  test('last was Arms → next is Legs 2', () => {
    const history = [{ templateId: 5, date: '2026-08-14' }];
    expect(nextUpTemplateId(PLAN, history)).toBe(6);
  });

  test('last was Legs 2 (final day) → wraps to Push', () => {
    const history = [{ templateId: 6, date: '2026-08-14' }];
    expect(nextUpTemplateId(PLAN, history)).toBe(1);
  });

  test('uses the most recent (newest-first) matching workout', () => {
    const history = [
      { templateId: 2, date: '2026-08-14' }, // most recent: Pull
      { templateId: 5, date: '2026-08-10' }, // older: Arms
    ];
    expect(nextUpTemplateId(PLAN, history)).toBe(3); // after Pull → Legs
  });

  test('skips rest days when finding the last real workout', () => {
    const history = [
      { isRestDay: true, date: '2026-08-15' },
      { templateId: 3, date: '2026-08-14' }, // Legs
    ];
    expect(nextUpTemplateId(PLAN, history)).toBe(4); // after Legs → Chest & Back
  });

  test('matches legacy logs (no templateId) by exerciseType + label', () => {
    const history = [{ templateId: null, exerciseType: 'LEGS', label: 'Legs 2', date: '2026-08-14' }];
    expect(nextUpTemplateId(PLAN, history)).toBe(1); // Legs 2 → wraps to Push
  });

  test('legacy log distinguishes Legs from Legs 2 by label', () => {
    const history = [{ templateId: null, exerciseType: 'LEGS', label: null, date: '2026-08-14' }];
    expect(nextUpTemplateId(PLAN, history)).toBe(4); // plain Legs → Chest & Back
  });

  test('last workout no longer in plan → falls back to first day', () => {
    const history = [{ templateId: 999, date: '2026-08-14' }];
    expect(nextUpTemplateId(PLAN, history)).toBe(1);
  });

  test('respects sortOrder even if templates array is unordered', () => {
    const shuffled = [PLAN[4], PLAN[0], PLAN[2], PLAN[5], PLAN[1], PLAN[3]];
    const history = [{ templateId: 5, date: '2026-08-14' }]; // Arms
    expect(nextUpTemplateId(shuffled, history)).toBe(6); // → Legs 2
  });
});
