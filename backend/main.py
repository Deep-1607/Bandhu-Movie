import os

print("--- SERVER STARTING ---")
db_url = os.getenv("DATABASE_URL", "NOT_SET")
if db_url != "NOT_SET":
    # Mask password for security but show structure
    masked = db_url.split("@")[-1] if "@" in db_url else db_url
    print(f"DATABASE_URL detected. Host/Path: {masked}")
else:
    print("WARNING: DATABASE_URL is NOT SET. Using SQLite.")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from websocket_manager import manager
from routers import seats, admin, auth
from routers.seats import release_stale_locks
import models  # noqa


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- LIFESPAN STARTING ---")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database connected and tables created!")
        
        # Auto-seed if database is empty
        try:
            from seed import seed_initial_data
        except ImportError:
            try:
                from backend.seed import seed_initial_data
            except ImportError:
                print("Could not find seed script, skipping...")
                seed_initial_data = None
        
        if seed_initial_data:
            await seed_initial_data()
    except Exception as e:
        print(f"!!! NON-FATAL DATABASE ERROR ON STARTUP !!!: {e}")
        print("Continuing anyway to keep server alive...")
    
    try:
        # Release any seats stuck in 'locked' from a previous server run
        await release_stale_locks()
    except Exception as e:
        print(f"Stale lock release failed (ignoring): {e}")
    
    yield
    print("--- LIFESPAN ENDING ---")


app = FastAPI(title="BandhuShow API", version="1.0.0", lifespan=lifespan)

# Support configurable origins via env var for live deployment
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Ensure uploads directory exists to prevent crash
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.include_router(seats.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()   # keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
def root():
    return {"message": "BandhuShow API is running"}
