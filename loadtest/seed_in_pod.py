"""Seed LOADTEST data + mint test tokens. Runs INSIDE the backend pod.

Usage:
    kubectl exec -i deploy/toopset-backend -- python - < seed_in_pod.py

Creates 52 marked test users (verified phones), one marked vendor, slots for
every scenario, and prints a JSON manifest (tokens included) to stdout.
The JWT secret never leaves the pod: tokens are minted with the app's own
signing code.
"""

from __future__ import annotations

import asyncio
import json
import secrets
import uuid
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import create_access_token, create_refresh_token
from app.core.timezone import now_utc
from app.models.booking import Booking
from app.models.time_slot import SlotGender, SlotStatus, TimeSlot
from app.models.user import User, UserRole
from app.models.vendor import Vendor

MARK = "LOADTEST"
N_USERS = 52  # 50 racers + A + B

# cheap bcrypt: these users never log in with a password (tokens are minted
# directly), and the pod's 150m CPU makes full-cost hashing of 52 users take
# minutes.
from passlib.context import CryptContext

_fast_hash = CryptContext(schemes=["bcrypt"], bcrypt__rounds=4).hash


async def main() -> None:
    out: dict = {"mark": MARK}
    async with async_session_factory() as db:
        # ── users ──────────────────────────────────────────────────────
        users = [
            User(
                full_name=f"{MARK} User {i:02d}",
                phone=f"0912100{i:04d}",
                password_hash=_fast_hash(secrets.token_urlsafe(24)),
                role=UserRole.USER,
                is_active=True,
                token_version=0,
                phone_verified_at=now_utc(),
            )
            for i in range(1, N_USERS + 1)
        ]
        db.add_all(users)
        await db.flush()
        user_ids: list[int] = [u.id for u in users]  # type: ignore[misc]

        manager_id = user_ids[0]
        user_a, user_b = user_ids[0], user_ids[1]
        racers = user_ids[:50]

        # ── vendor ─────────────────────────────────────────────────────
        vendor = Vendor(
            manager_id=manager_id,
            name=f"{MARK} مجموعه آزمون بار",
            sport_types=["futsal"],
            address="آزمون بار — حذف خواهد شد",
            latitude=35.7,
            longitude=51.4,
            capacity=1,
            ball_available=True,
            ball_price=Decimal("0"),
            is_active=True,
        )
        db.add(vendor)
        await db.flush()
        out["vendor_id"] = vendor.id

        # ── slots ──────────────────────────────────────────────────────
        base = now_utc() + timedelta(days=10)
        slots: dict[str, TimeSlot] = {}

        def mk_slot(key: str, start, status=SlotStatus.OPEN):
            s = TimeSlot(
                vendor_id=vendor.id,
                start_time=start,
                end_time=start + timedelta(hours=1),
                base_price=Decimal("100000.00"),
                gender=SlotGender.MALE,
                status=status,
                is_reserved=False,
                version=1,
            )
            db.add(s)
            slots[key] = s
            return s

        mk_slot("race50", base)
        mk_slot("race10", base + timedelta(hours=3))
        mk_slot("race_svc", base + timedelta(hours=5))
        mk_slot("idor", base + timedelta(days=-1, hours=12))
        mk_slot("latency", base + timedelta(hours=7))
        mk_slot("past", now_utc() - timedelta(days=2))
        mk_slot("far_future", now_utc() + timedelta(days=20))
        # a spread of normal open slots for list/load realism
        for d in range(3):
            for h in (8, 10, 12, 14, 16, 18, 20):
                mk_slot(f"fill_{d}_{h}", now_utc() + timedelta(days=2 + d, hours=h - 12))
        await db.flush()

        out["slots"] = {k: {"id": s.id, "version": s.version} for k, s in slots.items()}

        # sanity: no leftover bookings for our slots
        n_old = (
            await db.execute(
                select(Booking).where(Booking.slot_id.in_([s.id for s in slots.values()]))
            )
        ).scalars().all()
        out["pre_existing_bookings"] = len(n_old)

        await db.commit()

    # ── tokens (minted with the app's own signing key, never printed raw key) ──
    def access(uid: int) -> str:
        return create_access_token(
            {"sub": str(uid), "role": "user", "ver": 0, "sid": uuid.uuid4().hex}
        )

    out["tokens"] = {str(uid): access(uid) for uid in racers}
    out["user_a"] = {"id": user_a, "token": access(user_a)}
    out["user_b"] = {"id": user_b, "token": access(user_b)}
    out["manager_token"] = access(manager_id)
    # specially-broken tokens for scenario 2
    out["expired_token"] = create_access_token(
        {"sub": str(user_a), "role": "user", "ver": 0, "sid": uuid.uuid4().hex},
        expires_delta=timedelta(minutes=-30),
    )
    out["refresh_token"] = create_refresh_token(
        {"sub": str(user_a), "role": "user", "ver": 0, "sid": uuid.uuid4().hex}
    )
    print(json.dumps(out))


asyncio.run(main())
