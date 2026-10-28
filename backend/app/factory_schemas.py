"""API models for factories, the order book and planning periods (see factory_model.py)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .factory_model import CalendarException, FactoryConfig, PeriodInputs, PeriodOrder, StockLevels

PositiveInt = Annotated[int, Field(gt=0)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IssueResponse(StrictModel):
    severity: Literal["error", "warning", "info"]
    code: str
    vi: str
    en: str
    ref: str | None = None


# ---------------------------------------------------------------- factories


class FactoryImport(StrictModel):
    """Create a factory from a schema-5 document (tier 1 or tier 2): plant + first period."""

    name: str = Field(min_length=1, max_length=200)
    document: dict[str, Any]
    create_period: bool = True


class FactoryCreate(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    config: FactoryConfig


class FactoryConfigUpdate(StrictModel):
    expected_version: PositiveInt
    config: FactoryConfig
    effective_from: date | None = None
    note: str | None = Field(default=None, max_length=1000)


class FactoryRename(StrictModel):
    name: str = Field(min_length=1, max_length=200)


class FactoryVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    version: int
    effective_from: str | None
    note: str | None
    changes: list[dict[str, Any]]
    actor: str
    created_at: datetime


class FactoryCounts(StrictModel):
    products: int
    machines: int
    open_orders: int
    periods: int


class FactorySummary(StrictModel):
    id: str
    name: str
    current_version: int
    counts: FactoryCounts
    created_at: datetime
    updated_at: datetime


class FactoryDetail(FactorySummary):
    config: FactoryConfig
    versions: list[FactoryVersionResponse]


class FactoryList(StrictModel):
    items: list[FactorySummary]
    total: int


class FactoryVersionDetail(FactoryVersionResponse):
    config: FactoryConfig


# ---------------------------------------------------------------- order book


OrderStatus = Literal["open", "delivered", "cancelled"]
Pickup = Literal["at_due", "when_ready"]


class BookOrderFields(StrictModel):
    product: str = Field(min_length=1, max_length=100)
    quantity: PositiveInt
    due: str
    priority: Annotated[int, Field(ge=1, le=9)] = 2
    pickup: Pickup = "at_due"
    customer: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=500)


class BookOrderCreate(BookOrderFields):
    code: str = Field(min_length=1, max_length=100)


class BookOrderUpdate(BookOrderFields):
    status: OrderStatus = "open"


class BookOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    product: str
    quantity: int
    due: str
    priority: int
    pickup: str
    customer: str | None
    note: str | None
    status: str
    delivered_at: str | None
    delivered_period_id: str | None
    source: str
    created_at: datetime
    updated_at: datetime


class BookOrderList(StrictModel):
    items: list[BookOrderResponse]
    total: int
    limit: int
    offset: int


class OrderImportRequest(StrictModel):
    format: Literal["csv", "tsv", "xlsx"]
    # Text for csv/tsv (a paste from Excel is tsv); base64 for xlsx.
    content: str = Field(min_length=1, max_length=8_000_000)
    mode: Literal["upsert", "replace_open"] = "upsert"
    commit: bool = False
    skip_invalid: bool = False


class OrderImportMessage(StrictModel):
    vi: str
    en: str


class OrderImportRow(StrictModel):
    row: int
    values: dict[str, Any]
    action: Literal["add", "update", "unchanged", "invalid", "locked"]
    errors: list[OrderImportMessage]
    warnings: list[OrderImportMessage]
    changes: list[str] = Field(default_factory=list)


class OrderImportSummary(StrictModel):
    add: int
    update: int
    unchanged: int
    invalid: int
    locked: int
    cancel: int


class OrderImportResult(StrictModel):
    columns: dict[str, str]
    unmatched_headers: list[str]
    missing_columns: list[str]
    rows: list[OrderImportRow]
    cancel: list[str]
    summary: OrderImportSummary
    committed: bool


class OutlookStage(StrictModel):
    stage: str
    need_minutes: int
    available_minutes: int
    ratio: float | None


class OutlookWeek(StrictModel):
    start: str
    end: str
    orders: int
    demand: dict[str, int]
    stages: list[OutlookStage]


class OutlookResponse(StrictModel):
    weeks: list[OutlookWeek]
    overdue_orders: int
    open_orders: int
    unscheduled_soon: int


# ---------------------------------------------------------------- planning periods


PeriodStatus = Literal["draft", "needs_fix", "ready", "solving", "options", "committed", "closed"]


class PeriodCreate(StrictModel):
    factory_id: str = Field(min_length=36, max_length=36)
    start_date: date
    days: Annotated[int, Field(ge=1, le=62)] | None = None
    name: str | None = Field(default=None, max_length=200)
    # Opening stock: projected from the previous committed period, or all zero.
    opening: Literal["previous", "zero"] = "previous"
    pull_orders: bool = True


class PeriodInputsUpdate(StrictModel):
    expected_revision: PositiveInt
    inputs: PeriodInputs


class PeriodRename(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    variant_label: str | None = Field(default=None, max_length=120)


class VariantCreate(StrictModel):
    label: str = Field(min_length=1, max_length=120)


class RescheduleCreate(StrictModel):
    cutoff: str
    label: str | None = Field(default=None, max_length=120)
    exceptions: list[CalendarException] = Field(default_factory=list)
    add_orders: list[PeriodOrder] = Field(default_factory=list)


class RolloverCreate(StrictModel):
    start_date: date | None = None
    days: Annotated[int, Field(ge=1, le=62)] | None = None
    name: str | None = Field(default=None, max_length=200)


class PeriodDecisionInfo(StrictModel):
    period_id: str
    run_id: str | None
    alternative: str
    policy: str
    decided_at: datetime
    dataset_revision: int | None
    current: bool


class PeriodRunCounts(StrictModel):
    total: int
    current: int
    succeeded: int
    active: int
    failed: int


class PeriodCounts(StrictModel):
    orders: int
    scheduled: int
    long_term: int
    exceptions: int
    errors: int
    warnings: int


class PeriodSummary(StrictModel):
    id: str
    factory_id: str
    factory_version: int
    name: str
    start_date: str
    end_date: str
    days: int
    kind: str
    parent_id: str | None
    variant_label: str | None
    revision: int
    dataset_id: str | None
    dataset_revision: int | None
    compiled_revision: int | None
    status: PeriodStatus
    counts: PeriodCounts
    runs: PeriodRunCounts
    decision: PeriodDecisionInfo | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PeriodFactoryInfo(StrictModel):
    name: str
    utc_offset: str
    pinned_version: int
    applicable_version: int
    latest_version: int


class BookSyncChange(StrictModel):
    code: str
    fields: list[str]


class BookSync(StrictModel):
    added: list[str]
    changed: list[BookSyncChange]
    removed: list[str]


class PeriodDetail(PeriodSummary):
    inputs: PeriodInputs
    issues: list[IssueResponse]
    load: list[dict[str, Any]]
    factory: PeriodFactoryInfo
    family: list[PeriodSummary]
    changes_vs_parent: list[dict[str, Any]]
    book_sync: BookSync


class PeriodList(StrictModel):
    items: list[PeriodSummary]
    total: int


class StateResponse(StrictModel):
    at: str
    source_period_id: str
    run_id: str
    finished: dict[str, int]
    btp: dict[str, int]
    molds: dict[str, int]
    delivered: dict[str, str]
    earmarked: dict[str, int]
    busy_until: dict[str, str]
    in_progress: list[str]
    started: int
    total_runs: int


class StockCompare(StrictModel):
    projected: StockLevels
    actual: StockLevels
