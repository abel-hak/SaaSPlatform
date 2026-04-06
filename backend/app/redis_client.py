from redis import asyncio as aioredis

from .config import get_settings


settings = get_settings()

redis = aioredis.from_url(settings.redis_url, decode_responses=True)


async def rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    """
    Simple fixed-window rate limiter.
    Returns True if allowed, False if over limit.
    """
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_seconds)
    return current <= limit


async def blacklist_token(jti: str, expires_in_seconds: int) -> None:
    """Add a refresh token JTI to the Redis blocklist until its expiry."""
    await redis.setex(f"blocklist:{jti}", expires_in_seconds, "1")


async def is_token_blacklisted(jti: str) -> bool:
    """Return True if the given refresh token JTI has been revoked."""
    return await redis.exists(f"blocklist:{jti}") == 1

