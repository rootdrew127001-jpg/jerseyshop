import httpx
import json
import random
import re
from typing import Optional, Tuple
from app.core.config import GEMINI_API_KEY, CLAUDE_API_KEY
from app.core.redis import redis_client, is_redis_available

ALLOWED_PATTERNS = [
    'none', 'stripes', 'diagonal', 'panel', 'gradient',
    'thunderstorm', 'paint_splatter', 'apex_gamer',
    'vortex_swoosh', 'carbon_scratch', 'digi_camo',
    'retro_halftone', 'cyber_grid', 'tidal_wave'
]

ALLOWED_LOGOS = ['none', 'shield', 'star', 'flame', 'eagle', 'vortex']
ALLOWED_FONTS = ['athletic', 'stencil', 'tech']
ALLOWED_FINISHES = ['matte', 'satin', 'metallic', 'carbon']
ALLOWED_SHOWROOMS = ['cyber', 'locker', 'stadium']

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "baseColor": {"type": "STRING"},
        "accentColor": {"type": "STRING"},
        "tertiaryColor": {"type": "STRING"},
        "pattern": {"type": "STRING", "enum": ALLOWED_PATTERNS},
        "logo": {"type": "STRING", "enum": ALLOWED_LOGOS},
        "font": {"type": "STRING", "enum": ALLOWED_FONTS},
        "finish": {"type": "STRING", "enum": ALLOWED_FINISHES},
        "showroom": {"type": "STRING", "enum": ALLOWED_SHOWROOMS},
        "teamName": {"type": "STRING"},
        "number": {"type": "STRING"},
        "sponsorText": {"type": "STRING"},
        "reasoning": {"type": "STRING"}
    },
    "required": [
        "baseColor", "accentColor", "tertiaryColor",
        "pattern", "logo", "font", "finish", "showroom",
        "teamName", "number", "reasoning"
    ]
}

SYSTEM_DESIGN_PROMPT = f"""You are an elite, lightning-fast 3D sports jersey art director and custom designer.
Your mission is to analyze the user's prompt (which may be a team name, custom color instruction, pattern request, or iterative tweak) and generate the exact matching 3D jersey design configuration.

COMMAND EXECUTION RULES:
1. OBEY ALL COLOR COMMANDS:
   - If user asks for "black", "all black", "dark", or "stealth", baseColor MUST be "#000000" or "#0F172A" with matching high-contrast accents.
   - If user asks for "white" or "clean", baseColor MUST be "#FFFFFF".
   - If user asks for specific colors (e.g. "red and gold", "purple and yellow", "green"), you MUST strictly set baseColor and accentColor to those requested shades.
2. OBEY ALL PATTERN & STYLE COMMANDS:
   - Lightning/electric -> "thunderstorm".
   - Gaming/esports -> "apex_gamer" or "cyber_grid".
   - Stripes/soccer -> "stripes".
   - Plain/minimalist -> "none".
3. SHORT TEAM NAME (Max 10 uppercase letters):
   - Extract or create a punchy team or brand name.
4. STRICT SCHEMA CONSTRAINTS:
   - pattern MUST be one of: {json.dumps(ALLOWED_PATTERNS)}
   - logo MUST be one of: {json.dumps(ALLOWED_LOGOS)}
   - font MUST be one of: {json.dumps(ALLOWED_FONTS)}
   - finish MUST be one of: {json.dumps(ALLOWED_FINISHES)}
   - showroom MUST be one of: {json.dumps(ALLOWED_SHOWROOMS)}
   - Colors must be valid 6-character hex strings with # (e.g. #0F172A, #FACC15, #FFFFFF).
"""

def build_prompt(user_prompt: str, current_design: Optional[dict] = None) -> str:
    prompt = f"{SYSTEM_DESIGN_PROMPT}\n\nUSER PROMPT / COMMAND: \"{user_prompt}\""
    if current_design and isinstance(current_design, dict):
        curr_info = {
            "baseColor": current_design.get("baseColor", "#4F46E5"),
            "accentColor": current_design.get("accentColor", "#7C3AED"),
            "tertiaryColor": current_design.get("tertiaryColor", "#FFFFFF"),
            "pattern": current_design.get("pattern", "none"),
            "logo": current_design.get("logo", "none"),
            "font": current_design.get("font", "athletic"),
            "finish": current_design.get("finish", "matte"),
            "showroom": current_design.get("showroom", "cyber"),
            "teamName": current_design.get("frontText") or current_design.get("teamName") or "TEAM",
            "number": str(current_design.get("number", "23")),
            "sponsorText": current_design.get("sponsorText", "")
        }
        prompt += f"\n\nCURRENT JERSEY CONFIGURATION:\n{json.dumps(curr_info, indent=2)}"
        prompt += (
            "\n\nITERATIVE TWEAK RULE:\n"
            "If the user is asking to modify or tweak specific features (e.g. 'make stripes gold', "
            "'change number to 99', 'stealth mode', 'add lightning pattern'), PRESERVE all existing "
            "attributes from CURRENT JERSEY CONFIGURATION that were NOT specifically asked to change. "
            "Only generate an entirely new theme if the user explicitly asks for a brand new team or concept."
        )
    return prompt


def clean_json_response(raw_text: str) -> dict:
    """Safely extracts JSON from model text."""
    text = raw_text.strip()
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group(0))
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


def sanitize_design(design: dict, user_prompt: str, current_design: Optional[dict] = None) -> dict:
    """Ensures all fields conform strictly to predefined options and color requests."""
    p_lower = user_prompt.lower()
    cd = current_design or {}

    def valid_hex(c):
        return bool(c and isinstance(c, str) and re.match(r"^#[0-9a-fA-F]{6}$", c.strip()))

    if not valid_hex(design.get("baseColor")):
        design["baseColor"] = cd.get("baseColor") if valid_hex(cd.get("baseColor")) else "#0F172A"
    if not valid_hex(design.get("accentColor")):
        design["accentColor"] = cd.get("accentColor") if valid_hex(cd.get("accentColor")) else "#FACC15"
    if not valid_hex(design.get("tertiaryColor")):
        design["tertiaryColor"] = cd.get("tertiaryColor") if valid_hex(cd.get("tertiaryColor")) else "#FFFFFF"

    if any(k in p_lower for k in ["black", "stealth", "dark", "noir", "shadow", "all black"]):
        if design["baseColor"].lower() not in ["#000000", "#0f172a", "#111111", "#18181b"]:
            design["baseColor"] = "#000000"
            if design["accentColor"] == design["baseColor"]:
                design["accentColor"] = "#FACC15"

    if design.get("pattern") not in ALLOWED_PATTERNS:
        design["pattern"] = cd.get("pattern") if cd.get("pattern") in ALLOWED_PATTERNS else "stripes"
    if design.get("logo") not in ALLOWED_LOGOS:
        design["logo"] = cd.get("logo") if cd.get("logo") in ALLOWED_LOGOS else "shield"
    if design.get("font") not in ALLOWED_FONTS:
        design["font"] = cd.get("font") if cd.get("font") in ALLOWED_FONTS else "athletic"
    if design.get("finish") not in ALLOWED_FINISHES:
        design["finish"] = cd.get("finish") if cd.get("finish") in ALLOWED_FINISHES else "matte"
    if design.get("showroom") not in ALLOWED_SHOWROOMS:
        design["showroom"] = cd.get("showroom") if cd.get("showroom") in ALLOWED_SHOWROOMS else "cyber"

    if not design.get("teamName"):
        clean_name = re.sub(r"[^a-zA-Z0-9\s]", "", user_prompt).strip().upper()
        design["teamName"] = clean_name[:10] if clean_name else (cd.get("frontText") or cd.get("teamName") or "STEALTH")

    if not design.get("number"):
        design["number"] = str(cd.get("number") or random.randint(1, 99)).zfill(2)

    return design


def generate_smart_fallback(user_prompt: str, current_design: Optional[dict] = None) -> dict:
    """100% Offline rule-based algorithmic design generator obeying user commands and context."""
    p = user_prompt.lower()

    if current_design and isinstance(current_design, dict):
        base = current_design.get("baseColor", "#4F46E5")
        accent = current_design.get("accentColor", "#7C3AED")
        tert = current_design.get("tertiaryColor", "#FFFFFF")
        pat = current_design.get("pattern", "none")
        logo = current_design.get("logo", "none")
        font = current_design.get("font", "athletic")
        finish = current_design.get("finish", "matte")
        showroom = current_design.get("showroom", "cyber")
        team = current_design.get("frontText") or current_design.get("teamName") or "TEAM"
        number = str(current_design.get("number", "23"))
        sponsor = current_design.get("sponsorText", "")

        # Check for number change:
        num_m = re.search(r'\b(?:number|no\.?|#)\s*(\d{1,2})\b', p)
        if num_m:
            number = num_m.group(1).zfill(2)
        elif re.search(r'^\d{1,2}$', p.strip()):
            number = p.strip().zfill(2)

        # Color tweaks:
        if "gold" in p or "yellow" in p:
            accent = "#FACC15"
        if "black" in p or "stealth" in p or "dark" in p:
            base = "#0F172A"
        if "white" in p or "clean" in p:
            base = "#FFFFFF"
        if "red" in p or "crimson" in p or "fire" in p:
            accent = "#DC2626"
        if "blue" in p or "navy" in p:
            base = "#0284C7"
        if "green" in p:
            base = "#16A34A"
        if "purple" in p or "violet" in p:
            base = "#7C3AED"

        # Pattern tweaks:
        for pattern_name in ALLOWED_PATTERNS:
            if pattern_name in p:
                pat = pattern_name
                break
        if "lightning" in p or "thunder" in p:
            pat = "thunderstorm"
        if "camo" in p:
            pat = "digi_camo"
        if "grid" in p:
            pat = "cyber_grid"
        if "stripes" in p:
            pat = "stripes"

        # Finish & logo tweaks:
        for finish_name in ALLOWED_FINISHES:
            if finish_name in p:
                finish = finish_name
                break
        for logo_name in ALLOWED_LOGOS:
            if logo_name in p:
                logo = logo_name
                break

        return {
            "baseColor": base,
            "accentColor": accent,
            "tertiaryColor": tert,
            "pattern": pat,
            "logo": logo,
            "font": font,
            "finish": finish,
            "showroom": showroom,
            "teamName": team,
            "number": number,
            "sponsorText": sponsor,
            "reasoning": f"Applied targeted modifications to current jersey for '{user_prompt}'."
        }

    # Brand new design fallback themes:
    if any(k in p for k in ["black", "stealth", "dark", "noir", "shadow", "blackout", "midnight"]):
        accent = "#FACC15" if "gold" in p or "yellow" in p else ("#DC2626" if "red" in p else "#FFFFFF")
        pattern = "carbon_scratch" if "carbon" in p or "scratch" in p else ("cyber_grid" if "cyber" in p else "panel")
        finish = "carbon" if "carbon" in p else ("metallic" if "gold" in p else "matte")
        return {
            "baseColor": "#000000",
            "accentColor": accent,
            "tertiaryColor": "#1E293B",
            "pattern": pattern,
            "logo": "shield" if "shield" in p else "vortex",
            "font": "tech" if "tech" in p else "athletic",
            "finish": finish,
            "showroom": "cyber",
            "teamName": "STEALTH" if "generate" in p or "make" in p else p.upper()[:10],
            "number": "00",
            "sponsorText": "MATRIX",
            "reasoning": "Ultra-sleek stealth black jersey accented with high-contrast highlights."
        }

    if any(k in p for k in ["white", "snow", "clean", "pure", "ice"]):
        accent = "#0284C7" if "blue" in p else ("#DC2626" if "red" in p else "#FACC15")
        return {
            "baseColor": "#FFFFFF",
            "accentColor": accent,
            "tertiaryColor": "#0F172A",
            "pattern": "gradient",
            "logo": "star",
            "font": "athletic",
            "finish": "matte",
            "showroom": "stadium",
            "teamName": "TITANS" if "generate" in p else p.upper()[:10],
            "number": "01",
            "sponsorText": "APEX",
            "reasoning": "Crisp minimalist white base highlighted with dynamic accents."
        }

    if any(k in p for k in ["fire", "flame", "heat", "blaze", "burn", "inferno", "red"]):
        return {
            "baseColor": "#DC2626",
            "accentColor": "#FACC15",
            "tertiaryColor": "#0F172A",
            "pattern": "paint_splatter",
            "logo": "flame",
            "font": "athletic",
            "finish": "satin",
            "showroom": "locker",
            "teamName": "HEAT" if "heat" in p else "BLAZE",
            "number": "08",
            "sponsorText": "VOLT",
            "reasoning": "Blazing volcanic crimson theme with intense championship gold highlights."
        }

    if any(k in p for k in ["thunder", "storm", "lightning", "volt", "electric"]):
        return {
            "baseColor": "#1E3A5F",
            "accentColor": "#FACC15",
            "tertiaryColor": "#0284C7",
            "pattern": "thunderstorm",
            "logo": "star",
            "font": "tech",
            "finish": "metallic",
            "showroom": "stadium",
            "teamName": "THUNDER",
            "number": "77",
            "sponsorText": "HYPER",
            "reasoning": "Electrifying storm palette with high-voltage lightning patterns."
        }

    if any(k in p for k in ["cyber", "tech", "matrix", "future", "neon"]):
        return {
            "baseColor": "#0F172A",
            "accentColor": "#A855F7",
            "tertiaryColor": "#0284C7",
            "pattern": "cyber_grid",
            "logo": "vortex",
            "font": "tech",
            "finish": "carbon",
            "showroom": "cyber",
            "teamName": "CYBER",
            "number": "99",
            "sponsorText": "VORTEX",
            "reasoning": "Futuristic cyber-grid palette engineered with neon violet accents."
        }

    palette_options = [
        ("#4F46E5", "#FACC15", "#0F172A", "apex_gamer", "shield", "stencil", "metallic", "TITAN"),
        ("#16A34A", "#FFFFFF", "#064E3B", "stripes", "star", "athletic", "matte", "DREAM11"),
        ("#EA580C", "#0F172A", "#FFFFFF", "panel", "vortex", "tech", "carbon", "MATRIX"),
        ("#DB2777", "#0F172A", "#FACC15", "gradient", "star", "athletic", "satin", "MODELYX"),
    ]
    base, accent, tert, pat, logo, font, finish, sponsor = random.choice(palette_options)
    clean_name = re.sub(r"[^a-zA-Z0-9\s]", "", user_prompt).strip().upper()
    return {
        "baseColor": base,
        "accentColor": accent,
        "tertiaryColor": tert,
        "pattern": pat,
        "logo": logo,
        "font": font,
        "finish": finish,
        "showroom": "stadium",
        "teamName": clean_name[:10] if clean_name else "WARRIORS",
        "number": str(random.randint(1, 99)).zfill(2),
        "sponsorText": sponsor,
        "reasoning": f"Custom championship jersey layout formulated for '{user_prompt}'."
    }


async def call_gemini(user_prompt: str, api_key: str, current_design: Optional[dict] = None) -> Tuple[Optional[dict], Optional[str]]:
    """Calls Google Gemini API using ultra-low latency flash-lite models with structured schema."""
    fast_models = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash"
    ]

    prompt_text = build_prompt(user_prompt, current_design)
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt_text}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 350,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA
        }
    }

    last_error = None
    async with httpx.AsyncClient() as client:
        for model in fast_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                response = await client.post(url, json=payload, timeout=3.2)
                if response.status_code == 200:
                    data = response.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = clean_json_response(raw_text)
                    return sanitize_design(parsed, user_prompt, current_design), None
                else:
                    last_error = f"{model} returned status {response.status_code}: {response.text[:120]}"
            except Exception as ex:
                last_error = f"{model} error: {ex}"
                continue

    return None, last_error


async def call_claude(user_prompt: str, api_key: str, current_design: Optional[dict] = None) -> Tuple[Optional[dict], Optional[str]]:
    """Calls Anthropic Claude API."""
    prompt_text = build_prompt(user_prompt, current_design)
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }
    body = {
        "model": "claude-3-5-haiku-20241022",
        "max_tokens": 250,
        "messages": [{"role": "user", "content": prompt_text}]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=body,
                timeout=4.0
            )

        if response.status_code != 200:
            return None, f"Claude API error ({response.status_code}): {response.text[:120]}"

        data = response.json()
        raw_text = data["content"][0]["text"]
        parsed = clean_json_response(raw_text)
        return sanitize_design(parsed, user_prompt, current_design), None
    except Exception as ex:
        return None, f"Claude error: {ex}"


async def get_jersey_suggestion(user_prompt: str, current_design: Optional[dict] = None):
    """
    High-Speed Generator Endpoint:
    1. Checks Redis cache (instant 1ms response for repeated exact queries).
    2. Calls Gemini Flash-Lite with structured outputs (~1s response).
    3. Seamless fallback to Claude Haiku or smart context-aware rules engine.
    """
    cleaned_prompt = (user_prompt or "WARRIORS").strip()
    
    # If no current design is provided, we can leverage redis cache for exact prompts
    use_cache = current_design is None or not any(current_design.values())
    cache_key = f"ai_jersey_cache:{cleaned_prompt.lower()}"

    if use_cache and is_redis_available():
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached), None
        except Exception:
            pass

    if GEMINI_API_KEY and GEMINI_API_KEY.strip() and not GEMINI_API_KEY.startswith("your_"):
        try:
            result, err = await call_gemini(cleaned_prompt, GEMINI_API_KEY.strip(), current_design)
            if result:
                if use_cache and is_redis_available():
                    try:
                        redis_client.setex(cache_key, 3600, json.dumps(result))
                    except Exception:
                        pass
                return result, None
            print(f"[AI Service Info] Gemini fast fallback: {err}")
        except Exception as e:
            print(f"[AI Service Info] Gemini exception fallback: {e}")

    if CLAUDE_API_KEY and CLAUDE_API_KEY.strip() and not CLAUDE_API_KEY.startswith("your_"):
        try:
            result, err = await call_claude(cleaned_prompt, CLAUDE_API_KEY.strip(), current_design)
            if result:
                return result, None
        except Exception:
            pass

    fallback = generate_smart_fallback(cleaned_prompt, current_design)
    if use_cache and is_redis_available():
        try:
            redis_client.setex(cache_key, 3600, json.dumps(fallback))
        except Exception:
            pass
    return fallback, None