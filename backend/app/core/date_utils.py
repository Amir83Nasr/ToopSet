from datetime import datetime, time

import jdatetime
from fastapi import HTTPException, status

from app.core.timezone import iran_to_utc


def parse_date_filter(date_str: str) -> datetime:
    """
    Attempts to parse a date string. If it contains '/', it treats it as Jalali 'YYYY/MM/DD'.
    Otherwise, it treats it as an ISO Gregorian date.
    Returns start of day (00:00:00).
    """
    try:
        if "/" in date_str:
            y, m, d = map(int, date_str.split("/"))
            gregorian_date = jdatetime.date(y, m, d).togregorian()
            return iran_to_utc(datetime.combine(gregorian_date, time.min))
        return iran_to_utc(datetime.fromisoformat(date_str))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="تاریخ واردشده معتبر نیست",
        ) from exc


def parse_date_filter_end(date_str: str) -> datetime:
    """
    Like parse_date_filter but returns end of day (23:59:59.999999).
    Use for date_to filters so the entire end day is included.
    """
    try:
        if "/" in date_str:
            y, m, d = map(int, date_str.split("/"))
            gregorian_date = jdatetime.date(y, m, d).togregorian()
            return iran_to_utc(datetime.combine(gregorian_date, time.max))
        dt = datetime.fromisoformat(date_str)
        return iran_to_utc(dt.replace(hour=23, minute=59, second=59, microsecond=999999))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="تاریخ واردشده معتبر نیست",
        ) from exc
