import time
import socket
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

logger = logging.getLogger(__name__)

def test_tcp_connection(host: str, port: int, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, int(port)), timeout=timeout):
            return True
    except Exception:
        return False

def resolve_active_db_host() -> str:
    candidates = []
    if DB_HOST:
        candidates.append(DB_HOST)
    for h in ["db", "127.0.0.1", "localhost"]:
        if h not in candidates:
            candidates.append(h)

    for host in candidates:
        if test_tcp_connection(host, int(DB_PORT)):
            logger.info(f"[DB RESILIENCE] Active MySQL server verified at {host}:{DB_PORT}")
            return host

    return DB_HOST or "db"

ACTIVE_DB_HOST = resolve_active_db_host()

def create_database_if_not_exists(max_retries: int = 15, delay: float = 1.0):
    global ACTIVE_DB_HOST
    for attempt in range(1, max_retries + 1):
        try:
            ACTIVE_DB_HOST = resolve_active_db_host()
            engine_root = create_engine(
                f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{ACTIVE_DB_HOST}:{DB_PORT}",
                echo=False,
                pool_pre_ping=True
            )
            with engine_root.connect() as conn:
                conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`"))
            engine_root.dispose()
            return
        except Exception as ex:
            if attempt < max_retries:
                time.sleep(delay)
            else:
                logger.error(f"Could not connect to MySQL after {max_retries} attempts: {ex}")

create_database_if_not_exists()

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{ACTIVE_DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

ORDER_COLUMN_DEFINITIONS = {
    "shipping_fee": "FLOAT DEFAULT 0",
    "shipping_name": "VARCHAR(100) NULL",
    "shipping_phone": "VARCHAR(20) NULL",
    "shipping_address": "VARCHAR(255) NULL",
    "shipping_city": "VARCHAR(100) NULL",
    "shipping_state": "VARCHAR(100) NULL",
    "shipping_zip": "VARCHAR(20) NULL",
    "shipping_country": "VARCHAR(100) NULL",
    "latitude": "DECIMAL(10,8) NULL",
    "longitude": "DECIMAL(11,8) NULL",
    "delivery_notes": "TEXT NULL",
    "order_type": "VARCHAR(20) DEFAULT 'single'",
    "subtotal": "FLOAT DEFAULT 0",
    "discount_amount": "FLOAT DEFAULT 0",
    "roster_data": "LONGTEXT NULL",
    "pricing_breakdown": "LONGTEXT NULL",
}

USER_COLUMN_DEFINITIONS = {
    "is_active": "INT DEFAULT 1 NULL",
    "latitude": "DECIMAL(10,8) NULL",
    "longitude": "DECIMAL(11,8) NULL",
}

def ensure_order_shipping_columns():
    inspector = inspect(engine)
    if inspector.has_table("orders"):
        existing_columns = {column["name"] for column in inspector.get_columns("orders")}
        missing_columns = [
            (name, definition)
            for name, definition in ORDER_COLUMN_DEFINITIONS.items()
            if name not in existing_columns
        ]
        if missing_columns:
            with engine.begin() as conn:
                for name, definition in missing_columns:
                    conn.execute(text(f"ALTER TABLE orders ADD COLUMN {name} {definition}"))

    if inspector.has_table("users"):
        existing_user_cols = {column["name"] for column in inspector.get_columns("users")}
        missing_user_cols = [
            (name, definition)
            for name, definition in USER_COLUMN_DEFINITIONS.items()
            if name not in existing_user_cols
        ]
        if missing_user_cols:
            with engine.begin() as conn:
                for name, definition in missing_user_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
