"""Tests for time-slot endpoints (CRUD for managers, public list/detail)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]

_court_counter = 0


async def _create_court(client: AsyncClient, token: dict) -> int:
    """Create a court with a unique name and return its id."""
    global _court_counter
    _court_counter += 1
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    resp = await client.post(
        "/api/v1/courts",
        json={
            "name": f"زمین سانس {_court_counter}",
            "sport_types": ["futsal"],
            "address": "قم، خیابان اصلی",
            "latitude": 34.6399,
            "longitude": 50.8759,
            "capacity": 10,
        },
        headers=headers,
    )
    assert resp.status_code == 201, f"Court creation failed: {resp.status_code} {resp.text[:200]}"
    return resp.json()["id"]


_SLOT_BODY = {
    "start_time": "2026-07-01T10:00:00",
    "end_time": "2026-07-01T11:30:00",
    "base_price": 150000,
}


class TestListSlots:
    """GET /courts/{court_id}/slots — empty court returns empty list."""

    async def test_list_empty(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        resp = await client.get(f"/api/v1/courts/{court_id}/slots")
        assert resp.status_code == 200
        data = resp.json()
        assert data["slots"] == []
        assert data["total"] == 0


class TestCreateSlot:
    """POST /courts/{court_id}/slots — manager creates a time slot."""

    async def test_create_success(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "court_id": court_id}
        resp = await client.post(f"/api/v1/courts/{court_id}/slots", json=body, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["court_id"] == court_id
        assert data["base_price"] == 150000.0
        assert data["is_reserved"] is False
        assert data["version"] == 1
        assert "id" in data

    async def test_create_unauthenticated(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        body = {**_SLOT_BODY, "court_id": court_id}
        resp = await client.post(f"/api/v1/courts/{court_id}/slots", json=body)
        assert resp.status_code == 401


class TestListSlotsAfterCreate:
    """GET /courts/{court_id}/slots — after creation the slot appears."""

    async def test_list_includes_slot(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "court_id": court_id}
        await client.post(f"/api/v1/courts/{court_id}/slots", json=body, headers=headers)

        resp = await client.get(f"/api/v1/courts/{court_id}/slots")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any(s["court_id"] == court_id for s in data["slots"])


class TestGetSlot:
    """GET /slots/{slot_id} — public slot detail."""

    async def test_get_by_id(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "court_id": court_id}
        create_resp = await client.post(
            f"/api/v1/courts/{court_id}/slots", json=body, headers=headers
        )
        slot_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/slots/{slot_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == slot_id
        assert data["court_id"] == court_id
        assert not data["is_reserved"]
        assert data["base_price"] == 150000.0
        # Detail-specific fields
        assert data["court_name"] != ""
        assert data["court_address"] != ""
        assert data["court_sport_type"] != ""

    async def test_get_not_found(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/slots/99999")
        assert resp.status_code == 404


class TestGenerateSlots:
    """POST /courts/{court_id}/slots/generate — bulk generation from templates."""

    async def test_generate_success(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        payload = {
            "date_from": "2026-07-04",
            "date_to": "2026-07-06",
            "days_of_week": [0, 1, 2],  # Sat, Sun, Mon
            "templates": [
                {"start_time": "08:00", "end_time": "09:00", "base_price": 100000},
                {"start_time": "10:00", "end_time": "11:30", "base_price": 150000},
            ],
        }
        resp = await client.post(
            f"/api/v1/courts/{court_id}/slots/generate",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["created"] > 0
        assert data["total"] == data["created"]
        assert len(data["slots"]) == data["created"]


class TestUpdateSlot:
    """PATCH /courts/{court_id}/slots/{slot_id} — manager updates a slot."""

    async def test_update_price(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "court_id": court_id}
        create_resp = await client.post(
            f"/api/v1/courts/{court_id}/slots", json=body, headers=headers
        )
        slot_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/courts/{court_id}/slots/{slot_id}",
            json={"base_price": 200000},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["base_price"] == 200000.0


class TestDeleteSlot:
    """DELETE /courts/{court_id}/slots/{slot_id} — manager deletes a slot."""

    async def test_delete_success(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "court_id": court_id}
        create_resp = await client.post(
            f"/api/v1/courts/{court_id}/slots", json=body, headers=headers
        )
        slot_id = create_resp.json()["id"]

        resp = await client.delete(
            f"/api/v1/courts/{court_id}/slots/{slot_id}",
            headers=headers,
        )
        assert resp.status_code == 204

    async def test_delete_nonexistent(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.delete(
            f"/api/v1/courts/{court_id}/slots/99999",
            headers=headers,
        )
        assert resp.status_code == 404
