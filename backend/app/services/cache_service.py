"""Lightweight Redis cache helpers for frequently-read data.

Currently scoped to time-slot caching — extend as needed.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.redis_client import get_redis

# ── TTLs (seconds) ───────────────────────────────────────────────────────────

TIME_SLOTS_TTL = 30  # short TTL — slots change when someone books

# ── Key helpers ──────────────────────────────────────────────────────────────


def _slot_list_key(court_id: int, date: str | None) -> str:
    parts = [f"slots:{court_id}"]
    if date:
        parts.append(date)
    return ":".join(parts)


# ── Time-slot cache ──────────────────────────────────────────────────────────


async def cache_slot_list(
    court_id: int,
    data: list[dict[str, Any]],
    date: str | None = None,
) -> None:
    """Store a serialised slot list in Redis with ``TIME_SLOTS_TTL``."""
    try:
        r = await get_redis()
        key = _slot_list_key(court_id, date)
        await r.setex(key, TIME_SLOTS_TTL, json.dumps(data, default=str))
    except Exception:
        pass  # cache miss degrades gracefully — fall through to DB


async def get_cached_slot_list(
    court_id: int,
    date: str | None = None,
) -> list[dict[str, Any]] | None:
    """Return cached slot list, or ``None`` on miss / Redis-down."""
    try:
        r = await get_redis()
        key = _slot_list_key(court_id, date)
        raw = await r.get(key)
        if raw is not None:
            return json.loads(raw)
    except Exception:
        pass
    return None


async def invalidate_slot_list(court_id: int) -> None:
    """Drop all slot-list cache keys for a court (called after writes)."""
    try:
        r = await get_redis()
        pattern = _slot_list_key(court_id, "*")
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
    except Exception:
        pass
