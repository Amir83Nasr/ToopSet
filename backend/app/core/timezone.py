"""Iran timezone (Asia/Tehran) helpers for consistent datetime handling.

All datetimes are stored in UTC in the database. Iran timezone is used for
user-facing input/output and slot generation.
"""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

IRAN_TZ = ZoneInfo("Asia/Tehran")

# UTC+3:30 (standard) = 12600 seconds
# UTC+4:30 (DST)      = 16200 seconds
IRAN_STD_OFFSET = timedelta(hours=3, minutes=30)
IRAN_DST_OFFSET = timedelta(hours=4, minutes=30)


def now_utc() -> datetime:
    """Current time in UTC (for internal comparisons)."""
    return datetime.now(timezone.utc)


def now_iran() -> datetime:
    """Current time in Iran timezone (for display)."""
    return datetime.now(IRAN_TZ)


def iran_to_utc(dt: datetime) -> datetime:
    """Convert an Iran-local datetime to UTC.

    If naive, assume it's in Iran timezone and attach IRAN_TZ first.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IRAN_TZ)
    return dt.astimezone(timezone.utc)


def utc_to_iran(dt: datetime) -> datetime:
    """Convert a UTC datetime to Iran timezone.

    If naive, assume it's UTC first.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IRAN_TZ)


def utc_offset_seconds() -> int:
    """Get current UTC offset in seconds (accounts for Iran DST)."""
    offset = now_iran().utcoffset()
    return int(offset.total_seconds()) if offset else 12600
