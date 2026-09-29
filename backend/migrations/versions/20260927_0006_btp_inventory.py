"""Add product catalog attributes and BTP (semi-finished) inventory per stage.

Revision ID: 20260927_0006
Revises: 20260924_0005
Create Date: 2026-09-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260927_0006"
down_revision: str | None = "20260924_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _infer_color(code: str) -> str:
    upper = code.upper()
    if "SILVER" in upper:
        return "SILVER"
    if "BLACK" in upper:
        return "BLACK"
    return "UNKNOWN"


def _infer_line(code: str) -> str:
    upper = code.upper()
    if upper.startswith("F_") or upper.startswith("F-"):
        return "F"
    if upper.startswith("R_") or upper.startswith("R-"):
        return "R"
    return "UNKNOWN"


def upgrade() -> None:
    with op.batch_alter_table("master_datasets") as batch_op:
        batch_op.add_column(
            sa.Column("max_surplus_btp", sa.Integer(), nullable=False, server_default="0")
        )

    with op.batch_alter_table("master_products") as batch_op:
        batch_op.add_column(sa.Column("color", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("line", sa.String(length=10), nullable=True))

    products = sa.table(
        "master_products",
        sa.column("id", sa.Integer),
        sa.column("code", sa.String),
        sa.column("color", sa.String),
        sa.column("line", sa.String),
    )
    connection = op.get_bind()
    rows = connection.execute(sa.select(products.c.id, products.c.code)).fetchall()
    for row in rows:
        connection.execute(
            products.update()
            .where(products.c.id == row.id)
            .values(color=_infer_color(row.code), line=_infer_line(row.code))
        )

    with op.batch_alter_table("master_products") as batch_op:
        batch_op.alter_column("color", nullable=False)
        batch_op.alter_column("line", nullable=False)

    # Existing datasets were persisted under schema_version 1 (finished-goods-only
    # inventory); the SchedulingInput contract now hard-requires Literal[2].
    op.execute(sa.text("UPDATE master_datasets SET schema_version = 2 WHERE schema_version = 1"))

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
    op.create_index(
        "ix_master_btp_inventory_dataset_id", "master_btp_inventory", ["dataset_id"]
    )


def downgrade() -> None:
    op.execute(sa.text("UPDATE master_datasets SET schema_version = 1 WHERE schema_version = 2"))
    op.drop_index("ix_master_btp_inventory_dataset_id", table_name="master_btp_inventory")
    op.drop_table("master_btp_inventory")
    with op.batch_alter_table("master_products") as batch_op:
        batch_op.drop_column("line")
        batch_op.drop_column("color")
    with op.batch_alter_table("master_datasets") as batch_op:
        batch_op.drop_column("max_surplus_btp")
