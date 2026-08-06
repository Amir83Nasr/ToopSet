"""Tests for settings endpoints (public + authenticated)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]


class TestPublicHeroSlides:
    async def test_get_hero_slides_default(self, client: AsyncClient) -> None:
        """No hero slides configured -> returns empty list."""
        resp = await client.get("/api/v1/settings/public/hero-slides")
        assert resp.status_code == 200
        assert resp.json() == []


class TestPublicContact:
    async def test_get_contact_default(self, client: AsyncClient) -> None:
        """No contact settings configured -> returns empty object."""
        resp = await client.get("/api/v1/settings/public/contact")
        assert resp.status_code == 200
        assert resp.json() == {}


class TestPublicTextSetting:
    async def test_get_rules_text_default(self, client: AsyncClient) -> None:
        """No rules_text configured -> serves the full default legal content."""
        resp = await client.get("/api/v1/settings/public/text/rules_text")
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "rules_text"
        assert "ماده ۱" in data["value"]
        assert "بازگشت ۵۰ درصد مبلغ" in data["value"]
        assert data["updated_at"] is None

    async def test_get_privacy_text_default(self, client: AsyncClient) -> None:
        """No privacy_text configured -> serves the full default privacy content."""
        resp = await client.get("/api/v1/settings/public/text/privacy_text")
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "privacy_text"
        assert "حریم خصوصی" in data["value"]
        assert data["updated_at"] is None

    async def test_get_text_invalid_key(self, client: AsyncClient) -> None:
        """Key not in _PUBLIC_KEYS -> 404."""
        resp = await client.get("/api/v1/settings/public/text/some_unknown_key")
        assert resp.status_code == 404


class TestGetSetting:
    async def test_get_setting_nonexistent(self, client: AsyncClient, user_token: dict) -> None:
        """Authenticated user requests a non-existent setting -> 404."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/settings/nonexistent_key", headers=headers)
        assert resp.status_code == 404
        assert "تنظیمات" in resp.text

    async def test_get_setting_pagination_limit_default(
        self, client: AsyncClient, user_token: dict
    ) -> None:
        """Missing pagination_limit should fall back to the system default."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/settings/pagination_limit", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "pagination_limit"
        assert data["value"] == "15"

    async def test_get_setting_unauthenticated(self, client: AsyncClient) -> None:
        """No auth -> 401."""
        resp = await client.get("/api/v1/settings/any_key")
        assert resp.status_code == 401
