from sqlalchemy.orm import Session, joinedload
from app.models.models import Order
from app.schemas.schemas import OrderCreate
from app.services import notification_service

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
        shipping_fee=payload.shipping_fee or 0.0,
        shipping_name=payload.shipping_name,
        shipping_phone=payload.shipping_phone,
        shipping_address=payload.shipping_address,
        shipping_city=payload.shipping_city,
        shipping_state=payload.shipping_state,
        shipping_zip=payload.shipping_zip,
        shipping_country=payload.shipping_country,
        latitude=payload.latitude,
        longitude=payload.longitude,
        delivery_notes=payload.delivery_notes,
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

def cancel_order_by_customer(db: Session, order_id: int, user_id: int, reason: str = None):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None, "Order not found"
    if order.user_id != user_id:
        return None, "Not your order"
    if order.status != "Pending Review":
        return None, "Only pending orders can be cancelled"
    if order.status == "Cancelled":
        return None, "Order already cancelled"

    order.status = "Cancelled"
    order.cancelled_reason = f"Customer: {reason}" if reason else "Cancelled by customer"
    db.commit()
    db.refresh(order)

    notification_service.create_notification(
        db, user_id,
        "Order Cancelled",
        f"Your order #{order.id} ({order.team_name} #{order.player_number}) has been cancelled."
    )

    from app.models.models import User
    admins = db.query(User).filter(User.role == 'owner').all()
    for admin in admins:
        notification_service.create_notification(
            db, admin.id,
            "Order Cancelled by Customer",
            f"Order #{order.id} ({order.team_name} #{order.player_number}) was cancelled by customer. Reason: {order.cancelled_reason}"
        )

    return order, None

def cancel_order_by_admin(db: Session, order_id: int, admin_id: int, reason: str = None):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None, "Order not found"
    if order.status == "Completed":
        return None, "Completed orders cannot be cancelled"
    if order.status == "Cancelled":
        return None, "Order already cancelled"

    order.status = "Cancelled"
    order.cancelled_reason = f"Admin: {reason}" if reason else "Cancelled by admin"
    db.commit()
    db.refresh(order)

    notification_service.create_notification(
        db, order.user_id,
        "Order Cancelled by Admin",
        f"Your order #{order.id} ({order.team_name} #{order.player_number}) was cancelled. Reason: {order.cancelled_reason}"
    )

    notification_service.create_notification(
        db, admin_id,
        "Order Cancelled",
        f"You cancelled order #{order.id} ({order.team_name} #{order.player_number})."
    )

    return order, None
