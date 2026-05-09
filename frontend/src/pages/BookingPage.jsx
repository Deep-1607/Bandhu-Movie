import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useStore from '../store/useStore';
import { useWebSocket } from '../hooks/useWebSocket';
import SeatMap from '../components/SeatMap/SeatMap';
import CountdownTimer from '../components/Timer/CountdownTimer';
import BookingSummary from '../components/BookingSummary/BookingSummary';
import SeatCountModal from '../components/SeatCountModal/SeatCountModal';
import './BookingPage.css';

import { API_URL as API } from '../api';

export default function BookingPage() {
  const { setSeats, selectedSeats, showToast, targetSeatCount } = useStore();
  const [showCountModal, setShowCountModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetSeatCount === 0) {
      setShowCountModal(true);
    } else {
      setShowCountModal(false);
    }
  }, [targetSeatCount]);
  const [error, setError] = useState(null);

  useWebSocket();

  const fetchSeats = () => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API}/seats`)
      .then((r) => {
        setSeats(r.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load seats. Is the backend running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSeats();
  }, []);

  return (
    <div className="booking-page">
      {showCountModal && <SeatCountModal onConfirm={() => setShowCountModal(false)} />}
      
      {/* Hero Banner */}
      <header className="hero">
        <div className="hero__badge">NOW SHOWING</div>
        <h1 className="hero__title">Dhabkaaro</h1>
        <div className="hero__meta">
          <span>⭐ 8.7</span>
          <span>•</span>
          <span>2h 9m</span>
          <span>•</span>
          <span>Drama</span>
          <span>•</span>
          <span>12/5/26, 8:45 PM</span>
        </div>
        <div className="hero__venue">🎭 Apple Multiplex, Maninagar</div>
      </header>

      <main className="booking-layout">
        {/* Seat Map */}
        <div className="booking-layout__map">
          {loading ? (
            <div className="loading">Loading seats…</div>
          ) : error ? (
            <div className="loading error-state">
              <p>{error}</p>
              <button className="retry-btn" onClick={fetchSeats}>↻ Retry</button>
            </div>
          ) : (
            <SeatMap />
          )}
        </div>

        {/* Sidebar */}
        <aside className="booking-layout__sidebar">
          <CountdownTimer />
          <BookingSummary />

          {selectedSeats.length === 0 && !loading && !error && (
            <div className="empty-hint">
              <div className="empty-hint__icon">🎬</div>
              <p>Click any available seat to select it</p>
              <p className="empty-hint__sub">You can select up to <strong>10 seats</strong> per booking</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
