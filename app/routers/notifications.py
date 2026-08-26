from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.routers.deps import get_current_user
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notifs = notification_service.get_user_notifications(db, current_user["id"])
    return notifs

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    count = notification_service.get_unread_count(db, current_user["id"])
    return {"count": count}

@router.post("/mark-read")
def mark_read(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notification_service.mark_all_read(db, current_user["id"])
    return {"message": "All notifications marked as read"}