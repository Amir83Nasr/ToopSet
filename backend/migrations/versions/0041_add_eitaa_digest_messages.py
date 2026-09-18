"""Add eitaa_digest_messages for editable channel digests.

Revision ID: 0041
Revises: 0040
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0041"
down_revision: str | Sequence[str] | None = "0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "eitaa_digest_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "vendor_id",
            sa.Integer(),
            sa.ForeignKey("vendors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("digest_date", sa.Date(), nullable=False),
        sa.Column("chat_id", sa.Text(), nullable=False),
        sa.Column("message_id", sa.BigInteger(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("vendor_id", "digest_date", name="uq_eitaa_digest_vendor_date"),
    )
    op.create_index("ix_eitaa_digest_messages_vendor_id", "eitaa_digest_messages", ["vendor_id"])
    op.create_index(
        "ix_eitaa_digest_messages_digest_date", "eitaa_digest_messages", ["digest_date"]
    )


def downgrade() -> None:
    op.drop_index("ix_eitaa_digest_messages_digest_date", table_name="eitaa_digest_messages")
    op.drop_index("ix_eitaa_digest_messages_vendor_id", table_name="eitaa_digest_messages")
    op.drop_table("eitaa_digest_messages")
