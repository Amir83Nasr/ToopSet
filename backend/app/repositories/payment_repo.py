from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.payment import Payment
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.models.vendor import Vendor


class PaymentRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: dict) -> Payment:
        payment = Payment(**data)
        self.db.add(payment)
        await self.db.flush()
        await self.db.refresh(payment)
        return payment

    async def list_by_user(
        self,
        user_id: int,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> tuple[list[Payment], int]:
        query = (
            select(Payment)
            .options(
                selectinload(Payment.booking)
                .selectinload(Booking.slot)
                .selectinload(TimeSlot.vendor),
                selectinload(Payment.booking).selectinload(Booking.user),
            )
            .join(Booking, Payment.booking_id == Booking.id)
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .where(Booking.user_id == user_id)
            .order_by(Payment.created_at.desc())
        )
        count_q = (
            select(func.count(Payment.id))
            .join(Booking, Payment.booking_id == Booking.id)
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .where(Booking.user_id == user_id)
        )

        if after_id is not None:
            query = query.where(Payment.id > after_id)

        if status_filter:
            query = query.where(Payment.status == status_filter)
            count_q = count_q.where(Payment.status == status_filter)

        if search:
            pattern = f"%{search}%"
            query = query.where(Vendor.name.ilike(pattern))
            count_q = count_q.where(Vendor.name.ilike(pattern))

        total = (await self.db.execute(count_q)).scalar_one()
        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        payments = list(result.scalars().all())
        return payments, total

    async def get_by_booking(self, booking_id: int) -> Payment | None:
        result = await self.db.execute(
            select(Payment)
            .where(Payment.booking_id == booking_id)
            .order_by(Payment.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_booking_ids(self, booking_ids: list[int]) -> dict[int, Payment]:
        """Return a ``{booking_id: Payment}`` map for the given booking IDs.

        Replaces N per-item ``get_by_booking`` calls with a single batched query.
        """
        if not booking_ids:
            return {}
        result = await self.db.execute(
            select(Payment)
            .where(Payment.booking_id.in_(booking_ids))
            .order_by(Payment.created_at.desc())
        )
        payments: dict[int, Payment] = {}
        for payment in result.scalars().all():
            payments.setdefault(payment.booking_id, payment)
        return payments

    async def list_all(
        self,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> tuple[list[Payment], int]:
        query = (
            select(Payment)
            .options(
                selectinload(Payment.booking)
                .selectinload(Booking.slot)
                .selectinload(TimeSlot.vendor),
                selectinload(Payment.booking).selectinload(Booking.user),
            )
            .join(Booking, Payment.booking_id == Booking.id)
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .outerjoin(User, Booking.user_id == User.id)
            .order_by(Payment.created_at.desc())
        )
        count_q = (
            select(func.count(Payment.id))
            .join(Booking, Payment.booking_id == Booking.id)
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .outerjoin(User, Booking.user_id == User.id)
        )

        if after_id is not None:
            query = query.where(Payment.id > after_id)

        if status_filter:
            query = query.where(Payment.status == status_filter)
            count_q = count_q.where(Payment.status == status_filter)

        if search:
            pattern = f"%{search}%"
            query = query.where(User.full_name.ilike(pattern) | Vendor.name.ilike(pattern))
            count_q = count_q.where(User.full_name.ilike(pattern) | Vendor.name.ilike(pattern))

        total = (await self.db.execute(count_q)).scalar_one()
        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        payments = list(result.scalars().all())
        return payments, total
