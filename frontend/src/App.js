import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import RegistrationForm from './RegistrationForm';
import LoginForm from './LoginForm';
import CaloriesCalculator from './CaloriesCalculator';
import UserProfile from './UserProfile'; // Import the new component
import './App.css';





const App = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/calories-calculator" element={<CaloriesCalculator />} />
          <Route path="/user-profile" element={<UserProfile />} /> {/* New user profile route */}
          <Route path="/" element={<Navigate to="/register" />} /> {/* Default route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
