"""Manually post the Eitaa empty-slots digest for the next days.

Runs exactly the same code path as the 07:00 Iran-time background job —
useful for verifying EITAA_* credentials without waiting for the schedule:

    cd backend && uv run python -m scripts.post_eitaa_digest
"""

import asyncio

from app.core.config import settings
from app.core.database import async_session_factory
from app.services.eitaa_service import publish_daily_empty_slots


async def main() -> int:
    if not settings.eitaa_configured:
        print("Eitaa digest is not configured — set EITAA_BOT_TOKEN and EITAA_CHANNEL_ID.")
        return 1

    async with async_session_factory() as db:
        sent = await publish_daily_empty_slots(db)
    print(f"Posted {sent} message(s) to channel {settings.eitaa_channel_id}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
