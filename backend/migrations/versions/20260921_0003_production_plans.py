"""Add aggregate production plans and schedule-run provenance.

Revision ID: 20260921_0003
Revises: 20260921_0002
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260921_0003"
down_revision: str | None = "20260921_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "production_plans",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=True),
        sa.Column("dataset_revision", sa.Integer(), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("input_snapshot", sa.JSON(), nullable=False),
        sa.Column("period_start", sa.Integer(), nullable=False),
        sa.Column("period_end", sa.Integer(), nullable=False),
        sa.Column("bucket_minutes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "dataset_id",
            "dataset_revision",
            "period_start",
            "period_end",
            "bucket_minutes",
            name="uq_production_plan_revision_period",
        ),
    )
    op.create_index("ix_production_plans_created_at", "production_plans", ["created_at"])
    op.create_index("ix_production_plans_dataset_id", "production_plans", ["dataset_id"])
    op.create_index("ix_production_plans_input_hash", "production_plans", ["input_hash"])
    op.create_index("ix_production_plans_status", "production_plans", ["status"])

    with op.batch_alter_table("schedule_runs") as batch_op:
        batch_op.add_column(sa.Column("plan_id", sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            "fk_schedule_runs_plan_id_production_plans",
            "production_plans",
            ["plan_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_schedule_runs_plan_id", ["plan_id"])


def downgrade() -> None:
    with op.batch_alter_table("schedule_runs") as batch_op:
        batch_op.drop_index("ix_schedule_runs_plan_id")
        batch_op.drop_constraint("fk_schedule_runs_plan_id_production_plans", type_="foreignkey")
        batch_op.drop_column("plan_id")

    op.drop_index("ix_production_plans_status", table_name="production_plans")
    op.drop_index("ix_production_plans_input_hash", table_name="production_plans")
    op.drop_index("ix_production_plans_dataset_id", table_name="production_plans")
    op.drop_index("ix_production_plans_created_at", table_name="production_plans")
    op.drop_table("production_plans")
