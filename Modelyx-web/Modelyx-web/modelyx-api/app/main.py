from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.database import engine, Base
from app.routers import auth, orders, ai
from app.core.config import ALLOWED_ORIGINS, ENV
import os

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


app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(ai.router)

@app.get("/api")
def root():
    return {
        "message": "Modelyx API is running",
        "env": ENV,
        "version": "1.0.0"
    }


frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))

app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")


@app.get("/styles.css")
def styles():
    return FileResponse(os.path.join(frontend_path, "styles.css"))

@app.get("/sw.js")
def sw():
    return FileResponse(os.path.join(frontend_path, "sw.js"))

@app.get("/utils.js")
def utils():
    return FileResponse(os.path.join(frontend_path, "utils.js"))

@app.get("/manifest.json")
def manifest():
    return FileResponse(os.path.join(frontend_path, "manifest.json"))


@app.get("/")
def index():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/{page}.html")
def serve_page(page: str):
    file_path = os.path.join(frontend_path, f"{page}.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(frontend_path, "index.html"))