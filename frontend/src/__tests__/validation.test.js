import { validateRegister, validateLogin, validateChangePassword } from '../features/auth/validation';

describe('validateRegister', () => {
  test('all valid → no errors', () => {
    expect(validateRegister({
      name: 'Stoyan', age: '25', gender: 'MALE', weight: '75',
      height: '180', username: 'stoyan', password: 'secret123',
    })).toEqual({});
  });
  test('missing name', () => {
    const e = validateRegister({ name: '', age: '25', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e.name).toBeTruthy();
  });
  test('age out of range', () => {
    const e = validateRegister({ name: 'a', age: '0', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e.age).toBeTruthy();
    const e2 = validateRegister({ name: 'a', age: '200', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e2.age).toBeTruthy();
  });
  test('gender required', () => {
    const e = validateRegister({ name: 'a', age: '25', gender: '',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e.gender).toBeTruthy();
  });
  test('password too short', () => {
    const e = validateRegister({ name: 'a', age: '25', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: '123' });
    expect(e.password).toBeTruthy();
  });
});

describe('validateLogin', () => {
  test('valid', () => {
    expect(validateLogin({ username: 'a', password: 'b' })).toEqual({});
  });
  test('missing username', () => {
    expect(validateLogin({ username: '', password: 'b' }).username).toBeTruthy();
  });
});

describe('validateChangePassword', () => {
  test('valid', () => {
    expect(validateChangePassword({ newPassword: 'secret123', confirm: 'secret123' })).toEqual({});
  });
  test('mismatch', () => {
    const e = validateChangePassword({ newPassword: 'secret123', confirm: 'secret124' });
    expect(e.confirm).toBeTruthy();
  });
  test('too short', () => {
    expect(validateChangePassword({ newPassword: 'a', confirm: 'a' }).newPassword).toBeTruthy();
  });
});
