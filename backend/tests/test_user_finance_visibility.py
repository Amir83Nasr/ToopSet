from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.card_security import encrypt_card_number, mask_card_number
from app.core.timezone import now_utc
from app.models.booking import Booking, BookingSource, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.models.refund import Refund, RefundStatus, RefundType
from app.models.time_slot import SlotStatus, TimeSlot
from app.models.vendor import Vendor

pytestmark = [pytest.mark.asyncio]


async def _finance_records(
    session: AsyncSession,
    *,
    user_id: int,
    manager_id: int,
) -> tuple[Booking, Refund]:
    vendor = Vendor(
        manager_id=manager_id,
        name="مجموعه مالی تست",
        sport_types=["futsal"],
        address="تهران",
        latitude=35.7,
        longitude=51.4,
        capacity=10,
        is_active=True,
    )
    session.add(vendor)
    await session.flush()
    slot = TimeSlot(
        vendor_id=vendor.id,
        start_time=now_utc() + timedelta(days=4),
        end_time=now_utc() + timedelta(days=4, hours=2),
        base_price=Decimal("1000000"),
        status=SlotStatus.OPEN,
    )
    session.add(slot)
    await session.flush()
    booking = Booking(
        user_id=user_id,
        slot_id=slot.id,
        status=BookingStatus.CANCELLED,
        source=BookingSource.ONLINE,
        price_paid=Decimal("1000000"),
        slot_price=Decimal("1000000"),
        ball_price=Decimal("0"),
    )
    session.add(booking)
    await session.flush()
    card_number = "6037991234567891"
    refund = Refund(
        booking_id=booking.id,
        user_id=user_id,
        vendor_id=vendor.id,
        slot_id=slot.id,
        slot_start_time=slot.start_time,
        slot_end_time=slot.end_time,
        original_amount=booking.price_paid,
        slot_price=booking.slot_price,
        ball_price=Decimal("0"),
        total_paid=booking.price_paid,
        penalty_amount=Decimal("100000"),
        refund_amount=Decimal("900000"),
        reason="لغو کاربر",
        type=RefundType.USER_CANCELLATION,
        status=RefundStatus.PENDING,
        destination_card_encrypted=encrypt_card_number(card_number),
        destination_card_masked=mask_card_number(card_number),
        destination_card_holder_name="کاربر تست",
    )
    session.add(refund)
    await session.flush()
    return booking, refund


async def test_my_refunds_are_owner_scoped_and_include_manual_payout_tracking(
    client: AsyncClient,
    session: AsyncSession,
    user_token: dict,
    manager_token: dict,
    admin_token: dict,
) -> None:
    booking, refund = await _finance_records(
        session,
        user_id=user_token["user"]["id"],
        manager_id=manager_token["user"]["id"],
    )
    user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
    admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
    manager_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}

    response = await client.get("/api/v1/refunds/my", headers=user_headers)
    assert response.status_code == 200, response.text
    assert response.json()["total"] == 1
    item = response.json()["refunds"][0]
    assert item["booking_id"] == booking.id
    assert item["destination_card_masked"] == "6037-****-****-7891"
    assert "card_number" not in item

    other_user_response = await client.get("/api/v1/refunds/my", headers=manager_headers)
    assert other_user_response.status_code == 200
    assert other_user_response.json()["refunds"] == []

    reveal = await client.get(
        f"/api/v1/admin/refunds/{refund.id}/destination", headers=admin_headers
    )
    assert reveal.status_code == 200, reveal.text
    assert reveal.json()["card_number"] == "6037991234567891"

    approve = await client.patch(
        f"/api/v1/admin/refunds/{refund.id}",
        json={"status": "approved", "admin_note": "تأیید شد"},
        headers=admin_headers,
    )
    assert approve.status_code == 200, approve.text
    paid = await client.patch(
        f"/api/v1/admin/refunds/{refund.id}",
        json={"status": "paid", "payment_tracking_code": "TRACK-123"},
        headers=admin_headers,
    )
    assert paid.status_code == 200, paid.text

    refreshed = await client.get("/api/v1/refunds/my", headers=user_headers)
    paid_item = refreshed.json()["refunds"][0]
    assert paid_item["status"] == "paid"
    assert paid_item["paid_at"] is not None
    assert paid_item["payment_tracking_code"] == "TRACK-123"


async def test_my_bookings_categories_include_transferred_and_payment_details(
    client: AsyncClient,
    session: AsyncSession,
    user_token: dict,
    manager_token: dict,
) -> None:
    user_id = user_token["user"]["id"]
    manager_id = manager_token["user"]["id"]
    vendor = Vendor(
        manager_id=manager_id,
        name="مجموعه دسته‌بندی",
        sport_types=["futsal"],
        address="تهران",
        latitude=35.7,
        longitude=51.4,
        capacity=10,
        is_active=True,
    )
    session.add(vendor)
    await session.flush()

    async def add_booking(offset_days: int, status: BookingStatus) -> Booking:
        start = now_utc() + timedelta(days=offset_days)
        slot = TimeSlot(
            vendor_id=vendor.id,
            start_time=start,
            end_time=start + timedelta(hours=2),
            base_price=Decimal("250000"),
            status=SlotStatus.RESERVED,
            is_reserved=status == BookingStatus.CONFIRMED,
        )
        session.add(slot)
        await session.flush()
        booking = Booking(
            user_id=user_id,
            slot_id=slot.id,
            status=status,
            source=BookingSource.ONLINE,
            price_paid=Decimal("250000"),
            slot_price=Decimal("250000"),
            ball_price=Decimal("0"),
        )
        session.add(booking)
        await session.flush()
        return booking

    current = await add_booking(2, BookingStatus.CONFIRMED)
    await add_booking(-2, BookingStatus.CONFIRMED)
    transferred = await add_booking(3, BookingStatus.TRANSFERRED)
    session.add(
        Payment(
            booking_id=current.id,
            amount=Decimal("250000"),
            status=PaymentStatus.SUCCESS,
            card_number="6037991234567891",
        )
    )
    await session.flush()

    headers = {"Authorization": f"Bearer {user_token['access_token']}"}
    current_response = await client.get(
        "/api/v1/bookings?category=current&limit=20", headers=headers
    )
    assert current_response.status_code == 200, current_response.text
    assert [row["id"] for row in current_response.json()["bookings"]] == [current.id]
    assert current_response.json()["bookings"][0]["payment"]["status"] == "success"
    assert current_response.json()["bookings"][0]["payment"]["card_number"] == (
        "6037-****-****-7891"
    )
    assert current_response.json()["category_counts"] == {
        "current": 1,
        "past": 1,
        "cancelled": 1,
    }

    cancelled_response = await client.get(
        "/api/v1/bookings?category=cancelled&limit=20", headers=headers
    )
    assert cancelled_response.status_code == 200
    assert [row["id"] for row in cancelled_response.json()["bookings"]] == [transferred.id]
