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
  const [allMacros, setAllMacros] = useState([]);
  const [weightRecords, setWeightRecords] = useState([]);
  const [showMacros, setShowMacros] = useState(false);
  const [showWeightRecords, setShowWeightRecords] = useState(false);
  const [goals, setGoals] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  });
  const [status, setStatus] = useState(''); // New state for storing status

  // New state for measurements (add new logic)
  const [newMeasurements, setNewMeasurements] = useState({
    shoulder: '',
    chest: '',
    biceps: '',
    waist: '',
    hips: '',
    thigh: '',
    calf: ''
  });
  const [measurementRecords, setMeasurementRecords] = useState([]);
  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [showMeasurementRecords, setShowMeasurementRecords] = useState(false);

  // State for toggling Add Measurements and Set Goals visibility
  const [showMeasurementsForm, setShowMeasurementsForm] = useState(false); // Hidden by default
  const [showGoalsForm, setShowGoalsForm] = useState(false); // Hidden by default

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
    })
    .catch(error => {
      console.error('Error fetching goals data:', error.response || error.message);
    });

    // Fetch weight records
    fetchWeightRecords();

    // Fetch measurement records and latest measurement (new logic)
    fetchAllMeasurements(userId);
    fetchLatestMeasurement(userId);
  }, []);

  const fetchWeightRecords = () => {
    const userId = getUserId();
    axios.get(`/${userId}/weightRecords`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(response => {
      console.log('Weight records fetched successfully:', response.data);
      setWeightRecords(response.data.reverse()); // Reverse the order here
    })
    .catch(error => {
      console.error('Error fetching weight records:', error.response || error.message);
    });
  };

  // New logic: Fetch all measurement records
  const fetchAllMeasurements = (userId) => {
    axios.get(`/user/measurements/${userId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(response => {
      setMeasurementRecords(response.data.reverse());
    })
    .catch(error => {
      console.error('Error fetching measurement records:', error.response || error.message);
    });
  };

  // New logic: Fetch the latest measurement
  const fetchLatestMeasurement = (userId) => {
    axios.get(`/user/latestMeasurement/${userId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    .then(response => {
      setLatestMeasurement(response.data);
    })
    .catch(error => {
      console.error('Error fetching latest measurement:', error.response || error.message);
    });
  };

  // New logic: Handle input change for measurements
  const handleMeasurementChange = (event) => {
    const { name, value } = event.target;
    setNewMeasurements({
      ...newMeasurements,
      [name]: value
    });
  };

  // New logic: Handle adding a new measurement record
  const handleAddMeasurement = () => {
    const userId = getUserId();
    axios.post(`/add/${userId}/measurements`, {
      shoulder: parseFloat(newMeasurements.shoulder),
      chest: parseFloat(newMeasurements.chest),
      biceps: parseFloat(newMeasurements.biceps),
      waist: parseFloat(newMeasurements.waist),
      hips: parseFloat(newMeasurements.hips),
      thigh: parseFloat(newMeasurements.thigh),
      calf: parseFloat(newMeasurements.calf)
    }, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      alert('Measurement added successfully!');
      fetchAllMeasurements(userId); // Re-fetch measurement records to update the list
      fetchLatestMeasurement(userId); // Update the latest measurement
    })
    .catch(error => {
      console.error('Error adding measurement:', error.response || error.message);
    });
  };

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
      fetchWeightRecords(); // Re-fetch weight records to update the list
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

  const toggleShowWeightRecords = () => {
    setShowWeightRecords(!showWeightRecords);
  };

  const toggleShowMeasurementRecords = () => {
    setShowMeasurementRecords(!showMeasurementRecords);
  };

  const toggleShowMeasurementsForm = () => {
    setShowMeasurementsForm(!showMeasurementsForm);
  };

  const toggleShowGoalsForm = () => {
    setShowGoalsForm(!showGoalsForm);
  };

  return (
    <div className="profile-container">
      <h1>Profile of {user.name}</h1>
      <div className="profile-details">
        <div className="detail-card">
          <span className="icon">🎂</span>
          <p><strong>Age:</strong> {user.age} years</p>
        </div>

        <div className="detail-card">
          <span className="icon">⚖️</span>
          <p><strong>Weight:</strong> {user.weight} kg</p>
        </div>

        <div className="detail-card">
          <span className="icon">📏</span>
          <p><strong>Height:</strong> {user.height} cm</p>
        </div>
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

      {/* Buttons for toggling Set Goals and Add Measurements, horizontally */}
      <div className="button-row">
        <button onClick={toggleShowGoalsForm}>
          {showGoalsForm ? 'Hide Set Goals' : 'Show Set Goals'}
        </button>

        <button onClick={toggleShowMeasurementsForm}>
          {showMeasurementsForm ? 'Hide Add Measurements' : 'Show Add Measurements'}
        </button>
      </div>

      {showGoalsForm && (
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
      )}

      {showMeasurementsForm && (
        <div className="update-measurements">
          <h2>Add Measurements</h2>
          <input
            type="number"
            name="shoulder"
            value={newMeasurements.shoulder}
            onChange={handleMeasurementChange}
            placeholder="Shoulder (cm)"
            min="1"
          />
          <input
            type="number"
            name="chest"
            value={newMeasurements.chest}
            onChange={handleMeasurementChange}
            placeholder="Chest (cm)"
            min="1"
          />
          <input
            type="number"
            name="biceps"
            value={newMeasurements.biceps}
            onChange={handleMeasurementChange}
            placeholder="Biceps (cm)"
            min="1"
          />
          <input
            type="number"
            name="waist"
            value={newMeasurements.waist}
            onChange={handleMeasurementChange}
            placeholder="Waist (cm)"
            min="1"
          />
          <input
            type="number"
            name="hips"
            value={newMeasurements.hips}
            onChange={handleMeasurementChange}
            placeholder="Hips (cm)"
            min="1"
          />
          <input
            type="number"
            name="thigh"
            value={newMeasurements.thigh}
            onChange={handleMeasurementChange}
            placeholder="Thigh (cm)"
          />
          <input
            type="number"
            name="calf"
            value={newMeasurements.calf}
            onChange={handleMeasurementChange}
            placeholder="Calf (cm)"
            min="1"
          />
          <button onClick={handleAddMeasurement}>Add Measurement</button>
        </div>
      )}

      {/* New section: Display Latest Measurement */}
     <div className="measurement-body">
       <h2>
         Latest Measurement
         {latestMeasurement && (
           <span> on {new Date(latestMeasurement.date).toLocaleDateString()}</span>
         )}
       </h2>
       {latestMeasurement ? (
         <div className="body-container">
           <img src="/body-image.png" alt="Body" className="body-image" />

           {/* Labels on the left side */}
           <div className="measurement-label shoulder left">
             <p><strong>Shoulders:</strong> {latestMeasurement.shoulder} cm</p>
           </div>

           <div className="measurement-label biceps left">
             <p><strong>Biceps:</strong> {latestMeasurement.biceps} cm</p>
           </div>

           <div className="measurement-label waist left">
             <p><strong>Waist:</strong> {latestMeasurement.waist} cm</p>
           </div>

           {/* Labels on the right side */}
           <div className="measurement-label chest right">
             <p><strong>Chest:</strong> {latestMeasurement.chest} cm</p>
           </div>

           <div className="measurement-label hips right">
             <p><strong>Hips:</strong> {latestMeasurement.hips} cm</p>
           </div>

           <div className="measurement-label thigh right">
             <p><strong>Thighs:</strong> {latestMeasurement.thigh} cm</p>
           </div>

           <div className="measurement-label calf right">
             <p><strong>Calfs:</strong> {latestMeasurement.calf} cm</p>
           </div>
         </div>
       ) : (
         <p>No latest measurement available.</p>
       )}
     </div>


      {/* New section: Display All Measurements */}
      <div className="measurement-records">
        <button onClick={toggleShowMeasurementRecords}>
          {showMeasurementRecords ? 'Hide Measurement Records' : 'Show Measurement Records'}
        </button>
        {showMeasurementRecords && (
          <div>
            <h2>All Measurement Records</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shoulder</th>
                  <th>Chest</th>
                  <th>Biceps</th>
                  <th>Waist</th>
                  <th>Hips</th>
                  <th>Thigh</th>
                  <th>Calf</th>
                </tr>
              </thead>
              <tbody>
                {measurementRecords.map((record, index) => (
                  <tr key={index}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.shoulder} cm</td>
                    <td>{record.chest} cm</td>
                    <td>{record.biceps} cm</td>
                    <td>{record.waist} cm</td>
                    <td>{record.hips} cm</td>
                    <td>{record.thigh} cm</td>
                    <td>{record.calf} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="weight-records">
        <button onClick={toggleShowWeightRecords}>
          {showWeightRecords ? 'Hide Weight Records' : 'Show Weight Records'}
        </button>
        {showWeightRecords && (
          <div>
            <h2>Weight Records</h2>
            <ul>
              {weightRecords.map((record, index) => (
                <li key={index}>
                  {record.date}: {record.weight} kg
                </li>
              ))}
            </ul>
          </div>
        )}
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
