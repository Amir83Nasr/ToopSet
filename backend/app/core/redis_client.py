"""Async Redis client for ToopSet backend.

Provides a module-level ``redis_client`` singleton and lifecycle helpers.
Import ``get_redis()`` in services to obtain the client on demand.
"""

from __future__ import annotations

from redis import asyncio as aioredis

from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return the shared Redis client — creates it on first call."""
    global _redis
    if _redis is None:
        _redis = aioredis.Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis


async def close_redis() -> None:
    """Tear down the shared Redis client (call during shutdown)."""
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None
