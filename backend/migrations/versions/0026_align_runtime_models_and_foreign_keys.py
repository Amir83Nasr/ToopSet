"""Align runtime model nullability and foreign-key deletion policies.

Revision ID: 0026
Revises: 0025
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0026"
down_revision: str | Sequence[str] | None = "0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TIMESTAMP_COLUMNS = (
    ("bank_cards", "created_at"),
    ("bank_cards", "updated_at"),
    ("booking_holds", "created_at"),
    ("booking_holds", "updated_at"),
    ("notification_deliveries", "created_at"),
    ("refunds", "requested_at"),
    ("replacement_requests", "created_at"),
    ("replacement_requests", "updated_at"),
    ("settlements", "requested_at"),
    ("slot_cancellations", "created_at"),
)

_FOREIGN_KEYS = (
    ("bookings", "bookings_user_id_fkey", ["user_id"], "users", ["id"], "CASCADE"),
    (
        "bookings",
        "bookings_slot_id_fkey",
        ["slot_id"],
        "time_slots",
        ["id"],
        "CASCADE",
    ),
    ("logs", "logs_user_id_fkey", ["user_id"], "users", ["id"], "SET NULL"),
    (
        "notifications",
        "notifications_user_id_fkey",
        ["user_id"],
        "users",
        ["id"],
        "CASCADE",
    ),
    (
        "payments",
        "payments_booking_id_fkey",
        ["booking_id"],
        "bookings",
        ["id"],
        "CASCADE",
    ),
    (
        "penalties",
        "penalties_booking_id_fkey",
        ["booking_id"],
        "bookings",
        ["id"],
        "CASCADE",
    ),
    (
        "penalties",
        "penalties_user_id_fkey",
        ["user_id"],
        "users",
        ["id"],
        "CASCADE",
    ),
    (
        "reviews",
        "reviews_booking_id_fkey",
        ["booking_id"],
        "bookings",
        ["id"],
        "CASCADE",
    ),
    (
        "reviews",
        "reviews_user_id_fkey",
        ["user_id"],
        "users",
        ["id"],
        "CASCADE",
    ),
    (
        "reviews",
        "reviews_vendor_id_fkey",
        ["vendor_id"],
        "vendors",
        ["id"],
        "CASCADE",
    ),
    (
        "time_slots",
        "time_slots_vendor_id_fkey",
        ["vendor_id"],
        "vendors",
        ["id"],
        "CASCADE",
    ),
    (
        "vendors",
        "courts_manager_id_fkey",
        ["manager_id"],
        "users",
        ["id"],
        "CASCADE",
    ),
    (
        "wallet_transactions",
        "wallet_transactions_wallet_id_fkey",
        ["wallet_id"],
        "wallets",
        ["id"],
        "CASCADE",
    ),
    ("wallets", "wallets_user_id_fkey", ["user_id"], "users", ["id"], "CASCADE"),
)


def _replace_foreign_keys(*, with_ondelete: bool) -> None:
    bind = op.get_bind()
    for table, name, local_columns, remote_table, remote_columns, ondelete in _FOREIGN_KEYS:
        # The court->vendor rename produced different generated constraint
        # names depending on the historical upgrade path. Resolve the existing
        # FK by table/column so both fresh and long-lived databases can upgrade.
        existing_name = bind.execute(
            sa.text(
                """
                SELECT constraint_name
                FROM information_schema.key_column_usage
                WHERE table_schema = current_schema()
                  AND table_name = :table
                  AND column_name = :column
                  AND position_in_unique_constraint IS NOT NULL
                """
            ),
            {"table": table, "column": local_columns[0]},
        ).scalar_one()
        op.drop_constraint(existing_name, table, type_="foreignkey")
        op.create_foreign_key(
            name,
            table,
            remote_table,
            local_columns,
            remote_columns,
            ondelete=ondelete if with_ondelete else None,
        )


def upgrade() -> None:
    # Older revisions allowed null even though every runtime model treats these
    # server-generated timestamps as mandatory. Backfill first so upgrades of
    # populated databases remain non-destructive.
    for table, column in _TIMESTAMP_COLUMNS:
        op.execute(sa.text(f'UPDATE "{table}" SET "{column}" = NOW() WHERE "{column}" IS NULL'))
        op.alter_column(
            table,
            column,
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )

    _replace_foreign_keys(with_ondelete=True)


def downgrade() -> None:
    _replace_foreign_keys(with_ondelete=False)
    for table, column in reversed(_TIMESTAMP_COLUMNS):
        op.alter_column(
            table,
            column,
            existing_type=sa.DateTime(timezone=True),
            nullable=True,
        )
