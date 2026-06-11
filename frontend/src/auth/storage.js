// frontend/src/auth/storage.js
// Wrappers around localStorage for the JWT, userId, and username. Single
// source of truth — never read these keys directly from any component.

const TOKEN_KEY = 'jwtToken';
const USER_ID_KEY = 'userId';
const USERNAME_KEY = 'username';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getUserId = () => localStorage.getItem(USER_ID_KEY);
export const setUserId = (userId) => localStorage.setItem(USER_ID_KEY, String(userId));
export const getUsername = () => localStorage.getItem(USERNAME_KEY);
export const setUsername = (username) => localStorage.setItem(USERNAME_KEY, String(username));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USERNAME_KEY);
};

export const isAuthenticated = () => Boolean(getToken());
