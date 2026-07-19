"""Tests for time-slot endpoints (CRUD for managers, public list/detail)."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = [pytest.mark.asyncio]

_vendor_counter = 0


async def _create_vendor(
    client: AsyncClient, token: dict, session: AsyncSession, *, active: bool = True
) -> int:
    """Create a vendor with a unique name and return its id."""
    global _vendor_counter
    _vendor_counter += 1
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    resp = await client.post(
        "/api/v1/vendors",
        json={
            "name": f"زمین سانس {_vendor_counter}",
            "sport_types": ["futsal"],
            "address": "قم، خیابان اصلی",
            "latitude": 34.6399,
            "longitude": 50.8759,
            "capacity": 10,
        },
        headers=headers,
    )
    assert resp.status_code == 201, f"Vendor creation failed: {resp.status_code} {resp.text[:200]}"
    vendor_id = resp.json()["id"]
    if active:
        await session.execute(
            text("UPDATE vendors SET is_active = true WHERE id = :vendor_id"),
            {"vendor_id": vendor_id},
        )
        await session.flush()
    return vendor_id


_SLOT_BODY = {
    "start_time": "2026-07-01T10:00:00",
    "end_time": "2026-07-01T11:30:00",
    "base_price": 150000,
}


class TestListSlots:
    """GET /vendors/{vendor_id}/slots — empty vendor returns empty list."""

    async def test_list_empty(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        resp = await client.get(f"/api/v1/vendors/{vendor_id}/slots")
        assert resp.status_code == 200
        data = resp.json()
        assert data["slots"] == []
        assert data["total"] == 0


class TestCreateSlot:
    """POST /vendors/{vendor_id}/slots — manager creates a time slot."""

    async def test_create_success(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        resp = await client.post(f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["vendor_id"] == vendor_id
        assert data["base_price"] == 150000.0
        assert data["is_reserved"] is False
        assert data["version"] == 1
        assert "id" in data

    async def test_create_unauthenticated(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        resp = await client.post(f"/api/v1/vendors/{vendor_id}/slots", json=body)
        assert resp.status_code == 401

    async def test_ball_configuration_is_inherited_from_vendor(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.patch(
            f"/api/v1/vendors/{vendor_id}",
            json={"ball_available": True, "ball_price": 75000},
            headers=headers,
        )
        assert vendor_resp.status_code == 200

        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        slot_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers
        )
        assert slot_resp.status_code == 201
        assert slot_resp.json()["ball_available"] is True
        assert slot_resp.json()["ball_price"] == 75000.0

        disabled_resp = await client.patch(
            f"/api/v1/vendors/{vendor_id}",
            json={"ball_available": False, "ball_price": 99999},
            headers=headers,
        )
        assert disabled_resp.status_code == 200
        assert disabled_resp.json()["ball_price"] == 0.0

        refreshed_slot = await client.get(
            f"/api/v1/slots/{slot_resp.json()['id']}", headers=headers
        )
        assert refreshed_slot.status_code == 200
        assert refreshed_slot.json()["ball_available"] is False
        assert refreshed_slot.json()["ball_price"] == 0.0

    async def test_overlapping_slot_is_rejected(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        first = {**_SLOT_BODY, "vendor_id": vendor_id}
        assert (
            await client.post(f"/api/v1/vendors/{vendor_id}/slots", json=first, headers=headers)
        ).status_code == 201
        overlapping = {
            **first,
            "start_time": "2026-07-01T11:00:00",
            "end_time": "2026-07-01T12:00:00",
        }
        response = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots", json=overlapping, headers=headers
        )
        assert response.status_code == 409


class TestListSlotsAfterCreate:
    """GET /vendors/{vendor_id}/slots — after creation the slot appears."""

    async def test_list_includes_slot(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        await client.post(f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers)

        resp = await client.get(f"/api/v1/vendors/{vendor_id}/slots", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any(s["vendor_id"] == vendor_id for s in data["slots"])

    async def test_public_list_hides_slots_beyond_two_weeks(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        future_day = (datetime.now() + timedelta(days=20)).date()
        body = {
            **_SLOT_BODY,
            "vendor_id": vendor_id,
            "start_time": f"{future_day.isoformat()}T10:00:00",
            "end_time": f"{future_day.isoformat()}T11:30:00",
        }
        await client.post(f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers)

        public_resp = await client.get(
            f"/api/v1/vendors/{vendor_id}/slots?date={future_day.isoformat()}"
        )
        assert public_resp.status_code == 200
        assert public_resp.json()["slots"] == []

        manager_resp = await client.get(
            f"/api/v1/vendors/{vendor_id}/slots?date={future_day.isoformat()}", headers=headers
        )
        assert manager_resp.status_code == 200
        assert manager_resp.json()["total"] == 1


class TestGetSlot:
    """GET /slots/{slot_id} — public slot detail."""

    async def test_get_by_id(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        create_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers
        )
        slot_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/slots/{slot_id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == slot_id
        assert data["vendor_id"] == vendor_id
        assert not data["is_reserved"]
        assert data["base_price"] == 150000.0
        # Detail-specific fields
        assert data["vendor_name"] != ""
        assert data["vendor_address"] != ""
        assert data["vendor_sport_type"] != ""

    async def test_get_not_found(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/slots/99999")
        assert resp.status_code == 404


class TestGenerateSlots:
    """POST /vendors/{vendor_id}/slots/generate — bulk generation from templates."""

    async def test_generate_success(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
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
            f"/api/v1/vendors/{vendor_id}/slots/generate",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["created"] > 0
        assert data["total"] == data["created"]
        assert len(data["slots"]) == data["created"]

    async def test_generate_rejects_unbounded_date_range(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        response = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots/generate",
            headers=headers,
            json={
                "date_from": "2026-01-01",
                "date_to": "2027-01-01",
                "days_of_week": [0],
                "templates": [{"start_time": "08:00", "end_time": "09:00", "base_price": 100000}],
            },
        )

        assert response.status_code == 422


class TestUpdateSlot:
    """PATCH /vendors/{vendor_id}/slots/{slot_id} — manager updates a slot."""

    async def test_update_price(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        create_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers
        )
        slot_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/vendors/{vendor_id}/slots/{slot_id}",
            json={"base_price": 200000},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["base_price"] == 200000.0

    async def test_update_cannot_forge_reservation_managed_status(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        created = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={**_SLOT_BODY, "vendor_id": vendor_id},
            headers=headers,
        )
        response = await client.patch(
            f"/api/v1/vendors/{vendor_id}/slots/{created.json()['id']}",
            json={"status": "reserved"},
            headers=headers,
        )
        assert response.status_code == 422

    async def test_update_rejects_mismatched_vendor_path(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        other_vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        create_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers
        )
        slot_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/vendors/{other_vendor_id}/slots/{slot_id}",
            json={"base_price": 200000},
            headers=headers,
        )
        assert resp.status_code == 404

    async def test_update_converts_iran_local_time_and_validates_overlap(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        first = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={**_SLOT_BODY, "vendor_id": vendor_id},
            headers=headers,
        )
        slot_id = first.json()["id"]
        updated = await client.patch(
            f"/api/v1/vendors/{vendor_id}/slots/{slot_id}",
            json={
                "start_time": "2026-07-01T12:00:00",
                "end_time": "2026-07-01T13:00:00",
            },
            headers=headers,
        )
        assert updated.status_code == 200, updated.text
        assert updated.json()["start_time"].startswith("2026-07-01T08:30:00")

        second = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots",
            json={
                **_SLOT_BODY,
                "vendor_id": vendor_id,
                "start_time": "2026-07-01T14:00:00",
                "end_time": "2026-07-01T15:00:00",
            },
            headers=headers,
        )
        assert second.status_code == 201
        overlap = await client.patch(
            f"/api/v1/vendors/{vendor_id}/slots/{slot_id}",
            json={
                "start_time": "2026-07-01T14:30:00",
                "end_time": "2026-07-01T15:30:00",
            },
            headers=headers,
        )
        assert overlap.status_code == 409


class TestSlotCursorPagination:
    async def test_cursor_keeps_chronological_order_without_duplicates(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        for hour in (14, 8, 11):
            response = await client.post(
                f"/api/v1/vendors/{vendor_id}/slots",
                json={
                    "vendor_id": vendor_id,
                    "start_time": f"2026-07-02T{hour:02d}:00:00",
                    "end_time": f"2026-07-02T{hour + 1:02d}:00:00",
                    "base_price": 150000,
                },
                headers=headers,
            )
            assert response.status_code == 201, response.text

        first = await client.get(f"/api/v1/vendors/{vendor_id}/slots?limit=1", headers=headers)
        assert first.status_code == 200
        cursor = first.json()["next_cursor"]
        second = await client.get(
            f"/api/v1/vendors/{vendor_id}/slots?limit=2&cursor={cursor}",
            headers=headers,
        )
        starts = [first.json()["slots"][0]["start_time"]] + [
            item["start_time"] for item in second.json()["slots"]
        ]
        assert len(starts) == len(set(starts)) == 3
        assert starts == sorted(starts)


class TestDirectDeleteSlotIsDisabled:
    """Slot deletion is only allowed transactionally through weekly schedule application."""

    async def test_delete_endpoint_is_not_available_and_slot_survives(
        self, client: AsyncClient, manager_token: dict, session: AsyncSession
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        body = {**_SLOT_BODY, "vendor_id": vendor_id}
        create_resp = await client.post(
            f"/api/v1/vendors/{vendor_id}/slots", json=body, headers=headers
        )
        slot_id = create_resp.json()["id"]

        resp = await client.delete(
            f"/api/v1/vendors/{vendor_id}/slots/{slot_id}",
            headers=headers,
        )
        assert resp.status_code == 405

        slot_resp = await client.get(f"/api/v1/slots/{slot_id}", headers=headers)
        assert slot_resp.status_code == 200
        assert slot_resp.json()["id"] == slot_id
