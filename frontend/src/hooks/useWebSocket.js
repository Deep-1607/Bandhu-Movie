import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';

import { WS_URL } from '../api';

export function useWebSocket() {
  const ws = useRef(null);
  const store = useStore;   // access store imperatively to avoid stale closures

  useEffect(() => {
    let reconnectTimer = null;

    const connect = () => {
      ws.current = new WebSocket(WS_URL);
      ws.current.onopen = () => console.log('[WS] Connected');

      ws.current.onmessage = (evt) => {
        try {
          const { event, seat_id, session_id, locked_until } = JSON.parse(evt.data);
          const {
            onWsSeatLocked,
            onWsSeatReleased,
            onWsSeatSold,
            onWsSeatBlocked,
          } = store.getState();

          if (event === 'seat_locked') {
            onWsSeatLocked(seat_id, session_id, locked_until);
          } else if (event === 'seat_released') {
            onWsSeatReleased(seat_id, session_id);
          } else if (event === 'seat_sold') {
            onWsSeatSold(seat_id, session_id);
          } else if (event === 'seat_blocked') {
            onWsSeatBlocked(seat_id);
          }
        } catch { /* ignore parse errors */ }
      };

      ws.current.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.current.onerror = () => ws.current.close();
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws.current?.close();
    };
  }, []);   // empty dep array — intentional, we use store.getState() imperatively
}
