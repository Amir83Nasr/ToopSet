from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_optional
from app.core.database import get_db
from app.core.timezone import iran_to_utc, now_iran, now_utc, utc_to_iran
from app.models.booking import BookingSource, BookingStatus
from app.models.time_slot import SlotStatus
from app.models.user import User
from app.models.vendor import Vendor
from app.repositories.booking_repo import BookingRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.repositories.vendor_repo import VendorRepo
from app.repositories.weekly_schedule_repo import WeeklyScheduleRepo
from app.schemas.time_slot import (
    TimeSlotCreate,
    TimeSlotDetailResponse,
    TimeSlotGenerate,
    TimeSlotGenerateResponse,
    TimeSlotListResponse,
    TimeSlotResponse,
    TimeSlotUpdate,
    WeeklyScheduleApply,
    WeeklyScheduleApplyResponse,
    WeeklyScheduleConflict,
    WeeklyScheduleItem,
    WeeklyScheduleTemplateResponse,
)
from app.services.cache_service import (
    cache_slot_list,
    get_cached_slot_list,
    invalidate_admin_list_cache,
    invalidate_slot_list,
)

# Index in frontend: 0=شنبه(Sat) … 6=جمعه(Fri)
# Python weekday(): Mon=0 … Sun=6
_WEEKDAY_MAP = [5, 6, 0, 1, 2, 3, 4]
PUBLIC_SLOT_VISIBILITY_DAYS = 14


def _add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _next_complete_week_start(value: date) -> date:
    days_until_saturday = (5 - value.weekday()) % 7
    if days_until_saturday == 0:
        days_until_saturday = 7
    return value + timedelta(days=days_until_saturday)


class TimeSlotService:
    def __init__(self, db: AsyncSession, current_user: User | None) -> None:
        self.booking_repo = BookingRepo(db)
        self.repo = TimeSlotRepo(db)
        self.vendor_repo = VendorRepo(db)
        self.weekly_schedule_repo = WeeklyScheduleRepo(db)
        self.current_user = current_user

    def _can_manage_vendor(self, vendor: Vendor) -> bool:
        return bool(
            self.current_user
            and (self.current_user.role == "admin" or vendor.manager_id == self.current_user.id)
        )

    def _require_vendor_manager(self, vendor: Vendor) -> None:
        if not self._can_manage_vendor(vendor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="شما به این مجموعه دسترسی ندارید",
            )

    def _require_active_vendor_for_slot_management(self, vendor: Vendor) -> None:
        if not vendor.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="تا قبل از تأیید ادمین امکان مدیریت سانس‌های این مجموعه وجود ندارد",
            )

    def _public_slot_window(self) -> tuple[datetime, datetime]:
        start = now_utc()
        return start, start + timedelta(days=PUBLIC_SLOT_VISIBILITY_DAYS)

    async def _weekly_schedule_minimum_date(self, vendor_id: int) -> tuple[date, date | None]:
        today = now_iran().date()
        latest_start = await self.booking_repo.get_latest_active_online_slot_start(
            vendor_id, now=now_utc()
        )
        last_booking_date = utc_to_iran(latest_start).date() if latest_start else None
        minimum_date = today + timedelta(days=1)
        if last_booking_date:
            minimum_date = max(minimum_date, last_booking_date + timedelta(days=1))
        return minimum_date, last_booking_date

    @staticmethod
    def _to_response(slot, vendor: Vendor | None = None) -> TimeSlotResponse:
        vendor = vendor or slot.vendor
        return TimeSlotResponse(
            id=slot.id,
            vendor_id=slot.vendor_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            base_price=float(slot.base_price),
            ball_price=float(vendor.ball_price or 0) if vendor else 0,
            ball_available=bool(vendor and vendor.ball_available),
            gender=slot.gender,
            status=slot.status,
            is_reserved=slot.is_reserved,
            version=slot.version,
        )

    async def _annotate_own_pending_bookings(self, responses: list[TimeSlotResponse]) -> None:
        """Flag reserving slots held by the current user's pending_payment booking.

        Must run after the shared cache read/write so cached payloads stay anonymous.
        """
        user = self.current_user
        if user is None:
            return
        reserving_ids = [r.id for r in responses if r.status == SlotStatus.RESERVING]
        if not reserving_ids:
            return
        bookings = await self.booking_repo.list_active_by_slot_ids(reserving_ids)
        by_slot = {b.slot_id: b for b in bookings}
        for response in responses:
            booking = by_slot.get(response.id)
            if (
                response.status == SlotStatus.RESERVING
                and booking is not None
                and booking.user_id == user.id
                and booking.status == BookingStatus.PENDING_PAYMENT
            ):
                response.reserved_by_me = True
                response.my_booking_id = booking.id

    async def list_slots(
        self,
        vendor_id: int,
        *,
        after_id: int | None = None,
        date: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> TimeSlotListResponse:
        vendor = await self.vendor_repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        if not vendor.is_active and not self._can_manage_vendor(vendor):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        can_manage = self._can_manage_vendor(vendor)
        start_from: datetime | None = None
        start_until: datetime | None = None
        if not can_manage:
            start_from, start_until = self._public_slot_window()

        # Track whether response came from Redis (for X-Cache header)
        self._from_cache = False

        # Try Redis cache (first page only for simplicity, not for cursor requests)
        if not can_manage and after_id is None and skip == 0 and limit <= 50:
            cached = await get_cached_slot_list(vendor_id, date=date)
            if cached is not None:
                self._from_cache = True
                result = TimeSlotListResponse(slots=cached, total=len(cached))  # type: ignore[arg-type]
                await self._annotate_own_pending_bookings(result.slots)
                return result

        slots, total = await self.repo.list_by_vendor(
            vendor_id,
            after_id=after_id,
            date=date,
            start_from=start_from,
            start_until=start_until,
            skip=skip,
            limit=limit,
        )
        responses = [self._to_response(s, vendor) for s in slots]
        serialised = [response.model_dump(mode="json") for response in responses]

        # Warm cache for the common case (first page, no offset)
        if not can_manage and after_id is None and skip == 0 and limit <= 50:
            await cache_slot_list(vendor_id, serialised, date=date)

        # Annotate after caching — ownership flags are per-user and must not be cached.
        await self._annotate_own_pending_bookings(responses)

        next_cursor = None
        if slots and len(slots) == limit:
            from app.core.pagination import encode_cursor

            next_cursor = encode_cursor(slots[-1].id)
        return TimeSlotListResponse(
            slots=responses,
            total=total,
            next_cursor=next_cursor,
        )

    async def get_slot(self, slot_id: int) -> TimeSlotDetailResponse:
        slot = await self.repo.get_by_id(slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        vendor = slot.vendor
        if vendor and not vendor.is_active and not self._can_manage_vendor(vendor):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if vendor and not self._can_manage_vendor(vendor):
            start_from, start_until = self._public_slot_window()
            if slot.start_time < start_from or slot.start_time > start_until:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        return TimeSlotDetailResponse(
            id=slot.id,
            vendor_id=slot.vendor_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            base_price=float(slot.base_price),
            ball_price=float(vendor.ball_price or 0) if vendor else 0,
            ball_available=bool(vendor and vendor.ball_available),
            gender=slot.gender,
            status=slot.status,
            is_reserved=slot.is_reserved,
            version=slot.version,
            vendor_name=vendor.name if vendor else "",
            vendor_address=vendor.address if vendor else "",
            vendor_sport_type=vendor.sport_types[0] if vendor and vendor.sport_types else "",
        )

    async def create_slot(self, vendor_id: int, data: TimeSlotCreate) -> TimeSlotResponse:
        if data.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="شناسه مجموعه در مسیر و بدنه درخواست یکسان نیست",
            )
        vendor = await self.vendor_repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        self._require_vendor_manager(vendor)
        self._require_active_vendor_for_slot_management(vendor)
        if data.start_time >= data.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="زمان شروع باید قبل از زمان پایان باشد",
            )

        await self.repo.lock_vendor_schedule(vendor_id)
        # Convert Iran-local input to UTC for storage
        slot_data = data.model_dump()
        slot_data["start_time"] = iran_to_utc(data.start_time)
        slot_data["end_time"] = iran_to_utc(data.end_time)
        slot_data["status"] = SlotStatus.OPEN

        if await self.repo.has_overlap(vendor_id, slot_data["start_time"], slot_data["end_time"]):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این بازه زمانی با سانس دیگری هم‌پوشانی دارد",
            )

        slot = await self.repo.create(slot_data)
        await invalidate_slot_list(data.vendor_id)
        await invalidate_admin_list_cache("vendors")
        return self._to_response(slot, vendor)

    async def update_slot(self, slot_id: int, data: TimeSlotUpdate) -> TimeSlotResponse:
        slot = await self.repo.get_by_id(slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if slot.vendor:
            self._require_vendor_manager(slot.vendor)
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="امکان ویرایش سانس رزرو شده وجود ندارد"
            )
        await self.repo.lock_vendor_schedule(slot.vendor_id)
        update_data = data.model_dump(exclude_none=True)
        if "start_time" in update_data:
            update_data["start_time"] = iran_to_utc(update_data["start_time"])
        if "end_time" in update_data:
            update_data["end_time"] = iran_to_utc(update_data["end_time"])
        effective_start = update_data.get("start_time", slot.start_time)
        effective_end = update_data.get("end_time", slot.end_time)
        if effective_start >= effective_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="زمان شروع باید قبل از زمان پایان باشد",
            )
        if await self.repo.has_overlap(
            slot.vendor_id,
            effective_start,
            effective_end,
            exclude_slot_id=slot.id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این بازه زمانی با سانس دیگری هم‌پوشانی دارد",
            )
        if update_data.get("status") in (SlotStatus.RESERVED, SlotStatus.RESERVING):
            update_data["is_reserved"] = True
        elif update_data.get("status") in (
            SlotStatus.OPEN,
            SlotStatus.CLOSED,
            SlotStatus.BLOCKED,
            SlotStatus.DISABLED,
        ):
            update_data["is_reserved"] = False
        updated = await self.repo.update(slot, update_data)
        await invalidate_slot_list(updated.vendor_id)
        await invalidate_admin_list_cache("vendors")
        return self._to_response(updated, slot.vendor)

    async def update_vendor_slot(
        self, vendor_id: int, slot_id: int, data: TimeSlotUpdate
    ) -> TimeSlotResponse:
        slot = await self.repo.get_by_id(slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if slot.vendor_id != vendor_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        if slot.vendor:
            self._require_vendor_manager(slot.vendor)
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="امکان ویرایش سانس رزرو شده وجود ندارد"
            )
        await self.repo.lock_vendor_schedule(vendor_id)
        update_data = data.model_dump(exclude_none=True)
        if "start_time" in update_data:
            update_data["start_time"] = iran_to_utc(update_data["start_time"])
        if "end_time" in update_data:
            update_data["end_time"] = iran_to_utc(update_data["end_time"])
        effective_start = update_data.get("start_time", slot.start_time)
        effective_end = update_data.get("end_time", slot.end_time)
        if effective_start >= effective_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="زمان شروع باید قبل از زمان پایان باشد",
            )
        if await self.repo.has_overlap(
            vendor_id,
            effective_start,
            effective_end,
            exclude_slot_id=slot.id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="این بازه زمانی با سانس دیگری هم‌پوشانی دارد",
            )
        if update_data.get("status") in (SlotStatus.RESERVED, SlotStatus.RESERVING):
            update_data["is_reserved"] = True
        elif update_data.get("status") in (
            SlotStatus.OPEN,
            SlotStatus.CLOSED,
            SlotStatus.BLOCKED,
            SlotStatus.DISABLED,
        ):
            update_data["is_reserved"] = False
        updated = await self.repo.update(slot, update_data)
        await invalidate_slot_list(updated.vendor_id)
        await invalidate_admin_list_cache("vendors")
        return self._to_response(updated, slot.vendor)

    async def generate_slots(
        self, vendor_id: int, data: TimeSlotGenerate
    ) -> TimeSlotGenerateResponse:
        vendor = await self.vendor_repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        self._require_vendor_manager(vendor)
        self._require_active_vendor_for_slot_management(vendor)

        await self.repo.lock_vendor_schedule(vendor_id)

        to_create: list[dict] = []
        skipped = 0
        current = data.date_from
        while current <= data.date_to:
            py_weekday = current.weekday()
            try:
                persian_idx = _WEEKDAY_MAP.index(py_weekday)
            except ValueError:
                current += timedelta(days=1)
                continue
            if persian_idx not in data.days_of_week:
                current += timedelta(days=1)
                continue

            for template in data.templates:
                start_dt = datetime.combine(
                    current, datetime.strptime(template.start_time, "%H:%M").time()
                )
                end_dt = datetime.combine(
                    current, datetime.strptime(template.end_time, "%H:%M").time()
                )

                if start_dt >= end_dt:
                    skipped += 1
                    continue

                # Convert Iran-local slot times to UTC for storage
                start_dt_utc = iran_to_utc(start_dt)
                end_dt_utc = iran_to_utc(end_dt)

                overlaps_planned = any(
                    item["start_time"] < end_dt_utc and item["end_time"] > start_dt_utc
                    for item in to_create
                )
                if overlaps_planned or await self.repo.has_overlap(
                    vendor_id, start_dt_utc, end_dt_utc
                ):
                    skipped += 1
                    continue

                to_create.append(
                    {
                        "vendor_id": vendor_id,
                        "start_time": start_dt_utc,
                        "end_time": end_dt_utc,
                        "base_price": template.base_price,
                        "gender": template.gender,
                        "status": SlotStatus.OPEN,
                    }
                )

            current += timedelta(days=1)

        if not to_create:
            return TimeSlotGenerateResponse(created=0, skipped=skipped, total=0, slots=[])

        created_slots = await self.repo.create_batch(to_create)
        await invalidate_slot_list(vendor_id)
        await invalidate_admin_list_cache("vendors")

        return TimeSlotGenerateResponse(
            created=len(created_slots),
            skipped=skipped,
            total=len(created_slots),
            slots=[self._to_response(s, vendor) for s in created_slots],
        )

    async def get_weekly_schedule_template(self, vendor_id: int) -> WeeklyScheduleTemplateResponse:
        vendor = await self.vendor_repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        self._require_vendor_manager(vendor)

        minimum_date, last_booking_date = await self._weekly_schedule_minimum_date(vendor_id)

        latest = await self.weekly_schedule_repo.get_latest(vendor_id)
        if latest:
            return WeeklyScheduleTemplateResponse(
                source="saved_version",
                version_id=latest.id,
                effective_from=latest.effective_from,
                effective_until=latest.effective_until,
                minimum_effective_date=minimum_date,
                last_online_booking_date=last_booking_date,
                ball_available=vendor.ball_available,
                ball_price=vendor.ball_price,
                items=[
                    WeeklyScheduleItem(
                        day_of_week=item.day_of_week,
                        start_time=item.start_time.strftime("%H:%M"),
                        end_time=item.end_time.strftime("%H:%M"),
                        base_price=item.base_price,
                        gender=item.gender,
                    )
                    for item in latest.items
                ],
            )

        # Existing installations do not have a saved template yet. Bootstrap the
        # editor from the nearest complete future week, never from a partial week.
        week_start = _next_complete_week_start(now_iran().date())
        range_start = iran_to_utc(datetime.combine(week_start, datetime.min.time()))
        range_end = iran_to_utc(
            datetime.combine(week_start + timedelta(days=7), datetime.min.time())
        )
        slots = await self.weekly_schedule_repo.list_slots_in_range(
            vendor_id, range_start, range_end
        )
        return WeeklyScheduleTemplateResponse(
            source="upcoming_week",
            minimum_effective_date=minimum_date,
            last_online_booking_date=last_booking_date,
            ball_available=vendor.ball_available,
            ball_price=vendor.ball_price,
            items=[
                WeeklyScheduleItem(
                    day_of_week=_WEEKDAY_MAP.index(utc_to_iran(slot.start_time).weekday()),
                    start_time=utc_to_iran(slot.start_time).strftime("%H:%M"),
                    end_time=utc_to_iran(slot.end_time).strftime("%H:%M"),
                    base_price=slot.base_price,
                    gender=slot.gender,
                )
                for slot in slots
            ],
        )

    async def apply_weekly_schedule(
        self, vendor_id: int, data: WeeklyScheduleApply
    ) -> WeeklyScheduleApplyResponse:
        vendor = await self.vendor_repo.get_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        self._require_vendor_manager(vendor)
        self._require_active_vendor_for_slot_management(vendor)

        await self.repo.lock_vendor_schedule(vendor_id)

        effective_until = _add_months(data.effective_from, data.duration_months)
        range_start = iran_to_utc(datetime.combine(data.effective_from, datetime.min.time()))
        range_end = iran_to_utc(datetime.combine(effective_until, datetime.min.time()))
        existing = await self.repo.list_range_for_update(vendor_id, range_start, range_end)

        # Recalculate after locking the affected slots. If a user completed a
        # reservation while the editor was open, the new booking is included.
        minimum_date, last_booking_date = await self._weekly_schedule_minimum_date(vendor_id)
        if data.effective_from < minimum_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "code": "schedule_before_last_online_booking",
                    "message": "تاریخ شروع باید بعد از آخرین رزرو کاربر عادی باشد",
                    "minimum_date": minimum_date.isoformat(),
                    "last_online_booking_date": (
                        last_booking_date.isoformat() if last_booking_date else None
                    ),
                },
            )

        desired: dict[tuple[datetime, datetime], dict] = {}
        current = data.effective_from
        while current < effective_until:
            persian_day = _WEEKDAY_MAP.index(current.weekday())
            for item in data.items:
                if item.day_of_week != persian_day:
                    continue
                start = iran_to_utc(
                    datetime.combine(current, datetime.strptime(item.start_time, "%H:%M").time())
                )
                end = iran_to_utc(
                    datetime.combine(current, datetime.strptime(item.end_time, "%H:%M").time())
                )
                desired[(start, end)] = {
                    "vendor_id": vendor_id,
                    "start_time": start,
                    "end_time": end,
                    "base_price": item.base_price,
                    "gender": item.gender,
                    "status": SlotStatus.OPEN,
                }
            current += timedelta(days=1)

        active_bookings = await self.booking_repo.list_active_by_slot_ids(
            [slot.id for slot in existing], for_update=True
        )
        booking_by_slot = {booking.slot_id: booking for booking in active_bookings}

        blocking_conflicts: list[WeeklyScheduleConflict] = []
        manager_confirmation_conflicts: list[WeeklyScheduleConflict] = []
        preserved_conflicts: list[WeeklyScheduleConflict] = []
        manager_bookings_to_delete = []
        update_plan: list[tuple] = []
        delete_plan: list = []
        unchanged = 0
        preserved_reserved = 0

        for slot in existing:
            key = (slot.start_time, slot.end_time)
            target = desired.pop(key, None)
            booking = booking_by_slot.get(slot.id)
            is_protected = bool(slot.is_reserved or booking)
            local_start = utc_to_iran(slot.start_time)

            if is_protected:
                if target is None:
                    conflict = WeeklyScheduleConflict(
                        slot_id=slot.id,
                        date=local_start.date(),
                        start_time=slot.start_time,
                        end_time=slot.end_time,
                        booking_id=booking.id if booking else None,
                        booking_source=booking.source.value if booking and booking.source else None,
                        reason=(
                            "این رزرو دستی سالن‌دار با تأیید شما حذف می‌شود"
                            if booking and booking.source == BookingSource.MANAGER_MANUAL
                            else "این سانس توسط کاربر رزرو شده و قابل حذف یا جابه‌جایی نیست"
                        ),
                    )
                    if booking and booking.source == BookingSource.MANAGER_MANUAL:
                        if data.confirm_manager_booking_deletions:
                            manager_bookings_to_delete.append(booking)
                            delete_plan.append(slot)
                        else:
                            manager_confirmation_conflicts.append(conflict)
                    else:
                        blocking_conflicts.append(conflict)
                else:
                    preserved_reserved += 1
                    if (
                        Decimal(str(slot.base_price)) != Decimal(str(target["base_price"]))
                        or slot.gender != target["gender"]
                    ):
                        preserved_conflicts.append(
                            WeeklyScheduleConflict(
                                slot_id=slot.id,
                                date=local_start.date(),
                                start_time=slot.start_time,
                                end_time=slot.end_time,
                                booking_id=booking.id if booking else None,
                                booking_source=(
                                    booking.source.value if booking and booking.source else None
                                ),
                                reason="سانس رزروشده حفظ شد و قیمت/مشخصات آن تغییر نکرد",
                            )
                        )
                continue

            if target is None:
                delete_plan.append(slot)
            elif (
                Decimal(str(slot.base_price)) != Decimal(str(target["base_price"]))
                or slot.gender != target["gender"]
                or slot.status != SlotStatus.OPEN
            ):
                update_plan.append((slot, target))
            else:
                unchanged += 1

        if blocking_conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "protected_booking_conflict",
                    "message": "برنامه جدید با رزرو کاربر یا یک سانس قفل‌شده تداخل دارد",
                    "conflicts": [item.model_dump(mode="json") for item in blocking_conflicts],
                },
            )

        if manager_confirmation_conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "manager_booking_deletion_confirmation_required",
                    "message": "تغییر ساعت‌ها باعث حذف رزروهای دستی سالن‌دار می‌شود",
                    "manager_booking_count": len(manager_confirmation_conflicts),
                    "conflicts": [
                        item.model_dump(mode="json") for item in manager_confirmation_conflicts
                    ],
                },
            )

        await self.booking_repo.delete_by_ids(
            [booking.id for booking in manager_bookings_to_delete]
        )
        for slot in delete_plan:
            await self.repo.delete(slot)
        for slot, target in update_plan:
            await self.repo.update(
                slot,
                {
                    "base_price": target["base_price"],
                    "gender": target["gender"],
                    "status": SlotStatus.OPEN,
                    "is_reserved": False,
                },
            )
        created = await self.repo.create_batch(list(desired.values())) if desired else []
        await self.weekly_schedule_repo.create_version(
            vendor_id=vendor_id,
            effective_until=effective_until,
            data=data,
            created_by_id=self.current_user.id if self.current_user else None,
        )
        await invalidate_slot_list(vendor_id)
        await invalidate_admin_list_cache("vendors")

        return WeeklyScheduleApplyResponse(
            effective_from=data.effective_from,
            effective_until=effective_until,
            created=len(created),
            updated=len(update_plan),
            deleted=len(delete_plan),
            unchanged=unchanged,
            preserved_reserved=preserved_reserved,
            deleted_manager_reservations=len(manager_bookings_to_delete),
            conflicts=preserved_conflicts,
        )


async def get_time_slot_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeSlotService:
    return TimeSlotService(db=db, current_user=current_user)


async def get_time_slot_service_public(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> TimeSlotService:
    return TimeSlotService(db=db, current_user=current_user)
