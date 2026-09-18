"""Unit + integration tests for the Eitaa daily empty-slots digest."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from decimal import Decimal

import httpx
import jdatetime
import pytest
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.timezone import IRAN_TZ, iran_to_utc, now_iran
from app.models.time_slot import SlotStatus, TimeSlot
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.services.eitaa_service import (
    EITAA_DAILY_POST_HOUR,
    EitaaChannelClient,
    EitaaGatewayError,
    EitaaSendResult,
    publish_daily_empty_slots,
    refresh_vendor_digest,
    render_empty_slots_message,
    seconds_until_next_daily_post,
    sync_digest_after_payment,
    vendor_page_url,
)
from app.services.notification_service import PERSIAN_WEEKDAYS, to_persian_digits

pytestmark = [pytest.mark.asyncio]


def _iran(day, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=IRAN_TZ)


def _slot(vendor_id: int, start_iran: datetime, *, reserved: bool = False) -> TimeSlot:
    start_utc = iran_to_utc(start_iran)
    return TimeSlot(
        vendor_id=vendor_id,
        start_time=start_utc,
        end_time=start_utc + timedelta(hours=1, minutes=30),
        base_price=Decimal("100000"),
        is_reserved=reserved,
        status=SlotStatus.RESERVED if reserved else SlotStatus.OPEN,
    )


def _jalali_day_line(day) -> str:
    jdate = jdatetime.date.fromgregorian(date=day)
    return to_persian_digits(
        f"{PERSIAN_WEEKDAYS[jdate.weekday()]} {jdate.year}/{jdate.month}/{jdate.day}"
    )


# ── Message rendering ────────────────────────────────────────────────────────


async def test_render_message_groups_days_with_persian_digits() -> None:
    today = now_iran().date()
    tomorrow = today + timedelta(days=1)
    vendor = Vendor(
        id=7,
        name="بوستان شهید زین الدین",
        address="بنیاد، فلکه جوان، خیابان ذوالفقار، بوستان طبقاتی شهید زین‌الدین",
        sport_types=["football"],
    )
    slots = [
        _slot(7, _iran(today, 18, 30)),
        _slot(7, _iran(tomorrow, 5, 30)),
        _slot(7, _iran(tomorrow, 7, 0)),
        _slot(7, _iran(today, 23, 0)),
    ]
    # Deliberately unsorted input — the renderer must sort within each day.
    slots = list(reversed(slots))

    text = render_empty_slots_message(
        vendor, slots, days=[today, tomorrow], vendor_url="https://toopset.ir/vendors/7"
    )

    assert text == "\n".join(
        [
            "📣 برنامه سانس ها ⚽️",
            "🥅 زمین چمن",
            "بوستان شهید زین الدین",
            "",
            _jalali_day_line(today),
            "🔸۱۸:۳۰ تا ۲۰:۰۰",
            "🔸۲۳:۰۰ تا ۰۰:۳۰",
            "",
            _jalali_day_line(tomorrow),
            "🔸۵:۳۰ تا ۷:۰۰",
            "🔸۷:۰۰ تا ۸:۳۰",
            "",
            "🔰 جهت رزرو سانس داخل سایت توپست میتوانید رزرو بکنید",
            "https://toopset.ir/vendors/7",
            "",
            "ـ" * 40,
            "آدرس: بنیاد، فلکه جوان، خیابان ذوالفقار، بوستان طبقاتی شهید زین‌الدین",
        ]
    )


async def test_render_message_skips_days_without_slots_and_unknown_sports() -> None:
    today = now_iran().date()
    tomorrow = today + timedelta(days=1)
    vendor = Vendor(id=2, name="سالن تختی", address="قم، بلوار امین", sport_types=[])
    # A slot outside the requested days must be ignored entirely.
    slots = [_slot(2, _iran(tomorrow + timedelta(days=2), 10, 0)), _slot(2, _iran(tomorrow, 22, 0))]

    text = render_empty_slots_message(vendor, slots, days=[today, tomorrow], vendor_url="")

    assert _jalali_day_line(today) not in text
    assert _jalali_day_line(tomorrow) in text
    assert "🔸۲۲:۰۰ تا ۲۳:۳۰" in text
    # No sport label line and no vendor URL line.
    assert "زمین چمن" not in text
    assert text.splitlines()[1] == "سالن تختی"
    assert "/vendors/" not in text


# ── Gateway client ───────────────────────────────────────────────────────────


async def test_client_posts_telegram_compatible_payload() -> None:
    captured: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured
        captured = request
        return httpx.Response(200, json={"ok": True, "result": {"message_id": 4242}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = EitaaChannelClient(
            base_url="https://api.uniom.ir/", bot_token="tok-123", client=http
        )
        result = await client.send_message(chat_id="@toopset", text="سلام کانال")

    assert captured is not None
    assert captured.method == "POST"
    assert str(captured.url) == "https://api.uniom.ir/bottok-123/sendMessage"
    import json

    assert json.loads(captured.read()) == {"chat_id": "@toopset", "text": "سلام کانال"}
    assert result.message_id == 4242
    assert result.raw_response["ok"] is True


async def test_client_raises_when_gateway_rejects_the_message() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"ok": False, "error_code": 403, "description": "forbidden"}
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = EitaaChannelClient(base_url="https://api.uniom.ir", bot_token="tok", client=http)
        with pytest.raises(EitaaGatewayError, match="rejected"):
            await client.send_message(chat_id="@chan", text="x")


async def test_client_raises_on_http_and_network_errors() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(502, text="bad gateway")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = EitaaChannelClient(base_url="https://api.uniom.ir", bot_token="tok", client=http)
        with pytest.raises(EitaaGatewayError, match="HTTP request failed"):
            await client.send_message(chat_id="@chan", text="x")


# ── Scheduling ───────────────────────────────────────────────────────────────


async def test_seconds_until_next_daily_post_targets_seven_am_iran() -> None:
    before = now_iran().replace(hour=6, minute=59, second=0, microsecond=0)
    assert seconds_until_next_daily_post(before) == 60.0

    at_seven = before.replace(hour=EITAA_DAILY_POST_HOUR, minute=0)
    # Exactly 07:00 counts as passed → next window is tomorrow.
    assert seconds_until_next_daily_post(at_seven) == pytest.approx(24 * 3600, abs=1)

    evening = before.replace(hour=21, minute=30)
    expected = (at_seven + timedelta(days=1) - evening).total_seconds()
    assert seconds_until_next_daily_post(evening) == pytest.approx(expected, abs=1)


# ── End-to-end collect + publish (real DB session, fake sender) ─────────────


async def test_publish_posts_one_message_per_vendor_with_only_open_future_slots(
    session: AsyncSession,
) -> None:
    manager = User(
        full_name="مدیر تست", phone="09900000009", password_hash="x", role=UserRole.MANAGER
    )
    session.add(manager)
    await session.flush()

    today = now_iran().date()
    tomorrow = today + timedelta(days=1)
    now = datetime.combine(today, time(EITAA_DAILY_POST_HOUR, 0), tzinfo=IRAN_TZ)

    active = Vendor(
        manager_id=manager.id,
        name="چمن زین الدین",
        address="قم، بنیاد",
        latitude=34.6,
        longitude=50.8,
        capacity=12,
        sport_types=["football"],
        is_active=True,
    )
    inactive = Vendor(
        manager_id=manager.id,
        name="سالن تعطیل",
        address="قم",
        latitude=34.6,
        longitude=50.8,
        capacity=10,
        sport_types=["futsal"],
        is_active=False,
    )
    session.add_all([active, inactive])
    await session.flush()

    session.add_all(
        [
            _slot(active.id, _iran(today, 18, 30)),  # today, still future at 07:00 → in
            _slot(active.id, _iran(today, 5, 30)),  # today, already passed → out
            _slot(active.id, _iran(tomorrow, 5, 30)),  # tomorrow → in
            _slot(active.id, _iran(tomorrow, 7, 0), reserved=True),  # reserved → out
            _slot(inactive.id, _iran(tomorrow, 8, 0)),  # inactive vendor → out
        ]
    )
    await session.flush()

    sent: list[str] = []

    class FakeSender:
        async def send_message(self, *, chat_id: str, text: str) -> EitaaSendResult:
            sent.append(text)
            return EitaaSendResult(message_id=len(sent), raw_response={})

    count = await publish_daily_empty_slots(session, now=iran_to_utc(now), client=FakeSender())

    assert count == 1
    assert len(sent) == 1
    text = sent[0]
    assert "🔸۱۸:۳۰ تا ۲۰:۰۰" in text
    assert "🔸۵:۳۰ تا ۷:۰۰" in text
    assert "🔸۷:۰۰" not in text  # reserved slot excluded
    assert "سالن تعطیل" not in text  # inactive vendor excluded
    assert f"/vendors/{active.id}" in text  # links back to the site
    assert text.count("📣 برنامه سانس ها ⚽️") == 1


async def test_publish_skips_channel_call_when_no_open_slots(session: AsyncSession) -> None:
    class ExplodingSender:
        async def send_message(
            self, *, chat_id: str, text: str
        ) -> EitaaSendResult:  # pragma: no cover
            raise AssertionError("no message should be sent when there are no open slots")

    count = await publish_daily_empty_slots(session, now=now_iran(), client=ExplodingSender())
    assert count == 0


# ── Settings wiring ──────────────────────────────────────────────────────────


async def test_eitaa_configured_requires_both_credentials() -> None:
    assert settings.eitaa_configured is False
    try:
        settings.eitaa_bot_token = SecretStr("token")
        assert settings.eitaa_configured is False
        settings.eitaa_channel_id = "@chan"
        assert settings.eitaa_configured is True
    finally:
        settings.eitaa_bot_token = SecretStr("")
        settings.eitaa_channel_id = ""


# ── Message editing (refresh loop) ───────────────────────────────────────────


async def test_client_edits_previously_sent_message() -> None:
    captured: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured
        captured = request
        return httpx.Response(200, json={"ok": True, "result": {"message_id": 55}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = EitaaChannelClient(base_url="https://api.uniom.ir", bot_token="tok", client=http)
        result = await client.edit_message(chat_id="@toopset", message_id=55, text="متن جدید")

    assert captured is not None
    assert str(captured.url) == "https://api.uniom.ir/bottok/editMessageText"
    import json

    assert json.loads(captured.read()) == {
        "chat_id": "@toopset",
        "message_id": 55,
        "text": "متن جدید",
    }
    assert result.message_id == 55


async def test_publish_persists_posted_messages_for_later_edits(
    session: AsyncSession,
) -> None:
    from sqlalchemy import select as sa_select

    from app.models.eitaa_digest import EitaaDigestMessage

    manager = User(
        full_name="مدیر تست", phone="09900000010", password_hash="x", role=UserRole.MANAGER
    )
    session.add(manager)
    await session.flush()

    today = now_iran().date()
    tomorrow = today + timedelta(days=1)
    now = datetime.combine(today, time(EITAA_DAILY_POST_HOUR, 0), tzinfo=IRAN_TZ)
    vendor = Vendor(
        manager_id=manager.id,
        name="چمن ادیت",
        address="قم",
        latitude=34.6,
        longitude=50.8,
        capacity=10,
        sport_types=["football"],
    )
    session.add(vendor)
    await session.flush()
    session.add(_slot(vendor.id, _iran(tomorrow, 9, 0)))
    await session.flush()

    class FakeSender:
        async def send_message(self, *, chat_id: str, text: str) -> EitaaSendResult:
            return EitaaSendResult(message_id=777, raw_response={})

    count = await publish_daily_empty_slots(session, now=iran_to_utc(now), client=FakeSender())
    assert count == 1

    rows = (await session.execute(sa_select(EitaaDigestMessage))).scalars().all()
    assert len(rows) == 1
    row = rows[0]
    assert row.vendor_id == vendor.id
    assert row.digest_date == today
    assert row.message_id == 777
    assert row.chat_id == settings.eitaa_channel_id
    assert "🔸۹:۰۰ تا ۱۰:۳۰" in row.text


async def test_refresh_vendor_digest_edits_message_when_a_slot_gets_booked(
    session: AsyncSession,
) -> None:
    from sqlalchemy import select as sa_select

    from app.models.eitaa_digest import EitaaDigestMessage
    from app.repositories.eitaa_digest_repo import EitaaDigestRepo

    manager = User(
        full_name="مدیر تست", phone="09900000011", password_hash="x", role=UserRole.MANAGER
    )
    session.add(manager)
    await session.flush()

    today = now_iran().date()
    tomorrow = today + timedelta(days=1)
    now = datetime.combine(today, time(20, 0), tzinfo=IRAN_TZ)  # evening booking
    vendor = Vendor(
        manager_id=manager.id,
        name="چمن رزروشده",
        address="قم",
        latitude=34.6,
        longitude=50.8,
        capacity=10,
        sport_types=["football"],
    )
    session.add(vendor)
    await session.flush()
    morning_slot = _slot(vendor.id, _iran(tomorrow, 9, 0))  # stays open
    booked_slot = _slot(vendor.id, _iran(tomorrow, 11, 0))  # will be booked after posting
    session.add_all([morning_slot, booked_slot])
    await session.flush()

    # Simulate the 07:00 post: message text shows both slots.
    posted_text = render_empty_slots_message(
        vendor,
        [morning_slot, booked_slot],
        days=[today, tomorrow],
        vendor_url=vendor_page_url(vendor.id),
    )
    repo = EitaaDigestRepo(session)
    await repo.upsert(
        vendor_id=vendor.id,
        digest_date=today,
        chat_id="@toopset",
        message_id=3131,
        text=posted_text,
    )
    await session.flush()

    # The 11:00 slot gets booked → no longer open.
    booked_slot.is_reserved = True
    booked_slot.status = SlotStatus.RESERVED
    await session.flush()

    edits: list[tuple[int, str]] = []

    class FakeEditor:
        async def edit_message(
            self, *, chat_id: str, message_id: int, text: str
        ) -> EitaaSendResult:
            edits.append((message_id, text))
            return EitaaSendResult(message_id=message_id, raw_response={})

    edited = await refresh_vendor_digest(
        session, vendor.id, now=iran_to_utc(now), client=FakeEditor()
    )
    assert edited is True
    assert len(edits) == 1
    message_id, new_text = edits[0]
    assert message_id == 3131
    assert "🔸۹:۰۰" in new_text
    assert "🔸۱۱:۰۰" not in new_text  # booked slot dropped from the channel message

    row = (
        await session.execute(
            sa_select(EitaaDigestMessage).where(EitaaDigestMessage.vendor_id == vendor.id)
        )
    ).scalar_one()
    assert row.text == new_text

    # Second sync with no state change → no API call, returns False.
    again = await refresh_vendor_digest(
        session, vendor.id, now=iran_to_utc(now), client=FakeEditor()
    )
    assert again is False
    assert len(edits) == 1


async def test_refresh_vendor_digest_ignores_other_days_and_missing_rows(
    session: AsyncSession,
) -> None:
    from datetime import timedelta as _td

    from app.models.eitaa_digest import EitaaDigestMessage

    manager = User(
        full_name="مدیر تست", phone="09900000012", password_hash="x", role=UserRole.MANAGER
    )
    session.add(manager)
    await session.flush()
    vendor = Vendor(
        manager_id=manager.id,
        name="سالن دیروز",
        address="قم",
        latitude=34.6,
        longitude=50.8,
        capacity=10,
        sport_types=["futsal"],
    )
    session.add(vendor)
    await session.flush()

    yesterday = now_iran().date() - _td(days=1)
    session.add(
        EitaaDigestMessage(
            vendor_id=vendor.id,
            digest_date=yesterday,
            chat_id="@toopset",
            message_id=99,
            text="old",
        )
    )
    await session.flush()

    class ExplodingEditor:
        async def edit_message(
            self, *, chat_id: str, message_id: int, text: str
        ) -> EitaaSendResult:  # pragma: no cover
            raise AssertionError("must not edit other days' or missing digests")

    # Yesterday's row for this vendor → no today-message → nothing to edit.
    assert (
        await refresh_vendor_digest(session, vendor.id, now=now_iran(), client=ExplodingEditor())
        is False
    )
    # A vendor with no digest row at all → nothing to edit.
    assert await refresh_vendor_digest(session, vendor.id + 1000, client=ExplodingEditor()) is False


async def test_sync_digest_after_payment_is_noop_without_configuration(
    session: AsyncSession,
) -> None:
    # conftest keeps the Eitaa credentials empty → the sync must do nothing,
    # not even construct an edit request.
    class ExplodingEditor(EitaaChannelClient):
        def __init__(self) -> None:  # pragma: no cover
            super().__init__(base_url="https://x", bot_token="y")

        async def edit_message(
            self, *, chat_id: str, message_id: int, text: str
        ) -> EitaaSendResult:  # pragma: no cover
            raise AssertionError("no edit may happen when Eitaa is not configured")

    await sync_digest_after_payment(session, 1, client=ExplodingEditor())
