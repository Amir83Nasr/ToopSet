"""
Prometheus instrumentation for ToopSet backend.

Exposes:
  - HTTP request count & latency histograms (bucketed)
  - Business metrics: users, active courts, today's bookings, today's revenue
  - Error counter and booking-status breakdown

All metrics are registered on a *global* Prometheus registry and served
at the ``/metrics`` endpoint added in ``main.py``.
"""

import re
import time

from prometheus_client import Counter, Gauge, Histogram, generate_latest
from prometheus_client.registry import REGISTRY
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# ── Path normalisation helper ─────────────────────────────────────────────────


def _route_path(request: Request) -> str:
    """Return the route template (e.g. ``/api/v1/courts/{court_id}``).

    Falls back to simple numeric-segment normalisation when the route is not
    resolved (e.g. 404 or early middleware run).
    """
    route = request.scope.get("route")
    if route is not None:
        return route.path
    # Fallback: replace numeric path segments with ``{id}``
    return re.sub(r"/\d+(?=/|$)", "/{id}", request.url.path)


# ── HTTP metrics ──────────────────────────────────────────────────────────────

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

# ── Error metrics ─────────────────────────────────────────────────────────────

http_errors_total = Counter(
    "http_errors_total",
    "HTTP error responses by status code",
    labelnames=["status"],
)

# ── Business metrics (updated by background / API tasks) ──────────────────────

toopset_db_users_total = Gauge(
    "toopset_db_users_total",
    "Total number of registered users",
)

toopset_active_courts_total = Gauge(
    "toopset_active_courts_total",
    "Number of active (non-deleted) courts",
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

toopset_cache_hits_total = Counter(
    "toopset_cache_hits_total",
    "Total number of cache hits (Redis)",
)

toopset_cache_misses_total = Counter(
    "toopset_cache_misses_total",
    "Total number of cache misses (Redis)",
)


# ── Middleware ─────────────────────────────────────────────────────────────────


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Records HTTP request count, latency & errors for every incoming request."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        method = request.method
        path = _route_path(request)

        start = time.perf_counter()

        response = await call_next(request)

        duration = time.perf_counter() - start
        status = str(response.status_code)

        http_requests_total.labels(method=method, path=path, status=status).inc()
        http_request_duration_seconds.labels(method=method, path=path).observe(duration)

        if response.status_code >= 400:
            http_errors_total.labels(status=status).inc()

        return response


# ── Booking status refresh ────────────────────────────────────────────────────


async def refresh_booking_status_metrics(db_session_factory) -> None:
    """Query booking counts per status and update the ``toopset_bookings_by_status`` gauge."""
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


# ── Business metrics refresh ──────────────────────────────────────────────────


async def refresh_business_metrics(db_session_factory) -> None:
    """Query the database and update the business-gauges with live values.

    Intended to be called once at startup and periodically from a background
    task (see ``main.py`` lifespan).
    """
    from datetime import datetime, timezone

    from app.repositories.booking_repo import BookingRepo
    from app.repositories.court_repo import CourtRepo
    from app.repositories.user_repo import UserRepository

    try:
        async with db_session_factory() as db:
            user_repo = UserRepository(db)
            court_repo = CourtRepo(db)
            booking_repo = BookingRepo(db)

            toopset_db_users_total.set(await user_repo.count_all())
            toopset_active_courts_total.set(await court_repo.count_active())

            now = datetime.now(timezone.utc)
            toopset_today_bookings_total.set(await booking_repo.count_today(now))
            toopset_today_revenue_toman.set(await booking_repo.sum_today_revenue(now))
    except Exception:
        import logging

        logging.exception("refresh_business_metrics failed")

    await refresh_booking_status_metrics(db_session_factory)


# ── Metrics endpoint helper ───────────────────────────────────────────────────


def metrics_response() -> Response:
    """Return a plain-text Prometheus exposition response."""
    return Response(
        content=generate_latest(REGISTRY).decode("utf-8"),
        media_type="text/plain; charset=utf-8",
    )
