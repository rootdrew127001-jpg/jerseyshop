from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.routers.deps import require_owner
from app.services import user_service

router = APIRouter(prefix="/admin/staff", tags=["Staff Management"])

class StaffCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class StaffPasswordUpdateRequest(BaseModel):
    password: str

class StaffStatusUpdateRequest(BaseModel):
    is_active: int

class StaffResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.get("", response_model=List[StaffResponse])
def list_staff(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_owner)
):
    users = user_service.get_staff_users(db)
    return users

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def add_subadmin(
    payload: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_owner)
):
    user, err = user_service.create_subadmin(
        db,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        phone=payload.phone
    )
    if err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    return user

@router.patch("/{user_id}/password")
def change_subadmin_password(
    user_id: int,
    payload: StaffPasswordUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_owner)
):
    user, err = user_service.update_subadmin_password(db, user_id, payload.password)
    if err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    return {"message": "Password updated successfully", "user_id": user_id}

@router.patch("/{user_id}/status")
def change_subadmin_status(
    user_id: int,
    payload: StaffStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_owner)
):
    user, err = user_service.toggle_subadmin_status(db, user_id, payload.is_active)
    if err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    status_label = "active" if payload.is_active else "suspended"
    return {"message": f"Staff account marked as {status_label}", "user_id": user_id, "is_active": user.is_active}

@router.delete("/{user_id}")
def remove_subadmin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_owner)
):
    ok, err = user_service.delete_subadmin(db, user_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err or "Could not delete staff account")
    return {"message": "Staff account deleted successfully", "user_id": user_id}

