from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user, error = user_service.register_user(db, payload)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"message": "Account created successfully", "user_id": user.id}

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    result, error = user_service.login_user(db, payload)
    if error:
        raise HTTPException(status_code=401, detail=error)
    return result