from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os
from app.models.models import User
from app.schemas.schemas import RegisterRequest, LoginRequest
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, DEV_MODE
from app.services.email_service import generate_otp, send_otp_email
from app.core import redis as redis_service

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
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    session_data = {
        "id": int(data.get("sub")) if data.get("sub") and data.get("sub").isdigit() else data.get("sub"),
        "email": data.get("email"),
        "role": data.get("role")
    }
    redis_service.store_session(token, session_data, expire_seconds=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return token

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

def get_or_create_dev_user(db: Session, is_admin: bool = False) -> User:
    email = "admin@modelyx.dev" if is_admin else "user@modelyx.dev"
    name = "Dev Administrator" if is_admin else "Dev Customer"
    role = "owner" if is_admin else "customer"
    password = "admin" if is_admin else "user"

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            password=hash_password(password),
            role=role,
            is_verified=1
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.is_verified = 1
        user.role = role
        user.password = hash_password(password)
        db.commit()
        db.refresh(user)
    return user

def ensure_dev_accounts(db: Session):
    if not DEV_MODE:
        return
    try:
        get_or_create_dev_user(db, is_admin=False)
        get_or_create_dev_user(db, is_admin=True)
        print("[BOOTSTRAP] Developer mode accounts initialized: user (user) & admin (admin)", flush=True)
    except Exception as e:
        print(f"[BOOTSTRAP] Error creating dev accounts: {e}", flush=True)

def login_user(db: Session, payload: LoginRequest):
    email_clean = (payload.email or "").strip().lower()
    pass_clean = payload.password or ""

    if DEV_MODE:
        if email_clean in ("user", "user@modelyx.dev") and pass_clean == "user":
            dev_user = get_or_create_dev_user(db, is_admin=False)
            token = create_access_token({
                "sub": str(dev_user.id),
                "email": dev_user.email,
                "role": dev_user.role
            })
            return {
                "access_token": token,
                "token_type": "bearer",
                "role": dev_user.role,
                "name": dev_user.name
            }, None

        if email_clean in ("admin", "admin@modelyx.dev") and pass_clean == "admin":
            dev_admin = get_or_create_dev_user(db, is_admin=True)
            token = create_access_token({
                "sub": str(dev_admin.id),
                "email": dev_admin.email,
                "role": dev_admin.role
            })
            return {
                "access_token": token,
                "token_type": "bearer",
                "role": dev_admin.role,
                "name": dev_admin.name
            }, None

    user = db.query(User).filter(
        (User.email == email_clean) | (User.email == f"{email_clean}@modelyx.dev")
    ).first()

    if not user:
        return None, "User not found"
    if not verify_password(pass_clean, user.password):
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

    redis_service.store_otp(user.email, otp, expire_seconds=600)
    await send_otp_email(user.email, otp, user.name)
    return otp

def verify_otp(db: Session, email: str, otp: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None, "User not found"
    if user.is_verified:
        return user, None

    redis_otp = redis_service.get_otp(email)
    if redis_otp is not None:
        if redis_otp != otp:
            return None, "Invalid OTP code"
        redis_service.delete_otp(email)
    else:
        if not user.otp_code or user.otp_code != otp:
            return None, "Invalid OTP code"
        if user.otp_expires and user.otp_expires < datetime.utcnow():
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

def create_admin_account(db: Session, email: str, password: str, name: str = "Admin", phone: str = None):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        existing.role = "owner"
        existing.is_verified = 1
        existing.password = hash_password(password)
        if name:
            existing.name = name
        if phone:
            existing.phone = phone
        db.commit()
        db.refresh(existing)
        return existing, None

    user = User(
        name=name or "Admin",
        email=email,
        password=hash_password(password),
        role="owner",
        phone=phone,
        is_verified=1
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, None

def ensure_default_admin(db: Session):
    admin = db.query(User).filter(User.role.in_(["owner", "admin"])).first()
    if not admin:
        default_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@modelyx.com")
        default_pass = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
        default_name = os.getenv("DEFAULT_ADMIN_NAME", "Store Administrator")
        user, _ = create_admin_account(db, default_email, default_pass, default_name)
        print(f"[BOOTSTRAP] Created default admin account: {default_email}", flush=True)
        return user
    return admin
