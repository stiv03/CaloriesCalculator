// frontend/src/api/progressMarkers.js
import client from './client';

export const listProgressMarkers = (userId) =>
  client.get(`/progress-markers/${userId}`).then(r => r.data);

export const createProgressMarker = (userId, data) =>
  client.post(`/progress-markers/${userId}`, data).then(r => r.data);

export const deleteProgressMarker = (userId, id) =>
  client.delete(`/progress-markers/${userId}/${id}`);
