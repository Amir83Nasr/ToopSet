"""Enforce canonical Iranian mobile numbers for users

Revision ID: 0018
Revises: 0017
Create Date: 2026-07-03
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_users_phone_ir_mobile",
        "users",
        "phone ~ '^09[0-9]{9}$'",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_phone_ir_mobile", "users", type_="check")
