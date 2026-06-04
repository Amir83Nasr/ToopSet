from datetime import datetime, time

import jdatetime


def parse_date_filter(date_str: str) -> datetime:
    """
    Attempts to parse a date string. If it contains '/', it treats it as Jalali 'YYYY/MM/DD'.
    Otherwise, it treats it as an ISO Gregorian date.
    Returns start of day (00:00:00).
    """
    if "/" in date_str:
        y, m, d = map(int, date_str.split("/"))
        gregorian_date = jdatetime.date(y, m, d).togregorian()
        return datetime.combine(gregorian_date, time.min)
    return datetime.fromisoformat(date_str)


def parse_date_filter_end(date_str: str) -> datetime:
    """
    Like parse_date_filter but returns end of day (23:59:59.999999).
    Use for date_to filters so the entire end day is included.
    """
    if "/" in date_str:
        y, m, d = map(int, date_str.split("/"))
        gregorian_date = jdatetime.date(y, m, d).togregorian()
        return datetime.combine(gregorian_date, time.max)
    dt = datetime.fromisoformat(date_str)
    return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
