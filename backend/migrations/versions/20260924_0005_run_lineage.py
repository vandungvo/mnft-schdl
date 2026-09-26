"""Add schedule run retry lineage.

Revision ID: 20260924_0005
Revises: 20260923_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260924_0005"
down_revision: str | None = "20260923_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("schedule_runs") as batch_op:
        batch_op.add_column(sa.Column("retry_of_id", sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            "fk_schedule_runs_retry_of_id",
            "schedule_runs",
            ["retry_of_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_schedule_runs_retry_of_id", ["retry_of_id"])


def downgrade() -> None:
    with op.batch_alter_table("schedule_runs") as batch_op:
        batch_op.drop_index("ix_schedule_runs_retry_of_id")
        batch_op.drop_constraint("fk_schedule_runs_retry_of_id", type_="foreignkey")
        batch_op.drop_column("retry_of_id")
