"""Sync indexes and constraints with the runtime models.

Revision ID: 0030
Revises: 0029
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0030"
down_revision: str | Sequence[str] | None = "0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_bookings_user_id_status", "bookings", ["user_id", "status"])
    op.create_index(
        "uq_bookings_one_active_per_slot",
        "bookings",
        ["slot_id"],
        unique=True,
        postgresql_where=sa.text(
            "status IN ('pending_payment', 'confirmed', 'pending_cancellation')"
        ),
    )
    op.create_index("ix_logs_severity", "logs", ["severity"])

    op.drop_index("ix_refresh_tokens_session_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.create_index("ix_refresh_tokens_hash", "refresh_tokens", ["token_hash"])
    op.create_unique_constraint("uq_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])

    op.create_index(
        "ix_time_slots_vendor_id_start_time",
        "time_slots",
        ["vendor_id", "start_time"],
    )
    op.create_index("ix_vendor_images_vendor_id", "vendor_images", ["vendor_id"])


def downgrade() -> None:
    op.drop_index("ix_vendor_images_vendor_id", table_name="vendor_images")
    op.drop_index("ix_time_slots_vendor_id_start_time", table_name="time_slots")
    op.drop_constraint("uq_refresh_tokens_token_hash", "refresh_tokens", type_="unique")
    op.drop_index("ix_refresh_tokens_hash", table_name="refresh_tokens")
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)
    op.create_index("ix_refresh_tokens_session_id", "refresh_tokens", ["session_id"])
    op.drop_index("ix_logs_severity", table_name="logs")
    op.drop_index("uq_bookings_one_active_per_slot", table_name="bookings")
    op.drop_index("ix_bookings_user_id_status", table_name="bookings")
