import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, func
from database import DATABASE_URL
from models import Seat

async def check_seats():
    # Use the same SSL bypass
    import ssl
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    engine = create_async_engine(DATABASE_URL, connect_args={"ssl": ctx})
    
    async with AsyncSession(engine) as session:
        result = await session.execute(select(Seat.status, func.count(Seat.id)).group_by(Seat.status))
        stats = result.all()
        print(f"--- SEAT STATISTICS ---")
        for status, count in stats:
            print(f"{status}: {count}")
        
        # Check if any are 'locked' but shouldn't be
        result = await session.execute(select(Seat).where(Seat.status == 'locked'))
        locked_seats = result.scalars().all()
        if locked_seats:
            print(f"\n--- LOCKED SEATS ---")
            for s in locked_seats:
                print(f"ID: {s.id}, By: {s.locked_by}, Until: {s.locked_until}")
        else:
            print("\nNo seats are currently locked in the DB.")

if __name__ == "__main__":
    asyncio.run(check_seats())
