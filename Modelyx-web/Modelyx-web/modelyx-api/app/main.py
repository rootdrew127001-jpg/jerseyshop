from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.routers import auth, orders, ai
from app.core.config import ALLOWED_ORIGINS, ENV

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

@app.get("/")
def root():
    return {
        "message": "Modelyx API is running",
        "env": ENV,
        "version": "1.0.0"
    }