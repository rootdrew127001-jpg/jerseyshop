from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Numeric, Text
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
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    is_verified = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    otp_code = Column(String(10), nullable=True)
    otp_expires = Column(DateTime, nullable=True)
    google_id = Column(String(255), nullable=True)

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
    shipping_fee = Column(Float, default=0.0)
    shipping_name = Column(String(100), nullable=True)
    shipping_phone = Column(String(20), nullable=True)
    shipping_address = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_state = Column(String(100), nullable=True)
    shipping_zip = Column(String(20), nullable=True)
    shipping_country = Column(String(100), nullable=True)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    delivery_notes = Column(Text, nullable=True)
    status = Column(String(50), default="Pending Review")
    payment_status = Column(String(50), default="Unpaid")
    paypal_order_id = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    order_type = Column(String(20), default="single")
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    roster_data = Column(Text, nullable=True)
    pricing_breakdown = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    cancelled_reason = Column(Text, nullable=True)
    is_deleted = Column(Integer, default=0)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(String(100), nullable=True)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    player_name = Column(String(100), nullable=True)
    player_number = Column(String(10), nullable=True)
    size = Column(String(10), nullable=False)
    item_price = Column(Float, default=0.0)
    notes = Column(String(255), nullable=True)

    order = relationship("Order", back_populates="items")


class PricingSetting(Base):
    __tablename__ = "pricing_settings"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False, default="general")
    key_name = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", backref="notifications")
