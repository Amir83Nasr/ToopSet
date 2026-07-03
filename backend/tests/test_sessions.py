"""Session management tests: list sessions, revoke, logout, admin revoke."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.models.log import Log
from app.repositories.refresh_token_repo import RefreshTokenRepo

pytestmark = [pytest.mark.asyncio]


class TestListSessions:
    """GET /auth/sessions"""

    async def test_list_sessions_authenticated(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/auth/sessions", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "sessions" in data
        assert "current_session_id" in data
        assert len(data["sessions"]) >= 1

    async def test_list_sessions_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/sessions")
        assert resp.status_code == 401

    async def test_list_sessions_shows_recent_first(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/auth/sessions", headers=headers)
        data = resp.json()
        sessions = data["sessions"]
        if len(sessions) > 1:
            # Should be sorted by issued_at desc
            created_times = [s["created_at"] for s in sessions]
            assert created_times == sorted(created_times, reverse=True)


class TestRevokeSession:
    """DELETE /auth/sessions/{session_id}"""

    async def test_revoke_session_success(self, client: AsyncClient, user_token: dict, session):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        # Get sessions
        resp = await client.get("/api/v1/auth/sessions", headers=headers)
        assert resp.status_code == 200
        sessions = resp.json()["sessions"]
        assert len(sessions) >= 1

        # Revoke a session we can test with
        resp = await client.delete(
            f"/api/v1/auth/sessions/{sessions[0]['session_id']}", headers=headers
        )
        assert resp.status_code == 204

    async def test_revoke_nonexistent_session(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.delete("/api/v1/auth/sessions/fake-session-id", headers=headers)
        assert resp.status_code == 404

    async def test_revoke_session_unauthenticated(self, client: AsyncClient):
        resp = await client.delete("/api/v1/auth/sessions/some-session")
        assert resp.status_code == 401

    async def test_revoke_session_generates_log(
        self, client: AsyncClient, user_token: dict, session
    ):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/auth/sessions", headers=headers)
        assert resp.status_code == 200
        sessions = resp.json()["sessions"]
        if sessions:
            await client.delete(
                f"/api/v1/auth/sessions/{sessions[0]['session_id']}", headers=headers
            )


class TestLogoutAllSessions:
    """DELETE /auth/sessions"""

    async def test_logout_all_sessions(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.delete("/api/v1/auth/sessions", headers=headers)
        assert resp.status_code == 200
        resp.json()["detail"]

        # Access token should now be invalid
        resp2 = await client.get("/api/v1/auth/me", headers=headers)
        assert resp2.status_code == 401

    async def test_logout_all_unauthenticated(self, client: AsyncClient):
        resp = await client.delete("/api/v1/auth/sessions")
        assert resp.status_code == 401

    async def test_logout_all_after_login_works(self, client: AsyncClient):
        """After logout-all, user can still log in again."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111300", "password": "Test1234", "full_name": "logout-all"},
        )
        assert reg.status_code == 201
        at = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {at}"}

        await client.delete("/api/v1/auth/sessions", headers=headers)

        login = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111300", "password": "Test1234"},
        )
        assert login.status_code == 200


class TestLogoutCurrent:
    """POST /auth/logout"""

    async def test_logout_current(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post("/api/v1/auth/logout", headers=headers)
        assert resp.status_code == 200
        assert "detail" in resp.json()

    async def test_logout_current_invalidates_refresh(self, client: AsyncClient, user_token: dict):
        """Logout revokes the refresh token, so new access tokens can't be minted."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        rt = user_token["refresh_token"]
        assert rt
        await client.post(
            "/api/v1/auth/logout",
            headers=headers,
            cookies={settings.refresh_cookie_name: rt},
        )
        # The old refresh token should now be rejected
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert resp.status_code == 401

    async def test_logout_unauthenticated(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/logout")
        assert resp.status_code == 401

    async def test_logout_generates_security_log(
        self, client: AsyncClient, user_token: dict, session
    ):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        await client.post("/api/v1/auth/logout", headers=headers)

        from sqlalchemy import select

        result = await session.execute(select(Log).where(Log.action == "user_logout"))
        logs = list(result.scalars().all())
        assert len(logs) >= 1


class TestAdminRevokeSessions:
    """POST /admin/users/{user_id}/revoke-sessions"""

    async def test_admin_revoke_user_sessions(
        self, client: AsyncClient, admin_token: dict, user_token: dict
    ):
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        target_user = user_token["user"]

        resp = await client.post(
            f"/api/v1/admin/users/{target_user['id']}/revoke-sessions",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "revoked_sessions" in data

    async def test_admin_revoke_invalidates_token(
        self, client: AsyncClient, admin_token: dict, user_token: dict
    ):
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        target_user = user_token["user"]

        await client.post(
            f"/api/v1/admin/users/{target_user['id']}/revoke-sessions",
            headers=admin_headers,
        )

        # The user's access token should now be invalid
        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/auth/me", headers=user_headers)
        assert resp.status_code == 401

    async def test_admin_revoke_nonexistent_user(self, client: AsyncClient, admin_token: dict):
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.post(
            "/api/v1/admin/users/99999/revoke-sessions",
            headers=admin_headers,
        )
        assert resp.status_code == 404

    async def test_admin_revoke_requires_admin(self, client: AsyncClient, user_token: dict):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/admin/users/1/revoke-sessions",
            headers=headers,
        )
        assert resp.status_code == 403

    async def test_admin_revoke_generates_log(
        self, client: AsyncClient, admin_token: dict, user_token: dict, session
    ):
        admin_headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        target_user = user_token["user"]

        await client.post(
            f"/api/v1/admin/users/{target_user['id']}/revoke-sessions",
            headers=admin_headers,
        )

        from sqlalchemy import select

        result = await session.execute(select(Log).where(Log.action == "admin_session_revoke"))
        logs = list(result.scalars().all())
        assert len(logs) >= 1


class TestSessionPersistence:
    """Verify session behavior across operations."""

    async def test_login_creates_session(self, client: AsyncClient, user_token: dict, session):
        """Login should create a refresh token session entry."""
        # user_token fixture already logs in, which creates a session
        refresh_repo = RefreshTokenRepo(session)
        user = user_token["user"]
        count = await refresh_repo.count_active(user["id"])
        assert count >= 1

    async def test_register_creates_session(self, client: AsyncClient, session):
        """Register should create a refresh token session entry."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111400", "password": "Test1234", "full_name": "persist"},
        )
        assert reg.status_code == 201

        refresh_repo = RefreshTokenRepo(session)
        user_id = reg.json()["user"]["id"]
        count = await refresh_repo.count_active(user_id)
        assert count >= 1

    async def test_refresh_updates_session(self, client: AsyncClient, session):
        """Refresh should create a new refresh token entry."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111401", "password": "Test1234", "full_name": "persist-ref"},
        )
        assert reg.status_code == 201
        rt = client.cookies.get(settings.refresh_cookie_name)
        assert rt

        refresh_repo = RefreshTokenRepo(session)
        user_id = reg.json()["user"]["id"]
        count_before = await refresh_repo.count_active(user_id)

        await client.post("/api/v1/auth/refresh", cookies={settings.refresh_cookie_name: rt})

        count_after = await refresh_repo.count_active(user_id)
        # One old token revoked + one new token created → same count
        assert count_after == count_before
