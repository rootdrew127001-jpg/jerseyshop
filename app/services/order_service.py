from sqlalchemy.orm import Session
from app.repositories import order_repo
from app.schemas.schemas import OrderCreate

def place_order(db: Session, user_id: int, payload: OrderCreate):
    order_data = {
        "user_id": user_id,
        "team_name": payload.team_name,
        "player_number": payload.player_number,
        "base_color": payload.base_color,
        "accent_color": payload.accent_color,
        "pattern": payload.pattern,
        "quantity": payload.quantity or 1,
        "price": payload.price or 0.0,
        "notes": payload.notes,
        "status": "Pending Review"
    }
    return order_repo.create_order(db, order_data)

def get_my_orders(db: Session, user_id: int):
    return order_repo.get_orders_by_user(db, user_id)

def get_all_orders(db: Session):
    return order_repo.get_all_orders(db)

def update_status(db: Session, order_id: int, status: str):
    return order_repo.update_order_status(db, order_id, status)

def remove_order(db: Session, order_id: int):
    return order_repo.delete_order(db, order_id)