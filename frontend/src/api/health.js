// frontend/src/api/health.js
// Server-side Google Health connection. The backend holds the refresh token and
// does the syncing; the browser just kicks off OAuth and reads status.
import client from './client';

/** Get the Google consent URL to start connecting (opens in the browser). */
export async function getAuthUrl(userId) {
  const { data } = await client.get(`/health/oauth/authorize/${userId}`);
  return data.authUrl;
}

/** Connection status: { connected, configured, lastSyncAt, syncSteps, syncWeight, syncFood }. */
export async function getHealthStatus(userId) {
  const { data } = await client.get(`/health/status/${userId}`);
  return data;
}

/** Save which data types to sync: { syncSteps, syncWeight, syncFood }. */
export async function updateHealthPreferences(userId, prefs) {
  await client.put(`/health/preferences/${userId}`, prefs);
}

/** Trigger a sync now: { synced, recordsImported? , reason? }. */
export async function syncHealthNow(userId) {
  const { data } = await client.post(`/health/sync/${userId}`);
  return data;
}

export async function disconnectHealth(userId) {
  await client.delete(`/health/disconnect/${userId}`);
}
