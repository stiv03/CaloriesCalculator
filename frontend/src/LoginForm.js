import React, { useState, useEffect } from 'react';
import axios from './axiosConfig'; // Use the configured axios instance
import './LoginForm.css'; // Create a separate CSS file for styling
import { setToken, setUserId } from './utils/auth'; // Import the setToken utility
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import { Link } from 'react-router-dom'; // Import Link from react-router-dom



const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState(''); // State to store any error messages
  const [successMessage, setSuccessMessage] = useState(''); // State to store the success message
  const [isLoading, setIsLoading] = useState(false); // State to manage loading state
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    // Add the 'no-scroll' class to the body when the component mounts
    document.body.classList.add('no-scroll');
    document.body.classList.add('login-page');
    // Remove the 'no-scroll' class from the body when the component unmounts
    return () => {
      document.body.classList.remove('no-scroll');
      document.body.classList.remove('login-page');
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post('/auth/login', formData);
      setToken(response.data.token); // Store the token in localStorage
      setUserId(response.data.userId); // Store the userId in localStorage
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">

          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            required
          />
        </div>
        <div className="form-group">

          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
             placeholder="Password"
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        {successMessage && <p className="success">{successMessage}</p>}
        {error && <p className="error">{error}</p>}
      </form>
       <p>
              Don&apos;t have account ? <Link to="/register">Register here</Link>
            </p>

    </div>
  );
};

export default LoginForm;
