import httpx
import json
import random
import re
from typing import Optional, Tuple
from app.core.config import GEMINI_API_KEY, CLAUDE_API_KEY, OPENAI_API_BASE, OPENAI_API_KEY, OPENAI_MODEL, GROQ_API_KEY
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
        "pattern": {"type": "STRING"},
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

POPULAR_PATTERNS = [
    'stripes', 'diagonal', 'panel', 'gradient', 'thunderstorm',
    'paint_splatter', 'apex_gamer', 'vortex_swoosh', 'carbon_scratch',
    'digi_camo', 'retro_halftone', 'cyber_grid', 'tidal_wave',
    'param_rings_25_36', 'param_stars_25_24', 'param_hex_32_2',
    'param_chevrons_40_4_up', 'param_waves_20_20_h', 'param_dots_8_32'
]

SEMANTIC_PATTERN_MAP = {
    "rings": "param_rings_25_36",
    "ring": "param_rings_25_36",
    "circles": "param_rings_25_36",
    "circle": "param_rings_25_36",
    "stars": "param_stars_25_24",
    "star": "param_stars_25_24",
    "starry": "param_stars_25_24",
    "honeycomb": "param_hex_32_2",
    "hex": "param_hex_32_2",
    "hexagon": "param_hex_32_2",
    "beehive": "param_hex_32_2",
    "chevrons": "param_chevrons_40_4_up",
    "chevron": "param_chevrons_40_4_up",
    "arrows": "param_chevrons_40_4_up",
    "arrow": "param_chevrons_40_4_up",
    "wave": "tidal_wave",
    "waves": "tidal_wave",
    "ocean": "tidal_wave",
    "diamonds": "param_diamonds_32_2",
    "diamond": "param_diamonds_32_2",
    "argyle": "param_diamonds_32_2",
    "dots": "param_dots_8_32",
    "dot": "param_dots_8_32",
    "polka": "param_dots_8_32",
    "polka dots": "param_dots_8_32",
    "camo": "digi_camo",
    "camouflage": "digi_camo",
    "lightning": "thunderstorm",
    "thunder": "thunderstorm",
    "splatter": "paint_splatter",
    "paint": "paint_splatter",
    "carbon": "carbon_scratch",
    "scratch": "carbon_scratch",
    "stripes": "stripes",
    "striped": "stripes",
    "stripe": "stripes",
    "diagonal": "diagonal",
    "halftone": "retro_halftone",
    "retro": "retro_halftone",
    "grid": "cyber_grid",
    "matrix": "cyber_grid",
    "cyber": "cyber_grid",
    "gradient": "gradient",
    "fade": "gradient",
    "side panels": "panel",
    "panels": "panel",
    "panel": "panel",
    "vortex": "vortex_swoosh",
    "swoosh": "vortex_swoosh",
    "apex": "apex_gamer",
    "gamer": "apex_gamer",
    "solid": "none",
    "plain": "none",
    "minimal": "none",
    "clean": "none"
}

PATTERN_DISPLAY_NAMES = {
    'none': 'Solid',
    'stripes': 'Classic Stripes',
    'diagonal': 'Diagonal Stripes',
    'panel': 'Side Panels',
    'gradient': 'Smooth Gradient',
    'thunderstorm': 'Thunder Lightning',
    'paint_splatter': 'Paint Splatter',
    'apex_gamer': 'Apex Gamer',
    'vortex_swoosh': 'Vortex Swoosh',
    'carbon_scratch': 'Carbon Fiber',
    'digi_camo': 'Digital Camo',
    'retro_halftone': 'Retro Halftone',
    'cyber_grid': 'Cyber Grid',
    'tidal_wave': 'Tidal Wave',
    'param_rings_25_36': 'Rings Pattern',
    'param_stars_25_24': 'Stars Pattern',
    'param_hex_32_2': 'Honeycomb Pattern',
    'param_chevrons_40_4_up': 'Chevrons Pattern',
    'param_waves_20_20_h': 'Waves Pattern',
    'param_dots_8_32': 'Polka Dots Pattern',
    'param_diamonds_32_2': 'Diamonds Pattern'
}

def is_valid_pattern(p: Optional[str]) -> bool:
    if not p or not isinstance(p, str):
        return False
    if p in ALLOWED_PATTERNS:
        return True
    if p.startswith("param_") and bool(re.match(r"^param_[a-z0-9_]+$", p)):
        return True
    return False

def get_pattern_display_name(pat: str) -> str:
    if not pat:
        return "Solid"
    if pat in PATTERN_DISPLAY_NAMES:
        return PATTERN_DISPLAY_NAMES[pat]
    if pat.startswith("param_"):
        parts = pat.split("_")
        if len(parts) >= 2:
            return f"{parts[1].capitalize()} Pattern"
    return pat.capitalize()

COLOR_HEX_MAP = {
    # Reds
    "red": "#DC2626", "crimson": "#DC143C", "scarlet": "#FF2400", "maroon": "#800000",
    "burgundy": "#800020", "cherry": "#DE3163", "ruby": "#E0115F", "fire red": "#B22222",
    "wine": "#722F37", "blood red": "#660000", "brick red": "#CB4154", "bright red": "#FF0000",
    "dark red": "#8B0000",
    # Blues
    "blue": "#2563EB", "navy": "#1E3A5F", "navy blue": "#001F3F", "royal blue": "#4169E1",
    "sky blue": "#87CEEB", "baby blue": "#89CFF0", "cobalt": "#0047AB", "azure": "#007FFF",
    "ocean blue": "#0077B6", "dark blue": "#00008B", "light blue": "#ADD8E6", "deep blue": "#00008B",
    "electric blue": "#7DF9FF", "teal": "#008080", "cyan": "#00BCD4", "turquoise": "#40E0D0",
    "carolina blue": "#4B9CD3", "powder blue": "#B0E0E6", "steel blue": "#4682B4",
    "midnight blue": "#191970", "indigo": "#4B0082", "ice blue": "#AFEEEE",
    # Greens
    "green": "#16A34A", "emerald": "#50C878", "emerald green": "#50C878", "lime": "#84CC16",
    "lime green": "#84CC16", "forest green": "#228B22", "dark green": "#006400", "olive": "#808000",
    "mint": "#98FF98", "sage": "#BCB88A", "neon green": "#39FF14", "kelly green": "#4CBB17",
    "hunter green": "#355E3B", "seafoam green": "#2E8B57",
    # Yellows / Golds
    "yellow": "#EAB308", "gold": "#FACC15", "golden": "#FFD700", "amber": "#FFBF00",
    "mustard": "#FFDB58", "lemon": "#FFF44F", "champagne": "#F7E7CE", "metallic gold": "#D4AF37",
    "golden yellow": "#FFDF00", "neon yellow": "#CCFF00",
    # Oranges
    "orange": "#F97316", "tangerine": "#FF9966", "coral": "#FF7F50", "peach": "#FFCBA4",
    "burnt orange": "#CC5500", "rust": "#B7410E",
    # Purples
    "purple": "#7C3AED", "violet": "#8B5CF6", "lavender": "#E6E6FA", "plum": "#8E4585",
    "magenta": "#FF00FF", "mauve": "#E0B0FF", "grape": "#6F2DA8", "lilac": "#C8A2C8",
    "deep purple": "#4A148C", "royal purple": "#7851A9",
    # Pinks
    "pink": "#EC4899", "hot pink": "#FF69B4", "salmon": "#FA8072", "fuchsia": "#FF00FF",
    "rose": "#FF007F", "blush": "#DE5D83", "neon pink": "#FF1493", "pastel pink": "#FFD1DC",
    # Neutrals
    "black": "#000000", "white": "#FFFFFF", "gray": "#6B7280", "grey": "#6B7280",
    "silver": "#C0C0C0", "charcoal": "#36454F", "slate": "#708090",
    "ivory": "#FFFFF0", "cream": "#FFFDD0", "beige": "#F5F5DC",
    # Browns
    "brown": "#8B4513", "tan": "#D2B48C", "chocolate": "#7B3F00", "coffee": "#6F4E37",
    "copper": "#B87333",
    # Sports-specific
    "lakers purple": "#552583", "lakers gold": "#FDB927", "celtics green": "#007A33",
    "warriors blue": "#1D428A", "warriors gold": "#FFC72C", "bulls red": "#CE1141",
    "heat red": "#98002E", "heat black": "#000000",
    "chelsea blue": "#034694", "barcelona red": "#A50044", "barcelona blue": "#004D98",
    "manchester red": "#DA291C", "manchester blue": "#6CABDD",
    "stealth": "#0F172A", "dark": "#18181B", "noir": "#111111", "shadow": "#1a1a2e",
    "midnight": "#191970", "obsidian": "#0B1215",
}

HEX_TO_NAME = {
    "#DC2626": "Crimson Red", "#DC143C": "Crimson", "#FF2400": "Scarlet", "#800000": "Maroon",
    "#800020": "Burgundy", "#FF0000": "Bright Red", "#8B0000": "Dark Red",
    "#2563EB": "Royal Blue", "#1E3A5F": "Navy Blue", "#001F3F": "Deep Navy",
    "#4169E1": "Royal Blue", "#87CEEB": "Sky Blue", "#89CFF0": "Baby Blue", "#0047AB": "Cobalt",
    "#00BCD4": "Cyan", "#008080": "Teal", "#40E0D0": "Turquoise", "#191970": "Midnight Blue",
    "#16A34A": "Green", "#50C878": "Emerald Green", "#84CC16": "Lime Green", "#228B22": "Forest Green",
    "#006400": "Dark Green", "#39FF14": "Neon Green",
    "#EAB308": "Yellow", "#FACC15": "Championship Gold", "#FFD700": "Gold", "#D4AF37": "Metallic Gold",
    "#F97316": "Orange", "#CC5500": "Burnt Orange", "#FF7F50": "Coral",
    "#7C3AED": "Purple", "#8B5CF6": "Violet", "#4A148C": "Deep Purple",
    "#EC4899": "Pink", "#FF69B4": "Hot Pink", "#FF00FF": "Magenta",
    "#000000": "Stealth Black", "#FFFFFF": "Pure White", "#6B7280": "Slate Gray", "#C0C0C0": "Silver",
    "#D2B48C": "Tan", "#8B4513": "Brown",
    "#0F172A": "Midnight Navy", "#18181B": "Obsidian Black"
}

ROLE_REGEXES = {
    "shortsBaseColor": re.compile(r"\b(?:shorts?|pants?|bottoms?)\b"),
    "tertiaryColor": re.compile(r"\b(?:trim|trimming|tertiary|outline|border|details?|collar|cuff|cuffs|piping)\b"),
    "accentColor": re.compile(r"\b(?:accents?|secondary|stripes?|highlights?|swoosh)\b"),
    "baseColor": re.compile(r"\b(?:base|main|primary|body|background)\b")
}

def get_color_display_name(hex_code: str) -> str:
    if not hex_code:
        return "Custom"
    return HEX_TO_NAME.get(hex_code.strip().upper(), hex_code.strip().upper())

def resolve_color_name(text: str) -> Optional[str]:
    """Resolves a color name from user text to an exact hex code using strict word boundaries."""
    t = text.lower().strip()
    if t in COLOR_HEX_MAP:
        return COLOR_HEX_MAP[t]
    for name in sorted(COLOR_HEX_MAP.keys(), key=len, reverse=True):
        if re.search(r'\b' + re.escape(name) + r'\b', t):
            return COLOR_HEX_MAP[name]
    return None

def extract_color_intent(user_prompt: str) -> dict:
    """Extracts explicit color requests from user text with 100% precision using clause and token adjacency parsing."""
    p = user_prompt.lower()
    result = {}

    if re.search(r'\b(?:match|matching)\s+(?:the\s+)?(?:shorts?|pants?)\b|\b(?:shorts?|pants?)\s+match\b', p):
        result["matchJerseyColors"] = True

    clauses = re.split(r'[,;]|\b(?:with|and|&|\+|but)\b', p)
    sorted_names = sorted(COLOR_HEX_MAP.keys(), key=len, reverse=True)
    unassigned = []

    for clause in clauses:
        c = clause.strip()
        if not c:
            continue

        tokens = []
        occupied = []
        for h in re.finditer(r'#(?:[0-9a-fA-F]{3}){1,2}\b', c):
            raw_h = h.group(0).upper()
            if len(raw_h) == 4:
                raw_h = f"#{raw_h[1]*2}{raw_h[2]*2}{raw_h[3]*2}"
            occupied.append(h.span())
            tokens.append((h.start(), h.end(), "COLOR", raw_h))

        for name in sorted_names:
            for m in re.finditer(r'\b' + re.escape(name) + r'\b', c):
                start, end = m.span()
                if not any(s <= start < e or s < end <= e for s, e in occupied):
                    occupied.append((start, end))
                    tokens.append((start, end, "COLOR", COLOR_HEX_MAP[name]))

        for role, rx in ROLE_REGEXES.items():
            for m in rx.finditer(c):
                tokens.append((m.start(), m.end(), "ROLE", role))

        # Check special case 'jersey' when another clause mentions shorts
        if any(re.search(r'\bshorts?\b', other) for other in clauses):
            for m in re.finditer(r'\bjersey\b', c):
                tokens.append((m.start(), m.end(), "ROLE", "baseColor"))

        if not any(t[2] == "COLOR" for t in tokens):
            continue

        tokens.sort(key=lambda x: x[0])

        c_indices = [idx for idx, t in enumerate(tokens) if t[2] == "COLOR"]
        r_indices = [idx for idx, t in enumerate(tokens) if t[2] == "ROLE"]

        if not r_indices:
            for idx in c_indices:
                unassigned.append(tokens[idx][3])
        elif len(c_indices) == 1 and len(r_indices) >= 1:
            color_hex = tokens[c_indices[0]][3]
            c_pos = (tokens[c_indices[0]][0] + tokens[c_indices[0]][1]) / 2.0
            r_indices.sort(key=lambda idx: abs(((tokens[idx][0] + tokens[idx][1]) / 2.0) - c_pos))
            chosen_role = tokens[r_indices[0]][3]
            result[chosen_role] = color_hex
            if chosen_role == "shortsBaseColor":
                result["matchJerseyColors"] = False
        else:
            claimed_roles = set()
            for idx in c_indices:
                color_hex = tokens[idx][3]
                adjacent_roles = []
                if idx > 0 and tokens[idx-1][2] == "ROLE" and tokens[idx-1][3] not in claimed_roles:
                    adjacent_roles.append(tokens[idx-1])
                if idx < len(tokens) - 1 and tokens[idx+1][2] == "ROLE" and tokens[idx+1][3] not in claimed_roles:
                    adjacent_roles.append(tokens[idx+1])

                if adjacent_roles:
                    chosen_role = adjacent_roles[0][3]
                    claimed_roles.add(chosen_role)
                    result[chosen_role] = color_hex
                    if chosen_role == "shortsBaseColor":
                        result["matchJerseyColors"] = False
                else:
                    unassigned.append(color_hex)

    for color_hex in unassigned:
        if "baseColor" not in result:
            result["baseColor"] = color_hex
        elif "accentColor" not in result:
            result["accentColor"] = color_hex
        elif "tertiaryColor" not in result:
            result["tertiaryColor"] = color_hex

    return result

SYSTEM_DESIGN_PROMPT = f"""You are an elite, interactive 3D sports jersey art director and conversational design co-pilot.
Your mission is to analyze the user's conversational prompt (which may be a team theme, color request, pattern request, or targeted incremental tweak like 'rename player as drew' or 'change number to 10') and return a validated 3D uniform configuration along with a friendly, conversational confirmation response.

COMMAND EXECUTION RULES:
1. OBEY ALL COLOR COMMANDS WITH EXACT HEX CODES:
   Use these EXACT hex values for named colors:
   - "red" / "crimson" -> "#DC2626",  "scarlet" -> "#FF2400",  "maroon" -> "#800000"
   - "blue" -> "#2563EB",  "navy" / "navy blue" -> "#1E3A5F",  "royal blue" -> "#4169E1"
   - "sky blue" -> "#87CEEB",  "cobalt" -> "#0047AB",  "teal" -> "#008080",  "cyan" -> "#00BCD4"
   - "green" -> "#16A34A",  "emerald" -> "#50C878",  "lime" -> "#84CC16",  "forest green" -> "#228B22"
   - "yellow" -> "#EAB308",  "gold" / "golden" -> "#FACC15",  "amber" -> "#FFBF00"
   - "orange" -> "#F97316",  "coral" -> "#FF7F50",  "burnt orange" -> "#CC5500"
   - "purple" / "violet" -> "#7C3AED",  "deep purple" -> "#4A148C",  "magenta" -> "#FF00FF"
   - "pink" -> "#EC4899",  "hot pink" -> "#FF69B4",  "rose" -> "#FF007F"
   - "black" / "stealth" / "dark" -> "#000000",  "white" / "clean" -> "#FFFFFF"
   - "gray" / "grey" -> "#6B7280",  "silver" -> "#C0C0C0",  "charcoal" -> "#36454F"
   - When user says "make it [COLOR]", change baseColor to that exact hex.
   - When user says "[COLOR] and [COLOR]", set baseColor to the first and accentColor to the second.
   - When user says "accent [COLOR]" or "[COLOR] accents", only change accentColor.
   - When user says "trim [COLOR]" or "[COLOR] trim", only change tertiaryColor.
2. OBEY ALL PATTERN & STYLE COMMANDS:
   - When user asks for "another pattern", "different pattern", "random pattern", "change pattern", or "another design pattern", select a fresh, contrasting pattern different from CURRENT JERSEY CONFIGURATION.
   - Lightning/electric -> "thunderstorm".
   - Gaming/esports -> "apex_gamer" or "cyber_grid".
   - Stripes -> "stripes".
   - Plain/minimal/solid -> "none".
   - Honeycomb / hex -> "param_hex_32_2".
   - Stars -> "param_stars_25_24".
   - Rings / circles -> "param_rings_25_36".
   - Chevrons -> "param_chevrons_40_4_up".
   - Waves / ocean -> "tidal_wave".
3. PLAYER BACK NAME & TEAM NAME RULES:
   - If user asks to rename or change player name (e.g. "rename player as drew", "player name drew", "name on back jordan"), set backName to that uppercase string (Max 12 chars).
   - If user specifies a team name, set teamName (Max 12 chars).
   - Otherwise PRESERVE the existing backName and teamName from CURRENT JERSEY CONFIGURATION.
4. SHORTS RULES:
   - If user asks to match shorts, set matchJerseyColors to true.
   - If user asks for custom shorts color, set shortsBaseColor accordingly and matchJerseyColors to false.
5. CONVERSATIONAL ASSISTANT CONFIRMATION (assistantReply):
   - Always formulate a concise, encouraging validation reply explaining what was changed and what was preserved (e.g., "Updated player name to DREW on the back! Kept your royal blue stripes kit intact.").
   - When user asks about colors, ALWAYS mention the exact hex code you applied in your reply.
   - When changing patterns, confirm the pattern name.
6. STRICT DELTA PRESERVATION:
   - If the user is asking to modify or tweak specific features, PRESERVE all existing attributes from CURRENT JERSEY CONFIGURATION that were NOT asked to change. Never reset unrelated properties.
   - If the user says "change color to X", ONLY change the color. DO NOT change pattern, logo, font, number, name, etc.
   - If the current uniform has a procedural pattern like 'param_rings_25_36', PRESERVE it when tweaking colors or names unless asked to change pattern.
7. STRICT SCHEMA CONSTRAINTS:
   - pattern MUST be one of standard options {json.dumps(ALLOWED_PATTERNS)} or a valid procedural pattern string starting with 'param_' (e.g. 'param_rings_25_36', 'param_stars_25_24', 'param_hex_32_2').
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

    # Aggressive color accuracy: extract explicit colors (hex codes and named colors) from user prompt
    color_intent = extract_color_intent(user_prompt)
    if "baseColor" in color_intent:
        design["baseColor"] = color_intent["baseColor"]
    if "accentColor" in color_intent:
        design["accentColor"] = color_intent["accentColor"]
    if "tertiaryColor" in color_intent:
        design["tertiaryColor"] = color_intent["tertiaryColor"]
    if "shortsBaseColor" in color_intent:
        design["shortsBaseColor"] = color_intent["shortsBaseColor"]
        design["matchJerseyColors"] = False

    # Pattern intent: semantic pattern keywords or random/another pattern request
    pattern_explicitly_changed = False
    for kw, target_pat in sorted(SEMANTIC_PATTERN_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if re.search(r'\b' + re.escape(kw) + r'\b', p_lower):
            design["pattern"] = target_pat
            pattern_explicitly_changed = True
            break

    is_cycle_pattern = bool(re.search(r'\b(?:another|different|next|random|new|switch|cycle|change)\s+(?:jersey\s+)?(?:design\s+)?patterns?\b|\bpatterns?\s+(?:random|another|different|next|change)\b|\b(?:pick|choose|surprise\s+me\s+with)\s+(?:a\s+)?patterns?\b|\b(?:another|new)\s+design\b', p_lower))
    if not pattern_explicitly_changed and is_cycle_pattern:
        curr_pat = cd.get("pattern")
        available = [pt for pt in POPULAR_PATTERNS if pt != curr_pat]
        design["pattern"] = random.choice(available) if available else "stripes"
        pattern_explicitly_changed = True

    if not is_valid_pattern(design.get("pattern")):
        design["pattern"] = cd.get("pattern") if is_valid_pattern(cd.get("pattern")) else "stripes"
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

    if not design.get("assistantReply") or "baseColor" in applied_changes or "accentColor" in applied_changes or "shortsBaseColor" in applied_changes:
        base_name = get_color_display_name(design.get("baseColor"))
        accent_name = get_color_display_name(design.get("accentColor"))
        if "backName" in applied_changes and not ("baseColor" in applied_changes or "accentColor" in applied_changes):
            design["assistantReply"] = f"Player name updated to '{design['backName']}' on the back! Kept your current kit colors and styling intact."
        elif "baseColor" in applied_changes and "accentColor" in applied_changes:
            if "shortsBaseColor" in applied_changes and not design.get("matchJerseyColors", True):
                shorts_name = get_color_display_name(design.get("shortsBaseColor"))
                design["assistantReply"] = f"Updated kit colors: {base_name} ({design.get('baseColor')}) base with {accent_name} ({design.get('accentColor')}) accents and {shorts_name} shorts!"
            else:
                design["assistantReply"] = f"Updated kit colors to {base_name} ({design.get('baseColor')}) with {accent_name} ({design.get('accentColor')}) accents!"
        elif "baseColor" in applied_changes:
            if "shortsBaseColor" in applied_changes and not design.get("matchJerseyColors", True):
                shorts_name = get_color_display_name(design.get("shortsBaseColor"))
                design["assistantReply"] = f"Changed jersey color to {base_name} ({design.get('baseColor')}) with {shorts_name} shorts!"
            else:
                design["assistantReply"] = f"Changed jersey color to {base_name} ({design.get('baseColor')})!"
        elif "accentColor" in applied_changes:
            design["assistantReply"] = f"Updated accent color to {accent_name} ({design.get('accentColor')})!"
        elif "shortsBaseColor" in applied_changes:
            shorts_name = get_color_display_name(design.get("shortsBaseColor"))
            design["assistantReply"] = f"Updated shorts color to {shorts_name} ({design.get('shortsBaseColor')})!"
        elif "pattern" in applied_changes:
            pat_name = get_pattern_display_name(design.get("pattern"))
            design["assistantReply"] = f"Switched jersey pattern to {pat_name}!"
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

        # Accurate color extraction:
        color_intent = extract_color_intent(user_prompt)
        if "baseColor" in color_intent:
            base = color_intent["baseColor"]
            applied.append("baseColor")
        if "accentColor" in color_intent:
            accent = color_intent["accentColor"]
            applied.append("accentColor")
        if "tertiaryColor" in color_intent:
            tert = color_intent["tertiaryColor"]
            applied.append("tertiaryColor")
        if "shortsBaseColor" in color_intent:
            shorts_base = color_intent["shortsBaseColor"]
            match_shorts = color_intent.get("matchJerseyColors", False)
            applied.append("shortsBaseColor")
        elif match_shorts and "baseColor" in color_intent:
            shorts_base = base
            shorts_accent = accent

        # Pattern tweaks:
        pattern_tweaked = False
        for kw, target_pat in sorted(SEMANTIC_PATTERN_MAP.items(), key=lambda x: len(x[0]), reverse=True):
            if re.search(r'\b' + re.escape(kw) + r'\b', p):
                pat = target_pat
                applied.append("pattern")
                pattern_tweaked = True
                break

        is_cycle_pattern = bool(re.search(r'\b(?:another|different|next|random|new|switch|cycle|change)\s+(?:jersey\s+)?(?:design\s+)?patterns?\b|\bpatterns?\s+(?:random|another|different|next|change)\b|\b(?:pick|choose|surprise\s+me\s+with)\s+(?:a\s+)?patterns?\b|\b(?:another|new)\s+design\b', p))
        if not pattern_tweaked and is_cycle_pattern:
            available = [pt for pt in POPULAR_PATTERNS if pt != pat]
            pat = random.choice(available) if available else "stripes"
            applied.append("pattern")
            pattern_tweaked = True

        # Shorts tweaks:
        if "match shorts" in p or "match" in p and "shorts" in p:
            match_shorts = True
            shorts_base = base
            shorts_accent = accent
            applied.append("matchJerseyColors")
        elif match_shorts and "baseColor" in color_intent:
            shorts_base = base
            shorts_accent = accent

        if not assistant_reply:
            if "baseColor" in applied or "accentColor" in applied or "shortsBaseColor" in applied:
                base_name = get_color_display_name(base)
                accent_name = get_color_display_name(accent)
                if "baseColor" in applied and "accentColor" in applied:
                    if "shortsBaseColor" in applied and not match_shorts:
                        shorts_name = get_color_display_name(shorts_base)
                        assistant_reply = f"Updated kit colors: {base_name} ({base}) base with {accent_name} ({accent}) accents and {shorts_name} shorts!"
                    else:
                        assistant_reply = f"Updated kit colors to {base_name} ({base}) with {accent_name} ({accent}) accents!"
                elif "baseColor" in applied:
                    if "shortsBaseColor" in applied and not match_shorts:
                        shorts_name = get_color_display_name(shorts_base)
                        assistant_reply = f"Changed jersey color to {base_name} ({base}) with {shorts_name} shorts!"
                    else:
                        assistant_reply = f"Changed jersey color to {base_name} ({base})!"
                elif "accentColor" in applied:
                    assistant_reply = f"Updated accent color to {accent_name} ({accent})!"
                elif "shortsBaseColor" in applied:
                    shorts_name = get_color_display_name(shorts_base)
                    assistant_reply = f"Updated shorts color to {shorts_name} ({shorts_base})!"
            elif "pattern" in applied:
                pat_name = get_pattern_display_name(pat)
                assistant_reply = f"Switched jersey pattern to {pat_name}!"
            elif applied:
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
    color_intent = extract_color_intent(user_prompt)
    if color_intent and ("baseColor" in color_intent or "accentColor" in color_intent):
        base = color_intent.get("baseColor", "#0284C7")
        accent = color_intent.get("accentColor", "#FFFFFF" if base != "#FFFFFF" else "#000000")
        tert = color_intent.get("tertiaryColor", "#0F172A")

        pat = "none"
        for kw, target_pat in sorted(SEMANTIC_PATTERN_MAP.items(), key=lambda x: len(x[0]), reverse=True):
            if re.search(r'\b' + re.escape(kw) + r'\b', p):
                pat = target_pat
                break
        if pat == "none":
            pat = random.choice(["stripes", "gradient", "panel", "diagonal", "param_hex_32_2", "param_stars_25_24"])

        base_name = get_color_display_name(base)
        accent_name = get_color_display_name(accent)
        clean_name = re.sub(r"[^a-zA-Z0-9\s]", "", user_prompt).strip().upper()
        return {
            "gender": fallback_gender,
            "baseColor": base,
            "accentColor": accent,
            "tertiaryColor": tert,
            "pattern": pat,
            "logo": "shield" if "shield" in p else ("vortex" if "vortex" in p else "star"),
            "font": "athletic",
            "finish": "satin",
            "showroom": "stadium",
            "teamName": clean_name[:10] if clean_name and len(clean_name) <= 10 else "TITANS",
            "backName": "PLAYER",
            "number": "23",
            "sponsorText": "ORBIT",
            "matchJerseyColors": color_intent.get("matchJerseyColors", True),
            "shortsBaseColor": color_intent.get("shortsBaseColor", base),
            "shortsAccentColor": accent,
            "assistantReply": f"Generated custom uniform in {base_name} ({base}) with {accent_name} ({accent}) accents!",
            "appliedChanges": ["baseColor", "accentColor", "pattern"],
            "reasoning": f"Formulated kit with {base_name} and {accent_name}."
        }
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


async def call_openai_compatible(
    user_prompt: str,
    base_url: str,
    api_key: str,
    model: str = "auto",
    current_design: Optional[dict] = None,
    history: Optional[list] = None
) -> Tuple[Optional[dict], Optional[str]]:
    """
    Calls FreeLLMAPI gateway or any OpenAI-compatible provider (Groq, Cerebras, OpenRouter, Ollama).
    Uses standard OpenAI Chat Completions payload with json_object response format.
    """
    system_prompt = f"{SYSTEM_DESIGN_PROMPT}\n\nStrictly return ONLY a valid JSON object matching the design schema."
    messages = [{"role": "system", "content": system_prompt}]
    
    # Include recent conversational history
    if history:
        for turn in history[-6:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})
                
    user_content = f"CURRENT UNIFORM CONFIGURATION: {json.dumps(current_design or {})}\nUSER REQUEST / COMMAND: \"{user_prompt}\""
    messages.append({"role": "user", "content": user_content})

    headers = {
        "Content-Type": "application/json"
    }
    if api_key and api_key.strip():
        headers["Authorization"] = f"Bearer {api_key.strip()}"

    payload = {
        "model": model or "auto",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 400,
        "response_format": {"type": "json_object"}
    }

    url = f"{base_url.rstrip('/')}/chat/completions"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=6.0)
            if response.status_code == 200:
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed = clean_json_response(raw_text)
                return sanitize_design(parsed, user_prompt, current_design), None
            else:
                return None, f"OpenAI/FreeLLMAPI error ({response.status_code}): {response.text[:120]}"
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as net_err:
        return None, f"Network connection unavailable to {base_url}: {net_err}"
    except Exception as ex:
        return None, f"OpenAI-compatible request error: {ex}"


async def get_jersey_suggestion(user_prompt: str, current_design: Optional[dict] = None, history: Optional[list] = None):
    """
    High-Speed Multi-Provider Generator Endpoint:
    1. Checks Redis cache for fresh exact prompt queries.
    2. FreeLLMAPI Gateway / OpenAI-Compatible endpoint (Groq, Cerebras, OpenRouter, Llama 3.3).
    3. Direct Groq Free Tier (Llama 3.3 70B ultra fast).
    4. Google Gemini Flash (structured outputs).
    5. Claude Haiku.
    6. Instant Context-Aware Smart Rules Engine (sub-millisecond local fallback).
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

    # 1. Check FreeLLMAPI Gateway or configured OpenAI-Compatible endpoint
    if OPENAI_API_KEY and OPENAI_API_KEY.strip() and not OPENAI_API_KEY.startswith("your_"):
        try:
            result, err = await call_openai_compatible(
                cleaned_prompt,
                base_url=OPENAI_API_BASE,
                api_key=OPENAI_API_KEY.strip(),
                model=OPENAI_MODEL,
                current_design=current_design,
                history=history
            )
            if result:
                if use_cache and is_redis_available():
                    try:
                        redis_client.setex(cache_key, 3600, json.dumps(result))
                    except Exception:
                        pass
                return result, None
            print(f"[AI Service Info] OpenAI/FreeLLMAPI fallback: {err}")
        except Exception as ex:
            print(f"[AI Service Info] OpenAI/FreeLLMAPI exception: {ex}")

    # 2. Check Direct Groq Free Tier (Llama 3.3 70B)
    if GROQ_API_KEY and GROQ_API_KEY.strip() and not GROQ_API_KEY.startswith("your_"):
        try:
            result, err = await call_openai_compatible(
                cleaned_prompt,
                base_url="https://api.groq.com/openai/v1",
                api_key=GROQ_API_KEY.strip(),
                model="llama-3.3-70b-versatile",
                current_design=current_design,
                history=history
            )
            if result:
                if use_cache and is_redis_available():
                    try:
                        redis_client.setex(cache_key, 3600, json.dumps(result))
                    except Exception:
                        pass
                return result, None
            print(f"[AI Service Info] Groq fallback: {err}")
        except Exception as ex:
            print(f"[AI Service Info] Groq exception: {ex}")

    # 3. Check Google Gemini Flash
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

    # 4. Check Claude Haiku
    if CLAUDE_API_KEY and CLAUDE_API_KEY.strip() and not CLAUDE_API_KEY.startswith("your_"):
        try:
            result, err = await call_claude(cleaned_prompt, CLAUDE_API_KEY.strip(), current_design, history)
            if result:
                return result, None
        except Exception:
            pass

    # 5. Local instant Smart Fallback Engine
    fallback = generate_smart_fallback(cleaned_prompt, current_design)
    if use_cache and is_redis_available():
        try:
            redis_client.setex(cache_key, 3600, json.dumps(fallback))
        except Exception:
            pass
    return fallback, None