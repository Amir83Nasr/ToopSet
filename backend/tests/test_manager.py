"""Tests for manager endpoints (bookings + slots for manager's courts)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]


class TestListManagerBookings:
    async def test_list_empty(self, client: AsyncClient, manager_token: dict) -> None:
        """Manager with no courts -> empty list."""
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.get("/api/v1/manager/bookings", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["bookings"] == []
        assert data["total"] == 0

    async def test_list_as_regular_user_forbidden(
        self, client: AsyncClient, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/manager/bookings", headers=headers)
        assert resp.status_code == 403

    async def test_list_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/manager/bookings")
        assert resp.status_code == 401


class TestListManagerSlots:
    async def test_list_empty(self, client: AsyncClient, manager_token: dict) -> None:
        """Manager with no courts -> empty list."""
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.get("/api/v1/manager/slots", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["slots"] == []
        assert data["total"] == 0
