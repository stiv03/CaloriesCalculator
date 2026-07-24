// frontend/src/api/water.js
import client from './client';

/** Water logged (ml) on a given ISO date (YYYY-MM-DD). Returns { date, amountMl }. */
export async function getWater(userId, dateIso) {
  const { data } = await client.get(`/water/${userId}`, { params: { date: dateIso } });
  return data;
}

/** Set the day's absolute total water (ml). Returns the saved { date, amountMl }. */
export async function setWater(userId, dateIso, amountMl) {
  const { data } = await client.put(`/water/${userId}`, { amountMl }, { params: { date: dateIso } });
  return data;
}
