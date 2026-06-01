"""drop is_deleted and deleted_at columns (hard delete replaces soft delete)

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-31

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop indexes first, then columns
    op.drop_index("ix_users_is_deleted", table_name="users", if_exists=True)
    op.drop_column("users", "is_deleted")
    op.drop_column("users", "deleted_at")

    op.drop_index("ix_courts_is_deleted", table_name="courts", if_exists=True)
    op.drop_column("courts", "is_deleted")
    op.drop_column("courts", "deleted_at")

    op.drop_index("ix_reviews_is_deleted", table_name="reviews", if_exists=True)
    op.drop_column("reviews", "is_deleted")
    op.drop_column("reviews", "deleted_at")

    op.drop_index("ix_bookings_is_deleted", table_name="bookings", if_exists=True)
    op.drop_column("bookings", "is_deleted")
    op.drop_column("bookings", "deleted_at")


def downgrade() -> None:
    # Restore columns and indexes
    op.add_column(
        "users",
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_is_deleted", "users", ["is_deleted"])

    op.add_column(
        "courts",
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "courts",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_courts_is_deleted", "courts", ["is_deleted"])

    op.add_column(
        "reviews",
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "reviews",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reviews_is_deleted", "reviews", ["is_deleted"])

    op.add_column(
        "bookings",
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "bookings",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_bookings_is_deleted", "bookings", ["is_deleted"])
