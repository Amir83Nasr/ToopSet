"""SMS provider abstraction for OTP delivery and booking confirmation notifications.

Usage:
    result = await send_verify_otp("09120000000", "123456")
    print(result.status, result.message_id)

    await send_booking_confirmation_sms(...)
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx
import jdatetime

from app.core.config import settings
from app.core.timezone import utc_to_iran

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class SmsSendResult:
    """Provider-independent result of an SMS send request."""

    status: int | str
    message_id: int | str | None


class SmsProviderError(RuntimeError):
    """Raised when the SMS provider rejects or cannot process a request."""


def build_booking_confirmation_sms_text(
    vendor_name: str,
    booking_id: int,
    start_time: datetime,
    end_time: datetime,
) -> str:
    """Build the title text parameter for booking confirmation SMS (#title# template parameter)."""
    start_iran = utc_to_iran(start_time)
    end_iran = utc_to_iran(end_time)
    j_date = jdatetime.date.fromgregorian(date=start_iran.date()).strftime("%Y/%m/%d")
    start_str = start_iran.strftime("%H:%M")
    end_str = end_iran.strftime("%H:%M")

    return (
        f"رزرو شما با موفقیت ثبت شد.\n"
        f"مجموعه: {vendor_name}\n"
        f"کد رزرو: {booking_id}\n"
        f"تاریخ: {j_date}\n"
        f"ساعت: {start_str} تا {end_str}"
    )


class SmsProvider(ABC):
    """Abstract SMS provider."""

    @abstractmethod
    async def send_otp(self, phone: str, code: str | int, ttl: int = 300) -> SmsSendResult:
        """Send an OTP code to the given phone number."""
        ...

    async def send_message(self, phone: str, message: str) -> SmsSendResult:
        """Send a generic transactional SMS message."""
        return await self.send_otp(phone, message)

    @abstractmethod
    async def send_booking_confirmation(
        self, phone: str, title_text: str, template_id: int = 625366
    ) -> SmsSendResult:
        """Send a booking confirmation SMS using template verify endpoint."""
        ...


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

    async def send_booking_confirmation(
        self, phone: str, title_text: str, template_id: int = 625366
    ) -> SmsSendResult:
        print("=" * 60)
        print(f"  [SMS Mock] Booking Confirmation for {phone} (Template: {template_id}):")
        for line in title_text.splitlines():
            print(f"  {line}")
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
        booking_template_id: int = 625366,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.api_url = api_url
        self.api_key = api_key
        self.template_id = int(template_id)
        self.booking_template_id = int(booking_template_id)
        self._client = client

    async def send_verify_template(
        self,
        phone: str,
        template_id: int,
        parameters: list[dict[str, str]],
    ) -> SmsSendResult:
        payload = {
            "mobile": phone,
            "templateId": int(template_id),
            "parameters": parameters,
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

    async def send_otp(self, phone: str, code: str | int, ttl: int = 300) -> SmsSendResult:
        """Send ``code`` to ``phone`` and return the SMS.ir status/message id."""
        return await self.send_verify_template(
            phone=phone,
            template_id=self.template_id,
            parameters=[{"name": "CODE", "value": str(code)}],
        )

    async def send_booking_confirmation(
        self, phone: str, title_text: str, template_id: int = 625366
    ) -> SmsSendResult:
        """Send booking confirmation SMS to ``phone`` using template verify endpoint."""
        target_template_id = template_id if template_id is not None else self.booking_template_id
        return await self.send_verify_template(
            phone=phone,
            template_id=target_template_id,
            parameters=[{"name": "title", "value": title_text}],
        )


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
            booking_template_id=getattr(settings, "sms_booking_template_id", 625366),
        )

    raise RuntimeError(f"SMS provider {settings.sms_provider!r} is not implemented in this build")


async def send_verify_otp(mobile: str, code: str | int) -> SmsSendResult:
    """Convenience function for sending an OTP with the configured provider."""
    return await get_sms_provider().send_otp(mobile, str(code))


async def send_booking_confirmation_sms(
    phone: str,
    vendor_name: str,
    booking_id: int,
    start_time: datetime,
    end_time: datetime,
    template_id: int = 625366,
) -> SmsSendResult | None:
    """Send booking confirmation SMS using configured provider."""
    if not phone:
        return None

    title_text = build_booking_confirmation_sms_text(
        vendor_name=vendor_name,
        booking_id=booking_id,
        start_time=start_time,
        end_time=end_time,
    )
    provider = get_sms_provider()
    try:
        return await provider.send_booking_confirmation(
            phone=phone,
            title_text=title_text,
            template_id=template_id,
        )
    except Exception as exc:
        logger.exception("Failed to send booking confirmation SMS to %s: %s", phone, exc)
        return None


async def send_booking_confirmation_sms_for_booking(
    booking: Any, template_id: int = 625366
) -> SmsSendResult | None:
    """Extract fields from a Booking model instance and send confirmation SMS."""
    phone = getattr(booking, "customer_phone", None) or (
        booking.user.phone if getattr(booking, "user", None) else None
    )
    if not phone:
        return None

    slot = getattr(booking, "slot", None)
    vendor = getattr(slot, "vendor", None) if slot else None
    vendor_name = vendor.name if vendor else ""
    start_time = slot.start_time if slot else None
    end_time = slot.end_time if slot else None

    if not vendor_name or not start_time or not end_time:
        return None

    return await send_booking_confirmation_sms(
        phone=phone,
        vendor_name=vendor_name,
        booking_id=booking.id,
        start_time=start_time,
        end_time=end_time,
        template_id=template_id,
    )
