"""Request profiling middleware.

Collects per-request timing breakdowns and logs requests that exceed
the configured slow-threshold.

Metrics collected:
  - total request duration
  - DB query count & cumulative duration
  - response size / request size

``ProfilerMiddleware`` is a no-op when ``profiler_enabled`` is ``False``.
"""

from __future__ import annotations

import json
import logging
import time
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.correlation_id import get_request_id

logger = logging.getLogger(__name__)

# ── Context variable for profiler data ───────────────────────────────

ProfilerData = dict[str, float | int]
_profiler_var: ContextVar[ProfilerData | None] = ContextVar("profiler", default=None)


def get_profiler_data() -> ProfilerData | None:
    """Return the current request's profiler data (or None)."""
    return _profiler_var.get()


def record_db_query(duration_ms: float) -> None:
    """Record a single DB query timing (called from database.py listener)."""
    data = _profiler_var.get()
    if data is not None:
        data["db_count"] = data.get("db_count", 0) + 1
        data["db_duration_ms"] = data.get("db_duration_ms", 0) + duration_ms


def record_redis_operation(duration_ms: float) -> None:
    """Record a single Redis operation timing."""
    data = _profiler_var.get()
    if data is not None:
        data["redis_count"] = data.get("redis_count", 0) + 1
        data["redis_duration_ms"] = data.get("redis_duration_ms", 0) + duration_ms


# ── Middleware ────────────────────────────────────────────────────────


class ProfilerMiddleware(BaseHTTPMiddleware):
    """Logs per-request performance data for slow requests."""

    def __init__(self, app, **kwargs):
        super().__init__(app, **kwargs)
        self._enabled = settings.profiler_enabled
        self._threshold_ms = settings.profiler_slow_request_threshold_ms

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if not self._enabled:
            return await call_next(request)

        profiler_data: ProfilerData = {
            "db_count": 0,
            "db_duration_ms": 0.0,
            "redis_count": 0,
            "redis_duration_ms": 0.0,
        }
        token = _profiler_var.set(profiler_data)
        start = time.perf_counter()

        try:
            response = await call_next(request)
        finally:
            total_duration = (time.perf_counter() - start) * 1000
            _profiler_var.reset(token)

        req_size = 0
        if request.headers.get("content-length"):
            try:
                req_size = int(request.headers["content-length"])
            except (ValueError, TypeError):
                pass

        resp_size = 0
        cl = response.headers.get("content-length")
        if cl:
            try:
                resp_size = int(cl)
            except (ValueError, TypeError):
                pass

        db_count = profiler_data.get("db_count", 0)
        db_duration = profiler_data.get("db_duration_ms", 0.0)
        redis_count = profiler_data.get("redis_count", 0)
        redis_duration = profiler_data.get("redis_duration_ms", 0.0)

        # Export to Prometheus metrics
        _export_metrics(
            total_duration, db_count, db_duration, redis_count, redis_duration, req_size, resp_size
        )

        # Log slow requests
        if total_duration > self._threshold_ms:
            log_data = {
                "event": "slow_request",
                "request_id": get_request_id(),
                "method": request.method,
                "path": request.url.path,
                "total_duration_ms": round(total_duration, 1),
                "db_queries": db_count,
                "db_duration_ms": round(db_duration, 1),
                "redis_ops": redis_count,
                "redis_duration_ms": round(redis_duration, 1),
                "request_size_bytes": req_size,
                "response_size_bytes": resp_size,
            }
            logger.warning(json.dumps(log_data))

        return response


def _export_metrics(
    total_duration: float,
    db_count: int,
    db_duration: float,
    redis_count: int,
    redis_duration: float,
    req_size: int,
    resp_size: int,
) -> None:
    """Update Prometheus metrics with profiler data."""
    try:
        from app.core.metrics import (
            toopset_db_query_count,
            toopset_db_query_duration_ms,
            toopset_redis_op_count,
            toopset_redis_op_duration_ms,
            toopset_request_duration_ms,
            toopset_request_size_bytes,
            toopset_response_size_bytes,
        )

        toopset_request_duration_ms.observe(total_duration)
        toopset_db_query_count.observe(db_count)
        toopset_db_query_duration_ms.observe(db_duration)
        toopset_redis_op_count.observe(redis_count)
        toopset_redis_op_duration_ms.observe(redis_duration)
        toopset_request_size_bytes.observe(req_size)
        toopset_response_size_bytes.observe(resp_size)
    except Exception:
        pass  # metrics not yet registered
