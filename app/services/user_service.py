from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.models.models import User
from app.schemas.schemas import RegisterRequest, LoginRequest
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.services.email_service import generate_otp, send_otp_email

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password_bytes)

def verify_password(plain: str, hashed: str) -> bool:
    password_bytes = plain.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(password_bytes, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def register_user(db: Session, payload: RegisterRequest):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        return None, "Email already registered"

    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
        role=payload.role or "customer",
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        zip_code=payload.zip_code,
        country=payload.country
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, None

def login_user(db: Session, payload: LoginRequest):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return None, "User not found"
    if not verify_password(payload.password, user.password):
        return None, "Invalid password"

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }, None

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def update_user(db: Session, user_id: int, data: dict):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


async def send_verification_otp(db: Session, user):
    otp = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    user.otp_code = otp
    user.otp_expires = expires
    db.commit()
    await send_otp_email(user.email, otp, user.name)
    return otp

def verify_otp(db: Session, email: str, otp: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None, "User not found"
    if user.is_verified:
        return user, None
    if not user.otp_code or user.otp_code != otp:
        return None, "Invalid OTP code"
    if user.otp_expires < datetime.utcnow():
        return None, "OTP has expired"
    user.is_verified = 1
    user.otp_code = None
    user.otp_expires = None
    db.commit()
    db.refresh(user)
    return user, None

def get_or_create_google_user(db: Session, google_info: dict):
    email = google_info.get("email")
    google_id = google_info.get("id")
    name = google_info.get("name", email)

    user = db.query(User).filter(User.email == email).first()
    if user:
        if not user.google_id:
            user.google_id = google_id
            user.is_verified = 1
            db.commit()
        return user

    user = User(
        name=name,
        email=email,
        password="",
        role="customer",
        google_id=google_id,
        is_verified=1
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user