from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.refund import RefundStatus, RefundType
from app.models.settlement import SettlementRequestStatus


class RefundResponse(BaseModel):
    id: int
    booking_id: int
    user_id: int
    vendor_id: int
    slot_id: int
    slot_start_time: datetime
    slot_end_time: datetime
    original_amount: float
    slot_price: float | None = None
    ball_price: float
    total_paid: float
    penalty_amount: float
    refund_amount: float
    reason: str
    type: RefundType
    status: RefundStatus
    penalty_charged_to_user: bool
    site_bears_penalty: bool
    requested_at: datetime
    approved_at: datetime | None = None
    paid_at: datetime | None = None
    admin_note: str | None = None
    payment_tracking_code: str | None = None
    user_name: str = ""
    user_phone: str = ""
    vendor_name: str = ""

    model_config = {"from_attributes": True}


class RefundListResponse(BaseModel):
    refunds: list[RefundResponse]
    total: int


class RefundStatusUpdate(BaseModel):
    status: RefundStatus
    admin_note: str | None = None
    payment_tracking_code: str | None = None


class ManagerManualBookingCreate(BaseModel):
    slot_id: int
    full_name: str = Field(..., min_length=2, max_length=128)
    phone_number: str = Field(..., min_length=10, max_length=16)
    participants_count: int = Field(default=1, ge=1)
    source: str = Field(default="manager_manual", pattern="^manager_manual$")


class ManagerRecurringBookingCreate(BaseModel):
    vendor_id: int
    full_name: str = Field(..., min_length=2, max_length=128)
    phone_number: str = Field(..., min_length=10, max_length=16)
    date_from: date
    date_to: date
    days_of_week: list[int] = Field(..., min_length=1)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    participants_count: int = Field(default=1, ge=1)
    allow_partial: bool = False


class ManagerRecurringBookingResponse(BaseModel):
    created: int
    failed: int
    booking_ids: list[int]
    conflicts: list[dict]


class ManagerCancelBookingRequest(BaseModel):
    reason: str | None = None
    release_slot: bool = True


class SlotCancellationResponse(BaseModel):
    id: int
    slot_id: int
    booking_id: int | None = None
    vendor_id: int
    manager_id: int
    affected_user_id: int | None = None
    affected_full_name: str | None = None
    affected_phone: str | None = None
    reason: str | None = None
    release_slot: bool
    online_paid_amount: float | None = None
    site_cost_amount: float
    sms_status: str | None = None
    notification_status: str | None = None
    review_status: str
    created_at: datetime
    vendor_name: str = ""
    manager_name: str = ""

    model_config = {"from_attributes": True}


class SettlementSummaryResponse(BaseModel):
    vendor_id: int | None = None
    total_online_revenue: float
    successful_online_bookings: int
    settled_bookings: int = 0
    settlement_requested_bookings: int = 0
    available_for_settlement_bookings: int = 0
    not_due_bookings: int = 0
    manual_bookings: int
    manager_cancelled_bookings: int
    user_cancelled_bookings: int
    pending_cancellations: int
    refunds_amount: float
    settlement_requested_amount: float
    settled_amount: float
    available_for_settlement: float


class SettlementCreateRequest(BaseModel):
    vendor_id: int
    period_from: datetime | None = None
    period_to: datetime | None = None
    manager_note: str | None = None


class SettlementResponse(BaseModel):
    id: int
    manager_id: int
    vendor_id: int
    requested_amount: float
    approved_amount: float | None = None
    bookings_count: int
    period_from: datetime | None = None
    period_to: datetime | None = None
    status: SettlementRequestStatus
    manager_note: str | None = None
    admin_note: str | None = None
    payment_tracking_code: str | None = None
    requested_at: datetime
    approved_at: datetime | None = None
    paid_at: datetime | None = None
    vendor_name: str = ""
    manager_name: str = ""

    model_config = {"from_attributes": True}


class SettlementListResponse(BaseModel):
    settlements: list[SettlementResponse]
    total: int


class SettlementStatusUpdate(BaseModel):
    status: SettlementRequestStatus
    approved_amount: Decimal | None = Field(default=None, ge=0)
    admin_note: str | None = None
    payment_tracking_code: str | None = None
