import React, { useState } from 'react';
import axios from './axiosConfig'; // Use the configured axios instance
import './LoginForm.css'; // Create a separate CSS file for styling
import { setToken, setUserId } from './utils/auth'; // Import the setToken utility
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState(''); // State to store any error messages
  const [successMessage, setSuccessMessage] = useState(''); // State to store the success message
  const navigate = useNavigate(); // Initialize useNavigate

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/auth/login', formData);
      setToken(response.data.token); // Store the token in localStorage
      setUserId(response.data.userId) // Store the userId in localStorage
      console.log('Login successful:', response.data);
      setSuccessMessage('Login successful!'); // Set the success message
      setError(''); // Clear any previous error messages
      navigate('/calories-calculator'); // Redirect to /calories-calculator after successful login
    } catch (error) {
      if (error.response) {
        console.error('Response error:', error.response.data);
        setError(error.response.data.message || 'Login failed. Please try again.');
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
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
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
        <button type="submit">Login</button>
        {successMessage && <p className="success">{successMessage}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
};

export default LoginForm;
