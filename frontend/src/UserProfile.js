import React, { useState, useEffect } from 'react';
import axios from './axiosConfig';
import { getUserId, getToken } from './utils/auth';
import './UserProfile.css';

const UserProfile = () => {
  const [user, setUser] = useState({
    name: '',
    age: '',
    weight: '',
    height: ''
  });
  const [newWeight, setNewWeight] = useState('');
  const [allMacros, setAllMacros] = useState([]); // State to store all macros data
  const [showMacros, setShowMacros] = useState(false); // State to track visibility
  const [goals, setGoals] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  });

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      console.error('No user ID found');
      return;
    }

    // Fetch user data
    axios.get(`/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(response => {
      console.log('User data fetched successfully:', response.data);
      setUser(response.data);
    })
    .catch(error => {
      console.error('Error fetching user data:', error.response || error.message);
    });

    // Fetch all macros data
    axios.get(`/meals/${userId}/allMacros`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(response => {
      console.log('Macros data fetched successfully:', response.data);
      // Sort macros by date in descending order
      const sortedMacros = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllMacros(sortedMacros);
    })
    .catch(error => {
      console.error('Error fetching macros data:', error.response || error.message);
    });

    // Fetch goals data
    axios.get(`/user/${userId}/getGoal`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(response => {
      console.log('Goals data fetched successfully:', response.data);
      setGoals(response.data);
    })
    .catch(error => {
      console.error('Error fetching goals data:', error.response || error.message);
    });
  }, []);

  const handleWeightChange = (event) => {
    setNewWeight(event.target.value);
  };

  const handleWeightUpdate = () => {
    const userId = getUserId();
    if (!userId) {
      console.error('No user ID found');
      return;
    }

    axios.put(`/update/weight/${userId}`,
      { newWeight: parseFloat(newWeight) },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      }
    )
    .then(response => {
      console.log('Weight updated successfully:', response.data);
      setUser(response.data);
      alert('Weight updated successfully!');
    })
    .catch(error => {
      console.error('Error updating weight:', error.response || error.message);
    });
  };

  const handleGoalChange = (event) => {
    const { name, value } = event.target;
    setGoals({
      ...goals,
      [name]: value
    });
  };

  const handleGoalSubmit = () => {
    const userId = getUserId();
    axios.post(`/user/${userId}/setGoal`, goals, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(response => {
      console.log('Goals set successfully:', response.data);
      setGoals(response.data);
    })
    .catch(error => {
      console.error('Error setting goals:', error.response || error.message);
    });
  };

  const toggleShowMacros = () => {
    setShowMacros(!showMacros);
  };

  return (
    <div className="profile-container">
      <h1>Profile of |{user.name}|</h1>
      <div className="profile-details">
        <p><strong>Age:</strong> {user.age}</p>
        <p><strong>Current Weight:</strong> {user.weight} kg</p>
        <p><strong>Height:</strong> {user.height} cm</p>
      </div>
      <div className="update-weight">
        <h2>Update Weight</h2>
        <input
          type="number"
          value={newWeight}
          onChange={handleWeightChange}
          placeholder="Enter new weight"
          min="1"
        />
        <button onClick={handleWeightUpdate}>Update Weight</button>
      </div>
      <div className="set-goals">
        <h2>Set Goals: </h2>
        <input
          type="number"
          name="calories"
          value={goals.calories}
          onChange={handleGoalChange}
          placeholder="Calories"
          min="1"
        />
        <input
          type="number"
          name="protein"
          value={goals.protein}
          onChange={handleGoalChange}
          placeholder="Protein"
          min="1"
        />
        <input
          type="number"
          name="carbs"
          value={goals.carbs}
          onChange={handleGoalChange}
          placeholder="Carbs"
          min="1"
        />
        <input
          type="number"
          name="fat"
          value={goals.fat}
          onChange={handleGoalChange}
          placeholder="Fat"
          min="1"
        />
        <button onClick={handleGoalSubmit}>Set Goals</button>
      </div>
      <div className="all-macros">
        <button onClick={toggleShowMacros}>
          {showMacros ? 'Hide Macros' : 'Show Macros'}
        </button>
        {showMacros && (
          <div>
            <h2>Daily Macros and Calories</h2>
            <ul>
              {allMacros.map((macro, index) => (
                <li key={index} className="macro-item">
                  <div className="macro-date">
                    <strong>Date:</strong> {macro.date}
                  </div>
                  <div className="macro-details">
                    <p><strong>Calories:</strong> {macro.calories.toFixed(2)} kcal</p>
                    <p><strong>Proteins:</strong> {macro.protein.toFixed(2)} g</p>
                    <p><strong>Carbs:</strong> {macro.carb.toFixed(2)} g</p>
                    <p><strong>Fats:</strong> {macro.fat.toFixed(2)} g</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
