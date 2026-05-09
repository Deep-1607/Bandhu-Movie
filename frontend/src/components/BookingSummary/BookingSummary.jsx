import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import './BookingSummary.css';

export default function BookingSummary() {
  const {
    seats, selectedSeats, targetSeatCount
  } = useStore();
  const navigate = useNavigate();

  const mySeats = seats.filter(s => selectedSeats.includes(s.id));
  const total = mySeats.reduce((sum, s) => sum + s.price, 0);

  if (mySeats.length === 0) return null;

  const isReady = targetSeatCount > 0 ? selectedSeats.length === targetSeatCount : selectedSeats.length > 0;

  return (
    <div className="summary">
      <h3 className="summary__title">
        Your Selection
        <span className="summary__count">
          {selectedSeats.length}{targetSeatCount > 0 ? ` / ${targetSeatCount}` : ''} seat{selectedSeats.length !== 1 ? 's' : ''}
        </span>
      </h3>

      <div className="summary__seats">
        {mySeats.map((s) => (
          <div key={s.id} className="summary__row">
            <div className="summary__row-left">
              <span className="summary__seat-badge">{s.label}</span>
              <span className="summary__seat-info">
                {s.section.replace('_', ' ')} · Row {s.row || 'A'}
              </span>
            </div>
            <span className="summary__seat-price">₹{s.price}</span>
          </div>
        ))}
      </div>

      <div className="summary__total">
        <span>Total Amount</span>
        <span className="summary__total-amt">₹{total}</span>
      </div>

      <button
        className={`summary__btn ${!isReady ? 'summary__btn--disabled' : ''}`}
        onClick={() => isReady && navigate('/payment')}
        disabled={!isReady}
      >
        {isReady 
          ? <>🎟️&nbsp;&nbsp;Pay ₹{total} Now</> 
          : <>Select {targetSeatCount - selectedSeats.length} more seat{targetSeatCount - selectedSeats.length !== 1 ? 's' : ''}</>
        }
      </button>

      <p className="summary__note">
        {targetSeatCount > 0 
          ? `Please select exactly ${targetSeatCount} seats to proceed.` 
          : "Complete your selection to proceed to payment."
        }
      </p>
    </div>
  );
}
