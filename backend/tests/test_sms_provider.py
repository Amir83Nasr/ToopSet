"""Unit tests for the SMS.ir Verify provider."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import httpx
import pytest

from app.services.sms_provider import (
    MockSmsProvider,
    SmsIrProvider,
    SmsProviderError,
    build_booking_confirmation_sms_text,
)

pytestmark = [pytest.mark.asyncio]


async def test_smsir_verify_sends_typed_payload_and_returns_message_id() -> None:
    captured_request: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(
            200,
            json={"status": 1, "message": "موفق", "data": {"messageId": 987654}},
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = SmsIrProvider(
            api_url="https://api.sms.ir/v1/send/verify",
            api_key="test-api-key",
            template_id=123456,
            client=client,
        )

        result = await provider.send_otp("09120000000", 123456, ttl=90)

    assert captured_request is not None
    assert captured_request.headers["x-api-key"] == "test-api-key"
    assert captured_request.headers["content-type"] == "application/json"
    assert captured_request.headers["accept"] == "text/plain"
    assert captured_request.method == "POST"
    assert captured_request.url == "https://api.sms.ir/v1/send/verify"
    assert json.loads(captured_request.content) == {
        "mobile": "09120000000",
        "templateId": 123456,
        "parameters": [{"name": "CODE", "value": "123456"}],
    }
    assert result.status == 1
    assert result.message_id == 987654


async def test_smsir_logs_provider_error_response(
    caplog: pytest.LogCaptureFixture,
) -> None:
    error_data = {"status": 0, "message": "template not found"}

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json=error_data)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = SmsIrProvider(
            api_url="https://api.sms.ir/v1/send/verify",
            api_key="test-api-key",
            template_id=123456,
            client=client,
        )

        with caplog.at_level(logging.ERROR), pytest.raises(SmsProviderError):
            await provider.send_otp("09120000000", "123456")

    assert "status_code=422" in caplog.text
    assert "template not found" in caplog.text


async def test_smsir_send_booking_confirmation_template() -> None:
    captured_request: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(
            200,
            json={"status": 1, "message": "موفق", "data": {"messageId": 777888}},
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = SmsIrProvider(
            api_url="https://api.sms.ir/v1/send/verify",
            api_key="test-api-key",
            template_id=123456,
            booking_template_id=625366,
            client=client,
        )

        title_text = build_booking_confirmation_sms_text(
            vendor_name="مجموعه آزادي",
            booking_id=99,
            start_time=datetime(2026, 8, 20, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 8, 20, 15, 30, tzinfo=timezone.utc),
        )

        result = await provider.send_booking_confirmation("09129998877", title_text)

    assert captured_request is not None
    assert captured_request.headers["x-api-key"] == "test-api-key"
    payload = json.loads(captured_request.content)
    assert payload["mobile"] == "09129998877"
    assert payload["templateId"] == 625366
    assert payload["parameters"] == [{"name": "title", "value": title_text}]
    assert "رزرو شما با موفقیت ثبت شد." in title_text
    assert "مجموعه آزادي" in title_text
    assert "کد رزرو: 99" in title_text
    assert result.status == 1
    assert result.message_id == 777888


async def test_mock_sms_provider_booking_confirmation(
    capsys: pytest.CaptureFixture[str],
) -> None:
    provider = MockSmsProvider()
    result = await provider.send_booking_confirmation("09121112233", "رزرو شما با موفقیت ثبت شد.")
    assert result.status == "mock"
    captured = capsys.readouterr()
    assert "[SMS Mock] Booking Confirmation for 09121112233" in captured.out
    assert "رزرو شما با موفقیت ثبت شد." in captured.out
