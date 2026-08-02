"""Integration tests for vendor endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import vendors as vendors_api
from app.models.time_slot import SlotGender, SlotStatus, TimeSlot

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
    async def test_ball_available_requires_positive_price(
        self, client: AsyncClient, manager_token: dict
    ):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}

        response = await client.post(
            "/api/v1/vendors",
            json={**COURT_CREATE_PAYLOAD, "ball_available": True, "ball_price": 0},
            headers=headers,
        )

        assert response.status_code == 422

    async def test_vendor_ball_configuration_is_saved(
        self, client: AsyncClient, manager_token: dict
    ):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}

        response = await client.post(
            "/api/v1/vendors",
            json={
                **COURT_CREATE_PAYLOAD,
                "ball_available": True,
                "ball_price": 75_000,
            },
            headers=headers,
        )

        assert response.status_code == 201, response.text
        assert response.json()["ball_available"] is True
        assert response.json()["ball_price"] == 75_000

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

    async def test_list_includes_upcoming_slot_genders(
        self,
        client: AsyncClient,
        manager_token: dict,
        session: AsyncSession,
    ):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        created = await client.post("/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=headers)
        vendor_id = created.json()["id"]
        start_time = datetime.now(timezone.utc) + timedelta(days=1)
        session.add_all(
            [
                TimeSlot(
                    vendor_id=vendor_id,
                    start_time=start_time,
                    end_time=start_time + timedelta(hours=1),
                    base_price=100000,
                    gender=SlotGender.MALE,
                ),
                TimeSlot(
                    vendor_id=vendor_id,
                    start_time=start_time + timedelta(hours=1),
                    end_time=start_time + timedelta(hours=2),
                    base_price=100000,
                    gender=SlotGender.FEMALE,
                ),
            ]
        )
        await session.flush()

        response = await client.get("/api/v1/vendors", headers=headers)

        assert response.status_code == 200
        assert response.json()["vendors"][0]["slot_genders"] == ["male", "female"]

    async def test_available_today_returns_only_vendors_with_open_slots(
        self,
        client: AsyncClient,
        manager_token: dict,
        session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
    ):
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        available_vendor = await client.post(
            "/api/v1/vendors",
            json={**COURT_CREATE_PAYLOAD, "name": "سالن دارای سانس خالی"},
            headers=headers,
        )
        full_vendor = await client.post(
            "/api/v1/vendors",
            json={**COURT_CREATE_PAYLOAD, "name": "سالن بدون سانس خالی"},
            headers=headers,
        )
        fixed_now = datetime(2026, 8, 2, 8, 30, tzinfo=timezone.utc)
        monkeypatch.setattr(vendors_api, "now_utc", lambda: fixed_now)
        monkeypatch.setattr(
            vendors_api,
            "now_iran",
            lambda: fixed_now.astimezone(ZoneInfo("Asia/Tehran")),
        )
        session.add_all(
            [
                TimeSlot(
                    vendor_id=available_vendor.json()["id"],
                    start_time=fixed_now + timedelta(hours=1),
                    end_time=fixed_now + timedelta(hours=2),
                    base_price=100000,
                    gender=SlotGender.MALE,
                ),
                TimeSlot(
                    vendor_id=full_vendor.json()["id"],
                    start_time=fixed_now + timedelta(hours=1),
                    end_time=fixed_now + timedelta(hours=2),
                    base_price=100000,
                    gender=SlotGender.FEMALE,
                    status=SlotStatus.RESERVED,
                    is_reserved=True,
                ),
            ]
        )
        await session.flush()

        response = await client.get(
            "/api/v1/vendors",
            params={"available_today": "true"},
            headers=headers,
        )

        assert response.status_code == 200
        assert [vendor["id"] for vendor in response.json()["vendors"]] == [
            available_vendor.json()["id"]
        ]


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
        create = await client.post(
            "/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=owner_headers
        )
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
        create = await client.post(
            "/api/v1/vendors", json=COURT_CREATE_PAYLOAD, headers=mgr_headers
        )
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
