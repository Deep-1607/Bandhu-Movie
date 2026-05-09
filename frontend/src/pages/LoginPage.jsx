import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useStore from '../store/useStore';
import './LoginPage.css';

import { API_URL as API } from '../api';
import { IconMovie, IconUser, IconLock, IconTicket } from '../components/Icons';

export default function LoginPage() {
  const { login, showToast } = useStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API}/login`, { username, password });
      login(res.data);
      showToast(`Welcome back, ${res.data.name}!`, 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-blob login-blob--1" />
      <div className="login-blob login-blob--2" />

      <div className="login-card">
        <header className="login-header">
          <div className="login-logo">
            <IconMovie size={32} className="login-logo__svg" />
            <span className="login-logo__text">BandhuShow</span>
          </div>
          <h1>Welcome Back!</h1>
          <p>Sign in to your account</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label">USERNAME</label>
            <div className="field__wrap">
              <span className="field__icon"><IconUser size={18} /></span>
              <input
                className="field__input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label">PASSWORD</label>
            <div className="field__wrap">
              <span className="field__icon"><IconLock size={18} /></span>
              <input
                className="field__input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
            type="submit"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : (
              <>
                <IconTicket size={20} />
                <span>Login to Book</span>
              </>
            )}
          </button>
        </form>

        <footer className="login-footer" style={{marginTop: '24px', textAlign: 'center'}}>
          <p style={{fontSize: '14px', color: '#64748b'}}>
            Don't have an account? <Link to="/register" style={{color: '#22c55e', fontWeight: '700', textDecoration: 'none'}}>Register here</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
