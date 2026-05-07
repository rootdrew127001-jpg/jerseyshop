import hashlib
from datetime import datetime, timedelta

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.repositories import user_repo
from app.schemas.schemas import RegisterRequest, LoginRequest


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def normalize_password(password: str) -> str:
    """
    bcrypt only accepts up to 72 bytes.
    To allow long passwords, hash the password first using SHA-256,
    then bcrypt the SHA-256 hex string.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


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
    existing = user_repo.get_user_by_email(db, payload.email)
    if existing:
        return None, "Email already registered"

    hashed = hash_password(payload.password)

    user_data = {
        "name": payload.name,
        "email": payload.email,
        "password": hashed,
        "role": payload.role or "customer",
        "phone": payload.phone,
        "address": payload.address,
        "city": payload.city,
        "state": payload.state,
        "zip_code": payload.zip_code,
        "country": payload.country,
    }

    user = user_repo.create_user(db, user_data)
    return user, None


def login_user(db: Session, payload: LoginRequest):
    user = user_repo.get_user_by_email(db, payload.email)
    if not user:
        return None, "User not found"

    if not verify_password(payload.password, user.password):
        return None, "Invalid password"

    token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
    }, None
