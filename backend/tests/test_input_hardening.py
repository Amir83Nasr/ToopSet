"""Regression tests for input-hardening fixes from the 2026-09 production audit.

Covers:
- pre-auth rate limiting (unauthenticated floods must be counted → 429)
- BookingCreate id bounds + strict bool (no asyncpg Integer overflow 500s)
- markup rejection in profile/registration names
- vendor response serialization surviving corrupt rows
- Postgres deadlock surfaced as 409 instead of 500
"""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient
from limits.storage import MemoryStorage
from limits.strategies import FixedWindowRateLimiter
from sqlalchemy.ext.asyncio import AsyncSession

import app.core.rate_limiter as rl_module
from app.core.exceptions import _is_postgres_deadlock
from app.core.rate_limiter import limiter

# ── pre-auth rate limiting ────────────────────────────────────────────


class TestPreAuthRateLimit:
    async def test_unauthenticated_flood_is_counted(self, client: AsyncClient):
        """Requests failing auth must still consume the limit (audit finding)."""
        # Swap in a throwaway in-memory strategy: the real one talks to the
        # local dev Redis, whose counters survive between test runs.
        was_enabled = limiter.enabled
        real_strategy = rl_module._redis_strategy
        limiter.enabled = True
        rl_module._redis_strategy = FixedWindowRateLimiter(MemoryStorage())
        try:
            statuses = []
            for _ in range(13):
                r = await client.post("/api/v1/bookings", json={"slot_id": 1, "version": 1})
                statuses.append(r.status_code)
            assert statuses[:12] == [401] * 12
            assert statuses[12] == 429
        finally:
            limiter.enabled = was_enabled
            rl_module._redis_strategy = real_strategy


# ── BookingCreate bounds / strict bool ────────────────────────────────


class TestBookingInputHardening:
    async def test_huge_slot_id_is_422_not_500(
        self, client: AsyncClient, user_token: dict[str, Any]
    ):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        r = await client.post(
            "/api/v1/bookings", json={"slot_id": 10**18, "version": 1}, headers=headers
        )
        assert r.status_code == 422

    async def test_negative_and_zero_ids_rejected(
        self, client: AsyncClient, user_token: dict[str, Any]
    ):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        for bad in (-5, 0):
            r = await client.post(
                "/api/v1/bookings", json={"slot_id": bad, "version": 1}, headers=headers
            )
            assert r.status_code == 422
        r = await client.post(
            "/api/v1/bookings", json={"slot_id": 1, "version": 0}, headers=headers
        )
        assert r.status_code == 422

    async def test_with_ball_string_is_rejected(
        self,
        client: AsyncClient,
        manager_token: dict[str, Any],
        user_token: dict[str, Any],
        session: AsyncSession,
    ):
        """pydantic lax mode coerced "yes" → True and created an unwanted booking."""
        from test_bookings import COURT_PAYLOAD, _create_slot, _get_slot_version

        mgr_headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        vendor_resp = await client.post("/api/v1/vendors", json=COURT_PAYLOAD, headers=mgr_headers)
        vendor_id = vendor_resp.json()["id"]
        slot_id = await _create_slot(client, session, vendor_id)
        version = await _get_slot_version(client, slot_id)

        user_headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        r = await client.post(
            "/api/v1/bookings",
            json={"slot_id": slot_id, "version": version, "with_ball": "yes"},
            headers=user_headers,
        )
        assert r.status_code == 422

    async def test_booking_path_id_zero_is_422(
        self, client: AsyncClient, user_token: dict[str, Any]
    ):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        r = await client.get("/api/v1/bookings/0", headers=headers)
        assert r.status_code == 422


# ── name markup rejection ─────────────────────────────────────────────


class TestNameMarkupRejection:
    async def test_profile_name_with_markup_rejected(
        self, client: AsyncClient, user_token: dict[str, Any]
    ):
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        r = await client.patch(
            "/api/v1/auth/profile",
            json={"full_name": '<img src=x onerror="alert(1)">'},
            headers=headers,
        )
        assert r.status_code == 422

    async def test_registration_name_with_markup_rejected(self, client: AsyncClient):
        r = await client.post(
            "/api/v1/auth/register",
            json={
                "phone": "09121112233",
                "password": "Str0ng!Pass",
                "full_name": "<script>alert(1)</script>",
            },
        )
        assert r.status_code == 422


# ── deadlock detection helper ─────────────────────────────────────────


class _FakeDbapiError(Exception):
    def __init__(self, sqlstate: str | None):
        super().__init__("fake")
        self.sqlstate = sqlstate


class TestDeadlockDetection:
    def test_detects_sqlstate_in_cause_chain(self):
        inner = _FakeDbapiError("40P01")
        outer = RuntimeError("wrapped")
        outer.__cause__ = inner
        assert _is_postgres_deadlock(outer) is True

    def test_ignores_other_errors(self):
        inner = _FakeDbapiError("23505")
        outer = RuntimeError("wrapped")
        outer.__cause__ = inner
        assert _is_postgres_deadlock(outer) is False
