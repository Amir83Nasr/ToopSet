"""
Prometheus instrumentation for ToopSet backend.

Exposes:
  - HTTP request count & latency histograms (bucketed)
  - Business metrics: users, active vendors, today's bookings, today's revenue
  - Error counter and booking-status breakdown
  - Cache hit/miss counters
  - Request profiling histograms (duration, DB/Redis counts)
  - Connection pool gauges
  - Business KPI metrics (OTP, refresh tokens, uploads, bookings/payments ratio)

All metrics are registered on a *global* Prometheus registry and served
at the ``/metrics`` endpoint added in ``main.py``.
"""

from __future__ import annotations

import re
import time

from prometheus_client import Counter, Gauge, Histogram, generate_latest
from prometheus_client.registry import REGISTRY
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.database import engine


def _route_path(request: Request) -> str:
    """Return the route template (e.g. ``/api/v1/vendors/{vendor_id}``).

    Falls back to simple numeric-segment normalisation when the route is not
    resolved (e.g. 404 or early middleware run).
    """
    route = request.scope.get("route")
    if route is not None:
        return route.path
    return re.sub(r"/\d+(?=/|$)", "/{id}", request.url.path)


# ── Core HTTP metrics ────────────────────────────────────────────────────

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests handled",
    labelnames=["method", "path", "status"],
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    labelnames=["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

http_errors_total = Counter(
    "http_errors_total",
    "HTTP error responses by status code",
    labelnames=["status"],
)

http_requests_in_progress = Gauge(
    "http_requests_in_progress",
    "Number of HTTP requests currently being handled",
)

# ── Request profiling histograms ─────────────────────────────────────────

toopset_request_duration_ms = Histogram(
    "toopset_request_duration_ms",
    "Per-request total duration in milliseconds",
    buckets=(10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000),
)

toopset_request_size_bytes = Histogram(
    "toopset_request_size_bytes",
    "Per-request body size in bytes",
    buckets=(256, 512, 1024, 4096, 16384, 65536, 262144, 1048576),
)

toopset_response_size_bytes = Histogram(
    "toopset_response_size_bytes",
    "Per-response body size in bytes",
    buckets=(256, 512, 1024, 4096, 16384, 65536, 262144, 1048576, 5242880),
)

toopset_db_query_count = Histogram(
    "toopset_db_query_count",
    "Number of DB queries per request",
    buckets=(1, 2, 5, 10, 20, 50, 100),
)

toopset_db_query_duration_ms = Histogram(
    "toopset_db_query_duration_ms",
    "Cumulative DB query duration per request in milliseconds",
    buckets=(5, 10, 25, 50, 100, 200, 500, 1000, 2000),
)

toopset_redis_op_count = Histogram(
    "toopset_redis_op_count",
    "Number of Redis operations per request",
    buckets=(1, 2, 5, 10, 20, 50),
)

toopset_redis_op_duration_ms = Histogram(
    "toopset_redis_op_duration_ms",
    "Cumulative Redis operation duration per request in milliseconds",
    buckets=(1, 2, 5, 10, 25, 50, 100, 200, 500),
)

# ── Cache metrics ────────────────────────────────────────────────────────

toopset_cache_hits_total = Counter(
    "toopset_cache_hits_total",
    "Total number of cache hits (Redis)",
)

toopset_cache_misses_total = Counter(
    "toopset_cache_misses_total",
    "Total number of cache misses (Redis)",
)

toopset_cache_evictions_total = Counter(
    "toopset_cache_evictions_total",
    "Total number of cache evictions (tracked via INFO)",
)

toopset_cache_memory_bytes = Gauge(
    "toopset_cache_memory_bytes",
    "Current Redis used memory in bytes",
)

# ── Business KPI metrics ─────────────────────────────────────────────────

toopset_db_users_total = Gauge(
    "toopset_db_users_total",
    "Total number of registered users",
)

toopset_active_vendors_total = Gauge(
    "toopset_active_vendors_total",
    "Number of active (non-deleted) vendors",
)

toopset_today_bookings_total = Gauge(
    "toopset_today_bookings_total",
    "Number of bookings created today",
)

toopset_today_revenue_toman = Gauge(
    "toopset_today_revenue_toman",
    "Total confirmed revenue today in Iranian Toman",
)

toopset_bookings_by_status = Gauge(
    "toopset_bookings_by_status",
    "Number of bookings grouped by status",
    labelnames=["status"],
)

toopset_booking_success_ratio = Gauge(
    "toopset_booking_success_ratio",
    "Ratio of confirmed bookings to total booking attempts",
)

toopset_payment_failure_ratio = Gauge(
    "toopset_payment_failure_ratio",
    "Ratio of failed payments to total payment attempts",
)

toopset_refresh_token_rotations_total = Counter(
    "toopset_refresh_token_rotations_total",
    "Total number of refresh token rotations",
)

toopset_otp_lockouts_total = Counter(
    "toopset_otp_lockouts_total",
    "Total number of OTP lockout events",
)

toopset_upload_count_total = Counter(
    "toopset_upload_count_total",
    "Total number of file uploads",
    labelnames=["type"],  # "avatar", "vendor_image"
)

toopset_active_sessions = Gauge(
    "toopset_active_sessions",
    "Number of active refresh token sessions",
)

toopset_payment_reconciliation_last_run_timestamp_seconds = Gauge(
    "toopset_payment_reconciliation_last_run_timestamp_seconds",
    "Unix timestamp of the latest payment reconciliation attempt",
)

toopset_payment_reconciliation_last_success_timestamp_seconds = Gauge(
    "toopset_payment_reconciliation_last_success_timestamp_seconds",
    "Unix timestamp of the latest successful payment reconciliation run",
)

toopset_payment_reconciliation_last_checked = Gauge(
    "toopset_payment_reconciliation_last_checked",
    "Number of gateway transactions checked by the latest reconciliation run",
)

toopset_payment_reconciliation_runs_total = Counter(
    "toopset_payment_reconciliation_runs_total",
    "Payment reconciliation runs grouped by result",
    labelnames=["result"],
)

toopset_payment_reconciliation_outcomes_total = Counter(
    "toopset_payment_reconciliation_outcomes_total",
    "Payment reconciliation outcomes",
    labelnames=["outcome"],
)

# ── Connection pool metrics ──────────────────────────────────────────────

toopset_db_pool_size = Gauge(
    "toopset_db_pool_size",
    "SQLAlchemy connection pool size",
    labelnames=["state"],  # "checked_in", "checked_out", "overflow", "total"
)


def record_payment_reconciliation_success(result: dict[str, int]) -> None:
    """Publish liveness and outcome metrics for a completed reconciliation run."""
    now = time.time()
    checked = sum(
        result.get(key, 0) for key in ("paid", "failed", "pending", "reconciliation_required")
    )
    toopset_payment_reconciliation_last_run_timestamp_seconds.set(now)
    toopset_payment_reconciliation_last_success_timestamp_seconds.set(now)
    toopset_payment_reconciliation_last_checked.set(checked)
    toopset_payment_reconciliation_runs_total.labels(result="success").inc()
    for outcome in ("paid", "failed", "pending", "reconciliation_required", "cleaned"):
        count = result.get(outcome, 0)
        if count:
            toopset_payment_reconciliation_outcomes_total.labels(outcome=outcome).inc(count)


def record_payment_reconciliation_failure() -> None:
    """Publish a failed reconciliation attempt without advancing success time."""
    toopset_payment_reconciliation_last_run_timestamp_seconds.set(time.time())
    toopset_payment_reconciliation_runs_total.labels(result="failure").inc()


# ── Middleware ────────────────────────────────────────────────────────────


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Records HTTP request count, latency & errors for every incoming request."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        method = request.method
        path = _route_path(request)
        http_requests_in_progress.inc()

        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            http_requests_in_progress.dec()

        duration = time.perf_counter() - start
        status = str(response.status_code)

        http_requests_total.labels(method=method, path=path, status=status).inc()
        http_request_duration_seconds.labels(method=method, path=path).observe(duration)

        if response.status_code >= 400:
            http_errors_total.labels(status=status).inc()

        return response


# ── Pool metrics ─────────────────────────────────────────────────────────


def refresh_pool_metrics() -> None:
    """Export SQLAlchemy connection pool status as Prometheus gauges."""
    try:
        pool = engine.pool
        toopset_db_pool_size.labels(state="checked_in").set(pool.checkedin())
        toopset_db_pool_size.labels(state="checked_out").set(pool.checkedout())
        # overflow() is negative when no overflow connections are in use
        toopset_db_pool_size.labels(state="overflow").set(max(0, pool.overflow()))
        toopset_db_pool_size.labels(state="total").set(pool.size())
    except Exception:
        import logging

        logging.exception("refresh_pool_metrics failed")


# ── Booking status refresh ────────────────────────────────────────────────


async def refresh_booking_status_metrics(db_session_factory) -> None:
    """Query booking counts per status and update the gauge."""
    from app.repositories.booking_repo import BookingRepo

    try:
        async with db_session_factory() as db:
            repo = BookingRepo(db)
            counts = await repo.count_by_status()
            for status_label, count in counts.items():
                toopset_bookings_by_status.labels(status=status_label).set(count)
    except Exception:
        import logging

        logging.exception("refresh_booking_status_metrics failed")


# ── Business metrics refresh ─────────────────────────────────────────────


async def refresh_business_metrics(db_session_factory) -> None:
    """Query the database and update the business-gauges with live values."""
    from datetime import datetime, timezone

    from app.repositories.booking_repo import BookingRepo
    from app.repositories.user_repo import UserRepository
    from app.repositories.vendor_repo import VendorRepo

    try:
        async with db_session_factory() as db:
            user_repo = UserRepository(db)
            vendor_repo = VendorRepo(db)
            booking_repo = BookingRepo(db)

            toopset_db_users_total.set(await user_repo.count_all())
            toopset_active_vendors_total.set(await vendor_repo.count_active())

            now = datetime.now(timezone.utc)
            toopset_today_bookings_total.set(await booking_repo.count_today(now))
            toopset_today_revenue_toman.set(await booking_repo.sum_today_revenue(now))

        refresh_pool_metrics()
    except Exception:
        import logging

        logging.exception("refresh_business_metrics failed")

    await refresh_booking_status_metrics(db_session_factory)


def metrics_response() -> Response:
    """Return a plain-text Prometheus exposition response."""
    return Response(
        content=generate_latest(REGISTRY).decode("utf-8"),
        media_type="text/plain; charset=utf-8",
    )
