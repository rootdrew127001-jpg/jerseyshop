import json
from sqlalchemy.orm import Session
from app.models.models import PricingSetting

DEFAULT_PRICING = {
    "sleeveless_base": 850.0,
    "tshirt_base": 950.0,
    "shorts_addon": 350.0,
    "finish_matte": 0.0,
    "finish_satin": 0.0,
    "finish_metallic": 0.0,
    "finish_carbon": 0.0,
    "tier_1_min": 5,
    "tier_1_discount": 8.0,
    "tier_2_min": 12,
    "tier_2_discount": 15.0,
    "tier_3_min": 20,
    "tier_3_discount": 20.0,
    "shipping_flat": 120.0,
    "free_shipping_min_qty": 10
}

PRICING_CATEGORIES = {
    "sleeveless_base": "base",
    "tshirt_base": "base",
    "shorts_addon": "addon",
    "finish_matte": "finish",
    "finish_satin": "finish",
    "finish_metallic": "finish",
    "finish_carbon": "finish",
    "tier_1_min": "tiers",
    "tier_1_discount": "tiers",
    "tier_2_min": "tiers",
    "tier_2_discount": "tiers",
    "tier_3_min": "tiers",
    "tier_3_discount": "tiers",
    "shipping_flat": "shipping",
    "free_shipping_min_qty": "shipping"
}

PRICING_DESCRIPTIONS = {
    "sleeveless_base": "Base price for Basketball / Sleeveless tank jersey",
    "tshirt_base": "Base price for T-Shirt jersey with sleeves",
    "shorts_addon": "Additional fee for matching or custom shorts kit",
    "finish_matte": "Matte standard finish premium",
    "finish_satin": "Satin finish premium",
    "finish_metallic": "Metallic finish premium",
    "finish_carbon": "Carbon fiber finish premium",
    "tier_1_min": "Tier 1 minimum quantity (e.g. 5 jerseys)",
    "tier_1_discount": "Tier 1 discount percentage (e.g. 8%)",
    "tier_2_min": "Tier 2 minimum quantity (e.g. 12 jerseys)",
    "tier_2_discount": "Tier 2 discount percentage (e.g. 15%)",
    "tier_3_min": "Tier 3 minimum quantity (e.g. 20 jerseys)",
    "tier_3_discount": "Tier 3 discount percentage (e.g. 20%)",
    "shipping_flat": "Standard flat shipping fee",
    "free_shipping_min_qty": "Minimum jersey count to unlock free shipping"
}

def ensure_default_pricing(db: Session):
    try:
        existing_count = db.query(PricingSetting).count()
        if existing_count < len(DEFAULT_PRICING):
            for k, default_val in DEFAULT_PRICING.items():
                found = db.query(PricingSetting).filter(PricingSetting.key_name == k).first()
                if not found:
                    setting = PricingSetting(
                        key_name=k,
                        category=PRICING_CATEGORIES.get(k, "general"),
                        value=str(default_val),
                        description=PRICING_DESCRIPTIONS.get(k, "")
                    )
                    db.add(setting)
            db.commit()
    except Exception:
        db.rollback()

def get_pricing_dict(db: Session) -> dict:
    ensure_default_pricing(db)
    result = dict(DEFAULT_PRICING)
    try:
        rows = db.query(PricingSetting).all()
        for r in rows:
            raw = r.value.strip()
            if "." in raw:
                try:
                    result[r.key_name] = float(raw)
                except ValueError:
                    result[r.key_name] = raw
            else:
                try:
                    result[r.key_name] = int(raw)
                except ValueError:
                    result[r.key_name] = raw
    except Exception:
        pass
    return result

def update_pricing_dict(db: Session, updates: dict) -> dict:
    ensure_default_pricing(db)
    for k, val in updates.items():
        if k in DEFAULT_PRICING:
            if "discount" in k:
                clean_val = max(0.0, min(99.0, float(val or 0.0)))
            elif "min" in k or "qty" in k:
                clean_val = max(1, int(float(val or 1)))
            else:
                clean_val = max(0.0, float(val or 0.0))

            row = db.query(PricingSetting).filter(PricingSetting.key_name == k).first()
            if not row:
                row = PricingSetting(
                    key_name=k,
                    category=PRICING_CATEGORIES.get(k, "general"),
                    value=str(clean_val),
                    description=PRICING_DESCRIPTIONS.get(k, "")
                )
                db.add(row)
            else:
                row.value = str(clean_val)
    db.commit()
    return get_pricing_dict(db)

def normalize_discount_rate(val: float) -> float:
    v = float(val or 0.0)
    if v < 0.0:
        return 0.0
    if v > 1.0:
        return max(0.0, min(0.99, v / 100.0))
    return max(0.0, min(0.99, v))

def calculate_order_pricing(
    jersey_type: str,
    finish: str,
    has_shorts: bool,
    quantity: int,
    pricing: dict
) -> dict:
    qty = max(int(quantity or 1), 1)
    j_type = (jersey_type or "sleeveless").lower().strip()
    fin = (finish or "matte").lower().strip()

    if "tshirt" in j_type or "sleeve" in j_type and "tank" not in j_type and "sleeveless" not in j_type:
        base_unit = max(0.0, float(pricing.get("tshirt_base", 950.0)))
        resolved_type = "tshirt"
    else:
        base_unit = max(0.0, float(pricing.get("sleeveless_base", 850.0)))
        resolved_type = "sleeveless"

    finish_unit = 0.0
    shorts_unit = max(0.0, float(pricing.get("shorts_addon", 350.0))) if has_shorts else 0.0

    raw_unit_price = max(0.0, base_unit + shorts_unit)
    raw_subtotal = max(0.0, round(raw_unit_price * qty, 2))

    tier_3_min = max(1, int(pricing.get("tier_3_min", 20)))
    tier_3_rate = normalize_discount_rate(pricing.get("tier_3_discount", 20.0))
    tier_2_min = max(1, int(pricing.get("tier_2_min", 12)))
    tier_2_rate = normalize_discount_rate(pricing.get("tier_2_discount", 15.0))
    tier_1_min = max(1, int(pricing.get("tier_1_min", 5)))
    tier_1_rate = normalize_discount_rate(pricing.get("tier_1_discount", 8.0))

    active_tier = 0
    discount_rate = 0.0
    if qty >= tier_3_min:
        active_tier = 3
        discount_rate = tier_3_rate
    elif qty >= tier_2_min:
        active_tier = 2
        discount_rate = tier_2_rate
    elif qty >= tier_1_min:
        active_tier = 1
        discount_rate = tier_1_rate

    discount_amount = max(0.0, min(raw_subtotal, round(raw_subtotal * discount_rate, 2)))
    discounted_subtotal = max(0.0, round(raw_subtotal - discount_amount, 2))
    effective_unit_price = max(0.0, round(discounted_subtotal / qty, 2)) if qty > 0 else 0.0

    free_shipping_min = max(1, int(pricing.get("free_shipping_min_qty", 10)))
    flat_shipping = max(0.0, float(pricing.get("shipping_flat", 120.0)))
    is_free_shipping = qty >= free_shipping_min
    shipping_fee = 0.0 if is_free_shipping else flat_shipping

    total_price = max(0.0, round(discounted_subtotal + shipping_fee, 2))

    return {
        "jersey_type": resolved_type,
        "base_unit_price": base_unit,
        "finish": fin,
        "finish_unit_price": finish_unit,
        "has_shorts": has_shorts,
        "shorts_unit_price": shorts_unit,
        "raw_unit_price": raw_unit_price,
        "raw_subtotal": raw_subtotal,
        "quantity": qty,
        "active_tier": active_tier,
        "discount_percent": round(discount_rate * 100.0, 1),
        "discount_rate": discount_rate,
        "discount_amount": discount_amount,
        "discounted_subtotal": discounted_subtotal,
        "effective_unit_price": effective_unit_price,
        "shipping_fee": shipping_fee,
        "is_free_shipping": is_free_shipping,
        "total": total_price,
        "tier_config": {
            "tier_1_min": tier_1_min,
            "tier_1_discount": tier_1_rate * 100.0,
            "tier_2_min": tier_2_min,
            "tier_2_discount": tier_2_rate * 100.0,
            "tier_3_min": tier_3_min,
            "tier_3_discount": tier_3_rate * 100.0,
            "free_shipping_min_qty": free_shipping_min
        }
    }
