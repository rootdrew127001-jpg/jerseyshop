from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os
from app.models.models import User
from app.schemas.schemas import RegisterRequest, LoginRequest
from app.core.config import (
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, DEV_MODE,
    get_all_admin_accounts, is_admin_email
)
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

    assigned_role = "owner" if is_admin_email(payload.email) else (payload.role or "customer")

    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
        role=assigned_role,
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

    existing_user = db.query(User).filter(
        (User.email == email_clean) | (User.email == f"{email_clean}@modelyx.dev")
    ).first()

    if existing_user:
        is_valid = verify_password(pass_clean, existing_user.password)

        if not is_valid:
            admin_accounts = get_all_admin_accounts()
            matched_admin = next((a for a in admin_accounts if a["email"] == email_clean), None)
            if matched_admin and any(pass_clean == p for p in matched_admin.get("passwords", [])):
                is_valid = True
                existing_user.password = hash_password(pass_clean)

        if not is_valid:
            return None, "Invalid password"

        if is_admin_email(existing_user.email) and existing_user.role != "owner":
            existing_user.role = "owner"
            existing_user.is_verified = 1

        db.commit()
        db.refresh(existing_user)

        token = create_access_token({
            "sub": str(existing_user.id),
            "email": existing_user.email,
            "role": existing_user.role
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": existing_user.role,
            "name": existing_user.name
        }, None

    admin_accounts = get_all_admin_accounts()
    matched_admin = next((a for a in admin_accounts if a["email"] == email_clean), None)
    if matched_admin and any(pass_clean == p for p in matched_admin.get("passwords", [])):
        admin_user, _ = create_admin_account(
            db,
            email=email_clean,
            password=pass_clean,
            name=matched_admin.get("name", "Store Administrator")
        )
        token = create_access_token({
            "sub": str(admin_user.id),
            "email": admin_user.email,
            "role": "owner"
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "owner",
            "name": admin_user.name
        }, None

    return None, "User not found"

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

async def send_password_reset_otp(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None, "No account found with this email"

    otp = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    user.otp_code = otp
    user.otp_expires = expires
    db.commit()

    redis_service.store_otp(f"reset:{user.email}", otp, expire_seconds=600)
    await send_otp_email(user.email, otp, user.name, subject="Modelyx — Password Reset Code")
    return user, None

def reset_password_with_otp(db: Session, email: str, otp: str, new_password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None, "Account not found"

    valid_otp = False
    redis_otp = redis_service.get_otp(f"reset:{email}") or redis_service.get_otp(email)
    if redis_otp is not None and redis_otp == otp:
        valid_otp = True
        redis_service.delete_otp(f"reset:{email}")
        redis_service.delete_otp(email)
    elif user.otp_code and user.otp_code == otp:
        if not user.otp_expires or user.otp_expires >= datetime.utcnow():
            valid_otp = True

    if not valid_otp:
        return None, "Invalid or expired OTP code"

    user.password = hash_password(new_password)
    user.otp_code = None
    user.otp_expires = None
    user.is_verified = 1
    db.commit()
    db.refresh(user)

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

def get_or_create_google_user(db: Session, google_info: dict):
    email = google_info.get("email")
    google_id = google_info.get("id")
    name = google_info.get("name", email)

    is_admin = is_admin_email(email)
    role = "owner" if is_admin else "customer"

    user = db.query(User).filter(User.email == email).first()
    if user:
        modified = False
        if not user.google_id:
            user.google_id = google_id
            modified = True
        if is_admin and user.role != "owner":
            user.role = "owner"
            modified = True
        if not user.is_verified:
            user.is_verified = 1
            modified = True
        if modified:
            db.commit()
            db.refresh(user)
        return user

    user = User(
        name=name,
        email=email,
        password="",
        role=role,
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
    """
    Ensures all admin accounts configured in .env (ADMIN_EMAIL, GMAIL_USER, GMAIL_USER_2..20)
    are provisioned and kept updated in MySQL as verified Owners.
    """
    accounts = get_all_admin_accounts()
    for acc in accounts:
        email = acc["email"]
        name = acc.get("name", "Store Administrator")
        pwd = acc["passwords"][0] if acc.get("passwords") else "admin123"
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                create_admin_account(db, email=email, password=pwd, name=name)
                print(f"[BOOTSTRAP] Created admin account: {email}", flush=True)
            else:
                if user.role != "owner" or not user.is_verified:
                    user.role = "owner"
                    user.is_verified = 1
                    db.commit()
                    print(f"[BOOTSTRAP] Promoted existing account to owner: {email}", flush=True)
        except Exception as e:
            print(f"[BOOTSTRAP] Error provisioning admin {email}: {e}", flush=True)

    cust_email = "customer@modelyx.com"
    cust_pass = "customer123"
    try:
        cust_user = db.query(User).filter(User.email == cust_email).first()
        if not cust_user:
            cust = User(
                name="Sample Customer",
                email=cust_email,
                password=hash_password(cust_pass),
                role="customer",
                is_verified=1
            )
            db.add(cust)
            db.commit()
            print(f"[BOOTSTRAP] Created test customer account: {cust_email}", flush=True)
    except Exception as e:
        print(f"[BOOTSTRAP] Error seeding test customer: {e}", flush=True)
