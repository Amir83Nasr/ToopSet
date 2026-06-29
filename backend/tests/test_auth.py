"""Integration tests for auth endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.security import decode_token

pytestmark = [pytest.mark.asyncio]


class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111111", "password": "Test1234", "full_name": "کاربر جدید"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["phone"] == "09121111111"
        assert data["user"]["full_name"] == "کاربر جدید"
        assert data["user"]["role"] == "user"

        # Token payload should contain correct sub
        payload = decode_token(data["access_token"])
        assert payload is not None
        assert payload["sub"] == str(data["user"]["id"])

    async def test_register_duplicate_phone(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111111", "password": "Test1234", "full_name": "first"},
        )
        resp = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111111", "password": "StrongPw2", "full_name": "second"},
        )
        assert resp.status_code == 409
        assert "قبلاً ثبت" in resp.text


class TestLogin:
    async def test_login_success(self, client: AsyncClient):
        # Register first
        await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111111", "password": "Test1234", "full_name": "test"},
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111111", "password": "Test1234"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["phone"] == "09121111111"

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111111", "password": "Test1234", "full_name": "test"},
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111111", "password": "wrong"},
        )
        assert resp.status_code == 401
        assert "اشتباه" in resp.text

    async def test_login_not_found(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09999999999", "password": "Test1234"},
        )
        assert resp.status_code == 401


class TestRefresh:
    async def test_refresh_success(self, client: AsyncClient):
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111111", "password": "Test1234", "full_name": "test"},
        )
        refresh_token = reg.json()["refresh_token"]

        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_invalid_token(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token_here"},
        )
        assert resp.status_code == 401


class TestMe:
    async def test_me_authenticated(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["phone"] == "09120000000"
        assert data["full_name"] == "test"

    async def test_me_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401


class TestUpdateProfile:
    async def test_update_name(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.patch(
            "/api/v1/auth/profile",
            json={"full_name": "نام جدید"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "نام جدید"

    async def test_update_password(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.patch(
            "/api/v1/auth/profile",
            json={"current_password": "Test1234", "new_password": "NewPass99"},
            headers=headers,
        )
        assert resp.status_code == 200

        # Login with new password
        resp2 = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09120000000", "password": "NewPass99"},
        )
        assert resp2.status_code == 200

    async def test_update_password_wrong_current(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.patch(
            "/api/v1/auth/profile",
            json={"current_password": "wrong", "new_password": "NewPass99"},
            headers=headers,
        )
        assert resp.status_code == 401

    async def test_update_no_auth(self, client: AsyncClient):
        resp = await client.patch(
            "/api/v1/auth/profile",
            json={"full_name": "hacker"},
        )
        assert resp.status_code == 401
