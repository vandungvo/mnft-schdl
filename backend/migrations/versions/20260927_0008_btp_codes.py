"""Split BTP inventory into its own code catalog + product/stage routing (A09).

Revision ID: 20260927_0008
Revises: 20260927_0007
Create Date: 2026-09-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260927_0008"
down_revision: str | None = "20260927_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BTP_STAGES = ("cast", "cnc", "paint")


def upgrade() -> None:
    # master_btp_inventory is empty on every known dataset so far (BTP inventory
    # was never populated through the UI before this change) — safe to drop and
    # recreate keyed by btp_code instead of (product_code, stage).
    op.drop_index("ix_master_btp_inventory_dataset_id", table_name="master_btp_inventory")
    op.drop_table("master_btp_inventory")

    op.create_table(
        "master_btp_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("sort_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "code"),
    )
    op.create_index("ix_master_btp_codes_dataset_id", "master_btp_codes", ["dataset_id"])

    op.create_table(
        "master_btp_routing",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("product_code", sa.String(length=100), nullable=False),
        sa.Column("stage", sa.String(length=40), nullable=False),
        sa.Column("btp_code", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "product_code", "stage"),
    )
    op.create_index("ix_master_btp_routing_dataset_id", "master_btp_routing", ["dataset_id"])

    op.create_table(
        "master_btp_inventory",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("btp_code", sa.String(length=100), nullable=False),
        sa.Column("initial_qty", sa.Integer(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "btp_code"),
    )
    op.create_index("ix_master_btp_inventory_dataset_id", "master_btp_inventory", ["dataset_id"])

    # SchedulingInput.schema_version is now hard-required to be 3 (see 0006's same
    # fix for the 1->2 bump).
    op.execute(sa.text("UPDATE master_datasets SET schema_version = 3 WHERE schema_version = 2"))

    # Backfill: give every existing (product, stage) its own dedicated 1:1 BTP code
    # named "{product}_{STAGE}" — preserves current (no-sharing) behavior exactly;
    # users can consolidate/rename codes afterward via the UI.
    connection = op.get_bind()
    products = sa.table(
        "master_products",
        sa.column("dataset_id", sa.String),
        sa.column("code", sa.String),
    )
    btp_codes = sa.table(
        "master_btp_codes",
        sa.column("dataset_id", sa.String),
        sa.column("code", sa.String),
        sa.column("sort_index", sa.Integer),
    )
    btp_routing = sa.table(
        "master_btp_routing",
        sa.column("dataset_id", sa.String),
        sa.column("product_code", sa.String),
        sa.column("stage", sa.String),
        sa.column("btp_code", sa.String),
    )
    rows = connection.execute(sa.select(products.c.dataset_id, products.c.code)).fetchall()
    sort_index = 0
    for row in rows:
        for stage in BTP_STAGES:
            code = f"{row.code}_{stage.upper()}"
            connection.execute(
                btp_codes.insert().values(dataset_id=row.dataset_id, code=code, sort_index=sort_index)
            )
            connection.execute(
                btp_routing.insert().values(
                    dataset_id=row.dataset_id, product_code=row.code, stage=stage, btp_code=code
                )
            )
            sort_index += 1


def downgrade() -> None:
    op.execute(sa.text("UPDATE master_datasets SET schema_version = 2 WHERE schema_version = 3"))
    op.drop_index("ix_master_btp_inventory_dataset_id", table_name="master_btp_inventory")
    op.drop_table("master_btp_inventory")
    op.drop_index("ix_master_btp_routing_dataset_id", table_name="master_btp_routing")
    op.drop_table("master_btp_routing")
    op.drop_index("ix_master_btp_codes_dataset_id", table_name="master_btp_codes")
    op.drop_table("master_btp_codes")

    op.create_table(
        "master_btp_inventory",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=False),
        sa.Column("product_code", sa.String(length=100), nullable=False),
        sa.Column("stage", sa.String(length=40), nullable=False),
        sa.Column("initial_qty", sa.Integer(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["dataset_id"], ["master_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_id", "product_code", "stage"),
    )
    op.create_index("ix_master_btp_inventory_dataset_id", "master_btp_inventory", ["dataset_id"])
