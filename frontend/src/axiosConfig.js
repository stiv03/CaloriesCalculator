// src/axiosConfig.js

import axios from 'axios';
import { getToken } from './utils/auth'; // Adjust the path as necessary

// Create an axios instance
const instance = axios.create({
  baseURL: 'http://localhost:8080/api/v1/', // Your base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in the headers
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;
