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
