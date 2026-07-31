"""Keep the migration graph aligned without changing the existing schema.

Revision 0029 already matches the runtime models.  The indexes and unique
constraints previously listed here are created by earlier migrations, so
recreating them breaks upgrades from a normally migrated production database.

Revision ID: 0030
Revises: 0029
"""

from collections.abc import Sequence

revision: str = "0030"
down_revision: str | Sequence[str] | None = "0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Advance the revision marker; revision 0029 already has the target schema."""


def downgrade() -> None:
    """Move the revision marker back without dropping pre-existing schema objects."""
