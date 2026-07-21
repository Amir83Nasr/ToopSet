"""Fix refund snapshot columns to match runtime model

Revision ID: 0029
Revises: 0028
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0029"
down_revision: str | Sequence[str] | None = "0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 0028 was rewritten after applying to some DBs with column names
    # snapshot_destination_card_id (int4) and snapshot_masked_card_number (varchar 32).
    # Align schema with runtime model: encrypted/masked/holder columns.

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns("refunds")}

    # Drop outdated snapshot columns
    for old in ("snapshot_destination_card_id", "snapshot_masked_card_number"):
        if old in existing:
            op.drop_column("refunds", old)

    # Add canonical columns if missing
    col_defs = [
        ("destination_card_encrypted", sa.String(512)),
        ("destination_card_masked", sa.String(32)),
        ("destination_card_holder_name", sa.String(128)),
    ]
    for name, col_type in col_defs:
        if name not in existing:
            op.add_column("refunds", sa.Column(name, col_type, nullable=True))

    # Backfill from verified bank cards for any refund still missing snapshot
    op.execute(
        """
        UPDATE refunds AS r
        SET destination_card_encrypted = c.encrypted_card_number,
            destination_card_masked = c.masked_card_number,
            destination_card_holder_name = c.holder_name
        FROM bank_cards AS c
        WHERE c.user_id = r.user_id
          AND c.status = 'verified'
          AND r.destination_card_encrypted IS NULL
        """
    )


def downgrade() -> None:
    for col in (
        "destination_card_holder_name",
        "destination_card_masked",
        "destination_card_encrypted",
    ):
        op.drop_column("refunds", col)
    op.add_column(
        "refunds",
        sa.Column("snapshot_masked_card_number", sa.String(32), nullable=True),
    )
    op.add_column(
        "refunds",
        sa.Column("snapshot_destination_card_id", sa.Integer(), nullable=True),
    )
