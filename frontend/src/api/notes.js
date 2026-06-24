// frontend/src/api/notes.js
import client from './client';

export const getNote = (userId, date) =>
  client.get(`/notes/${userId}`, { params: { date } }).then((r) => r.data.content);

export const saveNote = (userId, date, content) =>
  client.put(`/notes/${userId}`, { content }, { params: { date } });

export const getAllNotes = (userId) =>
  client.get(`/notes/${userId}/all`).then((r) => r.data);
