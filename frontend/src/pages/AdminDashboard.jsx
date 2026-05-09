import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useStore from '../store/useStore';
import './AdminDashboard.css';

import { API_URL as BASE_API, BASE_URL } from '../api';
const API = `${BASE_API}/admin`;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [seats, setSeats] = useState([]);
  const [filter, setFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);
  const currentUser = useStore((s) => s.currentUser);

  const fetchData = async () => {
    try {
      const headers = { 'X-Admin-User': currentUser?.username };
      const [s, ss] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/seats`, { headers }),
      ]);
      setStats(s.data);
      setSeats(ss.data);
    } catch (err) {
      console.error("Admin fetch failed", err);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  const handleBlock = async (seat_id, isBlocked) => {
    const url = `${API}/seats/${seat_id}/${isBlocked ? 'unblock' : 'block'}`;
    const headers = { 'X-Admin-User': currentUser?.username };
    await axios.post(url, {}, { headers }).catch(() => {});
    fetchData();
  };

  const handleRelease = async (seat_id) => {
    if (!window.confirm("Are you sure you want to cancel this booking and make the seat available?")) return;
    const url = `${API}/seats/${seat_id}/release-sold`;
    const headers = { 'X-Admin-User': currentUser?.username };
    await axios.post(url, {}, { headers }).catch(() => {});
    fetchData();
  };

  const filteredSeats = filter === 'all' ? seats : seats.filter((s) => s.status === filter);

  return (
    <div className="admin">
      <header className="admin__header">
        <h1>🎬 BandhuShow Admin</h1>
        <button className="admin__refresh" onClick={fetchData}>↻ Refresh</button>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="admin__stats">
          {[
            { label: 'Total Seats',  value: stats.total,     color: '#6366f1' },
            { label: 'Available',    value: stats.available, color: '#22c55e' },
            { label: 'Locked',       value: stats.locked,    color: '#f97316' },
            { label: 'Sold',         value: stats.sold,      color: '#94a3b8' },
            { label: 'Blocked',      value: stats.blocked,   color: '#ef4444' },
            { label: 'Revenue',      value: `₹${stats.revenue}`, color: '#fbbf24' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ '--accent': color }}>
              <div className="stat-card__value">{value}</div>
              <div className="stat-card__label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="admin__filters">
        {['all', 'available', 'locked', 'sold', 'blocked'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Seat Grid */}
      <div className="admin__grid">
        {filteredSeats.map((seat) => (
          <div key={seat.id} className={`admin-seat admin-seat--${seat.status}`}>
            <div className="admin-seat__main">
              <div className="admin-seat__id">{seat.id}</div>
              <div className="admin-seat__status">{seat.status}</div>
              <div className="admin-seat__price">₹{seat.price}</div>
            </div>

            {seat.customer_name && (
              <div className="admin-seat__customer">
                <div className="receipt-no">🎟️ Receipt: #{String(seat.receipt_no).padStart(3, '0')}</div>
                <div className="customer-name">👤 {seat.customer_name}</div>
                <div className="customer-phone">📞 {seat.customer_phone}</div>
                {seat.screenshot && (
                  <button 
                    onClick={() => setPreviewImage(seat.screenshot.startsWith('data:') ? seat.screenshot : `${BASE_URL}${seat.screenshot}`)}
                    className="view-proof-btn"
                  >
                    🖼️ View Payment
                  </button>
                )}
              </div>
            )}

            <div className="admin-seat__actions">
              {seat.status !== 'sold' ? (
                <button
                  className="admin-seat__toggle"
                  onClick={() => handleBlock(seat.id, seat.status === 'blocked')}
                >
                  {seat.status === 'blocked' ? 'Unblock' : 'Block'}
                </button>
              ) : (
                <button
                  className="admin-seat__release"
                  onClick={() => handleRelease(seat.id)}
                >
                  ❌ Cancel Booking
                </button>
              )}
            </div>
          </div>
        ))}
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="admin-modal" onClick={() => setPreviewImage(null)}>
          <div className="admin-modal__content" onClick={e => e.stopPropagation()}>
            <button className="admin-modal__close" onClick={() => setPreviewImage(null)}>×</button>
            <img src={previewImage} alt="Payment Proof" />
          </div>
        </div>
      )}
    </div>
  );
}
