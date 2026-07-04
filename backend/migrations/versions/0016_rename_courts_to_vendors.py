"""Rename courts domain to vendors

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-29
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _rename_constraint_if_exists(table: str, old: str, new: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = '{old}'
                  AND conrelid = '{table}'::regclass
            ) THEN
                ALTER TABLE "{table}" RENAME CONSTRAINT "{old}" TO "{new}";
            END IF;
        END $$;
        """
    )


def upgrade() -> None:
    op.rename_table("courts", "vendors")
    op.rename_table("court_images", "vendor_images")

    op.alter_column("time_slots", "court_id", new_column_name="vendor_id")
    op.alter_column("reviews", "court_id", new_column_name="vendor_id")
    op.alter_column("favorites", "court_id", new_column_name="vendor_id")
    op.alter_column("vendor_images", "court_id", new_column_name="vendor_id")

    op.execute("ALTER INDEX IF EXISTS ix_courts_manager_id RENAME TO ix_vendors_manager_id")
    op.execute("ALTER INDEX IF EXISTS ix_courts_is_active RENAME TO ix_vendors_is_active")
    op.execute("ALTER INDEX IF EXISTS ix_courts_created_at RENAME TO ix_vendors_created_at")
    op.execute("ALTER INDEX IF EXISTS ix_courts_is_deleted RENAME TO ix_vendors_is_deleted")
    op.execute("ALTER INDEX IF EXISTS ix_time_slots_court_id RENAME TO ix_time_slots_vendor_id")
    op.execute(
        "ALTER INDEX IF EXISTS ix_time_slots_court_id_start_time "
        "RENAME TO ix_time_slots_vendor_id_start_time"
    )
    op.execute("ALTER INDEX IF EXISTS ix_reviews_court_id RENAME TO ix_reviews_vendor_id")
    op.execute("ALTER INDEX IF EXISTS ix_favorites_court_id RENAME TO ix_favorites_vendor_id")
    op.execute(
        "ALTER INDEX IF EXISTS ix_court_images_court_id RENAME TO ix_vendor_images_vendor_id"
    )

    _rename_constraint_if_exists(
        "time_slots", "uq_time_slots_court_start_end", "uq_time_slots_vendor_start_end"
    )
    _rename_constraint_if_exists("favorites", "uq_user_court_favorite", "uq_user_vendor_favorite")
    _rename_constraint_if_exists(
        "time_slots", "time_slots_court_id_fkey", "time_slots_vendor_id_fkey"
    )
    _rename_constraint_if_exists("reviews", "reviews_court_id_fkey", "reviews_vendor_id_fkey")
    _rename_constraint_if_exists("favorites", "favorites_court_id_fkey", "favorites_vendor_id_fkey")
    _rename_constraint_if_exists(
        "vendor_images", "court_images_court_id_fkey", "vendor_images_vendor_id_fkey"
    )

    op.execute("ALTER SEQUENCE IF EXISTS courts_id_seq RENAME TO vendors_id_seq")
    op.execute("ALTER SEQUENCE IF EXISTS court_images_id_seq RENAME TO vendor_images_id_seq")


def downgrade() -> None:
    op.execute("ALTER SEQUENCE IF EXISTS vendor_images_id_seq RENAME TO court_images_id_seq")
    op.execute("ALTER SEQUENCE IF EXISTS vendors_id_seq RENAME TO courts_id_seq")

    _rename_constraint_if_exists(
        "vendor_images", "vendor_images_vendor_id_fkey", "court_images_court_id_fkey"
    )
    _rename_constraint_if_exists("favorites", "favorites_vendor_id_fkey", "favorites_court_id_fkey")
    _rename_constraint_if_exists("reviews", "reviews_vendor_id_fkey", "reviews_court_id_fkey")
    _rename_constraint_if_exists(
        "time_slots", "time_slots_vendor_id_fkey", "time_slots_court_id_fkey"
    )
    _rename_constraint_if_exists("favorites", "uq_user_vendor_favorite", "uq_user_court_favorite")
    _rename_constraint_if_exists(
        "time_slots", "uq_time_slots_vendor_start_end", "uq_time_slots_court_start_end"
    )

    op.execute(
        "ALTER INDEX IF EXISTS ix_vendor_images_vendor_id RENAME TO ix_court_images_court_id"
    )
    op.execute("ALTER INDEX IF EXISTS ix_favorites_vendor_id RENAME TO ix_favorites_court_id")
    op.execute("ALTER INDEX IF EXISTS ix_reviews_vendor_id RENAME TO ix_reviews_court_id")
    op.execute(
        "ALTER INDEX IF EXISTS ix_time_slots_vendor_id_start_time "
        "RENAME TO ix_time_slots_court_id_start_time"
    )
    op.execute("ALTER INDEX IF EXISTS ix_time_slots_vendor_id RENAME TO ix_time_slots_court_id")
    op.execute("ALTER INDEX IF EXISTS ix_vendors_is_deleted RENAME TO ix_courts_is_deleted")
    op.execute("ALTER INDEX IF EXISTS ix_vendors_created_at RENAME TO ix_courts_created_at")
    op.execute("ALTER INDEX IF EXISTS ix_vendors_is_active RENAME TO ix_courts_is_active")
    op.execute("ALTER INDEX IF EXISTS ix_vendors_manager_id RENAME TO ix_courts_manager_id")

    op.alter_column("vendor_images", "vendor_id", new_column_name="court_id")
    op.alter_column("favorites", "vendor_id", new_column_name="court_id")
    op.alter_column("reviews", "vendor_id", new_column_name="court_id")
    op.alter_column("time_slots", "vendor_id", new_column_name="court_id")

    op.rename_table("vendor_images", "court_images")
    op.rename_table("vendors", "courts")
