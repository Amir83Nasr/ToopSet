"""Tests for the health check endpoint & module."""

from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport

from app.core.health import APP_VERSION, check_health


def test_health_module_imports() -> None:
    """Verify core modules can be imported."""
    from app.core.config import settings

    assert settings is not None
    from app.core.database import get_db

    assert get_db is not None
    from app.core.security import create_access_token, decode_token, verify_password

    assert create_access_token is not None
    assert verify_password is not None
    assert decode_token is not None


@pytest.mark.asyncio
async def test_check_health_function() -> None:
    """check_health() returns the expected top-level keys."""
    result = await check_health()
    assert "status" in result
    assert "version" in result
    assert result["version"] == APP_VERSION
    assert "uptime_seconds" in result
    assert "components" in result
    assert "database" in result["components"]
    assert "redis" in result["components"]


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    """GET /health returns 200 with valid structure."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert data["version"] == APP_VERSION
    assert data["uptime_seconds"] >= 0
    assert "components" in data
