from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

pytestmark = [pytest.mark.asyncio]


async def test_users_phone_database_constraint_rejects_invalid_phone(
    session: AsyncSession,
) -> None:
    session.add(
        User(
            full_name="invalid",
            phone="9121111111",
            password_hash="hash",
        )
    )

    with pytest.raises(IntegrityError):
        await session.flush()

    await session.rollback()
