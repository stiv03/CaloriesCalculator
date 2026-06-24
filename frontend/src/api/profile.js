// frontend/src/api/profile.js
import client from './client';

export async function getUser(userId) {
  const { data } = await client.get(`/user/${userId}`);
  return data;
}

export async function updateWeight(userId, newWeight, measureTime) {
  const { data } = await client.put(`/update/weight/${userId}`, { newWeight, measureTime: measureTime || null });
  return data;
}

export async function updateHeight(userId, newHeight) {
  const { data } = await client.put(`/update/height/${userId}`, { newHeight });
  return data;
}

export async function updateAge(userId, newAge) {
  const { data } = await client.put(`/update/age/${userId}`, { newAge });
  return data;
}

export async function updateStatus(userId, statusCode) {
  const { data } = await client.put(`/update/status/${userId}`, statusCode, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

export async function updateActivity(userId, activityCode) {
  const { data } = await client.put(`/update/activity/${userId}`, activityCode, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

export async function getWeightRecords(userId) {
  const { data } = await client.get(`/${userId}/weightRecords`);
  return data;
}

export async function getMeasurements(userId) {
  const { data } = await client.get(`/user/measurements/${userId}`);
  return data;
}

export async function getLatestMeasurement(userId) {
  const { data } = await client.get(`/user/latestMeasurement/${userId}`);
  return data;
}

export async function addMeasurement(userId, measurements) {
  const { data } = await client.post(`/add/${userId}/measurements`, measurements);
  return data;
}

export async function getGoal(userId) {
  const { data } = await client.get(`/user/${userId}/getGoal`);
  return data;
}

export async function setGoal(userId, goal) {
  const { data } = await client.post(`/user/${userId}/setGoal`, goal);
  return data;
}

export async function autoSetGoal(userId) {
  const { data } = await client.post(`/user/${userId}/autoSetGoal`);
  return data;
}
