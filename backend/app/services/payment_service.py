from __future__ import annotations

import uuid


class PaymentError(Exception):
    """Payment processing failed."""

    pass


class PaymentService:
    """Mock payment gateway — simulates external payment processing."""

    async def process_payment(self, amount: float) -> str:
        """Process a payment and return a mock gateway transaction ID.

        Simulates ~50% failure rate to exercise the A2 error flow.
        """
        import asyncio
        import random

        # Simulate network delay
        await asyncio.sleep(0.5)

        # Randomly fail ~50% of the time to exercise error flow
        if random.random() < 0.5:
            raise PaymentError("پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.")

        return f"TXN-{uuid.uuid4().hex[:12].upper()}"
