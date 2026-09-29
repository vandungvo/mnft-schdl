"""Add fixed BTP transfer lag (A09/R12 extension) to master datasets.

Revision ID: 20260927_0007
Revises: 20260927_0006
Create Date: 2026-09-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260927_0007"
down_revision: str | None = "20260927_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("master_datasets") as batch_op:
        batch_op.add_column(
            sa.Column("transfer_minutes", sa.Integer(), nullable=False, server_default="0")
        )


def downgrade() -> None:
    with op.batch_alter_table("master_datasets") as batch_op:
        batch_op.drop_column("transfer_minutes")
