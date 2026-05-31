import jdatetime
from datetime import datetime, time

def parse_date_filter(date_str: str) -> datetime:
    """
    Attempts to parse a date string. If it contains '/', it treats it as Jalali 'YYYY/MM/DD'.
    Otherwise, it treats it as an ISO Gregorian date.
    """
    if '/' in date_str:
        y, m, d = map(int, date_str.split('/'))
        gregorian_date = jdatetime.date(y, m, d).togregorian()
        return datetime.combine(gregorian_date, time.min)
    return datetime.fromisoformat(date_str)
