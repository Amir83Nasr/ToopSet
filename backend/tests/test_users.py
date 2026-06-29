"""Tests for users admin endpoints (CRUD + role/active management)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]


class TestListUsers:
    async def test_list_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/users", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any(u["role"] == "admin" for u in data["users"])

    async def test_list_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/users")
        assert resp.status_code == 401

    async def test_list_as_regular_user_forbidden(
        self, client: AsyncClient, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/users", headers=headers)
        assert resp.status_code == 403


class TestGetUser:
    async def test_get_user_by_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        admin_id = admin_token["user"]["id"]

        resp = await client.get(f"/api/v1/users/{admin_id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == admin_id
        assert data["phone"] == admin_token["user"]["phone"]

    async def test_get_nonexistent_user(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/users/99999", headers=headers)
        assert resp.status_code == 404


class TestToggleActive:
    async def test_toggle_active_success(
        self, client: AsyncClient, admin_token: dict, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        target_id = user_token["user"]["id"]

        resp = await client.patch(f"/api/v1/users/{target_id}/toggle-active", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == target_id
        assert data["is_active"] is False  # was active, now toggled off


class TestChangeRole:
    async def test_change_role_success(
        self, client: AsyncClient, admin_token: dict, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        target_id = user_token["user"]["id"]

        resp = await client.patch(
            f"/api/v1/users/{target_id}/role",
            json={"role": "manager"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == target_id
        assert data["role"] == "manager"

    async def test_change_role_nonexistent_user(
        self, client: AsyncClient, admin_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.patch(
            "/api/v1/users/99999/role",
            json={"role": "manager"},
            headers=headers,
        )
        assert resp.status_code == 404
