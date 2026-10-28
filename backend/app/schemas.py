from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from models.common.experiment import METHODS
from models.common.instance import check_input, upgrade_input
from pydantic import (
    BaseModel,
    ConfigDict,
    Discriminator,
    Field,
    Tag,
    field_validator,
    model_validator,
)

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
    schema_version: Literal[4]
    name: str = Field(min_length=1, max_length=200)
    seed: int
    origin: str = Field(min_length=1, max_length=80)
    time_unit: Literal["minute"]
    horizon: PositiveInt
    working_days: list[NonNegativeInt] = Field(min_length=1)
    stages: list[str] = Field(min_length=1)
    products: list[str] = Field(min_length=1)
    product_color: dict[str, str] = Field(default_factory=dict)
    product_line: dict[str, str] = Field(default_factory=dict)
    initial_inventory: dict[str, NonNegativeInt]
    safety_stock: dict[str, NonNegativeInt]
    # BTP (semi-finished) catalog (A09): a free-standing code, distinct from finished
    # product codes, that one or more (product, stage in {cast,cnc,paint}) routings
    # can share — sharing means those routings draw from the SAME inventory pool.
    btp_codes: list[str] = Field(default_factory=list)
    btp_routing: dict[str, dict[str, str]] = Field(default_factory=dict)
    # Flat by BTP code. Sparse: a missing btp_code in btp_capacity means unlimited.
    inventory_btp: dict[str, NonNegativeInt] = Field(default_factory=dict)
    btp_capacity: dict[str, PositiveInt] = Field(default_factory=dict)
    max_surplus_btp: NonNegativeInt = 0
    # Fixed handoff lag (A09/R12 extension): BTP credited by a stage-k run is only
    # usable downstream this many minutes after the run physically ends.
    transfer_minutes: NonNegativeInt = 0
    checkpoints: list[PositiveInt] = Field(min_length=1)
    minimum_lot: PositiveInt
    max_surplus: NonNegativeInt
    machines: dict[str, Machine] = Field(min_length=1)
    orders: list[Order] = Field(min_length=1)
    lots: list[Lot] = Field(min_length=1)
    weights: ObjectiveWeights
    assumptions: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def upgrade_legacy_schema(cls, data: Any) -> Any:
        # Stored v3 plan snapshots / bootstrap files: explicit relabel to v4.
        if isinstance(data, dict):
            try:
                return upgrade_input(data)
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError(f"Input violates scheduling contract: {exc}") from exc
        return data

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


# ---------- schema 5: fixed runs per stage (models/common/stage_runs) ----------
# A different production model from schema 4, not a newer version of it: every stage
# processes fixed-size runs, molds are a shared pool, heat treatment may run around the
# clock. Kept as one validated document (no normalised tables).


class ShiftTemplate(StrictModel):
    start: NonNegativeInt
    end: PositiveInt
    breaks: list[tuple[NonNegativeInt, PositiveInt]] = Field(default_factory=list)


class ProductV5(StrictModel):
    route: dict[str, str] = Field(min_length=1)
    initial_stock: NonNegativeInt
    safety_stock: NonNegativeInt
    stock_cap: PositiveInt


class BtpStock(StrictModel):
    initial_stock: NonNegativeInt
    capacity: PositiveInt | None = None


class MachineV5(StrictModel):
    stage: str = Field(min_length=1, max_length=40)
    # 0 is legal: a batch furnace takes fixed_minutes whatever the run size.
    minutes_per_unit: dict[str, Annotated[int | float, Field(ge=0)]] = Field(min_length=1)
    fixed_minutes: NonNegativeInt
    setup: dict[str, dict[str, NonNegativeInt]] = Field(min_length=1)
    mold_change_minutes: NonNegativeInt | None = None
    downtime: list[tuple[NonNegativeInt, PositiveInt]] = Field(default_factory=list)
    calendar: Literal["shifts", "continuous"] | None = None


class MoldV5(StrictModel):
    item: str = Field(min_length=1, max_length=100)
    cavities: PositiveInt
    limit_cycles: PositiveInt
    initial_cycles: NonNegativeInt
    maintenance_minutes: PositiveInt
    after_maintenance: str = Field(min_length=1, max_length=100)


class OrderV5(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    product: str = Field(min_length=1, max_length=100)
    quantity: PositiveInt
    due: NonNegativeInt
    priority: PositiveInt
    release: NonNegativeInt
    initial_allocated: NonNegativeInt
    lot_allocations: dict[str, PositiveInt]

    @model_validator(mode="after")
    def validate_timing(self) -> OrderV5:
        if self.release > self.due:
            raise ValueError("Order release must be less than or equal to due")
        return self


class LongTermOrder(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    product: str = Field(min_length=1, max_length=100)
    quantity: PositiveInt
    due: NonNegativeInt


class ObjectiveTiers(StrictModel):
    tier1: list[str] = Field(default_factory=list)
    scale: Annotated[int | float, Field(gt=0)] = 1


class ReserveOption(StrictModel):
    pull_ahead_for: str = Field(min_length=1, max_length=100)


class StageRun(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    stage: str = Field(min_length=1, max_length=40)
    item: str = Field(min_length=1, max_length=100)
    reserve_option: str | None = None


class SchedulingInputV5(StrictModel):
    schema_version: Literal[5]
    derived_from: str | None = Field(default=None, max_length=200)
    name: str = Field(min_length=1, max_length=200)
    origin: str = Field(min_length=1, max_length=80)
    time_unit: Literal["minute"]
    horizon: PositiveInt
    stages: list[str] = Field(min_length=2)
    run_size: dict[str, PositiveInt]
    transfer_minutes: dict[str, NonNegativeInt]
    checkpoints: list[PositiveInt] = Field(min_length=1)
    machine_initial_state: str = Field(min_length=1, max_length=100)
    shift_template: dict[str, ShiftTemplate] = Field(min_length=1)
    products: dict[str, ProductV5] = Field(min_length=1)
    btp: dict[str, BtpStock] = Field(default_factory=dict)
    machines: dict[str, MachineV5] = Field(min_length=1)
    molds: dict[str, MoldV5] = Field(default_factory=dict)
    orders: list[OrderV5] = Field(min_length=1)
    long_term_orders: list[LongTermOrder] = Field(default_factory=list)
    weights: dict[str, Annotated[int | float, Field(ge=0)]] = Field(min_length=1)
    objective_tiers: ObjectiveTiers | None = None
    reserve_options: dict[str, ReserveOption] = Field(default_factory=dict)
    runs: list[StageRun] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_engine_contract(self) -> SchedulingInputV5:
        if any(order.due > self.horizon for order in self.orders):
            raise ValueError("Order due must be within the scheduling horizon")
        if any(checkpoint > self.horizon for checkpoint in self.checkpoints):
            raise ValueError("Checkpoint must be within the scheduling horizon")
        from models.common.stage_runs.instance import check as check_v5

        try:
            check_v5(self.to_engine_dict())
        except (KeyError, TypeError, ValueError) as exc:
            message = str(exc) or exc.__class__.__name__
            raise ValueError(f"Input violates scheduling contract: {message}") from exc
        return self

    def to_engine_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json", exclude_none=True)


def _schema_tag(value: Any) -> str:
    if isinstance(value, dict):
        version = value.get("schema_version")
    else:
        version = getattr(value, "schema_version", None)
    # Everything but 5 goes to the schema-4 model, which also upgrades legacy v3 documents.
    return "v5" if version == 5 else "v4"


# Either production model; `schema_version` picks the validator.
AnySchedulingInput = Annotated[
    Annotated[SchedulingInput, Tag("v4")] | Annotated[SchedulingInputV5, Tag("v5")],
    Discriminator(_schema_tag),
]


Algorithm = Literal[
    "fifo",
    "edd",
    "spt",
    "simulated_annealing",
    "genetic_algorithm",
    "cp_sat",
    "cp_sat_hint",
    "cp_lns",
    "cp_rolling",
]


class ScheduleRunCreate(StrictModel):
    input: AnySchedulingInput | None = None
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


class ScheduleEditRequest(StrictModel):
    """A planner's edit of a succeeded schema-5 run: the full run order per machine
    (moving a run = taking it out of one list and into another), the runs the planner
    moved (they go as early as their new place allows; every other run keeps its old
    start as a lower bound unless `compact`), and earliest starts in horizon minutes."""

    sequence: dict[str, list[str]] = Field(min_length=1)
    moved: list[str] = Field(default_factory=list, max_length=2000)
    not_before: dict[str, NonNegativeInt] = Field(default_factory=dict)
    compact: bool = False
    label: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=1000)


class ScheduleOptimizeRequest(ScheduleEditRequest):
    """Re-optimise around an edit: the planner's pins (and, with keep_edited, every run
    they moved or gave an earliest start) keep machine and time; so does every run
    starting before freeze_until (a frozen zone, in horizon minutes). The rest is
    re-sequenced by CP-SAT neighbourhood search within time_budget_seconds."""

    pinned: list[str] = Field(default_factory=list, max_length=5000)
    keep_edited: bool = True
    freeze_until: NonNegativeInt | None = None
    time_budget_seconds: float = Field(default=60, gt=0)
    seed: int = Field(default=11, ge=0, le=2_147_483_647)


class ScheduleEditIssue(StrictModel):
    code: str
    subject: str | None = None
    minute: int | None = None
    raw: str
    runs: list[str] = Field(default_factory=list)


class ScheduleEditChange(StrictModel):
    run: str
    stage: str
    from_machine: str
    to_machine: str
    from_start: int
    to_start: int


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
    input: AnySchedulingInput
    expected_revision: PositiveInt | None = None


class ProductCreate(StrictModel):
    expected_revision: PositiveInt
    code: str = Field(min_length=1, max_length=100, pattern=r"^[A-Z0-9][A-Z0-9_-]*$")
    color: str = Field(min_length=1, max_length=40)
    line: str = Field(min_length=1, max_length=10)
    initial_inventory: NonNegativeInt = 0
    safety_stock: NonNegativeInt = 0

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        return value.strip().upper() if isinstance(value, str) else value


class ProductUpdate(StrictModel):
    expected_revision: PositiveInt
    color: str = Field(min_length=1, max_length=40)
    line: str = Field(min_length=1, max_length=10)
    initial_inventory: NonNegativeInt
    safety_stock: NonNegativeInt


class BtpInventoryUpsert(StrictModel):
    expected_revision: PositiveInt
    initial_qty: NonNegativeInt
    capacity: PositiveInt | None = None


class BtpCodeCreate(StrictModel):
    expected_revision: PositiveInt
    code: str = Field(min_length=1, max_length=100, pattern=r"^[A-Z0-9][A-Z0-9_-]*$")

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        return value.strip().upper() if isinstance(value, str) else value


class BtpCodeRename(StrictModel):
    expected_revision: PositiveInt
    code: str = Field(min_length=1, max_length=100, pattern=r"^[A-Z0-9][A-Z0-9_-]*$")

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        return value.strip().upper() if isinstance(value, str) else value


class BtpRoutingSet(StrictModel):
    expected_revision: PositiveInt
    btp_code: str = Field(min_length=1, max_length=100)


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
    # Schema 5: fixed runs over every stage (lots = runs of the last stage).
    runs: int | None = None


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
    # The planning period that compiled this scenario (edit it there), if any.
    owner_period_id: str | None = None
    created_at: datetime
    updated_at: datetime


class MasterDatasetDetail(MasterDatasetSummary):
    input: AnySchedulingInput


class MasterDatasetList(StrictModel):
    items: list[MasterDatasetSummary]
    total: int
    limit: int
    offset: int


class ScheduleOperationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lot: str
    item: str | None = None
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
    shift: str | None


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


class ScheduleEditPreview(StrictModel):
    valid: bool
    issues: list[ScheduleEditIssue]
    metrics: dict[str, Any] | None
    base_metrics: dict[str, Any]
    changes: list[ScheduleEditChange]
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


class ScheduleDecisionCreate(StrictModel):
    """What the planner saw when committing; algorithm, seed and snapshot come from the run."""

    run_id: str = Field(min_length=1, max_length=36)
    alternative: str = Field(min_length=1, max_length=200)
    policy: str = Field(min_length=1, max_length=80)
    score: str = Field(max_length=80)
    late: NonNegativeInt
    shortfall: float = Field(ge=0)
    shifts: NonNegativeInt
    reason: str = Field(min_length=1, max_length=2000)
    # Only for importing decisions recorded in a browser before the server stored them.
    decided_at: datetime | None = None
    legacy_key: str | None = Field(default=None, min_length=1, max_length=200)

    @field_validator("reason")
    @classmethod
    def reason_is_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("reason must not be blank: a decision has to be explainable")
        return value


class ScheduleDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str | None
    run_id: str | None
    dataset_revision: int | None
    input_hash: str
    algorithm: str
    seed: int
    alternative: str
    policy: str
    score: str
    late: int
    shortfall: float
    shifts: int
    reason: str
    actor: str
    decided_at: datetime
    created_at: datetime


class ScheduleDecisionList(StrictModel):
    items: list[ScheduleDecisionResponse]
    total: int
    limit: int
    offset: int
