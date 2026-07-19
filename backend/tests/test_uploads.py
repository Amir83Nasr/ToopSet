"""Tests for vendor image upload endpoint (manager+)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.upload import delete_upload

pytestmark = [pytest.mark.asyncio]


class TestUploadVendorImage:
    async def test_upload_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/uploads/vendor-image",
            files={"file": ("test.jpg", b"fake_image_content", "image/jpeg")},
        )
        assert resp.status_code == 401

    async def test_upload_as_regular_user_forbidden(
        self, client: AsyncClient, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/uploads/vendor-image",
            files={"file": ("test.jpg", b"fake_image_content", "image/jpeg")},
            headers=headers,
        )
        assert resp.status_code == 403

    async def test_upload_empty_file_content(
        self, client: AsyncClient, manager_token: dict
    ) -> None:
        """Empty file content fails MIME validation with a 400 response."""
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.post(
            "/api/v1/uploads/vendor-image",
            files={"file": ("test.jpg", b"", "image/jpeg")},
            headers=headers,
        )
        assert resp.status_code == 400
        assert "Invalid file content type" in resp.json()["detail"]

    async def test_upload_invalid_file_type(self, client: AsyncClient, manager_token: dict) -> None:
        """Disallowed file extension -> 400."""
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.post(
            "/api/v1/uploads/vendor-image",
            files={"file": ("test.txt", b"some content", "text/plain")},
            headers=headers,
        )
        assert resp.status_code == 400

    async def test_svg_upload_is_rejected(self, client: AsyncClient, manager_token: dict) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.post(
            "/api/v1/uploads/vendor-image",
            files={
                "file": ("active.svg", b"<svg><script>alert(1)</script></svg>", "image/svg+xml")
            },
            headers=headers,
        )
        assert resp.status_code == 400

    async def test_temp_upload_cannot_be_claimed_by_another_manager(
        self,
        client: AsyncClient,
        manager_token: dict,
        session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
        tmp_path,
    ) -> None:
        from app.core import upload as upload_module

        monkeypatch.setattr(upload_module, "BASE_UPLOAD_DIR", tmp_path / "uploads")
        owner_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        uploaded = await client.post(
            "/api/v1/uploads/vendor-image",
            files={"file": ("court.png", b"\x89PNG-valid-test", "image/png")},
            headers=owner_headers,
        )
        assert uploaded.status_code == 200, uploaded.text

        registered = await client.post(
            "/api/v1/auth/register",
            json={
                "phone": "09128880001",
                "password": "Test1234",
                "full_name": "other manager",
            },
        )
        other_id = registered.json()["user"]["id"]
        await session.execute(
            text("UPDATE users SET role = 'manager' WHERE id = :id"), {"id": other_id}
        )
        await session.flush()
        login = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09128880001", "password": "Test1234"},
        )
        other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        image = uploaded.json()
        vendor_body = {
            "name": "مجموعه با تصویر محافظت‌شده",
            "sport_types": ["futsal"],
            "address": "قم",
            "latitude": 34.64,
            "longitude": 50.87,
            "capacity": 10,
            "images": [image["url"]],
            "temp_ids": [image["temp_id"]],
        }
        denied = await client.post("/api/v1/vendors", json=vendor_body, headers=other_headers)
        assert denied.status_code == 403

        accepted = await client.post("/api/v1/vendors", json=vendor_body, headers=owner_headers)
        assert accepted.status_code == 201, accepted.text
        assert accepted.json()["images"][0].startswith("/uploads/vendors/")


async def test_delete_upload_rejects_directory_traversal(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    from app.core import upload as upload_module

    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    outside = tmp_path / "outside.png"
    outside.write_bytes(b"important")
    monkeypatch.setattr(upload_module, "BASE_UPLOAD_DIR", upload_root)

    assert delete_upload("/uploads/../outside.png") is False
    assert outside.read_bytes() == b"important"


async def test_manager_vendor_cache_never_leaks_inactive_vendor_to_public(
    client: AsyncClient, manager_token: dict
) -> None:
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    name = "مجموعه خصوصی کش ۸۸۱"
    created = await client.post(
        "/api/v1/vendors",
        json={
            "name": name,
            "sport_types": ["futsal"],
            "address": "قم",
            "latitude": 34.64,
            "longitude": 50.87,
            "capacity": 10,
        },
        headers=headers,
    )
    assert created.status_code == 201

    manager_list = await client.get(f"/api/v1/vendors?search={name}", headers=headers)
    assert manager_list.status_code == 200
    assert manager_list.json()["total"] == 1
    assert manager_list.headers["x-cache"] == "BYPASS"

    public_list = await client.get(f"/api/v1/vendors?search={name}")
    assert public_list.status_code == 200
    assert public_list.json()["vendors"] == []
    assert public_list.json()["total"] == 0
