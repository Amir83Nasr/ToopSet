"""add review response and notifications table
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

revision = "0002_add_review_response_and_notifications"
down_revision = "0001_create_all_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("response", sa.Text(), nullable=True))

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_column("reviews", "response")
