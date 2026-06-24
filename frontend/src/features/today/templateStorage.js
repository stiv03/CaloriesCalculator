// frontend/src/features/today/templateStorage.js
// Meal templates persisted in localStorage.
// A template = { id, name, items: [{ productId, productName, grams, caloriesPer100Grams }] }

const KEY = 'mealTemplates';

export function getTemplates() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveTemplate(name, items) {
  const templates = getTemplates();
  const id = Date.now().toString();
  templates.push({ id, name, items });
  localStorage.setItem(KEY, JSON.stringify(templates));
  return id;
}

export function deleteTemplate(id) {
  const templates = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(KEY, JSON.stringify(templates));
}
