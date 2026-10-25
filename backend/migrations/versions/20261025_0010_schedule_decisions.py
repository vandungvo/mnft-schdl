"""Store committed schedule decisions server-side (they lived in the browser before).

Append-only: a decision is never edited or deleted, a new one supersedes it.

Revision ID: 20261025_0010
Revises: 20260929_0009
Create Date: 2026-10-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261025_0010"
down_revision: str | None = "20260929_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "schedule_decisions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=True),
        sa.Column("run_id", sa.String(length=36), nullable=True),
        sa.Column("dataset_revision", sa.Integer(), nullable=True),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("algorithm", sa.String(length=40), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=False),
        sa.Column("alternative", sa.String(length=200), nullable=False),
        sa.Column("policy", sa.String(length=80), nullable=False),
        sa.Column("score", sa.String(length=80), nullable=False),
        sa.Column("late", sa.Integer(), nullable=False),
        sa.Column("shortfall", sa.Float(), nullable=False),
        sa.Column("shifts", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("actor", sa.String(length=100), nullable=False),
        sa.Column("legacy_key", sa.String(length=200), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["run_id"], ["schedule_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("legacy_key"),
    )
    op.create_index("ix_schedule_decisions_dataset_id", "schedule_decisions", ["dataset_id"])
    op.create_index("ix_schedule_decisions_run_id", "schedule_decisions", ["run_id"])
    op.create_index(
        "ix_schedule_decisions_dataset_decided", "schedule_decisions", ["dataset_id", "decided_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_schedule_decisions_dataset_decided", table_name="schedule_decisions")
    op.drop_index("ix_schedule_decisions_run_id", table_name="schedule_decisions")
    op.drop_index("ix_schedule_decisions_dataset_id", table_name="schedule_decisions")
    op.drop_table("schedule_decisions")
