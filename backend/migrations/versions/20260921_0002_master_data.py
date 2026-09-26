"""Add normalized master data and run provenance.

Revision ID: 20260921_0002
Revises: 20260921_0001
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260921_0002"
down_revision: str | None = "20260921_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "master_datasets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(length=80), nullable=False),
        sa.Column("time_unit", sa.String(length=20), nullable=False),
        sa.Column("horizon", sa.Integer(), nullable=False),
        sa.Column("working_days", sa.JSON(), nullable=False),
        sa.Column("stages", sa.JSON(), nullable=False),
        sa.Column("checkpoints", sa.JSON(), nullable=False),
        sa.Column("minimum_lot", sa.Integer(), nullable=False),
        sa.Column("max_surplus", sa.Integer(), nullable=False),
        sa.Column("weights", sa.JSON(), nullable=False),
        sa.Column("assumptions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_master_datasets_source_hash", "master_datasets", ["source_hash"], unique=True
    )
    op.create_table(
        "master_products",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("initial_inventory", sa.Integer(), nullable=False),
        sa.Column("safety_stock", sa.Integer(), nullable=False),
        sa.Column("sort_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "code"),
    )
    op.create_index("ix_master_products_dataset_id", "master_products", ["dataset_id"])
    op.create_table(
        "master_machines",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("stage", sa.String(length=40), nullable=False),
        sa.Column("fixed_minutes", sa.Integer(), nullable=False),
        sa.Column("initial_product", sa.String(length=100), nullable=False),
        sa.Column("sort_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "code"),
    )
    op.create_index("ix_master_machines_dataset_id", "master_machines", ["dataset_id"])
    op.create_table(
        "master_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("product_code", sa.String(length=100), nullable=False),
        sa.Column("release", sa.Integer(), nullable=False),
        sa.Column("due", sa.Integer(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("urgent", sa.Boolean(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("initial_allocated", sa.Integer(), nullable=False),
        sa.Column("deadline", sa.Integer(), nullable=True),
        sa.Column("sort_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "code"),
    )
    op.create_index("ix_master_orders_dataset_id", "master_orders", ["dataset_id"])
    op.create_table(
        "master_lots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("order_code", sa.String(length=100), nullable=False),
        sa.Column("product_code", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("release", sa.Integer(), nullable=False),
        sa.Column("sort_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "code"),
    )
    op.create_index("ix_master_lots_dataset_id", "master_lots", ["dataset_id"])
    op.create_table(
        "machine_capabilities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("product_code", sa.String(length=100), nullable=False),
        sa.Column("minutes_per_unit", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["master_machines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("machine_id", "product_code"),
    )
    op.create_index("ix_machine_capabilities_machine_id", "machine_capabilities", ["machine_id"])
    op.create_table(
        "machine_changeovers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("from_product", sa.String(length=100), nullable=False),
        sa.Column("to_product", sa.String(length=100), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["master_machines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("machine_id", "from_product", "to_product"),
    )
    op.create_index("ix_machine_changeovers_machine_id", "machine_changeovers", ["machine_id"])
    op.create_table(
        "machine_windows",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.Integer(), nullable=False),
        sa.Column("shift_code", sa.String(length=100), nullable=False),
        sa.Column("start", sa.Integer(), nullable=False),
        sa.Column("end", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["master_machines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("machine_id", "external_id"),
    )
    op.create_index("ix_machine_windows_machine_id", "machine_windows", ["machine_id"])
    op.create_table(
        "machine_shifts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("start", sa.Integer(), nullable=False),
        sa.Column("end", sa.Integer(), nullable=False),
        sa.Column("available_minutes", sa.Integer(), nullable=False),
        sa.Column("sort_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["master_machines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("machine_id", "code"),
    )
    op.create_index("ix_machine_shifts_machine_id", "machine_shifts", ["machine_id"])
    op.create_table(
        "machine_downtimes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("start", sa.Integer(), nullable=False),
        sa.Column("end", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["master_machines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_machine_downtimes_machine_id", "machine_downtimes", ["machine_id"])
    op.create_table(
        "master_molds",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("cavities", sa.Integer(), nullable=False),
        sa.Column("limit_cycles", sa.Integer(), nullable=False),
        sa.Column("initial_cycles", sa.Integer(), nullable=False),
        sa.Column("maintenance_minutes", sa.Integer(), nullable=False),
        sa.Column("after_maintenance", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["master_machines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("machine_id"),
    )
    op.create_table(
        "master_lot_allocations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["lot_id"], ["master_lots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["master_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id", "lot_id"),
    )
    op.create_index("ix_master_lot_allocations_lot_id", "master_lot_allocations", ["lot_id"])
    op.create_index("ix_master_lot_allocations_order_id", "master_lot_allocations", ["order_id"])

    with op.batch_alter_table("schedule_runs") as batch_op:
        batch_op.add_column(sa.Column("dataset_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("dataset_revision", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_schedule_runs_dataset_id_master_datasets",
            "master_datasets",
            ["dataset_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_schedule_runs_dataset_id", ["dataset_id"])


def downgrade() -> None:
    with op.batch_alter_table("schedule_runs") as batch_op:
        batch_op.drop_index("ix_schedule_runs_dataset_id")
        batch_op.drop_constraint("fk_schedule_runs_dataset_id_master_datasets", type_="foreignkey")
        batch_op.drop_column("dataset_revision")
        batch_op.drop_column("dataset_id")

    op.drop_index("ix_master_lot_allocations_order_id", table_name="master_lot_allocations")
    op.drop_index("ix_master_lot_allocations_lot_id", table_name="master_lot_allocations")
    op.drop_table("master_lot_allocations")
    op.drop_table("master_molds")
    op.drop_index("ix_machine_downtimes_machine_id", table_name="machine_downtimes")
    op.drop_table("machine_downtimes")
    op.drop_index("ix_machine_shifts_machine_id", table_name="machine_shifts")
    op.drop_table("machine_shifts")
    op.drop_index("ix_machine_windows_machine_id", table_name="machine_windows")
    op.drop_table("machine_windows")
    op.drop_index("ix_machine_changeovers_machine_id", table_name="machine_changeovers")
    op.drop_table("machine_changeovers")
    op.drop_index("ix_machine_capabilities_machine_id", table_name="machine_capabilities")
    op.drop_table("machine_capabilities")
    op.drop_index("ix_master_lots_dataset_id", table_name="master_lots")
    op.drop_table("master_lots")
    op.drop_index("ix_master_orders_dataset_id", table_name="master_orders")
    op.drop_table("master_orders")
    op.drop_index("ix_master_machines_dataset_id", table_name="master_machines")
    op.drop_table("master_machines")
    op.drop_index("ix_master_products_dataset_id", table_name="master_products")
    op.drop_table("master_products")
    op.drop_index("ix_master_datasets_source_hash", table_name="master_datasets")
    op.drop_table("master_datasets")
