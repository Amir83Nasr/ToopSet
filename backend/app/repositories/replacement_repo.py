from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.replacement import (
    BookingHold,
    BookingHoldStatus,
    ReplacementRequest,
    ReplacementRequestStatus,
)
from app.models.time_slot import TimeSlot


class ReplacementRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_request(self, data: dict) -> ReplacementRequest:
        request = ReplacementRequest(**data)
        self.db.add(request)
        await self.db.flush()
        await self.db.refresh(request)
        return request

    async def get_request(
        self, request_id: int, *, for_update: bool = False
    ) -> ReplacementRequest | None:
        stmt = (
            select(ReplacementRequest)
            .where(ReplacementRequest.id == request_id)
            .options(
                selectinload(ReplacementRequest.original_booking),
                selectinload(ReplacementRequest.slot).selectinload(TimeSlot.vendor),
            )
        )
        if for_update:
            stmt = stmt.with_for_update()
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_request_by_original(
        self, booking_id: int, *, for_update: bool = False
    ) -> ReplacementRequest | None:
        stmt = (
            select(ReplacementRequest)
            .where(ReplacementRequest.original_booking_id == booking_id)
            .options(
                selectinload(ReplacementRequest.original_booking),
                selectinload(ReplacementRequest.slot).selectinload(TimeSlot.vendor),
            )
        )
        if for_update:
            stmt = stmt.with_for_update()
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def update_request(self, request: ReplacementRequest, data: dict) -> ReplacementRequest:
        for key, value in data.items():
            setattr(request, key, value)
        await self.db.flush()
        return request

    async def create_hold(self, data: dict) -> BookingHold:
        hold = BookingHold(**data)
        self.db.add(hold)
        await self.db.flush()
        await self.db.refresh(hold)
        return hold

    async def get_hold(self, hold_id: int, *, for_update: bool = False) -> BookingHold | None:
        stmt = (
            select(BookingHold)
            .where(BookingHold.id == hold_id)
            .options(
                selectinload(BookingHold.replacement_request).selectinload(
                    ReplacementRequest.original_booking
                ),
                selectinload(BookingHold.slot).selectinload(TimeSlot.vendor),
            )
            .execution_options(populate_existing=True)
        )
        if for_update:
            stmt = stmt.with_for_update()
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_live_hold_for_request(
        self, request_id: int, *, for_update: bool = False
    ) -> BookingHold | None:
        stmt = (
            select(BookingHold)
            .where(
                BookingHold.replacement_request_id == request_id,
                BookingHold.status.in_((BookingHoldStatus.ACTIVE, BookingHoldStatus.PROCESSING)),
            )
            .order_by(BookingHold.created_at.desc())
            .limit(1)
        )
        if for_update:
            stmt = stmt.with_for_update()
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def update_hold(self, hold: BookingHold, data: dict) -> BookingHold:
        for key, value in data.items():
            setattr(hold, key, value)
        await self.db.flush()
        return hold

    async def list_expired_live_holds(self, now: datetime) -> list[BookingHold]:
        stmt = (
            select(BookingHold)
            .where(
                or_(
                    BookingHold.status == BookingHoldStatus.ACTIVE,
                    and_(
                        BookingHold.status == BookingHoldStatus.PROCESSING,
                        BookingHold.failure_code.is_(None),
                    ),
                ),
                BookingHold.expires_at <= now,
            )
            .order_by(BookingHold.expires_at)
            .with_for_update(skip_locked=True)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def list_due_requests(self, now: datetime) -> list[ReplacementRequest]:
        stmt = (
            select(ReplacementRequest)
            .where(
                ReplacementRequest.status.in_(
                    (ReplacementRequestStatus.OPEN, ReplacementRequestStatus.HELD)
                ),
                ReplacementRequest.deadline <= now,
            )
            .order_by(ReplacementRequest.deadline)
            .with_for_update(skip_locked=True)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def list_live_holds_for_request(self, request_id: int) -> list[BookingHold]:
        stmt = (
            select(BookingHold)
            .where(
                BookingHold.replacement_request_id == request_id,
                BookingHold.status.in_((BookingHoldStatus.ACTIVE, BookingHoldStatus.PROCESSING)),
            )
            .with_for_update(skip_locked=True)
        )
        return list((await self.db.execute(stmt)).scalars().all())
