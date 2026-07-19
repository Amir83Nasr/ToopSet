"""Tests for favorites endpoints (CRUD for authenticated users)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import text

pytestmark = [pytest.mark.asyncio]

_vendor_counter = 0


async def _create_vendor(client: AsyncClient, token: dict, session) -> int:
    """Create and approve a vendor with a unique name, then return its id."""
    global _vendor_counter
    _vendor_counter += 1
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    resp = await client.post(
        "/api/v1/vendors",
        json={
            "name": f"زمین محبوب {_vendor_counter}",
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
    await session.execute(
        text("UPDATE vendors SET is_active = true WHERE id = :vendor_id"),
        {"vendor_id": vendor_id},
    )
    await session.flush()
    return vendor_id


class TestListFavorites:
    async def test_list_empty(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/favorites", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_with_data(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        vendor_id = await _create_vendor(client, manager_token, session)

        # Add favorite
        await client.post(f"/api/v1/favorites/{vendor_id}", headers=headers)

        resp = await client.get("/api/v1/favorites", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["vendor_id"] == vendor_id

    async def test_list_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/favorites")
        assert resp.status_code == 401


class TestCheckFavorites:
    async def test_check_some_favorited(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        vendor = await _create_vendor(client, manager_token, session)

        # Favorite the vendor
        await client.post(f"/api/v1/favorites/{vendor}", headers=headers)

        resp = await client.get(
            f"/api/v1/favorites/check?vendor_ids={vendor},99999",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["favorited_vendor_ids"] == [vendor]

    async def test_check_none_favorited(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        vendor1 = await _create_vendor(client, manager_token, session)

        resp = await client.get(
            f"/api/v1/favorites/check?vendor_ids={vendor1}",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["favorited_vendor_ids"] == []


class TestAddFavorite:
    async def test_add_success(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        vendor_id = await _create_vendor(client, manager_token, session)

        resp = await client.post(f"/api/v1/favorites/{vendor_id}", headers=headers)
        assert resp.status_code == 201
        assert resp.json()["vendor_id"] == vendor_id

    async def test_add_unauthenticated(
        self, client: AsyncClient, manager_token: dict, session
    ) -> None:
        vendor_id = await _create_vendor(client, manager_token, session)
        resp = await client.post(f"/api/v1/favorites/{vendor_id}")
        assert resp.status_code == 401


class TestRemoveFavorite:
    async def test_remove_success(
        self, client: AsyncClient, user_token: dict, manager_token: dict, session
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        vendor_id = await _create_vendor(client, manager_token, session)

        # Add then remove
        await client.post(f"/api/v1/favorites/{vendor_id}", headers=headers)
        resp = await client.delete(f"/api/v1/favorites/{vendor_id}", headers=headers)
        assert resp.status_code == 204

        # Verify gone
        list_resp = await client.get("/api/v1/favorites", headers=headers)
        assert list_resp.json() == []

    async def test_remove_not_favorited(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.delete("/api/v1/favorites/99999", headers=headers)
        assert resp.status_code == 404  # never added
