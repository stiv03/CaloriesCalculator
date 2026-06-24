// frontend/src/api/client.js
// Configured axios instance shared by every API wrapper.
// Auto-attaches Bearer token on non-/auth/ requests.
// Handles 401 globally by clearing auth + redirecting to /login.

import axios from 'axios';
import { getToken, clearAuth } from '../auth/storage';

// CRA exposes REACT_APP_* env vars to the build. .env.development and
// .env.production each set REACT_APP_API_BASE_URL appropriately.
// Falls back to localhost for safety if the var is somehow missing.
const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1/';

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && !config.url.includes('/auth/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      // Hard redirect — wipes all in-memory state from the previous session.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

/**
 * Convert raw axios error into a stable shape the UI can rely on.
 * Backend's GlobalExceptionHandler returns { status, error, message, fieldErrors? }.
 */
function normalizeError(err) {
  if (err.response) {
    const body = err.response.data || {};
    return {
      status: err.response.status,
      message: body.message || body.detail || body.title || err.message || 'Request failed',
      fieldErrors: body.fieldErrors || null,
      raw: err,
    };
  }
  if (err.request) {
    return { status: 0, message: 'No response from server', fieldErrors: null, raw: err };
  }
  return { status: 0, message: err.message || 'Request error', fieldErrors: null, raw: err };
}

export default client;
