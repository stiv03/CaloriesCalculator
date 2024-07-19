import React, { useState, useEffect } from 'react';
import axios from './axiosConfig';
import styles from './CaloriesCalculator.module.css';
import { getUserId } from './utils/auth';

const CaloriesCalculator = () => {
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, proteins: 0, carbs: 0, fats: 0 });
  const [newMeal, setNewMeal] = useState({ productId: '', grams: '' });
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    productType: '',
    caloriesPer100Grams: '',
    proteinPer100Grams: '',
    fatPer100Grams: '',
    carbsPer100Grams: '',
  });

  useEffect(() => {
    fetchMeals();
    fetchTotals();
  }, [date]);

  const handleUnauthorized = (error) => {
    if (error.response && error.response.status === 401) {
      window.location.href = '/login'; // Redirect to login page
    } else {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchMeals = async () => {
    try {
      const response = await axios.get(`meals/date/${getUserId()}`, { params: { date } });
      console.log('Meals fetched:', response.data); // Add this line to check the response
      setMeals(response.data);
    } catch (error) {
      handleUnauthorized(error);
    }
  };

  const fetchTotals = async () => {
    try {
      const dailyMacrosResponse = await axios.get(`meals/${getUserId()}/totalMacros`, { params: { date } });
      const responseData = dailyMacrosResponse.data;
      setTotals({
        calories: responseData.calories,
        proteins: responseData.protein,
        carbs: responseData.carb,
        fats: responseData.fat,
      });
      setLoading(false);
    } catch (error) {
      handleUnauthorized(error);
    }
  };

  const handleAddFood = async () => {
    try {
      console.log('Adding meal:', newMeal);
      const response = await axios.post(`/meals/${getUserId()}`, newMeal);
      console.log('Meal added successfully:', response.data);
      setNewMeal({ productId: '', grams: '' }); // Clear the form
      fetchMeals(); // Refresh the meal list
      fetchTotals(); // Refresh the totals
      setLoading(false);
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMeal({ ...newMeal, [name]: value });
  };

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddProduct = async () => {
    try {
      console.log('Adding product:', newProduct);
      const response = await axios.post('/new/product', newProduct);
      console.log('Product added successfully:', response.data);
      setNewProduct({
        name: '',
        productType: '',
        caloriesPer100Grams: '',
        proteinPer100Grams: '',
        fatPer100Grams: '',
        carbsPer100Grams: '',
      });
      setShowProductForm(false); // Hide the product form
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  if (loading) {
    return <div className={styles.loader}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Calories Calculator</h1>
      <div className={styles.date}>{date}</div>
      <MealList meals={meals} />
      <Totals totals={totals} />
      <div className={styles.addMealForm}>
        <h2>Add New Meal</h2>
        <input
          type="number"
          name="productId"
          value={newMeal.productId}
          onChange={handleInputChange}
          placeholder="Product ID"
          required
        />
        <input
          type="number"
          name="grams"
          value={newMeal.grams}
          onChange={handleInputChange}
          placeholder="Grams"
          required
        />
        <button className={styles.addButton} onClick={handleAddFood}>Add Meal</button>
      </div>
      <button className={`${styles.addButton} ${styles.addProductButton}`} onClick={() => setShowProductForm(!showProductForm)}>
        {showProductForm ? 'Cancel' : 'Add New Product'}
      </button>
      {showProductForm && (
        <div className={styles.addProductForm}>
          <h2>Add New Product</h2>
          <input
            type="text"
            name="name"
            value={newProduct.name}
            onChange={handleProductInputChange}
            placeholder="Product Name"
            required
          />
          <select
           name="productType"
           value={newProduct.productType}
           onChange={handleProductInputChange}
           placeholder="Product Type"
           required
            >
           <option value="" disabled>Select Product Type</option>
           <option value="MEAT">Meat</option>
           <option value="FRUITS">Fruits</option>
           <option value="VEGETABLES">Vegetables</option>
           <option value="DAIRY">Dairy</option>
           <option value="LEGUMES">Legumes</option>
           <option value="CEREALS">Cereals</option>
           <option value="TUBERS">Tubers</option>
           </select>

          <input
            type="number"
            name="caloriesPer100Grams"
            value={newProduct.caloriesPer100Grams}
            onChange={handleProductInputChange}
            placeholder="Calories per 100 Grams"
            min="1"
            required
          />
          <input
            type="number"
            name="proteinPer100Grams"
            value={newProduct.proteinPer100Grams}
            onChange={handleProductInputChange}
            placeholder="Protein per 100 Grams"
            min="1"
            required
          />
          <input
            type="number"
            name="fatPer100Grams"
            value={newProduct.fatPer100Grams}
            onChange={handleProductInputChange}
            placeholder="Fat per 100 Grams"
            min="1"
            required
          />
          <input
            type="number"
            name="carbsPer100Grams"
            value={newProduct.carbsPer100Grams}
            onChange={handleProductInputChange}
            placeholder="Carbs per 100 Grams"
            min="1"
            required
          />
          <button className={styles.addButton} onClick={handleAddProduct}>Add Product</button>
        </div>
      )}
    </div>
  );
};

const MealList = ({ meals }) => {
  console.log('Meals in MealList:', meals); // Add this line to log the meals data

  return (
    <div className={styles.foodList}>
      <h2>Food Eaten Today</h2>
      <ol>
        {meals.map((meal) => {
          console.log('Meal:', meal); // Log each meal
          const totalKcal = (meal.quantity / 100) * meal.product.caloriesPer100Grams;
          const totalProtein = (meal.quantity / 100) * meal.product.proteinPer100Grams;
          const totalCarbs = (meal.quantity / 100) * meal.product.carbsPer100Grams;
          const totalFats = (meal.quantity / 100) * meal.product.fatPer100Grams;

          return (
            <li key={meal.product.id}>
              {meal.product.name} - {meal.quantity} g - {totalKcal.toFixed(1)} kcal - {totalProtein.toFixed(1)} g protein
               - {totalCarbs.toFixed(1)} g carbs - {totalFats.toFixed(1)} g fats
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const Totals = ({ totals }) => {
  return (
    <div className={styles.totals}>
      <h2>Total:</h2>
      <p>Calories: <span>{totals.calories.toFixed(2)}</span>kcal</p>
      <p>Proteins: <span>{totals.proteins.toFixed(2)}</span>g</p>
      <p>Carbs: <span>{totals.carbs.toFixed(2)}</span>g</p>
      <p>Fats: <span>{totals.fats.toFixed(2)}</span>g</p>
    </div>
  );
};

export default CaloriesCalculator;
