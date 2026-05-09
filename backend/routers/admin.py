from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models import Seat, Booking
from schemas import AdminStats
from cache import seat_lock_cache

router = APIRouter()

# ONLY THESE 2 USERNAMES CAN ACCESS ADMIN FEATURES
ADMIN_USERNAMES = ["admin", "deepd"] 

async def verify_admin(x_admin_user: str = Header(None)):
    if not x_admin_user or x_admin_user not in ADMIN_USERNAMES:
        raise HTTPException(status_code=403, detail="Access denied: Admin only")
    return x_admin_user

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    result = await db.execute(select(Seat))
    seats = result.scalars().all()

    sold_seats = [s for s in seats if s.status == "sold"]
    revenue = sum(s.price for s in sold_seats)

    return AdminStats(
        total=len(seats),
        available=sum(1 for s in seats if s.status == "available"),
        locked=sum(1 for s in seats if s.status == "locked"),
        sold=len(sold_seats),
        blocked=sum(1 for s in seats if s.status == "blocked"),
        revenue=revenue,
    )


@router.post("/seats/{seat_id}/block")
async def block_seat(
    seat_id: str, 
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    async with db.begin():
        result = await db.execute(select(Seat).where(Seat.id == seat_id))
        seat = result.scalar_one_or_none()
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")
        if seat.status == "sold":
            raise HTTPException(status_code=409, detail="Cannot block a sold seat")
        seat.status = "blocked"
        seat_lock_cache.release(seat_id)

    # Broadcast so the seat map updates live for all users
    from websocket_manager import manager
    await manager.broadcast("seat_blocked", {"seat_id": seat_id})
    return {"status": "blocked", "seat_id": seat_id}


@router.post("/seats/{seat_id}/unblock")
async def unblock_seat(
    seat_id: str, 
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    async with db.begin():
        result = await db.execute(select(Seat).where(Seat.id == seat_id))
        seat = result.scalar_one_or_none()
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")
        if seat.status != "blocked":
            raise HTTPException(status_code=409, detail="Seat is not blocked")
        seat.status = "available"

    # Broadcast so the seat map updates live for all users
    from websocket_manager import manager
    await manager.broadcast("seat_released", {"seat_id": seat_id, "session_id": "__admin__"})
    return {"status": "available", "seat_id": seat_id}


@router.get("/seats")
async def get_all_seats_admin(
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    # Join with bookings to get customer details
    result = await db.execute(
        select(Seat)
        .options(selectinload(Seat.bookings))
        .order_by(Seat.section, Seat.row, Seat.number)
    )
    seats = result.scalars().all()
    
    output = []
    for s in seats:
        booking = s.bookings[0] if s.bookings else None
        output.append({
            "id": s.id,
            "section": s.section,
            "row": s.row,
            "number": s.number,
            "label": s.label,
            "price": s.price,
            "status": s.status,
            "locked_by": s.locked_by,
            "locked_until": s.locked_until.isoformat() if s.locked_until else None,
            "transaction_id": s.transaction_id,
            "receipt_no": booking.receipt_no if booking else None,
            "customer_name": booking.customer_name if booking else None,
            "customer_phone": booking.customer_phone if booking else None,
            "screenshot": f"/uploads/{booking.screenshot_filename}" if booking and booking.screenshot_filename else None,
            "booked_at": booking.created_at.isoformat() if booking else None
        })
    return output

@router.post("/seats/{seat_id}/release-sold")
async def release_sold_seat(
    seat_id: str,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    """Allows admin to cancel a booking and make seat available again"""
    async with db.begin():
        result = await db.execute(select(Seat).where(Seat.id == seat_id))
        seat = result.scalar_one_or_none()
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")
        
        # Delete bookings for this seat
        from sqlalchemy import delete
        await db.execute(delete(Booking).where(Booking.seat_id == seat_id))
        
        seat.status = "available"
        seat.transaction_id = None

    from websocket_manager import manager
    await manager.broadcast("seat_released", {"seat_id": seat_id, "session_id": "__admin__"})
    return {"status": "available", "seat_id": seat_id}
