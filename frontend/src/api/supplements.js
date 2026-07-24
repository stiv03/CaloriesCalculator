// frontend/src/api/supplements.js
import client from './client';

/** YYYY-MM-DD for the backend's @DateTimeFormat(ISO.DATE). */
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function listSupplements(userId) {
  const { data } = await client.get(`/supplements/${userId}`);
  return data; // [{id, name, dosage, category}]
}

export async function createSupplement(userId, { name, dosage, category }) {
  const { data } = await client.post(`/supplements/${userId}`, { name, dosage, category });
  return data;
}

export async function updateSupplement(userId, supplementId, { name, dosage, category }) {
  const { data } = await client.put(`/supplements/${userId}/${supplementId}`, { name, dosage, category });
  return data;
}

export async function deleteSupplement(userId, supplementId) {
  await client.delete(`/supplements/${userId}/${supplementId}`);
}

/**
 * @param {Date} from inclusive
 * @param {Date} to inclusive
 * @returns [{supplementId, date: 'YYYY-MM-DD', taken}]
 */
export async function listIntakes(userId, from, to) {
  const { data } = await client.get(`/supplements/${userId}/intakes`, {
    params: { from: isoDate(from), to: isoDate(to) },
  });
  return data;
}

export async function reorderSupplements(userId, orderedIds) {
  await client.put(`/supplements/${userId}/reorder`, { orderedIds });
}

export async function setIntake(userId, supplementId, date, taken) {
  const { data } = await client.put(`/supplements/${userId}/intakes`, {
    supplementId,
    date: isoDate(date),
    taken,
  });
  return data;
}
