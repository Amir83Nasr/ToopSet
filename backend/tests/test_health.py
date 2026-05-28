"""Basic health check test."""

from __future__ import annotations


def test_imports() -> None:
    """Verify core modules can be imported."""
    from app.core.config import settings

    assert settings is not None
    from app.core.database import get_db

    assert get_db is not None
    from app.core.security import create_access_token, verify_password, decode_token

    assert create_access_token is not None
    assert verify_password is not None
    assert decode_token is not None
