"""Merge manager-request and weekly-schedule branches

Revision ID: 0023
Revises: 0022, 0021_manager_requests
Create Date: 2026-07-17
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "0023"
down_revision: tuple[str, str] = ("0022", "0021_manager_requests")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
