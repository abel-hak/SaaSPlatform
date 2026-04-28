import logging

from redis import asyncio as aioredis
from redis.exceptions import ConnectionError as RedisConnectionError

from .config import get_settings


logger = logging.getLogger(__name__)
settings = get_settings()

redis = aioredis.from_url(settings.redis_url, decode_responses=True)


async def rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    """
    Simple fixed-window rate limiter.
    Returns True if allowed, False if over limit.
    Fails open (allows request) if Redis is unavailable.
    """
    try:
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, window_seconds)
        return current <= limit
    except RedisConnectionError:
        logger.warning("Redis unavailable — rate limiting disabled for key: %s", key)
        return True  # fail open: allow request


async def blacklist_token(jti: str, expires_in_seconds: int) -> None:
    """Add a refresh token JTI to the Redis blocklist until its expiry."""
    try:
        await redis.setex(f"blocklist:{jti}", expires_in_seconds, "1")
    except RedisConnectionError:
        logger.warning("Redis unavailable — token blacklisting skipped for jti: %s", jti)


async def is_token_blacklisted(jti: str) -> bool:
    """Return True if the given refresh token JTI has been revoked."""
    try:
        return await redis.exists(f"blocklist:{jti}") == 1
    except RedisConnectionError:
        logger.warning("Redis unavailable — assuming token %s is NOT blacklisted", jti)
        return False  # fail safe: assume token is valid
