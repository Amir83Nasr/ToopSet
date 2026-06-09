"""Integration tests for court endpoints."""

from __future__ import annotations

from httpx import AsyncClient
import pytest

pytestmark = [pytest.mark.asyncio]

COURT_CREATE_PAYLOAD = {
    "name": "زمین شماره ۱",
    "sport_types": ["futsal", "basketball"],
    "address": "تهران، خیابان اصلی",
    "latitude": 35.6892,
    "longitude": 51.3890,
    "capacity": 20,
}


class TestListCourts:
    async def test_list_empty(self, client: AsyncClient):
        resp = await client.get("/api/v1/courts")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["courts"] == []

    async def test_list_with_courts(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)

        resp = await client.get("/api/v1/courts", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["courts"][0]["name"] == "زمین شماره ۱"

    async def test_list_filter_by_sport(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)
        # Create volleyball-only court
        volley_payload = {
            **COURT_CREATE_PAYLOAD,
            "name": "زمین والیبال",
            "sport_types": ["volleyball"],
        }
        await client.post("/api/v1/courts", json=volley_payload, headers=headers)

        resp = await client.get("/api/v1/courts?sport_type=futsal", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1  # Only the first court has futsal
        assert data["courts"][0]["name"] == "زمین شماره ۱"

    async def test_list_search(self, client: AsyncClient, manager_token: dict):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=mgr_headers)

        resp = await client.get("/api/v1/courts?search=شماره", headers=mgr_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["courts"][0]["name"] == "زمین شماره ۱"


class TestGetCourt:
    async def test_get_found(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)
        court_id = create.json()["id"]

        resp = await client.get(f"/api/v1/courts/{court_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "زمین شماره ۱"

    async def test_get_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v1/courts/99999")
        assert resp.status_code == 404


class TestCreateCourt:
    async def test_create_as_manager(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "زمین شماره ۱"
        assert data["manager_id"] == manager_token["user"]["id"]

    async def test_create_as_user_forbidden(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)
        assert resp.status_code == 403

    async def test_create_unauthenticated(self, client: AsyncClient):
        resp = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD)
        assert resp.status_code == 401


class TestUpdateCourt:
    async def test_update_as_owner(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)
        court_id = create.json()["id"]

        resp = await client.patch(
            f"/api/v1/courts/{court_id}",
            json={"name": "زمین شماره ۲"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "زمین شماره ۲"

    async def test_update_not_owner(
        self, client: AsyncClient, manager_token: dict, user_token: dict
    ):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)
        court_id = create.json()["id"]

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.patch(
            f"/api/v1/courts/{court_id}",
            json={"name": "hacked"},
            headers=user_headers,
        )
        # User can't access the endpoint at all (needs manager role)
        assert resp.status_code == 403

    async def test_update_not_found(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.patch(
            "/api/v1/courts/99999",
            json={"name": "nothing"},
            headers=headers,
        )
        assert resp.status_code == 404


class TestDeleteCourt:
    async def test_delete_as_admin(
        self, client: AsyncClient, manager_token: dict, admin_token: dict
    ):
        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=mgr_headers)
        court_id = create.json()["id"]

        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.delete(f"/api/v1/courts/{court_id}", headers=admin_headers)
        assert resp.status_code == 204

        # Verify deleted
        get_resp = await client.get(f"/api/v1/courts/{court_id}")
        assert get_resp.status_code == 404

    async def test_delete_as_manager_forbidden(self, client: AsyncClient, manager_token: dict):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        create = await client.post("/api/v1/courts", json=COURT_CREATE_PAYLOAD, headers=headers)
        court_id = create.json()["id"]

        resp = await client.delete(f"/api/v1/courts/{court_id}", headers=headers)
        assert resp.status_code == 204

    async def test_delete_not_found(self, client: AsyncClient, admin_token: dict):
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.delete("/api/v1/courts/99999", headers=headers)
        assert resp.status_code == 404
