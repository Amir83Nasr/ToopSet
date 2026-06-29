"""Correlation / Request-ID middleware and helpers.

Provides a ``CorrelationIdMiddleware`` that:
  1. Reads an incoming ``X-Request-ID`` header (or generates a UUID4).
  2. Adds the ID to ``request.state.request_id``.
  3. Returns the ID in every response as ``X-Request-ID``.
  4. Pushes the ID into the current ``contextvars`` ContextVar so it can
     be accessed concurrently for logging, Sentry,
     audit logs, and background tasks.
"""

from __future__ import annotations

import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

# ── Context variable (thread-safe, async-friendly) ───────────────────

_request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """Return the current request's correlation ID (empty string if none)."""
    return _request_id_var.get()


def set_request_id(request_id: str) -> None:
    """Set the current request's correlation ID (for background tasks)."""
    _request_id_var.set(request_id)


# ── Middleware ────────────────────────────────────────────────────────


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Reads/generates a correlation ID for every request."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        header_name = settings.correlation_id_header
        req_id = (
            request.headers.get(header_name) or uuid.uuid4().hex[: settings.correlation_id_length]
        )
        request.state.request_id = req_id
        token = _request_id_var.set(req_id)

        try:
            response = await call_next(request)
        finally:
            _request_id_var.reset(token)

        response.headers[header_name] = req_id
        return response
