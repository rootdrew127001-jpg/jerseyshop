import httpx
from urllib.parse import urlencode
from app.core.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

async def get_google_auth_url(redirect_uri: str = None) -> str:
    chosen_uri = redirect_uri or GOOGLE_REDIRECT_URI
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": chosen_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account consent",
        "include_granted_scopes": "true"
    }
    query = urlencode(params)
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

async def exchange_code_for_token(code: str, redirect_uri: str = None) -> dict:
    chosen_uri = redirect_uri or GOOGLE_REDIRECT_URI
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": chosen_uri,
                "grant_type": "authorization_code"
            }
        )
        return res.json()

async def get_google_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        return res.json()