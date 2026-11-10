from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.services import pricing_service
from app.routers.deps import require_owner

router = APIRouter(prefix="/pricing", tags=["Pricing"])

class CalculatePriceRequest(BaseModel):
    jersey_type: Optional[str] = "sleeveless"
    finish: Optional[str] = "matte"
    has_shorts: Optional[bool] = False
    quantity: Optional[int] = 1

@router.get("/config")
def get_pricing_config(db: Session = Depends(get_db)):
    cfg = pricing_service.get_pricing_dict(db)
    return {
        "success": True,
        "pricing": cfg,
        **cfg
    }

@router.put("/admin")
def update_pricing_config(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    admin_user = Depends(require_owner)
):
    updated = pricing_service.update_pricing_dict(db, payload)
    return {
        "success": True,
        "message": "Pricing rules updated successfully",
        "pricing": updated
    }

@router.post("/calculate")
def calculate_price(
    payload: CalculatePriceRequest,
    db: Session = Depends(get_db)
):
    pricing = pricing_service.get_pricing_dict(db)
    breakdown = pricing_service.calculate_order_pricing(
        jersey_type=payload.jersey_type,
        finish=payload.finish,
        has_shorts=payload.has_shorts,
        quantity=payload.quantity,
        pricing=pricing
    )
    return breakdown
