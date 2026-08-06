"""seed legal content (rules_text, privacy_text)

Revision ID: 0034
Revises: 0033
Create Date: 2026-08-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.core.legal_content import LEGAL_SETTINGS

revision: str = "0034"
down_revision: Union[str, None] = "0033"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Backfill rules_text / privacy_text only when they are empty.

    Admin-edited values must never be overwritten, so rows with non-empty
    content are left untouched.
    """
    bind = op.get_bind()
    for item in LEGAL_SETTINGS:
        bind.execute(
            sa.text(
                "UPDATE settings SET value = :value "
                "WHERE key = :key AND (value IS NULL OR value = '')"
            ),
            {"key": item["key"], "value": item["value"]},
        )


def downgrade() -> None:
    """Set the two keys back to empty (original seed values)."""
    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE settings SET value = '' WHERE key IN ('rules_text', 'privacy_text')")
    )
