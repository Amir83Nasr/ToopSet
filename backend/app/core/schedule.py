"""Schedule day-boundary rules shared by slots, the weekly template and views.

A slot belongs to the operational day whose night it opens: slots starting
between 00:00 and ``SLOT_DAY_CUTOFF`` belong to the previous calendar day, so
a 00:00-01:30 sans shows up at the end of the previous day's program (both in
day-filtered slot lists and in the weekly schedule editor).

Weekly-template items follow the same rule, expressed per row day ``D``:

* a night item (``start < SLOT_DAY_CUTOFF``) materialises on calendar day
  ``D + 1`` — it is the tail of D's night;
* ``end <= start`` means the slot crosses midnight into the next day, so the
  slot duration is measured modulo 24h and the end lands on the day after the
  materialised start (e.g. ``22:30 -> 00:00`` is a 90-minute slot).

Together this round-trips: applying a template and bootstrapping a template
from existing slots map a slot to the same row day both ways.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta

# Slots starting before this time belong to the previous operational day.
SLOT_DAY_CUTOFF = time(3, 0)

_CUTOFF_MINUTES = 3 * 60
_DAY_MINUTES = 24 * 60


def parse_hhmm(value: str) -> time:
    """Parse an ``HH:MM`` string (validated upstream by pydantic)."""
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def is_night_start(value: time) -> bool:
    """True when a slot starting at this time belongs to the previous day."""
    return value < SLOT_DAY_CUTOFF


def slot_operational_day(local_start: datetime) -> date:
    """The display/template day a slot with this Iran-local start belongs to."""
    day = local_start.date()
    return day - timedelta(days=1) if is_night_start(local_start.time()) else day


def day_window(day: date) -> tuple[datetime, datetime]:
    """Iran-local [day 03:00, day+1 03:00) window that operational day covers."""
    start = datetime.combine(day, SLOT_DAY_CUTOFF)
    return start, start + timedelta(days=1)


def _minutes_since_cutoff(value: str) -> int:
    parsed = parse_hhmm(value)
    return (parsed.hour * 60 + parsed.minute - _CUTOFF_MINUTES) % _DAY_MINUTES


def item_offset_minutes(start: str) -> int:
    """Minutes after 03:00 when the item starts on its operational day.

    Sorting by this offset — not by the HH:MM string — yields true start order
    once night items and midnight wraps are in play, which is what overlap
    sweeps require.
    """
    return _minutes_since_cutoff(start)


def item_span_minutes(start: str, end: str) -> int:
    """Slot duration in minutes; ``end <= start`` wraps past midnight."""
    start_t, end_t = parse_hhmm(start), parse_hhmm(end)
    start_min = start_t.hour * 60 + start_t.minute
    end_min = end_t.hour * 60 + end_t.minute
    return (end_min - start_min) % _DAY_MINUTES


def item_window(day: date, start: str, end: str) -> tuple[datetime, datetime]:
    """Materialise a template item on row ``day`` into Iran-local datetimes."""
    start_t, end_t = parse_hhmm(start), parse_hhmm(end)
    base = day + timedelta(days=1) if is_night_start(start_t) else day
    slot_start = datetime.combine(base, start_t)
    slot_end = datetime.combine(base + timedelta(days=1) if end_t <= start_t else base, end_t)
    return slot_start, slot_end


def items_overlap(start_a: str, end_a: str, start_b: str, end_b: str) -> bool:
    """Whether two items on the same row day overlap on the 03:00-anchored timeline."""
    offset_a, offset_b = _minutes_since_cutoff(start_a), _minutes_since_cutoff(start_b)
    span_a, span_b = item_span_minutes(start_a, end_a), item_span_minutes(start_b, end_b)
    return offset_a < offset_b + span_b and offset_b < offset_a + span_a
