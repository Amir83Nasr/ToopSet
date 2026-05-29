"""
Health check utilities for ToopSet backend.

Provides a structured health endpoint that verifies connectivity for
the database (PostgreSQL) and cache (Redis), along with uptime tracking.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.redis_client import get_redis

# ── App lifecycle ─────────────────────────────────────────────────────────────

APP_START_TIME: datetime = datetime.now(timezone.utc)
APP_VERSION: str = "0.1.0"


# ── Component probes ──────────────────────────────────────────────────────────


async def _probe_database() -> dict[str, Any]:
    """Check PostgreSQL connectivity by executing ``SELECT 1``."""
    result: dict[str, Any] = {"status": "up"}
    t0 = time.perf_counter()
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    except Exception as exc:
        result["status"] = "down"
        result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        result["error"] = str(exc)
    return result


async def _probe_redis() -> dict[str, Any]:
    """Check Redis connectivity by sending ``PING``."""
    result: dict[str, Any] = {"status": "up"}
    t0 = time.perf_counter()
    r = None
    try:
        r = await get_redis()
        await r.ping()
        result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    except Exception as exc:
        result["status"] = "down"
        result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        result["error"] = str(exc)
    return result


# ── Public interface ──────────────────────────────────────────────────────────


async def check_health() -> dict[str, Any]:
    """Run all component probes and return the aggregated health status.

    Returns a dict structured for JSON serialisation:
    ``{"status", "version", "uptime_seconds", "components": {...}}``.
    """
    db_probe = await _probe_database()
    redis_probe = await _probe_redis()

    # Overall status: ok if at least DB is up; degraded otherwise.
    overall = "ok"
    if db_probe["status"] != "up":
        overall = "degraded"

    uptime = (datetime.now(timezone.utc) - APP_START_TIME).total_seconds()

    return {
        "status": overall,
        "version": APP_VERSION,
        "uptime_seconds": round(uptime, 1),
        "components": {
            "database": {
                "status": db_probe["status"],
                "latency_ms": db_probe["latency_ms"],
            },
            "redis": {
                "status": redis_probe["status"],
                "latency_ms": redis_probe["latency_ms"],
            },
        },
    }
