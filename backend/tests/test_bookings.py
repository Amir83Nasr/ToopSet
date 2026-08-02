"""Integration tests for booking endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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
            json={"slot_id": slot_id, "version": version, "participants_count": 2},
            headers=user_headers,
        )

        # Assert
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["status"] == "pending_payment"
        assert data["participants_count"] == 2
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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
            headers=user_headers,
        )

        # Act: second booking same slot
        resp2 = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
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
                "participants_count": 1,
            },
            headers=user_headers,
        )
        assert first.status_code == 201, first.text

        second = await client.post(
            "/api/v1/bookings",
            json={
                "slot_id": second_slot_id,
                "version": await _get_slot_version(client, second_slot_id),
                "participants_count": 1,
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
            json={"slot_id": slot_id, "version": 999, "participants_count": 1},
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
            json={"slot_id": slot_id, "version": 1, "participants_count": 1},
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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        with patch("random.random", return_value=0.5):
            resp = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "confirmed"

    async def test_pay_already_paid(
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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        # Pay once successfully
        with patch("random.random", return_value=0.5):
            await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        # Pay again — already paid
        resp = await client.post(f"/api/v1/bookings/{booking_id}/pay", headers=user_headers)
        assert resp.status_code == 400


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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
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
            json={"slot_id": slot_id, "version": version, "participants_count": 1},
            headers=user_headers,
        )
        booking_id = create.json()["id"]

        await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=user_headers)
        resp = await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=user_headers)
        assert resp.status_code == 409
