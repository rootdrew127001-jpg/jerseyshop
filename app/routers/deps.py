from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.config import SECRET_KEY, ALGORITHM, DEV_MODE
from app.core.database import get_db
from app.models.models import User
from app.services.user_service import verify_password
from app.core import redis as redis_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
basic_auth_scheme = HTTPBasic(auto_error=False)
strict_basic_auth_scheme = HTTPBasic(auto_error=True, realm="Modelyx Admin")

def get_current_user(
    request: Request,
    credentials: Optional[HTTPBasicCredentials] = Depends(basic_auth_scheme),
    db: Session = Depends(get_db)
):
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif "modelyx_token" in request.cookies:
        token = request.cookies.get("modelyx_token")

    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if redis_service.is_redis_available():
                session = redis_service.get_session(token)
                if not session:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Session expired or logged out"
                    )
                return session

            return {
                "id": int(payload.get("sub")),
                "email": payload.get("email"),
                "role": payload.get("role")
            }
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    if credentials:
        username_clean = (credentials.username or "").strip().lower()
        password_clean = credentials.password or ""
        if DEV_MODE:
            from app.services.user_service import get_or_create_dev_user
            if username_clean in ("user", "user@modelyx.dev") and password_clean == "user":
                dev_u = get_or_create_dev_user(db, is_admin=False)
                return {
                    "id": dev_u.id,
                    "email": dev_u.email,
                    "role": dev_u.role,
                    "name": dev_u.name
                }
            if username_clean in ("admin", "admin@modelyx.dev") and password_clean == "admin":
                dev_a = get_or_create_dev_user(db, is_admin=True)
                return {
                    "id": dev_a.id,
                    "email": dev_a.email,
                    "role": dev_a.role,
                    "name": dev_a.name
                }

        user = db.query(User).filter(
            (User.email == credentials.username) | (User.email == f"{username_clean}@modelyx.dev")
        ).first()
        if user and verify_password(credentials.password, user.password):
            return {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "name": user.name
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid basic auth credentials",
            headers={"WWW-Authenticate": "Basic realm=\"Modelyx\""}
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Basic realm=\"Modelyx\""}
    )

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
            headers={"WWW-Authenticate": "Basic realm=\"Modelyx Admin\""}
        )
    return current_user

def require_admin_basic_auth(
    credentials: HTTPBasicCredentials = Depends(strict_basic_auth_scheme),
    db: Session = Depends(get_db)
):
    username_clean = (credentials.username or "").strip().lower()
    password_clean = credentials.password or ""

    if DEV_MODE:
        from app.services.user_service import get_or_create_dev_user
        if username_clean in ("admin", "admin@modelyx.dev") and password_clean == "admin":
            dev_a = get_or_create_dev_user(db, is_admin=True)
            return {
                "id": dev_a.id,
                "email": dev_a.email,
                "role": dev_a.role,
                "name": dev_a.name
            }

    user = db.query(User).filter(
        (User.email == credentials.username) | (User.email == f"{username_clean}@modelyx.dev")
    ).first()
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Basic realm=\"Modelyx Admin\""}
        )
    if user.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name
    }
