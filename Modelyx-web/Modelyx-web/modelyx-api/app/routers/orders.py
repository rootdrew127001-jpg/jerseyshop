from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.schemas import OrderCreate, OrderResponse
from app.services import order_service
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=OrderResponse)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return order_service.place_order(db, current_user["id"], payload)

@router.get("/my", response_model=List[OrderResponse])
def my_orders(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return order_service.get_my_orders(db, current_user["id"])

@router.get("/all", response_model=List[OrderResponse])
def all_orders(
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    return order_service.get_all_orders(db)

@router.patch("/{order_id}/status")
def update_status(
    order_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    order = order_service.update_status(db, order_id, status)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated", "order_id": order_id, "status": status}

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    result = order_service.remove_order(db, order_id)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}