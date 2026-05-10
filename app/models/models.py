from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default="customer")
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    orders = relationship("Order", back_populates="user")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_name = Column(String(100), nullable=True)
    player_number = Column(String(10), nullable=True)
    base_color = Column(String(20), nullable=True)
    accent_color = Column(String(20), nullable=True)
    pattern = Column(String(50), nullable=True)
    quantity = Column(Integer, default=1)
    price = Column(Float, default=0.0)
    status = Column(String(50), default="Pending Review")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    payment_status = Column(String(50), default="Unpaid")
    paypal_order_id = Column(String(255), nullable=True)

    user = relationship("User", back_populates="orders")