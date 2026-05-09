import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PaymentPage from './pages/PaymentPage';
import Toast from './components/Toast/Toast';
import useStore from './store/useStore';
import './App.css';

/** Redirect to /login if not authenticated */
function ProtectedRoute({ children }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

/** Redirect if not one of the specific admins */
function AdminRoute({ children }) {
  const currentUser = useStore((s) => s.currentUser);
  const ADMIN_USERNAMES = ["admin", "deepd"];
  if (!currentUser || !ADMIN_USERNAMES.includes(currentUser.username)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

import { IconMovie } from './components/Icons';

function Navbar() {
  const { currentUser, logout, selectedSeats, MAX_SEATS } = useStore();
  const navigate = useNavigate();
  const ADMIN_USERNAMES = ["admin", "deepd"];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="app-nav">
      <Link to="/" className="app-nav__brand">
        <IconMovie size={24} />
        <span>BandhuShow</span>
      </Link>

      <div className="app-nav__center">
      </div>

      <div className="app-nav__links">
        {currentUser ? (
          <>
            <div className="app-nav__user">
              <span className="app-nav__avatar">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
              <span className="app-nav__name">{currentUser.name}</span>
            </div>
            {ADMIN_USERNAMES.includes(currentUser.username) && (
              <Link to="/admin" className="app-nav__link app-nav__link--admin">Admin ↗</Link>
            )}
            <button className="app-nav__logout" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="app-nav__link">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Toast />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
