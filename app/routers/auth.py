from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.services import user_service
from app.services.google_auth_service import get_google_auth_url, exchange_code_for_token, get_google_user_info
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

class OTPRequest(BaseModel):
    email: str
    otp: str

class ResendOTPRequest(BaseModel):
    email: str

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
    return {
        "message": "Email verified successfully",
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
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
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    result, error = user_service.login_user(db, payload)
    if error:
        raise HTTPException(status_code=401, detail=error)
    return result

@router.get("/google")
async def google_login():
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

    redirect_page = "admin.html" if user.role == "owner" else "dashboard.html"
    response = RedirectResponse(url=f"/{redirect_page}")
    response.set_cookie(
        key="modelyx_token",
        value=jwt_token,
        httponly=False,
        max_age=3600
    )
    response.set_cookie(key="modelyx_role", value=user.role, httponly=False)
    response.set_cookie(key="modelyx_name", value=user.name, httponly=False)
    return response