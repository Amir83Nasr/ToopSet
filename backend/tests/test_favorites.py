"""Tests for favorites endpoints (CRUD for authenticated users)."""

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
            "name": f"زمین محبوب {_court_counter}",
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


class TestListFavorites:
    async def test_list_empty(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/favorites", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_with_data(
        self, client: AsyncClient, user_token: dict, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        court_id = await _create_court(client, manager_token)

        # Add favorite
        await client.post(f"/api/v1/favorites/{court_id}", headers=headers)

        resp = await client.get("/api/v1/favorites", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["court_id"] == court_id

    async def test_list_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/favorites")
        assert resp.status_code == 401


class TestCheckFavorites:
    async def test_check_some_favorited(
        self, client: AsyncClient, user_token: dict, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        court = await _create_court(client, manager_token)

        # Favorite the court
        await client.post(f"/api/v1/favorites/{court}", headers=headers)

        resp = await client.get(
            f"/api/v1/favorites/check?court_ids={court},99999",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["favorited_court_ids"] == [court]

    async def test_check_none_favorited(
        self, client: AsyncClient, user_token: dict, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        court1 = await _create_court(client, manager_token)

        resp = await client.get(
            f"/api/v1/favorites/check?court_ids={court1}",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["favorited_court_ids"] == []


class TestAddFavorite:
    async def test_add_success(
        self, client: AsyncClient, user_token: dict, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        court_id = await _create_court(client, manager_token)

        resp = await client.post(f"/api/v1/favorites/{court_id}", headers=headers)
        assert resp.status_code == 201
        assert resp.json()["court_id"] == court_id

    async def test_add_unauthenticated(self, client: AsyncClient, manager_token: dict) -> None:
        court_id = await _create_court(client, manager_token)
        resp = await client.post(f"/api/v1/favorites/{court_id}")
        assert resp.status_code == 401


class TestRemoveFavorite:
    async def test_remove_success(
        self, client: AsyncClient, user_token: dict, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        court_id = await _create_court(client, manager_token)

        # Add then remove
        await client.post(f"/api/v1/favorites/{court_id}", headers=headers)
        resp = await client.delete(f"/api/v1/favorites/{court_id}", headers=headers)
        assert resp.status_code == 204

        # Verify gone
        list_resp = await client.get("/api/v1/favorites", headers=headers)
        assert list_resp.json() == []

    async def test_remove_not_favorited(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.delete("/api/v1/favorites/99999", headers=headers)
        assert resp.status_code == 404  # never added
