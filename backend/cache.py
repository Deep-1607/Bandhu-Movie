import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Callable, Awaitable

IST = timezone(timedelta(hours=5, minutes=30))

LOCK_DURATION = 600  # 10 minutes


class SeatLockCache:
    def __init__(self):
        self._locks: Dict[str, dict] = {}
        self._timers: Dict[str, asyncio.TimerHandle] = {}
        self._release_callback: Optional[Callable[[str], Awaitable[None]]] = None

    def set_release_callback(self, callback: Callable[[str], Awaitable[None]]):
        self._release_callback = callback

    def acquire(self, seat_id: str, session_id: str) -> bool:
        if seat_id in self._locks:
            return False
        expires_at = datetime.now(IST) + timedelta(seconds=LOCK_DURATION)
        self._locks[seat_id] = {"session_id": session_id, "expires_at": expires_at}
        try:
            loop = asyncio.get_event_loop()
            handle = loop.call_later(LOCK_DURATION, self._on_expire, seat_id)
            self._timers[seat_id] = handle
        except RuntimeError:
            pass
        return True

    def release(self, seat_id: str, session_id: Optional[str] = None) -> bool:
        lock = self._locks.get(seat_id)
        if not lock:
            return False
        if session_id and lock["session_id"] != session_id:
            return False
        self._locks.pop(seat_id, None)
        handle = self._timers.pop(seat_id, None)
        if handle:
            handle.cancel()
        return True

    def is_locked(self, seat_id: str) -> bool:
        return seat_id in self._locks

    def get_lock(self, seat_id: str) -> Optional[dict]:
        return self._locks.get(seat_id)

    def all_locked_ids(self):
        return set(self._locks.keys())

    def _on_expire(self, seat_id: str):
        self._locks.pop(seat_id, None)
        self._timers.pop(seat_id, None)
        if self._release_callback:
            asyncio.ensure_future(self._release_callback(seat_id))


seat_lock_cache = SeatLockCache()
