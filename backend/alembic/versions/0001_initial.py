"""initial schema — orders, machines, machine_eligibility, changeover_matrix,
inventory_snapshot, schedule_runs, schedule_run_results (mục 6 TECHNICAL_SPEC)

TODO: molds, shifts — nợ lại theo v2.4, xem
app/modules/master_data/models.py.

Revision ID: 0001
Revises:
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(16), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("due_day", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "machines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("stage", sa.String(16), nullable=False),
        sa.Column("daily_capacity", sa.Integer(), nullable=False),
    )

    op.create_table(
        "machine_eligibility",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("machine_id", sa.Integer(), sa.ForeignKey("machines.id"), nullable=False),
        sa.Column("product_type", sa.String(16), nullable=False),
        sa.UniqueConstraint("machine_id", "product_type", name="uq_machine_product"),
    )

    op.create_table(
        "changeover_matrix",
        sa.Column("type_a", sa.String(16), primary_key=True),
        sa.Column("type_b", sa.String(16), primary_key=True),
        sa.Column("setup_time", sa.Integer(), nullable=False),
    )

    op.create_table(
        "inventory_snapshot",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_type", sa.String(16), nullable=False),
        sa.Column("wip_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fg_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wip_min", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fg_min", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
    )

    op.create_table(
        "schedule_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("run_type", sa.String(16), nullable=False),
        sa.Column("input_hash", sa.String(64), nullable=False),
        sa.Column("result_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "schedule_run_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("run_id", sa.Integer(), sa.ForeignKey("schedule_runs.id"), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("machine_id", sa.Integer(), sa.ForeignKey("machines.id"), nullable=True),
        sa.Column("job_name", sa.String(64), nullable=False),
        sa.Column("start", sa.Integer(), nullable=False),
        sa.Column("end", sa.Integer(), nullable=False),
        sa.Column("shift_id", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("schedule_run_results")
    op.drop_table("schedule_runs")
    op.drop_table("inventory_snapshot")
    op.drop_table("changeover_matrix")
    op.drop_table("machine_eligibility")
    op.drop_table("machines")
    op.drop_table("orders")
