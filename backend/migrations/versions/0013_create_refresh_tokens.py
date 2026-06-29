"""Create refresh_tokens table for persistent refresh token rotation.

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-29 12:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(36), nullable=False),
        sa.Column(
            "issued_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by", sa.String(128), nullable=True),
        sa.Column("device_info", sa.String(512), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_refresh_tokens_hash", "refresh_tokens", ["token_hash"])
    op.create_index(
        "ix_refresh_tokens_user_active",
        "refresh_tokens",
        ["user_id", "revoked_at"],
    )
    op.create_index("ix_refresh_tokens_expires", "refresh_tokens", ["expires_at"])
    op.create_index("ix_refresh_tokens_session", "refresh_tokens", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_session", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_expires", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_active", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_hash", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
