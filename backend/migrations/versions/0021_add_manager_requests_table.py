"""Add manager_requests table

Revision ID: 0021
Revises: 0020
Create Date: 2026-07-11
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    manager_request_status = postgresql.ENUM(
        "pending", "approved", "rejected", name="managerrequeststatus", create_type=False
    )
    manager_request_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "manager_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("vendor_name", sa.String(length=256), nullable=False),
        sa.Column("phone", sa.String(length=16), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            manager_request_status,
            nullable=False,
            server_default="pending",
            index=True,
        ),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("manager_requests")
    op.execute("DROP TYPE IF EXISTS managerrequeststatus")
