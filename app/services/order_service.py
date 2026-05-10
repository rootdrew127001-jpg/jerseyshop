from sqlalchemy.orm import Session, joinedload
from app.models.models import Order
from app.schemas.schemas import OrderCreate

def place_order(db: Session, user_id: int, payload: OrderCreate):
    order = Order(
        user_id=user_id,
        team_name=payload.team_name,
        player_number=payload.player_number,
        base_color=payload.base_color,
        accent_color=payload.accent_color,
        pattern=payload.pattern,
        quantity=payload.quantity or 1,
        price=payload.price or 0.0,
        notes=payload.notes,
        status="Pending Review"
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

def get_my_orders(db: Session, user_id: int):
    return db.query(Order).options(joinedload(Order.user)).filter(Order.user_id == user_id).all()

def get_all_orders(db: Session):
    return db.query(Order).options(joinedload(Order.user)).all()

def get_order_by_id(db: Session, order_id: int):
    return db.query(Order).options(joinedload(Order.user)).filter(Order.id == order_id).first()

def update_status(db: Session, order_id: int, status: str):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None
    order.status = status
    db.commit()
    db.refresh(order)
    return order

def remove_order(db: Session, order_id: int):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None
    db.delete(order)
    db.commit()
    return True