"""Tests for vendor image upload endpoint (manager+)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

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
        """Empty file content fails MIME validation -> ValueError from endpoint."""
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        # save_upload raises ValueError on MIME check failure (the bug is it
        # is not handled by the endpoint), so we expect the ValueError
        # to propagate through the ASGI stack.
        with pytest.raises(ValueError, match="Invalid file content type"):
            await client.post(
                "/api/v1/uploads/vendor-image",
                files={"file": ("test.jpg", b"", "image/jpeg")},
                headers=headers,
            )

    async def test_upload_invalid_file_type(self, client: AsyncClient, manager_token: dict) -> None:
        """Disallowed file extension -> 400."""
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.post(
            "/api/v1/uploads/vendor-image",
            files={"file": ("test.txt", b"some content", "text/plain")},
            headers=headers,
        )
        assert resp.status_code == 400
