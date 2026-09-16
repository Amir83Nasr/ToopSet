"""Round pending/approved settlement payouts to nearest 10k toman.

Revision ID: 0040
Revises: 0039
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0040"
down_revision: str | Sequence[str] | None = "0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # New settlements are rounded in FinanceService; backfill rows created
    # before that so history shows the same rounded payable amounts.
    # Paid rows are immutable payout records and are left untouched.
    op.execute(
        """
        DO $$
        DECLARE
            s RECORD;
            last_item_id INTEGER;
            rounded NUMERIC(10, 2);
            diff NUMERIC(10, 2);
        BEGIN
            FOR s IN
                SELECT id, requested_amount FROM settlements
                WHERE status::text IN ('pending', 'approved')
            LOOP
                rounded := ROUND(s.requested_amount / 10000) * 10000;
                diff := rounded - s.requested_amount;
                IF diff <> 0 THEN
                    SELECT id INTO last_item_id FROM settlement_items
                    WHERE settlement_id = s.id ORDER BY id DESC LIMIT 1;
                    IF last_item_id IS NOT NULL THEN
                        UPDATE settlement_items
                        SET amount = amount + diff WHERE id = last_item_id;
                    END IF;
                    UPDATE settlements
                    SET requested_amount = rounded WHERE id = s.id;
                    UPDATE settlements
                    SET approved_amount = rounded WHERE id = s.id
                    AND status::text = 'approved'
                    AND approved_amount IS NOT NULL;
                END IF;
            END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    # Rounding is lossy and cannot be restored.
    pass
