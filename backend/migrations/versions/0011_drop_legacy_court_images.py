"""Drop legacy court.images column

The `images` ARRAY column on the `courts` table was the original storage for
image URLs, superseded by the `court_images` table. Before dropping, any
existing data in the `images` column is migrated to `court_images` for courts
that don't already have records there.

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-29

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    # Migrate any legacy data: copy URLs from court.images to court_images for
    # courts that have data in the ARRAY column but no court_images records yet.
    connection.execute(
        sa.text(
            """
            INSERT INTO court_images (court_id, url, "order")
            SELECT
                c.id,
                unnest(c.images),
                row_number() OVER (PARTITION BY c.id) - 1
            FROM courts c
            WHERE c.images IS NOT NULL
              AND c.images != '{}'
              AND NOT EXISTS (
                  SELECT 1 FROM court_images ci WHERE ci.court_id = c.id
              )
            """
        )
    )

    # Drop the legacy column
    op.drop_column("courts", "images")


def downgrade() -> None:
    # Re-add the column (data cannot be restored — this is a best-effort revert)
    op.add_column(
        "courts",
        sa.Column("images", postgresql.ARRAY(sa.String(512)), nullable=True),
    )
