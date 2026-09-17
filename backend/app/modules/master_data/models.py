"""Master Data tables (mục 6 TECHNICAL_SPEC): orders, machines, machine_eligibility,
changeover_matrix, inventory_snapshot.

TODO (mục 6, nợ lại theo v2.4): `molds`, `shifts` — cần cho CRUD Master Data tuần 5-6
đầy đủ nhưng chưa có model/migration ở bước skeleton này.
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    due_day: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    stage: Mapped[str] = mapped_column(String(16), nullable=False)  # cast/cnc/paint/qc
    daily_capacity: Mapped[int] = mapped_column(Integer, nullable=False)


class MachineEligibility(Base):
    __tablename__ = "machine_eligibility"
    __table_args__ = (UniqueConstraint("machine_id", "product_type", name="uq_machine_product"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), nullable=False)
    product_type: Mapped[str] = mapped_column(String(16), nullable=False)


class ChangeoverMatrix(Base):
    __tablename__ = "changeover_matrix"

    type_a: Mapped[str] = mapped_column(String(16), primary_key=True)
    type_b: Mapped[str] = mapped_column(String(16), primary_key=True)
    setup_time: Mapped[int] = mapped_column(Integer, nullable=False)


class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_type: Mapped[str] = mapped_column(String(16), nullable=False)
    wip_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fg_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wip_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fg_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
