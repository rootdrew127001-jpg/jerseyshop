import json
import logging
import redis
from typing import Optional, Dict, Any
from app.core.config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB

logger = logging.getLogger("redis_service")

# Initialize Redis client
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        db=REDIS_DB,
        decode_responses=True,
        socket_timeout=1,
        socket_connect_timeout=1
    )
except Exception as e:
    logger.error(f"Failed to initialize Redis client: {e}")
    redis_client = None


def is_redis_available() -> bool:
    """Check if Redis connection is alive."""
    if not redis_client:
        return False
    try:
        return bool(redis_client.ping())
    except Exception as e:
        logger.warning(f"Redis ping failed: {e}")
        return False


# --- Session Management ---

def store_session(token: str, user_data: dict, expire_seconds: int = 86400 * 7) -> bool:
    """Store active user session in Redis with TTL (default 7 days)."""
    if not is_redis_available():
        logger.warning("Redis unavailable; skipping store_session")
        return False
    try:
        key = f"session:{token}"
        val = json.dumps(user_data)
        redis_client.setex(key, expire_seconds, val)
        return True
    except Exception as e:
        logger.error(f"Redis error storing session: {e}")
        return False


def get_session(token: str) -> Optional[Dict[str, Any]]:
    """Retrieve session user_data from Redis."""
    if not is_redis_available():
        return None
    try:
        key = f"session:{token}"
        val = redis_client.get(key)
        if val:
            return json.loads(val)
        return None
    except Exception as e:
        logger.error(f"Redis error getting session: {e}")
        return None


def delete_session(token: str) -> bool:
    """Delete session from Redis (Logout / Revocation)."""
    if not is_redis_available():
        return False
    try:
        key = f"session:{token}"
        return bool(redis_client.delete(key))
    except Exception as e:
        logger.error(f"Redis error deleting session: {e}")
        return False


# --- OTP Management ---

def store_otp(email: str, otp: str, expire_seconds: int = 600) -> bool:
    """Store OTP in Redis with TTL (default 10 minutes)."""
    if not is_redis_available():
        logger.warning("Redis unavailable; skipping store_otp")
        return False
    try:
        key = f"otp:{email.lower().strip()}"
        redis_client.setex(key, expire_seconds, otp)
        return True
    except Exception as e:
        logger.error(f"Redis error storing OTP: {e}")
        return False


def get_otp(email: str) -> Optional[str]:
    """Get active OTP for email from Redis."""
    if not is_redis_available():
        return None
    try:
        key = f"otp:{email.lower().strip()}"
        return redis_client.get(key)
    except Exception as e:
        logger.error(f"Redis error getting OTP: {e}")
        return None


def delete_otp(email: str) -> bool:
    """Delete OTP from Redis after verification."""
    if not is_redis_available():
        return False
    try:
        key = f"otp:{email.lower().strip()}"
        return bool(redis_client.delete(key))
    except Exception as e:
        logger.error(f"Redis error deleting OTP: {e}")
        return False
