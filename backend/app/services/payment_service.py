from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import settings


class PaymentError(Exception):
    """Payment processing failed."""

    def __init__(self, message: str, code: str = "unknown") -> None:
        self.code = code
        super().__init__(message)


class InsufficientFundsError(PaymentError):
    def __init__(self) -> None:
        super().__init__("موجودی کافی نیست", code="insufficient_funds")


class GatewayTimeoutError(PaymentError):
    def __init__(self) -> None:
        super().__init__(
            "درگاه پرداخت پاسخگو نیست. لطفاً مجدداً تلاش کنید.",
            code="gateway_timeout",
        )


class FraudDetectionError(PaymentError):
    def __init__(self) -> None:
        super().__init__(
            "تراکنش توسط سیستم امنیتی مسدود شد. لطفاً با پشتیبانی تماس بگیرید.",
            code="fraud_detected",
        )


@dataclass
class PaymentResult:
    """Result from a successful payment processing."""

    transaction_id: str
    gateway_name: str
    card_number: str  # masked, e.g. "621986****1234"
    paid_at: datetime
    ref_id: str  # gateway reference / receipt number
    fee: float  # gateway fee


# ── Bank gateway name pool ───────────────────────────────────────────
_GATEWAYS = [
    "زرین‌پال",
    "ملی",
    "ملت",
    "پارسیان",
    "سامان",
    "صادرات",
    "تجارت",
    "رفاه",
    "شهر",
    "آینده",
]

# ── Realistic masked card prefixes ───────────────────────────────────
_CARD_PREFIXES = [
    "603799",  # ملی
    "610433",  # ملت
    "627412",  # پارسیان
    "621986",  # سامان
    "603769",  # صادرات
    "585983",  # تجارت
    "589463",  # رفاه
    "504706",  # شهر
    "636214",  # آینده / خاورمیانه
]


class PaymentService:
    """Mock payment gateway — simulates external payment processing.

    Behaviour is configurable via constructor params for different
    testing scenarios.
    """

    def __init__(
        self,
        success_rate: float = 0.75,
        min_delay: float = 0.3,
        max_delay: float = 1.2,
    ) -> None:
        """
        Args:
            success_rate: Probability of a successful payment (0.0–1.0).
            min_delay: Minimum simulated network delay in seconds.
            max_delay: Maximum simulated network delay in seconds.
        """
        if settings.payment_gateway not in {"mock", "zibal"}:
            raise RuntimeError(
                f"Payment gateway {settings.payment_gateway!r} is not implemented in this build"
            )
        self.success_rate = success_rate
        self.min_delay = min_delay
        self.max_delay = max_delay
        self._call_count = 0

    async def process_payment(self, amount: float) -> PaymentResult:
        """Process a payment through a simulated gateway.

        Returns a ``PaymentResult`` on success, or raises a ``PaymentError``
        (one of the subclasses above) on failure.
        """
        import asyncio
        import random

        self._call_count += 1

        # ── 1. Simulate network latency ──────────────────────────────
        delay = random.uniform(self.min_delay, self.max_delay)
        await asyncio.sleep(delay)

        # ── 2. Decide outcome ────────────────────────────────────────
        roll = random.random()

        if roll >= self.success_rate:
            # Distribute failures among different error types
            err_roll = random.random()
            if err_roll < 0.5:  # 50% of failures → generic
                raise PaymentError(
                    "پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.",
                    code="gateway_declined",
                )
            elif err_roll < 0.75:  # 25% → timeout
                await asyncio.sleep(random.uniform(2.0, 3.5))
                raise GatewayTimeoutError()
            elif err_roll < 0.9:  # 15% → insufficient funds
                raise InsufficientFundsError()
            else:  # 10% → fraud detection
                raise FraudDetectionError()

        # ── 3. Build a realistic success response ────────────────────
        import random as rnd

        gateway_name = rnd.choice(_GATEWAYS)
        prefix = rnd.choice(_CARD_PREFIXES)
        suffix = f"{rnd.randint(1000, 9999)}"
        masked_card = f"{prefix}****{suffix}"

        return PaymentResult(
            transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            gateway_name=gateway_name,
            card_number=masked_card,
            paid_at=datetime.now(timezone.utc),
            ref_id=str(rnd.randint(100000000, 999999999)),
            fee=round(amount * 0.01, 0),  # 1 % gateway fee
        )
