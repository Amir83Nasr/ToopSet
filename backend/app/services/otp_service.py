"""OTP-based authentication service.

Flow:
    1. User enters phone → send_otp() stores 6-digit code in Redis (5 min TTL),
       sends via SMS provider, returns is_new_user flag
    2. User enters code → verify_otp() checks Redis, creates user if new,
       returns JWT tokens
"""

from __future__ import annotations

import secrets

from fastapi import HTTPException, status
from redis import asyncio as aioredis

from app.core.logger import log_action
from app.core.security import tokens_for_user
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.services.sms_provider import SmsProvider, get_sms_provider

OTP_TTL = 300  # 5 minutes
OTP_PREFIX = "otp:"
OTP_PLACEHOLDER_HASH = "__otp_user__"

# Per-phone OTP send rate limiting
OTP_SEND_LIMIT = 3  # max OTP sends
OTP_SEND_WINDOW = 600  # per 10 minutes (seconds)
OTP_SEND_PREFIX = "otp_send:"

# OTP failed-attempt lockout
OTP_FAIL_LIMIT = 5  # max failed verify attempts
OTP_FAIL_WINDOW = 900  # per 15 minutes (seconds) → lockout
OTP_FAIL_PREFIX = "otp_fail:"


class OtpService:
    """Handles OTP send/verify logic.  Injects SmsProvider for testability."""

    def __init__(
        self,
        repo: UserRepository,
        redis: aioredis.Redis,
        sms_provider: SmsProvider | None = None,
    ):
        self.repo = repo
        self.redis = redis
        self.sms = sms_provider or get_sms_provider()

    # ── Public API ────────────────────────────────────────────────────

    async def send_otp(self, phone: str) -> dict:
        """Generate a 6-digit code, store in Redis, send via SMS.

        Rate-limited per phone number (max 3 sends per 10 minutes).
        Returns {"message": ..., "is_new_user": bool}.
        """
        # Per-phone rate limit
        send_key = f"{OTP_SEND_PREFIX}{phone}"
        send_count = await self.redis.get(send_key)
        if send_count is not None and int(send_count) >= OTP_SEND_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="درخواست کد تأیید بیش از حد مجاز. لطفاً ۱۰ دقیقه بعد تلاش کنید.",
            )

        user = await self.repo.get_by_phone(phone)
        is_new = user is None

        code = self._generate_code()
        await self._store_code(phone, code)
        await self.sms.send_otp(phone, code)

        # Increment send counter (atomic, sets TTL on first creation)
        await self.redis.incr(send_key)
        await self.redis.expire(send_key, OTP_SEND_WINDOW, nx=True)

        return {
            "message": "کد تأیید ارسال شد",
            "is_new_user": is_new,
            "code": code,
        }

    async def verify_otp(
        self,
        phone: str,
        code: str,
        full_name: str | None = None,
    ) -> tuple[User, str, str]:
        """Verify the OTP code, create user if new, return (user, access, refresh).

        Tracks failed attempts per phone; locks out after 5 failures in 15 minutes.
        """
        # Check for phone-level lockout from too many failures
        fail_key = f"{OTP_FAIL_PREFIX}{phone}"
        fail_count = await self.redis.get(fail_key)
        if fail_count is not None and int(fail_count) >= OTP_FAIL_LIMIT:
            await log_action(
                self.repo.db,
                None,
                "otp_lockout",
                f"قفل OTP | شماره {phone} پس از {int(fail_count)} تلاش ناموفق قفل شد",
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="تلاش‌های ناموفق بیش از حد مجاز. لطفاً ۱۵ دقیقه بعد تلاش کنید.",
            )

        stored = await self._retrieve_code(phone)
        if stored is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="کد تأیید منقضی شده است. لطفاً دوباره درخواست دهید.",
            )

        if stored != code:
            # Record failed attempt
            await self.redis.incr(fail_key)
            await self.redis.expire(fail_key, OTP_FAIL_WINDOW, nx=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="کد تأیید اشتباه است",
            )

        # Successful verification — clear fail counter and OTP code
        await self.redis.delete(fail_key)
        await self._delete_code(phone)

        user = await self.repo.get_by_phone(phone)

        if user is None:
            # ── New user registration via OTP ──
            if not full_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="لطفاً نام خود را وارد کنید",
                )
            user = await self.repo.create_otp_user(
                phone=phone,
                full_name=full_name,
            )
            await log_action(
                self.repo.db,
                user.id,
                "user_registered",
                f"ثبت‌نام با OTP | {full_name} با شماره {phone}",
            )
        else:
            # ── Existing user login via OTP ──
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="حساب کاربری شما غیرفعال شده است",
                )

            user.token_version += 1
            await self.repo.update_user(user.id, {"token_version": user.token_version})

            await log_action(
                self.repo.db,
                user.id,
                "user_login",
                f"ورود با OTP | '{user.full_name}' با شماره {user.phone}",
            )

        access_token, refresh_token = tokens_for_user(
            user.id,
            user.role,
            user.token_version,
        )
        return user, access_token, refresh_token

    # ── Internal helpers ──────────────────────────────────────────────

    @staticmethod
    def _generate_code() -> str:
        """Generate a cryptographically random 6-digit code."""
        return f"{secrets.randbelow(1000000):06d}"

    async def _store_code(self, phone: str, code: str) -> None:
        key = f"{OTP_PREFIX}{phone}"
        await self.redis.set(key, code, ex=OTP_TTL)

    async def _retrieve_code(self, phone: str) -> str | None:
        key = f"{OTP_PREFIX}{phone}"
        return await self.redis.get(key)

    async def _delete_code(self, phone: str) -> None:
        key = f"{OTP_PREFIX}{phone}"
        await self.redis.delete(key)
