from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.phone import normalize_phone
from app.core.timezone import iran_to_utc, now_utc
from app.models.booking import Booking, BookingSource, BookingStatus, SettlementStatus
from app.models.notification import NotificationDelivery
from app.models.payment import Payment, PaymentStatus
from app.models.refund import Refund, RefundStatus, RefundType
from app.models.settlement import Settlement, SettlementItem, SettlementRequestStatus
from app.models.slot_cancellation import SlotCancellation
from app.models.time_slot import SlotStatus, TimeSlot
from app.models.user import User
from app.models.vendor import Vendor
from app.repositories.bank_card_repo import BankCardRepo
from app.repositories.booking_repo import BookingRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.repositories.user_repo import UserRepository
from app.services.sms_provider import get_sms_provider

# Frontend weekday convention in this project: 0=Saturday ... 6=Friday.
_WEEKDAY_MAP = [5, 6, 0, 1, 2, 3, 4]


class FinanceService:
    def __init__(self, db: AsyncSession, current_user: User) -> None:
        self.db = db
        self.current_user = current_user
        self.booking_repo = BookingRepo(db)
        self.bank_card_repo = BankCardRepo(db)
        self.slot_repo = TimeSlotRepo(db)
        self.user_repo = UserRepository(db)
        self.notify_repo = NotificationRepo(db)

    async def _get_vendor_for_manager(self, vendor_id: int) -> Vendor:
        vendor = await self.db.get(Vendor, vendor_id)
        if not vendor:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        if self.current_user.role != "admin" and vendor.manager_id != self.current_user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="شما به این مجموعه دسترسی ندارید")
        return vendor

    async def _get_slot_for_manager(self, slot_id: int) -> TimeSlot:
        slot = await self.slot_repo.get_by_id(slot_id, for_update=True)
        if not slot:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        await self._get_vendor_for_manager(slot.vendor_id)
        return slot

    async def _get_or_create_customer(self, full_name: str, phone_number: str) -> User:
        phone = normalize_phone(phone_number)
        user = await self.user_repo.get_by_phone(phone)
        if user:
            return user
        return await self.user_repo.create_otp_user(phone=phone, full_name=full_name)

    async def _get_success_payment(self, booking_id: int) -> Payment | None:
        result = await self.db.execute(
            select(Payment)
            .where(Payment.booking_id == booking_id, Payment.status == PaymentStatus.SUCCESS)
            .order_by(Payment.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_refund(
        self,
        *,
        booking: Booking,
        refund_type: RefundType,
        reason: str,
        penalty_amount: Decimal,
        refund_amount: Decimal,
        penalty_charged_to_user: bool,
        site_bears_penalty: bool,
    ) -> Refund:
        existing = (
            await self.db.execute(
                select(Refund).where(Refund.booking_id == booking.id, Refund.type == refund_type)
            )
        ).scalar_one_or_none()
        if existing:
            await self._attach_refund_destination(existing)
            return existing

        slot = booking.slot
        vendor = slot.vendor if slot else None
        if not slot or not vendor:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="اطلاعات سانس رزرو ناقص است")

        refund = Refund(
            booking_id=booking.id,
            user_id=booking.user_id,
            vendor_id=vendor.id,
            slot_id=slot.id,
            slot_start_time=slot.start_time,
            slot_end_time=slot.end_time,
            original_amount=booking.price_paid,
            slot_price=booking.slot_price,
            ball_price=booking.ball_price or Decimal("0"),
            total_paid=booking.price_paid,
            penalty_amount=penalty_amount,
            refund_amount=refund_amount,
            reason=reason,
            type=refund_type,
            status=RefundStatus.PENDING,
            penalty_charged_to_user=penalty_charged_to_user,
            site_bears_penalty=site_bears_penalty,
        )
        await self._attach_refund_destination(refund)
        self.db.add(refund)
        await self.db.flush()
        return refund

    async def _attach_refund_destination(self, refund: Refund) -> None:
        """Snapshot the verified payout card without changing an older snapshot."""
        if refund.destination_card_encrypted:
            return
        card = await self.bank_card_repo.get_verified_for_user(refund.user_id)
        if card is None:
            return
        refund.destination_card_encrypted = card.encrypted_card_number
        refund.destination_card_masked = card.masked_card_number
        refund.destination_card_holder_name = card.holder_name

    async def create_manager_booking(
        self,
        *,
        slot_id: int,
        full_name: str,
        phone_number: str,
        source: BookingSource = BookingSource.MANAGER_MANUAL,
    ) -> Booking:
        slot = await self._get_slot_for_manager(slot_id)
        vendor = slot.vendor
        if not vendor or not vendor.is_active:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="مجموعه فعال نیست")
        if slot.status != SlotStatus.OPEN or slot.is_reserved:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="این سانس آزاد نیست")
        existing = await self.booking_repo.get_active_by_slot(slot.id, for_update=True)
        if existing:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="این سانس رزرو فعال دارد")

        customer = await self._get_or_create_customer(full_name, phone_number)
        booking = await self.booking_repo.create(
            {
                "user_id": customer.id,
                "slot_id": slot.id,
                "status": BookingStatus.CONFIRMED,
                "source": source,
                "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                "created_by_manager_id": self.current_user.id,
                "customer_full_name": full_name,
                "customer_phone": normalize_phone(phone_number),
                "price_paid": Decimal("0"),
                "slot_price": slot.base_price,
                "ball_price": Decimal("0"),
                "with_ball": False,
            }
        )
        await self.slot_repo.update(slot, {"is_reserved": True, "status": SlotStatus.RESERVED})
        return booking

    async def create_recurring_manager_bookings(
        self,
        *,
        vendor_id: int,
        full_name: str,
        phone_number: str,
        date_from: date,
        date_to: date,
        days_of_week: list[int],
        start_time: str,
        end_time: str,
        allow_partial: bool,
    ) -> dict:
        vendor = await self._get_vendor_for_manager(vendor_id)
        if not vendor.is_active:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="مجموعه فعال نیست")
        if date_to < date_from:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="بازه تاریخ نامعتبر است")
        if date_to > date_from + timedelta(days=186):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, detail="رزرو بلندمدت حداکثر تا ۶ ماه مجاز است"
            )
        target_slots: list[TimeSlot] = []
        conflicts: list[dict] = []
        current = date_from
        while current <= date_to:
            try:
                persian_idx = _WEEKDAY_MAP.index(current.weekday())
            except ValueError:
                current += timedelta(days=1)
                continue
            if persian_idx not in days_of_week:
                current += timedelta(days=1)
                continue

            start_dt = datetime.combine(current, datetime.strptime(start_time, "%H:%M").time())
            end_dt = datetime.combine(current, datetime.strptime(end_time, "%H:%M").time())
            start_utc = iran_to_utc(start_dt)
            end_utc = iran_to_utc(end_dt)
            result = await self.db.execute(
                select(TimeSlot)
                .where(
                    TimeSlot.vendor_id == vendor_id,
                    TimeSlot.start_time == start_utc,
                    TimeSlot.end_time == end_utc,
                )
                .with_for_update()
            )
            slot = result.scalar_one_or_none()
            if not slot:
                conflicts.append({"date": str(current), "reason": "سانس برای این الگو وجود ندارد"})
            elif slot.status != SlotStatus.OPEN or slot.is_reserved:
                conflicts.append(
                    {"date": str(current), "slot_id": slot.id, "reason": "سانس آزاد نیست"}
                )
            elif await self.booking_repo.get_active_by_slot(slot.id, for_update=True):
                conflicts.append(
                    {"date": str(current), "slot_id": slot.id, "reason": "رزرو فعال دارد"}
                )
            else:
                target_slots.append(slot)
            current += timedelta(days=1)

        if conflicts and not allow_partial:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={"message": "برای برخی سانس‌ها conflict وجود دارد", "conflicts": conflicts},
            )

        booking_ids: list[int] = []
        for slot in target_slots:
            booking = await self.create_manager_booking(
                slot_id=slot.id,
                full_name=full_name,
                phone_number=phone_number,
                source=BookingSource.MANAGER_MANUAL,
            )
            booking_ids.append(booking.id)

        return {
            "created": len(booking_ids),
            "failed": len(conflicts),
            "booking_ids": booking_ids,
            "conflicts": conflicts,
        }

    async def cancel_booking_by_manager(
        self, booking_id: int, *, reason: str | None, release_slot: bool
    ) -> SlotCancellation:
        booking = await self.booking_repo.get_by_id(booking_id, for_update=True)
        if not booking:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="رزرو یافت نشد")
        slot = booking.slot
        if not slot:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="سانس یافت نشد")
        vendor = await self._get_vendor_for_manager(slot.vendor_id)

        if slot.start_time <= now_utc():
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="زمان این سانس گذشته یا شروع شده و دیگر قابل لغو نیست",
            )

        if booking.status in (
            BookingStatus.CANCELLED,
            BookingStatus.TRANSFERRED,
            BookingStatus.EXPIRED,
        ):
            raise HTTPException(status.HTTP_409_CONFLICT, detail="این رزرو قبلاً لغو شده است")

        online_payment = await self._get_success_payment(booking.id)
        site_cost = Decimal("0")
        if (
            booking.source == BookingSource.ONLINE
            and online_payment
            and booking.status in (BookingStatus.CONFIRMED, BookingStatus.PENDING_CANCELLATION)
        ):
            site_cost = Decimal(str(booking.price_paid))
            await self.create_refund(
                booking=booking,
                refund_type=RefundType.MANAGER_CANCELLATION,
                reason=reason or "لغو توسط سالندار",
                penalty_amount=Decimal("0"),
                refund_amount=Decimal(str(booking.price_paid)),
                penalty_charged_to_user=False,
                site_bears_penalty=True,
            )
            booking.settlement_status = SettlementStatus.EXCLUDED_DUE_TO_REFUND
        else:
            booking.settlement_status = SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION

        if booking.status == BookingStatus.PENDING_CANCELLATION:
            from app.services.replacement_service import revoke_replacement_request

            await revoke_replacement_request(self.db, booking.id)
        booking.status = BookingStatus.CANCELLED
        if release_slot:
            await self.slot_repo.update(slot, {"is_reserved": False, "status": SlotStatus.OPEN})
        else:
            await self.slot_repo.update(slot, {"is_reserved": False, "status": SlotStatus.BLOCKED})

        affected_name = booking.customer_full_name or (
            booking.user.full_name if booking.user else None
        )
        affected_phone = booking.customer_phone or (booking.user.phone if booking.user else None)
        message = f"سانس شما در مجموعه {vendor.name} لغو شد."
        notification_status = "not_created"
        sms_status = "not_sent"
        notification = None
        try:
            notification = await self.notify_repo.create(
                user_id=booking.user_id,
                type_="slot_cancelled_by_manager",
                message=message,
            )
            notification_status = "created"
        except Exception as exc:  # pragma: no cover - defensive tracking
            notification_status = f"failed:{exc.__class__.__name__}"

        if affected_phone:
            delivery = NotificationDelivery(
                notification_id=notification.id if notification else None,
                user_id=booking.user_id,
                booking_id=booking.id,
                channel="sms",
                phone_number=affected_phone,
                status="pending",
                attempts=1,
            )
            self.db.add(delivery)
            try:
                await get_sms_provider().send_message(affected_phone, message)
                delivery.status = "sent"
                delivery.sent_at = now_utc()
                sms_status = "sent"
            except Exception as exc:  # pragma: no cover - external provider
                delivery.status = "failed"
                delivery.error_message = str(exc)
                sms_status = "failed"

        cancellation = SlotCancellation(
            slot_id=slot.id,
            booking_id=booking.id,
            vendor_id=vendor.id,
            manager_id=self.current_user.id,
            affected_user_id=booking.user_id,
            affected_full_name=affected_name,
            affected_phone=affected_phone,
            reason=reason,
            release_slot=release_slot,
            online_paid_amount=booking.price_paid if online_payment else None,
            site_cost_amount=site_cost,
            sms_status=sms_status,
            notification_status=notification_status,
        )
        self.db.add(cancellation)
        await self.db.flush()
        return cancellation

    async def settlement_summary(
        self,
        *,
        vendor_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> dict:
        manager_id = self.current_user.id
        if vendor_id is not None:
            await self._get_vendor_for_manager(vendor_id)

        base = (
            select(Booking)
            .options(selectinload(Booking.slot))
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Vendor, TimeSlot.vendor_id == Vendor.id)
            .where(Vendor.manager_id == manager_id if self.current_user.role != "admin" else True)
        )
        if vendor_id:
            base = base.where(Vendor.id == vendor_id)
        if date_from:
            base = base.where(Booking.created_at >= date_from)
        if date_to:
            base = base.where(Booking.created_at <= date_to)

        bookings = list((await self.db.execute(base)).scalars().all())
        successful_online = [
            b
            for b in bookings
            if b.source == BookingSource.ONLINE and b.status == BookingStatus.CONFIRMED
        ]
        now = now_utc()
        completed_online = [b for b in successful_online if b.slot and b.slot.end_time <= now]
        not_due = [
            b
            for b in successful_online
            if b.slot
            and b.slot.end_time > now
            and b.settlement_status == SettlementStatus.NOT_SETTLED
        ]
        eligible = [
            b for b in completed_online if b.settlement_status == SettlementStatus.NOT_SETTLED
        ]
        settlement_requested_amount = sum(
            Decimal(str(b.price_paid))
            for b in bookings
            if b.settlement_status == SettlementStatus.SETTLEMENT_REQUESTED
        )
        settled_amount = sum(
            Decimal(str(b.price_paid))
            for b in bookings
            if b.settlement_status == SettlementStatus.SETTLED
        )
        refunds_query = (
            select(func.coalesce(func.sum(Refund.refund_amount), 0))
            .join(Vendor, Refund.vendor_id == Vendor.id)
            .where(Vendor.manager_id == manager_id if self.current_user.role != "admin" else True)
        )
        if vendor_id is not None:
            refunds_query = refunds_query.where(Refund.vendor_id == vendor_id)
        if date_from is not None:
            refunds_query = refunds_query.where(Refund.requested_at >= date_from)
        if date_to is not None:
            refunds_query = refunds_query.where(Refund.requested_at <= date_to)
        refunds_amount = (await self.db.execute(refunds_query)).scalar_one()

        return {
            "vendor_id": vendor_id,
            "total_online_revenue": float(
                sum(Decimal(str(b.price_paid)) for b in successful_online)
            ),
            "successful_online_bookings": len(successful_online),
            "settled_bookings": len(
                [b for b in successful_online if b.settlement_status == SettlementStatus.SETTLED]
            ),
            "settlement_requested_bookings": len(
                [
                    b
                    for b in successful_online
                    if b.settlement_status == SettlementStatus.SETTLEMENT_REQUESTED
                ]
            ),
            "available_for_settlement_bookings": len(eligible),
            "not_due_bookings": len(not_due),
            "manual_bookings": len([b for b in bookings if b.source != BookingSource.ONLINE]),
            "manager_cancelled_bookings": len(
                [
                    b
                    for b in bookings
                    if b.status == BookingStatus.CANCELLED and b.created_by_manager_id
                ]
            ),
            "user_cancelled_bookings": len(
                [
                    b
                    for b in bookings
                    if b.status == BookingStatus.CANCELLED and not b.created_by_manager_id
                ]
            ),
            "pending_cancellations": len(
                [b for b in bookings if b.status == BookingStatus.PENDING_CANCELLATION]
            ),
            "refunds_amount": float(refunds_amount or 0),
            "settlement_requested_amount": float(settlement_requested_amount),
            "settled_amount": float(settled_amount),
            "available_for_settlement": float(sum(Decimal(str(b.price_paid)) for b in eligible)),
        }

    async def _eligible_settlement_bookings(
        self, vendor_id: int, period_from: datetime | None, period_to: datetime | None
    ) -> list[Booking]:
        await self._get_vendor_for_manager(vendor_id)
        stmt = (
            select(Booking)
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .join(Payment, Payment.booking_id == Booking.id)
            .where(
                TimeSlot.vendor_id == vendor_id,
                Booking.source == BookingSource.ONLINE,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.settlement_status == SettlementStatus.NOT_SETTLED,
                Payment.status == PaymentStatus.SUCCESS,
                TimeSlot.end_time <= now_utc(),
            )
            .options(selectinload(Booking.slot).selectinload(TimeSlot.vendor))
            .with_for_update()
        )
        if period_from:
            stmt = stmt.where(Booking.created_at >= period_from)
        if period_to:
            stmt = stmt.where(Booking.created_at <= period_to)
        result = await self.db.execute(stmt)
        return list(result.scalars().unique().all())

    async def create_settlement_request(
        self,
        *,
        vendor_id: int,
        period_from: datetime | None,
        period_to: datetime | None,
        manager_note: str | None,
    ) -> Settlement:
        bookings = await self._eligible_settlement_bookings(vendor_id, period_from, period_to)
        if not bookings:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="مبلغ قابل تسویه‌ای وجود ندارد")

        amount = sum(Decimal(str(b.price_paid)) for b in bookings)
        settlement = Settlement(
            manager_id=self.current_user.id,
            vendor_id=vendor_id,
            requested_amount=amount,
            bookings_count=len(bookings),
            period_from=period_from,
            period_to=period_to,
            manager_note=manager_note,
        )
        self.db.add(settlement)
        await self.db.flush()
        for booking in bookings:
            self.db.add(
                SettlementItem(
                    settlement_id=settlement.id,
                    booking_id=booking.id,
                    amount=booking.price_paid,
                )
            )
            booking.settlement_status = SettlementStatus.SETTLEMENT_REQUESTED
        await self.db.flush()
        return settlement

    async def list_settlements(self, *, manager_only: bool) -> tuple[list[Settlement], int]:
        stmt = select(Settlement).options(
            selectinload(Settlement.vendor), selectinload(Settlement.manager)
        )
        if manager_only and self.current_user.role != "admin":
            stmt = stmt.where(Settlement.manager_id == self.current_user.id)
        stmt = stmt.order_by(Settlement.requested_at.desc())
        result = await self.db.execute(stmt)
        settlements = list(result.scalars().all())
        return settlements, len(settlements)

    async def update_settlement_status(
        self,
        settlement_id: int,
        *,
        new_status: SettlementRequestStatus,
        approved_amount: Decimal | None,
        admin_note: str | None,
        payment_tracking_code: str | None,
    ) -> Settlement:
        settlement = (
            await self.db.execute(
                select(Settlement).where(Settlement.id == settlement_id).with_for_update()
            )
        ).scalar_one_or_none()
        if not settlement:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="درخواست تسویه یافت نشد")
        allowed_transitions = {
            SettlementRequestStatus.PENDING: {
                SettlementRequestStatus.APPROVED,
                SettlementRequestStatus.REJECTED,
            },
            SettlementRequestStatus.APPROVED: {SettlementRequestStatus.PAID},
            SettlementRequestStatus.REJECTED: set(),
            SettlementRequestStatus.PAID: set(),
        }
        if (
            new_status != settlement.status
            and new_status not in allowed_transitions[settlement.status]
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=(
                    "تغییر وضعیت تسویه از "
                    f"{settlement.status.value} به {new_status.value} مجاز نیست"
                ),
            )
        if new_status == SettlementRequestStatus.PAID and not (
            payment_tracking_code or settlement.payment_tracking_code
        ):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="برای ثبت تسویه پرداخت‌شده، کد رهگیری الزامی است",
            )
        if approved_amount is not None and approved_amount > settlement.requested_amount:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="مبلغ تأییدشده نمی‌تواند بیشتر از مبلغ درخواستی باشد",
            )
        if (
            new_status == SettlementRequestStatus.PAID
            and approved_amount is not None
            and settlement.approved_amount is not None
            and approved_amount != settlement.approved_amount
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="مبلغ تسویه پس از تأیید قابل تغییر نیست",
            )
        items = list(
            (
                await self.db.execute(
                    select(SettlementItem)
                    .where(SettlementItem.settlement_id == settlement.id)
                    .options(selectinload(SettlementItem.booking))
                )
            )
            .scalars()
            .all()
        )
        now = now_utc()
        settlement.status = new_status
        settlement.admin_note = admin_note
        if approved_amount is not None:
            settlement.approved_amount = approved_amount
        elif new_status in (SettlementRequestStatus.APPROVED, SettlementRequestStatus.PAID):
            settlement.approved_amount = settlement.requested_amount
        if payment_tracking_code:
            settlement.payment_tracking_code = payment_tracking_code
        if new_status == SettlementRequestStatus.APPROVED:
            settlement.approved_at = now
            for item in items:
                item.booking.settlement_status = SettlementStatus.INCLUDED_IN_SETTLEMENT
        elif new_status == SettlementRequestStatus.PAID:
            settlement.paid_at = now
            if settlement.approved_at is None:
                settlement.approved_at = now
            for item in items:
                item.booking.settlement_status = SettlementStatus.SETTLED
        elif new_status == SettlementRequestStatus.REJECTED:
            for item in items:
                item.booking.settlement_status = SettlementStatus.NOT_SETTLED
        await self.db.flush()
        return settlement
