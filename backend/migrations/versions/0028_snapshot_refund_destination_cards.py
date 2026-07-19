"""Snapshot payout destination cards on refunds.

Revision ID: 0028
Revises: 0027
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0028"
down_revision: str | Sequence[str] | None = "0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refunds", sa.Column("destination_card_encrypted", sa.String(length=512), nullable=True)
    )
    op.add_column(
        "refunds", sa.Column("destination_card_masked", sa.String(length=32), nullable=True)
    )
    op.add_column(
        "refunds",
        sa.Column("destination_card_holder_name", sa.String(length=128), nullable=True),
    )
    # Safely attach the one verified card already stored for legacy open
    # refunds. Terminal history without a verified card remains explicitly
    # unresolved instead of guessing a payout destination.
    op.execute(
        """
        UPDATE refunds AS r
        SET destination_card_encrypted = c.encrypted_card_number,
            destination_card_masked = c.masked_card_number,
            destination_card_holder_name = c.holder_name
        FROM bank_cards AS c
        WHERE c.user_id = r.user_id
          AND c.status = 'verified'
          AND r.status IN ('pending', 'approved')
          AND r.destination_card_encrypted IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("refunds", "destination_card_holder_name")
    op.drop_column("refunds", "destination_card_masked")
    op.drop_column("refunds", "destination_card_encrypted")
