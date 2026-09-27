"""State-matrix coverage for booking & cancellation flows (user and manager sides).

Complements test_bookings.py / test_reservation_critical_flows.py with the
states those suites leave out: every cancellation-terms mode, cancel/withdraw
guards, replacement-hold interactions, and the manager-side cancellation
variants (manual bookings, pending-payment bookings, release vs block).
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.replacement import BookingHold, BookingHoldStatus
from app.models.user import User
from app.schemas.booking import BookingCancelRequest
from app.services.booking_service import BookingService
from app.services.finance_service import FinanceService

pytestmark = pytest.mark.asyncio


# ── Shared helpers ────────────────────────────────────────────────────────────


async def _api_vendor_and_slot(
    client, session: AsyncSession, manager_token: dict, *, hours: int, days: int = 0
) -> tuple[int, int]:
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    vendor = await client.post(
        "/api/v1/vendors",
        json={
            "name": f"matrix vendor {uuid4().hex[:6]}",
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
    start = datetime.now(timezone.utc) + timedelta(hours=hours, days=days)
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


def _headers(token: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {token['access_token']}"}


async def _create_and_pay_online(client, user_token: dict, slot_id: int) -> int:
    headers = _headers(user_token)
    created = await client.post(
        "/api/v1/bookings", json={"slot_id": slot_id, "version": 1}, headers=headers
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


async def _register_verified_user(client, session: AsyncSession, phone: str) -> dict:
    registered = await client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "password": "Test1234", "full_name": "کاربر تست"},
    )
    assert registered.status_code == 201, registered.text
    await session.execute(
        text("UPDATE users SET phone_verified_at = now() WHERE id = :id"),
        {"id": registered.json()["user"]["id"]},
    )
    await session.flush()
    return registered.json()


async def _get_user(session: AsyncSession, user_token: dict) -> User:
    user = await session.get(User, user_token["user"]["id"])
    assert user is not None
    return user


async def _user_cancel(session: AsyncSession, user: User, booking_id: int):
    """Cancel through the real service with the bank-card gate mocked out."""
    service = BookingService(session, user)
    with patch.object(service, "_ensure_verified_bank_card", new=AsyncMock()):
        return await service.cancel_booking(BookingCancelRequest(accepted_terms=True), booking_id)


async def _pay_booking_with_mock(client, user_token: dict, booking_id: int):
    original_gateway = settings.payment_gateway
    settings.payment_gateway = "mock"
    try:
        with patch("random.random", return_value=0.5):
            return await client.post(
                f"/api/v1/bookings/{booking_id}/pay", headers=_headers(user_token)
            )
    finally:
        settings.payment_gateway = original_gateway


async def _cancel_to_pending_replacement(
    client, session: AsyncSession, manager_token: dict, user_token: dict, *, hours: int = 24
) -> tuple[int, int]:
    """Pay a booking then cancel near-term so it lands in pending_cancellation."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=hours)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    await _user_cancel(session, await _get_user(session, user_token), booking_id)
    return booking_id, slot_id


async def _slot_row(session: AsyncSession, slot_id: int) -> dict:
    return (
        (
            await session.execute(
                text("SELECT status, is_reserved FROM time_slots WHERE id = :id"),
                {"id": slot_id},
            )
        )
        .mappings()
        .one()
    )


async def _shift_slot_into_past(session: AsyncSession, slot_id: int) -> None:
    now = datetime.now(timezone.utc)
    await session.execute(
        text("UPDATE time_slots SET start_time = :s, end_time = :e WHERE id = :id"),
        {
            "id": slot_id,
            "s": now - timedelta(hours=2),
            "e": now - timedelta(hours=1),
        },
    )
    session.expire_all()


# ── User side: booking-creation guard states ─────────────────────────────────


async def test_booking_rejected_beyond_14_day_public_window(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """Only slots starting within the next 14 days are publicly bookable."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=2, days=20)
    response = await client.post(
        "/api/v1/bookings", json={"slot_id": slot_id, "version": 1}, headers=_headers(user_token)
    )
    assert response.status_code == 409
    assert "دو هفته" in response.json()["detail"]


async def test_booking_with_ball_rejected_when_vendor_has_no_ball(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """with_ball on a vendor without ball availability is a 400, not a priced booking."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=5)
    response = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": 1, "with_ball": True},
        headers=_headers(user_token),
    )
    assert response.status_code == 400
    assert await _slot_row(session, slot_id) == {"status": "open", "is_reserved": False}


async def test_unverified_phone_cannot_book_outside_development(
    client, session: AsyncSession, manager_token: dict, monkeypatch
) -> None:
    """In production the phone must be OTP-verified before a booking can start."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=5)
    registered = await client.post(
        "/api/v1/auth/register",
        json={"phone": "09125556677", "password": "Test1234", "full_name": "بی‌تأیید"},
    )
    assert registered.status_code == 201, registered.text
    # Development registration auto-verifies the phone; the guard under test
    # only exists for unverified phones, so undo that dev shortcut.
    await session.execute(
        text("UPDATE users SET phone_verified_at = NULL WHERE id = :id"),
        {"id": registered.json()["user"]["id"]},
    )
    await session.flush()

    monkeypatch.setattr(settings, "app_environment", "production")
    try:
        response = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": 1},
            headers=_headers(registered.json()),
        )
    finally:
        monkeypatch.setattr(settings, "app_environment", "development")
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "phone_verification_required"
    assert await _slot_row(session, slot_id) == {"status": "open", "is_reserved": False}


async def test_owner_cannot_rebook_slot_while_own_booking_awaits_replacement(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """The pending-cancellation owner must not become their own replacement."""
    booking_id, slot_id = await _cancel_to_pending_replacement(
        client, session, manager_token, user_token
    )
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    again = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": version},
        headers=_headers(user_token),
    )
    assert again.status_code == 409
    assert "در انتظار جایگزین" in again.json()["detail"]
    hold_count = await session.scalar(
        text("SELECT count(*) FROM booking_holds WHERE slot_id = :id"), {"id": slot_id}
    )
    assert hold_count == 0


# ── User side: pending-checkout surfacing ────────────────────────────────────


async def test_pending_checkout_endpoint_surfaces_live_booking_then_hold(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    created = await client.post(
        "/api/v1/bookings", json={"slot_id": slot_id, "version": 1}, headers=_headers(user_token)
    )
    assert created.status_code == 201
    booking_id = created.json()["id"]

    live = await client.get("/api/v1/bookings/pending-checkout", headers=_headers(user_token))
    assert live.status_code == 200
    assert live.json()["checkout_type"] == "booking"
    assert live.json()["booking_id"] == booking_id
    assert live.json()["can_resume"] is True

    paid = await _pay_booking_with_mock(client, user_token, booking_id)
    assert paid.status_code == 200, paid.text
    await _user_cancel(session, await _get_user(session, user_token), booking_id)

    candidate = await _register_verified_user(client, session, "09124445566")
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    held = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": version},
        headers=_headers(candidate),
    )
    assert held.status_code == 201 and held.json()["checkout_type"] == "replacement_hold"

    hold_live = await client.get("/api/v1/bookings/pending-checkout", headers=_headers(candidate))
    assert hold_live.status_code == 200
    assert hold_live.json()["checkout_type"] == "replacement_hold"
    assert hold_live.json()["booking_id"] == held.json()["id"]
    assert hold_live.json()["can_resume"] is True


# ── User side: cancellation-terms state matrix ────────────────────────────────


async def test_cancellation_terms_mode_for_confirmed_far_booking(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """More than 48h left: refund_with_penalty with a 90/10 split."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    terms = await client.get(
        f"/api/v1/bookings/{booking_id}/cancellation-terms", headers=_headers(user_token)
    )
    assert terms.status_code == 200
    body = terms.json()
    assert body["can_cancel"] is True
    assert body["mode"] == "refund_with_penalty"
    assert body["requires_bank_card"] is True
    assert body["refund_amount"] == 90_000.0
    assert body["penalty_amount"] == 10_000.0


async def test_cancellation_terms_mode_for_confirmed_near_booking(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """48h or less: pending_replacement, money stays until someone replaces."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    terms = await client.get(
        f"/api/v1/bookings/{booking_id}/cancellation-terms", headers=_headers(user_token)
    )
    body = terms.json()
    assert body["can_cancel"] is True
    assert body["mode"] == "pending_replacement"
    assert body["requires_bank_card"] is True
    assert body["refund_amount"] == 90_000.0


async def test_cancellation_terms_mode_after_slot_started(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    await _shift_slot_into_past(session, slot_id)
    terms = await client.get(
        f"/api/v1/bookings/{booking_id}/cancellation-terms", headers=_headers(user_token)
    )
    body = terms.json()
    assert body["can_cancel"] is False
    assert body["mode"] == "started"


async def test_cancellation_terms_mode_when_awaiting_replacement(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    booking_id, _ = await _cancel_to_pending_replacement(client, session, manager_token, user_token)
    terms = await client.get(
        f"/api/v1/bookings/{booking_id}/cancellation-terms", headers=_headers(user_token)
    )
    body = terms.json()
    assert body["can_cancel"] is False
    assert body["mode"] == "already_pending_cancellation"


async def test_cancellation_terms_mode_after_cancellation(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    await _user_cancel(session, await _get_user(session, user_token), booking_id)
    terms = await client.get(
        f"/api/v1/bookings/{booking_id}/cancellation-terms", headers=_headers(user_token)
    )
    body = terms.json()
    assert body["can_cancel"] is False
    assert body["mode"] == "already_cancelled"


# ── User side: cancel guard states ───────────────────────────────────────────


async def test_cancel_confirmed_booking_after_slot_started_rejected(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    await _shift_slot_into_past(session, slot_id)
    response = await client.post(
        f"/api/v1/bookings/{booking_id}/cancel",
        json={"accepted_terms": True},
        headers=_headers(user_token),
    )
    assert response.status_code == 409
    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.CONFIRMED
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"), {"id": booking_id}
        )
        == 0
    )


async def test_cancel_with_stale_expected_mode_rejected(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """The 48h boundary moved: a stale UI mode must be rejected, not honoured."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=24)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    response = await client.post(
        f"/api/v1/bookings/{booking_id}/cancel",
        json={"accepted_terms": True, "expected_mode": "refund_with_penalty"},
        headers=_headers(user_token),
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "cancellation_terms_changed"
    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.CONFIRMED


async def test_cancel_without_accepting_terms_rejected(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    response = await client.post(
        f"/api/v1/bookings/{booking_id}/cancel", json={}, headers=_headers(user_token)
    )
    assert response.status_code == 400
    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.CONFIRMED


async def test_cancel_twice_in_pending_cancellation_rejected(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    booking_id, _ = await _cancel_to_pending_replacement(client, session, manager_token, user_token)
    with pytest.raises(HTTPException) as exc_info:
        await _user_cancel(session, await _get_user(session, user_token), booking_id)
    assert exc_info.value.status_code == 409


async def test_early_cancel_books_penalty_row_and_excludes_settlement(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """Early cancel side effects: penalty row, refund, settlement excluded, slot freed."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    await _user_cancel(session, await _get_user(session, user_token), booking_id)

    penalty = (
        (
            await session.execute(
                text("SELECT user_id, amount FROM penalties WHERE booking_id = :id"),
                {"id": booking_id},
            )
        )
        .mappings()
        .one()
    )
    assert penalty["user_id"] == user_token["user"]["id"]
    assert float(penalty["amount"]) == 10_000.0
    settlement = await session.scalar(
        text("SELECT settlement_status FROM bookings WHERE id = :id"), {"id": booking_id}
    )
    assert settlement == "excluded_due_to_refund"
    assert await _slot_row(session, slot_id) == {"status": "open", "is_reserved": False}


# ── User side: withdraw-cancellation guards ──────────────────────────────────


async def test_withdraw_blocked_while_replacement_hold_is_live(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """A live candidate hold freezes the original owner's withdrawal."""
    booking_id, slot_id = await _cancel_to_pending_replacement(
        client, session, manager_token, user_token
    )
    candidate = await _register_verified_user(client, session, "09124445577")
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    held = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": version},
        headers=_headers(candidate),
    )
    assert held.status_code == 201 and held.json()["checkout_type"] == "replacement_hold"

    blocked = await client.post(
        f"/api/v1/bookings/{booking_id}/withdraw-cancellation", headers=_headers(user_token)
    )
    assert blocked.status_code == 409
    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.PENDING_CANCELLATION


async def test_withdraw_blocked_after_slot_started(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    booking_id, slot_id = await _cancel_to_pending_replacement(
        client, session, manager_token, user_token
    )
    await _shift_slot_into_past(session, slot_id)
    blocked = await client.post(
        f"/api/v1/bookings/{booking_id}/withdraw-cancellation", headers=_headers(user_token)
    )
    assert blocked.status_code == 409
    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.PENDING_CANCELLATION


# ── Replacement flow states ──────────────────────────────────────────────────


async def test_live_replacement_hold_blocks_holder_from_new_bookings(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """The single-live-checkout rule also applies to an active replacement hold."""
    booking_id, slot_id = await _cancel_to_pending_replacement(
        client, session, manager_token, user_token
    )
    del booking_id
    candidate = await _register_verified_user(client, session, "09124445588")
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    held = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": version},
        headers=_headers(candidate),
    )
    assert held.status_code == 201
    hold_id = held.json()["id"]

    _, other_slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=30)
    blocked = await client.post(
        "/api/v1/bookings",
        json={"slot_id": other_slot_id, "version": 1},
        headers=_headers(candidate),
    )
    assert blocked.status_code == 409
    detail = blocked.json()["detail"]
    assert detail["code"] == "pending_booking_limit_reached"
    assert detail["checkout_type"] == "replacement_hold"
    assert detail["hold_id"] == hold_id
    assert await _slot_row(session, other_slot_id) == {"status": "open", "is_reserved": False}


async def test_paying_replacement_hold_after_deadline_restores_original(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """Pay attempt past the request deadline expires the hold and re-confirms the owner."""
    booking_id, slot_id = await _cancel_to_pending_replacement(
        client, session, manager_token, user_token
    )
    candidate = await _register_verified_user(client, session, "09124445599")
    version = await session.scalar(
        text("SELECT version FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    held = await client.post(
        "/api/v1/bookings",
        json={"slot_id": slot_id, "version": version},
        headers=_headers(candidate),
    )
    hold_id = held.json()["id"]
    await session.execute(
        text(
            "UPDATE replacement_requests SET deadline = now() - interval '1 minute' "
            "WHERE original_booking_id = :id"
        ),
        {"id": booking_id},
    )
    await session.flush()

    original_gateway = settings.payment_gateway
    settings.payment_gateway = "mock"
    try:
        late = await client.post(
            f"/api/v1/bookings/replacement-holds/{hold_id}/pay", headers=_headers(candidate)
        )
    finally:
        settings.payment_gateway = original_gateway
    assert late.status_code == 409

    hold = await session.get(BookingHold, hold_id)
    request = await session.scalar(
        text("SELECT status FROM replacement_requests WHERE original_booking_id = :id"),
        {"id": booking_id},
    )
    booking = await session.get(Booking, booking_id)
    assert hold is not None and hold.status == BookingHoldStatus.EXPIRED
    assert request == "expired"
    assert booking is not None and booking.status == BookingStatus.CONFIRMED
    assert await _slot_row(session, slot_id) == {"status": "reserved", "is_reserved": True}
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"), {"id": booking_id}
        )
        == 0
    )


# ── Manager (vendor) side: manual bookings ───────────────────────────────────


async def test_manager_manual_booking_requires_open_slot(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    await _create_and_pay_online(client, user_token, slot_id)

    manual = await client.post(
        "/api/v1/manager/bookings/manual",
        json={"slot_id": slot_id, "full_name": "مشتری حضوری", "phone_number": "09123334455"},
        headers=_headers(manager_token),
    )
    assert manual.status_code == 409
    count = await session.scalar(
        text("SELECT count(*) FROM bookings WHERE slot_id = :id"), {"id": slot_id}
    )
    assert count == 1


async def test_manager_cancel_manual_booking_releases_slot_without_refund(
    client, session: AsyncSession, manager_token: dict
) -> None:
    """A walk-in booking has no online money: cancel just frees (or blocks) the slot."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    manual = await client.post(
        "/api/v1/manager/bookings/manual",
        json={"slot_id": slot_id, "full_name": "مشتری حضوری", "phone_number": "09123334466"},
        headers=_headers(manager_token),
    )
    assert manual.status_code == 201, manual.text
    booking_id = manual.json()["id"]
    assert manual.json()["status"] == "confirmed"

    cancelled = await client.post(
        f"/api/v1/manager/bookings/{booking_id}/cancel",
        json={"reason": "تعطیلی مجموعه", "release_slot": True},
        headers=_headers(manager_token),
    )
    assert cancelled.status_code == 200, cancelled.text
    body = cancelled.json()
    assert body["booking_id"] == booking_id
    assert body["release_slot"] is True
    assert body["online_paid_amount"] is None
    assert float(body["site_cost_amount"]) == 0.0

    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.CANCELLED
    assert await _slot_row(session, slot_id) == {"status": "open", "is_reserved": False}
    assert (
        await session.scalar(
            text("SELECT settlement_status FROM bookings WHERE id = :id"), {"id": booking_id}
        )
        == "excluded_due_to_cancellation"
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"), {"id": booking_id}
        )
        == 0
    )


async def test_manager_recurring_booking_matches_midnight_wrap_slot(
    client, session: AsyncSession, manager_token: dict
) -> None:
    """22:30 -> 00:00 wraps past midnight: the recurring pass materialises the
    end on the next day (same as the weekly template) and books the slot."""
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    vendor = await client.post(
        "/api/v1/vendors",
        json={
            "name": f"wrap vendor {uuid4().hex[:6]}",
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

    iran = timezone(timedelta(hours=3, minutes=30))
    target = (datetime.now(timezone.utc) + timedelta(days=7)).date()
    start = datetime.combine(target, time(22, 30), tzinfo=iran)
    end = datetime.combine(target + timedelta(days=1), time(0, 0), tzinfo=iran)
    slot_id = await session.scalar(
        text(
            """
            INSERT INTO time_slots (vendor_id, start_time, end_time, base_price, is_reserved, version)
            VALUES (:vendor_id, :start, :end, 100000, false, 1)
            RETURNING id
            """
        ),
        {"vendor_id": vendor_id, "start": start, "end": end},
    )
    await session.flush()

    # Frontend weekday convention: 0=Saturday ... 6=Friday.
    persian_idx = (target.weekday() + 2) % 7
    recurring = await client.post(
        "/api/v1/manager/bookings/recurring",
        json={
            "vendor_id": vendor_id,
            "full_name": "ایمان",
            "phone_number": "09123334477",
            "date_from": target.isoformat(),
            "date_to": target.isoformat(),
            "days_of_week": [persian_idx],
            "start_time": "22:30",
            "end_time": "00:00",
            "allow_partial": True,
        },
        headers=headers,
    )
    assert recurring.status_code == 201, recurring.text
    body = recurring.json()
    assert body["created"] == 1
    assert body["failed"] == 0
    assert len(body["booking_ids"]) == 1
    assert body["conflicts"] == []
    assert await _slot_row(session, slot_id) == {"status": "reserved", "is_reserved": True}


async def test_manager_cancel_without_release_blocks_slot(
    client, session: AsyncSession, manager_token: dict
) -> None:
    """release_slot=False keeps the time unsellable instead of reopening it."""
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    manual = await client.post(
        "/api/v1/manager/bookings/manual",
        json={"slot_id": slot_id, "full_name": "مشتری حضوری", "phone_number": "09123334477"},
        headers=_headers(manager_token),
    )
    booking_id = manual.json()["id"]

    cancelled = await client.post(
        f"/api/v1/manager/bookings/{booking_id}/cancel",
        json={"reason": "تعمیرات", "release_slot": False},
        headers=_headers(manager_token),
    )
    assert cancelled.status_code == 200
    assert await _slot_row(session, slot_id) == {"status": "blocked", "is_reserved": False}


# ── Manager (vendor) side: cancelling online bookings ────────────────────────


async def test_manager_cancel_pending_payment_booking_frees_slot_without_refund(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    created = await client.post(
        "/api/v1/bookings", json={"slot_id": slot_id, "version": 1}, headers=_headers(user_token)
    )
    booking_id = created.json()["id"]

    cancelled = await client.post(
        f"/api/v1/manager/bookings/{booking_id}/cancel",
        json={"reason": "تعطیلی مجموعه", "release_slot": True},
        headers=_headers(manager_token),
    )
    assert cancelled.status_code == 200, cancelled.text
    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.CANCELLED
    assert await _slot_row(session, slot_id) == {"status": "open", "is_reserved": False}
    assert (
        await session.scalar(
            text("SELECT count(*) FROM refunds WHERE booking_id = :id"), {"id": booking_id}
        )
        == 0
    )


async def test_manager_cancel_pending_cancellation_revokes_replacement_and_refunds_full(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    """Cancelling a pending-cancellation booking closes the replacement and refunds 100%."""
    booking_id, slot_id = await _cancel_to_pending_replacement(
        client, session, manager_token, user_token
    )

    cancelled = await client.post(
        f"/api/v1/manager/bookings/{booking_id}/cancel",
        json={"reason": "تعطیلی مجموعه", "release_slot": True},
        headers=_headers(manager_token),
    )
    assert cancelled.status_code == 200, cancelled.text
    assert float(cancelled.json()["site_cost_amount"]) == 100_000.0

    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.CANCELLED
    request_status = await session.scalar(
        text("SELECT status FROM replacement_requests WHERE original_booking_id = :id"),
        {"id": booking_id},
    )
    assert request_status == "revoked"
    refund = (
        (
            await session.execute(
                text(
                    "SELECT type, penalty_amount, refund_amount, penalty_charged_to_user, "
                    "site_bears_penalty FROM refunds WHERE booking_id = :id"
                ),
                {"id": booking_id},
            )
        )
        .mappings()
        .one()
    )
    assert refund["type"] == "manager_cancellation"
    assert float(refund["penalty_amount"]) == 0.0
    assert float(refund["refund_amount"]) == 100_000.0
    assert refund["penalty_charged_to_user"] is False
    assert refund["site_bears_penalty"] is True
    assert await _slot_row(session, slot_id) == {"status": "open", "is_reserved": False}


async def test_manager_cannot_cancel_other_vendors_booking(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)

    stranger = User(
        full_name="manager دیگر",
        phone="09122223344",
        password_hash="test",
    )
    session.add(stranger)
    await session.flush()
    with pytest.raises(HTTPException) as exc_info:
        await FinanceService(session, stranger).cancel_booking_by_manager(
            booking_id, reason="ناموجاز", release_slot=True
        )
    assert exc_info.value.status_code == 403
    booking = await session.get(Booking, booking_id)
    assert booking is not None and booking.status == BookingStatus.CONFIRMED


async def test_manager_cancel_already_cancelled_booking_rejected(
    client, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    _, slot_id = await _api_vendor_and_slot(client, session, manager_token, hours=72)
    booking_id = await _create_and_pay_online(client, user_token, slot_id)
    await _user_cancel(session, await _get_user(session, user_token), booking_id)

    again = await client.post(
        f"/api/v1/manager/bookings/{booking_id}/cancel",
        json={"reason": "دوباره", "release_slot": True},
        headers=_headers(manager_token),
    )
    assert again.status_code == 409
    # slot_cancellations records manager-caused cancellations only; the user's
    # own cancel and this rejected attempt must both leave it empty.
    cancellation_rows = await session.scalar(
        text("SELECT count(*) FROM slot_cancellations WHERE booking_id = :id"), {"id": booking_id}
    )
    assert cancellation_rows == 0
