from __future__ import annotations

import uuid


class PaymentService:
    """Mock payment gateway — simulates external payment processing."""

    async def process_payment(self, amount: float) -> str:
        """Process a payment and return a mock gateway transaction ID."""
        # Simulate network delay
        import asyncio

        await asyncio.sleep(0.5)
        # Always succeeds in mock mode
        return f"TXN-{uuid.uuid4().hex[:12].upper()}"
