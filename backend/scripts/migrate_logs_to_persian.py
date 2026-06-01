"""
Update existing log entries from English format to Persian descriptive format.
Run from backend directory: python -m scripts.migrate_logs_to_persian
"""

import asyncio
import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# ── Map action → list of (old_regex, new_format) ──
RULES: dict[str, list[tuple[re.Pattern, str]]] = {
    "booking_created": [
        (
            re.compile(r"^Booking \(id=(\d+)\) for slot #(\d+)$"),
            r"ایجاد رزرو | رزرو \1 برای سانس \2",
        ),
    ],
    "booking_confirmed": [
        (
            re.compile(r"^Booking \(id=(\d+)\) paid and confirmed$"),
            r"تایید رزرو | رزرو \1 تایید و پرداخت شد",
        ),
    ],
    "booking_cancelled": [
        (
            re.compile(r"^Booking \(id=(\d+)\) cancelled, refund=(\d+)$"),
            r"لغو رزرو | رزرو \1 لغو شد (مبلغ \2 تومان)",
        ),
    ],
    "court_created": [
        (re.compile(r"^Court '(.+?)' \(id=(\d+)\) created$"), r"ایجاد مجموعه | \1 (id=\2)"),
    ],
    "court_updated": [
        (re.compile(r"^Court '(.+?)' \(id=(\d+)\) updated$"), r"ویرایش مجموعه | \1 (id=\2)"),
    ],
    "court_deleted": [
        (re.compile(r"^Court '(.+?)' \(id=(\d+)\) deleted$"), r"حذف مجموعه | \1 (id=\2)"),
    ],
    "court_toggled": [
        (
            re.compile(r"^Court '(.+?)' \(id=(\d+)\) activated$"),
            r"تغییر وضعیت مجموعه | \1 (id=\2) → فعال",
        ),
        (
            re.compile(r"^Court '(.+?)' \(id=(\d+)\) deactivated$"),
            r"تغییر وضعیت مجموعه | \1 (id=\2) → غیرفعال",
        ),
    ],
    "court_approved": [
        (
            re.compile(r"^Court '(.+?)' \(id=(\d+)\) approved$"),
            r"تایید مجموعه | \1 (id=\2) توسط ادمین تایید شد",
        ),
    ],
    "court_rejected": [
        (
            re.compile(r"^Court '(.+?)' \(id=(\d+)\) rejected$"),
            r"رد مجموعه | \1 (id=\2) توسط ادمین رد شد",
        ),
    ],
    "user_registered": [
        (
            re.compile(r"^User '(.+?)' \(phone: ([^)]+)\) registered$"),
            r"ثبت‌نام کاربر | \1 با شماره \2",
        ),
    ],
    "user_role_changed": [
        (re.compile(r"^User (\d+) role changed to (.+)$"), r"تغییر نقش کاربر | کاربر \1 به نقش \2"),
    ],
    "user_toggled": [
        (re.compile(r"^User (\d+) activated$"), r"تغییر وضعیت کاربر | کاربر \1 فعال شد"),
    ],
    "user_created": [
        (re.compile(r"^User '(.+?)' \(id=(\d+)\) role=(.+)$"), r"ایجاد کاربر | \1 (id=\2)"),
    ],
    "user_deleted": [
        (
            re.compile(r"^User \(id=(\d+)\) soft-deleted$"),
            r"حذف کاربر | کاربر (id=\1) توسط ادمین حذف شد",
        ),
    ],
    "review_deleted": [
        (re.compile(r"^Review \(id=(\d+)\) deleted$"), r"حذف نظر | نظر (id=\1) توسط ادمین حذف شد"),
    ],
    "broadcast": [
        (
            re.compile(r"^Broadcast notification sent to all users$"),
            r"اعلان همگانی | ارسال به همه کاربران",
        ),
    ],
    "setting_updated": [
        (re.compile(r"^Setting '(.+?)' updated$"), r"ویرایش تنظیمات | \1"),
    ],
}


async def main():
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(text("SELECT id, action, details FROM logs ORDER BY id"))
        rows = result.fetchall()

        updated = 0
        skipped = 0
        for row in rows:
            log_id, action, details = row
            if not details:
                skipped += 1
                continue

            rules = RULES.get(action)
            if not rules:
                skipped += 1
                continue

            new_details = details
            for pattern, fmt in rules:
                m = pattern.match(details)
                if m:
                    new_details = m.expand(fmt)
                    break

            if new_details != details:
                await db.execute(
                    text("UPDATE logs SET details = :details WHERE id = :id"),
                    {"details": new_details, "id": log_id},
                )
                updated += 1
                print(f"  ✅ [{action}] id={log_id}: {details[:50]}... → {new_details}")
            else:
                skipped += 1

        await db.commit()
        print(f"\n✅ Done! {updated} updated, {skipped} skipped")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
