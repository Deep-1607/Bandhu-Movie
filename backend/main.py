from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from websocket_manager import manager
from routers import seats, admin, auth
from routers.seats import release_stale_locks
import models  # noqa
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database connected and tables created!")
        
        # Auto-seed if database is empty
        try:
            from seed import seed_initial_data
        except ImportError:
            from backend.seed import seed_initial_data
        await seed_initial_data()
    except Exception as e:
        print(f"DATABASE ERROR ON STARTUP: {e}")
    # Release any seats stuck in 'locked' from a previous server run
    await release_stale_locks()
    yield


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
