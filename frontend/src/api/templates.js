// frontend/src/api/templates.js
import client from './client';

export const getTemplates = (userId) =>
  client.get(`/templates/${userId}`).then((r) => r.data);

export const createTemplate = (userId, name, items) =>
  client.post(`/templates/${userId}`, { name, items }).then((r) => r.data);

export const deleteTemplate = (userId, templateId) =>
  client.delete(`/templates/${userId}/${templateId}`);

export const addItemToTemplate = (userId, templateId, item) =>
  client.post(`/templates/${userId}/${templateId}/items`, item).then((r) => r.data);

export const updateTemplateItem = (userId, templateId, itemId, grams) =>
  client.put(`/templates/${userId}/${templateId}/items/${itemId}`, { grams }).then((r) => r.data);

export const removeTemplateItem = (userId, templateId, itemId) =>
  client.delete(`/templates/${userId}/${templateId}/items/${itemId}`).then((r) => r.data);
