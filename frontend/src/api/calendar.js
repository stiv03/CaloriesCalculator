// frontend/src/api/calendar.js
import client from './client';

export const getCalendarMonth = (userId, from, to) =>
  client.get(`/calendar/${userId}`, { params: { from, to } }).then(r => r.data);

/** Daily step history: [{ date, steps }] ascending. */
export const getStepHistory = (userId) =>
  client.get(`/calendar/${userId}/steps`).then(r => r.data);

/**
 * Sleep detail for one day (wake date): { date, startTime, endTime,
 * totalMinutes, rem, deep, light, awake, segments:[{start,end,type}] }.
 * Resolves to null when there's no sleep recorded that day (204).
 */
export const getSleepDay = (userId, date) =>
  client.get(`/calendar/${userId}/sleep/${date}`).then(r => (r.status === 204 ? null : r.data));
