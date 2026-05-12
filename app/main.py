from urllib import response

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.database import engine, Base
from app.routers import auth, notifications, orders, ai, payments
from app.core.config import ALLOWED_ORIGINS, ENV
import os
from fastapi import Response

Base.metadata.create_all(bind=engine)

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

# API routers
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(ai.router)
app.include_router(payments.router)
app.include_router(notifications.router)
@app.get("/api")
def root():
    return {
        "message": "Modelyx API is running",
        "env": ENV,
        "version": "1.0.0"
    }

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

@app.get("/{page}.html")
def serve_page(page: str):
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