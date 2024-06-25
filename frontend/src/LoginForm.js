import React, { useState } from 'react';
import axios from './axiosConfig'; // Use the configured axios instance
import './LoginForm.css'; // Create a separate CSS file for styling
import { setToken } from './utils/auth'; // Import the setToken utility

const LoginForm = () => {
  const [formData, setFormData] = useState({
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
      const response = await axios.post('/auth/login', formData);
      const token = response.data.token; // Assuming the token is returned in the response data as `token`
      setToken(token); // Store the token in localStorage
      console.log('Login successful:', response.data);
      setSuccessMessage('Login successful!'); // Set the success message
      setError(''); // Clear any previous error messages
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
