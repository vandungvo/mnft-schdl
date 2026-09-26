from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class RunStatus(StrEnum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class MasterDataset(Base):
    __tablename__ = "master_datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200))
    source_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    schema_version: Mapped[int] = mapped_column(Integer)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    seed: Mapped[int] = mapped_column(Integer)
    origin: Mapped[str] = mapped_column(String(80))
    time_unit: Mapped[str] = mapped_column(String(20))
    horizon: Mapped[int] = mapped_column(Integer)
    working_days: Mapped[list] = mapped_column(JSON)
    stages: Mapped[list] = mapped_column(JSON)
    checkpoints: Mapped[list] = mapped_column(JSON)
    minimum_lot: Mapped[int] = mapped_column(Integer)
    max_surplus: Mapped[int] = mapped_column(Integer)
    weights: Mapped[dict] = mapped_column(JSON)
    assumptions: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    products: Mapped[list[MasterProduct]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan"
    )
    machines: Mapped[list[MasterMachine]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan"
    )
    orders: Mapped[list[MasterOrder]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan"
    )
    lots: Mapped[list[MasterLot]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan"
    )


class MasterProduct(Base):
    __tablename__ = "master_products"
    __table_args__ = (UniqueConstraint("dataset_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[str] = mapped_column(
        ForeignKey("master_datasets.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(100))
    initial_inventory: Mapped[int] = mapped_column(Integer)
    safety_stock: Mapped[int] = mapped_column(Integer)
    sort_index: Mapped[int] = mapped_column(Integer)

    dataset: Mapped[MasterDataset] = relationship(back_populates="products")


class MasterMachine(Base):
    __tablename__ = "master_machines"
    __table_args__ = (UniqueConstraint("dataset_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[str] = mapped_column(
        ForeignKey("master_datasets.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(100))
    stage: Mapped[str] = mapped_column(String(40))
    fixed_minutes: Mapped[int] = mapped_column(Integer)
    initial_product: Mapped[str] = mapped_column(String(100))
    sort_index: Mapped[int] = mapped_column(Integer)

    dataset: Mapped[MasterDataset] = relationship(back_populates="machines")
    capabilities: Mapped[list[MachineCapability]] = relationship(
        back_populates="machine", cascade="all, delete-orphan"
    )
    changeovers: Mapped[list[MachineChangeover]] = relationship(
        back_populates="machine", cascade="all, delete-orphan"
    )
    windows: Mapped[list[MachineWindow]] = relationship(
        back_populates="machine", cascade="all, delete-orphan"
    )
    shifts: Mapped[list[MachineShift]] = relationship(
        back_populates="machine", cascade="all, delete-orphan"
    )
    downtimes: Mapped[list[MachineDowntime]] = relationship(
        back_populates="machine", cascade="all, delete-orphan"
    )
    mold: Mapped[MasterMold | None] = relationship(
        back_populates="machine", cascade="all, delete-orphan", uselist=False
    )


class MachineCapability(Base):
    __tablename__ = "machine_capabilities"
    __table_args__ = (UniqueConstraint("machine_id", "product_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("master_machines.id", ondelete="CASCADE"), index=True
    )
    product_code: Mapped[str] = mapped_column(String(100))
    minutes_per_unit: Mapped[float] = mapped_column(Float)

    machine: Mapped[MasterMachine] = relationship(back_populates="capabilities")


class MachineChangeover(Base):
    __tablename__ = "machine_changeovers"
    __table_args__ = (UniqueConstraint("machine_id", "from_product", "to_product"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("master_machines.id", ondelete="CASCADE"), index=True
    )
    from_product: Mapped[str] = mapped_column(String(100))
    to_product: Mapped[str] = mapped_column(String(100))
    minutes: Mapped[int] = mapped_column(Integer)

    machine: Mapped[MasterMachine] = relationship(back_populates="changeovers")


class MachineWindow(Base):
    __tablename__ = "machine_windows"
    __table_args__ = (UniqueConstraint("machine_id", "external_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("master_machines.id", ondelete="CASCADE"), index=True
    )
    external_id: Mapped[int] = mapped_column(Integer)
    shift_code: Mapped[str] = mapped_column(String(100))
    start: Mapped[int] = mapped_column(Integer)
    end: Mapped[int] = mapped_column(Integer)

    machine: Mapped[MasterMachine] = relationship(back_populates="windows")


class MachineShift(Base):
    __tablename__ = "machine_shifts"
    __table_args__ = (UniqueConstraint("machine_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("master_machines.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(100))
    day: Mapped[int] = mapped_column(Integer)
    start: Mapped[int] = mapped_column(Integer)
    end: Mapped[int] = mapped_column(Integer)
    available_minutes: Mapped[int] = mapped_column(Integer)
    sort_index: Mapped[int] = mapped_column(Integer)

    machine: Mapped[MasterMachine] = relationship(back_populates="shifts")


class MachineDowntime(Base):
    __tablename__ = "machine_downtimes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("master_machines.id", ondelete="CASCADE"), index=True
    )
    start: Mapped[int] = mapped_column(Integer)
    end: Mapped[int] = mapped_column(Integer)

    machine: Mapped[MasterMachine] = relationship(back_populates="downtimes")


class MasterMold(Base):
    __tablename__ = "master_molds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("master_machines.id", ondelete="CASCADE"), unique=True
    )
    code: Mapped[str] = mapped_column(String(100))
    cavities: Mapped[int] = mapped_column(Integer)
    limit_cycles: Mapped[int] = mapped_column(Integer)
    initial_cycles: Mapped[int] = mapped_column(Integer)
    maintenance_minutes: Mapped[int] = mapped_column(Integer)
    after_maintenance: Mapped[str] = mapped_column(String(100))

    machine: Mapped[MasterMachine] = relationship(back_populates="mold")


class MasterOrder(Base):
    __tablename__ = "master_orders"
    __table_args__ = (UniqueConstraint("dataset_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[str] = mapped_column(
        ForeignKey("master_datasets.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(100))
    product_code: Mapped[str] = mapped_column(String(100))
    release: Mapped[int] = mapped_column(Integer)
    due: Mapped[int] = mapped_column(Integer)
    priority: Mapped[int] = mapped_column(Integer)
    urgent: Mapped[bool] = mapped_column(Boolean)
    quantity: Mapped[int] = mapped_column(Integer)
    initial_allocated: Mapped[int] = mapped_column(Integer)
    deadline: Mapped[int | None] = mapped_column(Integer)
    sort_index: Mapped[int] = mapped_column(Integer)

    dataset: Mapped[MasterDataset] = relationship(back_populates="orders")
    allocations: Mapped[list[MasterLotAllocation]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class MasterLot(Base):
    __tablename__ = "master_lots"
    __table_args__ = (UniqueConstraint("dataset_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[str] = mapped_column(
        ForeignKey("master_datasets.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(100))
    order_code: Mapped[str] = mapped_column(String(100))
    product_code: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(Integer)
    release: Mapped[int] = mapped_column(Integer)
    sort_index: Mapped[int] = mapped_column(Integer)

    dataset: Mapped[MasterDataset] = relationship(back_populates="lots")
    allocations: Mapped[list[MasterLotAllocation]] = relationship(
        back_populates="lot", cascade="all, delete-orphan"
    )


class MasterLotAllocation(Base):
    __tablename__ = "master_lot_allocations"
    __table_args__ = (UniqueConstraint("order_id", "lot_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("master_orders.id", ondelete="CASCADE"), index=True
    )
    lot_id: Mapped[int] = mapped_column(
        ForeignKey("master_lots.id", ondelete="CASCADE"), index=True
    )
    quantity: Mapped[int] = mapped_column(Integer)

    order: Mapped[MasterOrder] = relationship(back_populates="allocations")
    lot: Mapped[MasterLot] = relationship(back_populates="allocations")


class ScheduleRun(Base):
    __tablename__ = "schedule_runs"
    __table_args__ = (Index("ix_schedule_runs_status_created", "status", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    idempotency_key: Mapped[str | None] = mapped_column(String(200), unique=True)
    dataset_id: Mapped[str | None] = mapped_column(
        ForeignKey("master_datasets.id", ondelete="SET NULL"), index=True
    )
    dataset_revision: Mapped[int | None] = mapped_column(Integer)
    plan_id: Mapped[str | None] = mapped_column(
        ForeignKey("production_plans.id", ondelete="SET NULL"), index=True
    )
    retry_of_id: Mapped[str | None] = mapped_column(
        ForeignKey("schedule_runs.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(24), index=True, default=RunStatus.QUEUED.value)
    algorithm: Mapped[str] = mapped_column(String(40))
    seed: Mapped[int] = mapped_column(Integer)
    time_budget_seconds: Mapped[float] = mapped_column(Float)
    input_name: Mapped[str] = mapped_column(String(200))
    time_origin: Mapped[str] = mapped_column(String(80))
    horizon_minutes: Mapped[int] = mapped_column(Integer)
    input_hash: Mapped[str] = mapped_column(String(64), index=True)
    input_snapshot: Mapped[dict] = mapped_column(JSON)
    solver_status: Mapped[str | None] = mapped_column(String(60))
    solver_metadata: Mapped[dict | None] = mapped_column(JSON)
    validation: Mapped[dict | None] = mapped_column(JSON)
    metrics: Mapped[dict | None] = mapped_column(JSON)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    operations: Mapped[list[ScheduleOperation]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="ScheduleOperation.id"
    )


class ProductionPlan(Base):
    __tablename__ = "production_plans"
    __table_args__ = (
        UniqueConstraint(
            "dataset_id",
            "dataset_revision",
            "period_start",
            "period_end",
            "bucket_minutes",
            name="uq_production_plan_revision_period",
        ),
        Index("ix_production_plans_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id: Mapped[str | None] = mapped_column(
        ForeignKey("master_datasets.id", ondelete="SET NULL"), index=True
    )
    dataset_revision: Mapped[int] = mapped_column(Integer)
    input_hash: Mapped[str] = mapped_column(String(64), index=True)
    input_snapshot: Mapped[dict] = mapped_column(JSON)
    period_start: Mapped[int] = mapped_column(Integer)
    period_end: Mapped[int] = mapped_column(Integer)
    bucket_minutes: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), index=True)
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    @property
    def time_origin(self) -> str:
        return str(self.input_snapshot.get("origin", ""))

    @property
    def input_name(self) -> str:
        return str(self.input_snapshot.get("name", ""))


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_resource_created", "resource_type", "resource_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor: Mapped[str] = mapped_column(String(100), default="system")
    action: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[str] = mapped_column(String(80), index=True)
    resource_id: Mapped[str | None] = mapped_column(String(100), index=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ScheduleOperation(Base):
    __tablename__ = "schedule_operations"
    __table_args__ = (
        Index("ix_schedule_operations_run_machine", "run_id", "machine", "block_start"),
        Index("ix_schedule_operations_run_lot", "run_id", "lot", "stage"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(
        ForeignKey("schedule_runs.id", ondelete="CASCADE"), nullable=False
    )
    lot: Mapped[str] = mapped_column(String(100))
    stage: Mapped[str] = mapped_column(String(40))
    machine: Mapped[str] = mapped_column(String(100))
    block_start: Mapped[int] = mapped_column(Integer)
    start: Mapped[int] = mapped_column(Integer)
    end: Mapped[int] = mapped_column(Integer)
    setup_minutes: Mapped[int] = mapped_column(Integer)
    maintenance_minutes: Mapped[int] = mapped_column(Integer)
    cycles_after: Mapped[int] = mapped_column(Integer)
    mold: Mapped[str | None] = mapped_column(String(100))
    window: Mapped[int] = mapped_column(Integer)
    shift: Mapped[str] = mapped_column(String(100))

    run: Mapped[ScheduleRun] = relationship(back_populates="operations")
