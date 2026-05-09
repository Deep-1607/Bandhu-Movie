import React, { useState } from 'react';
import useStore from '../../store/useStore';
import scooterImg from '../../assets/scooter_side.png';
import carImg from '../../assets/car_side.png';
import minibusImg from '../../assets/minibus_side.png';
import './SeatCountModal.css';

export default function SeatCountModal({ onConfirm }) {
  const [selectedCount, setSelectedCount] = useState(2);
  const { setTargetSeatCount } = useStore();

  const handleConfirm = () => {
    setTargetSeatCount(selectedCount);
    onConfirm();
  };

  const getIcon = () => {
    if (selectedCount <= 2) return scooterImg;
    if (selectedCount <= 5) return carImg;
    return minibusImg;
  };

  return (
    <div className="seat-modal-overlay">
      <div className="seat-modal">
        <h2 className="seat-modal__title">How many seats?</h2>
        
        <div className="seat-modal__image">
          <img src={getIcon()} alt="Vehicle" />
        </div>

        <div className="seat-modal__counts">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              className={`seat-modal__count-btn ${selectedCount === num ? 'active' : ''}`}
              onClick={() => setSelectedCount(num)}
            >
              {num}
            </button>
          ))}
        </div>

        <div className="seat-modal__divider" />

        <div className="seat-modal__pricing">
          <div className="pricing-item">
            <span className="pricing-label">UPPER SOFA</span>
            <span className="pricing-value">₹150</span>
            <span className="pricing-status">AVAILABLE</span>
          </div>
          <div className="pricing-item">
            <span className="pricing-label">PLATINUM</span>
            <span className="pricing-value">₹100</span>
            <span className="pricing-status">AVAILABLE</span>
          </div>
          <div className="pricing-item">
            <span className="pricing-label">LOUNGER</span>
            <span className="pricing-value">₹150</span>
            <span className="pricing-status">AVAILABLE</span>
          </div>
        </div>

        <button className="seat-modal__confirm-btn" onClick={handleConfirm}>
          Select Seats
        </button>
      </div>
    </div>
  );
}
