import httpx
import json
import random
import re
from app.core.config import GEMINI_API_KEY, CLAUDE_API_KEY

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

SYSTEM_DESIGN_PROMPT = f"""You are an elite, highly responsive 3D sports jersey art director and custom designer.
Your job is to strictly analyze the user's prompt (which may be a team name, custom color instruction, pattern request, or style description) and generate the exact matching 3D jersey design configuration.

COMMAND EXECUTION RULES:
1. OBEY ALL COLOR COMMANDS:
   - If user asks for "black", "all black", "dark", or "stealth", baseColor MUST be "#000000" or "#0F172A" with matching high-contrast accents.
   - If user asks for "white" or "clean", baseColor MUST be "#FFFFFF".
   - If user asks for specific colors (e.g. "red and gold", "purple and yellow", "green"), you MUST strictly set baseColor and accentColor to those requested shades.
2. OBEY ALL PATTERN & STYLE COMMANDS:
   - If user asks for lightning/electric -> pattern MUST be "thunderstorm".
   - If user asks for gaming/esports -> pattern MUST be "apex_gamer" or "cyber_grid".
   - If user asks for stripes/soccer -> pattern MUST be "stripes".
   - If user asks for plain/solid/minimalist -> pattern MUST be "none".
3. EXTRACT OR CREATE A SHORT TEAM NAME (Max 10 uppercase letters):
   - If user gave a team name (e.g. "Tokyo Vipers"), use "VIPERS" or "TOKYO".
   - If user gave an instruction (e.g. "generate a black jersey"), extract an appropriate matching brand/team name (e.g. "STEALTH", "SHADOW", "BLACKOUT", "TITAN").

STRICT SCHEMA CONSTRAINTS (You MUST only use these exact options):
- pattern MUST be one of: {json.dumps(ALLOWED_PATTERNS)}
- logo MUST be one of: {json.dumps(ALLOWED_LOGOS)}
- font MUST be one of: {json.dumps(ALLOWED_FONTS)}
- finish MUST be one of: {json.dumps(ALLOWED_FINISHES)}
- showroom MUST be one of: {json.dumps(ALLOWED_SHOWROOMS)}
- Colors must be valid 6-character hex strings with # (e.g. #000000, #FACC15, #FFFFFF).

Respond ONLY with a valid JSON object matching this schema:
{{
  "baseColor": "#hexcode",
  "accentColor": "#hexcode",
  "tertiaryColor": "#hexcode",
  "pattern": "one_of_allowed_patterns",
  "logo": "one_of_allowed_logos",
  "font": "one_of_allowed_fonts",
  "finish": "one_of_allowed_finishes",
  "showroom": "one_of_allowed_showrooms",
  "teamName": "SHORT_NAME",
  "number": "23",
  "sponsorText": "SPONSOR_NAME",
  "reasoning": "One concise sentence explaining how this design executes the user request."
}}"""


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


def sanitize_design(design: dict, user_prompt: str) -> dict:
    """Ensures all fields conform strictly to predefined options and color requests."""
    p_lower = user_prompt.lower()
    
    
    if any(k in p_lower for k in ["black", "stealth", "dark", "noir", "shadow", "all black"]):
        if not design.get("baseColor") or design.get("baseColor", "").lower() not in ["#000000", "#0f172a", "#111111", "#18181b"]:
            design["baseColor"] = "#000000"
            if design.get("accentColor") == design["baseColor"]:
                design["accentColor"] = "#FACC15"

    if design.get("pattern") not in ALLOWED_PATTERNS:
        design["pattern"] = "stripes"
    if design.get("logo") not in ALLOWED_LOGOS:
        design["logo"] = "shield"
    if design.get("font") not in ALLOWED_FONTS:
        design["font"] = "athletic"
    if design.get("finish") not in ALLOWED_FINISHES:
        design["finish"] = "matte"
    if design.get("showroom") not in ALLOWED_SHOWROOMS:
        design["showroom"] = "cyber"
    if not design.get("teamName"):
        clean_name = re.sub(r"[^a-zA-Z0-9\s]", "", user_prompt).strip().upper()
        design["teamName"] = clean_name[:10] if clean_name else "STEALTH"
    if not design.get("number"):
        design["number"] = str(random.randint(1, 99)).zfill(2)
    return design


def generate_smart_fallback(user_prompt: str) -> dict:
    """100% Free rule-based algorithmic design generator obeying user color & theme commands."""
    p = user_prompt.lower()

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
            "reasoning": f"Ultra-sleek stealth black jersey accented with high-contrast highlights."
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

    if any(k in p for k in ["fire", "flame", "heat", "blaze", "burn", "inferno", "red", "phoenix", "dragon"]):
        return {
            "baseColor": "#DC2626",
            "accentColor": "#FACC15",
            "tertiaryColor": "#0F172A",
            "pattern": "paint_splatter",
            "logo": "flame",
            "font": "athletic",
            "finish": "satin",
            "showroom": "locker",
            "teamName": "HEAT" if "heat" in p else (p.upper()[:10] if not "generate" in p else "BLAZE"),
            "number": "08",
            "sponsorText": "VOLT",
            "reasoning": f"Blazing volcanic crimson theme with intense championship gold highlights."
        }

    if any(k in p for k in ["thunder", "storm", "lightning", "volt", "electric", "shock", "bolt"]):
        return {
            "baseColor": "#1E3A5F",
            "accentColor": "#FACC15",
            "tertiaryColor": "#0284C7",
            "pattern": "thunderstorm",
            "logo": "star",
            "font": "tech",
            "finish": "metallic",
            "showroom": "stadium",
            "teamName": "THUNDER" if "thunder" in p else (p.upper()[:10] if not "generate" in p else "LIGHTNING"),
            "number": "77",
            "sponsorText": "HYPER",
            "reasoning": f"Electrifying storm palette with high-voltage lightning patterns."
        }


    if any(k in p for k in ["cyber", "tech", "matrix", "future", "neon", "bot", "apex", "glitch", "vortex"]):
        return {
            "baseColor": "#0F172A",
            "accentColor": "#A855F7",
            "tertiaryColor": "#0284C7",
            "pattern": "cyber_grid",
            "logo": "vortex",
            "font": "tech",
            "finish": "carbon",
            "showroom": "cyber",
            "teamName": "CYBER" if "generate" in p else p.upper()[:10],
            "number": "99",
            "sponsorText": "VORTEX",
            "reasoning": f"Futuristic cyber-grid palette engineered with neon violet accents."
        }

    if any(k in p for k in ["blue", "navy", "royal", "ocean", "sky", "water", "eagle", "wings"]):
        return {
            "baseColor": "#0284C7",
            "accentColor": "#FFFFFF",
            "tertiaryColor": "#D97706",
            "pattern": "diagonal",
            "logo": "eagle",
            "font": "athletic",
            "finish": "matte",
            "showroom": "stadium",
            "teamName": "EAGLES" if "generate" in p else p.upper()[:10],
            "number": "23",
            "sponsorText": "APEX",
            "reasoning": f"Dynamic aerodynamic design with sky blue base and crisp contrast."
        }

    if any(k in p for k in ["green", "emerald", "camo", "nature"]):
        return {
            "baseColor": "#16A34A",
            "accentColor": "#FFFFFF",
            "tertiaryColor": "#064E3B",
            "pattern": "digi_camo",
            "logo": "star",
            "font": "athletic",
            "finish": "matte",
            "showroom": "stadium",
            "teamName": "CELTICS" if "generate" in p else p.upper()[:10],
            "number": "11",
            "sponsorText": "DREAM11",
            "reasoning": f"Classic sports green with digital camo patterns and clean white trims."
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


from app.core.redis import redis_client, is_redis_available

async def call_gemini(user_prompt: str, api_key: str):
    """Calls Google Gemini API with low-latency flash model."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    
    prompt = f"{SYSTEM_DESIGN_PROMPT}\n\nUSER PROMPT / COMMAND: \"{user_prompt}\""
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 350,
            "responseMimeType": "application/json"
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=2.8)
            if response.status_code == 200:
                data = response.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = clean_json_response(raw_text)
                return sanitize_design(parsed, user_prompt), None
            else:
                return None, f"Gemini status {response.status_code}: {response.text}"
    except Exception as ex:
        return None, f"Gemini error: {ex}"


async def call_claude(user_prompt: str, api_key: str):
    """Calls Anthropic Claude API."""
    prompt = f"{SYSTEM_DESIGN_PROMPT}\n\nUSER PROMPT / COMMAND: \"{user_prompt}\""
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }
    body = {
        "model": "claude-3-5-haiku-20241022",
        "max_tokens": 200,
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=body,
                timeout=6.0
            )

        if response.status_code != 200:
            return None, f"Claude API error ({response.status_code}): {response.text}"

        data = response.json()
        raw_text = data["content"][0]["text"]
        parsed = clean_json_response(raw_text)
        return sanitize_design(parsed, user_prompt), None
    except Exception as ex:
        return None, f"Claude error: {ex}"


async def get_jersey_suggestion(user_prompt: str):
    """
    High-Speed Generator Endpoint:
    1. Checks Redis cache (instant 1ms response if previously requested).
    2. Calls Gemini Flash (1-2s response).
    3. Seamless instant fallback to Smart Algorithmic Generator if API is busy.
    """
    cleaned_prompt = (user_prompt or "WARRIORS").strip()
    cache_key = f"ai_jersey_cache:{cleaned_prompt.lower()}"

    if is_redis_available():
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached), None
        except Exception:
            pass

    if GEMINI_API_KEY and GEMINI_API_KEY.strip() and not GEMINI_API_KEY.startswith("your_"):
        try:
            result, err = await call_gemini(cleaned_prompt, GEMINI_API_KEY.strip())
            if result:
                if is_redis_available():
                    try:
                        redis_client.setex(cache_key, 3600, json.dumps(result))
                    except Exception:
                        pass
                return result, None
            print(f"[AI Service Info] Gemini fast-fail fallback: {err}")
        except Exception as e:
            print(f"[AI Service Info] Gemini exception fallback: {e}")

    if CLAUDE_API_KEY and CLAUDE_API_KEY.strip() and not CLAUDE_API_KEY.startswith("your_"):
        try:
            result, err = await call_claude(cleaned_prompt, CLAUDE_API_KEY.strip())
            if result:
                return result, None
        except Exception:
            pass

    fallback = generate_smart_fallback(cleaned_prompt)
    if is_redis_available():
        try:
            redis_client.setex(cache_key, 3600, json.dumps(fallback))
        except Exception:
            pass
    return fallback, None