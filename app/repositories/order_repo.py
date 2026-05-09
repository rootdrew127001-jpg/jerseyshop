from sqlalchemy.orm import Session
from app.models.models import Order

def create_order(db: Session, order_data: dict):
    order = Order(**order_data)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

def get_orders_by_user(db: Session, user_id: int):
    return db.query(Order).filter(Order.user_id == user_id).all()

def get_all_orders(db: Session):
    return db.query(Order).all()

def get_order_by_id(db: Session, order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()

def update_order_status(db: Session, order_id: int, status: str):
    order = get_order_by_id(db, order_id)
    if not order:
        return None
    order.status = status
    db.commit()
    db.refresh(order)
    return order

def delete_order(db: Session, order_id: int):
    order = get_order_by_id(db, order_id)
    if not order:
        return None
    db.delete(order)
    db.commit()
    return True