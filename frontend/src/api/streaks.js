// frontend/src/api/streaks.js
import client from './client';

/**
 * Returns { meals, weight, supplements } — current consecutive-day streak
 * for each habit. The backend treats today as still-in-progress: a streak
 * doesn't break until the next calendar day passes without a log.
 */
export async function getStreaks(userId) {
  const { data } = await client.get(`/streaks/${userId}`);
  return data;
}
