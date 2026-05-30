// frontend/src/__tests__/macroMath.test.js
import { ringDashOffset, statusForPercent } from '../components/macroMath';

describe('ringDashOffset', () => {
  test('0% → full circumference', () => {
    expect(ringDashOffset(0, 100, 100)).toBeCloseTo(100);
  });
  test('100% → 0', () => {
    expect(ringDashOffset(100, 100, 100)).toBeCloseTo(0);
  });
  test('150% → 0 (clamped, ring stays full)', () => {
    expect(ringDashOffset(150, 100, 100)).toBeCloseTo(0);
  });
  test('zero goal → full circumference (no fill)', () => {
    expect(ringDashOffset(50, 0, 100)).toBeCloseTo(100);
  });
});

describe('statusForPercent', () => {
  test('under 100 → "under"', () => {
    expect(statusForPercent(0, 100)).toBe('under');
    expect(statusForPercent(99, 100)).toBe('under');
  });
  test('100 to 105 → "near"', () => {
    expect(statusForPercent(100, 100)).toBe('near');
    expect(statusForPercent(105, 100)).toBe('near');
  });
  test('above 105 → "over"', () => {
    expect(statusForPercent(106, 100)).toBe('over');
    expect(statusForPercent(200, 100)).toBe('over');
  });
  test('zero goal → "under"', () => {
    expect(statusForPercent(50, 0)).toBe('under');
  });
});
