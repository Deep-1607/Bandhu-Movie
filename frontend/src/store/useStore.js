import { create } from 'zustand';

const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem('bandhushow_user') || 'null'); }
  catch { return null; }
})();

const MAX_SEATS = 10;

const useStore = create((set, get) => ({
  seats: [],
  selectedSeats: [],
  sessionId: SESSION_ID,
  timerExpiry: null,
  targetSeatCount: 0,
  currentUser: storedUser,
  toast: null,
  MAX_SEATS,

  setTargetSeatCount: (count) => set({ targetSeatCount: count }),

  // ── Auth ────────────────────────────────────────────────────────────────
  login: (user) => {
    localStorage.setItem('bandhushow_user', JSON.stringify(user));
    set({ 
      currentUser: user,
      selectedSeats: [],
      targetSeatCount: 0,
      timerExpiry: null 
    });
  },
  logout: () => {
    localStorage.removeItem('bandhushow_user');
    set({ 
      currentUser: null, 
      selectedSeats: [], 
      timerExpiry: null, 
      targetSeatCount: 0 
    });
  },

  // ── Toast ────────────────────────────────────────────────────────────────
  showToast: (message, type = 'error') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3500);
  },

  // ── Seat hydration ────────────────────────────────────────────────────────
  setSeats: (seats) => set({ seats }),

  setTimerExpiry: (iso) => set({ timerExpiry: iso }),

  canSelectMore: () => {
    const { selectedSeats, targetSeatCount, MAX_SEATS } = get();
    const limit = targetSeatCount > 0 ? targetSeatCount : MAX_SEATS;
    return selectedSeats.length < limit;
  },

  // ── Optimistic: called by Seat.jsx on click (immediate visual feedback) ──
  lockSeatLocal: (seat_id, locked_until) =>
    set((state) => ({
      seats: state.seats.map((s) =>
        s.id === seat_id
          ? { ...s, status: 'locked', locked_by: state.sessionId, locked_until }
          : s
      ),
      selectedSeats: state.selectedSeats.includes(seat_id)
        ? state.selectedSeats
        : [...state.selectedSeats, seat_id],
      timerExpiry: locked_until ?? state.timerExpiry,
    })),

  releaseSeatLocal: (seat_id) =>
    set((state) => {
      const newSelected = state.selectedSeats.filter((id) => id !== seat_id);
      return {
        seats: state.seats.map((s) =>
          s.id === seat_id
            ? { ...s, status: 'available', locked_by: null, locked_until: null }
            : s
        ),
        selectedSeats: newSelected,
        // Clear timer expiry when no seats remain selected
        timerExpiry: newSelected.length === 0 ? null : state.timerExpiry,
      };
    }),

  markSeatSoldLocal: (seat_id) =>
    set((state) => ({
      seats: state.seats.map((s) =>
        s.id === seat_id ? { ...s, status: 'sold', locked_by: null } : s
      ),
      selectedSeats: state.selectedSeats.filter((id) => id !== seat_id),
    })),

  // ── WS handlers: ONLY for events from OTHER users ─────────────────────────
  // We already applied local changes above; WS just syncs other tabs/users.
  onWsSeatLocked: (seat_id, by_session_id, locked_until) => {
    const { sessionId } = get();
    // Ignore our own WS echo — we already applied it locally
    if (by_session_id === sessionId) return;
    set((state) => ({
      seats: state.seats.map((s) =>
        s.id === seat_id
          ? { ...s, status: 'locked', locked_by: by_session_id, locked_until }
          : s
      ),
    }));
  },

  onWsSeatReleased: (seat_id, by_session_id) => {
    const { sessionId } = get();
    // Ignore our own WS echo
    if (by_session_id === sessionId) return;
    set((state) => ({
      seats: state.seats.map((s) =>
        s.id === seat_id
          ? { ...s, status: 'available', locked_by: null, locked_until: null }
          : s
      ),
      // If this was one of our selected seats (e.g. admin unblocked), remove it
      selectedSeats: state.selectedSeats.filter((id) => id !== seat_id),
    }));
  },

  onWsSeatSold: (seat_id, by_session_id) => {
    const { sessionId } = get();
    if (by_session_id === sessionId) return;
    set((state) => ({
      seats: state.seats.map((s) =>
        s.id === seat_id ? { ...s, status: 'sold', locked_by: null } : s
      ),
    }));
  },

  // ── Admin block event ──────────────────────────────────────────────────────
  onWsSeatBlocked: (seat_id) => {
    set((state) => {
      const newSelected = state.selectedSeats.filter((id) => id !== seat_id);
      return {
        seats: state.seats.map((s) =>
          s.id === seat_id
            ? { ...s, status: 'blocked', locked_by: null, locked_until: null }
            : s
        ),
        // Remove from selection if the user had it selected
        selectedSeats: newSelected,
        timerExpiry: newSelected.length === 0 ? null : state.timerExpiry,
      };
    });
  },

  clearSelected: () => set({ selectedSeats: [], timerExpiry: null }),
}));

export default useStore;
export { SESSION_ID };
