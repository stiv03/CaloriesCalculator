import React, { useState, useEffect, useRef } from 'react';
import axios from './axiosConfig';
import styles from './CaloriesCalculator.module.css';
import { getUserId, getToken } from './utils/auth';
import Autosuggest from 'react-autosuggest';
import { useNavigate } from 'react-router-dom';

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
  const [goals, setGoals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  // Autosuggest state and functions
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showAddMealForm, setShowAddMealForm] = useState(false); // State to control add meal form visibility

  const fetchProductSuggestions = async (query) => {
    try {
      const response = await axios.get(`products/search`, { params: { query } });
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching product suggestions:', error);
    }
  };

  const onSuggestionsFetchRequested = ({ value }) => {
    fetchProductSuggestions(value);
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion) => suggestion.name;

  const renderSuggestion = (suggestion) => (
    <div className={styles.suggestionBlock}>{suggestion.name}</div>
  );

  const onChange = (event, { newValue }) => {
    setQuery(newValue);
  };

  const onSuggestionSelected = (event, { suggestion }) => {
    setSelectedProduct(suggestion);
    setNewMeal({ ...newMeal, productId: suggestion.productId });
  };

  const inputProps = {
    placeholder: 'Type a product name',
    value: query,
    onChange: onChange,
    className: styles.largeInput, // Apply the new class
  };

  const theme = {
    container: styles.suggestionContainer,
    suggestionsList: styles.suggestionsList,
    suggestion: styles.suggestion,
  };

  useEffect(() => {
    fetchMeals();
    fetchTotals();
    fetchGoals();
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

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`/user/${getUserId()}/getGoal`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      console.log('Goals fetched:', response.data); // Add this line to check the response
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleAddFood = async () => {
    try {
      console.log('Adding meal:', newMeal);
      const response = await axios.post(`/meals/${getUserId()}`, newMeal);
      console.log('Meal added successfully:', response.data);
      setNewMeal({ productId: '', grams: '' }); // Clear the form
      setSelectedProduct(null); // Clear the selected product
      setQuery(''); // Clear the query
      setShowAddMealForm(false); // Hide the add meal form
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

  const navigate = useNavigate(); // Initialize useNavigate for navigation

  const addMealFormRef = useRef(null); // Create a ref for the add meal form

  const scrollToForm = () => {
    addMealFormRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleAddMealForm = () => {
    setShowAddMealForm((prev) => !prev);
  };

  if (loading) {
    return <div className={styles.loader}>Loading...</div>;
  }

  const remaining = {
    calories: goals.calories - totals.calories,
    protein: goals.protein - totals.proteins,
    carbs: goals.carbs - totals.carbs,
    fat: goals.fat - totals.fats
  };

  return (
    <div className={styles.container}>
      <div className={styles.profileIcon} onClick={() => navigate('/user-profile')}>
        <img src="../profile-icon.png" alt="Profile" />
      </div>
      <h1>Calories Calculator</h1>

      <div className={styles.date}>{date}</div>
      <MealList meals={meals} onAddMealClick={toggleAddMealForm} />
      <Totals totals={totals} />

      <div className={styles.goals}>
        <h2>Current vs Goals</h2>
        <div className={styles.goalBox}>
          <label>Calories:</label>
          <progress value={totals.calories} max={goals.calories}></progress>
          <span>{totals.calories.toFixed(0)} / {goals.calories} (Remaining: {remaining.calories.toFixed(2)})</span>
        </div>
        <div className={styles.goalBox}>
          <label>Proteins:</label>
          <progress value={totals.proteins} max={goals.protein}></progress>
          <span>{totals.proteins.toFixed(2)} / {goals.protein} (Remaining: {remaining.protein.toFixed(2)})</span>
        </div>
        <div className={styles.goalBox}>
          <label>Carbs:</label>
          <progress value={totals.carbs} max={goals.carbs}></progress>
          <span>{totals.carbs.toFixed(2)} / {goals.carbs} (Remaining: {remaining.carbs.toFixed(2)})</span>
        </div>
        <div className={styles.goalBox}>
          <label>Fats:</label>
          <progress value={totals.fats} max={goals.fat}></progress>
          <span>{totals.fats.toFixed(2)} / {goals.fat} (Remaining: {remaining.fat.toFixed(2)})</span>
        </div>
      </div>

      {showAddMealForm && (
        <div className={styles.addMealForm} ref={addMealFormRef}>
          <h2>Add New Meal</h2>
     <div className={styles.addMealFormInputs}>
            <Autosuggest
              suggestions={suggestions}
              onSuggestionsFetchRequested={onSuggestionsFetchRequested}
              onSuggestionsClearRequested={onSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={inputProps}
              onSuggestionSelected={onSuggestionSelected}
              theme={theme} // Pass the custom theme to Autosuggest
            />
            <input
              type="number"
              name="grams"
              value={newMeal.grams}
              onChange={handleInputChange}
              placeholder="Grams"
              required
            />
          </div>
          <button className={styles.addButton} onClick={handleAddFood} disabled={loading || !selectedProduct || !newMeal.grams}>
            {loading ? 'Adding...' : 'Add Meal'}
          </button>
        </div>
      )}

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

const MealList = ({ meals, onAddMealClick }) => {
  console.log('Meals in MealList:', meals); // Add this line to log the meals data

  return (
    <div className={styles.foodList}>
      <h2>Food Eaten Today</h2>
      <table className={styles.mealTable}>
        <thead>
          <tr>
            <th>Food</th>
            <th>Grams</th>
            <th>Kcal</th>
            <th>Protein (g)</th>
            <th>Carbs (g)</th>
            <th>Fats (g)</th>
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => {
            console.log('Meal:', meal); // Log each meal
            const totalKcal = (meal.quantity / 100) * meal.product.caloriesPer100Grams;
            const totalProtein = (meal.quantity / 100) * meal.product.proteinPer100Grams;
            const totalCarbs = (meal.quantity / 100) * meal.product.carbsPer100Grams;
            const totalFats = (meal.quantity / 100) * meal.product.fatPer100Grams;

            return (
              <tr key={meal.product.id}>
                <td>{meal.product.name}</td>
                <td>{meal.quantity}</td>
                <td>{totalKcal.toFixed(1)}</td>
                <td>{totalProtein.toFixed(1)}</td>
                <td>{totalCarbs.toFixed(1)}</td>
                <td>{totalFats.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button className={styles.addMealButton} onClick={onAddMealClick}>+</button>
    </div>
  );
};

const Totals = ({ totals }) => {
  return (
    <div className={styles.totals}>
      <div className={styles.totalsContainer}>
        <div className={styles.totalBox}>
          <p><b>Calories:</b></p>
          <p>{totals.calories.toFixed(0)} kcal</p>
        </div>
        <div className={styles.totalBox}>
          <p><b>Proteins:</b></p>
          <p>{totals.proteins.toFixed(2)} g</p>
        </div>
        <div className={styles.totalBox}>
          <p><b>Carbs:</b></p>
          <p>{totals.carbs.toFixed(2)} g</p>
        </div>
        <div className={styles.totalBox}>
          <p><b>Fats:</b></p>
          <p>{totals.fats.toFixed(2)} g</p>
        </div>
      </div>
    </div>
  );
};

export default CaloriesCalculator;
