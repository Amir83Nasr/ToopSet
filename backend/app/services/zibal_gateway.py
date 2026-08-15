from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import settings


class ZibalGatewayError(RuntimeError):
    """Raised when Zibal rejects a request or cannot be reached."""

    def __init__(self, message: str, code: str = "zibal_error") -> None:
        self.code = code
        super().__init__(message)


class ZibalVerificationError(ZibalGatewayError):
    def __init__(self, message: str, code: str = "zibal_verification_failed") -> None:
        super().__init__(message, code=code)


@dataclass(slots=True)
class ZibalPaymentStartResult:
    track_id: str
    start_url: str
    callback_url: str
    raw_response: dict[str, Any]


@dataclass(slots=True)
class ZibalPaymentVerificationResult:
    result: int
    track_id: str
    verified: bool
    ref_id: str | None
    message: str | None
    paid_amount: Decimal | None  # amount in Toman as returned by Zibal (rial ÷ 10)
    raw_response: dict[str, Any]
    payment_status: int | None = None


def _base_url() -> str:
    return settings.zibal_base_url.rstrip("/")


def _extract_result_code(payload: dict[str, Any]) -> int | None:
    raw = payload.get("result")
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str):
        try:
            return int(raw)
        except ValueError:
            return None
    return None


def _extract_track_id(payload: dict[str, Any]) -> str | None:
    for key in ("trackId", "track_id", "trackid"):
        value = payload.get(key)
        if value is not None:
            return str(value)

    data = payload.get("data")
    if isinstance(data, dict):
        for key in ("trackId", "track_id", "trackid"):
            value = data.get(key)
            if value is not None:
                return str(value)
    return None


def _extract_paid_amount(payload: dict[str, Any]) -> Decimal | None:
    """Extract and convert paid amount from Zibal: they return rial, we store toman."""
    raw = payload.get("amount")
    if raw is None:
        data = payload.get("data")
        if isinstance(data, dict):
            raw = data.get("amount")
    if raw is not None:
        try:
            rial = int(raw)
            return Decimal(rial) / Decimal("10")
        except (ValueError, TypeError):
            return None
    return None


def _extract_ref_id(payload: dict[str, Any]) -> str | None:
    for key in ("refId", "ref_id", "refID", "refid", "refNumber"):
        value = payload.get(key)
        if value is not None:
            return str(value)

    data = payload.get("data")
    if isinstance(data, dict):
        for key in ("refId", "ref_id", "refID", "refid", "refNumber"):
            value = data.get(key)
            if value is not None:
                return str(value)
    return None


class ZibalGatewayService:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{_base_url()}{path}"
        try:
            if self._client is not None:
                response = await self._client.post(url, json=payload, timeout=20.0)
            else:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ZibalGatewayError("Zibal returned an invalid response.")
            return data
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip() or str(exc)
            raise ZibalGatewayError(f"Zibal HTTP request failed: {detail}") from exc
        except httpx.RequestError as exc:
            raise ZibalGatewayError("Could not connect to Zibal.") from exc
        except ValueError as exc:
            raise ZibalGatewayError("Zibal returned a non-JSON response.") from exc

    async def request_payment(
        self,
        *,
        amount: Decimal | float | int,
        callback_url: str,
        order_id: str | None = None,
        mobile: str | None = None,
        national_code: str | None = None,
    ) -> ZibalPaymentStartResult:
        rial_amount = int(Decimal(str(amount)) * Decimal("10"))
        payload: dict[str, Any] = {
            "merchant": settings.zibal_merchant,
            "amount": rial_amount,
            "callbackUrl": callback_url,
        }
        if order_id:
            payload["orderId"] = str(order_id)
        if mobile:
            payload["mobile"] = mobile
        if national_code:
            payload["nationalCode"] = national_code

        data = await self._post_json("/v1/request", payload)
        result_code = _extract_result_code(data)
        if result_code != 100:
            message = (
                data.get("message")
                if isinstance(data.get("message"), str)
                else "Zibal rejected the payment request."
            )
            raise ZibalGatewayError(str(message), code="zibal_request_failed")

        track_id = _extract_track_id(data)
        if not track_id:
            raise ZibalGatewayError("Zibal response did not include a trackId.")

        return ZibalPaymentStartResult(
            track_id=track_id,
            start_url=f"{_base_url()}/start/{track_id}",
            callback_url=callback_url,
            raw_response=data,
        )

    async def verify_payment(self, track_id: str) -> ZibalPaymentVerificationResult:
        data = await self._post_json(
            "/v1/verify",
            {"merchant": settings.zibal_merchant, "trackId": str(track_id)},
        )
        result_code = _extract_result_code(data)
        payment_status = data.get("status") if isinstance(data.get("status"), int) else None
        verified = result_code in {100, 201} and payment_status in {None, 1, 2}
        if result_code is None:
            raise ZibalVerificationError("Zibal returned an invalid verification result.")
        if not verified:
            message = (
                data.get("message")
                if isinstance(data.get("message"), str)
                else "Zibal verification failed."
            )
            raise ZibalVerificationError(str(message), code="zibal_verification_failed")

        return ZibalPaymentVerificationResult(
            result=result_code,
            track_id=str(track_id),
            verified=True,
            ref_id=_extract_ref_id(data),
            message=data.get("message") if isinstance(data.get("message"), str) else None,
            paid_amount=_extract_paid_amount(data),
            raw_response=data,
            payment_status=payment_status,
        )

    async def inquiry_payment(self, track_id: str) -> ZibalPaymentVerificationResult:
        data = await self._post_json(
            "/v1/inquiry",
            {"merchant": settings.zibal_merchant, "trackId": str(track_id)},
        )
        result_code = _extract_result_code(data)
        if result_code is None:
            raise ZibalVerificationError("Zibal returned an invalid inquiry result.")
        payment_status = data.get("status") if isinstance(data.get("status"), int) else None
        return ZibalPaymentVerificationResult(
            result=result_code,
            track_id=str(track_id),
            verified=result_code == 100 and payment_status in {1, 2},
            ref_id=_extract_ref_id(data),
            message=data.get("message") if isinstance(data.get("message"), str) else None,
            paid_amount=_extract_paid_amount(data),
            raw_response=data,
            payment_status=payment_status,
        )
