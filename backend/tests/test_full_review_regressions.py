"""Regression tests for invariants found by the full business-logic review."""

from __future__ import annotations

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import EnvValidationError, Settings, validate_env
from app.core.database import engine
from app.core.logger import redact_audit_details


def test_audit_details_redact_full_phone_and_card_numbers() -> None:
    redacted = redact_audit_details("phone=09123456789 card=6037991234567890")

    assert redacted == "phone=09*****6789 card=603799******7890"
    assert "09123456789" not in redacted
    assert engine.sync_engine.hide_parameters is True


def test_production_validation_never_skips_mock_integrations() -> None:
    production = Settings(
        app_environment="production",
        secret_key="s" * 64,
        cors_origins="https://toopset.example",
        refresh_cookie_secure=False,
        payment_gateway="mock",
        sms_provider="mock",
    )

    with pytest.raises(EnvValidationError) as exc_info:
        validate_env(production)

    message = str(exc_info.value)
    assert "REFRESH_COOKIE_SECURE" in message
    assert "PAYMENT_GATEWAY" in message
    assert "SMS_PROVIDER" in message


def test_unknown_integrations_fail_validation_instead_of_falling_back_to_mock() -> None:
    configured = Settings(
        app_environment="development",
        secret_key="s" * 64,
        cors_origins="https://toopset.example",
        payment_gateway="unimplemented-gateway",
        sms_provider="unimplemented-sms",
    )

    with pytest.raises(EnvValidationError) as exc_info:
        validate_env(configured)

    assert "has no implementation" in str(exc_info.value)


@pytest.mark.asyncio
async def test_idempotency_indexes_exist(session: AsyncSession) -> None:
    result = await session.execute(
        text(
            """
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = current_schema()
              AND indexname IN (
                'uq_manager_requests_one_pending_per_user',
                'uq_payments_one_success_per_booking',
                'uq_payments_gateway_transaction_id'
              )
            """
        )
    )
    assert set(result.scalars().all()) == {
        "uq_manager_requests_one_pending_per_user",
        "uq_payments_one_success_per_booking",
        "uq_payments_gateway_transaction_id",
    }

    penalty_constraint = await session.execute(
        text(
            """
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_schema = current_schema()
              AND table_name = 'penalties'
              AND constraint_type = 'UNIQUE'
              AND constraint_name = 'uq_penalties_booking_id'
            """
        )
    )
    assert penalty_constraint.scalar_one() == "uq_penalties_booking_id"
