// src/utils/auth.js

export const getToken = () => {
  return localStorage.getItem('jwtToken');
};

export const setToken = (token) => {
  localStorage.setItem('jwtToken', token);
};

export const getUserId = () => {
  return localStorage.getItem('userId');
};

export const setUserId = (userId) => {
  localStorage.setItem('userId', userId);
};
