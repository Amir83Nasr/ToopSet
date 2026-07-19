from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import iran_to_utc, now_iran

pytestmark = pytest.mark.asyncio


async def _vendor(client: AsyncClient, session: AsyncSession, manager_token: dict) -> int:
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    response = await client.post(
        "/api/v1/vendors",
        json={
            "name": "برنامه هفتگی تست",
            "sport_types": ["futsal"],
            "address": "تهران",
            "latitude": 35.7,
            "longitude": 51.4,
            "capacity": 10,
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    vendor_id = response.json()["id"]
    await session.execute(
        text("UPDATE vendors SET is_active = true WHERE id = :id"), {"id": vendor_id}
    )
    await session.flush()
    return vendor_id


def _persian_weekday(value) -> int:
    return [5, 6, 0, 1, 2, 3, 4].index(value.weekday())


def _next_complete_week_start(value):
    days_until_saturday = (5 - value.weekday()) % 7
    return value + timedelta(days=days_until_saturday or 7)


def _payload(effective_from, *, price: int = 100_000, items=None) -> dict:
    return {
        "effective_from": effective_from.isoformat(),
        "duration_months": 6,
        "items": items
        if items is not None
        else [
            {
                "day_of_week": _persian_weekday(effective_from),
                "start_time": "10:00",
                "end_time": "12:00",
                "base_price": price,
            }
        ],
    }


async def test_rejects_effective_date_before_fourteen_days(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    response = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(now_iran().date() + timedelta(days=13)),
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert response.status_code == 422
    assert "۱۴ روز" in response.text


async def test_template_bootstraps_from_next_complete_week_not_current_partial_week(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    next_week_start = _next_complete_week_start(now_iran().date())
    monday = next_week_start + timedelta(days=2)
    start = iran_to_utc(datetime.combine(monday, datetime.strptime("18:00", "%H:%M").time()))
    end = iran_to_utc(datetime.combine(monday, datetime.strptime("20:00", "%H:%M").time()))
    await session.execute(
        text(
            """
            INSERT INTO time_slots
                (vendor_id, start_time, end_time, base_price, is_reserved, status, version)
            VALUES (:vendor_id, :start, :end, 140000, false, 'open', 1)
            """
        ),
        {"vendor_id": vendor_id, "start": start, "end": end},
    )
    await session.flush()

    response = await client.get(
        f"/api/v1/vendors/{vendor_id}/slots/weekly-schedule-template",
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["source"] == "upcoming_week"
    assert response.json()["version_id"] is None
    assert response.json()["items"] == [
        {
            "day_of_week": 2,
            "start_time": "18:00",
            "end_time": "20:00",
            "base_price": "140000.00",
            "gender": "male",
        }
    ]


async def test_template_uses_latest_saved_version_after_apply(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    applied = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(effective, price=185_000),
        headers=headers,
    )
    assert applied.status_code == 200, applied.text

    response = await client.get(
        f"/api/v1/vendors/{vendor_id}/slots/weekly-schedule-template",
        headers=headers,
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["source"] == "saved_version"
    assert data["version_id"] is not None
    assert data["effective_from"] == effective.isoformat()
    assert Decimal(data["items"][0]["base_price"]) == Decimal("185000")
    assert (
        await session.scalar(
            text("SELECT count(*) FROM weekly_schedule_versions WHERE vendor_id = :id"),
            {"id": vendor_id},
        )
        == 1
    )


async def test_creates_weekly_slots_for_six_months_without_duplicates(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    first = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(effective),
        headers=headers,
    )
    assert first.status_code == 200, first.text
    assert 25 <= first.json()["created"] <= 27
    second = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(effective),
        headers=headers,
    )
    assert second.status_code == 200, second.text
    assert second.json()["created"] == 0
    assert second.json()["deleted"] == 0
    assert second.json()["updated"] == 0


async def test_updates_unreserved_prices_and_preserves_slot_ids(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(effective),
        headers=headers,
    )
    before = (
        await session.execute(
            text(
                "SELECT id FROM time_slots WHERE vendor_id = :vendor_id ORDER BY start_time LIMIT 1"
            ),
            {"vendor_id": vendor_id},
        )
    ).scalar_one()
    changed = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(effective, price=175_000),
        headers=headers,
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["updated"] >= 25
    row = (
        (
            await session.execute(
                text("SELECT id, base_price FROM time_slots WHERE id = :id"), {"id": before}
            )
        )
        .mappings()
        .one()
    )
    assert row["id"] == before
    assert float(row["base_price"]) == 175_000


async def test_reserved_exact_slot_is_preserved_when_price_changes(
    client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    start = iran_to_utc(datetime.combine(effective, datetime.strptime("10:00", "%H:%M").time()))
    end = iran_to_utc(datetime.combine(effective, datetime.strptime("12:00", "%H:%M").time()))
    slot_id = await session.scalar(
        text(
            """
            INSERT INTO time_slots
                (vendor_id, start_time, end_time, base_price, is_reserved, status, version)
            VALUES (:vendor_id, :start, :end, 100000, true, 'reserved', 1)
            RETURNING id
            """
        ),
        {"vendor_id": vendor_id, "start": start, "end": end},
    )
    await session.execute(
        text(
            """
            INSERT INTO bookings
                (user_id, slot_id, status, source, settlement_status, price_paid,
                 slot_price, ball_price, with_ball, participants_count)
            VALUES (:user_id, :slot_id, 'confirmed', 'online', 'not_settled',
                    100000, 100000, 0, false, 1)
            """
        ),
        {"user_id": user_token["user"]["id"], "slot_id": slot_id},
    )
    await session.flush()

    response = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(effective, price=200_000),
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["preserved_reserved"] == 1
    assert len(response.json()["conflicts"]) == 1
    price = await session.scalar(
        text("SELECT base_price FROM time_slots WHERE id = :id"), {"id": slot_id}
    )
    assert float(price) == 100_000


async def test_removing_reserved_slot_aborts_entire_schedule_transaction(
    client: AsyncClient, session: AsyncSession, manager_token: dict, user_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    start = iran_to_utc(datetime.combine(effective, datetime.strptime("10:00", "%H:%M").time()))
    end = iran_to_utc(datetime.combine(effective, datetime.strptime("12:00", "%H:%M").time()))
    slot_id = await session.scalar(
        text(
            """
            INSERT INTO time_slots
                (vendor_id, start_time, end_time, base_price, is_reserved, status, version)
            VALUES (:vendor_id, :start, :end, 100000, true, 'reserved', 1)
            RETURNING id
            """
        ),
        {"vendor_id": vendor_id, "start": start, "end": end},
    )
    await session.execute(
        text(
            """
            INSERT INTO bookings
                (user_id, slot_id, status, source, settlement_status, price_paid,
                 slot_price, ball_price, with_ball, participants_count)
            VALUES (:user_id, :slot_id, 'confirmed', 'online', 'not_settled',
                    100000, 100000, 0, false, 1)
            """
        ),
        {"user_id": user_token["user"]["id"], "slot_id": slot_id},
    )
    await session.flush()

    response = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(
            effective,
            items=[
                {
                    "day_of_week": _persian_weekday(effective),
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "base_price": 120_000,
                }
            ],
        ),
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["conflicts"][0]["slot_id"] == slot_id
    assert "رزرو" in detail["conflicts"][0]["reason"]
    assert (
        await session.scalar(
            text("SELECT count(*) FROM time_slots WHERE vendor_id = :id"), {"id": vendor_id}
        )
        == 1
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM weekly_schedule_versions WHERE vendor_id = :id"),
            {"id": vendor_id},
        )
        == 0
    )


async def test_manager_owned_reservation_must_be_cancelled_before_template_removal(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    start = iran_to_utc(datetime.combine(effective, datetime.strptime("18:00", "%H:%M").time()))
    end = iran_to_utc(datetime.combine(effective, datetime.strptime("20:00", "%H:%M").time()))
    slot_id = await session.scalar(
        text(
            """
            INSERT INTO time_slots
                (vendor_id, start_time, end_time, base_price, is_reserved, status, version)
            VALUES (:vendor_id, :start, :end, 150000, true, 'reserved', 1)
            RETURNING id
            """
        ),
        {"vendor_id": vendor_id, "start": start, "end": end},
    )
    await session.execute(
        text(
            """
            INSERT INTO bookings
                (user_id, slot_id, status, source, settlement_status, created_by_manager_id,
                 price_paid, slot_price, ball_price, with_ball, participants_count)
            VALUES (:manager_id, :slot_id, 'confirmed', 'manager_manual',
                    'excluded_due_to_cancellation', :manager_id, 0, 150000, 0, false, 1)
            """
        ),
        {"manager_id": manager_token["user"]["id"], "slot_id": slot_id},
    )
    await session.flush()

    response = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(effective, items=[]),
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert response.status_code == 409
    conflict = response.json()["detail"]["conflicts"][0]
    assert conflict["booking_source"] == "manager_manual"
    assert "ابتدا رزرو را لغو کنید" in conflict["reason"]
    assert (
        await session.scalar(
            text("SELECT count(*) FROM time_slots WHERE id = :id"), {"id": slot_id}
        )
        == 1
    )
