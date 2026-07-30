"""SMS provider abstraction for OTP delivery.

Usage:
    result = await send_verify_otp("09120000000", "123456")
    print(result.status, result.message_id)
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class SmsSendResult:
    """Provider-independent result of an SMS send request."""

    status: int | str
    message_id: int | str | None


class SmsProviderError(RuntimeError):
    """Raised when the SMS provider rejects or cannot process a request."""


class SmsProvider(ABC):
    """Abstract SMS provider."""

    @abstractmethod
    async def send_otp(self, phone: str, code: str | int, ttl: int = 300) -> SmsSendResult:
        """Send an OTP code to the given phone number."""
        ...

    async def send_message(self, phone: str, message: str) -> SmsSendResult:
        """Send a generic transactional SMS message."""
        return await self.send_otp(phone, message)


class MockSmsProvider(SmsProvider):
    """Mock provider that prints OTP to console (for development)."""

    async def send_otp(self, phone: str, code: str | int, ttl: int = 300) -> SmsSendResult:
        # In dev, log in a visible way that's easy to find in docker logs
        width = 60
        header_label = "── OTP ──"
        dash_count = width - len(header_label)
        print(f"{header_label}{'─' * dash_count}")
        print(f"  Phone: {phone}")
        print(f"  Code:  {code}")
        print(f"  TTL:   {ttl}s")
        print("─" * width, flush=True)
        return SmsSendResult(status="mock", message_id=None)

    async def send_message(self, phone: str, message: str) -> SmsSendResult:
        print("=" * 60)
        print(f"  [SMS Mock] Message for {phone}: {message}")
        print("  [SMS Mock] Using mock provider — set SMS_PROVIDER=smsir to swap")
        print("=" * 60, flush=True)
        return SmsSendResult(status="mock", message_id=None)


class SmsIrProvider(SmsProvider):
    """SMS.ir Verify (fast-send) API client."""

    def __init__(
        self,
        *,
        api_url: str,
        api_key: str,
        template_id: int,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.api_url = api_url
        self.api_key = api_key
        self.template_id = int(template_id)
        self._client = client

    async def send_otp(self, phone: str, code: str | int, ttl: int = 300) -> SmsSendResult:
        """Send ``code`` to ``phone`` and return the SMS.ir status/message id."""
        payload = {
            "mobile": phone,
            "templateId": int(self.template_id),
            "parameters": [{"name": "CODE", "value": str(code)}],
        }
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/plain",
            "x-api-key": self.api_key,
        }

        try:
            if self._client is not None:
                response = await self._client.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                )
            else:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        self.api_url,
                        headers=headers,
                        json=payload,
                    )

            response.raise_for_status()
            response_data: Any = response.json()
            if not isinstance(response_data, dict):
                raise SmsProviderError("SMS.ir returned an invalid JSON response.")

            provider_status = response_data.get("status", response.status_code)
            if str(provider_status) not in {"1", "200", "success", "successful"}:
                logger.error("SMS.ir API error response_data=%s", response_data)
                provider_message = response_data.get("message", "SMS.ir rejected the request.")
                raise SmsProviderError(str(provider_message))

            data = response_data.get("data")
            message_id: int | str | None = None
            if isinstance(data, dict):
                message_id = data.get("messageId") or data.get("message_id")
            elif isinstance(data, (int, str)):
                message_id = data

            return SmsSendResult(status=provider_status, message_id=message_id)
        except httpx.HTTPStatusError as exc:
            response_data = _response_error_data(exc.response)
            logger.error(
                "SMS.ir HTTP error status_code=%s response_data=%s",
                exc.response.status_code,
                response_data,
            )
            raise SmsProviderError("SMS.ir HTTP request failed.") from exc
        except httpx.RequestError as exc:
            logger.exception("SMS.ir request failed: %s", exc)
            raise SmsProviderError("Could not connect to SMS.ir.") from exc
        except ValueError as exc:
            logger.error("SMS.ir returned a non-JSON response: %s", response.text)
            raise SmsProviderError("SMS.ir returned an invalid response.") from exc


def _response_error_data(response: httpx.Response) -> Any:
    """Return provider error JSON when possible, otherwise its response text."""
    try:
        return response.json()
    except ValueError:
        return response.text


def get_sms_provider() -> SmsProvider:
    """Return the SMS provider selected by environment settings."""
    if settings.sms_provider == "mock":
        return MockSmsProvider()

    if settings.sms_provider == "smsir":
        return SmsIrProvider(
            api_url=settings.sms_api_url,
            api_key=settings.sms_api_key.get_secret_value(),
            template_id=settings.sms_template_id,
        )

    raise RuntimeError(f"SMS provider {settings.sms_provider!r} is not implemented in this build")


async def send_verify_otp(mobile: str, code: str | int) -> SmsSendResult:
    """Convenience function for sending an OTP with the configured provider.

    Example:
        result = await send_verify_otp("09120000000", "123456")
        print(result.status, result.message_id)
    """
    return await get_sms_provider().send_otp(mobile, str(code))
