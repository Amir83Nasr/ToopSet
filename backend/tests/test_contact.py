"""Tests for contact endpoints (public submit + admin list/delete)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]

CONTACT_PAYLOAD = {
    "name": "کاربر تست",
    "email": "test@example.com",
    "phone": "09120000000",
    "subject": "مشکل در رزرو",
    "message": "سلام، من در رزرو زمین مشکل دارم.",
}


class TestSubmitContact:
    async def test_submit_success(self, client: AsyncClient) -> None:
        resp = await client.post("/api/v1/contact", json=CONTACT_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "کاربر تست"
        assert data["email"] == "test@example.com"
        assert data["subject"] == "مشکل در رزرو"

    async def test_submit_invalid_data(self, client: AsyncClient) -> None:
        resp = await client.post("/api/v1/contact", json={"name": ""})
        assert resp.status_code == 422


class TestAdminList:
    async def test_list_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        # Create a message first
        await client.post("/api/v1/contact", json=CONTACT_PAYLOAD)

        resp = await client.get("/api/v1/contact/admin", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["subject"] == "مشکل در رزرو"

    async def test_list_as_user_forbidden(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/contact/admin", headers=headers)
        assert resp.status_code == 403


class TestAdminDelete:
    async def test_delete_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        create = await client.post("/api/v1/contact", json=CONTACT_PAYLOAD)
        msg_id = create.json()["id"]

        resp = await client.delete(f"/api/v1/contact/admin/{msg_id}", headers=headers)
        assert resp.status_code == 204

    async def test_delete_idempotent(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.delete("/api/v1/contact/admin/99999", headers=headers)
        assert resp.status_code == 204  # idempotent — already gone

    async def test_delete_as_user_forbidden(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        # Create message as public first, then try to delete as user
        create = await client.post("/api/v1/contact", json=CONTACT_PAYLOAD)
        msg_id = create.json()["id"]

        resp = await client.delete(f"/api/v1/contact/admin/{msg_id}", headers=headers)
        assert resp.status_code == 403
