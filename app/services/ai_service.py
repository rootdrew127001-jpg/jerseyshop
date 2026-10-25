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
        "backName": {"type": "STRING"},
        "number": {"type": "STRING"},
        "sponsorText": {"type": "STRING"},
        "gender": {"type": "STRING", "enum": ["male", "female"]},
        "matchJerseyColors": {"type": "BOOLEAN"},
        "shortsBaseColor": {"type": "STRING"},
        "shortsAccentColor": {"type": "STRING"},
        "assistantReply": {"type": "STRING"},
        "reasoning": {"type": "STRING"}
    },
    "required": [
        "baseColor", "accentColor", "tertiaryColor",
        "pattern", "logo", "font", "finish", "showroom",
        "teamName", "number", "reasoning"
    ]
}

SYSTEM_DESIGN_PROMPT = f"""You are an elite, interactive 3D sports jersey art director and conversational design co-pilot.
Your mission is to analyze the user's conversational prompt (which may be a team theme, color request, pattern request, or targeted incremental tweak like 'rename player as drew' or 'change number to 10') and return a validated 3D uniform configuration along with a friendly, conversational confirmation response.

COMMAND EXECUTION RULES:
1. OBEY ALL COLOR COMMANDS:
   - "black", "all black", "dark", "stealth" -> baseColor "#000000" or "#0F172A".
   - "white", "clean" -> baseColor "#FFFFFF".
   - Specific colors (e.g. "royal blue", "crimson red", "gold", "emerald") -> Set baseColor / accentColor to accurate vibrant hex shades.
2. OBEY ALL PATTERN & STYLE COMMANDS:
   - Lightning/electric -> "thunderstorm".
   - Gaming/esports -> "apex_gamer" or "cyber_grid".
   - Stripes -> "stripes".
   - Plain/minimal -> "none".
3. PLAYER BACK NAME & TEAM NAME RULES:
   - If user asks to rename or change player name (e.g. "rename player as drew", "player name drew", "name on back jordan"), set backName to that uppercase string (Max 12 chars).
   - If user specifies a team name, set teamName (Max 12 chars).
   - Otherwise PRESERVE the existing backName and teamName from CURRENT JERSEY CONFIGURATION.
4. SHORTS RULES:
   - If user asks to match shorts, set matchJerseyColors to true.
   - If user asks for custom shorts color, set shortsBaseColor accordingly and matchJerseyColors to false.
5. CONVERSATIONAL ASSISTANT CONFIRMATION (assistantReply):
   - Always formulate a concise, encouraging validation reply explaining what was changed and what was preserved (e.g., "Updated player name to DREW on the back! Kept your royal blue stripes kit intact.").
6. STRICT DELTA PRESERVATION:
   - If the user is asking to modify or tweak specific features, PRESERVE all existing attributes from CURRENT JERSEY CONFIGURATION that were NOT asked to change. Never reset unrelated properties.
7. STRICT SCHEMA CONSTRAINTS:
   - pattern MUST be one of: {json.dumps(ALLOWED_PATTERNS)}
   - logo MUST be one of: {json.dumps(ALLOWED_LOGOS)}
   - font MUST be one of: {json.dumps(ALLOWED_FONTS)}
   - finish MUST be one of: {json.dumps(ALLOWED_FINISHES)}
   - showroom MUST be one of: {json.dumps(ALLOWED_SHOWROOMS)}
   - Colors must be valid 6-character hex strings with # (e.g. #0284C7, #FFFFFF).
"""

def build_prompt(user_prompt: str, current_design: Optional[dict] = None, history: Optional[list] = None) -> str:
    prompt = f"{SYSTEM_DESIGN_PROMPT}\n\nUSER COMMAND: \"{user_prompt}\""
    
    if history and isinstance(history, list) and len(history) > 0:
        history_lines = []
        for msg in history[-6:]: # include up to last 6 messages
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = msg.get("content", "").strip()
            if content:
                history_lines.append(f"- {role}: \"{content}\"")
        if history_lines:
            prompt += f"\n\nRECENT CHAT HISTORY:\n" + "\n".join(history_lines)

    if current_design and isinstance(current_design, dict):
        curr_info = {
            "gender": current_design.get("gender", "male"),
            "jerseyType": current_design.get("jerseyType", "sleeveless"),
            "baseColor": current_design.get("baseColor", "#4F46E5"),
            "accentColor": current_design.get("accentColor", "#7C3AED"),
            "tertiaryColor": current_design.get("tertiaryColor", "#FFFFFF"),
            "pattern": current_design.get("pattern", "none"),
            "logo": current_design.get("logo", "none"),
            "font": current_design.get("font", "athletic"),
            "finish": current_design.get("finish", "matte"),
            "showroom": current_design.get("showroom", "cyber"),
            "teamName": current_design.get("frontText") or current_design.get("teamName") or "TEAM",
            "backName": current_design.get("backName") or "PLAYER",
            "number": str(current_design.get("number", "23")),
            "sponsorText": current_design.get("sponsorText", ""),
            "matchJerseyColors": current_design.get("matchJerseyColors", True),
            "shortsBaseColor": current_design.get("shortsBaseColor") or current_design.get("baseColor", "#4F46E5"),
            "shortsAccentColor": current_design.get("shortsAccentColor") or current_design.get("accentColor", "#7C3AED")
        }
        prompt += f"\n\nCURRENT JERSEY CONFIGURATION:\n{json.dumps(curr_info, indent=2)}"
        prompt += (
            "\n\nCRITICAL MULTI-TURN INSTRUCTION:\n"
            "Treat the current uniform as a state machine. Apply ONLY the requested changes (e.g. if user asks to 'rename player as drew', set backName='DREW' and keep baseColor, accentColor, pattern, number, and shorts identical to CURRENT JERSEY CONFIGURATION). "
            "Never revert or discard existing attributes unless explicitly commanded."
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
        design["baseColor"] = cd.get("baseColor") if valid_hex(cd.get("baseColor")) else "#0284C7"
    if not valid_hex(design.get("accentColor")):
        design["accentColor"] = cd.get("accentColor") if valid_hex(cd.get("accentColor")) else "#FFFFFF"
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

    if design.get("gender") not in ["male", "female"]:
        design["gender"] = cd.get("gender", "male")
    if any(k in p_lower for k in ["women", "female", "girls", "wnba", "ladies", "woman"]):
        design["gender"] = "female"
    elif any(k in p_lower for k in ["men", "male", "boys", "nba", "man"]):
        design["gender"] = "male"

    if not design.get("teamName"):
        clean_name = re.sub(r"[^a-zA-Z0-9\s]", "", user_prompt).strip().upper()
        design["teamName"] = clean_name[:10] if clean_name else (cd.get("frontText") or cd.get("teamName") or "STEALTH")

    # Extract or preserve player backName
    name_m = re.search(r'\b(?:rename\s+(?:the\s+)?player\s+(?:to|as)|player\s+(?:name|as|to)|back\s+name\s+(?:to|as)?|name\s+on\s+back\s+(?:to|as)?)\s+([a-zA-Z0-9_\-]+)', p_lower)
    if name_m:
        design["backName"] = name_m.group(1).upper()[:12]
    elif not design.get("backName"):
        design["backName"] = cd.get("backName") or "PLAYER"

    if not design.get("number"):
        design["number"] = str(cd.get("number") or random.randint(1, 99)).zfill(2)

    # Shorts matching
    if "match shorts" in p_lower or "shorts match" in p_lower:
        design["matchJerseyColors"] = True
    elif "matchJerseyColors" not in design:
        design["matchJerseyColors"] = cd.get("matchJerseyColors", True)

    if design.get("matchJerseyColors", True):
        design["shortsBaseColor"] = design["baseColor"]
        design["shortsAccentColor"] = design["accentColor"]
    else:
        if not valid_hex(design.get("shortsBaseColor")):
            design["shortsBaseColor"] = cd.get("shortsBaseColor") or design["baseColor"]
        if not valid_hex(design.get("shortsAccentColor")):
            design["shortsAccentColor"] = cd.get("shortsAccentColor") or design["accentColor"]

    # Compute appliedChanges
    applied_changes = []
    if cd:
        for k in ["baseColor", "accentColor", "tertiaryColor", "pattern", "logo", "font", "finish", "teamName", "backName", "number", "sponsorText", "shortsBaseColor"]:
            if k in design and str(design.get(k)) != str(cd.get(k)):
                applied_changes.append(k)
    else:
        applied_changes = ["baseColor", "accentColor", "pattern", "teamName"]

    design["appliedChanges"] = applied_changes

    if not design.get("assistantReply"):
        if "backName" in applied_changes:
            design["assistantReply"] = f"Player name updated to '{design['backName']}' on the back! Kept your current kit colors and styling intact."
        elif "baseColor" in applied_changes or "pattern" in applied_changes:
            design["assistantReply"] = f"Updated your uniform styling with new colors and patterns! What would you like to customize next?"
        elif applied_changes:
            design["assistantReply"] = f"Applied changes: {', '.join(applied_changes)}."
        else:
            design["assistantReply"] = f"Synchronized design for: '{user_prompt}'."

    return design


def generate_smart_fallback(user_prompt: str, current_design: Optional[dict] = None) -> dict:
    """100% Offline rule-based algorithmic design generator obeying user commands and context."""
    p = user_prompt.lower()
    fallback_gender = "female" if any(k in p for k in ["women", "female", "girls", "wnba", "ladies", "woman"]) else (
        "male" if any(k in p for k in ["men", "male", "boys", "nba", "man"]) else (
            current_design.get("gender", "male") if (current_design and isinstance(current_design, dict)) else "male"
        )
    )

    if current_design and isinstance(current_design, dict):
        base = current_design.get("baseColor", "#0284C7")
        accent = current_design.get("accentColor", "#FFFFFF")
        tert = current_design.get("tertiaryColor", "#FFFFFF")
        pat = current_design.get("pattern", "none")
        logo = current_design.get("logo", "none")
        font = current_design.get("font", "athletic")
        finish = current_design.get("finish", "matte")
        showroom = current_design.get("showroom", "cyber")
        team = current_design.get("frontText") or current_design.get("teamName") or "TEAM"
        back_name = current_design.get("backName") or "PLAYER"
        number = str(current_design.get("number", "23"))
        sponsor = current_design.get("sponsorText", "")
        match_shorts = current_design.get("matchJerseyColors", True)
        shorts_base = current_design.get("shortsBaseColor") or base
        shorts_accent = current_design.get("shortsAccentColor") or accent

        applied = []
        assistant_reply = None

        # Check for player rename (e.g. "rename player as drew", "player drew", "player name drew"):
        name_m = re.search(r'\b(?:rename\s+(?:the\s+)?player\s+(?:to|as)|player\s+(?:name|as|to)|back\s+name\s+(?:to|as)?|name\s+on\s+back\s+(?:to|as)?)\s+([a-zA-Z0-9_\-]+)', p)
        if name_m:
            back_name = name_m.group(1).upper()[:12]
            applied.append("backName")
            assistant_reply = f"Player name updated to '{back_name}' on the back! Kept your current kit colors and styling intact."

        # Check for team rename:
        team_m = re.search(r'\b(?:rename\s+(?:the\s+)?team\s+(?:to|as)|team\s+name\s+(?:to|as)?|front\s+text\s+(?:to|as)?)\s+([a-zA-Z0-9_\-]+)', p)
        if team_m:
            team = team_m.group(1).upper()[:12]
            applied.append("teamName")
            if not assistant_reply:
                assistant_reply = f"Team name set to '{team}'!"

        # Check for number change:
        num_m = re.search(r'\b(?:number|no\.?|#)\s*(?:to|is|as)?\s*(\d{1,2})\b', p)
        if num_m:
            number = num_m.group(1).zfill(2)
            applied.append("number")
            if not assistant_reply:
                assistant_reply = f"Player number changed to #{number} across jersey and shorts!"
        elif re.search(r'\b(\d{1,2})\b', p) and any(w in p for w in ["number", "digit", "jersey number", "no"]):
            num_m2 = re.search(r'\b(\d{1,2})\b', p)
            number = num_m2.group(1).zfill(2)
            applied.append("number")
            if not assistant_reply:
                assistant_reply = f"Player number changed to #{number}!"
        elif re.search(r'^\d{1,2}$', p.strip()):
            number = p.strip().zfill(2)
            applied.append("number")
            if not assistant_reply:
                assistant_reply = f"Player number set to #{number}!"

        # Color tweaks:
        if "gold" in p or "yellow" in p:
            accent = "#FACC15"; applied.append("accentColor")
        if "black" in p or "stealth" in p or "dark" in p:
            base = "#000000"; applied.append("baseColor")
        if "white" in p or "clean" in p:
            base = "#FFFFFF"; applied.append("baseColor")
        if "red" in p or "crimson" in p or "fire" in p:
            base = "#DC2626"; applied.append("baseColor")
        if "blue" in p or "navy" in p or "royal blue" in p:
            base = "#0284C7"; applied.append("baseColor")
        if "green" in p or "emerald" in p:
            base = "#16A34A"; applied.append("baseColor")
        if "purple" in p or "violet" in p:
            base = "#7C3AED"; applied.append("baseColor")

        # Pattern tweaks:
        for pattern_name in ALLOWED_PATTERNS:
            if pattern_name in p:
                pat = pattern_name
                applied.append("pattern")
                break
        if "lightning" in p or "thunder" in p:
            pat = "thunderstorm"; applied.append("pattern")
        elif "camo" in p:
            pat = "digi_camo"; applied.append("pattern")
        elif "grid" in p:
            pat = "cyber_grid"; applied.append("pattern")
        elif "stripes" in p:
            pat = "stripes"; applied.append("pattern")

        # Shorts tweaks:
        if "match shorts" in p or "match" in p and "shorts" in p:
            match_shorts = True
            shorts_base = base
            shorts_accent = accent
            applied.append("matchJerseyColors")
        elif match_shorts:
            shorts_base = base
            shorts_accent = accent

        if not assistant_reply:
            if applied:
                assistant_reply = f"Applied targeted tweaks: {', '.join(applied)}. What would you like to edit next?"
            else:
                assistant_reply = f"Acknowledged! Custom kit updated for: '{user_prompt}'."

        return {
            "gender": fallback_gender,
            "baseColor": base,
            "accentColor": accent,
            "tertiaryColor": tert,
            "pattern": pat,
            "logo": logo,
            "font": font,
            "finish": finish,
            "showroom": showroom,
            "teamName": team,
            "backName": back_name,
            "number": number,
            "sponsorText": sponsor,
            "matchJerseyColors": match_shorts,
            "shortsBaseColor": shorts_base,
            "shortsAccentColor": shorts_accent,
            "assistantReply": assistant_reply,
            "appliedChanges": applied,
            "reasoning": f"Applied targeted modifications to current jersey for '{user_prompt}'."
        }

    # Brand new design fallback themes:
    if any(k in p for k in ["blue", "navy", "royal", "ocean", "cobalt", "azure"]):
        pat = "stripes" if "stripes" in p else ("thunderstorm" if "lightning" in p else "gradient")
        for pattern_name in ALLOWED_PATTERNS:
            if pattern_name in p:
                pat = pattern_name
                break
        return {
            "gender": fallback_gender,
            "baseColor": "#0284C7",
            "accentColor": "#FFFFFF",
            "tertiaryColor": "#0F172A",
            "pattern": pat,
            "logo": "star",
            "font": "athletic",
            "finish": "matte",
            "showroom": "stadium",
            "teamName": "TITANS",
            "backName": "PLAYER",
            "number": "23",
            "sponsorText": "ORBIT",
            "matchJerseyColors": True,
            "shortsBaseColor": "#0284C7",
            "shortsAccentColor": "#FFFFFF",
            "assistantReply": f"Generated a vibrant Royal Blue kit with {pat} pattern! What would you like to customize next?",
            "appliedChanges": ["baseColor", "accentColor", "pattern"],
            "reasoning": f"Royal Blue uniform formulated with {pat} pattern."
        }

    if any(k in p for k in ["black", "stealth", "dark", "noir", "shadow", "blackout", "midnight"]):
        accent = "#FACC15" if "gold" in p or "yellow" in p else ("#DC2626" if "red" in p else "#FFFFFF")
        pattern = "carbon_scratch" if "carbon" in p or "scratch" in p else ("cyber_grid" if "cyber" in p else "panel")
        finish = "carbon" if "carbon" in p else ("metallic" if "gold" in p else "matte")
        return {
            "gender": fallback_gender,
            "baseColor": "#000000",
            "accentColor": accent,
            "tertiaryColor": "#1E293B",
            "pattern": pattern,
            "logo": "shield" if "shield" in p else "vortex",
            "font": "tech" if "tech" in p else "athletic",
            "finish": finish,
            "showroom": "cyber",
            "teamName": "STEALTH" if "generate" in p or "make" in p else p.upper()[:10],
            "backName": "PLAYER",
            "number": "00",
            "sponsorText": "MATRIX",
            "matchJerseyColors": True,
            "shortsBaseColor": "#000000",
            "shortsAccentColor": accent,
            "assistantReply": "Ultra-sleek stealth black jersey with high-contrast highlights applied!",
            "appliedChanges": ["baseColor", "accentColor", "pattern"],
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


async def call_gemini(user_prompt: str, api_key: str, current_design: Optional[dict] = None, history: Optional[list] = None) -> Tuple[Optional[dict], Optional[str]]:
    """Calls Google Gemini API using ultra-low latency flash models with structured schema."""
    fast_models = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-lite-latest",
        "gemini-1.5-flash"
    ]

    prompt_text = build_prompt(user_prompt, current_design, history)
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt_text}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 380,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA
        }
    }

    last_error = None
    async with httpx.AsyncClient() as client:
        for model in fast_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                response = await client.post(url, json=payload, timeout=2.0)
                if response.status_code == 200:
                    data = response.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = clean_json_response(raw_text)
                    return sanitize_design(parsed, user_prompt, current_design), None
                else:
                    last_error = f"{model} returned status {response.status_code}: {response.text[:120]}"
                    if response.status_code in [400, 401, 403]:
                        break
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as net_err:
                last_error = f"Network unavailable: {net_err}"
                break
            except Exception as ex:
                last_error = f"{model} error: {ex}"
                continue

    return None, last_error


async def call_claude(user_prompt: str, api_key: str, current_design: Optional[dict] = None, history: Optional[list] = None) -> Tuple[Optional[dict], Optional[str]]:
    """Calls Anthropic Claude API."""
    prompt_text = build_prompt(user_prompt, current_design, history)
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }
    body = {
        "model": "claude-3-5-haiku-20241022",
        "max_tokens": 280,
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


async def get_jersey_suggestion(user_prompt: str, current_design: Optional[dict] = None, history: Optional[list] = None):
    """
    High-Speed Generator Endpoint:
    1. Checks Redis cache for fresh sessions.
    2. Calls Gemini Flash with structured schema & conversational memory.
    3. Seamless fallback to Claude Haiku or smart context-aware rules engine.
    """
    cleaned_prompt = (user_prompt or "WARRIORS").strip()
    
    # If no current design is provided and no history, we can leverage redis cache for exact prompts
    use_cache = (current_design is None or not any(current_design.values())) and (not history)
    cache_key = f"ai_jersey_cache:{cleaned_prompt.lower()}"

    if use_cache and is_redis_available():
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached), None
        except Exception:
            pass

    if GEMINI_API_KEY and GEMINI_API_KEY.startswith("AIzaSy"):
        try:
            result, err = await call_gemini(cleaned_prompt, GEMINI_API_KEY.strip(), current_design, history)
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
            result, err = await call_claude(cleaned_prompt, CLAUDE_API_KEY.strip(), current_design, history)
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