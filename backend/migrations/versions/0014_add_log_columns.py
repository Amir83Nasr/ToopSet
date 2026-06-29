"""Add severity, request_id, ip_address, user_agent columns to logs table.

Adds support for structured audit logging with severity levels, correlation
IDs, and client metadata (IP, User-Agent). Part of Phase C-4 observability
improvements.

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-29 14:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "logs", sa.Column("severity", sa.String(16), server_default="INFO", nullable=False)
    )
    op.add_column("logs", sa.Column("request_id", sa.String(64), nullable=True))
    op.add_column("logs", sa.Column("ip_address", sa.String(45), nullable=True))
    op.add_column("logs", sa.Column("user_agent", sa.Text(), nullable=True))

    # Index for filtering by severity (common in admin dashboards)
    op.create_index("ix_logs_severity", "logs", ["severity"])


def downgrade() -> None:
    op.drop_index("ix_logs_severity", table_name="logs")
    op.drop_column("logs", "user_agent")
    op.drop_column("logs", "ip_address")
    op.drop_column("logs", "request_id")
    op.drop_column("logs", "severity")
