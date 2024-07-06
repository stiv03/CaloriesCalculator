import React, { useState, useEffect } from 'react';
import axios from './axiosConfig';
import styles from './CaloriesCalculator.module.css';


const CaloriesCalculator = () => {
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, proteins: 0, carbs: 0, fats: 0 });
  const [newMeal, setNewMeal] = useState({ productId: '', grams: '' });
  const [loading, setLoading] = useState(true);
  const userId = 48; // Replace with the actual user ID

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
    const response = await axios.get(`meals/date/${userId}`, { params: { date } });
    console.log('Meals fetched:', response.data); // Add this line to check the response
    setMeals(response.data);
  } catch (error) {
    handleUnauthorized(error);
  }
};

  const fetchTotals = async () => {
    try {
      const dailyMacrosResponse = await axios.get(`meals/${userId}/totalMacros`, { params: { date } });
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
      const response = await axios.post(`/meals/${userId}`, newMeal);
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
        <h2>Add Food</h2>
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
        <button onClick={handleAddFood}>Add Food</button>
      </div>
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
          return (
            <li key={meal.product.id}>
              {meal.product.name} - {meal.quantity} g - {totalKcal.toFixed(1)} kcal - {totalProtein.toFixed(1)} g protein
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
      <p>Carbs: <span>{totals.carbs}</span>g</p>
      <p>Fats: <span>{totals.fats.toFixed(2)}</span>g</p>
    </div>
  );
};

export default CaloriesCalculator;
