"""Cursor-based pagination helpers.

OFFSET pagination degrades as the offset grows because the database still
scans all skipped rows. Cursor-based pagination uses ``WHERE id > :cursor``
(or any monotonic field), which is an O(log n) B-tree seek per page regardless
of how deep into the result set you are.

Usage
-----
.. code-block:: python

    from app.core.pagination import CursorPage, decode_cursor

    cursor = decode_cursor(raw_cursor) if raw_cursor else None
    items = await repo.search(after=cursor, limit=limit + 1)

    next_cursor = None
    if len(items) > limit:
        items = items[:limit]
        next_cursor = encode_cursor(items[-1].id)  # or .created_at

    return CursorPage(items=items, total=total, next_cursor=next_cursor)
"""

from __future__ import annotations

import base64
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


def encode_cursor(value: object) -> str:
    """Base64-encode a cursor value (int, str, iso-datetime, …).

    The value is converted to string before encoding so callers can pass
    ``item.id`` or ``item.created_at.isoformat()`` directly.
    """
    return base64.urlsafe_b64encode(str(value).encode()).decode()


def decode_cursor(cursor: str) -> str:
    """Decode a base64-encoded cursor back to its string representation."""
    return base64.urlsafe_b64decode(cursor.encode()).decode()


class CursorPage(BaseModel, Generic[T]):
    """Page of results with optional cursor for the next page.

    Fields are intentionally named to be additive to existing list-response
    schemas — clients that don't use cursor pagination can ignore them.
    """

    items: list[T]
    total: int
    next_cursor: str | None = None
