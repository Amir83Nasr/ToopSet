from __future__ import annotations

from datetime import datetime
from decimal import Decimal

import jdatetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import utc_to_iran
from app.models.notification import Notification
from app.repositories.notification_repo import NotificationRepo

# Persian weekday names indexed by jdatetime date.weekday() (Saturday = 0)
_WEEKDAYS = ("شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه")

_MONTHS = (
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
)

_ROLE_LABELS = {
    "user": "کاربر",
    "manager": "مدیر مجموعه",
    "admin": "مدیر سیستم",
}

_PERSIAN_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def _to_persian_digits(text: str) -> str:
    """Convert Latin digits to Persian digits (user-facing numbers must be Persian)."""
    return text.translate(_PERSIAN_DIGITS)


def format_jalali_date(dt: datetime) -> str:
    """Render a UTC datetime as a Persian Jalali date, e.g. «شنبه ۲۰ شهریور ۱۴۰۴»."""
    local = utc_to_iran(dt) if dt.tzinfo else dt
    jdate = jdatetime.date.fromgregorian(date=local.date())
    return _to_persian_digits(
        f"{_WEEKDAYS[jdate.weekday()]} {jdate.day} {_MONTHS[jdate.month - 1]} {jdate.year}"
    )


def format_slot_label(start_time: datetime, end_time: datetime | None = None) -> str:
    """Render a slot window in Jalali, e.g. «شنبه ۲۰ شهریور ۱۴۰۴ ساعت ۱۸:۰۰ تا ۲۰:۰۰»."""
    start_local = utc_to_iran(start_time) if start_time.tzinfo else start_time
    label = f"{format_jalali_date(start_time)} ساعت {start_local.strftime('%H:%M')}"
    if end_time is not None:
        end_local = utc_to_iran(end_time) if end_time.tzinfo else end_time
        label += f" تا {end_local.strftime('%H:%M')}"
    return _to_persian_digits(label)


def format_toman(amount: Decimal | float | int) -> str:
    """Render an amount with the Persian thousands separator, e.g. «۹۰٬۰۰۰ تومان»."""
    try:
        value = int(amount)
    except (TypeError, ValueError):
        return f"{amount} تومان"
    return _to_persian_digits(f"{value:,}".replace(",", "٬")) + " تومان"


async def invalidate_notification_list_cache() -> None:
    """Drop cached notification lists so newly created notifications are visible."""
    from app.services.cache_service import invalidate_admin_list_cache

    await invalidate_admin_list_cache("notifications")


class NotificationService:
    """Creates in-app notifications for domain events with consistent Jalali formatting.

    All event helpers are best-effort: they never raise into the caller's business
    flow — a failed notification must not roll back a booking or refund.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.repo = NotificationRepo(db)

    async def create(self, user_id: int, type_: str, message: str) -> Notification | None:
        try:
            notification = await self.repo.create(user_id=user_id, type_=type_, message=message)
        except Exception:  # pragma: no cover - defensive: never break the business flow
            return None
        await self._invalidate_cache()
        return notification

    async def broadcast(self, type_: str, message: str) -> int:
        count = await self.repo.create_for_all_users(type_=type_, message=message)
        await self._invalidate_cache()
        return count

    @staticmethod
    async def _invalidate_cache() -> None:
        await invalidate_notification_list_cache()

    # ── Booking lifecycle ────────────────────────────────────────────────────

    async def booking_created_for_manager(
        self, manager_id: int, vendor_name: str, start_time: datetime, booking_id: int
    ) -> None:
        await self.create(
            user_id=manager_id,
            type_="booking_created",
            message=(
                f"رزرو جدید برای {vendor_name} — {format_slot_label(start_time)} "
                f"(کد رزرو {_to_persian_digits(str(booking_id))})"
            ),
        )

    async def booking_confirmed_for_user(
        self, user_id: int, vendor_name: str, start_time: datetime, end_time: datetime | None
    ) -> None:
        await self.create(
            user_id=user_id,
            type_="booking_confirmed",
            message=(
                f"رزرو شما برای {vendor_name} در {format_slot_label(start_time, end_time)} "
                "پرداخت و نهایی شد. وقت بخیر!"
            ),
        )

    async def booking_confirmed_for_manager(
        self, manager_id: int, vendor_name: str, start_time: datetime, booking_id: int
    ) -> None:
        await self.create(
            user_id=manager_id,
            type_="booking_confirmed",
            message=(
                f"پرداخت رزرو {vendor_name} — {format_slot_label(start_time)} انجام شد "
                f"و رزرو (کد {_to_persian_digits(str(booking_id))}) قطعی است."
            ),
        )

    async def booking_cancelled_for_user(
        self,
        user_id: int,
        vendor_name: str,
        start_time: datetime,
        refund_amount: Decimal | float,
        penalty_amount: Decimal | float,
    ) -> None:
        await self.create(
            user_id=user_id,
            type_="booking_cancelled",
            message=(
                f"رزرو شما برای {vendor_name} در {format_slot_label(start_time)} لغو شد. "
                f"{format_toman(refund_amount)} در انتظار عودت است "
                f"(جریمه لغو: {format_toman(penalty_amount)})."
            ),
        )

    async def booking_cancelled_for_manager(
        self, manager_id: int, vendor_name: str, start_time: datetime, booking_id: int
    ) -> None:
        await self.create(
            user_id=manager_id,
            type_="booking_cancelled",
            message=(
                f"رزرو {vendor_name} در {format_slot_label(start_time)} توسط کاربر لغو شد "
                f"(کد رزرو {_to_persian_digits(str(booking_id))})."
            ),
        )

    async def booking_pending_replacement_for_user(
        self,
        user_id: int,
        vendor_name: str,
        start_time: datetime,
        refund_amount: Decimal | float,
    ) -> None:
        await self.create(
            user_id=user_id,
            type_="booking_pending_replacement",
            message=(
                f"درخواست لغو رزرو {vendor_name} در {format_slot_label(start_time)} ثبت شد. "
                "سانس تا پیدا شدن جایگزین در اختیار شماست؛ پس از جایگزینی، "
                f"{format_toman(refund_amount)} عودت داده می‌شود."
            ),
        )

    async def booking_pending_replacement_for_manager(
        self, manager_id: int, vendor_name: str, start_time: datetime, booking_id: int
    ) -> None:
        await self.create(
            user_id=manager_id,
            type_="booking_pending_replacement",
            message=(
                f"رزرو {vendor_name} در {format_slot_label(start_time)} در انتظار جایگزین است "
                f"(کد رزرو {_to_persian_digits(str(booking_id))})."
            ),
        )

    async def booking_replaced_for_user(
        self, user_id: int, vendor_name: str, refund_amount: Decimal | float
    ) -> None:
        await self.create(
            user_id=user_id,
            type_="booking_replaced",
            message=(
                f"برای سانس شما در {vendor_name} جایگزین پیدا شد و "
                f"{format_toman(refund_amount)} در انتظار عودت است."
            ),
        )

    async def booking_replaced_for_manager(
        self, manager_id: int, vendor_name: str, start_time: datetime
    ) -> None:
        await self.create(
            user_id=manager_id,
            type_="booking_replaced",
            message=f"رزرو {vendor_name} در {format_slot_label(start_time)} به متقاضی جایگزین منتقل شد.",
        )

    async def booking_failed(self, user_id: int, reason: str) -> None:
        await self.create(
            user_id=user_id,
            type_="booking_failed",
            message=f"پرداخت رزرو شما ناموفق بود: {reason}",
        )

    async def booking_expired(
        self, user_id: int, vendor_name: str, start_time: datetime | None
    ) -> None:
        slot_label = format_slot_label(start_time) if start_time else "سانس موردنظر"
        await self.create(
            user_id=user_id,
            type_="booking_expired",
            message=(f"مهلت پرداخت رزرو {vendor_name} ({slot_label}) تمام شد و رزرو لغو گردید."),
        )

    async def cancellation_withdrawn(self, user_id: int) -> None:
        await self.create(
            user_id=user_id,
            type_="cancellation_withdrawn",
            message="درخواست لغو پس گرفته شد و سانس دوباره برای شما قطعی است.",
        )

    async def replacement_payment_failed(self, user_id: int, failure_message: str) -> None:
        await self.create(
            user_id=user_id,
            type_="replacement_payment_failed",
            message=f"پرداخت سانس جایگزین ناموفق بود: {failure_message}",
        )

    async def replacement_not_found(self, user_id: int) -> None:
        await self.create(
            user_id=user_id,
            type_="replacement_not_found",
            message="برای سانس شما جایگزین پیدا نشد؛ رزرو همچنان متعلق به شماست.",
        )

    async def slot_cancelled_by_manager(self, user_id: int, vendor_name: str) -> None:
        await self.create(
            user_id=user_id,
            type_="slot_cancelled_by_manager",
            message=f"سانس شما در مجموعه {vendor_name} لغو شد.",
        )

    # ── Finance ──────────────────────────────────────────────────────────────

    async def refund_status_changed(
        self,
        user_id: int,
        status: str,
        refund_amount: Decimal | float,
        payment_tracking_code: str | None = None,
    ) -> None:
        amount = format_toman(refund_amount)
        if status == "approved":
            message = f"درخواست عودت {amount} تأیید شد و به‌زودی پرداخت می‌شود."
            type_ = "refund_approved"
        elif status == "rejected":
            message = "درخواست عودت شما رد شد. برای پیگیری با پشتیبانی تماس بگیرید."
            type_ = "refund_rejected"
        elif status == "paid":
            tracking = f" (کد رهگیری: {payment_tracking_code})" if payment_tracking_code else ""
            message = f"عودت {amount} به کارت شما واریز شد.{tracking}"
            type_ = "refund_paid"
        else:  # pragma: no cover - only terminal statuses notify
            return
        await self.create(user_id=user_id, type_=type_, message=message)

    async def settlement_status_changed(
        self,
        manager_id: int,
        status: str,
        vendor_name: str,
        amount: Decimal | float,
        payment_tracking_code: str | None = None,
    ) -> None:
        amount_label = format_toman(amount)
        if status == "approved":
            message = f"درخواست تسویه {amount_label} برای {vendor_name} تأیید شد."
            type_ = "settlement_approved"
        elif status == "rejected":
            message = (
                f"درخواست تسویه {vendor_name} رد شد. برای اطلاع از دلیل با پشتیبانی تماس بگیرید."
            )
            type_ = "settlement_rejected"
        elif status == "paid":
            tracking = f" (کد رهگیری: {payment_tracking_code})" if payment_tracking_code else ""
            message = f"تسویه {amount_label} برای {vendor_name} پرداخت شد.{tracking}"
            type_ = "settlement_paid"
        else:  # pragma: no cover - only terminal statuses notify
            return
        await self.create(user_id=manager_id, type_=type_, message=message)

    # ── Reviews ──────────────────────────────────────────────────────────────

    async def review_received(
        self, manager_id: int, vendor_name: str, user_name: str, rating: int
    ) -> None:
        await self.create(
            user_id=manager_id,
            type_="review_received",
            message=(
                f"{user_name} برای {vendor_name} نظر {_to_persian_digits(str(rating))} ستاره ثبت کرد. "
                "از داشبورد مجموعه می‌توانید پاسخ دهید."
            ),
        )

    async def review_response_added(self, user_id: int, vendor_name: str) -> None:
        await self.create(
            user_id=user_id,
            type_="review_response",
            message=f"مجموعه {vendor_name} به نظر شما پاسخ داد.",
        )

    # ── Account & vendor lifecycle ───────────────────────────────────────────

    async def manager_request_decided(
        self, user_id: int, approved: bool, admin_note: str | None = None
    ) -> None:
        if approved:
            message = "درخواست مدیریت مجموعه شما تأیید شد. از این پس می‌توانید مجموعه ثبت کنید."
            type_ = "manager_request_approved"
        else:
            note = f" دلیل: {admin_note}" if admin_note else ""
            message = f"درخواست مدیریت مجموعه شما رد شد.{note}"
            type_ = "manager_request_rejected"
        await self.create(user_id=user_id, type_=type_, message=message)

    async def vendor_approved(self, manager_id: int, vendor_name: str) -> None:
        await self.create(
            user_id=manager_id,
            type_="vendor_approved",
            message=(
                f"مجموعه «{vendor_name}» توسط ادمین تأیید شد و از این پس در نتایج جستجو نمایش داده می‌شود."
            ),
        )

    async def vendor_rejected(self, manager_id: int, vendor_name: str) -> None:
        await self.create(
            user_id=manager_id,
            type_="vendor_rejected",
            message=f"درخواست ثبت مجموعه «{vendor_name}» توسط ادمین رد شد.",
        )

    async def role_changed(self, user_id: int, new_role: str) -> None:
        await self.create(
            user_id=user_id,
            type_="role_changed",
            message=f"نقش کاربری شما به «{_ROLE_LABELS.get(new_role, new_role)}» تغییر کرد.",
        )

    async def account_status_changed(self, user_id: int, is_active: bool) -> None:
        if is_active:
            await self.create(
                user_id=user_id,
                type_="account_activated",
                message="حساب کاربری شما فعال شد. خوش آمدید!",
            )
        else:
            await self.create(
                user_id=user_id,
                type_="account_deactivated",
                message="حساب کاربری شما غیرفعال شد. برای پیگیری با پشتیبانی تماس بگیرید.",
            )
