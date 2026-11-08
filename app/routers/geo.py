from fastapi import APIRouter, HTTPException, Query
import httpx
from app.core.config import GOOGLE_MAPS_API_KEY

router = APIRouter(prefix="/geo", tags=["Geocoding"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

def _format_google_result(item):
    components = item.get("address_components", [])
    def get_comp(types):
        for c in components:
            if any(t in c.get("types", []) for t in types):
                return c.get("long_name", "")
        return ""

    street_num = get_comp(["street_number"])
    route = get_comp(["route"])
    barangay = get_comp(["sublocality_level_1", "sublocality", "neighborhood"])
    city = get_comp(["locality", "postal_town", "administrative_area_level_2"])
    state = get_comp(["administrative_area_level_1"])
    zip_code = get_comp(["postal_code"])
    country = get_comp(["country"])

    loc = item.get("geometry", {}).get("location", {})
    lat = loc.get("lat")
    lng = loc.get("lng")

    return {
        "display_name": item.get("formatted_address", ""),
        "lat": str(lat) if lat is not None else "",
        "lon": str(lng) if lng is not None else "",
        "address": {
            "house_number": street_num,
            "road": route or item.get("formatted_address", ""),
            "neighbourhood": barangay,
            "suburb": barangay,
            "city": city,
            "state": state,
            "postcode": zip_code,
            "country": country,
        },
        "provider": "google"
    }

async def _fetch_nominatim(client: httpx.AsyncClient, q: str):
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
    res = await client.get(NOMINATIM_URL, params=params, headers=headers)
    res.raise_for_status()
    raw = res.json()
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict):
                item["provider"] = "osm"
        return raw
    return []

@router.get("/search")
async def search_address(q: str = Query(..., min_length=3)):
    async with httpx.AsyncClient(timeout=8) as client:
        if GOOGLE_MAPS_API_KEY:
            try:
                g_params = {
                    "address": q,
                    "components": "country:ph",
                    "key": GOOGLE_MAPS_API_KEY
                }
                g_res = await client.get(GOOGLE_GEOCODE_URL, params=g_params)
                if g_res.status_code == 200:
                    g_data = g_res.json()
                    if g_data.get("status") == "OK" and g_data.get("results"):
                        return [_format_google_result(item) for item in g_data.get("results")[:5]]
            except Exception:
                pass

        try:
            return await _fetch_nominatim(client, q)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="Address search is temporarily unavailable") from exc
