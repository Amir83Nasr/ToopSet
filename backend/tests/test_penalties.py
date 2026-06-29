"""Tests for penalty endpoints (user's own penalties)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]


class TestListPenalties:
    async def test_list_empty(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/penalties", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["penalties"] == []
        assert data["total"] == 0

    async def test_list_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/penalties")
        assert resp.status_code == 401

    async def test_list_with_pagination(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/penalties?skip=0&limit=5", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["penalties"] == []
        assert data["total"] == 0
