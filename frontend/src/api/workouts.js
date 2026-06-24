// frontend/src/api/workouts.js
import client from './client';

// Templates
export const getTemplates = (userId) =>
  client.get(`/workouts/${userId}/templates`).then(r => r.data);

export const createTemplate = (userId, data) =>
  client.post(`/workouts/${userId}/templates`, data).then(r => r.data);

export const updateTemplate = (userId, templateId, data) =>
  client.put(`/workouts/${userId}/templates/${templateId}`, data).then(r => r.data);

export const deleteTemplate = (userId, templateId) =>
  client.delete(`/workouts/${userId}/templates/${templateId}`);

export const addExerciseToTemplate = (userId, templateId, data) =>
  client.post(`/workouts/${userId}/templates/${templateId}/exercises`, data).then(r => r.data);

export const updateTemplateExercise = (userId, templateId, exerciseId, data) =>
  client.put(`/workouts/${userId}/templates/${templateId}/exercises/${exerciseId}`, data).then(r => r.data);

export const removeTemplateExercise = (userId, templateId, exerciseId) =>
  client.delete(`/workouts/${userId}/templates/${templateId}/exercises/${exerciseId}`).then(r => r.data);

export const reorderTemplateExercises = (userId, templateId, orderedIds) =>
  client.put(`/workouts/${userId}/templates/${templateId}/reorder`, orderedIds).then(r => r.data);

// Logs
export const logWorkout = (userId, data) =>
  client.post(`/workouts/${userId}/log`, data).then(r => r.data);

export const getWorkoutHistory = (userId) =>
  client.get(`/workouts/${userId}/log`).then(r => r.data);

export const getWorkout = (userId, workoutId) =>
  client.get(`/workouts/${userId}/log/${workoutId}`).then(r => r.data);

export const deleteWorkout = (userId, workoutId) =>
  client.delete(`/workouts/${userId}/log/${workoutId}`);

export const getVolumeProgress = (userId, dayName) =>
  client.get(`/workouts/${userId}/volume`, { params: dayName ? { dayName } : {} }).then(r => r.data);

// Rest day
export const setRestDay = (userId, date, rest) =>
  client.put(`/workouts/${userId}/rest-day`, { rest }, { params: { date } });
