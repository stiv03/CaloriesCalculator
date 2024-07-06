import React, { useState, useEffect } from 'react';
import axios from './axiosConfig';
import styles from './CaloriesCalculator.module.css';

const CaloriesCalculator = () => {
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, proteins: 0, carbs: 0, fats: 0 });
  const [newMeal, setNewMeal] = useState({ productId: '', grams: '' });
  const userId = 48; // Replace with the actual user ID

  useEffect(() => {
    fetchMeals();
    fetchTotals();
  }, [date]);

  const fetchMeals = async () => {
    try {
      const response = await axios.get(`meals/date/${userId}`, { params: { date },
      });
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  };

  const fetchTotals = async () => {
    try {
      const [calories, proteins, carbs, fats] = await Promise.all([
        axios.get(`/meals/${userId}/calories`, { params: { date } }),
        axios.get(`/meals/${userId}/protein`, { params: { date } }),
        axios.get(`/meals/${userId}/carbs`, { params: { date } }),
        axios.get(`/meals/${userId}/fats`, { params: { date } }),
      ]);
      setTotals({
        calories: calories.data,
        proteins: proteins.data,
        carbs: carbs.data,
        fats: fats.data,
      });
    } catch (error) {
      console.error('Error fetching totals:', error);
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
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMeal({ ...newMeal, [name]: value });
  };

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
  return (
    <div className={styles.foodList}>
      <h2>Food Eaten Today</h2>
      <ul>
        {meals.map((meal) => (
          <li key={meal.product.id}>{meal.product.name} - {meal.product.calories} Calories</li>
        ))}
      </ul>
    </div>
  );
};

const Totals = ({ totals }) => {
  return (
    <div className={styles.totals}>
      <h2>Total</h2>
      <p>Calories: <span>{totals.calories}</span></p>
      <p>Proteins: <span>{totals.proteins}</span>g</p>
      <p>Carbs: <span>{totals.carbs}</span>g</p>
      <p>Fats: <span>{totals.fats}</span>g</p>
    </div>
  );
};

export default CaloriesCalculator;
