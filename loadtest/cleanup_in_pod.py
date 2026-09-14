"""Verify + remove LOADTEST data. Runs INSIDE the backend pod.

Deletes: test bookings (incl. any pending on real slot 1 from the coercion
test), notifications/logs referencing test users, the test vendor (cascades
slots), and the 52 test users. Invalidates affected Redis caches.

Usage:
    kubectl exec -i deploy/toopset-backend -- python - < cleanup_in_pod.py
"""

from __future__ import annotations

import asyncio
import json

from sqlalchemy import delete, select, update

from app.core.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.models.log import Log
from app.models.notification import Notification
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.models.vendor import Vendor


async def main() -> None:
    report: dict = {}
    async with async_session_factory() as db:
        test_users = (
            (await db.execute(select(User).where(User.phone.like("0912100%")))).scalars().all()
        )
        uids = [u.id for u in test_users]
        report["test_users_found"] = len(uids)

        vendor = (
            await db.execute(select(Vendor).where(Vendor.name.like("LOADTEST%")))
        ).scalars().one_or_none()
        report["test_vendor"] = vendor.id if vendor else None

        if vendor:
            slots = (
                await db.execute(select(TimeSlot).where(TimeSlot.vendor_id == vendor.id))
            ).scalars().all()
            slot_ids = [s.id for s in slots]
            report["test_slots"] = len(slot_ids)

            bookings = (
                await db.execute(select(Booking).where(Booking.slot_id.in_(slot_ids)))
            ).scalars().all()
            report["bookings_on_test_slots"] = len(bookings)
            # state before deletion — evidence for the report
            active = [
                {"id": b.id, "slot_id": b.slot_id, "user_id": b.user_id, "status": b.status.value}
                for b in bookings
                if b.status
                in (BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.PENDING_CANCELLATION)
            ]
            report["active_bookings_before_cleanup"] = active
            # any active booking count >1 per slot would have been double booking
            per_slot: dict[int, int] = {}
            for b in active:
                per_slot[b["slot_id"]] = per_slot.get(b["slot_id"], 0) + 1
            report["max_active_per_slot"] = max(per_slot.values()) if per_slot else 0

        # real-slot side effect from the with_ball coercion test (slot 1)
        real_pending = (
            await db.execute(
                select(Booking).where(Booking.slot_id == 1, Booking.user_id.in_(uids))
            )
        ).scalars().all()
        report["real_slot1_pending_by_test_users"] = [
            {"id": b.id, "status": b.status.value, "expires_at": str(b.expires_at)} for b in real_pending
        ]
        for b in real_pending:
            if b.status == BookingStatus.PENDING_PAYMENT:
                await db.execute(
                    update(Booking)
                    .where(Booking.id == b.id)
                    .values(
                        status=BookingStatus.EXPIRED,
                    )
                )
        if real_pending:
            await db.execute(
                update(TimeSlot).where(TimeSlot.id == 1, TimeSlot.is_reserved.is_(True)).values(
                    is_reserved=False, status="open"
                )
            )
            report["real_slot1_released"] = True

        # delete dependent rows then users, then vendor
        if uids:
            await db.execute(delete(Notification).where(Notification.user_id.in_(uids)))
            await db.execute(delete(Log).where(Log.user_id.in_(uids)))
        if vendor:
            await db.execute(delete(Vendor).where(Vendor.id == vendor.id))  # cascades slots/bookings
        if uids:
            await db.execute(delete(User).where(User.id.in_(uids)))

        await db.commit()

        # post-state
        left_users = (
            await db.execute(select(User).where(User.phone.like("0912100%")))
        ).scalars().all()
        left_vendor = (
            await db.execute(select(Vendor).where(Vendor.name.like("LOADTEST%")))
        ).scalars().all()
        report["remaining_test_users"] = len(left_users)
        report["remaining_test_vendors"] = len(left_vendor)
        total_users = (await db.execute(select(User))).scalars().all()
        total_vendors = (await db.execute(select(Vendor))).scalars().all()
        report["final_user_count"] = len(total_users)
        report["final_vendor_count"] = len(total_vendors)

    # Redis cache invalidation
    try:
        from app.services.cache_service import (
            invalidate_admin_list_cache,
            invalidate_response_cache,
            invalidate_slot_list,
        )

        if report.get("test_vendor"):
            await invalidate_slot_list(report["test_vendor"])
        await invalidate_admin_list_cache("vendors")
        await invalidate_admin_list_cache("bookings")
        await invalidate_response_cache("vendor:detail")
        report["redis_caches_invalidated"] = True
    except Exception as e:
        report["redis_caches_invalidated"] = f"error: {type(e).__name__}"

    print(json.dumps(report, ensure_ascii=False, indent=2))


asyncio.run(main())
