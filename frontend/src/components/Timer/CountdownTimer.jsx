import React, { useEffect, useRef, useState } from 'react';
import useStore from '../../store/useStore';
import axios from 'axios';
import './CountdownTimer.css';

import { API_URL as API } from '../../api';

export default function CountdownTimer() {
  const { timerExpiry, selectedSeats, sessionId, releaseSeatLocal, clearSelected } = useStore();
  const [secondsLeft, setSecondsLeft] = useState(null);

  // Keep a ref to the latest selectedSeats to avoid stale closure in the timer callback
  const selectedSeatsRef = useRef(selectedSeats);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  // Release all selected seats when timer hits 0
  const releaseAll = async () => {
    const toRelease = [...selectedSeatsRef.current];
    for (const id of toRelease) {
      try {
        await axios.post(`${API}/seats/${id}/release`, { session_id: sessionId });
      } catch { /* ignore — backend may have already released */ }
      releaseSeatLocal(id);
    }
    clearSelected();
  };

  useEffect(() => {
    if (!timerExpiry) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(timerExpiry) - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) releaseAll();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerExpiry]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: releaseAll reads from selectedSeatsRef (a ref), so it's safe to omit from deps

  if (secondsLeft === null || selectedSeats.length === 0) return null;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const isUrgent = secondsLeft < 120;

  return (
    <div className={`timer ${isUrgent ? 'timer--urgent' : ''}`}>
      <span className="timer__icon">⏱</span>
      <span className="timer__label">Seat hold expires in</span>
      <span className="timer__clock">{mins}:{secs}</span>
    </div>
  );
}
