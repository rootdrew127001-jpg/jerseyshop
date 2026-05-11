from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from app.core.database import get_db
from app.core.config import PAYPAL_CLIENT_ID, PAYPAL_MODE
from app.routers.deps import get_current_user
from app.services import order_service
from pydantic import BaseModel

router = APIRouter(prefix="/payments", tags=["Payments"])

class CaptureRequest(BaseModel):
    order_id: int
    paypal_order_id: str

@router.get("/config")
def get_paypal_config():
    return {
        "client_id": PAYPAL_CLIENT_ID,
        "mode": PAYPAL_MODE
    }

async def get_paypal_access_token():
    url = "https://api-m.sandbox.paypal.com/v1/oauth2/token"
    async with httpx.AsyncClient() as client:
        res = await client.post(
            url,
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, ""),
            headers={"Accept": "application/json"}
        )
        data = res.json()
        return data.get("access_token")

@router.post("/capture")
async def capture_payment(
    payload: CaptureRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    order = order_service.get_order_by_id(db, payload.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    order.payment_status = "Paid"
    order.paypal_order_id = payload.paypal_order_id
    db.commit()
    db.refresh(order)

    return {
        "message": "Payment recorded successfully",
        "order_id": order.id,
        "payment_status": order.payment_status,
        "paypal_order_id": order.paypal_order_id
    }