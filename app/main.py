from fastapi import FastAPI, Request, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session
from app.core.database import engine, Base, ensure_order_shipping_columns, get_db
from app.models.models import User
from app.routers import auth, notifications, orders, ai, payments, geo, admin_staff
from app.core.config import ALLOWED_ORIGINS, ENV, SECRET_KEY, ALGORITHM
from jose import jwt
import os

try:
    Base.metadata.create_all(bind=engine)
    ensure_order_shipping_columns()
    from app.core.database import SessionLocal
    from app.services.user_service import ensure_default_admin, ensure_dev_accounts
    with SessionLocal() as db_session:
        ensure_default_admin(db_session)
        ensure_dev_accounts(db_session)
except Exception as e:
    print(f"Table sync / admin bootstrap delayed: {e}", flush=True)

app = FastAPI(
    title="Modelyx API",
    description="AI-Powered Jersey Design Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# API routers
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(ai.router)
app.include_router(payments.router)
app.include_router(notifications.router)
app.include_router(geo.router)
app.include_router(admin_staff.router)
@app.get("/api")
def root():
    return {
        "message": "Modelyx API is running",
        "env": ENV,
        "version": "1.0.0"
    }

from pydantic import BaseModel
class LogPayload(BaseModel):
    type: str = "log"
    message: str = ""

@app.post("/api/log")
def log_client_message(payload: LogPayload):
    print(f"[CLIENT {payload.type.upper()}] {payload.message}", flush=True)
    return {"status": "ok"}

# Paths
base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../'))
static_path = os.path.join(base_path, "static")
templates_path = os.path.join(base_path, "templates")

# Static files
app.mount("/static", StaticFiles(directory=static_path), name="static")

# HTML pages
@app.get("/")
def index():
    return FileResponse(os.path.join(templates_path, "index.html"))

@app.get("/settings.html")
@app.get("/settings")
def serve_settings_page(request: Request, db: Session = Depends(get_db)):
    file_path = os.path.join(templates_path, "settings.html")
    if not os.path.exists(file_path):
        return FileResponse(os.path.join(templates_path, "index.html"))

    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif request.query_params.get("token"):
        token = request.query_params.get("token")
    elif "modelyx_token" in request.cookies:
        token = request.cookies.get("modelyx_token")

    user = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = int(payload.get("sub")) if payload.get("sub") and str(payload.get("sub")).isdigit() else None
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
        except Exception:
            user = None

    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()

    if user:
        safe_name = (user.name or "").replace('"', '&quot;')
        safe_email = (user.email or "").replace('"', '&quot;')
        safe_phone = (user.phone or "").replace('"', '&quot;')
        safe_addr = (user.address or "").replace('"', '&quot;')
        safe_city = (user.city or "").replace('"', '&quot;')
        safe_state = (user.state or "").replace('"', '&quot;')
        safe_zip = (user.zip_code or "").replace('"', '&quot;')
        safe_country = (user.country or "Philippines").replace('"', '&quot;')

        html = html.replace('id="name" name="name"', f'id="name" name="name" value="{safe_name}"')
        html = html.replace('id="email" name="email"', f'id="email" name="email" value="{safe_email}" readonly')
        if safe_phone:
            html = html.replace('id="phone" name="phone"', f'id="phone" name="phone" value="{safe_phone}"')
        if safe_addr:
            html = html.replace('id="address" name="address"', f'id="address" name="address" value="{safe_addr}"')
        if safe_city:
            html = html.replace('id="city" name="city"', f'id="city" name="city" value="{safe_city}"')
        if safe_state:
            html = html.replace('id="state" name="state"', f'id="state" name="state" value="{safe_state}"')
        if safe_zip:
            html = html.replace('id="zip" name="zip"', f'id="zip" name="zip" value="{safe_zip}"')
        if safe_country:
            html = html.replace('id="country" name="country"', f'id="country" name="country" value="{safe_country}"')

        has_shipping = "1" if (user.address and user.city) else "0"
        init_script = f"""<script>try{{localStorage.setItem('modelyx_token','{token}');localStorage.setItem('modelyx_user_role','{user.role}');localStorage.setItem('modelyx_user_name','{safe_name}');localStorage.setItem('modelyx_user_email','{safe_email}');localStorage.setItem('modelyx_shipping_setup','{has_shipping}');}}catch(e){{}}</script>"""
        html = html.replace("</head>", f"{init_script}\n</head>")

    response = HTMLResponse(content=html, status_code=200, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    if user and token:
        has_shipping = "1" if (user.address and user.city) else "0"
        response.set_cookie(key="modelyx_token", value=token, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_role", value=user.role, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_name", value=user.name, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_email", value=user.email, httponly=False, max_age=86400 * 7, path="/")
        response.set_cookie(key="modelyx_shipping_setup", value=has_shipping, httponly=False, max_age=86400 * 7, path="/")
    return response

@app.get("/{page}.html")
def serve_page(page: str):
    file_path = os.path.join(templates_path, f"{page}.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(templates_path, "index.html"))

@app.get("/{page}")
def serve_page_no_ext(page: str):
    file_path = os.path.join(templates_path, f"{page}.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(templates_path, "index.html"))




@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    favicon_path = os.path.join(static_path, "favicon.ico")

    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")

    return Response(status_code=204)
