from fastapi import APIRouter, HTTPException, Query
import httpx
from app.core.config import GOOGLE_MAPS_API_KEY

router = APIRouter(prefix="/geo", tags=["Geocoding"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

def _dedupe_address_parts(*parts):
    seen = set()
    unique = []
    for raw in parts:
        if not raw:
            continue
        subparts = [s.strip() for s in str(raw).split(",") if s.strip()]
        for part in subparts:
            norm = part.lower()
            if norm not in seen:
                seen.add(norm)
                unique.append(part)
    return ", ".join(unique)

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

@router.get("/ip-lookup")
async def ip_lookup():
    async with httpx.AsyncClient(timeout=4) as client:
        try:
            res = await client.get("http://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon")
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "success":
                    return {
                        "city": data.get("city", ""),
                        "state": data.get("regionName", ""),
                        "zip": data.get("zip", ""),
                        "country": data.get("country", "Philippines"),
                        "lat": data.get("lat"),
                        "lng": data.get("lon"),
                        "provider": "ip"
                    }
        except Exception:
            pass
    return {
        "city": "Mandaluyong City",
        "state": "Metro Manila",
        "zip": "1550",
        "country": "Philippines",
        "lat": 14.5766773,
        "lng": 121.0347259,
        "provider": "default"
    }

@router.get("/search")
async def search_address(q: str = Query(..., min_length=1)):
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

@router.get("/reverse")
async def reverse_geocode(lat: float = Query(...), lng: float = Query(...)):
    async with httpx.AsyncClient(timeout=8) as client:
        if GOOGLE_MAPS_API_KEY:
            try:
                g_params = {
                    "latlng": f"{lat},{lng}",
                    "key": GOOGLE_MAPS_API_KEY
                }
                g_res = await client.get(GOOGLE_GEOCODE_URL, params=g_params)
                if g_res.status_code == 200:
                    g_data = g_res.json()
                    if g_data.get("status") == "OK" and g_data.get("results"):
                        item = g_data["results"][0]
                        res = _format_google_result(item)
                        house = res["address"]["house_number"]
                        road = res["address"]["road"]
                        neighbourhood = res["address"]["neighbourhood"]
                        street_parts = []
                        if house and road:
                            road_lower = road.lower()
                            house_lower = house.lower()
                            if road_lower == house_lower or road_lower.startswith(house_lower + " ") or road_lower.startswith(house_lower + ","):
                                street_parts.append(road)
                            else:
                                street_parts.append(f"{house} {road}")
                        else:
                            street_parts.append(road or house)
                        if neighbourhood:
                            street_parts.append(neighbourhood)
                        clean_street = _dedupe_address_parts(*street_parts)
                        return {
                            "display_name": res["display_name"],
                            "street": clean_street or res["display_name"],
                            "house_number": house,
                            "road": road,
                            "barangay": neighbourhood,
                            "city": res["address"]["city"],
                            "state": res["address"]["state"],
                            "zip": res["address"]["postcode"],
                            "country": res["address"]["country"],
                            "lat": lat,
                            "lng": lng,
                            "provider": "google"
                        }
            except Exception:
                pass

        try:
            params = {
                "lat": lat,
                "lon": lng,
                "format": "jsonv2",
                "addressdetails": "1"
            }
            headers = {
                "User-Agent": "ModelyxThesis/1.0",
                "Accept": "application/json",
            }
            res = await client.get(NOMINATIM_REVERSE_URL, params=params, headers=headers)
            res.raise_for_status()
            data = res.json()
            address = data.get("address", {})
            house = address.get("house_number", "")
            road = address.get("road", "") or address.get("pedestrian", "") or address.get("residential", "")
            neighbourhood = address.get("neighbourhood", "") or address.get("suburb", "") or address.get("quarter", "")
            city = address.get("city", "") or address.get("town", "") or address.get("municipality", "") or address.get("city_district", "")
            state = address.get("state", "") or address.get("region", "") or address.get("province", "")
            zip_code = address.get("postcode", "")
            country = address.get("country", "")

            street_parts = []
            if house and road:
                road_lower = road.lower()
                house_lower = house.lower()
                if road_lower == house_lower or road_lower.startswith(house_lower + " ") or road_lower.startswith(house_lower + ","):
                    street_parts.append(road)
                else:
                    street_parts.append(f"{house} {road}")
            else:
                street_parts.append(road or house)
            if neighbourhood:
                street_parts.append(neighbourhood)
            clean_street = _dedupe_address_parts(*street_parts)

            return {
                "display_name": data.get("display_name", ""),
                "street": clean_street or data.get("display_name", ""),
                "house_number": house,
                "road": road,
                "barangay": neighbourhood,
                "city": city,
                "state": state,
                "zip": zip_code,
                "country": country,
                "lat": lat,
                "lng": lng,
                "provider": "osm"
            }
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="Reverse geocoding is temporarily unavailable") from exc
