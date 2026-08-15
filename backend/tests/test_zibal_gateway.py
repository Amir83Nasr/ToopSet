"""Unit tests for the Zibal gateway adapter."""

from __future__ import annotations

import json

import httpx
import pytest

from app.core.config import settings
from app.services.zibal_gateway import ZibalGatewayService, ZibalVerificationError

pytestmark = [pytest.mark.asyncio]


async def test_zibal_request_payment_converts_toman_to_rial() -> None:
    captured_request: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(200, json={"result": 100, "trackId": 4716806383})

    original_merchant = settings.zibal_merchant
    original_base_url = settings.zibal_base_url
    settings.zibal_merchant = "test-merchant"
    settings.zibal_base_url = "https://gateway.zibal.ir"
    try:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = ZibalGatewayService(client=client)
            result = await service.request_payment(
                amount=20000,
                callback_url="https://toopset.ir/book/payment/callback",
                order_id="7",
            )
    finally:
        settings.zibal_merchant = original_merchant
        settings.zibal_base_url = original_base_url

    assert captured_request is not None
    assert captured_request.url == "https://gateway.zibal.ir/v1/request"
    assert json.loads(captured_request.content) == {
        "merchant": "test-merchant",
        "amount": 200000,
        "callbackUrl": "https://toopset.ir/book/payment/callback",
        "orderId": "7",
    }
    assert result.track_id == "4716806383"
    assert result.start_url == "https://gateway.zibal.ir/start/4716806383"


async def test_zibal_inquiry_uses_payment_status_not_request_result() -> None:
    async def failed_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"result": 100, "status": 3, "amount": 200000, "message": "success"},
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(failed_handler)) as client:
        failed = await ZibalGatewayService(client=client).inquiry_payment("123")

    assert failed.verified is False
    assert failed.payment_status == 3
    assert failed.paid_amount == 20000

    async def paid_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "result": 100,
                "status": 1,
                "amount": 200000,
                "refNumber": 998877,
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(paid_handler)) as client:
        paid = await ZibalGatewayService(client=client).inquiry_payment("124")

    assert paid.verified is True
    assert paid.ref_id == "998877"


async def test_zibal_verify_rejects_cancelled_payment_status() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"result": 100, "status": 3, "amount": 200000})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(ZibalVerificationError):
            await ZibalGatewayService(client=client).verify_payment("cancelled")
