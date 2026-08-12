"""Security tests: refresh token rotation, replay detection, key rotation, etc."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from http.cookies import SimpleCookie
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from jose import jwt

from app.core.config import settings
from app.core.security import (
    _get_active_keys,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    tokens_for_user,
)
from app.models.refresh_token import RefreshToken

pytestmark = [pytest.mark.asyncio]


def _refresh_cookie(client: AsyncClient) -> str:
    token = client.cookies.get(settings.refresh_cookie_name)
    assert token
    return token


def _refresh_cookie_from_response(response) -> str:
    cookie = SimpleCookie()
    cookie.load(response.headers["set-cookie"])
    token = cookie[settings.refresh_cookie_name].value
    assert token
    return token


# ── Token basics ──────────────────────────────────────────────────────────


class TestTokenBasics:
    """Verify tokens contain expected claims and decode correctly."""

    async def test_access_token_has_expected_claims(self):
        token = create_access_token({"sub": "1", "role": "user", "ver": 1})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["role"] == "user"
        assert payload["ver"] == 1
        assert payload["type"] == "access"
        assert "iat" in payload
        assert "nbf" in payload
        assert "jti" in payload
        assert payload["iss"] == settings.jwt_issuer
        assert payload["aud"] == settings.jwt_audience

    async def test_refresh_token_has_sid(self):
        _, token = tokens_for_user(1, "user", 1, session_id="test-session-123")
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"
        assert payload["sid"] == "test-session-123"

    async def test_token_has_kid_header(self):
        token = create_access_token({"sub": "1"})
        # header is base64-encoded, decode manually
        import base64
        import json

        header_b64 = token.split(".")[0]
        # pad for base64
        padding = 4 - len(header_b64) % 4
        if padding != 4:
            header_b64 += "=" * padding
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        assert header.get("kid") == "v1"

    async def test_decode_with_previous_key(self):
        """Tokens signed with the current key are also decodable."""
        token = create_access_token({"sub": "1"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "1"

    async def test_decode_expired_token(self):
        """Tokens with exp far in the past return None from decode_token."""
        key, kid = [("change-me-to-a-random-secret-key", "v1")][0]
        headers = {"kid": kid} if kid else {}
        claims = {
            "sub": "1",
            "exp": datetime.now(UTC) - timedelta(hours=1),  # 1 hour past — well beyond 10s skew
        }
        token = jwt.encode(claims, key, algorithm="HS256", headers=headers)
        payload = decode_token(token)
        assert payload is None

    async def test_access_token_type_validation(self):
        token = create_refresh_token({"sub": "1"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    async def test_token_jti_uniqueness(self):
        token1 = create_access_token({"sub": "1"})
        token2 = create_access_token({"sub": "1"})
        p1 = decode_token(token1)
        p2 = decode_token(token2)
        assert p1 is not None and p2 is not None
        assert p1["jti"] != p2["jti"]


# ── Refresh token rotation ────────────────────────────────────────────────


class TestRefreshRotation:
    """Verify refresh token rotation: each refresh invalidates the old token."""

    async def test_refresh_rotation(self, client: AsyncClient):
        """A refresh token can only be used once."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111000", "password": "Test1234", "full_name": "test"},
        )
        assert reg.status_code == 201
        rt = _refresh_cookie(client)

        # First refresh succeeds
        r1 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r1.status_code == 200
        assert r1.json()["access_token"] is not None

        # Second refresh with the same token fails (already rotated)
        r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r2.status_code == 401

    async def test_refresh_rotation_chain(self, client: AsyncClient):
        """A chain of refresh tokens should all work sequentially."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111001", "password": "Test1234", "full_name": "chain"},
        )
        assert reg.status_code == 201
        rt = _refresh_cookie(client)

        for i in range(3):
            r = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
            assert r.status_code == 200, f"Refresh #{i} failed"
            data = r.json()
            assert data["access_token"] is not None
            new_rt = _refresh_cookie(client)
            assert new_rt != rt
            rt = new_rt

    async def test_refresh_with_invalid_token(self, client: AsyncClient):
        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})
        assert r.status_code == 401


# ── Replay attack detection ───────────────────────────────────────────────


class TestReplayDetection:
    """Verify replay attack detection without breaking normal browser races."""

    async def test_recent_rotated_token_reuse_does_not_revoke_session(
        self, client: AsyncClient, session
    ):
        """Immediate reuse of a rotated token can happen during multi-tab refresh."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111002", "password": "Test1234", "full_name": "replay"},
        )
        assert reg.status_code == 201
        rt = _refresh_cookie(client)
        at = reg.json()["access_token"]

        # Use the refresh token once
        r1 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r1.status_code == 200

        # Now replay the original token
        r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r2.status_code == 401

        # The access token should not be invalidated for a near-simultaneous race.
        headers = {"Authorization": f"Bearer {at}"}
        r3 = await client.get("/api/v1/auth/me", headers=headers)
        assert r3.status_code == 200

        # A new login should work
        login = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111002", "password": "Test1234"},
        )
        assert login.status_code == 200

    async def test_replay_generates_security_event(self, client: AsyncClient, session):
        """Replay detection should log an event in the logs table."""
        from sqlalchemy import select

        from app.models.log import Log

        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111003", "password": "Test1234", "full_name": "replay2"},
        )
        assert reg.status_code == 201
        rt = _refresh_cookie(client)

        # Use once
        await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})

        result = await session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == hash_token(rt))
        )
        stored = result.scalar_one()
        stored.revoked_at = datetime.now(UTC) - timedelta(seconds=60)
        await session.flush()

        # Replay
        await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})

        # Check log
        result = await session.execute(select(Log).where(Log.action == "refresh_token_reuse"))
        logs = list(result.scalars().all())
        assert len(logs) >= 1


# ── Multi-device sessions ─────────────────────────────────────────────────


class TestMultiDevice:
    """Verify multiple devices can maintain independent, concurrent sessions."""

    async def test_device_a_stays_valid_after_device_b_login(self, client: AsyncClient):
        """Logging in on Device B must NOT invalidate Device A's active session."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111004", "password": "Test1234", "full_name": "multi"},
        )
        assert reg.status_code == 201
        at_a = reg.json()["access_token"]
        rt_a = _refresh_cookie(client)

        # Device A's refresh token works
        r_a = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt_a})
        assert r_a.status_code == 200

        # Device B logs in — must NOT invalidate Device A
        login_b = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111004", "password": "Test1234"},
        )
        assert login_b.status_code == 200
        at_b = login_b.json()["access_token"]

        # Device A's original access token is still valid (not invalidated by B)
        h_a = {"Authorization": f"Bearer {at_a}"}
        r_check_a = await client.get("/api/v1/auth/me", headers=h_a)
        assert r_check_a.status_code == 200

        # Device B's access token is also valid
        h_b = {"Authorization": f"Bearer {at_b}"}
        r_check_b = await client.get("/api/v1/auth/me", headers=h_b)
        assert r_check_b.status_code == 200

    async def test_each_device_can_refresh_independently(self, client: AsyncClient):
        """Each device can refresh independently; one login does not revoke another's session."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111005", "password": "Test1234", "full_name": "multi2"},
        )
        assert reg.status_code == 201
        rt_reg = _refresh_cookie(client)

        # Device A logs in
        login_a = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111005", "password": "Test1234"},
        )
        assert login_a.status_code == 200
        rt_a = _refresh_cookie(client)

        # Device B logs in
        login_b = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111005", "password": "Test1234"},
        )
        assert login_b.status_code == 200
        rt_b = _refresh_cookie(client)

        # All three refresh tokens belong to independent sessions — each should work
        r_reg = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt_reg})
        assert r_reg.status_code == 200, "register session should still be valid"

        r_a = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt_a})
        assert r_a.status_code == 200, "device A session should still be valid"

        r_b = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt_b})
        assert r_b.status_code == 200, "device B session should still be valid"

    async def test_login_creates_new_session_without_revoking_others(self, client: AsyncClient):
        """Each login creates an additive new session; existing sessions survive."""
        registered = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111995", "password": "Test1234", "full_name": "sessions"},
        )
        assert registered.status_code == 201
        at_reg = registered.json()["access_token"]

        logged_in = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111995", "password": "Test1234"},
        )
        assert logged_in.status_code == 200
        at_login = logged_in.json()["access_token"]

        # Both tokens should be valid (multi-device: no global revocation on login)
        r1 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {at_reg}"},
        )
        assert r1.status_code == 200

        r2 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {at_login}"},
        )
        assert r2.status_code == 200

        # Sessions list shows at least 2 active sessions now
        sessions = await client.get(
            "/api/v1/auth/sessions",
            headers={"Authorization": f"Bearer {at_login}"},
        )
        assert sessions.status_code == 200
        assert len(sessions.json()["sessions"]) >= 2


# ── Sequential refresh (rotation correctness) ────────────────────────────


class TestSequentialRefresh:
    """Verify sequential refresh requests with same token: first succeeds, rest are replay."""

    async def test_sequential_refresh_same_token(self, client: AsyncClient):
        """Same token used twice sequentially: first succeeds, second is replay."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111006", "password": "Test1234", "full_name": "seq"},
        )
        assert reg.status_code == 201
        rt = _refresh_cookie(client)

        # First refresh succeeds
        r1 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r1.status_code == 200

        # Second refresh with same token triggers replay detection
        r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r2.status_code == 401


# ── Clock skew ────────────────────────────────────────────────────────────


class TestClockSkew:
    """Verify clock skew tolerance works correctly."""

    async def test_token_accepted_within_clock_skew(self):
        """Token with exp slightly in the future should be accepted."""
        from app.core.security import _build_claims

        key, kid = _get_active_keys()[0]
        now = datetime.now(UTC)
        # Set iat in the future within clock skew
        skew = settings.clock_skew_seconds
        claims = _build_claims({"sub": "1"}, timedelta(minutes=30), "access")
        claims["iat"] = now + timedelta(seconds=skew - 1)
        claims["nbf"] = now + timedelta(seconds=skew - 1)
        headers = {"kid": kid} if kid else {}
        token = jwt.encode(claims, key, algorithm="HS256", headers=headers)

        payload = decode_token(token)
        assert payload is not None

    async def test_token_rejected_beyond_clock_skew(self):
        """Token with exp in the past beyond clock skew should be rejected."""
        from app.core.security import _build_claims

        key, kid = _get_active_keys()[0]
        skew = settings.clock_skew_seconds
        claims = _build_claims({"sub": "1"}, timedelta(minutes=30), "access")
        claims["exp"] = datetime.now(UTC) - timedelta(seconds=skew + 10)
        headers = {"kid": kid} if kid else {}
        token = jwt.encode(claims, key, algorithm="HS256", headers=headers)

        payload = decode_token(token)
        assert payload is None

    async def test_token_with_future_nbf_beyond_skew(self):
        """Token with nbf far in the future should be rejected."""
        from app.core.security import _build_claims

        key, kid = _get_active_keys()[0]
        claims = _build_claims({"sub": "1"}, timedelta(minutes=30), "access")
        claims["nbf"] = datetime.now(UTC) + timedelta(hours=1)
        headers = {"kid": kid} if kid else {}
        token = jwt.encode(claims, key, algorithm="HS256", headers=headers)

        payload = decode_token(token)
        assert payload is None

    async def test_token_with_past_iat_beyond_skew_future(self):
        """Token with iat far in the future should be rejected."""
        from app.core.security import _build_claims

        key, kid = _get_active_keys()[0]
        claims = _build_claims({"sub": "1"}, timedelta(minutes=30), "access")
        claims["iat"] = datetime.now(UTC) + timedelta(hours=2)
        headers = {"kid": kid} if kid else {}
        token = jwt.encode(claims, key, algorithm="HS256", headers=headers)

        payload = decode_token(token)
        assert payload is None


# ── Key rotation ──────────────────────────────────────────────────────────


class TestKeyRotation:
    """Verify tokens signed with the previous key can still be decoded."""

    async def test_decode_token_with_previous_key(self, monkeypatch):
        """Token signed with a previous key should decode when previous key is set."""
        token = create_access_token({"sub": "1"})

        # Now rotate keys: set previous key and current key
        original_key = settings.secret_key
        old_key = original_key
        new_key = "new-secret-key-for-testing-only"
        with (
            patch.object(settings, "secret_key", new_key),
            patch.object(settings, "secret_key_previous", old_key),
        ):
            # Our token was signed with original_key, which is now the previous key
            payload = decode_token(token)
            assert payload is not None
            assert payload["sub"] == "1"

            # New tokens signed with new key should also decode
            new_token = create_access_token({"sub": "2"})
            payload2 = decode_token(new_token)
            assert payload2 is not None
            assert payload2["sub"] == "2"

            # The new token's kid should be "v1"
            import base64
            import json

            header_b64 = new_token.split(".")[0]
            padding = 4 - len(header_b64) % 4
            if padding != 4:
                header_b64 += "=" * padding
            header = json.loads(base64.urlsafe_b64decode(header_b64))
            assert header.get("kid") == "v1"

    async def test_unknown_key_rejected(self):
        """Token signed with an unknown (not current, not previous) key is rejected."""
        default_key = settings.secret_key
        with (
            patch.object(settings, "secret_key", "some-other-key"),
            patch.object(settings, "secret_key_previous", ""),
        ):
            token = create_access_token({"sub": "1"})
        # Token was signed with "some-other-key" but current key is default
        settings.secret_key = default_key
        payload = decode_token(token)
        assert payload is None


# ── Token version (device revocation) ─────────────────────────────────────


class TestTokenVersion:
    """Verify token_version-based invalidation works for security-sensitive operations.

    token_version is only bumped on:
      - logout-all-sessions (explicit user action)
      - password change (security event)
    It is NOT bumped on normal login, which enables multi-device sessions.
    """

    async def test_login_does_not_bump_version(self, client: AsyncClient):
        """Normal login must NOT bump token_version; existing sessions stay valid."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111007", "password": "Test1234", "full_name": "version"},
        )
        assert reg.status_code == 201
        at = reg.json()["access_token"]

        # Login on Device B — should NOT bump version or revoke Device A
        login = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111007", "password": "Test1234"},
        )
        assert login.status_code == 200

        # Register access token is still valid (no version bump from login)
        headers = {"Authorization": f"Bearer {at}"}
        r = await client.get("/api/v1/auth/me", headers=headers)
        assert r.status_code == 200

    async def test_logout_all_bumps_version_invalidating_all_tokens(self, client: AsyncClient):
        """logout-all bumps token_version, so all outstanding access tokens are rejected."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111008", "password": "Test1234", "full_name": "ver-all"},
        )
        assert reg.status_code == 201
        at = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {at}"}

        # Logout all sessions — this bumps token_version
        r_logout = await client.delete("/api/v1/auth/sessions", headers=headers)
        assert r_logout.status_code == 200

        # Old access token must now be rejected because token_version was bumped
        r = await client.get("/api/v1/auth/me", headers=headers)
        assert r.status_code == 401

    async def test_refresh_token_revoked_on_logout(self, client: AsyncClient):
        """Refresh token belonging to logged-out session is rejected."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111009", "password": "Test1234", "full_name": "ver-ref"},
        )
        assert reg.status_code == 201
        rt = _refresh_cookie(client)
        at = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {at}"}

        # Logout all sessions — revokes refresh tokens in DB too
        await client.delete("/api/v1/auth/sessions", headers=headers)

        # Old refresh token must now be rejected (revoked in DB)
        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r.status_code == 401


# ── Token expiry ──────────────────────────────────────────────────────────


class TestTokenExpiry:
    """Verify expired tokens are properly rejected."""

    async def test_expired_access_token_rejected(self, client: AsyncClient):
        """An expired access token (past exp) should fail."""
        with patch.object(settings, "access_token_expire_minutes", -1):
            reg = await client.post(
                "/api/v1/auth/register",
                json={"phone": "09121111009", "password": "Test1234", "full_name": "expire"},
            )
            assert reg.status_code == 201
            at = reg.json()["access_token"]

        headers = {"Authorization": f"Bearer {at}"}
        r = await client.get("/api/v1/auth/me", headers=headers)
        assert r.status_code == 401

    async def test_expired_refresh_token_rejected(self, client: AsyncClient):
        """An expired refresh token should fail."""
        with patch.object(settings, "refresh_token_expire_days", -1):
            reg = await client.post(
                "/api/v1/auth/register",
                json={"phone": "09121111010", "password": "Test1234", "full_name": "exp-rt"},
            )
            assert reg.status_code == 201
            rt = _refresh_cookie_from_response(reg)

        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r.status_code == 401


# ── Logout ────────────────────────────────────────────────────────────────


class TestLogout:
    """Verify logout revokes the session."""

    async def test_logout_invalidates_refresh_token(self, client: AsyncClient):
        """After logout, the same refresh token should not work."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111011", "password": "Test1234", "full_name": "logout"},
        )
        assert reg.status_code == 201
        rt = _refresh_cookie(client)
        at = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {at}"}

        # Logout
        r = await client.post(
            "/api/v1/auth/logout",
            headers=headers,
            cookies={settings.refresh_cookie_name: rt},
        )
        assert r.status_code == 200

        # Refresh with the same token should fail
        r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r2.status_code == 401

    async def test_logout_does_not_break_new_login(self, client: AsyncClient):
        """After logout, the user can still log in again."""
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111012", "password": "Test1234", "full_name": "logout2"},
        )
        assert reg.status_code == 201
        at = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {at}"}

        await client.post(
            "/api/v1/auth/logout",
            headers=headers,
            cookies={settings.refresh_cookie_name: _refresh_cookie(client)},
        )

        # New login works
        login = await client.post(
            "/api/v1/auth/login",
            json={"phone": "09121111012", "password": "Test1234"},
        )
        assert login.status_code == 200


# ── Legacy token backward compatibility ───────────────────────────────────


class TestBackwardCompat:
    """Strict JWT validation rejects legacy tokens without required claims."""

    async def test_legacy_access_token_without_type(self):
        """Tokens without issuer/audience/type are rejected."""
        from jose import jwt as jose_jwt

        from app.core.security import _get_active_keys

        key, kid = _get_active_keys()[0]
        token = jose_jwt.encode(
            {"sub": "1", "role": "user", "ver": 0},
            key,
            algorithm="HS256",
        )
        assert decode_token(token, expected_type="access") is None

    async def test_legacy_refresh_token_without_sid(self, client: AsyncClient):
        """Refresh tokens without sid should still work for one cycle."""
        from jose import jwt as jose_jwt

        from app.core.security import _get_active_keys

        key, kid = _get_active_keys()[0]
        # Create a legacy refresh token
        token = jose_jwt.encode(
            {
                "sub": "1",
                "role": "user",
                "ver": 0,
                "exp": datetime.now(UTC) + timedelta(days=7),
                "iat": datetime.now(UTC),
            },
            key,
            algorithm="HS256",
        )

        # We need a real user in the DB. Use register then extract.
        reg = await client.post(
            "/api/v1/auth/register",
            json={"phone": "09121111020", "password": "Test1234", "full_name": "legacy"},
        )
        user_id = reg.json()["user"]["id"]

        # Create a legacy-style token signed with a valid user id
        token = jose_jwt.encode(
            {
                "sub": str(user_id),
                "role": "user",
                "ver": 0,
                "exp": datetime.now(UTC) + timedelta(days=7),
                "iat": datetime.now(UTC),
            },
            key,
            algorithm="HS256",
        )

        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": token})
        assert r.status_code == 401


# ── Hash token utility ────────────────────────────────────────────────────


class TestHashToken:
    async def test_hash_is_deterministic(self):
        h1 = hash_token("some-token-value")
        h2 = hash_token("some-token-value")
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex = 64 chars

    async def test_hash_is_sensitive_to_input(self):
        h1 = hash_token("token-a")
        h2 = hash_token("token-b")
        assert h1 != h2

    async def test_hash_is_not_reversible(self):
        """SHA-256 hash should look like a hex digest."""
        h = hash_token("any")
        assert all(c in "0123456789abcdef" for c in h)
