"""Tests for notification endpoints (list, unread count, mark read)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification

pytestmark = [pytest.mark.asyncio]


class TestListNotifications:
    async def test_list_empty(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/notifications", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["notifications"] == []

    async def test_list_with_data(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        n = Notification(user_id=user_id, type="test", message="Test notification")
        session.add(n)
        await session.flush()

        resp = await client.get("/api/v1/notifications", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["notifications"]) == 1
        assert data["notifications"][0]["message"] == "Test notification"
        assert data["notifications"][0]["type"] == "test"
        assert data["notifications"][0]["is_read"] is False

    async def test_list_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/notifications")
        assert resp.status_code == 401

    async def test_list_unread_only(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        n1 = Notification(user_id=user_id, type="test", message="Read notification", is_read=True)
        n2 = Notification(user_id=user_id, type="test", message="Unread notification")
        session.add_all([n1, n2])
        await session.flush()

        resp = await client.get("/api/v1/notifications?unread_only=true", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["notifications"][0]["message"] == "Unread notification"

    async def test_list_with_search(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        n1 = Notification(user_id=user_id, type="test", message="Booking confirmed")
        n2 = Notification(user_id=user_id, type="test", message="Payment received")
        session.add_all([n1, n2])
        await session.flush()

        resp = await client.get("/api/v1/notifications?search=Booking", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["notifications"][0]["message"] == "Booking confirmed"

    async def test_list_with_type_filter(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        n1 = Notification(user_id=user_id, type="booking", message="New booking")
        n2 = Notification(user_id=user_id, type="payment", message="Payment received")
        session.add_all([n1, n2])
        await session.flush()

        resp = await client.get("/api/v1/notifications?type=booking", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["notifications"][0]["type"] == "booking"
        assert data["notifications"][0]["message"] == "New booking"

    async def test_list_with_pagination(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        for i in range(5):
            session.add(Notification(user_id=user_id, type="test", message=f"Notification {i}"))
        await session.flush()

        resp = await client.get("/api/v1/notifications?skip=0&limit=2", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert len(data["notifications"]) == 2

    async def test_list_other_user_not_visible(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session: AsyncSession
    ) -> None:
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]
        mgr_id = manager_token["user"]["id"]

        # Create notifications for both users
        session.add(Notification(user_id=user_id, type="test", message="User notification"))
        session.add(Notification(user_id=mgr_id, type="test", message="Manager notification"))
        await session.flush()

        # User should only see their own notification
        resp = await client.get("/api/v1/notifications", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["notifications"][0]["message"] == "User notification"


class TestUnreadCount:
    async def test_count_zero(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/notifications/unread-count", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == {"count": 0}

    async def test_count_after_create(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        session.add(Notification(user_id=user_id, type="test", message="Test"))
        await session.flush()

        resp = await client.get("/api/v1/notifications/unread-count", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == {"count": 1}

    async def test_count_after_mark_read(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        n = Notification(user_id=user_id, type="test", message="Test")
        session.add(n)
        await session.flush()

        # Mark as read
        await client.post(f"/api/v1/notifications/{n.id}/read", headers=headers)

        # Count should now be zero
        resp = await client.get("/api/v1/notifications/unread-count", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == {"count": 0}

    async def test_count_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/notifications/unread-count")
        assert resp.status_code == 401


class TestMarkRead:
    async def test_mark_read_success(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        n = Notification(user_id=user_id, type="test", message="Test notification")
        session.add(n)
        await session.flush()

        resp = await client.post(f"/api/v1/notifications/{n.id}/read", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_read"] is True
        assert data["id"] == n.id
        assert data["message"] == "Test notification"

    async def test_mark_read_twice(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        n = Notification(user_id=user_id, type="test", message="Test")
        session.add(n)
        await session.flush()

        # First mark
        resp1 = await client.post(f"/api/v1/notifications/{n.id}/read", headers=headers)
        assert resp1.status_code == 200
        assert resp1.json()["is_read"] is True

        # Second mark — still succeeds (idempotent)
        resp2 = await client.post(f"/api/v1/notifications/{n.id}/read", headers=headers)
        assert resp2.status_code == 200
        assert resp2.json()["is_read"] is True

    async def test_mark_read_not_found(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post("/api/v1/notifications/99999/read", headers=headers)
        assert resp.status_code == 404

    async def test_mark_read_other_user(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session: AsyncSession
    ) -> None:
        user_id = user_token["user"]["id"]

        n = Notification(user_id=user_id, type="test", message="Other user's notification")
        session.add(n)
        await session.flush()

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.post(f"/api/v1/notifications/{n.id}/read", headers=mgr_headers)
        assert resp.status_code == 404
        await session.refresh(n)
        assert n.is_read is False

    async def test_mark_read_unauthenticated(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        user_id = user_token["user"]["id"]
        n = Notification(user_id=user_id, type="test", message="Test")
        session.add(n)
        await session.flush()

        resp = await client.post(f"/api/v1/notifications/{n.id}/read")
        assert resp.status_code == 401


class TestMarkAllRead:
    async def test_mark_all_read_success(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        for i in range(3):
            session.add(Notification(user_id=user_id, type="test", message=f"Notification {i}"))
        await session.flush()

        resp = await client.post("/api/v1/notifications/read-all", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == {"success": True}

        # Verify all are now read
        list_resp = await client.get("/api/v1/notifications?unread_only=true", headers=headers)
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] == 0

    async def test_mark_all_read_partial(
        self, client: AsyncClient, user_token: dict, session: AsyncSession
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        # Mix of read and unread
        session.add(
            Notification(user_id=user_id, type="test", message="Already read", is_read=True)
        )
        session.add(Notification(user_id=user_id, type="test", message="Still unread"))
        await session.flush()

        await client.post("/api/v1/notifications/read-all", headers=headers)

        list_resp = await client.get("/api/v1/notifications?unread_only=true", headers=headers)
        assert list_resp.json()["total"] == 0

        # Total should still be 2
        full_resp = await client.get("/api/v1/notifications", headers=headers)
        assert full_resp.json()["total"] == 2

    async def test_mark_all_read_no_notifications(
        self, client: AsyncClient, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post("/api/v1/notifications/read-all", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == {"success": True}

    async def test_mark_all_read_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.post("/api/v1/notifications/read-all")
        assert resp.status_code == 401

    async def test_mark_all_read_other_user_unaffected(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session: AsyncSession
    ) -> None:
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        mgr_id = manager_token["user"]["id"]

        # Notification for manager
        session.add(Notification(user_id=mgr_id, type="test", message="Manager notification"))
        await session.flush()

        # User marks all as read — should not affect manager's notification
        await client.post("/api/v1/notifications/read-all", headers=user_headers)

        mgr_resp = await client.get("/api/v1/notifications?unread_only=true", headers=mgr_headers)
        assert mgr_resp.status_code == 200
        assert mgr_resp.json()["total"] == 1


# ── Domain-event notification integration ────────────────────────────────────


class TestJalaliFormatting:
    """Pure formatting helpers produce Persian Jalali labels."""

    async def test_format_jalali_date(self) -> None:
        from datetime import datetime, timezone

        from app.services.notification_service import format_jalali_date

        # 2026-09-09 12:00 UTC == 2026-09-09 15:30 Iran == ۱۸ شهریور ۱۴۰۵ (Wednesday)
        dt = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)
        label = format_jalali_date(dt)
        assert "شهریور" in label
        assert "۱۴۰۵" in label
        assert label.split()[0] in (
            "شنبه",
            "یکشنبه",
            "دوشنبه",
            "سه‌شنبه",
            "چهارشنبه",
            "پنجشنبه",
            "جمعه",
        )

    async def test_format_slot_label_day_date_start_time(self) -> None:
        from datetime import datetime, timezone

        from app.services.notification_service import format_slot_label

        # 2026-09-09 14:30 UTC == Wednesday 18:00 Iran == چهارشنبه ۱۸ شهریور ۱۴۰۵
        start = datetime(2026, 9, 9, 14, 30, tzinfo=timezone.utc)
        label = format_slot_label(start)
        assert label.startswith("روز چهارشنبه")
        assert "۱۸ شهریور ۱۴۰۵" in label
        assert "ساعت ۱۸:۰۰" in label
        assert "تا" not in label, "message carries the start time only"

    async def test_format_toman(self) -> None:
        from decimal import Decimal

        from app.services.notification_service import format_toman

        assert format_toman(Decimal("90000")) == "۹۰٬۰۰۰ تومان"
        assert format_toman(0) == "۰ تومان"


async def _last_notification(
    session: AsyncSession, user_id: int, type_: str
) -> Notification | None:
    from sqlalchemy import select

    result = await session.execute(
        select(Notification)
        .where(Notification.user_id == user_id, Notification.type == type_)
        .order_by(Notification.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


class TestBookingEventNotifications:
    """Booking lifecycle events create in-app notifications."""

    async def test_cancel_confirmed_booking_notifies_user_and_manager(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        session: AsyncSession,
    ) -> None:
        """>48h cancellation sends the «لغو شد» message to the user and the manager."""
        from datetime import datetime, timedelta, timezone

        from sqlalchemy import text

        from app.models.bank_card import BankCard, BankCardStatus
        from app.models.booking import Booking as BookingModel
        from app.models.booking import BookingStatus
        from app.models.time_slot import TimeSlot

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]
        manager_id = manager_token["user"]["id"]

        vendor_resp = await client.post(
            "/api/v1/vendors",
            json={
                "name": "زمین اعلان تست",
                "sport_types": ["futsal"],
                "address": "قم",
                "latitude": 34.64,
                "longitude": 50.87,
                "capacity": 10,
            },
            headers=mgr_headers,
        )
        assert vendor_resp.status_code == 201, vendor_resp.text
        vendor_id = vendor_resp.json()["id"]
        await session.execute(
            text("UPDATE vendors SET is_active = true WHERE id = :v"), {"v": vendor_id}
        )
        await session.flush()

        # Slot >48h away → cancellation lands in the refund-with-penalty branch
        start = datetime.now(timezone.utc) + timedelta(days=5)
        slot_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={
                "vendor_id": vendor_id,
                "start_time": start.isoformat(),
                "end_time": (start + timedelta(hours=2)).isoformat(),
                "base_price": 100000,
            },
            headers=mgr_headers,
        )
        assert slot_resp.status_code == 201, slot_resp.text
        slot = slot_resp.json()

        booking_resp = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot["id"], "version": slot["version"]},
            headers=user_headers,
        )
        assert booking_resp.status_code == 201, booking_resp.text
        booking_id = booking_resp.json()["id"]

        # Confirm the booking directly in the DB (mock gateway is flaky) and
        # give the user a verified bank card for the refund destination.
        booking = await session.get(BookingModel, booking_id)
        assert booking is not None
        booking.status = BookingStatus.CONFIRMED
        booking.expires_at = None
        ts = await session.get(TimeSlot, slot["id"])
        assert ts is not None
        ts.status = "reserved"
        session.add(
            BankCard(
                user_id=user_id,
                encrypted_card_number="test-encrypted",
                masked_card_number="6104 **** **** 1234",
                card_fingerprint=f"test-fp-{user_id}",
                status=BankCardStatus.VERIFIED,
            )
        )
        await session.flush()

        cancel_resp = await client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            json={
                "accepted_terms": True,
                "expected_mode": "refund_with_penalty",
            },
            headers=user_headers,
        )
        assert cancel_resp.status_code == 200, cancel_resp.text
        assert cancel_resp.json()["status"] == "cancelled"

        notification = await _last_notification(session, user_id, "booking_cancelled")
        assert notification is not None, "user must be notified about their cancellation"
        # One terse template: «رزرو مجموعه X در روز … ساعت … لغو شد.» — nothing more
        assert notification.message.startswith("رزرو مجموعه ")
        assert "لغو شد." in notification.message
        assert "۹۰٬۰۰۰" not in notification.message, "refund is tracked by its own notifications"
        from app.core.timezone import utc_to_iran
        from app.services.notification_service import _to_persian_digits

        assert "روز" in notification.message
        assert "ساعت" in notification.message
        assert "تا" not in notification.message
        expected_start = _to_persian_digits(utc_to_iran(start).strftime("%H:%M"))
        assert expected_start in notification.message

        manager_notification = await _last_notification(session, manager_id, "booking_cancelled")
        assert manager_notification is not None, "manager must be notified about the cancellation"

    async def test_cancel_pending_replacement_notifies_user_and_manager(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        session: AsyncSession,
    ) -> None:
        """≤48h cancellation (pending replacement) notifies both user and manager."""
        from datetime import datetime, timedelta, timezone

        from sqlalchemy import text

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]
        manager_id = manager_token["user"]["id"]

        vendor_resp = await client.post(
            "/api/v1/vendors",
            json={
                "name": "زمین جایگزینی تست",
                "sport_types": ["futsal"],
                "address": "قم",
                "latitude": 34.64,
                "longitude": 50.87,
                "capacity": 10,
            },
            headers=mgr_headers,
        )
        assert vendor_resp.status_code == 201, vendor_resp.text
        vendor_id = vendor_resp.json()["id"]
        await session.execute(
            text("UPDATE vendors SET is_active = true WHERE id = :v"), {"v": vendor_id}
        )
        await session.flush()

        # Slot starts in 24h → cancel lands in the pending-replacement branch
        start = datetime.now(timezone.utc) + timedelta(hours=24)
        slot_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={
                "vendor_id": vendor_id,
                "start_time": start.isoformat(),
                "end_time": (start + timedelta(hours=2)).isoformat(),
                "base_price": 100000,
            },
            headers=mgr_headers,
        )
        assert slot_resp.status_code == 201, slot_resp.text
        slot = slot_resp.json()

        booking_resp = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot["id"], "version": slot["version"]},
            headers=user_headers,
        )
        assert booking_resp.status_code == 201, booking_resp.text
        booking_id = booking_resp.json()["id"]

        # Confirm the booking directly in the DB (mock gateway is flaky) and
        # give the user a verified bank card for the refund destination.
        from app.models.bank_card import BankCard, BankCardStatus
        from app.models.booking import Booking as BookingModel
        from app.models.booking import BookingStatus
        from app.models.time_slot import TimeSlot

        booking = await session.get(BookingModel, booking_id)
        assert booking is not None
        booking.status = BookingStatus.CONFIRMED
        booking.expires_at = None
        ts = await session.get(TimeSlot, slot["id"])
        assert ts is not None
        ts.status = "reserved"
        session.add(
            BankCard(
                user_id=user_id,
                encrypted_card_number="test-encrypted",
                masked_card_number="6104 **** **** 1234",
                card_fingerprint=f"test-fp-repl-{user_id}",
                status=BankCardStatus.VERIFIED,
            )
        )
        await session.flush()

        cancel_resp = await client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            json={"accepted_terms": True},
            headers=user_headers,
        )
        assert cancel_resp.status_code == 200, cancel_resp.text
        assert cancel_resp.json()["status"] == "pending_cancellation"

        user_notif = await _last_notification(session, user_id, "booking_pending_replacement")
        assert user_notif is not None, "user must be notified about pending replacement"
        assert "جایگزین" in user_notif.message
        assert "ساعت" in user_notif.message, "message must carry the slot time window"

        manager_notif = await _last_notification(session, manager_id, "booking_pending_replacement")
        assert manager_notif is not None, "manager must be notified about pending replacement"


class TestRefundStatusNotifications:
    """Admin refund decisions notify the refund's owner."""

    async def test_refund_approval_notifies_user(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        admin_token: dict,
        session: AsyncSession,
    ) -> None:
        from datetime import datetime, timedelta, timezone
        from decimal import Decimal

        from sqlalchemy import text

        from app.models.refund import Refund, RefundType

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        user_id = user_token["user"]["id"]

        vendor_resp = await client.post(
            "/api/v1/vendors",
            json={
                "name": "زمین عودت تست",
                "sport_types": ["futsal"],
                "address": "قم",
                "latitude": 34.64,
                "longitude": 50.87,
                "capacity": 10,
            },
            headers=mgr_headers,
        )
        assert vendor_resp.status_code == 201, vendor_resp.text
        vendor_id = vendor_resp.json()["id"]
        await session.execute(
            text("UPDATE vendors SET is_active = true WHERE id = :v"), {"v": vendor_id}
        )
        await session.flush()

        start = datetime.now(timezone.utc) + timedelta(days=3)
        slot_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={
                "vendor_id": vendor_id,
                "start_time": start.isoformat(),
                "end_time": (start + timedelta(hours=2)).isoformat(),
                "base_price": 100000,
            },
            headers=mgr_headers,
        )
        assert slot_resp.status_code == 201, slot_resp.text
        slot = slot_resp.json()

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        booking_resp = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot["id"], "version": slot["version"]},
            headers=user_headers,
        )
        assert booking_resp.status_code == 201, booking_resp.text
        booking_id = booking_resp.json()["id"]

        refund = Refund(
            booking_id=booking_id,
            user_id=user_id,
            vendor_id=vendor_id,
            slot_id=slot["id"],
            slot_start_time=start,
            slot_end_time=start + timedelta(hours=2),
            original_amount=Decimal("100000"),
            total_paid=Decimal("100000"),
            refund_amount=Decimal("90000"),
            reason="test refund",
            type=RefundType.USER_CANCELLATION,
        )
        session.add(refund)
        await session.flush()

        update_resp = await client.patch(
            f"/api/v1/admin/refunds/{refund.id}",
            json={"status": "approved"},
            headers=admin_headers,
        )
        assert update_resp.status_code == 200, update_resp.text

        notification = await _last_notification(session, user_id, "refund_approved")
        assert notification is not None, "user must be notified about refund approval"
        assert "۹۰٬۰۰۰" in notification.message
