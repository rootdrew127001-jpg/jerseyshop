from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.security import HTTPBasicCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse, AdminRegisterRequest
from app.services import user_service
from app.services.google_auth_service import get_google_auth_url, exchange_code_for_token, get_google_user_info
from app.routers.deps import basic_auth_scheme, require_admin, get_current_user
from app.models.models import User
from app.core.config import SECRET_KEY, DEV_MODE
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

class OTPRequest(BaseModel):
    email: str
    otp: str

class ResendOTPRequest(BaseModel):
    email: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user, error = await user_service.send_password_reset_otp(db, email_clean)
    if error:
        raise HTTPException(status_code=404, detail=error)
    return {
        "message": "Password reset code sent to your email",
        "email": email_clean
    }

@router.post("/reset-password")
def reset_password(response: Response, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    result, error = user_service.reset_password_with_otp(
        db, email_clean, payload.otp.strip(), payload.new_password
    )
    if error:
        raise HTTPException(status_code=400, detail=error)

    response.set_cookie(key="modelyx_token", value=result["access_token"], httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_role", value=result["role"], httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_name", value=result["name"], httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_email", value=result.get("email", ""), httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_shipping_setup", value="1" if result.get("has_shipping_setup") else "0", httponly=False, max_age=86400 * 7, path="/")
    return result

@router.post("/register")
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user, error = user_service.register_user(db, payload)
    if error:
        raise HTTPException(status_code=400, detail=error)
    await user_service.send_verification_otp(db, user)
    return {
        "message": "Account created. Check your email for the verification code.",
        "user_id": user.id,
        "email": user.email
    }

@router.post("/verify-otp")
def verify_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    user, error = user_service.verify_otp(db, payload.email, payload.otp)
    if error:
        raise HTTPException(status_code=400, detail=error)
    token = user_service.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    has_shipping = bool(user.address and user.city) if user.role == "customer" else True
    return {
        "message": "Email verified successfully",
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "has_shipping_setup": has_shipping,
        "shipping": {
            "address": user.address or "",
            "city": user.city or "",
            "state": user.state or "",
            "zip_code": user.zip_code or "",
            "country": user.country or "Philippines",
            "phone": user.phone or "",
            "latitude": float(user.latitude) if user.latitude else None,
            "longitude": float(user.longitude) if user.longitude else None,
        }
    }

@router.post("/resend-otp")
async def resend_otp(payload: ResendOTPRequest, db: Session = Depends(get_db)):
    from app.models.models import User
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Already verified")
    await user_service.send_verification_otp(db, user)
    return {"message": "OTP resent successfully"}

@router.post("/login", response_model=TokenResponse)
def login(response: Response, payload: LoginRequest, db: Session = Depends(get_db)):
    result, error = user_service.login_user(db, payload)
    if error:
        raise HTTPException(status_code=401, detail=error)

    response.set_cookie(key="modelyx_token", value=result["access_token"], httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_role", value=result["role"], httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_name", value=result["name"], httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_email", value=result.get("email", ""), httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_shipping_setup", value="1" if result.get("has_shipping_setup") else "0", httponly=False, max_age=86400 * 7, path="/")
    return result

@router.get("/config")
def get_auth_config():
    """
    Returns public runtime auth settings (e.g. dev_mode enabled)
    """
    return {
        "dev_mode": bool(DEV_MODE)
    }

@router.get("/google")
async def google_login(db: Session = Depends(get_db)):
    if DEV_MODE:
        mock_google_info = {
            "id": "google-dev-1001",
            "email": "dev.google.user@gmail.com",
            "name": "Dev Google User",
            "picture": "https://api.dicebear.com/7.x/bottts/svg?seed=devuser"
        }
        user = user_service.get_or_create_google_user(db, mock_google_info)
        jwt_token = user_service.create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        })

        has_shipping = bool(user.address and user.city) if user.role == "customer" else True
        if user.role == "owner":
            redirect_page = f"admin.html?token={jwt_token}"
        elif not has_shipping:
            redirect_page = f"settings.html?setup=address&required=1&token={jwt_token}"
        else:
            redirect_page = f"dashboard.html?token={jwt_token}"
        response = RedirectResponse(url=f"/{redirect_page}", status_code=303)
        response.set_cookie(key="modelyx_token", value=jwt_token, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_role", value=user.role, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_name", value=user.name, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_email", value=user.email, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_shipping_setup", value="1" if has_shipping else "0", httponly=False, max_age=86400 * 7, path="/")
        return response

    url = await get_google_auth_url()
    return RedirectResponse(url)

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    token_data = await exchange_code_for_token(code)
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Google auth failed")

    user_info = await get_google_user_info(access_token)
    user = user_service.get_or_create_google_user(db, user_info)

    jwt_token = user_service.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    has_shipping = bool(user.address and user.city) if user.role == "customer" else True
    if user.role == "owner":
        redirect_page = f"admin.html?token={jwt_token}"
    elif not has_shipping:
        redirect_page = f"settings.html?setup=address&required=1&token={jwt_token}"
    else:
        redirect_page = f"dashboard.html?token={jwt_token}"
    response = RedirectResponse(url=f"/{redirect_page}", status_code=303)
    response.set_cookie(key="modelyx_token", value=jwt_token, httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_role", value=user.role, httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_name", value=user.name, httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_email", value=user.email, httponly=False, max_age=86400 * 7, path="/")
    response.set_cookie(key="modelyx_shipping_setup", value="1" if has_shipping else "0", httponly=False, max_age=86400 * 7, path="/")
    return response

@router.post("/logout")
def logout(request: Request):
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif "modelyx_token" in request.cookies:
        token = request.cookies.get("modelyx_token")

    if token:
        from app.core import redis as redis_service
        redis_service.delete_session(token)

    from fastapi.responses import JSONResponse
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("modelyx_token")
    response.delete_cookie("modelyx_role")
    response.delete_cookie("modelyx_name")
    return response

# =========================================================================
# ADMIN BASIC AUTH & ACCOUNT CREATION
# =========================================================================

@router.post("/admin/register")
@router.post("/admin/create")
def register_admin(
    response: Response,
    request: Request,
    payload: Optional[AdminRegisterRequest] = None,
    credentials: Optional[HTTPBasicCredentials] = Depends(basic_auth_scheme),
    db: Session = Depends(get_db)
):
    email = None
    password = None
    name = "Admin"
    phone = None
    admin_key = None

    if payload:
        email = payload.email
        password = payload.password
        name = payload.name or "Admin"
        phone = payload.phone
        admin_key = payload.admin_key

    if credentials and (not email or not password):
        email = email or credentials.username
        password = password or credentials.password

    if not admin_key:
        admin_key = request.headers.get("X-Admin-Key") or request.headers.get("X-Admin-Secret")

    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password are required (either via JSON body or HTTP Basic Auth: Authorization: Basic base64(email:password))",
            headers={"WWW-Authenticate": "Basic realm=\"Modelyx Admin\""}
        )

    existing_admins_count = db.query(User).filter(User.role.in_(["owner", "admin"])).count()
    if existing_admins_count > 0:
        is_authorized = False
        server_secret = os.getenv("ADMIN_SETUP_KEY", SECRET_KEY)

        if admin_key and admin_key == server_secret:
            is_authorized = True

        if not is_authorized:
            try:
                token = None
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ", 1)[1].strip()
                elif "modelyx_token" in request.cookies:
                    token = request.cookies.get("modelyx_token")

                if token:
                    from jose import jwt
                    from app.core.config import ALGORITHM
                    payload_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    if payload_token.get("role") in ("owner", "admin"):
                        is_authorized = True

                if not is_authorized and credentials:
                    caller = db.query(User).filter(User.email == credentials.username).first()
                    if caller and caller.role in ("owner", "admin") and user_service.verify_password(credentials.password, caller.password):
                        is_authorized = True
            except Exception:
                pass

        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Admin accounts already exist. Creating an additional admin requires existing admin credentials or admin_key.",
                headers={"WWW-Authenticate": "Basic realm=\"Modelyx Admin\""}
            )

    user, err = user_service.create_admin_account(db, email=email, password=password, name=name, phone=phone)
    if err:
        raise HTTPException(status_code=400, detail=err)

    token = user_service.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    response.set_cookie(key="modelyx_token", value=token, httponly=False, max_age=86400 * 7)
    response.set_cookie(key="modelyx_role", value=user.role, httponly=False, max_age=86400 * 7)
    response.set_cookie(key="modelyx_name", value=user.name, httponly=False, max_age=86400 * 7)

    return {
        "message": "Admin account created successfully",
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/admin/login")
def login_admin(
    response: Response,
    request: Request,
    payload: Optional[LoginRequest] = None,
    credentials: Optional[HTTPBasicCredentials] = Depends(basic_auth_scheme),
    db: Session = Depends(get_db)
):
    email = None
    password = None

    if payload:
        email = payload.email
        password = payload.password

    if credentials and (not email or not password):
        email = email or credentials.username
        password = password or credentials.password

    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password required (via JSON body or HTTP Basic Auth)",
            headers={"WWW-Authenticate": "Basic realm=\"Modelyx Admin\""}
        )

    email_clean = (email or "").strip().lower()
    password_clean = password or ""

    if DEV_MODE and email_clean in ("admin", "admin@modelyx.dev") and password_clean == "admin":
        user = user_service.get_or_create_dev_user(db, is_admin=True)
    else:
        from app.core.config import get_all_admin_accounts, is_admin_email
        admin_accounts = get_all_admin_accounts()
        matched_admin = next((a for a in admin_accounts if a["email"] == email_clean), None)

        if matched_admin and any(password_clean == p for p in matched_admin.get("passwords", [])):
            user, _ = user_service.create_admin_account(
                db, email=email_clean, password=password_clean, name=matched_admin.get("name", "Admin")
            )
        else:
            user = db.query(User).filter(
                (User.email == email) | (User.email == email_clean) | (User.email == f"{email_clean}@modelyx.dev")
            ).first()
            if not user:
                raise HTTPException(
                    status_code=401,
                    detail="Admin user not found",
                    headers={"WWW-Authenticate": "Basic realm=\"Modelyx Admin\""}
                )

            if not user_service.verify_password(password, user.password):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid credentials",
                    headers={"WWW-Authenticate": "Basic realm=\"Modelyx Admin\""}
                )

    from app.core.config import is_admin_email
    if is_admin_email(user.email) and user.role != "owner":
        user.role = "owner"
        user.is_verified = 1
        db.commit()

    if user.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Account is not an administrator"
        )

    token = user_service.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    response.set_cookie(key="modelyx_token", value=token, httponly=False, max_age=86400 * 7)
    response.set_cookie(key="modelyx_role", value=user.role, httponly=False, max_age=86400 * 7)
    response.set_cookie(key="modelyx_name", value=user.name, httponly=False, max_age=86400 * 7)

    return {
        "message": "Admin login successful",
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

@router.get("/me")
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user": current_user
    }

@router.get("/admin/me")
def get_current_admin_info(admin: dict = Depends(require_admin)):
    return {
        "authenticated": True,
        "admin": admin
    }

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.get("/profile")
def get_user_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    has_shipping = bool(user.address and user.city and user.zip_code)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "address": user.address,
        "city": user.city,
        "state": user.state,
        "zip_code": user.zip_code,
        "country": user.country,
        "latitude": float(user.latitude) if user.latitude else None,
        "longitude": float(user.longitude) if user.longitude else None,
        "has_shipping_setup": has_shipping
    }

@router.put("/profile")
def update_user_profile(payload: ProfileUpdateRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, val in payload.dict(exclude_unset=True).items():
        if hasattr(user, field):
            setattr(user, field, val)
    db.commit()
    db.refresh(user)
    has_shipping = bool(user.address and user.city and user.zip_code)
    return {
        "message": "Profile updated successfully",
        "has_shipping_setup": has_shipping,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "phone": user.phone,
            "address": user.address,
            "city": user.city,
            "state": user.state,
            "zip_code": user.zip_code,
            "country": user.country,
            "latitude": float(user.latitude) if user.latitude else None,
            "longitude": float(user.longitude) if user.longitude else None
        }
    }
