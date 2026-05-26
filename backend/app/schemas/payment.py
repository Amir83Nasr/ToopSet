from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.payment import PaymentStatus


class PaymentDetailResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    status: PaymentStatus
    gateway_transaction_id: str | None = None
    created_at: datetime
    court_name: str = ""
    court_address: str = ""
    slot_start_time: datetime | None = None
    slot_end_time: datetime | None = None
    model_config = {"from_attributes": True}


class PaymentListResponse(BaseModel):
    payments: list[PaymentDetailResponse]
    total: int
