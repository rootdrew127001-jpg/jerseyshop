import json
from datetime import datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.models.models import Order, OrderItem
from app.schemas.schemas import OrderCreate
from app.services import notification_service, pricing_service

def place_order(db: Session, user_id: int, payload: OrderCreate):
    pricing = pricing_service.get_pricing_dict(db)
    
    roster_list = payload.roster or []
    is_team_order = payload.order_type == "team" or len(roster_list) > 1
    order_type = "team" if is_team_order else "single"
    
    qty = len(roster_list) if (is_team_order and len(roster_list) > 0) else max(int(payload.quantity or 1), 1)
    
    breakdown = pricing_service.calculate_order_pricing(
        jersey_type=payload.jersey_type or "sleeveless",
        finish=payload.finish or "matte",
        has_shorts=bool(payload.has_shorts),
        quantity=qty,
        pricing=pricing
    )
    
    roster_json = json.dumps([item.dict() for item in roster_list]) if roster_list else None
    breakdown_json = json.dumps(breakdown)
    
    first_player_name = roster_list[0].player_name if roster_list and roster_list[0].player_name else payload.team_name
    first_player_number = roster_list[0].player_number if roster_list and roster_list[0].player_number else payload.player_number

    order = Order(
        user_id=user_id,
        team_name=payload.team_name or first_player_name or "TEAM",
        player_number=first_player_number or "00",
        base_color=payload.base_color,
        accent_color=payload.accent_color,
        pattern=payload.pattern,
        order_type=order_type,
        quantity=qty,
        price=breakdown["total"],
        subtotal=breakdown["raw_subtotal"],
        discount_amount=breakdown["discount_amount"],
        roster_data=roster_json,
        pricing_breakdown=breakdown_json,
        shipping_fee=breakdown["shipping_fee"],
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

    effective_unit_price = breakdown["effective_unit_price"]
    if roster_list:
        for item in roster_list:
            order_item = OrderItem(
                order_id=order.id,
                player_name=item.player_name or "",
                player_number=item.player_number or "",
                size=item.size or "M",
                item_price=effective_unit_price,
                notes=item.notes or ""
            )
            db.add(order_item)
    else:
        single_item = OrderItem(
            order_id=order.id,
            player_name=payload.team_name or "",
            player_number=payload.player_number or "",
            size=payload.size or "M",
            item_price=effective_unit_price,
            notes=""
        )
        db.add(single_item)
    db.commit()
    db.refresh(order)

    return order

def get_my_orders(db: Session, user_id: int):
    return (
        db.query(Order)
        .options(joinedload(Order.user))
        .filter(Order.user_id == user_id, or_(Order.is_deleted == 0, Order.is_deleted.is_(None)))
        .all()
    )

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

def remove_order(db: Session, order_id: int, actor_name: str = "Admin", reason: str = None, actor_id: int = None):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None
    resolved_actor = actor_name
    if actor_id:
        from app.models.models import User
        actor_user = db.query(User).filter(User.id == actor_id).first()
        if actor_user and actor_user.name:
            resolved_actor = actor_user.name
    order.is_deleted = 1
    order.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    order.deleted_by = resolved_actor or "Admin"
    if reason and reason.strip():
        order.cancelled_reason = f"Admin Rejected: {reason.strip()}"
    elif not order.cancelled_reason:
        order.cancelled_reason = "Removed / Rejected by Admin"
    db.commit()
    db.refresh(order)
    return order

def restore_order(db: Session, order_id: int):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None
    order.is_deleted = 0
    order.deleted_at = None
    order.deleted_by = None
    if order.cancelled_reason and (
        order.cancelled_reason.startswith("Admin Rejected:")
        or order.cancelled_reason == "Removed / Rejected by Admin"
    ):
        order.cancelled_reason = None
    db.commit()
    db.refresh(order)
    return order

def permanent_delete_order(db: Session, order_id: int):
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
