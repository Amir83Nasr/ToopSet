"""Audit logging helpers for ToopSet backend.

Provides ``log_action()`` for writing structured security audit events to the
``logs`` table with a consistent schema:

  - ``user_id`` — acting user (or None for anonymous actions)
  - ``action`` — event type (snake_case)
  - ``details`` — JSON-encoded detail string with relevant context
  - ``severity`` — ``INFO`` | ``WARNING`` | ``CRITICAL``
  - ``request_id`` — correlation ID from the current request (if any)
  - ``ip_address`` — client IP (if available)
  - ``user_agent`` — User-Agent header (if available)
"""

from __future__ import annotations

import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.correlation_id import get_request_id
from app.repositories.log_repo import LogRepo

_IR_MOBILE_RE = re.compile(r"(?<!\d)(09\d{9})(?!\d)")
_CARD_NUMBER_RE = re.compile(r"(?<!\d)(\d{6})\d{6}(\d{4})(?!\d)")


def redact_audit_details(details: str | None) -> str | None:
    """Remove full phone/card identifiers before persistent audit logging."""
    if details is None:
        return None
    details = _IR_MOBILE_RE.sub(lambda match: f"09*****{match.group(1)[-4:]}", details)
    return _CARD_NUMBER_RE.sub(r"\1******\2", details)


async def log_action(
    db: AsyncSession,
    user_id: int | None,
    action: str,
    details: str | None = None,
    severity: str = "INFO",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Create a structured audit log entry."""
    repo = LogRepo(db)
    await repo.create(
        user_id=user_id,
        action=action,
        details=redact_audit_details(details),
        severity=severity,
        request_id=get_request_id(),
        ip_address=ip_address,
        user_agent=user_agent,
    )
