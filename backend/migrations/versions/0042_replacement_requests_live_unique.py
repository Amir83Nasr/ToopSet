"""Allow a fresh replacement request after withdraw/expiry.

Revision ID: 0042
Revises: 0041

The plain unique constraint on replacement_requests.original_booking_id made a
booking single-shot: once its request was revoked (user withdrew the
cancellation) or expired, a new cancel hit the constraint and surfaced as the
generic "duplicate" 409. Replace it with a partial unique index that only
covers live statuses, so terminal rows remain as history and cancel→withdraw→
re-cancel opens a new request.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0042"
down_revision: str | Sequence[str] | None = "0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_OLD_CONSTRAINT = "replacement_requests_original_booking_id_key"
_NEW_INDEX = "uq_replacement_requests_one_live_per_original"


def upgrade() -> None:
    op.drop_constraint(_OLD_CONSTRAINT, "replacement_requests", type_="unique")
    op.create_index(
        _NEW_INDEX,
        "replacement_requests",
        ["original_booking_id"],
        unique=True,
        postgresql_where="status IN ('open', 'held')",
    )


def downgrade() -> None:
    # Terminal history rows must be deduplicated per original_booking_id
    # before the plain constraint can be recreated.
    op.drop_index(_NEW_INDEX, table_name="replacement_requests")
    op.create_unique_constraint(_OLD_CONSTRAINT, "replacement_requests", ["original_booking_id"])
