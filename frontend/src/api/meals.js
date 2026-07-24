// frontend/src/api/meals.js
import client from './client';

export async function listMealsForDay(userId, dateStr /* dd/MM/yyyy */) {
  const { data } = await client.get(`/meals/date/${userId}`, { params: { date: dateStr } });
  return data;
}

export async function getDailyMacros(userId, dateStr) {
  const { data } = await client.get(`/meals/${userId}/totalMacros`, { params: { date: dateStr } });
  return data; // { date, calories, protein, fat, carb }
}

export async function getAllMacros(userId) {
  const { data } = await client.get(`/meals/${userId}/allMacros`);
  return data;
}

export async function addMeal(userId, productId, grams, mealType) {
  await client.post(`/meals/${userId}`, { productId, grams, mealType });
}

export async function updateMealQuantity(userId, mealId, newQuantity) {
  const { data } = await client.put(`/meals/upgrade/quantity/${userId}/meal/${mealId}`, { newQuantity });
  return data;
}

export async function deleteMeal(mealId) {
  await client.delete(`/meals/delete/meal/${mealId}`);
}

export async function searchProducts(query) {
  const { data } = await client.get('/products/search', { params: { query } });
  return data;
}

export async function createProduct(product) {
  const { data } = await client.post('/new/product', product);
  return data;
}

/**
 * Look up a product by barcode (our DB first, then Open Food Facts on the server).
 * Returns { source: 'local' | 'external', product } on a hit, or null if not found.
 */
export async function lookupBarcode(code) {
  try {
    const { data } = await client.get(`/products/barcode/${encodeURIComponent(code)}`);
    return data;
  } catch (err) {
    // client.js normalizes errors to { status, message, ... } (no .response),
    // so check the normalized status. 404 = not found -> fall back to manual entry.
    if (err && err.status === 404) return null;
    throw err;
  }
}
