"""Migrate vendor images to the public media domain.

Revision ID: 0036
Revises: 0035
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0036"
down_revision: str | Sequence[str] | None = "0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_OLD_BASE = "https://c228415.parspack.net/c228415"
_NEW_BASE = "https://media.toopset.ir/c228415"


def _replace_urls(old_base: str, new_base: str) -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE vendor_images "
            "SET url = REPLACE(url, :old_base, :new_base) "
            "WHERE url LIKE :old_pattern"
        ),
        {
            "old_base": old_base,
            "new_base": new_base,
            "old_pattern": f"{old_base}/%",
        },
    )


def upgrade() -> None:
    _replace_urls(_OLD_BASE, _NEW_BASE)


def downgrade() -> None:
    _replace_urls(_NEW_BASE, _OLD_BASE)
