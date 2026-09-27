"""Allow weekly schedule items to wrap past midnight.

Revision ID: 0043
Revises: 0042

Weekly template items could only express same-day start < end slots, so a
22:30 -> 00:00 sans could not live in the weekly system at all. Ordering is
now validated in the app layer with wrap-around semantics (end <= start means
the slot crosses midnight into the next day), so the DB check is dropped.

Downgrade note: recreating the constraint requires every version item to
satisfy start_time < end_time again — wrapped rows (e.g. 22:30/00:00) must be
removed or fixed by hand first.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0043"
down_revision: str | Sequence[str] | None = "0042"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CONSTRAINT = "ck_weekly_item_time_order"
_TABLE = "weekly_schedule_version_items"


def upgrade() -> None:
    op.drop_constraint(_CONSTRAINT, _TABLE, type_="check")


def downgrade() -> None:
    op.create_check_constraint(_CONSTRAINT, _TABLE, "start_time < end_time")
