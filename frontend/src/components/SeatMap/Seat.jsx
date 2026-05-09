import React, { useRef } from 'react';
import useStore from '../../store/useStore';
import axios from 'axios';
import './Seat.css';

import { API_URL as API } from '../../api';

export default function Seat({ seat }) {
  const {
    sessionId,
    selectedSeats,
    canSelectMore,
    MAX_SEATS,
    showToast,
    lockSeatLocal,
    releaseSeatLocal,
    setTimerExpiry,
    targetSeatCount,
  } = useStore();

  // Prevent double-click race conditions
  const busy = useRef(false);

  const isMyLock    = seat.status === 'locked' && seat.locked_by === sessionId;
  const isSelected  = selectedSeats.includes(seat.id);
  const othersLock  = seat.status === 'locked' && seat.locked_by !== sessionId;

  // Derive visual state
  let state;
  if (seat.status === 'sold')     state = 'sold';
  else if (seat.status === 'blocked') state = 'blocked';
  else if (othersLock)            state = 'locked';      // orange — someone else's hold
  else if (isMyLock || isSelected) state = 'selected';   // green  — my selection
  else                            state = 'available';

  const isClickable = state === 'available' || state === 'selected';

  const handleClick = async () => {
    if (!isClickable || busy.current) return;
    busy.current = true;

    try {
      // ── DESELECT ─────────────────────────────────────────────────────────
      if (isSelected || isMyLock) {
        releaseSeatLocal(seat.id);                        // instant green→outline
        await axios.post(`${API}/seats/${seat.id}/release`, { session_id: sessionId });
        return;
      }

      // ── SELECT ────────────────────────────────────────────────────────────
      if (!canSelectMore()) {
        showToast(`Max ${MAX_SEATS} seats per booking`, 'warning');
        return;
      }

      lockSeatLocal(seat.id, null);                       // instant outline→green

      const res = await axios.post(`${API}/seats/${seat.id}/select`, {
        session_id: sessionId,
      });

      if (res.data.locked_until) {
        setTimerExpiry(res.data.locked_until);
      }

      // If we just hit the target count, notify the user
      const currentCount = selectedSeats.length + 1;
      const limit = targetSeatCount > 0 ? targetSeatCount : MAX_SEATS;
      if (currentCount === limit) {
        showToast(`All ${limit} seats selected! Ready to pay.`, 'success');
      }

    } catch (err) {
      // Rollback optimistic state on any failure
      releaseSeatLocal(seat.id);
      const detail = err.response?.data?.detail;
      showToast(detail || 'Seat unavailable, try another', 'error');
    } finally {
      busy.current = false;
    }
  };

  return (
    <button
      className={`seat seat--${state}`}
      onClick={handleClick}
      disabled={!isClickable}
      title={`${seat.id} · ${state}`}
      aria-label={`Seat ${seat.label} ${state}`}
    >
      {seat.label}
    </button>
  );
}
