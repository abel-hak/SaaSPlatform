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

