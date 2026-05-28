"""migrate sport_type enum to sport_types array

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-28

"""
from alembic import op
import sqlalchemy as sa


revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add sport_types ARRAY(String) column
    op.add_column("courts", sa.Column("sport_types", sa.ARRAY(sa.String()), nullable=True))

    # Migrate existing data
    op.execute("UPDATE courts SET sport_types = ARRAY[sport_type::text]")

    # Make the column non-nullable with a default
    op.alter_column("courts", "sport_types", nullable=False, server_default="{}")

    # Drop the old sport_type column
    op.drop_column("courts", "sport_type")

    # Drop the sporttype enum
    op.execute("DROP TYPE IF EXISTS sporttype")


def downgrade() -> None:
    # Recreate the sporttype enum
    sporttype_enum = sa.Enum("volleyball", "basketball", "futsal", "handball", name="sporttype")
    sporttype_enum.create(op.get_bind())

    # Add back the sport_type column
    op.add_column(
        "courts",
        sa.Column(
            "sport_type",
            sporttype_enum,
            nullable=True,
        ),
    )

    # Migrate data back (take first element of the array)
    op.execute(
        "UPDATE courts SET sport_type = (sport_types[1])::text::sporttype"
    )

    # Make the column non-nullable
    op.alter_column("courts", "sport_type", nullable=False)

    # Drop sport_types column
    op.drop_column("courts", "sport_types")
