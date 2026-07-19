"""Tests for OTP-based authentication (send + verify).

Each test manages its own Redis OTP code + phone to stay fully isolated.
"""

from __future__ import annotations

import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis_client import get_redis
from app.models.user import User, UserRole
from app.repositories.user_repo import OTP_PLACEHOLDER_HASH
from app.services.otp_service import (
    _CONSUME_OTP_SCRIPT,
    OTP_FAIL_PREFIX,
    OTP_PREFIX,
    OTP_SEND_PREFIX,
    OTP_TTL,
)
from app.services.sms_provider import MockSmsProvider

pytestmark = [pytest.mark.asyncio]

TEST_CODE = "123456"
COUNTER = 0


async def _set_otp(phone: str, code: str = TEST_CODE) -> None:
    r = await get_redis()
    await r.set(f"{OTP_PREFIX}{phone}", code, ex=OTP_TTL)
    await r.delete(f"{OTP_FAIL_PREFIX}{phone}")


async def _clean_otp(phone: str) -> None:
    r = await get_redis()
    await r.delete(
        f"{OTP_PREFIX}{phone}",
        f"{OTP_FAIL_PREFIX}{phone}",
        f"{OTP_SEND_PREFIX}{phone}",
    )


# ── Send OTP ──────────────────────────────────────────────────────────


class TestSendOtp:
    async def test_mock_provider_prints_otp_to_terminal(self, capsys) -> None:
        provider = MockSmsProvider()

        await provider.send_otp("09120000110", "123456")

        captured = capsys.readouterr()
        assert "Phone: 09120000110" in captured.out
        assert "Code:  123456" in captured.out

    async def test_mock_provider_prints_generic_message_to_terminal(self, capsys) -> None:
        provider = MockSmsProvider()

        await provider.send_message("09120000111", "پیام تست")

        captured = capsys.readouterr()
        assert "[SMS Mock] Message for 09120000111: پیام تست" in captured.out

    async def test_send_new_user(self, client: AsyncClient) -> None:
        phone = "09120000100"
        resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_new_user"] is True
        assert data["has_password"] is False
        assert data["message"] == "کد تأیید ارسال شد"
        assert 0 < data["expires_in"] <= OTP_TTL
        # Mock provider → dev_code is returned in development
        assert data["dev_code"] is not None
        assert len(data["dev_code"]) == 6
        assert data["dev_code"].isdigit()
        await _clean_otp(phone)

    async def test_send_stores_code_for_ninety_seconds(self, client: AsyncClient) -> None:
        phone = "09120000101"
        resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
        assert resp.status_code == 200

        r = await get_redis()
        ttl = await r.ttl(f"{OTP_PREFIX}{phone}")
        assert 0 < ttl <= OTP_TTL
        assert OTP_TTL == 90
        await _clean_otp(phone)

    async def test_send_same_phone_is_limited_to_once_per_ninety_seconds(
        self, client: AsyncClient
    ) -> None:
        phone = "09120000102"
        resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
        assert resp.status_code == 200
        first_code = resp.json()["dev_code"]

        resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
        assert resp.status_code == 200
        data = resp.json()
        assert data["dev_code"] == first_code
        assert 0 < data["expires_in"] <= OTP_TTL
        await _clean_otp(phone)

    async def test_send_reuses_existing_otp_remaining_ttl(self, client: AsyncClient) -> None:
        phone = "09120000109"
        r = await get_redis()
        await r.set(f"{OTP_PREFIX}{phone}", TEST_CODE, ex=47)
        await r.set(f"{OTP_SEND_PREFIX}{phone}", "1", ex=90)

        resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})

        assert resp.status_code == 200
        data = resp.json()
        assert data["dev_code"] == TEST_CODE
        assert 0 < data["expires_in"] <= 47
        await _clean_otp(phone)

    async def test_send_existing_user(self, client: AsyncClient, user_token: dict) -> None:
        phone = "09120000000"  # phone used by user_token fixture
        resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_new_user"] is False
        assert data["has_password"] is True
        assert data["dev_code"] is not None
        assert len(data["dev_code"]) == 6
        await _clean_otp(phone)

    async def test_send_existing_otp_only_user_has_no_password(
        self, client: AsyncClient, session: AsyncSession
    ) -> None:
        phone = "09120000103"
        session.add(
            User(
                phone=phone,
                password_hash=OTP_PLACEHOLDER_HASH,
                full_name="کاربر بدون رمز",
                role=UserRole.USER,
            )
        )
        await session.flush()

        resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_new_user"] is False
        assert data["has_password"] is False
        await _clean_otp(phone)

    async def test_send_invalid_phone(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/auth/otp/send",
            json={"phone": "123"},  # too short
        )
        assert resp.status_code == 422


# ── Verify OTP ────────────────────────────────────────────────────────


class TestVerifyOtp:
    async def test_verify_new_user(self, client: AsyncClient) -> None:
        phone = "09120000200"
        await _set_otp(phone)

        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": TEST_CODE, "full_name": "کاربر جدید"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"]
        assert "refresh_token" not in data
        assert client.cookies.get(settings.refresh_cookie_name)
        assert data["user"]["phone"] == phone
        assert data["user"]["full_name"] == "کاربر جدید"
        assert data["user"]["role"] == "user"

    async def test_verify_existing_user(
        self,
        client: AsyncClient,
    ) -> None:
        phone = "09120000201"
        # Register user normally first
        await client.post(
            "/api/v1/auth/register",
            json={"phone": phone, "password": "Test1234", "full_name": "کاربر عادی"},
        )
        await _set_otp(phone)

        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": TEST_CODE},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"]
        assert "refresh_token" not in data
        assert client.cookies.get(settings.refresh_cookie_name)

    async def test_verify_existing_user_inactive(
        self, client: AsyncClient, session: AsyncSession
    ) -> None:
        phone = "09120000202"
        await _set_otp(phone)

        session.add(
            User(
                phone=phone,
                password_hash=OTP_PLACEHOLDER_HASH,
                full_name="غیرفعال",
                role=UserRole.USER,
                is_active=False,
            )
        )
        await session.flush()

        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": TEST_CODE},
        )
        assert resp.status_code == 403
        assert "غیرفعال" in resp.json()["detail"]
        await _clean_otp(phone)

    async def test_verify_wrong_code(self, client: AsyncClient) -> None:
        phone = "09120000203"
        await _set_otp(phone)

        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": "999999"},
        )
        assert resp.status_code == 400
        assert "اشتباه" in resp.json()["detail"]
        await _clean_otp(phone)

    async def test_verify_wrong_code_allows_five_failures_per_code(
        self, client: AsyncClient
    ) -> None:
        phone = "09120000205"
        await _set_otp(phone)

        for _ in range(5):
            resp = await client.post(
                "/api/v1/auth/otp/verify",
                json={"phone": phone, "code": "999999"},
            )
            assert resp.status_code == 400
            assert "اشتباه" in resp.json()["detail"]

        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": "999999"},
        )
        assert resp.status_code == 429
        assert "بیش از حد" in resp.json()["detail"]

        await _set_otp(phone, "654321")
        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": "654321", "full_name": "تلاش مجدد"},
        )
        assert resp.status_code == 200

    async def test_verify_expired_code(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": "09120999999", "code": "123456"},
        )
        assert resp.status_code == 400
        assert "منقضی" in resp.json()["detail"]

    async def test_verify_new_user_missing_name(
        self,
        client: AsyncClient,
    ) -> None:
        phone = "09120000204"
        await _set_otp(phone)

        resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": TEST_CODE},
        )
        assert resp.status_code == 400
        assert "نام" in resp.json()["detail"]
        await _clean_otp(phone)


# ── OTP edge cases ────────────────────────────────────────────────────


class TestOtpEdgeCases:
    async def test_concurrent_otp_consumption_has_exactly_one_winner(self) -> None:
        phone = "09120000309"
        await _set_otp(phone)
        redis = await get_redis()

        async def consume() -> int:
            return int(
                await redis.eval(
                    _CONSUME_OTP_SCRIPT,
                    3,
                    f"{OTP_PREFIX}{phone}",
                    f"{OTP_FAIL_PREFIX}{phone}",
                    f"{OTP_SEND_PREFIX}{phone}",
                    TEST_CODE,
                    OTP_TTL,
                    5,
                    1,
                )
            )

        results = await asyncio.gather(consume(), consume())
        assert sorted(results) == [0, 1]

    async def test_verify_code_one_time_use(
        self,
        client: AsyncClient,
    ) -> None:
        """A verified code must be deleted from Redis (one-time use)."""
        phone = "09120000300"
        await _set_otp(phone)

        # First use — succeeds
        resp1 = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": TEST_CODE, "full_name": "یک بار مصرف"},
        )
        assert resp1.status_code == 200

        # Same code again — should fail (already consumed)
        resp2 = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": TEST_CODE},
        )
        assert resp2.status_code == 400
        assert "منقضی" in resp2.json()["detail"]

    async def test_end_to_end_flow(
        self,
        client: AsyncClient,
    ) -> None:
        """Complete e2e: send OTP → read dev_code from response → verify → authenticate."""
        phone = "09120000301"
        await _clean_otp(phone)

        # Step 1: Send OTP
        send_resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
        assert send_resp.status_code == 200
        send_data = send_resp.json()
        assert send_data["is_new_user"] is True
        assert send_data["dev_code"] is not None
        code: str = send_data["dev_code"]

        # Step 2: Verify the OTP was stored in Redis
        r = await get_redis()
        stored = await r.get(f"{OTP_PREFIX}{phone}")
        assert stored == code

        # Step 3: Verify OTP with the dev_code
        verify_resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": code, "full_name": "جریان کامل"},
        )
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data["access_token"]
        assert "refresh_token" not in verify_data
        assert client.cookies.get(settings.refresh_cookie_name)
        assert verify_data["user"]["phone"] == phone
        assert verify_data["user"]["full_name"] == "جریان کامل"

        # Step 4: Verify OTP is consumed (one-time use)
        reuse_resp = await client.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "code": code},
        )
        assert reuse_resp.status_code == 400
        assert "منقضی" in reuse_resp.json()["detail"]
