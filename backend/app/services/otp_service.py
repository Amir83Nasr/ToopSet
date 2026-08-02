"""OTP-based authentication service.

Flow:
    1. User enters phone → send_otp() stores 6-digit code in Redis (120s TTL),
       sends via SMS provider, returns is_new_user and has_password flags
    2. User enters code → verify_otp() checks Redis, creates user if new,
       returns JWT tokens
"""

from __future__ import annotations

import secrets

from fastapi import HTTPException, status
from redis import asyncio as aioredis

from app.core.logger import log_action
from app.core.phone import normalize_phone
from app.core.security import tokens_for_user
from app.core.timezone import now_utc
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.services.sms_provider import SmsProvider, get_sms_provider

OTP_TTL = 120  # 120 seconds
OTP_PREFIX = "otp:"
OTP_PLACEHOLDER_HASH = "__otp_user__"

# Per-phone OTP send rate limiting
OTP_SEND_COOLDOWN = 120  # one OTP send per 120 seconds
OTP_SEND_PREFIX = "otp_send:"

# OTP failed-attempt lockout
OTP_FAIL_LIMIT = 5  # max failed verify attempts per active OTP code
OTP_FAIL_PREFIX = "otp_fail:"

_CONSUME_OTP_SCRIPT = """
local fail_count = tonumber(redis.call('GET', KEYS[2]) or '0')
if fail_count >= tonumber(ARGV[3]) then
    return -2
end
local stored = redis.call('GET', KEYS[1])
if not stored then
    return 0
end
if stored ~= ARGV[1] then
    local failures = redis.call('INCR', KEYS[2])
    if failures == 1 then
        redis.call('EXPIRE', KEYS[2], tonumber(ARGV[2]))
    end
    return -1
end
if ARGV[4] == '0' then
    return 2
end
redis.call('DEL', KEYS[1], KEYS[2], KEYS[3])
return 1
"""


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

        Rate-limited per phone number (one send every 120 seconds).
        Returns {"message": ..., "is_new_user": bool, "has_password": bool}.
        """
        phone = normalize_phone(phone)

        user = await self.repo.get_by_phone(phone)
        is_new = user is None
        has_password = user is not None and user.password_hash != OTP_PLACEHOLDER_HASH

        existing_code = await self._retrieve_code(phone)
        if existing_code is not None:
            ttl = await self.redis.ttl(f"{OTP_PREFIX}{phone}")
            return {
                "message": "کد تأیید قبلاً ارسال شده است",
                "is_new_user": is_new,
                "has_password": has_password,
                "expires_in": max(int(ttl), 0),
                "code": existing_code,
            }

        # Per-phone cooldown only blocks brand-new OTP generation. Existing
        # valid OTPs can be reused until they are consumed, expired, or locked.
        send_key = f"{OTP_SEND_PREFIX}{phone}"
        send_blocked = await self.redis.get(send_key)
        if send_blocked is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="کد تأیید قبلاً ارسال شده است. لطفاً ۱۲۰ ثانیه بعد دوباره تلاش کنید.",
            )

        code = self._generate_code()
        await self._store_code(phone, code)
        try:
            await self.sms.send_otp(phone, code, ttl=OTP_TTL)
        except Exception:
            # Do not retain an undelivered code; the user must be able to retry.
            await self._delete_code(phone)
            raise

        await self.redis.set(send_key, "1", ex=OTP_SEND_COOLDOWN)

        return {
            "message": "کد تأیید ارسال شد",
            "is_new_user": is_new,
            "has_password": has_password,
            "expires_in": OTP_TTL,
            "code": code,
        }

    async def verify_otp(
        self,
        phone: str,
        code: str,
        full_name: str | None = None,
    ) -> tuple[User, str, str]:
        """Verify the OTP code, create user if new, return (user, access, refresh).

        Tracks failed attempts per active OTP code; locks out after 5 failures.
        """
        phone = normalize_phone(phone)
        user = await self.repo.get_by_phone(phone)

        # Atomically validate and consume the code. A plain GET followed by
        # DEL permits two concurrent requests to replay the same OTP.
        fail_key = f"{OTP_FAIL_PREFIX}{phone}"
        result = int(
            await self.redis.eval(
                _CONSUME_OTP_SCRIPT,
                3,
                f"{OTP_PREFIX}{phone}",
                fail_key,
                f"{OTP_SEND_PREFIX}{phone}",
                code,
                OTP_TTL,
                OTP_FAIL_LIMIT,
                0 if user is None and not full_name else 1,
            )
        )
        if result == -2:
            await log_action(
                self.repo.db,
                None,
                "otp_lockout",
                f"قفل OTP | شماره {phone} پس از {OTP_FAIL_LIMIT} تلاش ناموفق قفل شد",
            )
            await self.repo.db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="تلاش‌های ناموفق برای این کد بیش از حد مجاز است. لطفاً کد جدید بگیرید.",
            )

        if result == 0:
            await log_action(
                self.repo.db,
                None,
                "otp_verification_failed",
                f"تأیید OTP ناموفق | کد منقضی شده برای شماره {phone}",
                severity="WARNING",
            )
            await self.repo.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="کد تأیید منقضی شده است. لطفاً دوباره درخواست دهید.",
            )

        if result == -1:
            await log_action(
                self.repo.db,
                None,
                "otp_verification_failed",
                f"تأیید OTP ناموفق | کد اشتباه برای شماره {phone}",
                severity="WARNING",
            )
            await self.repo.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="کد تأیید اشتباه است",
            )

        if result == 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="لطفاً نام خود را وارد کنید",
            )

        if user is None:
            # ── New user registration via OTP ──
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
            await self.repo.update_user(
                user.id,
                {"token_version": user.token_version, "phone_verified_at": now_utc()},
            )

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
        fail_key = f"{OTP_FAIL_PREFIX}{phone}"
        await self.redis.set(key, code, ex=OTP_TTL)
        await self.redis.delete(fail_key)

    async def _retrieve_code(self, phone: str) -> str | None:
        key = f"{OTP_PREFIX}{phone}"
        return await self.redis.get(key)

    async def _delete_code(self, phone: str) -> None:
        key = f"{OTP_PREFIX}{phone}"
        await self.redis.delete(key)
