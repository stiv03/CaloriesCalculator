// frontend/src/utils/theme.js
const KEY = 'theme'; // 'light' | 'dark' | null (follow OS)

export function getTheme() {
  return localStorage.getItem(KEY); // null = follow OS
}

export function setTheme(value) {
  if (value) {
    localStorage.setItem(KEY, value);
    document.documentElement.setAttribute('data-theme', value);
  } else {
    localStorage.removeItem(KEY);
    document.documentElement.removeAttribute('data-theme');
  }
}

export function applyStoredTheme() {
  const stored = getTheme();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
}
