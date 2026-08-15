"""Integration tests for booking endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.zibal_gateway import (
    ZibalPaymentStartResult,
    ZibalPaymentVerificationResult,
    ZibalVerificationError,
)

pytestmark = [pytest.mark.asyncio]

COURT_PAYLOAD = {
    "name": "زمین تست",
    "sport_types": ["futsal"],
    "address": "تهران",
    "latitude": 35.6892,
    "longitude": 51.3890,
    "capacity": 10,
}


async def _create_slot(
    client: AsyncClient, session: AsyncSession, vendor_id: int, *, offset_hours: int = 4
) -> int:
    """Insert a time slot directly and return its id + version."""
    await session.execute(
        text("UPDATE vendors SET is_active = true WHERE id = :vendor_id"),
        {"vendor_id": vendor_id},
    )
    start = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    end = start + timedelta(hours=2)

    # Create via API if possible, or raw SQL

    result = await session.execute(
        text(
            """INSERT INTO time_slots (vendor_id, start_time, end_time, base_price, is_reserved, version)
               VALUES (:vendor_id, :start, :end, 100.00, false, 1)
               RETURNING id"""
        ),
        {"vendor_id": vendor_id, "start": start, "end": end},
    )
    row = result.fetchone()
    assert row is not None
    await session.flush()
    return row[0]


async def _get_slot_version(client: AsyncClient, slot_id: int) -> int:
    """Fetch a time slot to get its version field."""
    resp = await client.get(f"/api/v1/slots/{slot_id}")
    assert resp.status_code == 200
    return resp.json()["version"]


class TestCreateBooking:
    async def test_create_booking_success(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        # Arrange: create vendor + slot
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]

        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        # Act
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )

        # Assert
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["status"] == "pending_payment"
        assert data["slot_id"] == slot_id
        assert data["user_id"] == user_token["user"]["id"]

    async def test_create_double_book_rejected(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        # Arrange: create vendor + slot + first booking
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]

        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )

        # Act: second booking same slot
        resp2 = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        assert resp2.status_code == 409
        assert "قبلاً" in resp2.text

    async def test_user_cannot_hold_two_different_slots(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        first_slot_id = await _create_slot(client, session, vendor_id, offset_hours=4)
        second_slot_id = await _create_slot(client, session, vendor_id, offset_hours=8)
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}

        first = await client.post(
            "/api/v1/bookings",
            json={
                "slot_id": first_slot_id,
                "version": await _get_slot_version(client, first_slot_id),
            },
            headers=user_headers,
        )
        assert first.status_code == 201, first.text

        second = await client.post(
            "/api/v1/bookings",
            json={
                "slot_id": second_slot_id,
                "version": await _get_slot_version(client, second_slot_id),
            },
            headers=user_headers,
        )
        assert second.status_code == 409
        assert "pending_booking_limit_reached" in second.text

    async def test_create_booking_version_conflict(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]

        slot_id = await _create_slot(client, session, vendor_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": 999},
            headers=user_headers,
        )
        assert resp.status_code == 409

    async def test_create_booking_unauthenticated(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)

        resp = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": 1},
        )
        assert resp.status_code == 401


class TestListBookings:
    async def test_list_my_bookings(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )

        resp = await client.get("/api/v1/bookings", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["bookings"][0]["slot_id"] == slot_id


class TestGetBooking:
    async def test_get_booking_detail(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        resp = await client.get(f"/api/v1/bookings/{booking_id}", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == booking_id
        assert resp.json()["vendor_name"] == "زمین تست"

    async def test_get_other_user_booking_forbidden(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        # Different user — register a second user
        resp2 = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09129999999", "password": "Test1234", "full_name": "other"},
        )
        other_token = resp2.json()["access_token"]

        resp = await client.get(
            f"/api/v1/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert resp.status_code == 403


class TestPayBooking:
    async def test_pay_booking(
        self,
        client: AsyncClient,
        session: AsyncSession,
        manager_token: dict,
        user_token: dict,
        monkeypatch,
    ):
        monkeypatch.setattr(settings, "payment_gateway", "mock")
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        with patch("random.random", return_value=0.5):
            resp = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "confirmed"

    async def test_pay_already_paid(
        self,
        client: AsyncClient,
        session: AsyncSession,
        manager_token: dict,
        user_token: dict,
        monkeypatch,
    ):
        monkeypatch.setattr(settings, "payment_gateway", "mock")
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        # Pay once successfully
        with patch("random.random", return_value=0.5):
            await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        # Pay again — already paid
        resp = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        assert resp.status_code == 400

    async def test_start_zibal_payment_returns_gateway_url(
        self,
        client: AsyncClient,
        session: AsyncSession,
        manager_token: dict,
        user_token: dict,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setattr(settings, "payment_gateway", "zibal")
        monkeypatch.setattr(settings, "zibal_merchant", "test-merchant")
        monkeypatch.setattr(
            settings, "zibal_callback_url", "https://example.com/book/payment/callback"
        )

        async def fake_request_payment(self, **kwargs):
            return ZibalPaymentStartResult(
                track_id="15966442233311",
                start_url="https://gateway.zibal.ir/start/15966442233311",
                callback_url=kwargs["callback_url"],
                raw_response={"result": 100, "trackId": "15966442233311"},
            )

        monkeypatch.setattr(
            "app.services.zibal_gateway.ZibalGatewayService.request_payment",
            fake_request_payment,
        )

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        resp = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["payment_gateway"] == "zibal"
        assert data["track_id"] == "15966442233311"
        assert data["start_url"].endswith("/start/15966442233311")

    async def test_verify_zibal_payment_confirms_booking(
        self,
        client: AsyncClient,
        session: AsyncSession,
        manager_token: dict,
        user_token: dict,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setattr(settings, "payment_gateway", "zibal")
        monkeypatch.setattr(settings, "zibal_merchant", "test-merchant")
        monkeypatch.setattr(
            settings, "zibal_callback_url", "https://example.com/book/payment/callback"
        )

        async def fake_request_payment(self, **kwargs):
            return ZibalPaymentStartResult(
                track_id="15966442233312",
                start_url="https://gateway.zibal.ir/start/15966442233312",
                callback_url=kwargs["callback_url"],
                raw_response={"result": 100, "trackId": "15966442233312"},
            )

        async def fake_verify_payment(self, track_id: str):
            return ZibalPaymentVerificationResult(
                result=100,
                track_id=track_id,
                verified=True,
                ref_id="99887766",
                message="OK",
                paid_amount=None,
                raw_response={"result": 100, "refId": "99887766"},
                payment_status=1,
            )

        monkeypatch.setattr(
            "app.services.zibal_gateway.ZibalGatewayService.request_payment",
            fake_request_payment,
        )
        monkeypatch.setattr(
            "app.services.zibal_gateway.ZibalGatewayService.verify_payment",
            fake_verify_payment,
        )

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        pay_resp = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        assert pay_resp.status_code == 200, pay_resp.text
        track_id = pay_resp.json()["track_id"]

        verify_resp = await client.post(
            "/api/v1/payments/zibal/verify",
            json={"track_id": track_id},
            headers=user_headers,
        )
        assert verify_resp.status_code == 200, verify_resp.text
        assert verify_resp.json()["outcome"] == "paid"
        assert verify_resp.json()["booking_id"] == booking_id

    async def test_unauthenticated_cancelled_callback_releases_booking(
        self,
        client: AsyncClient,
        session: AsyncSession,
        manager_token: dict,
        user_token: dict,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setattr(settings, "payment_gateway", "zibal")
        monkeypatch.setattr(
            settings,
            "zibal_callback_url",
            "http://test/api/v1/payments/zibal/callback",
        )
        monkeypatch.setattr(
            settings, "payment_result_url", "https://toopset.ir/book/payment/callback"
        )

        async def fake_request_payment(self, **kwargs):
            return ZibalPaymentStartResult(
                track_id="4733198010",
                start_url="https://gateway.zibal.ir/start/4733198010",
                callback_url=kwargs["callback_url"],
                raw_response={"result": 100, "trackId": "4733198010"},
            )

        async def fake_verify_payment(self, track_id: str):
            raise ZibalVerificationError("پرداخت لغو شده است")

        async def fake_inquiry_payment(self, track_id: str):
            return ZibalPaymentVerificationResult(
                result=100,
                track_id=track_id,
                verified=False,
                ref_id=None,
                message="cancelled",
                paid_amount=20000,
                raw_response={"result": 100, "status": 3, "amount": 200000},
                payment_status=3,
            )

        monkeypatch.setattr(
            "app.services.zibal_gateway.ZibalGatewayService.request_payment",
            fake_request_payment,
        )
        monkeypatch.setattr(
            "app.services.zibal_gateway.ZibalGatewayService.verify_payment",
            fake_verify_payment,
        )
        monkeypatch.setattr(
            "app.services.zibal_gateway.ZibalGatewayService.inquiry_payment",
            fake_inquiry_payment,
        )

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]
        await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)

        callback = await client.get("/api/v1/payments/zibal/callback?trackId=4733198010")
        assert callback.status_code == 303
        assert "outcome=failed" in callback.headers["location"]
        assert (
            await session.scalar(
                text("SELECT status FROM bookings WHERE id = :id"), {"id": booking_id}
            )
            == "cancelled"
        )
        assert (
            await session.scalar(
                text("SELECT status FROM payments WHERE booking_id = :id"),
                {"id": booking_id},
            )
            == "failed"
        )
        slot_state = (
            await session.execute(
                text("SELECT status, is_reserved FROM time_slots WHERE id = :id"),
                {"id": slot_id},
            )
        ).one()
        assert slot_state.status == "open"
        assert slot_state.is_reserved is False


class TestCancelBooking:
    async def test_cancel_pending_booking(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        # Slot far in the future (more than 24h) to avoid cancellation restrictions
        slot_id = await _create_slot(client, session, vendor_id, offset_hours=48)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        resp = await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    async def test_cancel_already_cancelled(
        self, client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id, offset_hours=48)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        create = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=user_headers)
        resp = await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=user_headers)
        assert resp.status_code == 409
