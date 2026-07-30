"""Unit tests for the SMS.ir Verify provider."""

from __future__ import annotations

import json
import logging

import httpx
import pytest

from app.services.sms_provider import SmsIrProvider, SmsProviderError

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
