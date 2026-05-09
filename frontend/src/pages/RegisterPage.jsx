import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useStore from '../store/useStore';
import './LoginPage.css'; // Reuse login styles

import { API_URL as API } from '../api';
import { IconMovie, IconSparkles } from '../components/Icons';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useStore();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/register`, { name, username, password });
      showToast('Registration successful! Please login.', 'success');
      navigate('/login');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <div className="login-logo">
            <IconMovie size={40} className="login-logo__svg" />
          </div>
          <h1>BandhuShow</h1>
          <p>Create your account to start booking</p>
        </header>

        <form className="login-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label>FULL NAME</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>USERNAME</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? 'Creating Account...' : (
              <>
                <IconSparkles size={20} />
                <span>Register Now</span>
              </>
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p>Already have an account? <Link to="/login">Login here</Link></p>
        </footer>
      </div>
    </div>
  );
}
