"""Per-vendor Eitaa channels + digest enable switch.

Revision ID: 0044
Revises: 0043
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0044"
down_revision: str | Sequence[str] | None = "0043"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # One digest message per (vendor, day, channel) — a vendor may now post to
    # several channels, so the old per-(vendor, day) uniqueness is widened.
    op.drop_constraint("uq_eitaa_digest_vendor_date", "eitaa_digest_messages", type_="unique")
    op.create_unique_constraint(
        "uq_eitaa_digest_vendor_date_chat",
        "eitaa_digest_messages",
        ["vendor_id", "digest_date", "chat_id"],
    )

    op.create_table(
        "vendor_channels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "vendor_id",
            sa.Integer(),
            sa.ForeignKey("vendors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chat_id", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("vendor_id", "chat_id", name="uq_vendor_channels_vendor_chat"),
    )
    op.create_index("ix_vendor_channels_vendor_id", "vendor_channels", ["vendor_id"])

    op.add_column(
        "vendors",
        sa.Column("eitaa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("vendors", "eitaa_enabled")
    op.drop_index("ix_vendor_channels_vendor_id", table_name="vendor_channels")
    op.drop_table("vendor_channels")
    op.drop_constraint("uq_eitaa_digest_vendor_date_chat", "eitaa_digest_messages", type_="unique")
    op.create_unique_constraint(
        "uq_eitaa_digest_vendor_date", "eitaa_digest_messages", ["vendor_id", "digest_date"]
    )
