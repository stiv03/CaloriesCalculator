// frontend/src/api/auth.js
import client from './client';

export async function register(payload) {
  // payload: { name, age, gender, weight, height, username, password }
  const { data } = await client.post('/auth/register', payload);
  return data; // { token, userId }
}

export async function login(payload) {
  // payload: { username, password }
  const { data } = await client.post('/auth/login', payload);
  return data; // { token, userId }
}

export async function changePassword(userId, newPassword) {
  await client.put(`/update/password/${userId}`, { newPassword });
}
