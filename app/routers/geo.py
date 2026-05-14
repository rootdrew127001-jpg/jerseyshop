from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/geo", tags=["Geocoding"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

@router.get("/search")
async def search_address(q: str = Query(..., min_length=3)):
    params = {
        "q": q,
        "format": "jsonv2",
        "addressdetails": "1",
        "dedupe": "1",
        "limit": "5",
        "countrycodes": "ph",
        "accept-language": "en",
    }
    headers = {
        "User-Agent": "ModelyxThesis/1.0",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.get(NOMINATIM_URL, params=params, headers=headers)
            res.raise_for_status()
            return res.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Address search is temporarily unavailable") from exc
