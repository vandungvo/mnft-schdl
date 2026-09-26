"""Create schedule run persistence.

Revision ID: 20260921_0001
Revises:
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260921_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "schedule_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("idempotency_key", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("algorithm", sa.String(length=40), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=False),
        sa.Column("time_budget_seconds", sa.Float(), nullable=False),
        sa.Column("input_name", sa.String(length=200), nullable=False),
        sa.Column("time_origin", sa.String(length=80), nullable=False),
        sa.Column("horizon_minutes", sa.Integer(), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("input_snapshot", sa.JSON(), nullable=False),
        sa.Column("solver_status", sa.String(length=60), nullable=True),
        sa.Column("solver_metadata", sa.JSON(), nullable=True),
        sa.Column("validation", sa.JSON(), nullable=True),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index("ix_schedule_runs_input_hash", "schedule_runs", ["input_hash"])
    op.create_index("ix_schedule_runs_status", "schedule_runs", ["status"])
    op.create_index("ix_schedule_runs_status_created", "schedule_runs", ["status", "created_at"])
    op.create_table(
        "schedule_operations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("lot", sa.String(length=100), nullable=False),
        sa.Column("stage", sa.String(length=40), nullable=False),
        sa.Column("machine", sa.String(length=100), nullable=False),
        sa.Column("block_start", sa.Integer(), nullable=False),
        sa.Column("start", sa.Integer(), nullable=False),
        sa.Column("end", sa.Integer(), nullable=False),
        sa.Column("setup_minutes", sa.Integer(), nullable=False),
        sa.Column("maintenance_minutes", sa.Integer(), nullable=False),
        sa.Column("cycles_after", sa.Integer(), nullable=False),
        sa.Column("mold", sa.String(length=100), nullable=True),
        sa.Column("window", sa.Integer(), nullable=False),
        sa.Column("shift", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["schedule_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_schedule_operations_run_lot", "schedule_operations", ["run_id", "lot", "stage"]
    )
    op.create_index(
        "ix_schedule_operations_run_machine",
        "schedule_operations",
        ["run_id", "machine", "block_start"],
    )


def downgrade() -> None:
    op.drop_index("ix_schedule_operations_run_machine", table_name="schedule_operations")
    op.drop_index("ix_schedule_operations_run_lot", table_name="schedule_operations")
    op.drop_table("schedule_operations")
    op.drop_index("ix_schedule_runs_status_created", table_name="schedule_runs")
    op.drop_index("ix_schedule_runs_status", table_name="schedule_runs")
    op.drop_index("ix_schedule_runs_input_hash", table_name="schedule_runs")
    op.drop_table("schedule_runs")
