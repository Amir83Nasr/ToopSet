"""Tests for admin endpoints (broadcast, logs, vendor approval, settings, seed-admin)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models.log import Log
from app.models.setting import Setting
from app.models.vendor import Vendor

pytestmark = [pytest.mark.asyncio]

BOOTSTRAP_HEADERS = {"X-Bootstrap-Secret": "test-bootstrap-secret"}


class TestBroadcast:
    """POST /api/v1/admin/notifications/broadcast"""

    async def test_broadcast_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.post(
            "/api/v1/admin/notifications/broadcast",
            json={"type": "broadcast", "message": "Test broadcast message"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["count"] >= 1

    async def test_broadcast_as_regular_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/admin/notifications/broadcast",
            json={"type": "broadcast", "message": "Test broadcast message"},
            headers=headers,
        )
        assert resp.status_code == 403


class TestLogs:
    """Admin audit log endpoints."""

    async def test_list_logs_ok(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/admin/logs", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "logs" in data
        assert "total" in data
        # Fixture creates user-registered log entries, so the response is non-empty
        assert isinstance(data["logs"], list)
        assert isinstance(data["total"], int)
        assert data["total"] >= 1

    async def test_list_logs_with_filter(
        self, client: AsyncClient, admin_token: dict, session
    ) -> None:
        admin_id = admin_token["user"]["id"]
        session.add(Log(user_id=admin_id, action="custom_action", details="Test"))
        await session.flush()
        await session.flush()

        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/admin/logs?action=custom_action", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert data["logs"][0]["action"] == "custom_action"

    async def test_delete_log_entry(self, client: AsyncClient, admin_token: dict, session) -> None:
        admin_id = admin_token["user"]["id"]
        log = Log(user_id=admin_id, action="test_action", details="Test log entry")
        session.add(log)
        await session.flush()
        log_id = log.id

        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.delete(f"/api/v1/admin/logs/{log_id}", headers=headers)
        assert resp.status_code == 204
        assert resp.content == b""


class TestPendingVendors:
    """Vendor approval workflow: list pending, approve, reject."""

    async def test_list_pending_vendors_ok(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/admin/pending-vendors", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "vendors" in data
        assert "total" in data
        assert isinstance(data["vendors"], list)
        assert isinstance(data["total"], int)

    async def test_create_and_list_pending_vendor(
        self, client: AsyncClient, admin_token: dict, manager_token: dict
    ) -> None:
        from app.services.cache_service import invalidate_admin_list_cache

        # Create a vendor via the manager API (sets is_active=False automatically)
        vendor_resp = await client.post(
            "/api/v1/vendors",
            json={
                "name": "Pending Vendor",
                "sport_types": ["football"],
                "address": "Qom",
                "capacity": 20,
                "latitude": 34.64,
                "longitude": 50.88,
            },
            headers={"Authorization": f"Bearer {manager_token['access_token']}"},
        )
        assert vendor_resp.status_code == 201
        vendor_id = vendor_resp.json()["id"]

        # Bust the pending-vendors cache that might be stale from previous tests
        await invalidate_admin_list_cache("pending_vendors")

        # List pending vendors as admin
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/admin/pending-vendors", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        vendor_ids = [c["id"] for c in data["vendors"]]
        assert vendor_id in vendor_ids

    async def test_approve_pending_vendor(
        self, client: AsyncClient, admin_token: dict, session
    ) -> None:
        vendor = Vendor(
            manager_id=admin_token["user"]["id"],
            name="Vendor to Approve",
            sport_types=["futsal"],
            address="Qom",
            capacity=15,
            latitude=34.64,
            longitude=50.88,
            is_active=False,
        )
        session.add(vendor)
        await session.flush()
        vendor_id = vendor.id

        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.post(f"/api/v1/admin/vendors/{vendor_id}/approve", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_active"] is True
        assert data["id"] == vendor_id

    async def test_reject_pending_vendor(
        self, client: AsyncClient, admin_token: dict, session
    ) -> None:
        vendor = Vendor(
            manager_id=admin_token["user"]["id"],
            name="Vendor to Reject",
            sport_types=["volleyball"],
            address="Qom",
            capacity=10,
            latitude=34.64,
            longitude=50.88,
            is_active=False,
        )
        session.add(vendor)
        await session.flush()
        vendor_id = vendor.id

        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.post(f"/api/v1/admin/vendors/{vendor_id}/reject", headers=admin_headers)
        assert resp.status_code == 204
        assert resp.content == b""

        # Verify it is no longer in pending list
        list_resp = await client.get("/api/v1/admin/pending-vendors", headers=admin_headers)
        list_data = list_resp.json()
        assert vendor_id not in [c["id"] for c in list_data["vendors"]]

    async def test_approve_non_existent_vendor(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.post("/api/v1/admin/vendors/99999/approve", headers=headers)
        assert resp.status_code == 404


class TestSettings:
    """System settings CRUD."""

    async def test_list_settings_ok(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/admin/settings", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_seed_settings(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.post("/api/v1/admin/settings/seed", headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["seeded"] > 0

    async def test_list_settings_after_seed(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        await client.post("/api/v1/admin/settings/seed", headers=headers)

        resp = await client.get("/api/v1/admin/settings", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        keys = [s["key"] for s in data]
        assert "platform_name" in keys
        assert "support_phone" in keys

    async def test_update_setting(self, client: AsyncClient, admin_token: dict, session) -> None:
        setting = Setting(
            key="test_key",
            value="original_value",
            description="Test setting",
        )
        session.add(setting)
        await session.flush()
        setting_id = setting.id

        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.put(
            f"/api/v1/admin/settings/{setting_id}",
            json={"value": "updated_value"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["value"] == "updated_value"
        assert data["id"] == setting_id

    async def test_list_settings_without_admin_role(
        self, client: AsyncClient, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/admin/settings", headers=headers)
        assert resp.status_code == 403


class TestSeedAdmin:
    """POST /api/v1/admin/seed-admin (bootstrap, no auth required)."""

    async def test_seed_admin_when_none_exists(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/admin/seed-admin",
            headers=BOOTSTRAP_HEADERS,
            json={
                "phone": "09120000003",
                "password": "admin123",
                "full_name": "Initial Admin",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["role"] == "admin"
        assert data["phone"] == "09120000003"
        assert data["full_name"] == "Initial Admin"
        assert "id" in data

    async def test_seed_admin_again(self, client: AsyncClient) -> None:
        # First creation succeeds
        resp1 = await client.post(
            "/api/v1/admin/seed-admin",
            headers=BOOTSTRAP_HEADERS,
            json={"phone": "09120000004", "password": "admin123"},
        )
        assert resp1.status_code == 201

        # Second attempt must fail (admin already exists)
        resp2 = await client.post(
            "/api/v1/admin/seed-admin",
            headers=BOOTSTRAP_HEADERS,
            json={"phone": "09120000005", "password": "admin123"},
        )
        assert resp2.status_code == 400

    async def test_seed_admin_duplicate_phone(self, client: AsyncClient) -> None:
        # Register a regular user with this phone first
        reg = await client.post(
            "/api/v1/auth/register",
            json={
                "phone": "09120000006",
                "password": "Test1234",
                "full_name": "Existing User",
            },
        )
        assert reg.status_code == 201

        # Try seed-admin with the same phone
        resp = await client.post(
            "/api/v1/admin/seed-admin",
            headers=BOOTSTRAP_HEADERS,
            json={
                "phone": "09120000006",
                "password": "admin123",
                "full_name": "Admin",
            },
        )
        assert resp.status_code == 409


class TestAdminAuth:
    """Authentication and authorization guards."""

    async def test_endpoint_without_auth(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/admin/settings")
        assert resp.status_code == 401

    async def test_endpoint_with_user_role(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/admin/pending-vendors", headers=headers)
        assert resp.status_code == 403
