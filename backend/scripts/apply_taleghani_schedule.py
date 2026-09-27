"""Apply the 11-sans daily schedule for vendor 35 (سالن ورزشی شهید طالقانی).

Requires the midnight-wrap weekly-schedule support (migration 0043+) to be
deployed: the wrap item 22:30->00:00 and the night item 00:00->01:30 are
first-class template items now, so this is a plain apply + verify with no
special post-pass. Re-run it (or re-apply from the dashboard editor, which now
round-trips the same template) whenever the window needs extending.
"""

import asyncio
import calendar
import json
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.schedule import SLOT_DAY_CUTOFF
from app.core.timezone import iran_to_utc, now_utc, utc_to_iran
from app.models.time_slot import SlotGender, SlotStatus, TimeSlot
from app.models.user import User
from app.schemas.time_slot import WeeklyScheduleApply, WeeklyScheduleItem
from app.services.cache_service import (
    invalidate_admin_list_cache,
    invalidate_response_cache,
    invalidate_slot_list,
)
from app.services.time_slot_service import TimeSlotService

VENDOR_ID = 35
MANAGER_ID = 136
PRICE = Decimal("600000.00")
DURATION_MONTHS = 6
# None = start from tomorrow (the earliest date the service allows)
EFFECTIVE_FROM: date | None = None

# 11 x 90-minute sans per day: 09:00..22:30 plus the wrapped 22:30->00:00 and
# the night tail 00:00->01:30 that belongs to the same row day. 11 x 7 = 77
# items, within the 84-item weekly template cap.
BASE_TIMES = [
    ("09:00", "10:30"),
    ("10:30", "12:00"),
    ("12:00", "13:30"),
    ("13:30", "15:00"),
    ("15:00", "16:30"),
    ("16:30", "18:00"),
    ("18:00", "19:30"),
    ("19:30", "21:00"),
    ("21:00", "22:30"),
    ("22:30", "00:00"),
    ("00:00", "01:30"),
]
EXPECTED_CHAIN = [
    (time(9, 0), time(10, 30)),
    (time(10, 30), time(12, 0)),
    (time(12, 0), time(13, 30)),
    (time(13, 30), time(15, 0)),
    (time(15, 0), time(16, 30)),
    (time(16, 30), time(18, 0)),
    (time(18, 0), time(19, 30)),
    (time(19, 30), time(21, 0)),
    (time(21, 0), time(22, 30)),
    (time(22, 30), time(0, 0)),
    (time(0, 0), time(1, 30)),
]


def add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


async def main() -> None:
    from app.core.timezone import now_iran

    effective_from = EFFECTIVE_FROM or (now_iran().date() + timedelta(days=1))
    effective_until = add_months(effective_from, DURATION_MONTHS)
    # Operational window: [from 03:00, until 03:00) Iran time
    range_start = iran_to_utc(datetime.combine(effective_from, SLOT_DAY_CUTOFF))
    range_end = iran_to_utc(datetime.combine(effective_until, SLOT_DAY_CUTOFF))
    print(f"window: {effective_from} .. {effective_until} UTC {range_start} .. {range_end}")

    async with async_session_factory() as db:
        try:
            manager = await db.get(User, MANAGER_ID)
            assert manager is not None and manager.role.value == "manager" and manager.is_active
            service = TimeSlotService(db=db, current_user=manager)

            items = [
                WeeklyScheduleItem(
                    day_of_week=day,
                    start_time=start,
                    end_time=end,
                    base_price=PRICE,
                    gender=SlotGender.MALE,
                )
                for day in range(7)
                for start, end in BASE_TIMES
            ]
            payload = WeeklyScheduleApply(
                effective_from=effective_from,
                duration_months=DURATION_MONTHS,
                items=items,
                confirm_manager_booking_deletions=True,
            )
            result = await service.apply_weekly_schedule(VENDOR_ID, payload)
            print(
                "apply_weekly_schedule:",
                json.dumps(
                    {
                        "effective_from": str(result.effective_from),
                        "effective_until": str(result.effective_until),
                        "created": result.created,
                        "updated": result.updated,
                        "deleted": result.deleted,
                        "unchanged": result.unchanged,
                        "preserved_reserved": result.preserved_reserved,
                        "deleted_manager_reservations": result.deleted_manager_reservations,
                        "conflicts": len(result.conflicts),
                    }
                ),
            )

            await invalidate_slot_list(VENDOR_ID)
            await invalidate_admin_list_cache("vendors")
            await invalidate_response_cache("vendor:detail")

            # --- verification (inside the transaction, before commit)
            slots = (
                (
                    await db.execute(
                        select(TimeSlot)
                        .where(
                            TimeSlot.vendor_id == VENDOR_ID,
                            TimeSlot.start_time >= range_start,
                            TimeSlot.start_time < range_end,
                        )
                        .order_by(TimeSlot.start_time)
                    )
                )
                .scalars()
                .all()
            )

            n_days = (effective_until - effective_from).days
            expected = n_days * 11
            assert len(slots) == expected, f"expected {expected} slots in window, got {len(slots)}"

            by_day: dict[date, list[TimeSlot]] = {}
            for slot in slots:
                local_start = utc_to_iran(slot.start_time)
                row_day = local_start.date()
                if local_start.time() < SLOT_DAY_CUTOFF:
                    row_day -= timedelta(days=1)
                by_day.setdefault(row_day, []).append(slot)
            assert set(by_day) == {effective_from + timedelta(days=i) for i in range(n_days)}, (
                "day coverage mismatch"
            )

            problems = []
            for day, day_slots in sorted(by_day.items()):
                if len(day_slots) != 11:
                    problems.append(f"{day}: {len(day_slots)} slots")
                    continue
                day_slots.sort(key=lambda s: s.start_time)
                for prev, cur in zip(day_slots, day_slots[1:]):
                    if prev.end_time > cur.start_time:
                        problems.append(f"{day}: overlap {utc_to_iran(prev.end_time)}")
                for slot, (start_t, end_t) in zip(day_slots, EXPECTED_CHAIN):
                    local_start = utc_to_iran(slot.start_time)
                    local_end = utc_to_iran(slot.end_time)
                    if (local_start.hour, local_start.minute) != (start_t.hour, start_t.minute):
                        problems.append(f"{day}: start {local_start:%H:%M} != {start_t}")
                    if (local_end.hour, local_end.minute) != (end_t.hour, end_t.minute):
                        problems.append(f"{day}: end {local_end:%H:%M} != {end_t}")
                    if local_end.date() != local_start.date() + (
                        timedelta(days=1) if end_t <= start_t else timedelta(days=0)
                    ):
                        problems.append(f"{day}: {local_start:%H:%M} end date wrong")
                    if (
                        slot.base_price != PRICE
                        or slot.gender != SlotGender.MALE
                        or slot.status != SlotStatus.OPEN
                        or slot.is_reserved
                    ):
                        problems.append(f"{day} {local_start:%H:%M}: bad price/gender/status")
            assert not problems, "verification failed:\n" + "\n".join(problems[:30])

            await db.commit()
            print("COMMITTED OK")

            future = (
                (
                    await db.execute(
                        select(TimeSlot).where(
                            TimeSlot.vendor_id == VENDOR_ID, TimeSlot.start_time >= now_utc()
                        )
                    )
                )
                .scalars()
                .all()
            )
            print(f"post-commit future slot count: {len(future)}")
        except Exception as exc:
            await db.rollback()
            print(f"ROLLED BACK — nothing written: {exc!r}")
            raise


asyncio.run(main())
