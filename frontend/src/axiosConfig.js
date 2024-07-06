// src/axiosConfig.js

import axios from 'axios';
import { getToken } from './utils/auth';

const instance = axios.create({
  baseURL: 'http://localhost:8080/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    // Do not add Authorization header for registration endpoint
    if (token && !config.url.includes('/auth/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;
