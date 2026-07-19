"""Prevent more than one cancellation penalty per booking.

Revision ID: 0027
Revises: 0026
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0027"
down_revision: str | Sequence[str] | None = "0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Do not silently discard or merge financial history. If legacy duplicates
    # exist, the operator must reconcile them before retrying this migration.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM penalties
                GROUP BY booking_id
                HAVING COUNT(*) > 1
            ) THEN
                RAISE EXCEPTION
                    'duplicate penalties exist; reconcile financial records before upgrading';
            END IF;
        END
        $$
        """
    )
    op.create_unique_constraint("uq_penalties_booking_id", "penalties", ["booking_id"])


def downgrade() -> None:
    op.drop_constraint("uq_penalties_booking_id", "penalties", type_="unique")
