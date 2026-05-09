from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def get_ist_now():
    return datetime.datetime.now(IST).replace(tzinfo=None)


class Seat(Base):
    __tablename__ = "seats"

    id = Column(String, primary_key=True)          # e.g. "PLT-A-07"
    section = Column(String, nullable=False)        # upper_sofa | platinum | lounger
    row = Column(String, nullable=True)             # A-H (None for single-row sections)
    number = Column(Integer, nullable=False)
    label = Column(String, nullable=False)          # "07"
    price = Column(Integer, nullable=False, default=100)
    status = Column(String, default="available")    # available|locked|sold|blocked
    locked_by = Column(String, nullable=True)
    locked_until = Column(DateTime, nullable=True)
    transaction_id = Column(String, nullable=True)

    bookings = relationship("Booking", back_populates="seat")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    seat_id = Column(String, ForeignKey("seats.id"))
    user_session = Column(String)
    # Manual payment details
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    screenshot_filename = Column(String, nullable=True)  # saved file name
    amount = Column(Integer)
    receipt_no = Column(Integer, nullable=True)  # Sequential number like 1, 2, 3...
    created_at = Column(DateTime, default=get_ist_now)

    seat = relationship("Seat", back_populates="bookings")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)  # Hashed

