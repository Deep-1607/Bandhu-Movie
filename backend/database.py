from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cinema.db")

# Fix for Render/Railway which often provides 'postgres://' URLs
# Robust URL fixing
if DATABASE_URL and "://" not in DATABASE_URL:
    print("ERROR: DATABASE_URL is missing a protocol! (e.g., postgres://). Check your environment variables.")
    # Fallback to a safe string to prevent parsing crash
    DATABASE_URL = "sqlite+aiosqlite:///./fallback.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# SSL is required for most live cloud databases (like Neon/Render)
engine_args = {}
if "sqlite" not in DATABASE_URL:
    engine_args["connect_args"] = {"ssl": True}

engine = create_async_engine(DATABASE_URL, echo=False, **engine_args)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
