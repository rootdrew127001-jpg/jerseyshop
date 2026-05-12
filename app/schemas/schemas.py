from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "customer"
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    is_verified: Optional[int] = 0


class OrderCreate(BaseModel):
    team_name: Optional[str] = None
    player_number: Optional[str] = None
    base_color: Optional[str] = None
    accent_color: Optional[str] = None
    pattern: Optional[str] = None
    quantity: Optional[int] = 1
    price: Optional[float] = 0.0
    notes: Optional[str] = None

class UserInfo(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True
        
class OrderResponse(BaseModel):
    id: int
    user_id: int
    user: Optional[UserInfo] = None
    team_name: Optional[str]
    player_number: Optional[str]
    base_color: Optional[str]
    accent_color: Optional[str]
    pattern: Optional[str]
    quantity: int
    price: float
    status: str
    notes: Optional[str] = None
    created_at: datetime
    payment_status: Optional[str] = "Unpaid"
    paypal_order_id: Optional[str] = None

    class Config:
        from_attributes = True


class AIRequest(BaseModel):
    team_name: str