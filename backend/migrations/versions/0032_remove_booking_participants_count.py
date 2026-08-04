"""Remove participant counts from bookings and replacement holds.

Revision ID: 0032
Revises: 0031
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0032"
down_revision: str | Sequence[str] | None = "0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_booking_holds_participants_positive",
        "booking_holds",
        type_="check",
    )
    op.drop_column("booking_holds", "participants_count")
    op.drop_column("bookings", "participants_count")


def downgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("participants_count", sa.SmallInteger(), server_default="1", nullable=False),
    )
    op.add_column(
        "booking_holds",
        sa.Column("participants_count", sa.Integer(), server_default="1", nullable=False),
    )
    op.create_check_constraint(
        "ck_booking_holds_participants_positive",
        "booking_holds",
        "participants_count > 0",
    )
