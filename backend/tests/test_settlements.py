from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.card_security import card_fingerprint, encrypt_card_number, mask_card_number
from app.core.timezone import now_utc
from app.models.bank_card import BankCard, BankCardStatus
from app.models.booking import Booking, BookingSource, BookingStatus, SettlementStatus
from app.models.payment import Payment, PaymentStatus
from app.models.setting import Setting
from app.models.settlement import SettlementItem, SettlementRequestStatus
from app.models.time_slot import SlotStatus, TimeSlot
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.finance import SettlementStatusUpdate
from app.services.finance_service import FinanceService

pytestmark = pytest.mark.asyncio


async def test_partial_settlement_input_is_rejected() -> None:
    with pytest.raises(ValidationError):
        SettlementStatusUpdate.model_validate({"status": "approved", "approved_amount": "1"})


async def _seed_eligible_booking(
    session: AsyncSession, manager: User, customer: User
) -> tuple[Vendor, Booking]:
    vendor = Vendor(
        manager_id=manager.id,
        name="سالن تسویه",
        sport_types=["futsal"],
        address="قم",
        latitude=34.6,
        longitude=50.8,
        capacity=12,
        is_active=True,
    )
    session.add(vendor)
    await session.flush()
    slot = TimeSlot(
        vendor_id=vendor.id,
        start_time=now_utc() - timedelta(hours=3),
        end_time=now_utc() - timedelta(hours=1),
        base_price=Decimal("100000"),
        status=SlotStatus.RESERVED,
        is_reserved=True,
    )
    session.add(slot)
    await session.flush()
    booking = Booking(
        user_id=customer.id,
        slot_id=slot.id,
        status=BookingStatus.CONFIRMED,
        source=BookingSource.ONLINE,
        settlement_status=SettlementStatus.NOT_SETTLED,
        price_paid=Decimal("100000"),
        slot_price=Decimal("100000"),
        ball_price=Decimal("0"),
    )
    session.add(booking)
    await session.flush()
    session.add(
        Payment(
            booking_id=booking.id,
            amount=booking.price_paid,
            gateway_fee=Decimal("1000"),
            status=PaymentStatus.SUCCESS,
        )
    )
    await session.flush()
    return vendor, booking


async def test_settlement_is_full_net_snapshot_and_paid_is_immutable(
    session: AsyncSession, manager_token: dict, user_token: dict, admin_token: dict
) -> None:
    manager = await session.get(User, manager_token["user"]["id"])
    customer = await session.get(User, user_token["user"]["id"])
    admin = await session.get(User, admin_token["user"]["id"])
    assert manager and customer and admin
    vendor, booking = await _seed_eligible_booking(session, manager, customer)
    card_number = "6037991234567890"
    session.add_all(
        [
            BankCard(
                user_id=manager.id,
                encrypted_card_number=encrypt_card_number(card_number),
                masked_card_number=mask_card_number(card_number),
                card_fingerprint=card_fingerprint(card_number),
                holder_name="مدیر سالن",
                status=BankCardStatus.VERIFIED,
                verified_at=now_utc(),
            ),
            Setting(key="commission_percent", value="10"),
        ]
    )
    await session.flush()

    settlement = await FinanceService(session, manager).create_settlement_request(
        vendor_id=vendor.id,
        period_from=None,
        period_to=None,
        manager_note=None,
    )
    item = (
        await session.execute(
            select(SettlementItem).where(SettlementItem.settlement_id == settlement.id)
        )
    ).scalar_one()
    assert settlement.gross_amount == Decimal("100000")
    assert settlement.commission_amount == Decimal("10000.00")
    assert settlement.gateway_fee == Decimal("1000")
    assert settlement.requested_amount == Decimal("89000.00")
    assert item.amount == settlement.requested_amount
    assert settlement.destination_card_masked == mask_card_number(card_number)

    admin_service = FinanceService(session, admin)
    await admin_service.update_settlement_status(
        settlement.id,
        new_status=SettlementRequestStatus.APPROVED,
        admin_note=None,
        payment_tracking_code=None,
    )
    assert settlement.approved_amount == settlement.requested_amount
    with pytest.raises(HTTPException):
        await admin_service.update_settlement_status(
            settlement.id,
            new_status=SettlementRequestStatus.APPROVED,
            admin_note=None,
            payment_tracking_code=None,
        )
    await admin_service.update_settlement_status(
        settlement.id,
        new_status=SettlementRequestStatus.PAID,
        admin_note=None,
        payment_tracking_code="TRACK-1",
    )
    assert booking.settlement_status == SettlementStatus.SETTLED
    with pytest.raises(HTTPException):
        await admin_service.update_settlement_status(
            settlement.id,
            new_status=SettlementRequestStatus.PAID,
            admin_note=None,
            payment_tracking_code="TRACK-2",
        )


async def test_rejected_booking_can_enter_a_new_settlement(
    session: AsyncSession, manager_token: dict, user_token: dict, admin_token: dict
) -> None:
    manager = await session.get(User, manager_token["user"]["id"])
    customer = await session.get(User, user_token["user"]["id"])
    admin = await session.get(User, admin_token["user"]["id"])
    assert manager and customer and admin
    vendor, booking = await _seed_eligible_booking(session, manager, customer)
    card_number = "6037991234567890"
    session.add(
        BankCard(
            user_id=manager.id,
            encrypted_card_number=encrypt_card_number(card_number),
            masked_card_number=mask_card_number(card_number),
            card_fingerprint=card_fingerprint(card_number),
            status=BankCardStatus.VERIFIED,
            verified_at=now_utc(),
        )
    )
    await session.flush()
    service = FinanceService(session, manager)
    first = await service.create_settlement_request(
        vendor_id=vendor.id, period_from=None, period_to=None, manager_note=None
    )
    await FinanceService(session, admin).update_settlement_status(
        first.id,
        new_status=SettlementRequestStatus.REJECTED,
        admin_note="اصلاح شود",
        payment_tracking_code=None,
    )
    second = await service.create_settlement_request(
        vendor_id=vendor.id, period_from=None, period_to=None, manager_note=None
    )
    assert second.id != first.id
    assert booking.settlement_status == SettlementStatus.SETTLEMENT_REQUESTED


async def test_finance_bookings_only_returns_successful_online_reservations(
    session: AsyncSession,
    client: AsyncClient,
    manager_token: dict,
    user_token: dict,
) -> None:
    manager = await session.get(User, manager_token["user"]["id"])
    customer = await session.get(User, user_token["user"]["id"])
    assert manager and customer
    vendor, eligible = await _seed_eligible_booking(session, manager, customer)

    async def add_booking(
        *,
        hours_until_end: int,
        source: BookingSource = BookingSource.ONLINE,
        booking_status: BookingStatus = BookingStatus.CONFIRMED,
        settlement_status: SettlementStatus = SettlementStatus.NOT_SETTLED,
        successful_payment: bool = True,
    ) -> Booking:
        slot = TimeSlot(
            vendor_id=vendor.id,
            start_time=now_utc() + timedelta(hours=hours_until_end - 1),
            end_time=now_utc() + timedelta(hours=hours_until_end),
            base_price=Decimal("100000"),
            status=SlotStatus.RESERVED,
            is_reserved=True,
        )
        session.add(slot)
        await session.flush()
        booking = Booking(
            user_id=customer.id,
            slot_id=slot.id,
            status=booking_status,
            source=source,
            settlement_status=settlement_status,
            price_paid=Decimal("100000"),
            slot_price=Decimal("100000"),
            ball_price=Decimal("0"),
        )
        session.add(booking)
        await session.flush()
        if successful_payment:
            session.add(
                Payment(
                    booking_id=booking.id,
                    amount=booking.price_paid,
                    status=PaymentStatus.SUCCESS,
                )
            )
            await session.flush()
        return booking

    future = await add_booking(hours_until_end=2)
    pending = await add_booking(
        hours_until_end=-1,
        settlement_status=SettlementStatus.SETTLEMENT_REQUESTED,
    )
    settled = await add_booking(
        hours_until_end=-1,
        settlement_status=SettlementStatus.SETTLED,
    )
    manual = await add_booking(hours_until_end=-1, source=BookingSource.MANAGER_MANUAL)
    unpaid = await add_booking(hours_until_end=-1, successful_payment=False)
    cancelled = await add_booking(
        hours_until_end=-1,
        booking_status=BookingStatus.CANCELLED,
    )
    excluded = await add_booking(
        hours_until_end=-1,
        settlement_status=SettlementStatus.EXCLUDED_DUE_TO_REFUND,
    )

    response = await client.get(
        f"/api/v1/manager/bookings?finance_only=true&vendor_id={vendor.id}&limit=500",
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    states = {item["id"]: item["settlement_state"] for item in data["bookings"]}
    assert data["total"] == 4
    assert states == {
        eligible.id: "eligible",
        future.id: "not_yet_eligible",
        pending.id: "pending_settlement",
        settled.id: "settled",
    }
    assert {manual.id, unpaid.id, cancelled.id, excluded.id}.isdisjoint(states)


async def test_manager_settlement_detail_includes_items_and_tracking_code(
    session: AsyncSession,
    client: AsyncClient,
    manager_token: dict,
    user_token: dict,
    admin_token: dict,
) -> None:
    manager = await session.get(User, manager_token["user"]["id"])
    customer = await session.get(User, user_token["user"]["id"])
    admin = await session.get(User, admin_token["user"]["id"])
    assert manager and customer and admin
    vendor, _booking = await _seed_eligible_booking(session, manager, customer)
    card_number = "6037991234567890"
    session.add(
        BankCard(
            user_id=manager.id,
            encrypted_card_number=encrypt_card_number(card_number),
            masked_card_number=mask_card_number(card_number),
            card_fingerprint=card_fingerprint(card_number),
            status=BankCardStatus.VERIFIED,
            verified_at=now_utc(),
        )
    )
    await session.flush()

    settlement = await FinanceService(session, manager).create_settlement_request(
        vendor_id=vendor.id,
        period_from=None,
        period_to=None,
        manager_note=None,
    )
    await FinanceService(session, admin).update_settlement_status(
        settlement.id,
        new_status=SettlementRequestStatus.APPROVED,
        admin_note=None,
        payment_tracking_code=None,
    )
    await FinanceService(session, admin).update_settlement_status(
        settlement.id,
        new_status=SettlementRequestStatus.PAID,
        admin_note=None,
        payment_tracking_code="TRACK-999",
    )

    response = await client.get(
        f"/api/v1/manager/settlements/{settlement.id}",
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["id"] == settlement.id
    assert data["payment_tracking_code"] == "TRACK-999"
    assert data["items"]
    assert data["items"][0]["booking_id"] is not None
    assert data["items"][0]["slot_start_time"]
    assert data["items"][0]["slot_end_time"]
