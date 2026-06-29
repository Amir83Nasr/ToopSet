"""Add missing performance indexes

Identified from query-pattern analysis:
- Court.manager_id   — filtered in manager/booking joins
- Court.is_active    — filtered in public listings and admin pending-courts
- Court.created_at   — ordering in list endpoints
- Booking.created_at — ordering and dashboard date-range queries
- User.role          — filtered in admin user management
- User.created_at    — ordering in admin user list
- Review.user_id     — filtered in "my reviews" queries

Composite indexes already covered by migration 0010:
- (booking.user_id, booking.status)
- (time_slots.court_id, start_time)

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-29

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── courts ──────────────────────────────────────────────────────────────
    op.create_index(op.f("ix_courts_manager_id"), "courts", ["manager_id"], unique=False)
    op.create_index(op.f("ix_courts_is_active"), "courts", ["is_active"], unique=False)
    op.create_index(op.f("ix_courts_created_at"), "courts", ["created_at"], unique=False)

    # ── bookings ────────────────────────────────────────────────────────────
    op.create_index(op.f("ix_bookings_created_at"), "bookings", ["created_at"], unique=False)

    # ── users ───────────────────────────────────────────────────────────────
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)
    op.create_index(op.f("ix_users_created_at"), "users", ["created_at"], unique=False)

    # ── reviews ─────────────────────────────────────────────────────────────
    op.create_index(op.f("ix_reviews_user_id"), "reviews", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_courts_manager_id"), table_name="courts")
    op.drop_index(op.f("ix_courts_is_active"), table_name="courts")
    op.drop_index(op.f("ix_courts_created_at"), table_name="courts")
    op.drop_index(op.f("ix_bookings_created_at"), table_name="bookings")
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_created_at"), table_name="users")
    op.drop_index(op.f("ix_reviews_user_id"), table_name="reviews")
