import httpx
import json
from app.core.config import CLAUDE_API_KEY

async def get_jersey_suggestion(team_name: str):
    prompt = f"""You are a professional sports jersey designer.
Generate a creative jersey design for a team called "{team_name}".
Respond ONLY with a valid JSON object, no markdown, no backticks, no extra text.
Use this exact structure:
{{"baseColor":"#hexcode","accentColor":"#hexcode","pattern":"none","teamName":"SHORTNAME","number":"23","reasoning":"one sentence"}}
Pattern must be one of: none, stripes, diagonal, panel, gradient"""

    headers = {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
    }

    body = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 300,
        "messages": [{"role": "user", "content": prompt}]
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=body,
            timeout=30.0
        )

    if response.status_code != 200:
        return None, f"Claude API error: {response.text}"

    data = response.json()
    text = data["content"][0]["text"].strip()
    parsed = json.loads(text)
    return parsed, None