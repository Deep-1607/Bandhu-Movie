"""
seed.py — Populate the database with the exact seat layout from the cinema image.

Pricing:
  Upper Sofa  → ₹150
  Platinum    → ₹100
  Lounger     → ₹100

Platinum layout (8 rows A-H):
  Rows A-C : seats 01-09 (left)  + seats 10-11 (right)
  Row  D   : seats 01-09 (left)  only
  Rows E-H : seats 01-09 (left)  + seats 10-13 (right)

Lounger layout (1 row):
  seats 01-06 (left group) + gap + seats 07-09 (right group)
"""
import asyncio
from database import engine, Base, AsyncSessionLocal
from models import Seat
import models  # noqa


UPPER_SOFA_SEATS = list(range(1, 11))   # 01-10

PLATINUM_ROWS = {
    "B": {"left": range(1, 10), "right": range(10, 12)},
    "C": {"left": range(1, 10), "right": range(10, 12)},
    "D": {"left": range(1, 10), "right": range(10, 12)},
    "E": {"left": range(1, 10), "right": []},
    "F": {"left": range(1, 10), "right": range(10, 14)},
    "G": {"left": range(1, 10), "right": range(10, 14)},
    "H": {"left": range(1, 10), "right": range(10, 14)},
    "I": {"left": range(1, 10), "right": range(10, 14)},
}

LOUNGER_LEFT  = list(range(1, 7))    # 01-06
LOUNGER_RIGHT = list(range(7, 10))   # 07-09


def build_seats():
    seats = []

    # ── Upper Sofa ──────────────────────────────────────────────────────────
    for n in UPPER_SOFA_SEATS:
        seats.append(Seat(
            id=f"US-A-{n:02d}",
            section="upper_sofa",
            row="A",
            number=n,
            label=f"{n:02d}",
            price=150,
            status="available",
        ))

    # ── Platinum ─────────────────────────────────────────────────────────────
    for row, groups in PLATINUM_ROWS.items():
        for n in groups["left"]:
            seats.append(Seat(
                id=f"PLT-{row}-{n:02d}",
                section="platinum",
                row=row,
                number=n,
                label=f"{n:02d}",
                price=100,
                status="available",
            ))
        for n in groups["right"]:
            seats.append(Seat(
                id=f"PLT-{row}-{n:02d}",
                section="platinum",
                row=row,
                number=n,
                label=f"{n:02d}",
                price=100,
                status="available",
            ))

    # ── Lounger ──────────────────────────────────────────────────────────────
    for n in LOUNGER_LEFT + LOUNGER_RIGHT:
        seats.append(Seat(
            id=f"LNG-J-{n:02d}",
            section="lounger",
            row="J",
            number=n,
            label=f"{n:02d}",
            price=150,
            status="available",
        ))

    return seats


async def seed_initial_data():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import func
        from sqlalchemy.future import select
        
        # Check if seats already exist
        result = await db.execute(select(func.count(Seat.id)))
        count = result.scalar()
        
        if count == 0:
            print("Database is empty. Seeding initial seats...")
            seats = build_seats()
            db.add_all(seats)
            await db.commit()
            print(f"[OK] Seeded {len(seats)} seats successfully.")
        else:
            print(f"Database already has {count} seats. Skipping auto-seed.")


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Clear existing seats to apply new row layout
            from sqlalchemy import delete
            await db.execute(delete(Seat))
            
            seats = build_seats()
            db.add_all(seats)

    print(f"[OK] Seeded {len(seats)} seats successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
