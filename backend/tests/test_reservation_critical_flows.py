"""Critical reservation invariants, cancellation transitions, and financial effects.

These tests intentionally use separate database sessions for concurrency cases.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from conftest import engine as test_engine
from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.models.booking import Booking, BookingSource, BookingStatus
from app.models.replacement import (
    BookingHold,
    BookingHoldStatus,
    ReplacementRequest,
    ReplacementRequestStatus,
)
from app.models.time_slot import SlotStatus, TimeSlot
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.schemas.booking import BookingCancelRequest, BookingCreate
from app.services.booking_service import BookingService
from app.services.finance_service import FinanceService
from app.services.payment_service import PaymentResult, PaymentService
from app.services.replacement_service import expire_replacement_work
from app.services.zibal_gateway import (
    ZibalPaymentStartResult,
    ZibalPaymentVerificationResult,
)

pytestmark = pytest.mark.asyncio


def _phone(seed: int) -> str:
    suffix = (int(uuid4().hex[:8], 16) + seed) % 100_000_000
    return f"091{suffix:08d}"


async def _seed_committed_slot() -> dict[str, int | str]:
    """Create a committed world visible to independent concurrent sessions."""
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as db:
        manager = User(
            full_name="race manager",
            phone=_phone(1),
            password_hash="test",
            role=UserRole.MANAGER,
        )
        admin = User(
            full_name="race admin",
            phone=_phone(2),
            password_hash="test",
            role=UserRole.ADMIN,
        )
        user_one = User(
            full_name="race user one",
            phone=_phone(3),
            password_hash="test",
            role=UserRole.USER,
            phone_verified_at=datetime.now(timezone.utc),
        )
        user_two = User(
            full_name="race user two",
            phone=_phone(4),
            password_hash="test",
            role=UserRole.USER,
            phone_verified_at=datetime.now(timezone.utc),
        )
        db.add_all([manager, admin, user_one, user_two])
        await db.flush()
        vendor = Vendor(
            manager_id=manager.id,
            name=f"race vendor {uuid4().hex[:8]}",
            sport_types=["futsal"],
            address="تهران",
            latitude=35.7,
            longitude=51.4,
            capacity=10,
            is_active=True,
        )
        db.add(vendor)
        await db.flush()
        slot = TimeSlot(
            vendor_id=vendor.id,
            start_time=datetime.now(timezone.utc) + timedelta(hours=72),
            end_time=datetime.now(timezone.utc) + timedelta(hours=74),
            base_price=Decimal("100000"),
        )
        db.add(slot)
        await db.commit()
        return {
            "manager_id": manager.id,
            "admin_id": admin.id,
            "user_one_id": user_one.id,
            "user_two_id": user_two.id,
            "user_two_phone": user_two.phone,
            "vendor_id": vendor.id,
            "slot_id": slot.id,
        }


async def _cleanup_committed_world(ids: dict[str, int | str]) -> None:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as db:
        await db.execute(
            text("DELETE FROM users WHERE id IN (:manager, :admin, :user_one, :user_two)"),
            {
                "manager": ids["manager_id"],
                "admin": ids["admin_id"],
                "user_one": ids["user_one_id"],
                "user_two": ids["user_two_id"],
            },
        )
        await db.commit()


async def _attempt_online_booking(user_id: int, slot_id: int) -> str:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as db:
        user = await db.get(User, user_id)
        assert user is not None
        try:
            await BookingService(db, user).create_booking(BookingCreate(slot_id=slot_id, version=1))
            await db.commit()
            return "created"
        except HTTPException as exc:
            await db.rollback()
            return f"rejected:{exc.status_code}"
        except IntegrityError:
            await db.rollback()
            return "integrity_error"


async def _attempt_manual_booking(actor_id: int, slot_id: int, phone: str) -> str:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as db:
        actor = await db.get(User, actor_id)
        assert actor is not None
        try:
            await FinanceService(db, actor).create_manager_booking(
                slot_id=slot_id,
                full_name="مشتری حضوری",
                phone_number=phone,
            )
            await db.commit()
            return "created"
        except HTTPException as exc:
            await db.rollback()
            return f"rejected:{exc.status_code}"
        except IntegrityError:
            await db.rollback()
            return "integrity_error"


@pytest.mark.parametrize("competitor", ["user", "manager", "admin"])
async def test_only_one_actor_can_reserve_a_slot_under_real_concurrency(competitor: str) -> None:
    """User, manager, and admin paths must share one exclusivity invariant."""
    ids = await _seed_committed_slot()
    try:
        first = _attempt_online_booking(int(ids["user_one_id"]), int(ids["slot_id"]))
        if competitor == "user":
            second = _attempt_online_booking(int(ids["user_two_id"]), int(ids["slot_id"]))
        else:
            actor_id = ids["manager_id"] if competitor == "manager" else ids["admin_id"]
            second = _attempt_manual_booking(
                int(actor_id), int(ids["slot_id"]), str(ids["user_two_phone"])
            )

        outcomes = await asyncio.wait_for(asyncio.gather(first, second), timeout=10)
        assert outcomes.count("created") == 1, outcomes
        assert sum(result.startswith("rejected:409") for result in outcomes) == 1, outcomes
        assert "integrity_error" not in outcomes, "conflict must be a controlled 409, not a DB 500"

        session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
        async with session_factory() as db:
            active_count = await db.scalar(
                select(func.count(Booking.id)).where(
                    Booking.slot_id == ids["slot_id"],
                    Booking.status.in_(
                        [
                            BookingStatus.PENDING_PAYMENT,
                            BookingStatus.CONFIRMED,
                            BookingStatus.PENDING_CANCELLATION,
                        ]
                    ),
                )
            )
            assert active_count == 1
    finally:
        await _cleanup_committed_world(ids)


async def test_pending_payment_cancellation_releases_slot_without_financial_records(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    vendor_id, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    del vendor_id
    headers = {"Authorization": f"Bearer {user_token['access_token']}"}
    created = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": 1},
        headers=headers,
    )
    assert created.status_code == 201
    cancelled = await client.post(
        f"/api/v1/bookings/{created.json()['id']}/cancel", headers=headers
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    row = (
        (
            await session.execute(
                text("SELECT status, is_reserved FROM time_slots WHERE id = :id"), {"id": slot_id}
            )
        )
        .mappings()
        .one()
    )
    assert row == {"status": "open", "is_reserved": False}
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"),
            {"id": created.json()["id"]},
        )
        == 0
    )


async def test_manager_manual_booking_blocks_online_booking(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    manager = await session.get(User, manager_token["user"]["id"])
    assert manager is not None
    manual = await FinanceService(session, manager).create_manager_booking(
        slot_id=slot_id,
        full_name="مشتری حضوری",
        phone_number="09123334444",
    )
    assert manual.status == BookingStatus.CONFIRMED
    online = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": 2},
        headers={"Authorization": f"Bearer {user_token['access_token']}"},
    )
    assert online.status_code == 409


async def test_near_term_cancellation_waits_for_replacement_without_refund(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """Within 48h, ownership and money stay with the old booking until replacement succeeds."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    user = await session.get(User, user_token["user"]["id"])
    assert user is not None
    service = BookingService(session, user)
    with patch.object(service, "_ensure_verified_bank_card", new=AsyncMock()):
        cancelled = await service.cancel_booking(
            BookingCancelRequest(accepted_terms=True), booking_id
        )
    assert cancelled.status == BookingStatus.PENDING_CANCELLATION
    slot_row = (
        (
            await session.execute(
                text("SELECT status, is_reserved FROM time_slots WHERE id = :id"), {"id": slot_id}
            )
        )
        .mappings()
        .one()
    )
    assert slot_row == {"status": "pending_cancellation", "is_reserved": True}
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"), {"id": booking_id}
        )
        == 0
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM penalties WHERE booking_id = :id"), {"id": booking_id}
        )
        == 0
    )


async def test_user_can_withdraw_open_near_term_cancellation(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    user = await session.get(User, user_token["user"]["id"])
    assert user is not None
    service = BookingService(session, user)
    with patch.object(service, "_ensure_verified_bank_card", new=AsyncMock()):
        await service.cancel_booking(BookingCancelRequest(accepted_terms=True), booking_id)

    restored = await service.withdraw_cancellation(booking_id)
    assert restored.status == BookingStatus.CONFIRMED
    slot_row = (
        (
            await session.execute(
                text("SELECT status, is_reserved FROM time_slots WHERE id = :id"),
                {"id": slot_id},
            )
        )
        .mappings()
        .one()
    )
    assert slot_row == {"status": "reserved", "is_reserved": True}
    assert (
        await session.scalar(
            text("SELECT status FROM replacement_requests WHERE original_booking_id = :id"),
            {"id": booking_id},
        )
        == "revoked"
    )


async def test_early_user_cancellation_creates_exact_penalty_and_refund(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """More than 48h before start: 90% refund + 10% penalty and immediate slot release."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    user = await session.get(User, user_token["user"]["id"])
    assert user is not None
    service = BookingService(session, user)
    with patch.object(service, "_ensure_verified_bank_card", new=AsyncMock()):
        cancelled = await service.cancel_booking(
            BookingCancelRequest(accepted_terms=True), booking_id
        )
    assert cancelled.status == BookingStatus.CANCELLED
    assert cancelled.penalty_amount == 10_000

    refund = (
        (
            await session.execute(
                text(
                    """
                SELECT total_paid, penalty_amount, refund_amount, type, status,
                       penalty_charged_to_user, site_bears_penalty
                FROM refunds WHERE booking_id = :id
                """
                ),
                {"id": booking_id},
            )
        )
        .mappings()
        .one()
    )
    assert float(refund["total_paid"]) == 100_000
    assert float(refund["penalty_amount"]) == 10_000
    assert float(refund["refund_amount"]) == 90_000
    assert float(refund["total_paid"]) == float(refund["penalty_amount"]) + float(
        refund["refund_amount"]
    )
    assert refund["type"] == "user_cancellation"
    assert refund["status"] == "pending"
    assert refund["penalty_charged_to_user"] is True
    assert refund["site_bears_penalty"] is False


async def test_manager_cancels_paid_online_booking_with_full_refund(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """A manager-caused cancellation must never charge the customer a penalty."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    manager = await session.get(User, manager_token["user"]["id"])
    assert manager is not None
    booking = await session.get(Booking, booking_id)
    assert booking is not None
    await session.refresh(booking, ["user"])
    cancellation = await FinanceService(session, manager).cancel_booking_by_manager(
        booking_id, reason="تعطیلی مجموعه", release_slot=True
    )
    assert cancellation.site_cost_amount == Decimal("100000")

    refund = (
        (
            await session.execute(
                text(
                    """
                SELECT total_paid, penalty_amount, refund_amount, type,
                       penalty_charged_to_user, site_bears_penalty
                FROM refunds WHERE booking_id = :id
                """
                ),
                {"id": booking_id},
            )
        )
        .mappings()
        .one()
    )
    assert float(refund["total_paid"]) == float(refund["refund_amount"]) == 100_000
    assert float(refund["penalty_amount"]) == 0
    assert refund["type"] == "manager_cancellation"
    assert refund["penalty_charged_to_user"] is False
    assert refund["site_bears_penalty"] is True


async def test_manager_cancellation_eager_loads_async_relationships(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """The normal service path must not require a test-only relationship preload."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    manager = await session.get(User, manager_token["user"]["id"])
    assert manager is not None
    cancellation = await FinanceService(session, manager).cancel_booking_by_manager(
        booking_id, reason="تعطیلی مجموعه", release_slot=True
    )
    assert cancellation.booking_id == booking_id


async def test_manager_cannot_cancel_booking_after_slot_has_started(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """A started session is immutable through the manager cancellation path."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    now = datetime.now(timezone.utc)
    await session.execute(
        text(
            """
            UPDATE time_slots
            SET start_time = :start_time, end_time = :end_time
            WHERE id = :slot_id
            """
        ),
        {
            "slot_id": slot_id,
            "start_time": now - timedelta(hours=2),
            "end_time": now - timedelta(hours=1),
        },
    )
    session.expire_all()

    response = await client.post(
        f"/api/v1/manager/bookings/{booking_id}/cancel",
        json={"reason": "تعطیلی مجموعه", "release_slot": True},
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "زمان این سانس گذشته یا شروع شده و دیگر قابل لغو نیست"
    assert (
        await session.scalar(text("SELECT status FROM bookings WHERE id = :id"), {"id": booking_id})
        == "confirmed"
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"), {"id": booking_id}
        )
        == 0
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM slot_cancellations WHERE booking_id = :id"),
            {"id": booking_id},
        )
        == 0
    )


async def test_replacement_booking_completes_transfer_and_financial_records(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """A candidate is a hold until payment atomically transfers slot ownership."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    original_id = await _create_and_pay_online(client, user_token, slot_id)
    original_user = await session.get(User, user_token["user"]["id"])
    assert original_user is not None
    original_service = BookingService(session, original_user)
    with patch.object(original_service, "_ensure_verified_bank_card", new=AsyncMock()):
        await original_service.cancel_booking(
            BookingCancelRequest(accepted_terms=True), original_id
        )

    registered = await client.post(
        "/api/v1/auth/register",
        json={"phone": "09128887766", "password": "Test1234", "full_name": "جایگزین"},
    )
    assert registered.status_code == 201, registered.text
    await session.execute(
        text("UPDATE users SET phone_verified_at = now() WHERE id = :id"),
        {"id": registered.json()["user"]["id"]},
    )
    await session.flush()
    replacement_headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    held = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": version},
        headers=replacement_headers,
    )
    assert held.status_code == 201, held.text
    assert held.json()["checkout_type"] == "replacement_hold"
    hold_id = held.json()["id"]
    assert (
        await session.scalar(
            select(func.count(Booking.id)).where(Booking.replaces_booking_id == original_id)
        )
        == 0
    )
    original_before_payment = await session.get(Booking, original_id)
    slot_before_payment = await session.get(TimeSlot, slot_id)
    assert (
        original_before_payment is not None
        and original_before_payment.status == BookingStatus.PENDING_CANCELLATION
    )
    assert (
        slot_before_payment is not None
        and slot_before_payment.status == SlotStatus.RESERVING
        and slot_before_payment.is_reserved
    )

    gateway_result = PaymentResult(
        transaction_id=f"TXN-{uuid4().hex}",
        gateway_name="test",
        card_number="603799****1234",
        paid_at=datetime.now(timezone.utc),
        ref_id=uuid4().hex,
        fee=1000,
    )
    original_gateway = settings.payment_gateway
    settings.payment_gateway = "mock"
    try:
        with patch.object(
            PaymentService,
            "process_payment",
            new=AsyncMock(return_value=gateway_result),
        ):
            paid = await client.post(
                f"/api/v1/bookings/replacement-holds/{hold_id}/pay",
                headers=replacement_headers,
            )
    finally:
        settings.payment_gateway = original_gateway
    assert paid.status_code == 200, paid.text
    replacement_id = paid.json()["id"]
    assert paid.json()["status"] == "confirmed"
    paid_again = await client.post(
        f"/api/v1/bookings/replacement-holds/{hold_id}/pay",
        headers=replacement_headers,
    )
    assert paid_again.status_code == 200
    assert paid_again.json()["id"] == replacement_id

    original = await session.get(Booking, original_id)
    replacement = await session.get(Booking, replacement_id)
    hold = await session.get(BookingHold, hold_id)
    request = await session.scalar(
        select(ReplacementRequest).where(ReplacementRequest.original_booking_id == original_id)
    )
    assert original is not None and original.status == BookingStatus.TRANSFERRED
    assert original.penalty_amount == Decimal("10000.00")
    assert replacement is not None and replacement.replaces_booking_id == original_id
    assert hold is not None and hold.status == BookingHoldStatus.PAID
    assert request is not None and request.status == ReplacementRequestStatus.COMPLETED
    assert request.replacement_booking_id == replacement_id
    refund = (
        (
            await session.execute(
                text(
                    "SELECT penalty_amount, refund_amount, status FROM refunds "
                    "WHERE booking_id = :booking_id"
                ),
                {"booking_id": original_id},
            )
        )
        .mappings()
        .one()
    )
    assert refund == {
        "penalty_amount": Decimal("10000.00"),
        "refund_amount": Decimal("90000.00"),
        "status": "pending",
    }
    assert (
        await session.scalar(
            select(func.count(Booking.id)).where(
                Booking.slot_id == slot_id,
                Booking.status.in_(
                    [
                        BookingStatus.PENDING_PAYMENT,
                        BookingStatus.CONFIRMED,
                        BookingStatus.PENDING_CANCELLATION,
                    ]
                ),
            )
        )
        == 1
    )


async def test_zibal_replacement_hold_redirect_and_callback_finalize_transfer(
    client, session: AsyncSession, manager_token: dict, user_token: dict, monkeypatch
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    original_id = await _create_and_pay_online(client, user_token, slot_id)
    original_user = await session.get(User, user_token["user"]["id"])
    assert original_user is not None
    original_service = BookingService(session, original_user)
    with patch.object(original_service, "_ensure_verified_bank_card", new=AsyncMock()):
        await original_service.cancel_booking(
            BookingCancelRequest(accepted_terms=True), original_id
        )

    registered = await client.post(
        "/api/v1/auth/register",
        json={"phone": "09128887765", "password": "Test1234", "full_name": "جایگزین زیبال"},
    )
    await session.execute(
        text("UPDATE users SET phone_verified_at = now() WHERE id = :id"),
        {"id": registered.json()["user"]["id"]},
    )
    await session.flush()
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    held = await client.post(
        "/api/v1/bookings", json={"slot_id": slot_id, "version": version}, headers=headers
    )
    hold_id = held.json()["id"]

    monkeypatch.setattr(settings, "payment_gateway", "zibal")

    async def fake_request(self, **kwargs):
        return ZibalPaymentStartResult(
            track_id="15966442239999",
            start_url="https://gateway.zibal.ir/start/15966442239999",
            callback_url=kwargs["callback_url"],
            raw_response={"result": 100},
        )

    async def fake_verify(self, track_id: str):
        return ZibalPaymentVerificationResult(
            result=100,
            track_id=track_id,
            verified=True,
            ref_id="778899",
            message="OK",
            paid_amount=None,
            raw_response={"result": 100, "refId": "778899"},
            payment_status=1,
        )

    monkeypatch.setattr(
        "app.services.zibal_gateway.ZibalGatewayService.request_payment", fake_request
    )
    monkeypatch.setattr(
        "app.services.zibal_gateway.ZibalGatewayService.verify_payment", fake_verify
    )

    started = await client.post(
        f"/api/v1/bookings/replacement-holds/{hold_id}/pay", headers=headers
    )
    assert started.status_code == 200, started.text
    assert started.json()["checkout_type"] == "replacement_hold"

    verified = await client.post(
        "/api/v1/payments/zibal/verify",
        json={"track_id": "15966442239999"},
        headers=headers,
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["outcome"] == "paid"
    replacement_id = verified.json()["booking_id"]
    hold = await session.get(BookingHold, hold_id)
    assert hold is not None and hold.status == BookingHoldStatus.PAID
    assert hold.replacement_booking_id == verified.json()["booking_id"]
    assert (
        await session.scalar(
            text("SELECT count(*) FROM payments WHERE booking_id = :id"),
            {"id": replacement_id},
        )
        == 1
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"),
            {"id": original_id},
        )
        == 1
    )


async def test_expired_replacement_hold_reopens_request_without_touching_original(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    original_id = await _create_and_pay_online(client, user_token, slot_id)
    original_user = await session.get(User, user_token["user"]["id"])
    assert original_user is not None
    service = BookingService(session, original_user)
    with patch.object(service, "_ensure_verified_bank_card", new=AsyncMock()):
        await service.cancel_booking(BookingCancelRequest(accepted_terms=True), original_id)

    second = User(
        full_name="hold user",
        phone="09127776655",
        password_hash="test",
        role=UserRole.USER,
        phone_verified_at=datetime.now(timezone.utc),
    )
    session.add(second)
    await session.flush()
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    hold_response = await BookingService(session, second).create_booking(
        BookingCreate(slot_id=slot_id, version=version)
    )
    hold = await session.get(BookingHold, hold_response.id)
    assert hold is not None
    competitor = User(
        full_name="competing user",
        phone="09126665544",
        password_hash="test",
        role=UserRole.USER,
        phone_verified_at=datetime.now(timezone.utc),
    )
    session.add(competitor)
    await session.flush()
    with pytest.raises(HTTPException) as conflict:
        await BookingService(session, competitor).create_booking(
            BookingCreate(slot_id=slot_id, version=version)
        )
    assert conflict.value.status_code == 409
    cancelled_hold = await BookingService(session, second).cancel_replacement_hold(hold.id)
    assert cancelled_hold.status == BookingHoldStatus.CANCELLED
    request = await session.get(ReplacementRequest, hold.replacement_request_id)
    slot = await session.get(TimeSlot, slot_id)
    assert request is not None and request.status == ReplacementRequestStatus.OPEN
    assert slot is not None and slot.status == SlotStatus.PENDING_CANCELLATION
    replacement_hold = await BookingService(session, second).create_booking(
        BookingCreate(slot_id=slot_id, version=slot.version)
    )
    hold = await session.get(BookingHold, replacement_hold.id)
    assert hold is not None
    hold.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await session.flush()

    result = await expire_replacement_work(session, datetime.now(timezone.utc))
    await session.refresh(hold)
    original = await session.get(Booking, original_id)
    request = await session.get(ReplacementRequest, hold.replacement_request_id)
    assert result["expired_holds"] == 1
    assert hold.status == BookingHoldStatus.EXPIRED
    assert request is not None and request.status == ReplacementRequestStatus.OPEN
    assert original is not None and original.status == BookingStatus.PENDING_CANCELLATION
    slot = await session.get(TimeSlot, slot_id)
    assert slot is not None and slot.status == SlotStatus.PENDING_CANCELLATION
    next_version = slot.version
    next_hold = await BookingService(session, competitor).create_booking(
        BookingCreate(slot_id=slot_id, version=next_version)
    )
    assert next_hold.checkout_type == "replacement_hold"


async def test_replacement_deadline_restores_original_without_refund(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    original_id = await _create_and_pay_online(client, user_token, slot_id)
    original_user = await session.get(User, user_token["user"]["id"])
    assert original_user is not None
    service = BookingService(session, original_user)
    with patch.object(service, "_ensure_verified_bank_card", new=AsyncMock()):
        await service.cancel_booking(BookingCancelRequest(accepted_terms=True), original_id)
    request = await session.scalar(
        select(ReplacementRequest).where(ReplacementRequest.original_booking_id == original_id)
    )
    assert request is not None
    request.deadline = datetime.now(timezone.utc) - timedelta(seconds=1)
    await session.flush()

    result = await expire_replacement_work(session, datetime.now(timezone.utc))
    original = await session.get(Booking, original_id)
    slot = await session.get(TimeSlot, slot_id)
    await session.refresh(request)
    assert result["expired_requests"] == 1
    assert request.status == ReplacementRequestStatus.EXPIRED
    assert original is not None and original.status == BookingStatus.CONFIRMED
    assert original.penalty_amount is None
    assert slot is not None and slot.status == SlotStatus.RESERVED and slot.is_reserved
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"), {"id": original_id}
        )
        == 0
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM penalties WHERE booking_id = :id"), {"id": original_id}
        )
        == 0
    )


async def test_expired_booking_is_never_refundable() -> None:
    """Financial invariant: an unpaid expired booking must never create a refund."""
    ids = await _seed_committed_slot()
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    try:
        async with session_factory() as db:
            expired = Booking(
                user_id=ids["user_one_id"],
                slot_id=ids["slot_id"],
                status=BookingStatus.EXPIRED,
                source=BookingSource.ONLINE,
                price_paid=Decimal("100000"),
                slot_price=Decimal("100000"),
            )
            db.add(expired)
            await db.commit()
            user = await db.get(User, ids["user_one_id"])
            assert user is not None
            service = BookingService(db, user)
            with (
                patch.object(service, "_ensure_verified_bank_card", new=AsyncMock()),
                pytest.raises(HTTPException) as exc_info,
            ):
                await service.cancel_booking(
                    data=type("Cancel", (), {"accepted_terms": True, "card_number": None})(),
                    booking_id=expired.id,
                )
            assert exc_info.value.status_code == 409
    finally:
        await _cleanup_committed_world(ids)


async def _api_vendor_and_slot(
    client, session: AsyncSession, manager_token: dict, *, hours: int
) -> tuple[int, int]:
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    vendor = await client.post(
        "/api/v1/vendors",
        json={
            "name": f"critical vendor {uuid4().hex[:6]}",
            "sport_types": ["futsal"],
            "address": "تهران",
            "latitude": 35.7,
            "longitude": 51.4,
            "capacity": 10,
        },
        headers=headers,
    )
    assert vendor.status_code == 201, vendor.text
    vendor_id = vendor.json()["id"]
    await session.execute(
        text("UPDATE vendors SET is_active = true WHERE id = :id"), {"id": vendor_id}
    )
    start = datetime.now(timezone.utc) + timedelta(hours=hours)
    slot_id = await session.scalar(
        text(
            """
            INSERT INTO time_slots (vendor_id, start_time, end_time, base_price, is_reserved, version)
            VALUES (:vendor_id, :start, :end, 100000, false, 1)
            RETURNING id
            """
        ),
        {"vendor_id": vendor_id, "start": start, "end": start + timedelta(hours=2)},
    )
    await session.flush()
    assert slot_id is not None
    return vendor_id, slot_id


async def _create_and_pay_online(client, user_token: dict, slot_id: int) -> int:
    headers = {"Authorization": f"Bearer {user_token['access_token']}"}
    created = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": 1},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    booking_id = created.json()["id"]
    original_gateway = settings.payment_gateway
    settings.payment_gateway = "mock"
    try:
        with patch("random.random", return_value=0.5):
            paid = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=headers)
    finally:
        settings.payment_gateway = original_gateway
    assert paid.status_code == 200, paid.text
    return booking_id
