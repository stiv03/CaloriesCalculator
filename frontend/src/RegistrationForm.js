import React, { useState } from 'react';
import axios from 'axios';
import './RegistrationForm.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    username: '',
    password: ''
  });

  const [token, setToken] = useState(''); // State to store the token
  const [error, setError] = useState(''); // State to store any error messages

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8080/api/v1/auth/register', formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setToken(response.data.token); // Assuming the token is returned in the response data as `token`
      console.log('Registration successful:', response.data);
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code that falls out of the range of 2xx
        console.error('Response error:', error.response.data);
        setError(error.response.data.message || 'Registration failed. Please try again.');
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Request error:', error.request);
        setError('No response from the server. Please try again later.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error:', error.message);
        setError('An error occurred. Please try again.');
      }
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
        {token && <p className="success">Registration successful! Your token: {token}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
};

export default RegistrationForm;
