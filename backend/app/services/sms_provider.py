"""SMS provider abstraction for OTP delivery.

Usage:
    provider = get_sms_provider()
    await provider.send_otp("09120000000", "123456")

When a real SMS provider (e.g. Kavenegar, FarazSMS) is ready:
    1. Implement a new subclass of SmsProvider
    2. Update get_sms_provider() to select it via settings.sms_provider
    3. Done — no other code changes needed
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.core.config import settings


class SmsProvider(ABC):
    """Abstract SMS provider — implement this for real providers."""

    @abstractmethod
    async def send_otp(self, phone: str, code: str, ttl: int = 300) -> None:
        """Send an OTP code to the given phone number."""
        ...

    async def send_message(self, phone: str, message: str) -> None:
        """Send a generic transactional SMS message."""
        await self.send_otp(phone, message)


class MockSmsProvider(SmsProvider):
    """Mock provider that prints OTP to console (for development)."""

    async def send_otp(self, phone: str, code: str, ttl: int = 300) -> None:
        # In dev, log in a visible way that's easy to find in docker logs
        width = 60
        header_label = "── OTP ──"
        dash_count = width - len(header_label)
        print(f"{header_label}{'─' * dash_count}")
        print(f"  Phone: {phone}")
        print(f"  Code:  {code}")
        print(f"  TTL:   {ttl}s")
        print("─" * width, flush=True)

    async def send_message(self, phone: str, message: str) -> None:
        print("=" * 60)
        print(f"  [SMS Mock] Message for {phone}: {message}")
        print("  [SMS Mock] Using mock provider — set SMS_PROVIDER=real to swap")
        print("=" * 60, flush=True)


# Stub for future real providers — uncomment and wire up when ready:
#
# class KavenegarProvider(SmsProvider):
#     def __init__(self, api_key: str):
#         self.api_key = api_key
#
#     async def send_otp(self, phone: str, code: str) -> None:
#         import httpx
#         async with httpx.AsyncClient() as client:
#             await client.post(
#                 f"https://api.kavenegar.com/v1/{self.api_key}/verify/lookup.json",
#                 json={"receptor": phone, "token": code, "template": "toopset-otp"},
#             )


def get_sms_provider() -> SmsProvider:
    """Factory — returns the SMS provider based on settings.

    To add a real provider:
        1. Create a new SmsProvider subclass above
        2. Add an env var for its config in Settings
        3. Select it here via settings.sms_provider
    """
    if settings.sms_provider == "mock":
        return MockSmsProvider()

    # When real provider is implemented:
    # if settings.sms_provider == "kavenegar":
    #     return KavenegarProvider(api_key=settings.kavenegar_api_key)

    raise RuntimeError(f"SMS provider {settings.sms_provider!r} is not implemented in this build")
