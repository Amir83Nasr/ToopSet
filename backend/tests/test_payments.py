"""Tests for payment endpoints (user's own payments + admin all payments)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]


class TestListMyPayments:
    async def test_list_empty(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/payments/my", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["payments"] == []
        assert data["total"] == 0

    async def test_list_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/payments/my")
        assert resp.status_code == 401


class TestListAllPayments:
    async def test_list_all_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/payments/all", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["payments"] == []
        assert data["total"] == 0

    async def test_list_all_as_regular_user_forbidden(
        self, client: AsyncClient, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/payments/all", headers=headers)
        assert resp.status_code == 403
