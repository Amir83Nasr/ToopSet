"""Tests for review endpoints (list, create, report, respond, delete)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.time_slot import TimeSlot

pytestmark = [pytest.mark.asyncio]

_vendor_counter = 0


async def _create_vendor(client: AsyncClient, token: dict) -> int:
    """Create a vendor with a unique name and return its id."""
    global _vendor_counter
    _vendor_counter += 1
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    resp = await client.post(
        "/api/v1/vendors",
        json={
            "name": f"زمین نقد {_vendor_counter}",
            "sport_types": ["futsal"],
            "address": "قم، خیابان اصلی",
            "latitude": 34.6399,
            "longitude": 50.8759,
            "capacity": 10,
        },
        headers=headers,
    )
    assert resp.status_code == 201, f"Vendor creation failed: {resp.status_code} {resp.text[:200]}"
    return resp.json()["id"]


async def _create_past_slot(client: AsyncClient, vendor_id: int, token: dict) -> dict:
    """Create a bookable future slot; it is completed after booking creation."""
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    start = datetime.now(timezone.utc) + timedelta(hours=4)
    resp = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots",
        json={
            "vendor_id": vendor_id,
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=2)).isoformat(),
            "base_price": 100000,
        },
        headers=headers,
    )
    assert resp.status_code == 201, f"Slot creation failed: {resp.status_code} {resp.text[:200]}"
    return resp.json()


async def _create_booking(client: AsyncClient, slot_id: int, version: int, token: dict) -> dict:
    """Create a booking for a slot."""
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "slot_id": slot_id,
            "version": version,
        },
        headers=headers,
    )
    assert resp.status_code == 201, f"Booking creation failed: {resp.status_code} {resp.text[:200]}"
    return resp.json()


async def _confirm_booking_via_db(booking_id: int, slot_id: int, session: AsyncSession) -> None:
    """Mark a booking as confirmed and reserve its slot directly in the DB.

    Avoids the flaky mock PaymentService (75% random success).
    """
    booking = await session.get(Booking, booking_id)
    assert booking is not None, f"Booking {booking_id} not found"
    booking.status = BookingStatus.CONFIRMED
    slot = await session.get(TimeSlot, slot_id)
    assert slot is not None
    slot.start_time = datetime.now(timezone.utc) - timedelta(hours=5)
    slot.end_time = datetime.now(timezone.utc) - timedelta(hours=3)
    slot.is_reserved = True
    await session.flush()


async def _setup_review_scenario(
    client: AsyncClient,
    manager_token: dict,
    user_token: dict,
    session: AsyncSession,
) -> dict:
    """
    Create a vendor and booking, then move the confirmed slot into the completed past.

    Returns dict with vendor_id, slot_id, booking_id for review creation.
    """
    vendor_id = await _create_vendor(client, manager_token)
    await session.execute(
        text("UPDATE vendors SET is_active = true WHERE id = :vendor_id"),
        {"vendor_id": vendor_id},
    )
    await session.flush()
    slot = await _create_past_slot(client, vendor_id, manager_token)
    booking = await _create_booking(client, slot["id"], slot["version"], user_token)
    await _confirm_booking_via_db(booking["id"], slot["id"], session)
    return {
        "vendor_id": vendor_id,
        "slot_id": slot["id"],
        "booking_id": booking["id"],
    }


class TestListRecentReviews:
    """GET /reviews/recent — public list of recent reviews."""

    async def test_empty(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/reviews/recent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["reviews"] == []
        assert data["total"] == 0


class TestListMyReviews:
    """GET /reviews/my — authenticated user's reviews."""

    async def test_empty_for_fresh_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/reviews/my", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["reviews"] == []
        assert data["total"] == 0


class TestCreateReviewNoAuth:
    """POST /reviews — authentication required."""

    async def test_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/reviews",
            json={"booking_id": 1, "rating": 5, "comment": "Great"},
        )
        assert resp.status_code == 401


class TestListAfterCreate:
    """List endpoints reflect newly created reviews."""

    async def test_recent_and_my_include_new_review(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        session: AsyncSession,
    ) -> None:
        setup = await _setup_review_scenario(client, manager_token, user_token, session)
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}

        # Create a review
        create_resp = await client.post(
            "/api/v1/reviews",
            json={
                "booking_id": setup["booking_id"],
                "rating": 4,
                "comment": "Vendor was great!",
            },
            headers=user_headers,
        )
        assert create_resp.status_code == 201
        review_id = create_resp.json()["id"]

        # Recent reviews (public) should include it
        recent_resp = await client.get("/api/v1/reviews/recent")
        assert recent_resp.status_code == 200
        recent_data = recent_resp.json()
        assert recent_data["total"] >= 1
        assert any(r["id"] == review_id for r in recent_data["reviews"])
        assert any(r["rating"] == 4 for r in recent_data["reviews"])

        # My reviews (user) should include it
        my_resp = await client.get("/api/v1/reviews/my", headers=user_headers)
        assert my_resp.status_code == 200
        my_data = my_resp.json()
        assert my_data["total"] >= 1
        assert any(r["id"] == review_id for r in my_data["reviews"])

    async def test_vendor_reviews_include_new_review(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        session: AsyncSession,
    ) -> None:
        setup = await _setup_review_scenario(client, manager_token, user_token, session)
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}

        create_resp = await client.post(
            "/api/v1/reviews",
            json={
                "booking_id": setup["booking_id"],
                "rating": 5,
                "comment": "Vendor review endpoint works",
            },
            headers=user_headers,
        )
        assert create_resp.status_code == 201
        review_id = create_resp.json()["id"]

        vendor_resp = await client.get(f"/api/v1/vendors/{setup['vendor_id']}/reviews?limit=5")
        assert vendor_resp.status_code == 200
        vendor_data = vendor_resp.json()
        assert vendor_data["total"] >= 1
        assert any(r["id"] == review_id for r in vendor_data["reviews"])


class TestReportReview:
    """POST /reviews/{review_id}/report — admin-only report."""

    async def test_report_success(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        admin_token: dict,
        session: AsyncSession,
    ) -> None:
        setup = await _setup_review_scenario(client, manager_token, user_token, session)
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}

        # Create a review
        create_resp = await client.post(
            "/api/v1/reviews",
            json={
                "booking_id": setup["booking_id"],
                "rating": 3,
                "comment": "OK",
            },
            headers=user_headers,
        )
        assert create_resp.status_code == 201
        review_id = create_resp.json()["id"]

        # Report by admin
        report_resp = await client.post(
            f"/api/v1/reviews/{review_id}/report",
            headers=admin_headers,
        )
        assert report_resp.status_code == 200
        report_data = report_resp.json()
        assert report_data["success"] is True


class TestDeleteReview:
    """DELETE /reviews/{review_id} — admin-only delete."""

    async def test_delete_success(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        admin_token: dict,
        session: AsyncSession,
    ) -> None:
        setup = await _setup_review_scenario(client, manager_token, user_token, session)
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}

        # Create a review
        create_resp = await client.post(
            "/api/v1/reviews",
            json={
                "booking_id": setup["booking_id"],
                "rating": 5,
                "comment": "Perfect!",
            },
            headers=user_headers,
        )
        assert create_resp.status_code == 201
        review_id = create_resp.json()["id"]

        # Delete by admin
        delete_resp = await client.delete(
            f"/api/v1/reviews/{review_id}",
            headers=admin_headers,
        )
        assert delete_resp.status_code == 204


class TestCreateReviewInvalidRating:
    """POST /reviews — rating must be 1–5."""

    async def test_rating_too_low(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/reviews",
            json={"booking_id": 999, "rating": 0, "comment": "bad"},
            headers=headers,
        )
        assert resp.status_code == 422

    async def test_rating_too_high(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/reviews",
            json={"booking_id": 999, "rating": 6, "comment": "too high"},
            headers=headers,
        )
        assert resp.status_code == 422


class TestCreateReviewCommentTooLong:
    """POST /reviews — comment max length is 1000."""

    async def test_comment_too_long(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/reviews",
            json={
                "booking_id": 999,
                "rating": 5,
                "comment": "a" * 1001,
            },
            headers=headers,
        )
        assert resp.status_code == 422
