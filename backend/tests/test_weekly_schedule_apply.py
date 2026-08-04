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


async def test_without_future_online_booking_allows_starting_tomorrow(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    today = now_iran().date()
    response = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=_payload(today),
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "schedule_before_last_online_booking"
    assert detail["minimum_date"] == (today + timedelta(days=1)).isoformat()
    assert detail["last_online_booking_date"] is None

    template = await client.get(
        f"/api/v1/vendors/{vendor_id}/slots/weekly-schedule-template",
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert template.status_code == 200, template.text
    assert template.json()["minimum_effective_date"] == (today + timedelta(days=1)).isoformat()


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


async def test_schedule_editor_does_not_change_vendor_ball_settings(
    client: AsyncClient, session: AsyncSession, manager_token: dict
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
    configured = await client.patch(
        f"/api/v1/vendors/{vendor_id}",
        json={"ball_available": True, "ball_price": 75_000},
        headers=headers,
    )
    assert configured.status_code == 200, configured.text
    payload = _payload(effective)
    # Stale clients may still send these old schedule fields. They must not
    # overwrite configuration owned by the vendor details form.
    payload.update({"ball_available": False, "ball_price": 0})

    applied = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=payload,
        headers=headers,
    )
    assert applied.status_code == 200, applied.text

    template = await client.get(
        f"/api/v1/vendors/{vendor_id}/slots/weekly-schedule-template",
        headers=headers,
    )
    assert template.status_code == 200
    assert template.json()["ball_available"] is True
    assert Decimal(template.json()["ball_price"]) == Decimal("75000")
    row = (
        await session.execute(
            text("SELECT ball_available, ball_price FROM vendors WHERE id = :id"),
            {"id": vendor_id},
        )
    ).one()
    assert row.ball_available is True
    assert Decimal(row.ball_price) == Decimal("75000")


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
    client: AsyncClient, session: AsyncSession, manager_token: dict
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
                (user_id, slot_id, status, source, settlement_status,
                 created_by_manager_id, price_paid, slot_price, ball_price,
                 with_ball)
            VALUES (:manager_id, :slot_id, 'confirmed', 'manager_manual',
                    'excluded_due_to_cancellation', :manager_id,
                    0, 100000, 0, false)
            """
        ),
        {"manager_id": manager_token["user"]["id"], "slot_id": slot_id},
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


async def test_schedule_must_start_after_latest_online_booking(
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
                 slot_price, ball_price, with_ball)
            VALUES (:user_id, :slot_id, 'confirmed', 'online', 'not_settled',
                    100000, 100000, 0, false)
            """
        ),
        {"user_id": user_token["user"]["id"], "slot_id": slot_id},
    )
    await session.flush()

    template = await client.get(
        f"/api/v1/vendors/{vendor_id}/slots/weekly-schedule-template",
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert template.status_code == 200, template.text
    assert template.json()["last_online_booking_date"] == effective.isoformat()
    assert template.json()["minimum_effective_date"] == (effective + timedelta(days=1)).isoformat()

    removal_payload = _payload(
        effective,
        items=[
            {
                "day_of_week": _persian_weekday(effective),
                "start_time": "14:00",
                "end_time": "16:00",
                "base_price": 120_000,
            }
        ],
    )
    removal_payload["confirm_manager_booking_deletions"] = True
    response = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=removal_payload,
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "schedule_before_last_online_booking"
    assert detail["last_online_booking_date"] == effective.isoformat()
    assert detail["minimum_date"] == (effective + timedelta(days=1)).isoformat()
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


async def test_manager_owned_reservation_requires_confirmation_then_is_deleted(
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
                 price_paid, slot_price, ball_price, with_ball)
            VALUES (:manager_id, :slot_id, 'confirmed', 'manager_manual',
                    'excluded_due_to_cancellation', :manager_id, 0, 150000, 0, false)
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
    detail = response.json()["detail"]
    assert detail["code"] == "manager_booking_deletion_confirmation_required"
    assert detail["manager_booking_count"] == 1
    conflict = detail["conflicts"][0]
    assert conflict["booking_source"] == "manager_manual"
    assert "تأیید" in conflict["reason"]
    assert (
        await session.scalar(
            text("SELECT count(*) FROM time_slots WHERE id = :id"), {"id": slot_id}
        )
        == 1
    )

    confirmed_payload = _payload(effective, items=[])
    confirmed_payload["confirm_manager_booking_deletions"] = True
    confirmed = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=confirmed_payload,
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )

    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["deleted"] == 1
    assert confirmed.json()["deleted_manager_reservations"] == 1
    assert (
        await session.scalar(
            text("SELECT count(*) FROM time_slots WHERE id = :id"), {"id": slot_id}
        )
        == 0
    )
    assert (
        await session.scalar(
            text("SELECT count(*) FROM bookings WHERE id = :id"), {"id": conflict["booking_id"]}
        )
        == 0
    )


@pytest.mark.parametrize("duration_months", [1, 3, 6, 12])
async def test_accepts_all_supported_schedule_durations(
    client: AsyncClient,
    session: AsyncSession,
    manager_token: dict,
    duration_months: int,
) -> None:
    vendor_id = await _vendor(client, session, manager_token)
    effective = now_iran().date() + timedelta(days=14)
    payload = _payload(effective)
    payload["duration_months"] = duration_months

    response = await client.post(
        f"/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule",
        json=payload,
        headers={"Authorization": f"Bearer {manager_token['access_token']}"},
    )

    assert response.status_code == 200, response.text
