// frontend/src/api/calendar.js
import client from './client';

export const getCalendarMonth = (userId, from, to) =>
  client.get(`/calendar/${userId}`, { params: { from, to } }).then(r => r.data);

/** Daily step history: [{ date, steps }] ascending. */
export const getStepHistory = (userId) =>
  client.get(`/calendar/${userId}/steps`).then(r => r.data);
