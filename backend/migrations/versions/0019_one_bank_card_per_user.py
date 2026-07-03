"""Allow only one bank card per user

Revision ID: 0019
Revises: 0018
Create Date: 2026-07-03
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY user_id
                    ORDER BY
                        CASE WHEN status = 'verified' THEN 0 ELSE 1 END,
                        verified_at DESC NULLS LAST,
                        updated_at DESC NULLS LAST,
                        id DESC
                ) AS rn
            FROM bank_cards
        )
        DELETE FROM bank_cards
        USING ranked
        WHERE bank_cards.id = ranked.id
          AND ranked.rn > 1
        """
    )
    op.drop_constraint("uq_bank_cards_user_fingerprint", "bank_cards", type_="unique")
    op.create_unique_constraint("uq_bank_cards_user_id", "bank_cards", ["user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_bank_cards_user_id", "bank_cards", type_="unique")
    op.create_unique_constraint(
        "uq_bank_cards_user_fingerprint",
        "bank_cards",
        ["user_id", "card_fingerprint"],
    )
