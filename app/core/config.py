from dotenv import load_dotenv
import os

IS_DOCKER = os.path.exists("/.dockerenv") or os.environ.get("DB_HOST") == "db" or os.path.isdir("/app/app")

def load_env_files():
    saved_db_host = os.environ.get("DB_HOST")
    saved_redis_host = os.environ.get("REDIS_HOST")
    saved_openai_base = os.environ.get("OPENAI_API_BASE")

    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_env = os.path.join(app_dir, ".env")
    root_env = os.path.abspath(os.path.join(app_dir, "../.env"))
    for p in [root_env, app_env]:
        if os.path.exists(p):
            load_dotenv(p, override=True)
    load_dotenv(override=True)

    if IS_DOCKER or saved_db_host == "db":
        os.environ["DB_HOST"] = "db"
    elif saved_db_host:
        os.environ["DB_HOST"] = saved_db_host

    if IS_DOCKER or saved_redis_host == "redis":
        os.environ["REDIS_HOST"] = "redis"
    elif saved_redis_host:
        os.environ["REDIS_HOST"] = saved_redis_host

    if IS_DOCKER or (saved_openai_base and "freellmapi" in saved_openai_base):
        os.environ["OPENAI_API_BASE"] = "http://freellmapi:3001/v1"

load_env_files()

DB_HOST = "db" if IS_DOCKER else os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "jersey")

REDIS_HOST = "redis" if IS_DOCKER else os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None) or None
REDIS_DB = int(os.getenv("REDIS_DB", 0))

SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_BASE = "http://freellmapi:3001/v1" if IS_DOCKER else os.getenv("OPENAI_API_BASE", "http://localhost:3001/v1")
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
    load_env_files()
    accounts = []
    gmail_user = os.getenv("GMAIL_USER", "").strip()
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "").strip()
    gmail_raw = os.getenv("GMAIL_ACCOUNTS", "").strip()

    if gmail_raw:
        raw_entries = gmail_raw.replace("\n", ",").split(",")
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

    if gmail_user and gmail_pass:
        if not any(a["user"].lower() == gmail_user.lower() for a in accounts):
            accounts.insert(0, {"user": gmail_user, "password": gmail_pass})

    for i in range(2, 20):
        u = os.getenv(f"GMAIL_USER_{i}", "").strip()
        p = os.getenv(f"GMAIL_APP_PASSWORD_{i}", "").strip()
        if u and p and not any(a["user"].lower() == u.lower() for a in accounts):
            accounts.append({"user": u, "password": p})

    return accounts

GMAIL_ACCOUNTS = parse_gmail_accounts()

def get_all_admin_accounts() -> list[dict]:
    load_env_files()
    admin_accounts = []
    admin_email_env = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_pass_env = os.getenv("ADMIN_PASSWORD", "").strip()

    if admin_email_env:
        admin_accounts.append({
            "email": admin_email_env,
            "passwords": [p for p in [admin_pass_env] if p],
            "name": "Store Administrator"
        })

    def_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@modelyx.com").strip().lower()
    def_pass = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123").strip()
    if def_email and not any(a["email"] == def_email for a in admin_accounts):
        admin_accounts.append({
            "email": def_email,
            "passwords": [def_pass],
            "name": "Default Administrator"
        })

    gmail_pool = parse_gmail_accounts()
    for g in gmail_pool:
        u = g.get("user", "").strip().lower()
        p = g.get("password", "").strip()
        if not u:
            continue
        existing = next((a for a in admin_accounts if a["email"] == u), None)
        if existing:
            if p and p not in existing["passwords"]:
                existing["passwords"].append(p)
        else:
            admin_accounts.append({
                "email": u,
                "passwords": [p] if p else [],
                "name": u.split("@")[0].capitalize() + " (Admin)"
            })

    if admin_pass_env:
        for a in admin_accounts:
            if admin_pass_env not in a["passwords"]:
                a["passwords"].append(admin_pass_env)

    return admin_accounts

def is_admin_email(email: str) -> bool:
    if not email:
        return False
    email_clean = email.strip().lower()
    return any(a["email"] == email_clean for a in get_all_admin_accounts())

def is_dev_mode() -> bool:
    load_env_files()
    return os.getenv("DEV_MODE", "false").strip().lower() in ("true", "1", "yes")

class _DevModeProxy:
    def __bool__(self):
        return is_dev_mode()
    def __repr__(self):
        return str(is_dev_mode())
    def __str__(self):
        return str(is_dev_mode())
    def __eq__(self, other):
        return is_dev_mode() == bool(other)

DEV_MODE = _DevModeProxy()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:9100/auth/google/callback")
