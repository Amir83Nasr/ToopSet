"""Integration tests for vendor endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = [pytest.mark.asyncio]

COURT_CREATE_PAYLOAD = {
    "name": "زمین شماره ۱",
    "sport_types": ["futsal", "basketball"],
    "address": "تهران، خیابان اصلی",
    "latitude": 35.6892,
    "longitude": 51.3890,
    "capacity": 20,
}


class TestListVendors:
    async def test_list_empty(self, client: AsyncClient):
        resp = await client.get("/api/v1/vendors")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["vendors"] == []

    async def test_list_with_vendors(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)

        resp = await client.get("/api/v1/vendors", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["vendors"][0]["name"] == "زمین شماره ۱"

    async def test_list_filter_by_sport(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        # Create volleyball-only vendor
        volley_payload = {
            **COURT_CREATE_PAYLOAD,
            "name": "زمین والیبال",
            "sport_types": ["volleyball"],
        }
        await client.post("/api/v1/vendors", json=volley_payload, headers=headers)

        resp = await client.get("/api/v1/vendors?sport_type=futsal", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1  # Only the first vendor has futsal
        assert data["vendors"][0]["name"] == "زمین شماره ۱"

    async def test_list_search(self, client: AsyncClient, manager_token: dict):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=mgr_headers)

        resp = await client.get("/api/v1/vendors?search=شماره", headers=mgr_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["vendors"][0]["name"] == "زمین شماره ۱"


class TestGetVendor:
    async def test_get_found(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        vendor_id = create.json()["id"]

        resp = await client.get(f"/api/v1/vendors/{vendor_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "زمین شماره ۱"

    async def test_get_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v1/vendors/99999")
        assert resp.status_code == 404

    async def test_inactive_vendor_hidden_from_other_manager(
        self,
        client: AsyncClient,
        manager_token: dict,
        user_token: dict,
        session: AsyncSession,
    ):
        owner_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=owner_headers)
        vendor_id = create.json()["id"]

        await session.execute(
            text("UPDATE users SET role = 'manager' WHERE id = :id"),
            {"id": user_token["user"]["id"]},
        )
        await session.flush()

        other_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get(f"/api/v1/vendors/{vendor_id}", headers=other_headers)
        assert resp.status_code == 404

        owner_resp = await client.get(f"/api/v1/vendors/{vendor_id}", headers=owner_headers)
        assert owner_resp.status_code == 200


class TestCreateVendor:
    async def test_create_as_manager(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "زمین شماره ۱"
        assert data["manager_id"] == manager_token["user"]["id"]

    async def test_create_as_user_forbidden(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        assert resp.status_code == 403

    async def test_create_unauthenticated(self, client: AsyncClient):
        resp = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD)
        assert resp.status_code == 401


class TestUpdateVendor:
    async def test_update_as_owner(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        vendor_id = create.json()["id"]

        resp = await client.patch(
            f"/api/v1/vendors/{vendor_id}",
            json={"name": "زمین شماره ۲"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "زمین شماره ۲"

    async def test_update_not_owner(
        self, client: AsyncClient, manager_token: dict, user_token: dict
    ):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        vendor_id = create.json()["id"]

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.patch(
            f"/api/v1/vendors/{vendor_id}",
            json={"name": "hacked"},
            headers=user_headers,
        )
        # User can't access the endpoint at all (needs manager role)
        assert resp.status_code == 403

    async def test_update_not_found(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.patch(
            "/api/v1/vendors/99999",
            json={"name": "nothing"},
            headers=headers,
        )
        assert resp.status_code == 404


class TestDeleteVendor:
    async def test_delete_as_admin(
        self, client: AsyncClient, manager_token: dict, admin_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=mgr_headers)
        vendor_id = create.json()["id"]

        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.delete(f"/api/v1/vendors/{vendor_id}", headers=admin_headers)
        assert resp.status_code == 204

        # Verify deleted
        get_resp = await client.get(f"/api/v1/vendors/{vendor_id}")
        assert get_resp.status_code == 404

    async def test_delete_as_manager_own_vendor(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        vendor_id = create.json()["id"]

        resp = await client.delete(f"/api/v1/vendors/{vendor_id}", headers=headers)
        assert resp.status_code == 204

    async def test_delete_not_found(self, client: AsyncClient, admin_token: dict):
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.delete("/api/v1/vendors/99999", headers=headers)
        assert resp.status_code == 404
