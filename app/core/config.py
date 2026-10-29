from dotenv import load_dotenv
import os

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "jersey")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None) or None
REDIS_DB = int(os.getenv("REDIS_DB", 0))

SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "http://localhost:3001/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "auto")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")
ENV = os.getenv("ENV", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5500").split(",")


PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")


GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
GMAIL_ACCOUNTS_RAW = os.getenv("GMAIL_ACCOUNTS", "")

def parse_gmail_accounts() -> list[dict[str, str]]:
    accounts = []
    if GMAIL_ACCOUNTS_RAW:
        raw_entries = GMAIL_ACCOUNTS_RAW.replace("\n", ",").split(",")
        for entry in raw_entries:
            entry = entry.strip()
            if not entry:
                continue
            if ":" in entry:
                parts = entry.split(":", 1)
                u = parts[0].strip()
                p = parts[1].strip()
                if u and p and not any(a["user"].lower() == u.lower() for a in accounts):
                    accounts.append({"user": u, "password": p})

    if GMAIL_USER and GMAIL_APP_PASSWORD:
        if not any(a["user"].lower() == GMAIL_USER.lower() for a in accounts):
            accounts.insert(0, {"user": GMAIL_USER, "password": GMAIL_APP_PASSWORD})

    for i in range(2, 20):
        u = os.getenv(f"GMAIL_USER_{i}", "").strip()
        p = os.getenv(f"GMAIL_APP_PASSWORD_{i}", "").strip()
        if u and p and not any(a["user"].lower() == u.lower() for a in accounts):
            accounts.append({"user": u, "password": p})

    return accounts

GMAIL_ACCOUNTS = parse_gmail_accounts()
DEV_MODE = os.getenv("DEV_MODE", "true").lower() in ("true", "1", "yes")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:9100/auth/google/callback")
