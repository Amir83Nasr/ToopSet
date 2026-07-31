from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking, BookingSource, BookingStatus
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.models.vendor import Vendor

ACTIVE_SLOT_STATUSES = (
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.CONFIRMED,
    BookingStatus.PENDING_CANCELLATION,
)


class BookingRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_user(
        self,
        user_id: int,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        status_filter: str | None = None,
        category: str | None = None,
        search: str | None = None,
        now: datetime | None = None,
    ) -> tuple[list[Booking], int]:
        query = (
            select(Booking)
            .options(selectinload(Booking.slot).selectinload(TimeSlot.vendor))
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .where(Booking.user_id == user_id)
            .order_by(Booking.id.desc())
        )
        count_q = (
            select(func.count(Booking.id))
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .where(Booking.user_id == user_id)
        )

        if after_id is not None:
            query = query.where(Booking.id < after_id)

        if status_filter:
            query = query.where(Booking.status == status_filter)
            count_q = count_q.where(Booking.status == status_filter)

        cancelled_statuses = (
            BookingStatus.CANCELLED,
            BookingStatus.TRANSFERRED,
            BookingStatus.EXPIRED,
        )
        reference = now or datetime.now().astimezone()
        if category == "cancelled":
            query = query.where(Booking.status.in_(cancelled_statuses))
            count_q = count_q.where(Booking.status.in_(cancelled_statuses))
        elif category == "past":
            query = query.where(
                Booking.status.notin_(cancelled_statuses), TimeSlot.end_time <= reference
            )
            count_q = count_q.where(
                Booking.status.notin_(cancelled_statuses), TimeSlot.end_time <= reference
            )
        elif category == "current":
            query = query.where(
                Booking.status.notin_(cancelled_statuses), TimeSlot.end_time > reference
            )
            count_q = count_q.where(
                Booking.status.notin_(cancelled_statuses), TimeSlot.end_time > reference
            )

        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(Vendor.name.ilike(pattern))
            count_q = count_q.where(Vendor.name.ilike(pattern))

        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        count_result = await self.db.execute(count_q)

        bookings = list(result.scalars().all())
        total = count_result.scalar_one()
        return bookings, total

    async def count_categories_by_user(self, user_id: int, *, now: datetime) -> dict[str, int]:
        cancelled_statuses = (
            BookingStatus.CANCELLED,
            BookingStatus.TRANSFERRED,
            BookingStatus.EXPIRED,
        )
        stmt = (
            select(
                func.count(Booking.id)
                .filter(
                    Booking.status.notin_(cancelled_statuses),
                    TimeSlot.end_time > now,
                )
                .label("current_count"),
                func.count(Booking.id)
                .filter(
                    Booking.status.notin_(cancelled_statuses),
                    TimeSlot.end_time <= now,
                )
                .label("past_count"),
                func.count(Booking.id)
                .filter(Booking.status.in_(cancelled_statuses))
                .label("cancelled_count"),
            )
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .where(Booking.user_id == user_id)
        )
        row = (await self.db.execute(stmt)).one()
        return {
            "current": int(row.current_count or 0),
            "past": int(row.past_count or 0),
            "cancelled": int(row.cancelled_count or 0),
        }

    async def get_by_id(self, booking_id: int, *, for_update: bool = False) -> Booking | None:
        stmt = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(TimeSlot.vendor),
                selectinload(Booking.user),
            )
            .where(Booking.id == booking_id)
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_slot(self, slot_id: int) -> Booking | None:
        result = await self.db.execute(
            select(Booking)
            .where(Booking.slot_id == slot_id)
            .order_by(Booking.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_active_by_slot(self, slot_id: int, *, for_update: bool = False) -> Booking | None:
        stmt = (
            select(Booking)
            .options(
                selectinload(Booking.user), selectinload(Booking.slot).selectinload(TimeSlot.vendor)
            )
            .where(Booking.slot_id == slot_id, Booking.status.in_(ACTIVE_SLOT_STATUSES))
            .order_by(Booking.created_at.desc())
            .limit(1)
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active_by_slot_ids(
        self, slot_ids: list[int], *, for_update: bool = False
    ) -> list[Booking]:
        if not slot_ids:
            return []
        stmt = select(Booking).where(
            Booking.slot_id.in_(slot_ids), Booking.status.in_(ACTIVE_SLOT_STATUSES)
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_active_online_slot_start(
        self, vendor_id: int, *, now: datetime
    ) -> datetime | None:
        stmt = (
            select(func.max(TimeSlot.start_time))
            .join(Booking, Booking.slot_id == TimeSlot.id)
            .where(
                TimeSlot.vendor_id == vendor_id,
                TimeSlot.start_time >= now,
                Booking.source == BookingSource.ONLINE,
                Booking.status.in_(ACTIVE_SLOT_STATUSES),
            )
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def delete_by_ids(self, booking_ids: list[int]) -> None:
        if not booking_ids:
            return
        await self.db.execute(delete(Booking).where(Booking.id.in_(booking_ids)))
        await self.db.flush()

    async def create(self, data: dict) -> Booking:
        booking = Booking(**data)
        self.db.add(booking)
        await self.db.flush()
        await self.db.refresh(booking)
        return booking

    async def update(self, booking: Booking, data: dict) -> Booking:
        for key, value in data.items():
            setattr(booking, key, value)
        await self.db.flush()
        await self.db.refresh(booking)
        return booking

    async def list_all(
        self,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> tuple[list[Booking], int]:
        query = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(TimeSlot.vendor),
                selectinload(Booking.user),
            )
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .outerjoin(User, Booking.user_id == User.id)
        )
        count_q = (
            select(func.count(Booking.id))
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .outerjoin(User, Booking.user_id == User.id)
        )
        if after_id is not None:
            query = query.where(Booking.id < after_id)
        if status_filter:
            query = query.where(Booking.status == status_filter)
            count_q = count_q.where(Booking.status == status_filter)
        if search:
            pattern = f"%{search}%"
            query = query.where(User.full_name.ilike(pattern) | Vendor.name.ilike(pattern))
            count_q = count_q.where(User.full_name.ilike(pattern) | Vendor.name.ilike(pattern))
        query = query.order_by(Booking.id.desc())

        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        count_result = await self.db.execute(count_q)

        bookings = list(result.scalars().all())
        total = count_result.scalar_one()
        return bookings, total

    async def list_expired_pending(self, now: datetime) -> list[Booking]:
        stmt = (
            select(Booking)
            .where(
                Booking.status == BookingStatus.PENDING_PAYMENT,
                Booking.expires_at.isnot(None),
                Booking.expires_at < now,
            )
            .with_for_update(skip_locked=True)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_status(self) -> dict[str, int]:
        """Return a dict mapping each status to its total count (e.g. ``{"confirmed": 42}``).
        Uses a single GROUP BY query instead of N separate queries."""
        stmt = select(Booking.status, func.count(Booking.id).label("cnt")).group_by(Booking.status)
        result = await self.db.execute(stmt)
        rows = result.all()
        return {str(row.status): row.cnt for row in rows}

    async def count_today(self, reference: datetime | None = None) -> int:
        """Number of bookings created since the start of *reference* day (UTC)."""

        ref = reference or datetime.now()
        day_start = ref.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        query = select(func.count(Booking.id)).where(Booking.created_at >= day_start)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def list_completed_by_user(
        self,
        user_id: int,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Booking], int]:
        """List confirmed/completed bookings for a user (for review creation)."""
        query = (
            select(Booking)
            .options(selectinload(Booking.slot).selectinload(TimeSlot.vendor))
            .where(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.CONFIRMED,
            )
            .order_by(Booking.id.desc())
        )
        count_q = select(func.count(Booking.id)).where(
            Booking.user_id == user_id,
            Booking.status == BookingStatus.CONFIRMED,
        )

        if after_id is not None:
            query = query.where(Booking.id < after_id)

        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        count_result = await self.db.execute(count_q)

        bookings = list(result.scalars().all())
        total = count_result.scalar_one()
        return bookings, total

    async def sum_today_revenue(self, reference: datetime | None = None) -> float:
        """Total ``price_paid`` for confirmed bookings created today (UTC)."""

        ref = reference or datetime.now()
        day_start = ref.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        query = select(func.coalesce(func.sum(Booking.price_paid), 0)).where(
            Booking.created_at >= day_start,
            Booking.status == BookingStatus.CONFIRMED,
        )
        result = await self.db.execute(query)
        return float(result.scalar_one())

    async def list_by_manager(
        self,
        manager_id: int | None,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        status_filter: str | None = None,
        vendor_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        search: str | None = None,
    ) -> tuple[list[Booking], int]:
        """List bookings for vendors managed by *manager_id*."""
        query = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(TimeSlot.vendor),
                selectinload(Booking.user),
            )
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .outerjoin(User, Booking.user_id == User.id)
        )
        count_q = (
            select(func.count(Booking.id))
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .outerjoin(User, Booking.user_id == User.id)
        )

        if manager_id is not None:
            query = query.where(Vendor.manager_id == manager_id)
            count_q = count_q.where(Vendor.manager_id == manager_id)

        if after_id is not None:
            query = query.where(Booking.id < after_id)

        if status_filter:
            query = query.where(Booking.status == status_filter)
            count_q = count_q.where(Booking.status == status_filter)
        if vendor_id:
            query = query.where(Vendor.id == vendor_id)
            count_q = count_q.where(Vendor.id == vendor_id)
        if date_from:
            query = query.where(TimeSlot.start_time >= date_from)
            count_q = count_q.where(TimeSlot.start_time >= date_from)
        if date_to:
            query = query.where(TimeSlot.start_time <= date_to)
            count_q = count_q.where(TimeSlot.start_time <= date_to)
        if search:
            pattern = f"%{search}%"
            query = query.where(User.full_name.ilike(pattern) | Vendor.name.ilike(pattern))
            count_q = count_q.where(User.full_name.ilike(pattern) | Vendor.name.ilike(pattern))

        query = query.order_by(Booking.id.desc())

        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        count_result = await self.db.execute(count_q)

        bookings = list(result.scalars().all())
        total = count_result.scalar_one()
        return bookings, total
