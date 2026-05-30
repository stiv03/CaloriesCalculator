import {
  formatBackendDate, parseBackendDate, formatHumanDate,
  isToday, isFuture, addDays,
} from '../features/today/dateFormat';

describe('formatBackendDate', () => {
  test('formats 2026-05-30 as 30/05/2026', () => {
    expect(formatBackendDate(new Date(2026, 4, 30))).toBe('30/05/2026');
  });
  test('zero-pads single digits', () => {
    expect(formatBackendDate(new Date(2026, 0, 3))).toBe('03/01/2026');
  });
});

describe('parseBackendDate', () => {
  test('parses dd/MM/yyyy', () => {
    const d = parseBackendDate('03/01/2026');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(3);
  });
  test('throws on invalid format', () => {
    expect(() => parseBackendDate('2026-01-03')).toThrow();
  });
});

describe('formatHumanDate', () => {
  test('formats as "Sat, May 30"', () => {
    // 2026-05-30 is a Saturday
    expect(formatHumanDate(new Date(2026, 4, 30))).toBe('Sat, May 30');
  });
});

describe('isToday', () => {
  test('returns true for now', () => {
    expect(isToday(new Date())).toBe(true);
  });
  test('returns false for yesterday', () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(isToday(y)).toBe(false);
  });
});

describe('isFuture', () => {
  test('false for today', () => {
    expect(isFuture(new Date())).toBe(false);
  });
  test('true for tomorrow', () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    expect(isFuture(t)).toBe(true);
  });
});

describe('addDays', () => {
  test('adds positive days', () => {
    const d = addDays(new Date(2026, 4, 30), 1);
    expect(d.getDate()).toBe(31);
  });
  test('subtracts negative days', () => {
    const d = addDays(new Date(2026, 4, 30), -1);
    expect(d.getDate()).toBe(29);
  });
  test('does not mutate input', () => {
    const orig = new Date(2026, 4, 30);
    addDays(orig, 5);
    expect(orig.getDate()).toBe(30);
  });
});
