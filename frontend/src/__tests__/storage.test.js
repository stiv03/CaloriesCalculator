import {
  setUsername, getUsername, clearAuth, setToken, setUserId,
} from '../auth/storage';

describe('username storage', () => {
  beforeEach(() => localStorage.clear());

  test('setUsername then getUsername returns the value', () => {
    setUsername('alice');
    expect(getUsername()).toBe('alice');
  });

  test('getUsername returns null when not set', () => {
    expect(getUsername()).toBeNull();
  });

  test('setUsername coerces non-strings via String()', () => {
    setUsername(42);
    expect(getUsername()).toBe('42');
  });

  test('clearAuth removes username along with token and userId', () => {
    setToken('t');
    setUserId(7);
    setUsername('alice');
    clearAuth();
    expect(getUsername()).toBeNull();
    expect(localStorage.getItem('jwtToken')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
  });
});
