from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import log_action
from app.models.booking import BookingStatus
from app.models.replacement import BookingHoldStatus, ReplacementRequestStatus
from app.models.time_slot import SlotStatus
from app.repositories.booking_repo import BookingRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.replacement_repo import ReplacementRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.services.cache_service import invalidate_slot_list


async def expire_replacement_work(db: AsyncSession, now: datetime) -> dict[str, int]:
    """Expire replacement requests and holds while preserving the original booking.

    A due request returns the original booking to ``confirmed`` with no refund. A
    ten-minute hold expiring before the slot merely reopens the replacement request.
    Rows are selected with ``SKIP LOCKED`` so multiple API workers can run this job.
    """

    replacement_repo = ReplacementRepo(db)
    booking_repo = BookingRepo(db)
    slot_repo = TimeSlotRepo(db)
    notify_repo = NotificationRepo(db)
    expired_requests = 0
    expired_holds = 0

    for request in await replacement_repo.list_due_requests(now):
        original = await booking_repo.get_by_id(request.original_booking_id, for_update=True)
        slot = await slot_repo.get_by_id(request.slot_id, for_update=True)
        for hold in await replacement_repo.list_live_holds_for_request(request.id):
            await replacement_repo.update_hold(
                hold,
                {
                    "status": BookingHoldStatus.EXPIRED,
                    "processing_token": None,
                    "failure_code": "replacement_deadline_reached",
                },
            )
            expired_holds += 1

        await replacement_repo.update_request(
            request,
            {"status": ReplacementRequestStatus.EXPIRED},
        )
        if original and original.status == BookingStatus.PENDING_CANCELLATION:
            await booking_repo.update(
                original,
                {"status": BookingStatus.CONFIRMED, "penalty_amount": None},
            )
            await notify_repo.create(
                user_id=original.user_id,
                type_="replacement_not_found",
                message="برای سانس شما جایگزین پیدا نشد؛ رزرو همچنان متعلق به شماست.",
            )
        if slot and slot.status in (
            SlotStatus.PENDING_CANCELLATION,
            SlotStatus.RESERVING,
        ):
            await slot_repo.update(slot, {"status": SlotStatus.RESERVED, "is_reserved": True})
            await invalidate_slot_list(slot.vendor_id)
        await log_action(
            db,
            None,
            "replacement_request_expired",
            f"مهلت جایگزینی تمام شد | درخواست {request.id} — رزرو {request.original_booking_id}",
        )
        expired_requests += 1

    for hold in await replacement_repo.list_expired_live_holds(now):
        request = await replacement_repo.get_request(hold.replacement_request_id, for_update=True)
        await replacement_repo.update_hold(
            hold,
            {
                "status": BookingHoldStatus.EXPIRED,
                "processing_token": None,
                "failure_code": "hold_expired",
            },
        )
        if request and request.status == ReplacementRequestStatus.HELD:
            await replacement_repo.update_request(
                request,
                {"status": ReplacementRequestStatus.OPEN},
            )
            slot = await slot_repo.get_by_id(hold.slot_id, for_update=True)
            if slot and slot.status == SlotStatus.RESERVING:
                await slot_repo.update(
                    slot,
                    {"status": SlotStatus.PENDING_CANCELLATION, "is_reserved": True},
                )
                await invalidate_slot_list(slot.vendor_id)
        expired_holds += 1

    return {"expired_requests": expired_requests, "expired_holds": expired_holds}


async def revoke_replacement_request(db: AsyncSession, original_booking_id: int) -> None:
    """Close replacement work when the original booking is cancelled elsewhere."""

    repo = ReplacementRepo(db)
    request = await repo.get_request_by_original(original_booking_id, for_update=True)
    if not request or request.status not in (
        ReplacementRequestStatus.OPEN,
        ReplacementRequestStatus.HELD,
    ):
        return
    for hold in await repo.list_live_holds_for_request(request.id):
        await repo.update_hold(
            hold,
            {
                "status": BookingHoldStatus.CANCELLED,
                "processing_token": None,
                "failure_code": "original_booking_cancelled",
            },
        )
    await repo.update_request(request, {"status": ReplacementRequestStatus.REVOKED})
