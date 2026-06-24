from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking, BookingStatus
from app.models.court import Court
from app.models.time_slot import TimeSlot
from app.models.user import User


class BookingRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_user(
        self,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
        status_filter: str | None = None,
    ) -> tuple[list[Booking], int]:
        query = (
            select(Booking)
            .options(selectinload(Booking.slot).selectinload(TimeSlot.court))
            .where(Booking.user_id == user_id)
            .order_by(Booking.created_at.desc())
        )
        count_q = select(func.count(Booking.id)).where(Booking.user_id == user_id)

        if status_filter:
            query = query.where(Booking.status == status_filter)
            count_q = count_q.where(Booking.status == status_filter)

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        bookings = list(result.scalars().all())
        return bookings, total

    async def get_by_id(self, booking_id: int) -> Booking | None:
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.slot).selectinload(TimeSlot.court))
            .where(Booking.id == booking_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slot(self, slot_id: int) -> Booking | None:
        result = await self.db.execute(select(Booking).where(Booking.slot_id == slot_id))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Booking:
        booking = Booking(**data)
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def update(self, booking: Booking, data: dict) -> Booking:
        for key, value in data.items():
            if value is not None:
                setattr(booking, key, value)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def list_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> tuple[list[Booking], int]:
        query = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(TimeSlot.court),
                selectinload(Booking.user),
            )
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Court, TimeSlot.court_id == Court.id)
            .outerjoin(User, Booking.user_id == User.id)
        )
        count_q = (
            select(func.count(Booking.id))
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Court, TimeSlot.court_id == Court.id)
            .outerjoin(User, Booking.user_id == User.id)
        )
        if status_filter:
            query = query.where(Booking.status == status_filter)
            count_q = count_q.where(Booking.status == status_filter)
        if search:
            pattern = f"%{search}%"
            query = query.where(User.full_name.ilike(pattern) | Court.name.ilike(pattern))
            count_q = count_q.where(User.full_name.ilike(pattern) | Court.name.ilike(pattern))
        query = query.order_by(Booking.created_at.desc())
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        bookings = list(result.scalars().all())
        return bookings, total

    async def list_expired_pending(self, now: datetime) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.status == BookingStatus.PENDING_PAYMENT,
            Booking.expires_at.isnot(None),
            Booking.expires_at < now,
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
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Booking], int]:
        """List confirmed/completed bookings for a user (for review creation)."""
        query = (
            select(Booking)
            .options(selectinload(Booking.slot).selectinload(TimeSlot.court))
            .where(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.CONFIRMED,
            )
            .order_by(Booking.updated_at.desc())
        )
        count_q = select(func.count(Booking.id)).where(
            Booking.user_id == user_id,
            Booking.status == BookingStatus.CONFIRMED,
        )
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        bookings = list(result.scalars().all())
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
        manager_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
        status_filter: str | None = None,
        court_id: int | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        search: str | None = None,
    ) -> tuple[list[Booking], int]:
        """List bookings for courts managed by *manager_id*."""
        query = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(TimeSlot.court),
                selectinload(Booking.user),
            )
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Court, TimeSlot.court_id == Court.id)
            .outerjoin(User, Booking.user_id == User.id)
            .where(Court.manager_id == manager_id)
        )
        count_q = (
            select(func.count(Booking.id))
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Court, TimeSlot.court_id == Court.id)
            .outerjoin(User, Booking.user_id == User.id)
            .where(Court.manager_id == manager_id)
        )

        if status_filter:
            query = query.where(Booking.status == status_filter)
            count_q = count_q.where(Booking.status == status_filter)
        if court_id:
            query = query.where(Court.id == court_id)
            count_q = count_q.where(Court.id == court_id)
        if date_from:
            query = query.where(TimeSlot.start_time >= date_from)
            count_q = count_q.where(TimeSlot.start_time >= date_from)
        if date_to:
            query = query.where(TimeSlot.start_time <= date_to)
            count_q = count_q.where(TimeSlot.start_time <= date_to)
        if search:
            pattern = f"%{search}%"
            query = query.where(User.full_name.ilike(pattern) | Court.name.ilike(pattern))
            count_q = count_q.where(User.full_name.ilike(pattern) | Court.name.ilike(pattern))

        query = query.order_by(Booking.created_at.desc())
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        bookings = list(result.scalars().all())
        return bookings, total
