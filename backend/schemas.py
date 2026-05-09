from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SeatResponse(BaseModel):
    id: str
    section: str
    row: Optional[str]
    number: int
    label: str
    price: int
    status: str
    locked_by: Optional[str] = None
    locked_until: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SelectSeatRequest(BaseModel):
    session_id: str


class ReleaseRequest(BaseModel):
    session_id: str


class ConfirmRequest(BaseModel):
    session_id: str
    razorpay_payment_id: str
    razorpay_order_id: str


class CreateOrderRequest(BaseModel):
    seat_ids: List[str]
    session_id: str


class AdminOverrideRequest(BaseModel):
    action: str  # 'block' | 'unblock'


class AdminStats(BaseModel):
    total: int
    available: int
    locked: int
    sold: int
    blocked: int
    revenue: int


class UserCreate(BaseModel):
    name: str
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    username: str

    model_config = {"from_attributes": True}

