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

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      console.error('No user ID found');
      return;
    }

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
    </div>
  );
};

export default UserProfile;
