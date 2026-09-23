"""Eitaa channel integration — daily empty-slots digest.

Every morning at 07:00 Iran time the backend collects each active vendor's
open slots for the next ``EITAA_DIGEST_DAYS`` days and posts one message per
vendor to the Eitaa channel configured via ``EITAA_BOT_TOKEN`` / ``EITAA_CHANNEL_ID``.
Posted messages are recorded in ``eitaa_digest_messages`` so that when a
booking is paid, :func:`sync_digest_after_payment` can immediately edit the
affected vendor's message and drop the booked slot from it.

Messages travel through the Uniom gateway (``EITAA_API_BASE_URL``), which is
Telegram Bot API compatible: ``POST {base}/bot{token}/sendMessage`` and
``POST {base}/bot{token}/editMessageText``.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any

import httpx
import jdatetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.schedule import SLOT_DAY_CUTOFF, slot_operational_day
from app.core.timezone import iran_to_utc, now_iran, now_utc, utc_to_iran
from app.models.time_slot import TimeSlot
from app.models.vendor import SportType, Vendor
from app.repositories.eitaa_digest_repo import EitaaDigestRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.services.notification_service import PERSIAN_WEEKDAYS, to_persian_digits

logger = logging.getLogger(__name__)

# Iran-local hour when the daily digest is posted (07:00 Asia/Tehran).
EITAA_DAILY_POST_HOUR = 7

# How many operational days (starting today) each digest message covers.
EITAA_DIGEST_DAYS = 5

# Pause between consecutive channel posts so the gateway never throttles us.
SEND_INTERVAL_SECONDS = 0.5

_HEADER = "📣 برنامه سانس ها ⚽️"
_RESERVATION_NOTE = "🔰 جهت رزرو سانس داخل سایت توپست میتوانید رزرو بکنید"
_SEPARATOR_LINE = "ـ" * 40

# Persian label shown under the header for the vendor's sport types.
_SPORT_LABELS: dict[str, str] = {
    SportType.FOOTBALL.value: "🥅 زمین چمن",
    SportType.FUTSAL.value: "🥅 سالن فوتسال",
    SportType.VOLLEYBALL.value: "🏐 سالن والیبال",
    SportType.BASKETBALL.value: "🏀 سالن بسکتبال",
    SportType.HANDBALL.value: "🤾 سالن هندبال",
}


class EitaaGatewayError(RuntimeError):
    """Raised when the Eitaa gateway rejects a request or cannot be reached."""


@dataclass(slots=True)
class EitaaSendResult:
    """Provider-independent result of one channel message post/edit."""

    message_id: int | str | None
    raw_response: dict[str, Any]


class EitaaChannelClient:
    """Eitaa channel client over the Uniom gateway (Telegram Bot API compatible)."""

    def __init__(
        self,
        *,
        base_url: str,
        bot_token: str,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.bot_token = bot_token
        self._client = client

    async def _post(self, path: str, payload: dict[str, Any]) -> EitaaSendResult:
        url = f"{self.base_url}/bot{self.bot_token}/{path}"
        try:
            if self._client is not None:
                response = await self._client.post(url, json=payload, timeout=20.0)
            else:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise EitaaGatewayError("Eitaa gateway returned an invalid response.")
            if data.get("ok") is False:
                logger.error("Eitaa gateway error response_data=%s", data)
                raise EitaaGatewayError("Eitaa gateway rejected the request.")
            result = data.get("result")
            message_id = result.get("message_id") if isinstance(result, dict) else None
            return EitaaSendResult(message_id=message_id, raw_response=data)
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip()[:200] or str(exc)
            raise EitaaGatewayError(f"Eitaa HTTP request failed: {detail}") from exc
        except httpx.RequestError as exc:
            raise EitaaGatewayError("Could not connect to the Eitaa gateway.") from exc
        except ValueError as exc:
            raise EitaaGatewayError("Eitaa gateway returned a non-JSON response.") from exc

    async def send_message(self, *, chat_id: str, text: str) -> EitaaSendResult:
        """Post a new text message to the channel."""
        return await self._post("sendMessage", {"chat_id": chat_id, "text": text})

    async def edit_message(self, *, chat_id: str, message_id: int, text: str) -> EitaaSendResult:
        """Replace the text of a previously posted message."""
        return await self._post(
            "editMessageText",
            {"chat_id": chat_id, "message_id": message_id, "text": text},
        )


def get_eitaa_client() -> EitaaChannelClient:
    """Return a channel client built from the configured Eitaa settings."""
    return EitaaChannelClient(
        base_url=settings.eitaa_api_base_url,
        bot_token=settings.eitaa_bot_token.get_secret_value(),
    )


def seconds_until_next_daily_post(now: datetime | None = None) -> float:
    """Seconds to sleep until the next 07:00 Asia/Tehran posting window.

    ``now`` must already be Iran-local (as ``now_iran()`` returns). Exactly
    07:00:00 counts as already passed so restarts never double-post.
    """
    current = now if now is not None else now_iran()
    target = current.replace(hour=EITAA_DAILY_POST_HOUR, minute=0, second=0, microsecond=0)
    if target <= current:
        target += timedelta(days=1)
    return max(1.0, (target - current).total_seconds())


def vendor_page_url(vendor_id: int) -> str:
    """Absolute site URL of a vendor's public page (empty when no base URL is known)."""
    base = settings.frontend_base_url
    return f"{base}/vendors/{vendor_id}" if base else ""


def _format_clock(local_dt: datetime) -> str:
    """«۱۸:۳۰» clock text — leading zero dropped for single-digit hours («۰۰:۳۰» keeps it)."""
    hour, minute = local_dt.strftime("%H:%M").split(":")
    if hour.startswith("0") and hour != "00":
        hour = hour[1:]
    return to_persian_digits(f"{hour}:{minute}")


def _format_day_line(local_date: date) -> str:
    """«پنجشنبه ۱۴۰۵/۶/۲۶» — weekday + unpadded Jalali date in Persian digits."""
    jdate = jdatetime.date.fromgregorian(date=local_date)
    date_text = f"{jdate.year}/{jdate.month}/{jdate.day}"
    return to_persian_digits(f"{PERSIAN_WEEKDAYS[jdate.weekday()]} {date_text}")


def _sport_line(vendor: Vendor) -> str | None:
    labels = [
        _SPORT_LABELS[sport]
        for sport in (getattr(s, "value", s) for s in (vendor.sport_types or []))
        if sport in _SPORT_LABELS
    ]
    return " و ".join(dict.fromkeys(labels)) or None


def render_empty_slots_message(
    vendor: Vendor,
    slots: list[TimeSlot],
    *,
    days: list[date],
    vendor_url: str = "",
) -> str:
    """Render the channel message for one vendor's open slots across the given Iran-local days."""
    lines: list[str] = [_HEADER]
    sport = _sport_line(vendor)
    if sport:
        lines.append(sport)
    lines.append(vendor.name)

    for day in days:
        day_slots = sorted(
            (slot for slot in slots if slot_operational_day(utc_to_iran(slot.start_time)) == day),
            key=lambda slot: slot.start_time,
        )
        if not day_slots:
            continue
        lines.append("")
        lines.append(_format_day_line(day))
        for slot in day_slots:
            start = _format_clock(utc_to_iran(slot.start_time))
            end = _format_clock(utc_to_iran(slot.end_time))
            lines.append(f"🔸{start} تا {end}")

    lines.append("")
    lines.append(_RESERVATION_NOTE)
    if vendor_url:
        lines.append(vendor_url)
    lines.append("")
    lines.append(_SEPARATOR_LINE)
    lines.append(f"آدرس: {vendor.address}")
    return "\n".join(lines)


async def _open_slots_by_vendor(
    db: AsyncSession, start_from: datetime, start_until: datetime
) -> dict[int, tuple[Vendor, list[TimeSlot]]]:
    """Open slots in the window, grouped per vendor (vendor preloaded)."""
    repo = TimeSlotRepo(db)
    slots = await repo.list_open_between(start_from=start_from, start_until=start_until)

    slots_by_vendor: dict[int, tuple[Vendor, list[TimeSlot]]] = {}
    for slot in slots:
        vendor_slots = slots_by_vendor.setdefault(slot.vendor_id, (slot.vendor, []))
        vendor_slots[1].append(slot)
    return slots_by_vendor


async def collect_daily_empty_slot_messages(
    db: AsyncSession, *, now: datetime | None = None
) -> list[tuple[Vendor, str]]:
    """Group each active vendor's open slots for the next days into channel messages."""
    current = now or now_utc()
    today = utc_to_iran(current).date()
    days = [today + timedelta(days=offset) for offset in range(EITAA_DIGEST_DAYS)]
    # include the night tail: 00:00-03:00 of day+EITAA_DIGEST_DAYS belongs to
    # the last day's operational day, so the digest's final section stays complete
    window_end = iran_to_utc(datetime.combine(days[-1] + timedelta(days=1), SLOT_DAY_CUTOFF))

    slots_by_vendor = await _open_slots_by_vendor(db, current, window_end)

    messages: list[tuple[Vendor, str]] = []
    for vendor_id in sorted(slots_by_vendor):
        vendor, vendor_slots = slots_by_vendor[vendor_id]
        messages.append(
            (
                vendor,
                render_empty_slots_message(
                    vendor,
                    vendor_slots,
                    days=days,
                    vendor_url=vendor_page_url(vendor_id),
                ),
            )
        )
    return messages


async def digest_posted_today(db: AsyncSession, *, now: datetime | None = None) -> bool:
    """Whether any vendor's digest was already posted for today (Iran-local)."""
    current = now or now_utc()
    today = utc_to_iran(current).date()
    return bool(await EitaaDigestRepo(db).list_by_date(today))


async def publish_daily_empty_slots(
    db: AsyncSession,
    *,
    now: datetime | None = None,
    client: EitaaChannelClient | None = None,
) -> int:
    """Post the daily digest — one message per vendor — and record it for later edits.

    Vendors that already have a digest row for today are skipped, so a catch-up
    run after a partially failed attempt (or an app restart) never duplicates
    channel messages.
    """
    messages = await collect_daily_empty_slot_messages(db, now=now)
    if not messages:
        logger.info("Eitaa daily digest skipped — no vendor has open slots for today/tomorrow")
        return 0

    sender = client if client is not None else get_eitaa_client()
    chat_id = settings.eitaa_channel_id
    digest_date = utc_to_iran(now or now_utc()).date()
    repo = EitaaDigestRepo(db)
    sent = 0
    for vendor, text in messages:
        if await repo.get_by_vendor_and_date(vendor.id, digest_date) is not None:
            logger.info("Eitaa daily digest already posted vendor_id=%s — skipped", vendor.id)
            continue
        result = await sender.send_message(chat_id=chat_id, text=text)
        sent += 1
        logger.info(
            "Eitaa daily digest posted vendor_id=%s message_id=%s", vendor.id, result.message_id
        )
        if result.message_id is None:
            logger.warning(
                "Eitaa gateway returned no message_id for vendor_id=%s — digest not editable",
                vendor.id,
            )
        else:
            await repo.upsert(
                vendor_id=vendor.id,
                digest_date=digest_date,
                chat_id=chat_id,
                message_id=int(result.message_id),
                text=text,
            )
        if sent < len(messages):
            await asyncio.sleep(SEND_INTERVAL_SECONDS)
    await db.commit()
    return sent


async def refresh_vendor_digest(
    db: AsyncSession,
    vendor_id: int,
    *,
    now: datetime | None = None,
    client: EitaaChannelClient | None = None,
) -> bool:
    """Edit this vendor's posted digest messages so they match the live slot state.

    Each message spans ``EITAA_DIGEST_DAYS`` days, so the last that many rows
    still list bookable slots and a booking must drop from all of them. Today's
    row re-renders from *now* (already-started slots drop out); older rows keep
    their morning snapshot (anchored at their own 07:00 post time) so only
    booked slots disappear from them. Messages whose text is unchanged are left
    alone — no API call. Returns True when any channel message was edited.
    """
    current = now or now_utc()
    today = utc_to_iran(current).date()
    repo = EitaaDigestRepo(db)
    vendor_result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = vendor_result.scalar_one_or_none()
    if vendor is None:
        return False  # vendor deleted — its digest rows are cascaded away; defensive only

    sender = client if client is not None else get_eitaa_client()
    edited = False
    for age in range(EITAA_DIGEST_DAYS):
        digest_date = today - timedelta(days=age)
        row = await repo.get_by_vendor_and_date(vendor_id, digest_date)
        if row is None:
            continue
        days = [digest_date + timedelta(days=offset) for offset in range(EITAA_DIGEST_DAYS)]
        # include the night tail: 00:00-03:00 past the last day belongs to its
        # operational tail, so the digest sections stay complete
        window_end = iran_to_utc(datetime.combine(days[-1] + timedelta(days=1), SLOT_DAY_CUTOFF))
        window_start = (
            current
            if age == 0
            else iran_to_utc(datetime.combine(digest_date, time(EITAA_DAILY_POST_HOUR)))
        )
        _, vendor_slots = (await _open_slots_by_vendor(db, window_start, window_end)).get(
            vendor_id, (None, [])
        )
        text = render_empty_slots_message(
            vendor,
            list(vendor_slots),
            days=days,
            vendor_url=vendor_page_url(vendor_id),
        )
        if text == row.text:
            continue

        await sender.edit_message(chat_id=row.chat_id, message_id=row.message_id, text=text)
        await repo.set_text(row, text)
        logger.info("Eitaa digest refreshed vendor_id=%s message_id=%s", vendor_id, row.message_id)
        edited = True
    return edited


async def sync_digest_after_payment(
    db: AsyncSession,
    vendor_id: int,
    *,
    client: EitaaChannelClient | None = None,
) -> None:
    """Edit the vendor's channel digest right after a paid booking finalizes.

    Best-effort by design: a failed channel edit must never break or roll back
    a completed payment. The trailing commit persists both the updated digest
    row and any pending finalization writes of the caller's transaction.
    """
    if not settings.eitaa_configured:
        return
    try:
        await refresh_vendor_digest(db, vendor_id, client=client)
        await db.commit()
    except Exception:
        logger.exception("Eitaa digest sync after payment failed (vendor_id=%s)", vendor_id)
