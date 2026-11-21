from typing import Optional, Dict, Set
from datetime import datetime
import json
from fastapi import WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.models import ChatConversation, ChatMessage, ChatCannedResponse, User, Order
from app.core.redis import redis_client

class ChatConnectionManager:
    def __init__(self):
        self.customer_sockets: Dict[int, Set[WebSocket]] = {}
        self.admin_sockets: Set[WebSocket] = set()

    async def connect_customer(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.customer_sockets:
            self.customer_sockets[user_id] = set()
        self.customer_sockets[user_id].add(websocket)

    def disconnect_customer(self, websocket: WebSocket, user_id: int):
        if user_id in self.customer_sockets:
            self.customer_sockets[user_id].discard(websocket)
            if not self.customer_sockets[user_id]:
                del self.customer_sockets[user_id]

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_sockets.add(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        self.admin_sockets.discard(websocket)

    async def send_to_customer(self, customer_id: int, data: dict):
        if customer_id in self.customer_sockets:
            dead_sockets = set()
            for ws in self.customer_sockets[customer_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.customer_sockets[customer_id].discard(ws)

    async def broadcast_to_admins(self, data: dict):
        dead_sockets = set()
        for ws in self.admin_sockets:
            try:
                await ws.send_json(data)
            except Exception:
                dead_sockets.add(ws)
        for ws in dead_sockets:
            self.admin_sockets.discard(ws)

    async def broadcast_system_status(self, enabled: bool):
        payload = {
            "type": "system_status",
            "enabled": enabled,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        dead_admins = set()
        for ws in self.admin_sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_admins.add(ws)
        for ws in dead_admins:
            self.admin_sockets.discard(ws)

        for cust_id, sockets in list(self.customer_sockets.items()):
            dead_cust = set()
            for ws in sockets:
                try:
                    await ws.send_json(payload)
                except Exception:
                    dead_cust.add(ws)
            for ws in dead_cust:
                sockets.discard(ws)

chat_manager = ChatConnectionManager()

REDIS_CHAT_KEY = "modelyx:setting:live_chat_enabled"

def is_live_chat_enabled() -> bool:
    try:
        val = redis_client.get(REDIS_CHAT_KEY)
        if val is None:
            return True
        if isinstance(val, bytes):
            val = val.decode("utf-8")
        return str(val).lower() not in ("0", "false", "off")
    except Exception:
        return True

def set_live_chat_enabled(enabled: bool) -> bool:
    try:
        redis_client.set(REDIS_CHAT_KEY, "1" if enabled else "0")
    except Exception:
        pass
    return enabled

def to_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    if getattr(dt, "tzinfo", None) is None:
        return dt.isoformat() + "Z"
    return dt.isoformat()

def serialize_message(m: ChatMessage) -> dict:
    order_data = None
    if m.order_id:
        if m.order:
            order_data = {
                "id": m.order.id,
                "status": m.order.status,
                "total": float(m.order.price or 0),
                "team_name": m.order.team_name,
                "order_type": m.order.order_type
            }
        else:
            order_data = {"id": m.order_id}
    return {
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "sender_role": m.sender_role,
        "sender_name": m.sender_name,
        "sender_avatar": getattr(m.sender, "avatar", None) if m.sender else None,
        "order_id": m.order_id,
        "order": order_data,
        "message": m.message,
        "is_read": m.is_read,
        "created_at": to_iso_utc(m.created_at)
    }

def get_order_snippet_by_id(db: Session, order_id: int) -> Optional[dict]:
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        return None
    return {
        "id": o.id,
        "status": o.status,
        "total": float(o.price or 0),
        "team_name": o.team_name,
        "order_type": o.order_type
    }

def get_or_create_conversation(db: Session, customer_id: int) -> Optional[ChatConversation]:
    if not customer_id:
        return None
    conv = db.query(ChatConversation).filter(ChatConversation.customer_id == customer_id).first()
    if not conv:
        cust = db.query(User.id).filter(User.id == customer_id).first()
        if not cust:
            return None
        conv = ChatConversation(
            customer_id=customer_id,
            last_message="",
            last_message_at=datetime.utcnow(),
            customer_unread=0,
            admin_unread=0
        )
        try:
            db.add(conv)
            db.commit()
            db.refresh(conv)
        except Exception:
            db.rollback()
            conv = db.query(ChatConversation).filter(ChatConversation.customer_id == customer_id).first()
    return conv

def save_chat_message(
    db: Session,
    conversation_id: int,
    sender_id: int,
    sender_role: str,
    sender_name: str,
    message: str,
    order_id: Optional[int] = None
) -> ChatMessage:
    msg = ChatMessage(
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_role=sender_role,
        sender_name=sender_name,
        order_id=order_id,
        message=message,
        is_read=0,
        created_at=datetime.utcnow()
    )
    db.add(msg)
    conv = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
    if conv:
        if order_id:
            conv.referenced_order_id = order_id
        conv.last_message = message[:120]
        conv.last_message_at = msg.created_at
        if sender_role == "customer":
            conv.admin_unread = (conv.admin_unread or 0) + 1
        else:
            conv.customer_unread = (conv.customer_unread or 0) + 1
    db.commit()
    db.refresh(msg)
    return msg

def get_messages_cursor(
    db: Session,
    conversation_id: int,
    before_id: Optional[int] = None,
    limit: int = 30
) -> dict:
    query = db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id)
    if before_id:
        query = query.filter(ChatMessage.id < before_id)
    messages = query.order_by(ChatMessage.id.desc()).limit(limit + 1).all()

    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]

    next_cursor = messages[-1].id if (messages and has_more) else None
    messages_asc = list(reversed(messages))

    return {
        "messages": [serialize_message(m) for m in messages_asc],
        "has_more": has_more,
        "next_cursor": next_cursor
    }

def list_admin_conversations(db: Session) -> list:
    convs = db.query(ChatConversation).order_by(ChatConversation.last_message_at.desc()).all()
    results = []
    for c in convs:
        cust = db.query(User).filter(User.id == c.customer_id).first()
        target_order = None
        if c.referenced_order_id:
            target_order = db.query(Order).filter(Order.id == c.referenced_order_id).first()
        if not target_order:
            target_order = db.query(Order).filter(
                Order.user_id == c.customer_id,
                or_(Order.is_deleted == 0, Order.is_deleted.is_(None))
            ).order_by(Order.id.desc()).first()
        order_snippet = None
        if target_order:
            order_snippet = {
                "id": target_order.id,
                "status": target_order.status,
                "total": float(target_order.price or 0),
                "team_name": target_order.team_name,
                "order_type": target_order.order_type
            }
        results.append({
            "id": c.id,
            "customer_id": c.customer_id,
            "referenced_order_id": c.referenced_order_id,
            "customer_name": cust.name if cust else "Unknown Customer",
            "customer_email": cust.email if cust else "",
            "customer_phone": cust.phone if cust else "",
            "customer_avatar": getattr(cust, "avatar", None) if cust else None,
            "last_message": c.last_message or "",
            "last_message_at": to_iso_utc(c.last_message_at),
            "admin_unread": c.admin_unread or 0,
            "customer_unread": c.customer_unread or 0,
            "active_order": order_snippet
        })
    return results

def mark_conversation_read(db: Session, conversation_id: int, reader_role: str):
    conv = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
    if not conv:
        return
    if reader_role in ("owner", "subadmin", "admin"):
        conv.admin_unread = 0
        db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_role == "customer",
            ChatMessage.is_read == 0
        ).update({"is_read": 1})
    else:
        conv.customer_unread = 0
        db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_role != "customer",
            ChatMessage.is_read == 0
        ).update({"is_read": 1})
    db.commit()

def get_total_admin_unread(db: Session) -> int:
    total = db.query(func.sum(ChatConversation.admin_unread)).scalar()
    return int(total or 0)

def get_unread_customers_count(db: Session) -> int:
    count = db.query(func.count(ChatConversation.id)).filter(ChatConversation.admin_unread > 0).scalar()
    return int(count or 0)

def ensure_default_canned_responses(db: Session):
    defaults = [
        {"shortcut": "turnaround", "title": "Production Lead Time", "message": "Standard jersey manufacturing requires 3-5 business days upon team design approval. Rush options are available upon request."},
        {"shortcut": "sizing", "title": "Size Guide Assistance", "message": "We produce sizes from XS to 5XL. Sleeveless tanks run true-to-size. For a relaxed fit, we recommend ordering one size up."},
        {"shortcut": "approved", "title": "Design Approved", "message": "Great news! Your jersey design has been reviewed and approved by our outfitters. We are preparing production."},
        {"shortcut": "orders", "title": "Track Order Link", "message": "You can monitor live progress on your orders page at any time: check out https://modelyx.store/orders.html"}
    ]
    for d in defaults:
        existing = db.query(ChatCannedResponse).filter(ChatCannedResponse.shortcut == d["shortcut"]).first()
        if not existing:
            db.add(ChatCannedResponse(shortcut=d["shortcut"], title=d["title"], message=d["message"]))
    db.commit()
