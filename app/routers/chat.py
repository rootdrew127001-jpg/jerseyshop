from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt, JWTError

from app.core.database import get_db, SessionLocal
from app.core.config import SECRET_KEY, ALGORITHM, is_admin_email
from app.models.models import User, ChatConversation, ChatMessage, ChatCannedResponse, Order
from app.routers.deps import get_current_user, require_admin, require_owner
from app.services.chat_service import (
    chat_manager,
    is_live_chat_enabled,
    set_live_chat_enabled,
    get_or_create_conversation,
    save_chat_message,
    get_messages_cursor,
    list_admin_conversations,
    mark_conversation_read,
    get_total_admin_unread,
    get_unread_customers_count,
    serialize_message
)

router = APIRouter(prefix="/chat", tags=["Live Chat"])

class ChatToggleRequest(BaseModel):
    enabled: bool

class ChatMessageSendRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    order_id: Optional[int] = None

class ChatOrderReferenceRequest(BaseModel):
    order_id: int
    message: Optional[str] = None

def parse_user_from_token(token: Optional[str], db: Session) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email = payload.get("email")
        sub_val = payload.get("sub")
        user_id = int(sub_val) if sub_val and str(sub_val).isdigit() else None
        user_role = payload.get("role")

        db_user = None
        if user_id:
            db_user = db.query(User).filter(User.id == user_id).first()
            if db_user and getattr(db_user, "is_active", 1) == 0:
                return None

        if is_admin_email(user_email):
            user_role = "owner"
        elif db_user:
            user_role = db_user.role

        user_name = db_user.name if db_user else (payload.get("name") or "User")

        return {
            "id": user_id,
            "email": user_email,
            "role": user_role,
            "name": user_name,
            "avatar": getattr(db_user, "avatar", None) if db_user else None
        }
    except Exception:
        return None

@router.get("/status")
def get_chat_status():
    return {"enabled": is_live_chat_enabled()}

@router.post("/admin/settings/toggle")
async def toggle_chat_status(
    payload: ChatToggleRequest,
    current_user: dict = Depends(require_owner)
):
    set_live_chat_enabled(payload.enabled)
    await chat_manager.broadcast_system_status(payload.enabled)
    return {"success": True, "enabled": payload.enabled}

@router.get("/history")
def get_customer_history(
    before_id: Optional[int] = None,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    conv = get_or_create_conversation(db, current_user["id"])
    result = get_messages_cursor(db, conv.id, before_id=before_id, limit=limit)
    return {
        "conversation_id": conv.id,
        "referenced_order_id": conv.referenced_order_id,
        "messages": result["messages"],
        "has_more": result["has_more"],
        "next_cursor": result["next_cursor"],
        "chat_enabled": is_live_chat_enabled()
    }

@router.get("/delta")
def get_chat_delta(
    conversation_id: Optional[int] = None,
    after_id: int = 0,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_role = current_user.get("role")
    if user_role in ("owner", "admin"):
        if not conversation_id:
            raise HTTPException(status_code=400, detail="conversation_id is required")
        conv_id = conversation_id
    else:
        conv = get_or_create_conversation(db, current_user["id"])
        conv_id = conv.id

    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conv_id,
        ChatMessage.id > after_id
    ).order_by(ChatMessage.id.asc()).all()

    return {
        "conversation_id": conv_id,
        "messages": [serialize_message(m) for m in messages],
        "chat_enabled": is_live_chat_enabled()
    }

@router.get("/admin/conversations")
def get_admin_conversations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    convs = list_admin_conversations(db)
    unread_total = get_total_admin_unread(db)
    unread_customers = get_unread_customers_count(db)
    return {
        "conversations": convs,
        "unread_total": unread_total,
        "unread_customers": unread_customers,
        "chat_enabled": is_live_chat_enabled()
    }

@router.get("/admin/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int,
    before_id: Optional[int] = None,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    result = get_messages_cursor(db, conversation_id, before_id=before_id, limit=limit)
    return {
        "conversation_id": conversation_id,
        "messages": result["messages"],
        "has_more": result["has_more"],
        "next_cursor": result["next_cursor"]
    }

@router.post("/admin/conversations/{conversation_id}/read")
async def admin_mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    mark_conversation_read(db, conversation_id, current_user.get("role", "admin"))
    unread_total = get_total_admin_unread(db)
    unread_customers = get_unread_customers_count(db)
    await chat_manager.broadcast_to_admins({
        "type": "read_ack",
        "conversation_id": conversation_id,
        "unread_total": unread_total,
        "unread_customers": unread_customers
    })
    return {
        "status": "ok",
        "unread_total": unread_total,
        "unread_customers": unread_customers
    }

@router.post("/customer/read")
def customer_mark_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    conv = get_or_create_conversation(db, current_user["id"])
    mark_conversation_read(db, conv.id, "customer")
    return {"status": "ok"}

@router.get("/admin/canned")
def get_canned_responses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    responses = db.query(ChatCannedResponse).order_by(ChatCannedResponse.id.asc()).all()
    return [{
        "id": r.id,
        "shortcut": r.shortcut,
        "title": r.title,
        "message": r.message
    } for r in responses]

@router.post("/send")
async def send_chat_message_http(
    payload: ChatMessageSendRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not is_live_chat_enabled() and current_user.get("role") not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live chat support is currently offline."
        )

    text = (payload.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if current_user.get("role") in ("owner", "admin"):
        if not payload.conversation_id:
            raise HTTPException(status_code=400, detail="conversation_id is required for admin messages.")
        conv = db.query(ChatConversation).filter(ChatConversation.id == payload.conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        sender_role = current_user.get("role")
        sender_name = current_user.get("name") or "Modelyx Support"
        msg = save_chat_message(db, conv.id, current_user["id"], sender_role, sender_name, text)
        serialized = serialize_message(msg)

        await chat_manager.send_to_customer(conv.customer_id, {
            "type": "new_message",
            "message": serialized
        })
        await chat_manager.broadcast_to_admins({
            "type": "new_message",
            "conversation_id": conv.id,
            "message": serialized
        })
        return serialized
    else:
        conv = get_or_create_conversation(db, current_user["id"])
        sender_role = "customer"
        sender_name = current_user.get("name") or "Customer"

        target_order_id = payload.order_id
        if target_order_id:
            user_order = db.query(Order).filter(
                Order.id == target_order_id,
                Order.user_id == current_user["id"]
            ).first()
            if not user_order:
                target_order_id = None

        msg = save_chat_message(
            db, conv.id, current_user["id"], sender_role, sender_name, text,
            order_id=target_order_id
        )
        serialized = serialize_message(msg)

        await chat_manager.send_to_customer(current_user["id"], {
            "type": "new_message",
            "message": serialized
        })
        await chat_manager.broadcast_to_admins({
            "type": "new_message",
            "conversation_id": conv.id,
            "customer_id": current_user["id"],
            "customer_name": sender_name,
            "customer_avatar": current_user.get("avatar"),
            "message": serialized,
            "order_id": target_order_id,
            "order": serialized.get("order"),
            "referenced_order_id": conv.referenced_order_id,
            "admin_unread": conv.admin_unread,
            "unread_total": get_total_admin_unread(db),
            "unread_customers": get_unread_customers_count(db)
        })
        return serialized

@router.post("/customer/reference-order")
async def reference_order_http(
    payload: ChatOrderReferenceRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not is_live_chat_enabled() and current_user.get("role") not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live chat support is currently offline."
        )

    order = db.query(Order).filter(
        Order.id == payload.order_id,
        Order.user_id == current_user["id"]
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    conv = get_or_create_conversation(db, current_user["id"])
    sender_role = "customer"
    sender_name = current_user.get("name") or "Customer"
    order_text = (payload.message or "").strip()
    if not order_text:
        order_text = f"Referenced Order #{order.id} ({order.status} - ₱{int(order.price or 0):,})"

    msg = save_chat_message(
        db, conv.id, current_user["id"], sender_role, sender_name, order_text,
        order_id=order.id
    )
    serialized = serialize_message(msg)

    await chat_manager.send_to_customer(current_user["id"], {
        "type": "new_message",
        "message": serialized
    })
    await chat_manager.broadcast_to_admins({
        "type": "new_message",
        "conversation_id": conv.id,
        "customer_id": current_user["id"],
        "customer_name": sender_name,
        "message": serialized,
        "order_id": order.id,
        "order": serialized.get("order"),
        "referenced_order_id": conv.referenced_order_id,
        "admin_unread": conv.admin_unread,
        "unread_total": get_total_admin_unread(db),
        "unread_customers": get_unread_customers_count(db)
    })
    return serialized

@router.websocket("/ws")
@router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    with SessionLocal() as db:
        auth_token = token or websocket.cookies.get("modelyx_token")
        user = parse_user_from_token(auth_token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user_role = user.get("role")
        user_id = user.get("id")
        user_name = user.get("name")

        if user_role in ("owner", "admin"):
            await chat_manager.connect_admin(websocket)
        else:
            await chat_manager.connect_customer(websocket, user_id)

    try:
        await websocket.send_json({
            "type": "init",
            "user_id": user_id,
            "role": user_role,
            "chat_enabled": is_live_chat_enabled()
        })

        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "send_message":
                msg_text = (data.get("message") or "").strip()
                if not msg_text:
                    continue

                with SessionLocal() as db:
                    if user_role in ("owner", "admin"):
                        conv_id = data.get("conversation_id")
                        if not conv_id:
                            continue
                        conv = db.query(ChatConversation).filter(ChatConversation.id == conv_id).first()
                        if not conv:
                            continue
                        msg = save_chat_message(db, conv.id, user_id, user_role, user_name, msg_text)
                        serialized = serialize_message(msg)
                        await chat_manager.send_to_customer(conv.customer_id, {
                            "type": "new_message",
                            "message": serialized
                        })
                        await chat_manager.broadcast_to_admins({
                            "type": "new_message",
                            "conversation_id": conv.id,
                            "message": serialized
                        })
                    else:
                        if not is_live_chat_enabled():
                            await websocket.send_json({
                                "type": "error",
                                "message": "Live chat support is currently offline."
                            })
                            continue
                        target_order_id = data.get("order_id")
                        if target_order_id:
                            user_order = db.query(Order).filter(
                                Order.id == target_order_id,
                                Order.user_id == user_id
                            ).first()
                            if not user_order:
                                target_order_id = None

                        conv = get_or_create_conversation(db, user_id)
                        msg = save_chat_message(
                            db, conv.id, user_id, "customer", user_name, msg_text,
                            order_id=target_order_id
                        )
                        serialized = serialize_message(msg)
                        await chat_manager.send_to_customer(user_id, {
                            "type": "new_message",
                            "message": serialized
                        })
                        await chat_manager.broadcast_to_admins({
                            "type": "new_message",
                            "conversation_id": conv.id,
                            "customer_id": user_id,
                            "customer_name": user_name,
                            "customer_avatar": user.get("avatar"),
                            "message": serialized,
                            "order_id": target_order_id,
                            "order": serialized.get("order"),
                            "referenced_order_id": conv.referenced_order_id,
                            "admin_unread": conv.admin_unread,
                            "unread_total": get_total_admin_unread(db),
                            "unread_customers": get_unread_customers_count(db)
                        })

            elif action == "typing":
                is_typing = bool(data.get("is_typing"))
                if user_role in ("owner", "admin"):
                    conv_id = data.get("conversation_id")
                    if conv_id:
                        with SessionLocal() as db:
                            conv = db.query(ChatConversation).filter(ChatConversation.id == conv_id).first()
                            if conv:
                                await chat_manager.send_to_customer(conv.customer_id, {
                                    "type": "typing",
                                    "is_typing": is_typing,
                                    "sender_name": user_name
                                })
                else:
                    await chat_manager.broadcast_to_admins({
                        "type": "typing",
                        "is_typing": is_typing,
                        "customer_id": user_id,
                        "customer_name": user_name
                    })

            elif action == "read_ack":
                conv_id = data.get("conversation_id")
                with SessionLocal() as db:
                    if user_role in ("owner", "admin") and conv_id:
                        mark_conversation_read(db, conv_id, user_role)
                        await chat_manager.broadcast_to_admins({
                            "type": "read_ack",
                            "conversation_id": conv_id,
                            "unread_total": get_total_admin_unread(db),
                            "unread_customers": get_unread_customers_count(db)
                        })
                    elif user_role == "customer":
                        conv = get_or_create_conversation(db, user_id)
                        mark_conversation_read(db, conv.id, "customer")

            elif action == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        if user_role in ("owner", "admin"):
            chat_manager.disconnect_admin(websocket)
        else:
            chat_manager.disconnect_customer(websocket, user_id)
    except Exception:
        if user_role in ("owner", "admin"):
            chat_manager.disconnect_admin(websocket)
        else:
            chat_manager.disconnect_customer(websocket, user_id)
