// frontend/src/api/progressPhotos.js
import client from './client';

export const listProgressPhotos = (userId) =>
  client.get(`/progress-photos/${userId}`).then(r => r.data);

export const createProgressPhoto = (userId, data) =>
  client.post(`/progress-photos/${userId}`, data).then(r => r.data);

export const deleteProgressPhoto = (userId, id) =>
  client.delete(`/progress-photos/${userId}/${id}`);
