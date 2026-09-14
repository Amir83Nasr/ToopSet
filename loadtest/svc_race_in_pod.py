"""Definitive serialization test at the service layer. Runs INSIDE the pod.

50 concurrent BookingService.create_booking() coroutines, each with its own
session and a distinct real user, racing for one open slot. No HTTP, no rate
limiter — isolates the DB-level race protection (SELECT..FOR UPDATE +
partial unique index).

Usage:
    kubectl exec -i deploy/toopset-backend -- python - <slot_id> < svc_race_in_pod.py
"""

from __future__ import annotations

import asyncio
import json
import sys

from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.booking import Booking
from app.models.user import User
from app.schemas.booking import BookingCreate
from app.services.booking_service import BookingService

ACTIVE = ("pending_payment", "confirmed", "pending_cancellation")


async def main() -> None:
    slot_id = int(sys.argv[1])

    async with async_session_factory() as db:
        users = (
            (await db.execute(select(User).where(User.phone.like("0912100%")).order_by(User.id)))
            .scalars()
            .all()
        )
    user_ids = [u.id for u in users][:50]
    barrier = asyncio.Barrier(len(user_ids))

    async def racer(uid: int):
        await barrier.wait()
        async with async_session_factory() as db:
            me = await db.get(User, uid)
            svc = BookingService(db=db, current_user=me)
            try:
                res = await svc.create_booking(
                    BookingCreate(slot_id=slot_id, version=1, with_ball=False)
                )
                return ("created", res.id)
            except HTTPException as e:
                detail = e.detail if isinstance(e.detail, str) else str(e.detail)[:60]
                return (e.status_code, detail)
            except Exception as e:
                return (f"exc:{type(e).__name__}", str(e)[:80])

    out = await asyncio.gather(*[racer(uid) for uid in user_ids])
    counts: dict[str, int] = {}
    for status, _ in out:
        counts[str(status)] = counts.get(str(status), 0) + 1

    await asyncio.sleep(0.5)
    async with async_session_factory() as db:
        active = (
            (
                await db.execute(
                    select(Booking).where(Booking.slot_id == slot_id, Booking.status.in_(ACTIVE))
                )
            )
            .scalars()
            .all()
        )
        double = [b.id for b in active]

    print(
        json.dumps(
            {
                "n_racers": len(user_ids),
                "outcomes": counts,
                "active_bookings_on_slot": len(active),
                "active_booking_ids": double,
                "double_booking": len(active) > 1,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


asyncio.run(main())
