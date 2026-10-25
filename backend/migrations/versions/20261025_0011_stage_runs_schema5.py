"""Accept schema-5 scenarios (fixed runs per stage, 5-stage line).

* master_datasets.document: the whole validated schema-5 input (schema 4 keeps
  using the normalised tables and leaves it NULL).
* schedule_operations.item: what a schema-5 run makes (BTP code or product).
* schedule_operations.shift becomes nullable: continuous machines (heat
  treatment) have windows but no rostered shift.

Revision ID: 20261025_0011
Revises: 20261025_0010
Create Date: 2026-10-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261025_0011"
down_revision: str | None = "20261025_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("master_datasets") as batch:
        batch.add_column(sa.Column("document", sa.JSON(), nullable=True))
    with op.batch_alter_table("schedule_operations") as batch:
        batch.add_column(sa.Column("item", sa.String(length=100), nullable=True))
        batch.alter_column("shift", existing_type=sa.String(length=100), nullable=True)


def downgrade() -> None:
    connection = op.get_bind()
    schema5 = sa.text("SELECT 1 FROM master_datasets WHERE document IS NOT NULL LIMIT 1")
    if connection.execute(schema5).first():
        raise RuntimeError("Delete the schema-5 scenarios before downgrading below 20261025_0011")
    connection.execute(sa.text("UPDATE schedule_operations SET shift = '' WHERE shift IS NULL"))
    with op.batch_alter_table("schedule_operations") as batch:
        batch.alter_column("shift", existing_type=sa.String(length=100), nullable=False)
        batch.drop_column("item")
    with op.batch_alter_table("master_datasets") as batch:
        batch.drop_column("document")
