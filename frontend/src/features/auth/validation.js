const MIN_PASSWORD = 6;

const required = (v) => v && String(v).trim().length > 0;
const numberInRange = (v, min, max) => {
  const n = parseFloat(v);
  return !Number.isNaN(n) && n >= min && n <= max;
};

export function validateRegister(form) {
  const e = {};
  if (!required(form.name)) e.name = 'Name is required';
  if (!numberInRange(form.age, 1, 120)) e.age = 'Enter a valid age (1–120)';
  if (!required(form.gender)) e.gender = 'Select a gender';
  if (!numberInRange(form.weight, 1, 500)) e.weight = 'Enter a valid weight (kg)';
  if (!numberInRange(form.height, 1, 300)) e.height = 'Enter a valid height (cm)';
  if (!required(form.username)) e.username = 'Username is required';
  if (!form.password || form.password.length < MIN_PASSWORD) {
    e.password = `Password must be at least ${MIN_PASSWORD} characters`;
  }
  return e;
}

export function validateLogin(form) {
  const e = {};
  if (!required(form.username)) e.username = 'Username is required';
  if (!required(form.password)) e.password = 'Password is required';
  return e;
}

export function validateChangePassword(form) {
  const e = {};
  if (!form.newPassword || form.newPassword.length < MIN_PASSWORD) {
    e.newPassword = `Password must be at least ${MIN_PASSWORD} characters`;
  }
  if (form.newPassword !== form.confirm) {
    e.confirm = 'Passwords do not match';
  }
  return e;
}
