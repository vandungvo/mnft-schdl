from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from models.common.experiment import METHODS
from models.common.instance import check_input
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

NonNegativeInt = Annotated[int, Field(ge=0)]
PositiveInt = Annotated[int, Field(gt=0)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AvailabilityWindow(StrictModel):
    id: NonNegativeInt
    shift: str = Field(min_length=1, max_length=100)
    start: NonNegativeInt
    end: PositiveInt


class Shift(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    day: NonNegativeInt
    start: NonNegativeInt
    end: PositiveInt
    available_minutes: PositiveInt


class Mold(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    cavities: PositiveInt
    limit_cycles: PositiveInt
    initial_cycles: NonNegativeInt
    maintenance_minutes: PositiveInt
    after_maintenance: str = Field(min_length=1, max_length=100)


class Machine(StrictModel):
    stage: str = Field(min_length=1, max_length=40)
    minutes_per_unit: dict[str, Annotated[float, Field(gt=0)]]
    fixed_minutes: NonNegativeInt
    initial_product: str = Field(min_length=1, max_length=100)
    setup: dict[str, dict[str, NonNegativeInt]]
    windows: list[AvailabilityWindow] = Field(min_length=1)
    shifts: list[Shift] = Field(min_length=1)
    downtime: list[tuple[NonNegativeInt, PositiveInt]] = Field(default_factory=list)
    mold: Mold | None = None


class Order(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    product: str = Field(min_length=1, max_length=100)
    release: NonNegativeInt
    due: NonNegativeInt
    priority: PositiveInt
    urgent: bool = False
    quantity: PositiveInt
    initial_allocated: NonNegativeInt
    lot_allocations: dict[str, PositiveInt] = Field(min_length=1)
    deadline: NonNegativeInt | None = None

    @model_validator(mode="after")
    def validate_timing(self) -> Order:
        if self.release > self.due:
            raise ValueError("Order release must be less than or equal to due")
        return self


class Lot(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    order: str = Field(min_length=1, max_length=100)
    product: str = Field(min_length=1, max_length=100)
    quantity: PositiveInt
    release: NonNegativeInt


class ObjectiveWeights(StrictModel):
    makespan: NonNegativeInt
    weighted_tardiness: NonNegativeInt
    setup_minutes: NonNegativeInt
    idle_minutes: NonNegativeInt
    safety_shortfall: NonNegativeInt


class SchedulingInput(StrictModel):
    schema_version: Literal[1]
    name: str = Field(min_length=1, max_length=200)
    seed: int
    origin: str = Field(min_length=1, max_length=80)
    time_unit: Literal["minute"]
    horizon: PositiveInt
    working_days: list[NonNegativeInt] = Field(min_length=1)
    stages: list[str] = Field(min_length=1)
    products: list[str] = Field(min_length=1)
    initial_inventory: dict[str, NonNegativeInt]
    safety_stock: dict[str, NonNegativeInt]
    checkpoints: list[PositiveInt] = Field(min_length=1)
    minimum_lot: PositiveInt
    max_surplus: NonNegativeInt
    machines: dict[str, Machine] = Field(min_length=1)
    orders: list[Order] = Field(min_length=1)
    lots: list[Lot] = Field(min_length=1)
    weights: ObjectiveWeights
    assumptions: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_engine_contract(self) -> SchedulingInput:
        if any(order.due > self.horizon for order in self.orders):
            raise ValueError("Order due must be within the scheduling horizon")
        if any(lot.release > self.horizon for lot in self.lots):
            raise ValueError("Lot release must be within the scheduling horizon")
        if any(checkpoint > self.horizon for checkpoint in self.checkpoints):
            raise ValueError("Checkpoint must be within the scheduling horizon")
        try:
            check_input(self.to_engine_dict())
        except (AssertionError, KeyError, TypeError, ValueError) as exc:
            message = str(exc) or exc.__class__.__name__
            raise ValueError(f"Input violates scheduling contract: {message}") from exc
        return self

    def to_engine_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json", exclude_none=True)


Algorithm = Literal[
    "fifo",
    "edd",
    "spt",
    "simulated_annealing",
    "genetic_algorithm",
    "cp_sat",
    "cp_sat_hint",
    "cp_lns",
]


class ScheduleRunCreate(StrictModel):
    input: SchedulingInput | None = None
    dataset_id: str | None = Field(default=None, min_length=36, max_length=36)
    plan_id: str | None = Field(default=None, min_length=36, max_length=36)
    algorithm: Algorithm = "cp_sat_hint"
    seed: int = Field(default=11, ge=0, le=2_147_483_647)
    time_budget_seconds: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_algorithm_registry(self) -> ScheduleRunCreate:
        if self.algorithm not in METHODS:
            raise ValueError(f"Unsupported algorithm: {self.algorithm}")
        source_count = sum(
            source is not None for source in (self.input, self.dataset_id, self.plan_id)
        )
        if source_count != 1:
            raise ValueError("Provide exactly one of input, dataset_id, or plan_id")
        return self


class ScheduleRunRetry(StrictModel):
    algorithm: Algorithm | None = None
    seed: int | None = Field(default=None, ge=0, le=2_147_483_647)
    time_budget_seconds: float | None = Field(default=None, gt=0)

    @field_validator("algorithm")
    @classmethod
    def validate_algorithm_registry(cls, value: Algorithm | None) -> Algorithm | None:
        if value is not None and value not in METHODS:
            raise ValueError(f"Unsupported algorithm: {value}")
        return value


class ProductionPlanCreate(StrictModel):
    dataset_id: str = Field(min_length=36, max_length=36)
    period_start: NonNegativeInt = 0
    period_end: PositiveInt | None = None
    bucket_minutes: Literal[1440, 10080] = 1440

    @model_validator(mode="after")
    def validate_period(self) -> ProductionPlanCreate:
        if self.period_end is not None and self.period_start >= self.period_end:
            raise ValueError("period_start must be less than period_end")
        return self


class ProductionPlanProduct(StrictModel):
    product: str
    demand_qty: int
    initial_inventory: int
    inventory_allocated: int
    required_production_qty: int
    planned_lot_qty: int
    projected_ending_inventory: int
    safety_stock: int
    safety_shortfall: int


class ProductionPlanStage(StrictModel):
    stage: str
    lot_count: int
    required_minutes: int
    available_minutes: int
    load_ratio: float | None
    overloaded: bool


class ProductionPlanBucketProduct(StrictModel):
    product: str
    demand_qty: int
    production_qty: int


class ProductionPlanBucket(StrictModel):
    start: int
    end: int
    products: list[ProductionPlanBucketProduct]


class ProductionPlanResult(StrictModel):
    order_count: int
    lot_count: int
    products: list[ProductionPlanProduct]
    stages: list[ProductionPlanStage]
    buckets: list[ProductionPlanBucket]
    warnings: list[str]
    assumptions: list[str]


class ProductionPlanSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str | None
    dataset_revision: int
    input_hash: str
    period_start: int
    period_end: int
    bucket_minutes: int
    status: str
    created_at: datetime
    time_origin: str
    input_name: str


class ProductionPlanDetail(ProductionPlanSummary):
    result: ProductionPlanResult


class ProductionPlanList(StrictModel):
    items: list[ProductionPlanSummary]
    total: int
    limit: int
    offset: int


class MasterDatasetImport(StrictModel):
    input: SchedulingInput
    expected_revision: PositiveInt | None = None


class ProductCreate(StrictModel):
    expected_revision: PositiveInt
    code: str = Field(min_length=1, max_length=100, pattern=r"^[A-Z0-9][A-Z0-9_-]*$")
    initial_inventory: NonNegativeInt = 0
    safety_stock: NonNegativeInt = 0

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        return value.strip().upper() if isinstance(value, str) else value


class ProductUpdate(StrictModel):
    expected_revision: PositiveInt
    initial_inventory: NonNegativeInt
    safety_stock: NonNegativeInt


class OrderUpdate(StrictModel):
    expected_revision: PositiveInt
    release: NonNegativeInt
    due: NonNegativeInt
    priority: PositiveInt
    urgent: bool
    deadline: NonNegativeInt | None = None


class MachineReplace(StrictModel):
    expected_revision: PositiveInt
    machine: Machine


class MasterDatasetCounts(StrictModel):
    products: int
    machines: int
    orders: int
    lots: int


class MasterDatasetSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    source_hash: str
    schema_version: int
    revision: int
    origin: str
    horizon: int
    is_ready: bool
    readiness_errors: list[str]
    counts: MasterDatasetCounts
    created_at: datetime
    updated_at: datetime


class MasterDatasetDetail(MasterDatasetSummary):
    input: SchedulingInput


class MasterDatasetList(StrictModel):
    items: list[MasterDatasetSummary]
    total: int
    limit: int
    offset: int


class ScheduleOperationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lot: str
    stage: str
    machine: str
    block_start: int
    start: int
    end: int
    setup_minutes: int
    maintenance_minutes: int
    cycles_after: int
    mold: str | None
    window: int
    shift: str


class ScheduleRunSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str | None
    dataset_revision: int | None
    plan_id: str | None
    retry_of_id: str | None
    status: str
    algorithm: str
    seed: int
    time_budget_seconds: float
    input_name: str
    time_origin: str
    horizon_minutes: int
    input_hash: str
    solver_status: str | None
    error_code: str | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    updated_at: datetime


class ScheduleRunDetail(ScheduleRunSummary):
    solver_metadata: dict[str, Any] | None
    validation: dict[str, Any] | None
    metrics: dict[str, Any] | None
    operations: list[ScheduleOperationResponse]


class ScheduleRunList(StrictModel):
    items: list[ScheduleRunSummary]
    total: int
    limit: int
    offset: int


class HealthResponse(StrictModel):
    status: Literal["ok"] = "ok"
    service: str
    environment: str
    master_data_status: Literal["ready", "empty"]
    master_dataset_count: int
    production_plan_count: int
    plans_needing_attention: int
    schedule_run_count: int
    solver_default_budget_seconds: float
    solver_max_budget_seconds: float
    supported_algorithms: list[Algorithm]
    database_latency_ms: float
    queued_runs: int
    running_runs: int
    failed_runs_24h: int
    latest_run_finished_at: datetime | None


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor: str
    action: str
    resource_type: str
    resource_id: str | None
    details: dict[str, Any]
    created_at: datetime


class AuditEventList(StrictModel):
    items: list[AuditEventResponse]
    total: int
    limit: int
    offset: int


class ApiErrorDetail(StrictModel):
    code: str
    message: str
    request_id: str | None = None
    details: Any | None = None


class ApiError(StrictModel):
    error: ApiErrorDetail
