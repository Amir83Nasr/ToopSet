"""Redis cache for the per-request auth status lookup.

``get_current_user`` used to query the ``users`` table on every authenticated
request to check ``is_active`` and ``token_version``.  This module caches that
minimal status so the hot path authorizes from the JWT + Redis and only
touches the database on a miss.

Semantics
---------
* Key: ``user:status:{user_id}`` — JSON payload with ``is_active``,
  ``token_version`` and ``role`` (role is cached so demotions take effect
  without waiting for the next token refresh; it is invalidated on changes).
* TTL: 300 s.  Security events delete the key, so the TTL only bounds
  staleness when an invalidation is missed (e.g. Redis briefly down while a
  password change lands) — a revoked session then stays authorized for at
  most 5 minutes, well below the 30-minute access-token lifetime.
* Invalidation contract: any write to ``users.is_active``, ``token_version``
  or ``role`` MUST call :func:`invalidate_user_status` — see
  ``services/auth_service.py`` (password change, logout-all, admin revoke)
  and ``services/user_service.py`` (role change, activate/deactivate).

Failure mode
------------
Every operation degrades gracefully: on ``RedisError`` (or a corrupt payload)
we log a rate-limited warning and behave as a cache miss, so authentication
falls back to the database and keeps working with Redis down.
"""

from __future__ import annotations

import json
import logging
import time
from typing import TypeGuard

from redis.exceptions import RedisError

from app.core.metrics import toopset_cache_hits_total, toopset_cache_misses_total
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

# How long a cached auth status may be trusted (seconds). See module docstring.
AUTH_STATUS_TTL = 300

# Re-warn about Redis failures at most once per minute — auth runs on every
# request and an outage must not flood the logs.
_REDIS_WARN_INTERVAL = 60.0
_last_redis_warn = 0.0


def _warn_redis_failure(exc: Exception) -> None:
    global _last_redis_warn
    now = time.monotonic()
    if now - _last_redis_warn >= _REDIS_WARN_INTERVAL:
        _last_redis_warn = now
        logger.warning("auth cache: Redis unavailable, falling back to DB: %r", exc)


def user_status_key(user_id: int) -> str:
    return f"user:status:{user_id}"


def _is_valid_payload(payload: object) -> TypeGuard[dict]:
    """Strict shape check — a malformed payload is never trusted (treated as a miss)."""
    return (
        isinstance(payload, dict)
        and isinstance(payload.get("is_active"), bool)
        and isinstance(payload.get("token_version"), int)
        and not isinstance(payload.get("token_version"), bool)  # bool is an int subclass
        and isinstance(payload.get("role"), str)
    )


async def get_user_status(user_id: int) -> dict | None:
    """Return cached ``{"is_active", "token_version", "role"}`` or ``None``.

    ``None`` means "not usable" — miss, expired, malformed payload, or Redis
    down.  Callers must fall back to the database in that case.
    """
    try:
        r = await get_redis()
        raw = await r.get(user_status_key(user_id))
        if raw is None:
            toopset_cache_misses_total.inc()
            return None
        payload = json.loads(raw)
        if _is_valid_payload(payload):
            toopset_cache_hits_total.inc()
            return payload
        toopset_cache_misses_total.inc()
    except (RedisError, ValueError) as exc:
        _warn_redis_failure(exc)
    return None


async def set_user_status(user_id: int, *, is_active: bool, token_version: int, role: str) -> None:
    """Cache a user's auth status (call after a successful DB lookup)."""
    try:
        r = await get_redis()
        payload = json.dumps({"is_active": is_active, "token_version": token_version, "role": role})
        await r.set(user_status_key(user_id), payload, ex=AUTH_STATUS_TTL)
    except (RedisError, ValueError) as exc:
        _warn_redis_failure(exc)


async def invalidate_user_status(user_id: int) -> None:
    """Drop the cached status so the next request re-reads the database.

    Called after any change to ``is_active`` / ``token_version`` / ``role``.
    Best effort: the surrounding DB transaction may not have committed yet,
    so a concurrent miss could briefly re-populate the pre-commit value —
    the TTL bounds that rare window to ``AUTH_STATUS_TTL``.
    """
    try:
        r = await get_redis()
        await r.delete(user_status_key(user_id))
    except RedisError as exc:
        _warn_redis_failure(exc)
