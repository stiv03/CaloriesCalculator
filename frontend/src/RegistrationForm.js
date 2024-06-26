import React, { useState } from 'react';
import axios from './axiosConfig'; // Use the configured axios instance
import './RegistrationForm.css';
import { setToken } from './utils/auth'; // Import the setToken utility
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    username: '',
    password: ''
  });

  const [error, setError] = useState(''); // State to store any error messages
  const [successMessage, setSuccessMessage] = useState(''); // State to store the success message

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/auth/register', formData);
      const token = response.data.token; // Assuming the token is returned in the response data as `token`
      setToken(token); // Store the token in localStorage
      console.log('Registration successful:', response.data);
      setSuccessMessage('Registration successful!'); // Set the success message
      setError(''); // Clear any previous error messages
    } catch (error) {
      if (error.response) {
        console.error('Response error:', error.response.data);
        setError(error.response.data.message || 'Registration failed. Please try again.');
      } else if (error.request) {
        console.error('Request error:', error.request);
        setError('No response from the server. Please try again later.');
      } else {
        console.error('Error:', error.message);
        setError('An error occurred. Please try again.');
      }
      setSuccessMessage(''); // Clear any previous success messages
    }
  };

  return (
    <div className="container">
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="weight">Weight</label>
          <input
            type="number"
            step="0.1"
            id="weight"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="height">Height</label>
          <input
            type="number"
            id="height"
            name="height"
            value={formData.height}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Register</button>
        {successMessage && <p className="success">{successMessage}</p>}
        {error && <p className="error">{error}</p>}
      </form>
      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default RegistrationForm;
