"""Integration tests for auth endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings
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
        assert "refresh_token" not in data
        assert client.cookies.get(settings.refresh_cookie_name)
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

    @pytest.mark.parametrize(
        "phone",
        [
            "9121111111",
            "0912111111",
            "091211111111",
            "+989121111111",
            "02111111111",
        ],
    )
    async def test_register_rejects_invalid_phone_format(
        self, client: AsyncClient, phone: str
    ):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"phone": phone, "password": "Test1234", "full_name": "test"},
        )
        assert resp.status_code == 422

    async def test_register_accepts_persian_digits(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"phone": "۰۹۱۲۱۱۱۱۱۱۴", "password": "Test1234", "full_name": "test"},
        )
        assert resp.status_code == 201
        assert resp.json()["user"]["phone"] == "09121111114"


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

    @pytest.mark.parametrize("phone", ["9121111111", "0912111111", "+989121111111"])
    async def test_login_rejects_invalid_phone_format(self, client: AsyncClient, phone: str):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "password": "Test1234"},
        )
        assert resp.status_code == 422


class TestLoginOptions:
    async def test_login_options_password_user(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111112", "password": "Test1234", "full_name": "test"},
        )
        resp = await client.post(
            "/api/v1/auth/login/options",
            json={"phone": "09121111112"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"is_new_user": False, "has_password": True}

    async def test_login_options_new_user(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login/options",
            json={"phone": "09121111999"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"is_new_user": True, "has_password": False}

    async def test_login_options_rejects_invalid_phone_format(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login/options",
            json={"phone": "989121111111"},
        )
        assert resp.status_code == 422

    async def test_forgot_password_otp_allows_creating_new_password(
        self, client: AsyncClient
    ):
        await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111113", "password": "Test1234", "full_name": "test"},
        )
        send = await client.post(
            "/api/v1/auth/otp/send",
            json={"phone": "09121111113"},
        )
        assert send.status_code == 200
        code = send.json()["dev_code"]

        verify = await client.post(
            "/api/v1/auth/otp/verify",
            json={
                "phone": "09121111113",
                "code": code,
                "purpose": "password_reset",
            },
        )
        assert verify.status_code == 200

        patch = await client.patch(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {verify.json()['access_token']}"},
            json={"new_password": "NewPass99"},
        )
        assert patch.status_code == 200

        login = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111113", "password": "NewPass99"},
        )
        assert login.status_code == 200


class TestRefresh:
    async def test_refresh_success(self, client: AsyncClient):
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111111", "password": "Test1234", "full_name": "test"},
        )
        refresh_token = client.cookies.get(settings.refresh_cookie_name)
        assert refresh_token

        resp = await client.post(
            "/api/v1/auth/refresh",
            cookies={settings.refresh_cookie_name: refresh_token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" not in data
        assert client.cookies.get(settings.refresh_cookie_name) != refresh_token

    async def test_refresh_invalid_token(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token_here"},
        )
        assert resp.status_code == 401
        assert settings.refresh_cookie_name in resp.headers["set-cookie"]
        assert "Max-Age=0" in resp.headers["set-cookie"]

    async def test_refresh_invalid_cookie_clears_cookie(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/refresh",
            cookies={settings.refresh_cookie_name: "invalid_token_here"},
        )

        assert resp.status_code == 401
        assert settings.refresh_cookie_name in resp.headers["set-cookie"]
        assert "Max-Age=0" in resp.headers["set-cookie"]
        assert "Path=/api/v1/auth" in resp.headers["set-cookie"]


class TestMe:
    async def test_me_authenticated(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["phone"] == "09120000000"
        assert data["full_name"] == "test"
        assert data["has_password"] is True

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
        assert resp.json()["has_password"] is True

        # Login with new password
        resp2 = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09120000000", "password": "NewPass99"},
        )
        assert resp2.status_code == 200

    async def test_update_password_requires_current_password(
        self, client: AsyncClient, user_token: dict
    ):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.patch(
            "/api/v1/auth/profile",
            json={"new_password": "NewPass99"},
            headers=headers,
        )
        assert resp.status_code == 401

    async def test_update_no_auth(self, client: AsyncClient):
        resp = await client.patch(
            "/api/v1/auth/profile",
            json={"full_name": "hacker"},
        )
        assert resp.status_code == 401
