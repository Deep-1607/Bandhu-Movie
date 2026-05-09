from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from database import get_db, AsyncSessionLocal
from models import Seat, Booking
from schemas import SeatResponse, SelectSeatRequest, ReleaseRequest, ConfirmRequest
from cache import seat_lock_cache
from websocket_manager import manager
from datetime import datetime, timedelta, timezone
from typing import List
import os
import uuid
import aiofiles

IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter()


async def release_stale_locks():
    """Called at startup — releases any seats that were locked in DB but
    the cache (in-memory) no longer tracks (server restart scenario)."""
    async with AsyncSessionLocal() as db:
        async with db.begin():
            await db.execute(
                update(Seat)
                .where(Seat.status == "locked")
                .values(status="available", locked_by=None, locked_until=None)
            )
    print("[startup] Stale seat locks released.")


# ── Expiry callback wired up at import time ─────────────────────────────────
async def on_seat_expire(seat_id: str):
    async with AsyncSessionLocal() as db:
        async with db.begin():
            await db.execute(
                update(Seat)
                .where(Seat.id == seat_id, Seat.status == "locked")
                .values(status="available", locked_by=None, locked_until=None)
            )
    await manager.broadcast("seat_released", {"seat_id": seat_id, "reason": "expired"})


seat_lock_cache.set_release_callback(on_seat_expire)


# ── GET /api/seats ───────────────────────────────────────────────────────────
@router.get("/seats", response_model=List[SeatResponse])
async def get_seats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Seat).order_by(Seat.section, Seat.row, Seat.number)
    )
    return result.scalars().all()


# ── POST /api/seats/{seat_id}/select ────────────────────────────────────────
@router.post("/seats/{seat_id}/select")
async def select_seat(
    seat_id: str,
    req: SelectSeatRequest,
    db: AsyncSession = Depends(get_db),
):
    # Fast-path: cache says it's locked by someone else
    if seat_lock_cache.is_locked(seat_id):
        lock = seat_lock_cache.get_lock(seat_id)
        if lock and lock["session_id"] != req.session_id:
            raise HTTPException(status_code=409, detail="Seat locked by another user")

    # Atomic DB update: only succeeds if status == 'available'
    async with db.begin():
        result = await db.execute(
            select(Seat).where(Seat.id == seat_id).with_for_update()
        )
        seat = result.scalar_one_or_none()
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")
        if seat.status != "available":
            raise HTTPException(status_code=409, detail=f"Seat is {seat.status}")

        locked_until = datetime.now(IST) + timedelta(seconds=600)
        seat.status = "locked"
        seat.locked_by = req.session_id
        seat.locked_until = locked_until

    seat_lock_cache.acquire(seat_id, req.session_id)

    await manager.broadcast(
        "seat_locked",
        {
            "seat_id": seat_id,
            "session_id": req.session_id,
            "locked_until": locked_until.isoformat(),
        },
    )
    return {"status": "locked", "seat_id": seat_id, "locked_until": locked_until.isoformat()}


# ── POST /api/seats/{seat_id}/release ───────────────────────────────────────
@router.post("/seats/{seat_id}/release")
async def release_seat(
    seat_id: str,
    req: ReleaseRequest,
    db: AsyncSession = Depends(get_db),
):
    async with db.begin():
        result = await db.execute(
            select(Seat).where(Seat.id == seat_id, Seat.locked_by == req.session_id)
        )
        seat = result.scalar_one_or_none()
        if seat:
            seat.status = "available"
            seat.locked_by = None
            seat.locked_until = None

    seat_lock_cache.release(seat_id, req.session_id)
    await manager.broadcast("seat_released", {"seat_id": seat_id, "session_id": req.session_id})
    return {"status": "released"}


# ── POST /api/seats/confirm-manual ───────────────────────────────────────
@router.post("/seats/confirm-manual")
async def confirm_manual(
    session_id: str = Form(...),
    seat_ids: str = Form(...),
    customer_name: str = Form(...),
    customer_phone: str = Form(...),
    screenshot: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    seat_id_list = [s.strip() for s in seat_ids.split(",") if s.strip()]
    if not seat_id_list:
        raise HTTPException(status_code=400, detail="No seats selected")
        
    # Convert to Base64 for permanent storage in DB
    import base64
    content = await screenshot.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    mime_type = screenshot.content_type or "image/png"
    screenshot_data = f"data:{mime_type};base64,{base64_image}"
        
    receipt_no = 1
    async with db.begin():
        # verify all seats
        result = await db.execute(
            select(Seat).where(Seat.id.in_(seat_id_list), Seat.locked_by == session_id)
        )
        seats_to_confirm = result.scalars().all()
        
        if len(seats_to_confirm) != len(seat_id_list):
            raise HTTPException(status_code=404, detail="One or more seats not found or not locked by you")
            
        # Get next receipt number
        res = await db.execute(select(func.max(Booking.receipt_no)))
        max_no = res.scalar() or 0
        receipt_no = max_no + 1

        for seat in seats_to_confirm:
            seat.status = "sold"
            seat.transaction_id = "manual"
            seat.locked_by = None
            seat.locked_until = None
            
            booking = Booking(
                seat_id=seat.id,
                user_session=session_id,
                customer_name=customer_name,
                customer_phone=customer_phone,
                screenshot_filename=screenshot_data,
                amount=seat.price,
                receipt_no=receipt_no
            )
            db.add(booking)
            
    for seat_id in seat_id_list:
        seat_lock_cache.release(seat_id)
        await manager.broadcast(
            "seat_sold",
            {"seat_id": seat_id, "session_id": session_id, "transaction_id": "manual"},
        )
        
    return {"status": "sold", "seat_ids": seat_id_list, "receipt_no": receipt_no}
