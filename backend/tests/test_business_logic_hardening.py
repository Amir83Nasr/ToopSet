from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = [pytest.mark.asyncio]

COURT_PAYLOAD = {
    "name": "مجموعه تست منطق",
    "sport_types": ["futsal"],
    "address": "تهران",
    "latitude": 35.6892,
    "longitude": 51.3890,
    "capacity": 10,
}


async def _manager_token(
    client: AsyncClient, session: AsyncSession, phone: str = "09128888888"
) -> dict:
    reg = await client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "password": "Test1234", "full_name": "manager two"},
    )
    assert reg.status_code == 201, reg.text
    user_id = reg.json()["user"]["id"]
    await session.execute(text("UPDATE users SET role = 'manager' WHERE id = :id"), {"id": user_id})
    await session.flush()
    login = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "Test1234"})
    assert login.status_code == 200, login.text
    return login.json()


async def _create_vendor(client: AsyncClient, token: dict, session: AsyncSession, *, active: bool):
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=headers)
    assert resp.status_code == 201, resp.text
    vendor_id = resp.json()["id"]
    if active:
        await session.execute(
            text("UPDATE vendors SET is_active = true WHERE id = :id"),
            {"id": vendor_id},
        )
        await session.flush()
    return vendor_id


async def _create_slot(
    session: AsyncSession,
    vendor_id: int,
    *,
    offset_hours: int = 72,
    ball_available: bool = False,
    ball_price: int = 0,
) -> int:
    start = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    end = start + timedelta(hours=2)
    await session.execute(
        text("UPDATE vendors SET ball_available = :available, ball_price = :price WHERE id = :id"),
        {"id": vendor_id, "available": ball_available, "price": ball_price},
    )
    result = await session.execute(
        text(
            """
            INSERT INTO time_slots (
                vendor_id, start_time, end_time, base_price, is_reserved, version
            )
            VALUES (:vendor_id, :start, :end, 100.00, false, 1)
            RETURNING id
            """
        ),
        {
            "vendor_id": vendor_id,
            "start": start,
            "end": end,
        },
    )
    await session.flush()
    return result.scalar_one()


async def _slot_version(client: AsyncClient, slot_id: int) -> int:
    resp = await client.get(f"/api/v1/slots/{slot_id}")
    assert resp.status_code == 200, resp.text
    return resp.json()["version"]


class TestVenueApprovalHardening:
    async def test_manager_can_create_multiple_pending_vendors(
        self, client: AsyncClient, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        first = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=headers)
        second = await client.post(
            "/api/v1/vendors",
            json={**COURT_PAYLOAD, "name": "مجموعه دوم"},
            headers=headers,
        )
        assert first.status_code == 201
        assert second.status_code == 201
        assert first.json()["is_active"] is False
        assert second.json()["is_active"] is False

    async def test_manager_cannot_self_activate_pending_vendor(
        self, client: AsyncClient, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=headers)
        vendor_id = vendor.json()["id"]

        resp = await client.patch(
            f"/api/v1/vendors/{vendor_id}",
            json={"is_active": True},
            headers=headers,
        )
        assert resp.status_code == 403

    async def test_pending_vendor_cannot_create_slots(
        self, client: AsyncClient, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=headers)
        vendor_id = vendor.json()["id"]

        resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={
                "vendor_id": vendor_id,
                "start_time": "2026-07-01T10:00:00",
                "end_time": "2026-07-01T11:30:00",
                "base_price": 150000,
            },
            headers=headers,
        )
        assert resp.status_code == 409

    async def test_manager_cannot_create_slot_for_other_manager_vendor(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict
    ) -> None:
        owner_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=owner_headers)
        vendor_id = vendor.json()["id"]
        await session.execute(
            text("UPDATE vendors SET is_active = true WHERE id = :id"),
            {"id": vendor_id},
        )
        await session.flush()

        other = await _manager_token(client, session)
        other_headers = {"Authorization": f"Bearer {other['access_token']}"}
        resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={
                "vendor_id": vendor_id,
                "start_time": "2026-07-01T12:00:00",
                "end_time": "2026-07-01T13:30:00",
                "base_price": 150000,
            },
            headers=other_headers,
        )
        assert resp.status_code == 403


class TestRefundAndBallLogic:
    async def test_confirmed_booking_refund_requires_verified_bank_card(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session, active=True)
        slot_id = await _create_slot(session, vendor_id, offset_hours=72)
        version = await _slot_version(client, slot_id)

        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        created = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
            headers=headers,
        )
        booking_id = created.json()["id"]
        with patch("random.random", return_value=0.5):
            paid = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=headers)
        assert paid.status_code == 200

        blocked = await client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            json={"accepted_terms": True},
            headers=headers,
        )
        assert blocked.status_code == 409

        lookup = await client.post(
            "/api/v1/wallet/bank-cards/lookup",
            json={"card_number": "6037991234567891"},
            headers=headers,
        )
        assert lookup.status_code == 200, lookup.text
        card_id = lookup.json()["id"]
        confirmed_card = await client.post(
            f"/api/v1/wallet/bank-cards/{card_id}/confirm",
            headers=headers,
        )
        assert confirmed_card.status_code == 200

        cancelled = await client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            json={"accepted_terms": True},
            headers=headers,
        )
        assert cancelled.status_code == 200, cancelled.text
        assert cancelled.json()["status"] == "cancelled"
        assert cancelled.json()["penalty_amount"] == 10.0

        refund = await session.execute(
            text(
                """
                SELECT refund_amount, penalty_amount, status, type,
                       destination_card_masked, destination_card_encrypted
                FROM refunds
                WHERE booking_id = :booking_id
                """
            ),
            {"booking_id": booking_id},
        )
        refund_row = refund.mappings().one()
        assert float(refund_row["refund_amount"]) == 90.0
        assert float(refund_row["penalty_amount"]) == 10.0
        assert refund_row["status"] == "pending"
        assert refund_row["type"] == "user_cancellation"
        assert refund_row["destination_card_masked"] == "6037-****-****-7891"
        assert refund_row["destination_card_encrypted"]

        my_refunds = await client.get("/api/v1/refunds/my", headers=headers)
        assert my_refunds.status_code == 200
        assert my_refunds.json()["refunds"][0]["destination_card_masked"] == ("6037-****-****-7891")

        balance = await client.get("/api/v1/wallet/balance", headers=headers)
        assert balance.json()["balance"] == 0.0

    async def test_with_ball_booking_uses_vendor_ball_price(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session, active=True)
        slot_id = await _create_slot(
            session, vendor_id, offset_hours=72, ball_available=True, ball_price=25
        )
        version = await _slot_version(client, slot_id)

        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        created = await client.post(
            "/api/v1/bookings",
            json={
                "slot_id": slot_id,
                "version": version,
                "participants_count": 1,
                "with_ball": True,
            },
            headers=headers,
        )
        assert created.status_code == 201, created.text
        data = created.json()
        assert data["slot_price"] == 100.0
        assert data["ball_price"] == 25.0
        assert data["price_paid"] == 125.0
