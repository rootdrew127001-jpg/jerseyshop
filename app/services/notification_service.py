from sqlalchemy.orm import Session
from app.models.models import Notification, User

def create_notification(db: Session, user_id: int, title: str, message: str):
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def get_user_notifications(db: Session, user_id: int):
    return db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).limit(20).all()

def get_unread_count(db: Session, user_id: int):
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == 0
    ).count()

def mark_all_read(db: Session, user_id: int):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == 0
    ).update({"is_read": 1})
    db.commit()

def get_all_admin_notifications(db: Session):
    owners = db.query(User).filter(User.role == 'owner').all()
    if not owners:
        return []
    owner_ids = [o.id for o in owners]
    return db.query(Notification).filter(
        Notification.user_id.in_(owner_ids)
    ).order_by(Notification.created_at.desc()).limit(20).all()