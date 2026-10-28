"""Factories with versioned configuration, the order book and planning periods.

* factories / factory_versions: the plant, one immutable config per version.
* order_book: customer orders of a factory, independent of any period.
* planning_periods: a period's inputs (orders, opening stock, exceptions) and the
  schema-5 scenario compiled from them.
* master_datasets.owner_period_id: marks the scenarios a period owns.

Revision ID: 20261027_0012
Revises: 20261025_0011
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261027_0012"
down_revision: str | None = "20261025_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "factories",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("current_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "factory_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "factory_id",
            sa.String(length=36),
            sa.ForeignKey("factories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("effective_from", sa.String(length=10), nullable=True),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("changes", sa.JSON(), nullable=False),
        sa.Column("actor", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("factory_id", "version"),
    )
    op.create_index("ix_factory_versions_factory_id", "factory_versions", ["factory_id"])
    op.create_table(
        "order_book",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "factory_id",
            sa.String(length=36),
            sa.ForeignKey("factories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("product", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("due", sa.String(length=16), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("pickup", sa.String(length=20), nullable=False),
        sa.Column("customer", sa.String(length=120), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("delivered_at", sa.String(length=16), nullable=True),
        sa.Column("delivered_period_id", sa.String(length=36), nullable=True),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("factory_id", "code"),
    )
    op.create_index("ix_order_book_factory_id", "order_book", ["factory_id"])
    op.create_index("ix_order_book_status", "order_book", ["status"])
    op.create_index(
        "ix_order_book_factory_status_due", "order_book", ["factory_id", "status", "due"]
    )
    op.create_table(
        "planning_periods",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "factory_id",
            sa.String(length=36),
            sa.ForeignKey("factories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("factory_version", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("start_date", sa.String(length=10), nullable=False),
        sa.Column("days", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column(
            "parent_id",
            sa.String(length=36),
            sa.ForeignKey("planning_periods.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("variant_label", sa.String(length=120), nullable=True),
        sa.Column("inputs", sa.JSON(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column(
            "dataset_id",
            sa.String(length=36),
            sa.ForeignKey("master_datasets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("compile_issues", sa.JSON(), nullable=False),
        sa.Column("compile_load", sa.JSON(), nullable=False),
        sa.Column("compiled_revision", sa.Integer(), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_planning_periods_factory_id", "planning_periods", ["factory_id"])
    op.create_index("ix_planning_periods_parent_id", "planning_periods", ["parent_id"])
    op.create_index("ix_planning_periods_dataset_id", "planning_periods", ["dataset_id"])
    op.create_index(
        "ix_planning_periods_factory_start", "planning_periods", ["factory_id", "start_date"]
    )
    with op.batch_alter_table("master_datasets") as batch:
        batch.add_column(sa.Column("owner_period_id", sa.String(length=36), nullable=True))
        batch.create_index("ix_master_datasets_owner_period_id", ["owner_period_id"])


def downgrade() -> None:
    with op.batch_alter_table("master_datasets") as batch:
        batch.drop_index("ix_master_datasets_owner_period_id")
        batch.drop_column("owner_period_id")
    op.drop_table("planning_periods")
    op.drop_table("order_book")
    op.drop_table("factory_versions")
    op.drop_table("factories")
