"""Factory configuration and planning periods: the planner-facing data model.

Data is split by how often it changes (see docs/_product/factory-periods.md):

* FactoryConfig -- the plant: stages, run sizes, products and routes, machines,
  setups, molds, shift template, weekly rest days, holidays, recurring
  maintenance and objective policies. Versioned; changes a few times a year.
* PeriodInputs  -- one scheduling period (usually 2 weeks): orders, opening
  stock, mold counters, calendar exceptions, the policy and pull-ahead choice.
  Changes every period, mostly carried over from the previous one.

compile_period() turns (config, period) into the schema-5 tier-1 document and
runs it through models.common.stage_runs.prepare, the same step the research
datasets use, so the engine, validator and KPIs are untouched. Everything
derivable (lots, lot allocations, runs, checkpoints, minute offsets, downtime
from calendars) is derived here and never typed in by a planner.

Times a planner sees are wall-clock strings in the factory's local time
("2026-10-06T16:00"); the engine works in minutes from the period start.
"""

from __future__ import annotations

import copy
import math
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Annotated, Any, Literal

from models.common.stage_runs.prepare import PrepError, check_raw, prepare, stage_load
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

DAY = 1440
WEIGHT_KEYS = (
    "makespan",
    "weighted_tardiness",
    "setup_minutes",
    "maintenance_minutes",
    "nonproductive_minutes",
    "idle_minutes",
    "safety_shortfall",
    "reserve_units",
    "reserve_production",
    "surplus_holding",
    "btp_end_units",
)
LOCAL_DT = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$")

NonNegativeInt = Annotated[int, Field(ge=0)]
PositiveInt = Annotated[int, Field(gt=0)]
Code = Annotated[str, Field(min_length=1, max_length=100)]
MinuteOfDay = Annotated[int, Field(ge=0, le=DAY)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------------------------------------------------------------- factory configuration


class FactoryShift(StrictModel):
    """One shift of the daily template, in minutes from midnight."""

    name: str | None = Field(default=None, max_length=80)
    start: MinuteOfDay
    end: MinuteOfDay
    breaks: list[tuple[MinuteOfDay, MinuteOfDay]] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_times(self) -> FactoryShift:
        if self.start >= self.end:
            raise ValueError("a shift must end after it starts (same day)")
        for a, b in self.breaks:
            if not self.start <= a < b <= self.end:
                raise ValueError("a break must lie inside its shift")
        return self


class FactoryProduct(StrictModel):
    name: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=40)
    line: str | None = Field(default=None, max_length=20)
    route: dict[str, Code] = Field(min_length=1)
    safety_stock: NonNegativeInt
    stock_cap: PositiveInt


class FactoryBtp(StrictModel):
    name: str | None = Field(default=None, max_length=120)
    capacity: PositiveInt | None = None


class FactoryMachine(StrictModel):
    name: str | None = Field(default=None, max_length=120)
    stage: str = Field(min_length=1, max_length=40)
    calendar: Literal["shifts", "continuous"] = "shifts"
    minutes_per_unit: dict[str, Annotated[int | float, Field(ge=0)]] = Field(min_length=1)
    fixed_minutes: NonNegativeInt
    setup: dict[str, dict[str, NonNegativeInt]] = Field(min_length=1)
    mold_change_minutes: NonNegativeInt | None = None


class FactoryMold(StrictModel):
    item: Code
    cavities: PositiveInt
    limit_cycles: PositiveInt
    maintenance_minutes: PositiveInt
    after_maintenance: Code


class MaintenanceRule(StrictModel):
    """Planned maintenance repeating every week on one machine."""

    machine: Code
    weekday: Annotated[int, Field(ge=0, le=6)]  # 0 = Monday
    start: MinuteOfDay
    end: MinuteOfDay
    note: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def check_times(self) -> MaintenanceRule:
        if self.start >= self.end:
            raise ValueError("maintenance must end after it starts")
        return self


class ObjectivePolicy(StrictModel):
    """A named way of weighing the objective terms, picked per period."""

    key: str = Field(min_length=1, max_length=40, pattern=r"^[a-z0-9_-]+$")
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=300)
    weights: dict[str, Annotated[int | float, Field(ge=0)]] = Field(min_length=1)
    tier1: list[str] = Field(default_factory=list)
    scale: Annotated[int | float, Field(gt=0)] = 1

    @model_validator(mode="after")
    def check_terms(self) -> ObjectivePolicy:
        unknown = set(self.weights) - set(WEIGHT_KEYS)
        if unknown:
            raise ValueError(f"unknown objective terms {sorted(unknown)}")
        if not set(self.tier1) <= set(self.weights):
            raise ValueError("tier1 must name weighted terms")
        return self


class FactoryConfig(StrictModel):
    utc_offset: str = Field(default="+07:00", pattern=r"^[+-]\d{2}:\d{2}$")
    stages: list[str] = Field(min_length=2)
    stage_names: dict[str, str] = Field(default_factory=dict)
    run_size: dict[str, PositiveInt]
    transfer_minutes: dict[str, NonNegativeInt]
    machine_initial_state: str = Field(default="INITIAL", min_length=1, max_length=100)
    shift_template: dict[str, FactoryShift] = Field(min_length=1)
    weekly_off: list[Annotated[int, Field(ge=0, le=6)]] = Field(default_factory=list)
    holidays: list[date] = Field(default_factory=list)
    maintenance_rules: list[MaintenanceRule] = Field(default_factory=list)
    default_due_time: str = Field(default="16:00", pattern=r"^\d{2}:\d{2}$")
    lookahead_days: Annotated[int, Field(ge=0, le=180)] = 28
    period_days: Annotated[int, Field(ge=1, le=62)] = 14
    products: dict[str, FactoryProduct] = Field(min_length=1)
    btp: dict[str, FactoryBtp] = Field(default_factory=dict)
    machines: dict[str, FactoryMachine] = Field(min_length=1)
    molds: dict[str, FactoryMold] = Field(default_factory=dict)
    policies: list[ObjectivePolicy] = Field(min_length=1)
    default_policy: str

    @field_validator("weekly_off", "holidays")
    @classmethod
    def unique_sorted(cls, value: list[Any]) -> list[Any]:
        return sorted(set(value))

    @model_validator(mode="after")
    def check_plant(self) -> FactoryConfig:
        errors = factory_errors(self)
        if errors:
            raise ValueError("; ".join(errors))
        return self

    def policy(self, key: str | None) -> ObjectivePolicy:
        wanted = key or self.default_policy
        return next((p for p in self.policies if p.key == wanted), self.policies[0])


def factory_errors(config: FactoryConfig) -> list[str]:
    """Plant-level consistency, independent of any period. Empty list = usable."""
    errors: list[str] = []
    stages = config.stages
    if len(set(stages)) != len(stages):
        errors.append("stages must be unique")
    shifts = sorted((s.start, s.end) for s in config.shift_template.values())
    if any(a[1] > b[0] for a, b in zip(shifts, shifts[1:], strict=False)):
        errors.append("shifts of the template overlap")
    keys = [p.key for p in config.policies]
    if len(set(keys)) != len(keys):
        errors.append("policy keys must be unique")
    if config.default_policy not in keys:
        errors.append(f"default_policy '{config.default_policy}' is not a policy")
    clash = set(config.products) & set(config.btp)
    if clash:
        errors.append(f"codes used both as product and semi-finished item: {sorted(clash)}")
    for rule in config.maintenance_rules:
        if rule.machine not in config.machines:
            errors.append(f"maintenance rule names unknown machine '{rule.machine}'")
    for code, product in config.products.items():
        if product.safety_stock > product.stock_cap:
            errors.append(f"{code}: safety stock above the stock cap")
    if errors:
        return errors
    # The rest of the contract is the preparation step's own (routes, setup rows,
    # molds): check it on an empty period so the rules live in one place.
    raw = _raw_skeleton(config, horizon=DAY, origin="2000-01-03T00:00:00+00:00")
    try:
        check_raw(raw)
    except (PrepError, KeyError, StopIteration) as exc:
        errors.append(str(exc) or exc.__class__.__name__)
    return errors


def _raw_skeleton(config: FactoryConfig, *, horizon: int, origin: str) -> dict[str, Any]:
    policy = config.policy(None)
    return {
        "name": "factory",
        "origin": origin,
        "time_unit": "minute",
        "horizon": horizon,
        "stages": list(config.stages),
        "run_size": dict(config.run_size),
        "transfer_minutes": dict(config.transfer_minutes),
        "checkpoints": [horizon],
        "machine_initial_state": config.machine_initial_state,
        "shift_template": {
            key: {
                "start": s.start,
                "end": s.end,
                **({"breaks": [list(b) for b in s.breaks]} if s.breaks else {}),
            }
            for key, s in config.shift_template.items()
        },
        "products": {
            code: {
                "route": dict(p.route),
                "initial_stock": 0,
                "safety_stock": p.safety_stock,
                "stock_cap": p.stock_cap,
            }
            for code, p in config.products.items()
        },
        "btp": {
            code: {"initial_stock": 0, **({"capacity": b.capacity} if b.capacity else {})}
            for code, b in config.btp.items()
        },
        "machines": {
            mid: {
                "stage": m.stage,
                **({"calendar": "continuous"} if m.calendar == "continuous" else {}),
                "minutes_per_unit": dict(m.minutes_per_unit),
                "fixed_minutes": m.fixed_minutes,
                **(
                    {"mold_change_minutes": m.mold_change_minutes}
                    if m.mold_change_minutes is not None
                    else {}
                ),
                "setup": copy.deepcopy(m.setup),
                "downtime": [],
            }
            for mid, m in config.machines.items()
        },
        "molds": {
            k: {
                "item": m.item,
                "cavities": m.cavities,
                "limit_cycles": m.limit_cycles,
                "initial_cycles": 0,
                "maintenance_minutes": m.maintenance_minutes,
                "after_maintenance": m.after_maintenance,
            }
            for k, m in config.molds.items()
        },
        "orders": [],
        "long_term_orders": [],
        "weights": dict(policy.weights),
        **(
            {"objective_tiers": {"tier1": list(policy.tier1), "scale": policy.scale}}
            if policy.tier1
            else {}
        ),
    }


# ---------------------------------------------------------------- period inputs


def parse_local(value: str) -> datetime:
    if not LOCAL_DT.match(value):
        raise ValueError(f"'{value}' is not a local date-time (YYYY-MM-DDTHH:MM)")
    return datetime.fromisoformat(value)


def format_local(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M")


class PeriodOrder(StrictModel):
    code: Code
    product: Code
    quantity: PositiveInt
    due: str
    priority: Annotated[int, Field(ge=1, le=9)] = 2
    pickup: Literal["at_due", "when_ready"] = "at_due"
    # Finished units already earmarked for this order; None = allocate automatically.
    from_stock: NonNegativeInt | None = None
    customer: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=500)
    source: Literal["book", "manual", "carried"] = "manual"

    @field_validator("due")
    @classmethod
    def check_due(cls, value: str) -> str:
        return format_local(parse_local(value))


class CalendarException(StrictModel):
    id: str = Field(min_length=1, max_length=40)
    machine: str | None = Field(default=None, max_length=100)  # None = whole factory
    start: str
    end: str
    kind: Literal["maintenance", "breakdown", "closed", "other"] = "maintenance"
    note: str | None = Field(default=None, max_length=300)

    @field_validator("start", "end")
    @classmethod
    def check_time(cls, value: str) -> str:
        return format_local(parse_local(value))

    @model_validator(mode="after")
    def check_span(self) -> CalendarException:
        if parse_local(self.start) >= parse_local(self.end):
            raise ValueError("an exception must end after it starts")
        return self


class StockLevels(StrictModel):
    finished: dict[str, NonNegativeInt] = Field(default_factory=dict)
    btp: dict[str, NonNegativeInt] = Field(default_factory=dict)
    molds: dict[str, NonNegativeInt] = Field(default_factory=dict)


class OpeningState(StockLevels):
    # What the previous committed schedule projected for this moment, kept so the
    # planner sees which counts were corrected to the actual ones.
    projected: StockLevels | None = None
    as_of: str | None = None


class ReservePolicy(StrictModel):
    finished_lots: NonNegativeInt = 0
    btp_runs: dict[str, PositiveInt] = Field(default_factory=dict)


class PeriodInputs(StrictModel):
    orders: list[PeriodOrder] = Field(default_factory=list)
    opening: OpeningState = Field(default_factory=OpeningState)
    exceptions: list[CalendarException] = Field(default_factory=list)
    policy: str | None = None
    reserve_policy: dict[str, ReservePolicy] = Field(default_factory=dict)
    # Rescheduling: minutes from the period start that already happened, and
    # machines still busy with a run started before then (machine -> minute).
    frozen_until: NonNegativeInt | None = None
    busy_until: dict[str, NonNegativeInt] = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------- compile


@dataclass
class Issue:
    severity: Literal["error", "warning", "info"]
    code: str
    vi: str
    en: str
    ref: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "severity": self.severity,
            "code": self.code,
            "vi": self.vi,
            "en": self.en,
            "ref": self.ref,
        }


@dataclass
class CompileResult:
    raw: dict[str, Any] | None
    model: dict[str, Any] | None
    issues: list[Issue] = field(default_factory=list)
    load: list[dict[str, Any]] = field(default_factory=list)
    scheduled_orders: int = 0
    long_term_orders: int = 0

    @property
    def ok(self) -> bool:
        return self.model is not None and not any(i.severity == "error" for i in self.issues)


def origin_of(config: FactoryConfig, start_date: date) -> str:
    return f"{start_date.isoformat()}T00:00:00{config.utc_offset}"


def merge(spans: list[tuple[int, int]]) -> list[list[int]]:
    out: list[list[int]] = []
    for a, b in sorted(spans):
        if b <= a:
            continue
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def downtime_by_machine(
    config: FactoryConfig, start_date: date, days: int, inputs: PeriodInputs | None = None
) -> dict[str, list[list[int]]]:
    """Minutes each machine is unavailable, from the plant calendar and the period's exceptions."""
    horizon = days * DAY
    holes: dict[str, list[tuple[int, int]]] = {m: [] for m in config.machines}
    closed_days = closed_day_indexes(config, start_date, days)
    for d in closed_days:
        for m in holes:
            holes[m].append((d * DAY, (d + 1) * DAY))
    for d in range(days):
        if d in closed_days:
            continue
        weekday = (start_date + timedelta(days=d)).weekday()
        for rule in config.maintenance_rules:
            if rule.weekday == weekday and rule.machine in holes:
                holes[rule.machine].append((d * DAY + rule.start, d * DAY + rule.end))
    if inputs is not None:
        start = datetime.combine(start_date, datetime.min.time())
        for exc in inputs.exceptions:
            a = _minutes(parse_local(exc.start), start)
            b = _minutes(parse_local(exc.end), start)
            a, b = max(0, a), min(horizon, b)
            if b <= a:
                continue
            for m in [exc.machine] if exc.machine else list(holes):
                if m in holes:
                    holes[m].append((a, b))
        if inputs.frozen_until:
            for m in holes:
                holes[m].append((0, min(horizon, inputs.frozen_until)))
        for m, until in inputs.busy_until.items():
            if m in holes:
                holes[m].append((inputs.frozen_until or 0, min(horizon, until)))
    return {m: merge(spans) for m, spans in holes.items()}


def closed_day_indexes(config: FactoryConfig, start_date: date, days: int) -> set[int]:
    holidays = set(config.holidays)
    return {
        d
        for d in range(days)
        if (start_date + timedelta(days=d)).weekday() in config.weekly_off
        or (start_date + timedelta(days=d)) in holidays
    }


def _minutes(value: datetime, start: datetime) -> int:
    return int((value - start).total_seconds() // 60)


def allocate_from_stock(
    config: FactoryConfig,
    orders: list[PeriodOrder],
    opening: dict[str, int],
    due_min: dict[str, int],
) -> dict[str, int]:
    """Finished units each in-period order takes from opening stock.

    Explicit from_stock (units earmarked for an order, e.g. made for it last
    period) is honoured first. The rest is automatic: only stock above the
    safety level serves orders, earliest due first -- the safety stock itself
    is for the next unexpected order, not for this period's known ones.
    """
    out: dict[str, int] = {}
    left = dict(opening)
    for o in orders:
        if o.from_stock is not None:
            out[o.code] = o.from_stock
            left[o.product] = left.get(o.product, 0) - o.from_stock
    for o in sorted(
        (o for o in orders if o.from_stock is None), key=lambda o: (due_min[o.code], o.code)
    ):
        product = config.products.get(o.product)
        free = left.get(o.product, 0) - (product.safety_stock if product else 0)
        take = max(0, min(o.quantity, free))
        out[o.code] = take
        left[o.product] = left.get(o.product, 0) - take
    return out


_PREP_PATTERNS: list[tuple[re.Pattern[str], str, str, str]] = [
    (
        re.compile(r"stage (\w+): mandatory runs need (\d+) min, machines have (\d+)"),
        "STAGE_OVERLOAD",
        "Công đoạn {0} quá tải: cần ít nhất {1} phút máy, chỉ có {2} phút. Giảm đơn, dời hạn, hoặc mở thêm năng lực (bỏ ngày nghỉ/bảo trì).",
        "Stage {0} is overloaded: needs at least {1} machine-minutes, only {2} available. Reduce orders, move due dates or add capacity.",
    ),
    (
        re.compile(r"reserve_policy for (\w+): (\d+) units > pull-ahead cap (-?\d+)"),
        "RESERVE_OVER_CAP",
        "Làm trước cho {0}: {1} sản phẩm vượt nhu cầu dài hạn còn lại ({2}). Giảm số lô làm trước hoặc thêm đơn dài hạn.",
        "Pull-ahead for {0}: {1} units exceed the remaining long-term demand ({2}). Reduce pull-ahead lots or add long-term orders.",
    ),
    (
        re.compile(r"(\w+): initial_stock above stock_cap"),
        "STOCK_ABOVE_CAP",
        "Tồn đầu kỳ của {0} vượt trần tồn kho.",
        "Opening stock of {0} is above its stock cap.",
    ),
    (
        re.compile(r"(\w+): orders take (\d+) from stock, only (\d+)"),
        "STOCK_OVERALLOCATED",
        "Các đơn {0} lấy {1} sản phẩm từ kho nhưng tồn đầu kỳ chỉ có {2}.",
        "Orders for {0} take {1} units from stock but the opening stock is only {2}.",
    ),
    (
        re.compile(r"options \[(.*)\]: BTP short at end (.*)"),
        "BTP_SHORT",
        "Thiếu bán thành phẩm cuối kỳ khi chọn phương án làm trước {0}: {1}.",
        "Semi-finished stock runs short with pull-ahead options {0}: {1}.",
    ),
]


def _prep_issue(exc: Exception) -> Issue:
    text = str(exc) or exc.__class__.__name__
    for pattern, code, vi, en in _PREP_PATTERNS:
        match = pattern.search(text)
        if match:
            return Issue("error", code, vi.format(*match.groups()), en.format(*match.groups()))
    return Issue(
        "error", "PREPARE_FAILED", f"Dữ liệu chưa hợp lệ: {text}", f"The data is not valid: {text}"
    )


def compile_period(
    config: FactoryConfig,
    start_date: date,
    days: int,
    inputs: PeriodInputs,
    *,
    name: str,
    derived_from: str,
) -> CompileResult:
    """(plant, period) -> schema-5 model input, or the reasons it cannot be built."""
    issues: list[Issue] = []
    horizon = days * DAY
    start = datetime.combine(start_date, datetime.min.time())
    floor = min(inputs.frozen_until or 0, horizon)

    codes = [o.code for o in inputs.orders]
    for code in sorted({c for c in codes if codes.count(c) > 1}):
        issues.append(
            Issue(
                "error",
                "DUPLICATE_ORDER",
                f"Mã đơn {code} bị trùng.",
                f"Order code {code} is duplicated.",
                code,
            )
        )
    known = [o for o in inputs.orders if o.product in config.products]
    for o in inputs.orders:
        if o.product not in config.products:
            issues.append(
                Issue(
                    "error",
                    "UNKNOWN_PRODUCT",
                    f"Đơn {o.code}: sản phẩm {o.product} không có trong cấu hình nhà máy.",
                    f"Order {o.code}: product {o.product} is not in the factory configuration.",
                    o.code,
                )
            )
        if o.from_stock is not None and o.from_stock > o.quantity:
            issues.append(
                Issue(
                    "error",
                    "FROM_STOCK_ABOVE_QTY",
                    f"Đơn {o.code}: lấy từ kho ({o.from_stock}) nhiều hơn số lượng đặt ({o.quantity}).",
                    f"Order {o.code}: takes {o.from_stock} from stock, more than the {o.quantity} ordered.",
                    o.code,
                )
            )

    due_min = {o.code: _minutes(parse_local(o.due), start) for o in known}
    lookahead = horizon + config.lookahead_days * DAY
    scheduled = [o for o in known if due_min[o.code] <= horizon]
    long_term = [o for o in known if horizon < due_min[o.code] <= lookahead]
    for o in scheduled:
        if due_min[o.code] < floor:
            issues.append(
                Issue(
                    "warning",
                    "ORDER_OVERDUE",
                    f"Đơn {o.code} đã quá hạn ({parse_local(o.due):%d/%m %H:%M}); lịch tính hạn là thời điểm bắt đầu.",
                    f"Order {o.code} is already overdue ({parse_local(o.due):%d/%m %H:%M}); the schedule counts its due time from the start.",
                    o.code,
                )
            )
    if not scheduled:
        issues.append(
            Issue(
                "error",
                "NO_ORDERS",
                "Kỳ chưa có đơn nào có hạn giao trong kỳ.",
                "The period has no order due within it.",
                None,
            )
        )

    opening = {p: inputs.opening.finished.get(p, 0) for p in config.products}
    allocation = allocate_from_stock(config, scheduled, opening, due_min)
    taken: dict[str, int] = defaultdict(int)
    for o in scheduled:
        taken[o.product] += allocation[o.code]
    for p, qty in taken.items():
        if qty > opening.get(p, 0):
            issues.append(
                Issue(
                    "error",
                    "STOCK_OVERALLOCATED",
                    f"Các đơn {p} lấy {qty} sản phẩm từ kho nhưng tồn đầu kỳ chỉ có {opening.get(p, 0)}.",
                    f"Orders for {p} take {qty} units from stock but the opening stock is only {opening.get(p, 0)}.",
                    p,
                )
            )
    # Goods already made cannot be thrown away: an opening above the cap (e.g. a
    # reschedule cut mid-day, the cap is only checked at day ends) lifts this
    # period's cap to the opening instead of making the period unplannable.
    caps = {p: max(config.products[p].stock_cap, qty) for p, qty in opening.items()}
    for p, qty in opening.items():
        if qty > config.products[p].stock_cap:
            issues.append(
                Issue(
                    "warning",
                    "STOCK_ABOVE_CAP",
                    f"Tồn đầu kỳ của {p} ({qty}) vượt trần tồn kho ({config.products[p].stock_cap}); trần của kỳ này tạm nâng lên {qty}.",
                    f"Opening stock of {p} ({qty}) is above its cap ({config.products[p].stock_cap}); this period's cap is raised to {qty}.",
                    p,
                )
            )
    for code in inputs.opening.finished:
        if code not in config.products:
            issues.append(
                Issue(
                    "warning",
                    "UNKNOWN_STOCK",
                    f"Tồn kho của mã {code} bị bỏ qua: không phải sản phẩm của nhà máy.",
                    f"Stock of {code} is ignored: not a product of the factory.",
                    code,
                )
            )
    for code in inputs.opening.btp:
        if code not in config.btp:
            issues.append(
                Issue(
                    "warning",
                    "UNKNOWN_STOCK",
                    f"Tồn bán thành phẩm {code} bị bỏ qua: mã không có trong nhà máy.",
                    f"Semi-finished stock of {code} is ignored: unknown code.",
                    code,
                )
            )
    for exc in inputs.exceptions:
        if exc.machine and exc.machine not in config.machines:
            issues.append(
                Issue(
                    "warning",
                    "UNKNOWN_MACHINE",
                    f"Ngoại lệ lịch của máy {exc.machine} bị bỏ qua: máy không có.",
                    f"Calendar exception for {exc.machine} is ignored: unknown machine.",
                    exc.id,
                )
            )
    for p, policy in inputs.reserve_policy.items():
        if p not in config.products:
            issues.append(
                Issue(
                    "error",
                    "UNKNOWN_PRODUCT",
                    f"Làm trước: sản phẩm {p} không có.",
                    f"Pull-ahead: unknown product {p}.",
                    p,
                )
            )
        for stage in policy.btp_runs:
            if stage not in config.stages[:-1]:
                issues.append(
                    Issue(
                        "error",
                        "BAD_STAGE",
                        f"Làm trước {p}: công đoạn {stage} không giữ bán thành phẩm.",
                        f"Pull-ahead for {p}: stage {stage} holds no semi-finished stock.",
                        p,
                    )
                )

    raw = _raw_skeleton(config, horizon=horizon, origin=origin_of(config, start_date))
    raw["name"] = name
    policy = config.policy(inputs.policy)
    raw["weights"] = dict(policy.weights)
    raw.pop("objective_tiers", None)
    if policy.tier1:
        raw["objective_tiers"] = {"tier1": list(policy.tier1), "scale": policy.scale}
    raw["checkpoints"] = [d * DAY for d in range(1, days + 1) if d * DAY > floor] or [horizon]
    for p, qty in opening.items():
        raw["products"][p]["initial_stock"] = qty
        raw["products"][p]["stock_cap"] = caps[p]
    for code in raw["btp"]:
        raw["btp"][code]["initial_stock"] = inputs.opening.btp.get(code, 0)
    for k, mold in raw["molds"].items():
        mold["initial_cycles"] = min(inputs.opening.molds.get(k, 0), mold["limit_cycles"])
    for m, spans in downtime_by_machine(config, start_date, days, inputs).items():
        raw["machines"][m]["downtime"] = spans
    orders = []
    for o in scheduled:
        due = max(due_min[o.code], floor)
        orders.append(
            {
                "id": o.code,
                "product": o.product,
                "quantity": o.quantity,
                "due": due,
                "priority": o.priority,
                "release": due if o.pickup == "at_due" else floor,
                "initial_allocated": allocation[o.code],
            }
        )
    raw["orders"] = orders
    raw["long_term_orders"] = [
        {"id": o.code, "product": o.product, "quantity": o.quantity, "due": due_min[o.code]}
        for o in long_term
    ]
    reserve = {
        p: {
            k: v
            for k, v in (("finished_lots", r.finished_lots), ("btp_runs", dict(r.btp_runs)))
            if v
        }
        for p, r in inputs.reserve_policy.items()
        if p in config.products and (r.finished_lots or r.btp_runs)
    }
    if reserve:
        raw["reserve_policy"] = reserve

    result = CompileResult(
        raw=raw,
        model=None,
        issues=issues,
        scheduled_orders=len(scheduled),
        long_term_orders=len(long_term),
    )
    if any(i.severity == "error" for i in issues):
        return result
    try:
        model = prepare(copy.deepcopy(raw), derived_from=derived_from)
    except (PrepError, KeyError, ValueError, StopIteration) as exc:
        result.issues.append(_prep_issue(exc))
        return result
    # Same validator the scenario import uses, so a compiled period is always runnable.
    from .schemas import SchedulingInputV5

    try:
        SchedulingInputV5.model_validate(model)
    except ValidationError as exc:
        for error in exc.errors():
            result.issues.append(
                Issue(
                    "error",
                    "MODEL_INVALID",
                    f"Dữ liệu lịch không hợp lệ: {error['msg']}",
                    f"Schedule input is invalid: {error['msg']}",
                )
            )
        return result
    result.model = model
    mandatory = [r for r in model["runs"] if "reserve_option" not in r]
    for stage, (need, have) in stage_load(model, mandatory).items():
        ratio = need / have if have else None
        result.load.append(
            {"stage": stage, "need_minutes": need, "available_minutes": have, "ratio": ratio}
        )
        if ratio is not None and ratio > 0.85:
            result.issues.append(
                Issue(
                    "warning",
                    "STAGE_TIGHT",
                    f"Công đoạn {stage} dùng ≥ {ratio:.0%} thời gian máy (chưa tính setup) — lịch có thể trễ.",
                    f"Stage {stage} needs ≥ {ratio:.0%} of machine time (setups excluded) — schedules may run late.",
                    stage,
                )
            )
    return result


# ---------------------------------------------------------------- state from a committed schedule


@dataclass
class ScheduleState:
    """Where a committed schedule leaves the plant at minute t (of its own period).

    A run already started at t is taken as finished: its input is consumed, its
    output counted and its machine stays busy until it ends (busy_until). A
    delivery happens when its order is released and all of its lots are done.
    """

    finished: dict[str, int]
    btp: dict[str, int]
    molds: dict[str, int]
    delivered: dict[str, int]  # order -> minute delivered
    earmarked: dict[str, int]  # undelivered order -> finished units already made/kept for it
    busy_until: dict[str, int]
    in_progress: list[str]
    started: int
    total_runs: int


def schedule_state(model: dict[str, Any], rows: list[dict[str, Any]], t: int) -> ScheduleState:
    runs = {r["id"]: r for r in model["runs"]}
    stages = model["stages"]
    last = stages[-1]
    size = model["run_size"]
    up: dict[str, str | None] = {}
    for product, spec in model["products"].items():
        chain = [spec["route"][s] for s in stages[:-1]] + [product]
        for k, item in enumerate(chain):
            up[item] = chain[k - 1] if k else None

    started = [r for r in rows if r["block_start"] <= t]
    finished = {p: s["initial_stock"] for p, s in model["products"].items()}
    btp = {c: s["initial_stock"] for c, s in model["btp"].items()}
    for r in started:
        run = runs[r["lot"] if "lot" in r else r["run"]]
        qty = size[run["stage"]]
        if run["stage"] == last:
            finished[run["item"]] = finished.get(run["item"], 0) + qty
        else:
            btp[run["item"]] = btp.get(run["item"], 0) + qty
        if up.get(run["item"]):
            btp[up[run["item"]]] = btp.get(up[run["item"]], 0) - qty

    qc_end = {(r["lot"] if "lot" in r else r["run"]): r["end"] for r in rows if r["stage"] == last}
    qc_started = {(r["lot"] if "lot" in r else r["run"]) for r in started if r["stage"] == last}
    delivered: dict[str, int] = {}
    earmarked: dict[str, int] = {}
    for o in model["orders"]:
        when = max([o["release"]] + [qc_end.get(lot, math.inf) for lot in o["lot_allocations"]])
        if when <= t:
            delivered[o["id"]] = int(when)
            finished[o["product"]] -= o["quantity"]
        else:
            made = sum(q for lot, q in o["lot_allocations"].items() if lot in qc_started)
            earmarked[o["id"]] = o["initial_allocated"] + made
    molds = {k: m["initial_cycles"] for k, m in model.get("molds", {}).items()}
    for r in sorted((r for r in started if r.get("mold")), key=lambda r: r["block_start"]):
        molds[r["mold"]] = r["cycles_after"]
    busy = {}
    in_progress = []
    for r in started:
        if r["end"] > t:
            busy[r["machine"]] = max(busy.get(r["machine"], 0), r["end"])
            in_progress.append(r["lot"] if "lot" in r else r["run"])
    return ScheduleState(
        finished={p: max(0, v) for p, v in finished.items()},
        btp={c: max(0, v) for c, v in btp.items()},
        molds=molds,
        delivered=delivered,
        earmarked=earmarked,
        busy_until=busy,
        in_progress=sorted(in_progress),
        started=len(started),
        total_runs=len(rows),
    )


# ---------------------------------------------------------------- import an existing schema-5 document


@dataclass
class SplitDocument:
    config: FactoryConfig
    start_date: date
    days: int
    inputs: PeriodInputs
    name: str


def split_document(doc: dict[str, Any]) -> SplitDocument:
    """A schema-5 tier-1 (raw) or tier-2 (model) document -> plant + one period.

    Downtime shared by every machine over whole weekdays becomes weekly rest
    days; other whole-plant closed days and per-machine downtime become the
    period's calendar exceptions. Explicit stock allocations are kept, so the
    period compiles back to the same runs.
    """
    origin = datetime.fromisoformat(doc["origin"])
    start_date = origin.date()
    offset = doc["origin"][19:] or "+00:00"
    if offset == "Z":
        offset = "+00:00"
    horizon = int(doc["horizon"])
    days = horizon // DAY
    machines = doc["machines"]

    downtime = {
        m: merge([tuple(d) for d in spec.get("downtime", [])]) for m, spec in machines.items()
    }
    full_days = {
        d
        for d in range(days)
        if all(
            any(a <= d * DAY and (d + 1) * DAY <= b for a, b in spans)
            for spans in downtime.values()
        )
    }
    weekly_off = sorted(
        w
        for w in {(start_date + timedelta(days=d)).weekday() for d in full_days}
        if all(
            d in full_days for d in range(days) if (start_date + timedelta(days=d)).weekday() == w
        )
    )
    rest = {d for d in full_days if (start_date + timedelta(days=d)).weekday() in weekly_off}
    exceptions: list[CalendarException] = []
    start = datetime.combine(start_date, datetime.min.time())
    at = lambda minute: format_local(start + timedelta(minutes=minute))  # noqa: E731
    for d in sorted(full_days - rest):
        exceptions.append(
            CalendarException(
                id=f"X{len(exceptions) + 1:03}",
                start=at(d * DAY),
                end=at((d + 1) * DAY),
                kind="closed",
            )
        )
    covered = merge([(d * DAY, (d + 1) * DAY) for d in full_days])
    for m, spans in downtime.items():
        for a, b in spans:
            for s, e in _cut_spans([(a, b)], [tuple(c) for c in covered]):
                exceptions.append(
                    CalendarException(
                        id=f"X{len(exceptions) + 1:03}",
                        machine=m,
                        start=at(s),
                        end=at(e),
                        kind="maintenance",
                    )
                )

    tiers = doc.get("objective_tiers") or {}
    config = FactoryConfig(
        utc_offset=offset,
        stages=doc["stages"],
        run_size=doc["run_size"],
        transfer_minutes=doc["transfer_minutes"],
        machine_initial_state=doc["machine_initial_state"],
        shift_template={
            k: FactoryShift(start=v["start"], end=v["end"], breaks=v.get("breaks", []))
            for k, v in doc["shift_template"].items()
        },
        weekly_off=weekly_off,
        period_days=max(1, min(62, days)),
        products={
            p: FactoryProduct(
                color=p.split("_")[-1] if "_" in p else None,
                line=p.split("_")[0] if "_" in p else None,
                route=s["route"],
                safety_stock=s["safety_stock"],
                stock_cap=s["stock_cap"],
            )
            for p, s in doc["products"].items()
        },
        btp={c: FactoryBtp(capacity=s.get("capacity")) for c, s in doc["btp"].items()},
        machines={
            m: FactoryMachine(
                stage=s["stage"],
                calendar=s.get("calendar", "shifts"),
                minutes_per_unit=s["minutes_per_unit"],
                fixed_minutes=s["fixed_minutes"],
                setup=s["setup"],
                mold_change_minutes=s.get("mold_change_minutes"),
            )
            for m, s in machines.items()
        },
        molds={
            k: FactoryMold(
                item=s["item"],
                cavities=s["cavities"],
                limit_cycles=s["limit_cycles"],
                maintenance_minutes=s["maintenance_minutes"],
                after_maintenance=s["after_maintenance"],
            )
            for k, s in doc.get("molds", {}).items()
        },
        policies=[
            ObjectivePolicy(
                key="default",
                name="Mặc định",
                description="Trọng số nhập cùng dữ liệu gốc",
                weights=doc["weights"],
                tier1=tiers.get("tier1", []),
                scale=tiers.get("scale", 1),
            )
        ],
        default_policy="default",
    )

    orders = [
        PeriodOrder(
            code=o["id"],
            product=o["product"],
            quantity=o["quantity"],
            due=at(o["due"]),
            priority=o["priority"],
            pickup="at_due" if o["release"] >= o["due"] else "when_ready",
            from_stock=o["initial_allocated"],
            source="book",
        )
        for o in doc["orders"]
    ]
    orders += [
        PeriodOrder(
            code=o["id"],
            product=o["product"],
            quantity=o["quantity"],
            due=at(o["due"]),
            priority=1,
            source="book",
        )
        for o in doc.get("long_term_orders", [])
    ]
    reserve: dict[str, ReservePolicy] = {}
    if "reserve_policy" in doc:
        reserve = {p: ReservePolicy(**v) for p, v in doc["reserve_policy"].items()}
    elif doc.get("reserve_options"):
        runs = defaultdict(list)
        for r in doc.get("runs", []):
            if "reserve_option" in r:
                runs[r["reserve_option"]].append(r)
        last = doc["stages"][-1]
        for option, spec in doc["reserve_options"].items():
            policy = reserve.setdefault(spec["pull_ahead_for"], ReservePolicy())
            if any(r["stage"] == last for r in runs[option]):
                policy.finished_lots += 1
            else:
                for r in runs[option]:
                    policy.btp_runs[r["stage"]] = policy.btp_runs.get(r["stage"], 0) + 1
    inputs = PeriodInputs(
        orders=orders,
        opening=OpeningState(
            finished={p: s["initial_stock"] for p, s in doc["products"].items()},
            btp={c: s["initial_stock"] for c, s in doc["btp"].items()},
            molds={k: s["initial_cycles"] for k, s in doc.get("molds", {}).items()},
        ),
        exceptions=exceptions,
        policy="default",
        reserve_policy=reserve,
    )
    return SplitDocument(
        config=config,
        start_date=start_date,
        days=days,
        inputs=inputs,
        name=str(doc.get("name", "Imported")),
    )


def _cut_spans(spans: list[tuple[int, int]], holes: list[tuple[int, int]]) -> list[tuple[int, int]]:
    for a0, a1 in holes:
        spans = [p for s, e in spans for p in ((s, min(e, a0)), (max(s, a1), e)) if p[1] > p[0]]
    return spans


# ---------------------------------------------------------------- change summaries


def describe_changes(
    before: dict[str, Any] | None, after: dict[str, Any], *, depth: int = 3
) -> list[dict[str, Any]]:
    """Flat list of {path, before, after} between two JSON documents (configs or inputs)."""
    out: list[dict[str, Any]] = []

    def walk(a: Any, b: Any, path: list[str], level: int) -> None:
        if a == b:
            return
        if isinstance(a, dict) and isinstance(b, dict) and level < depth:
            for key in list(dict.fromkeys([*a.keys(), *b.keys()])):
                walk(a.get(key), b.get(key), [*path, str(key)], level + 1)
            return
        out.append({"path": ".".join(path), "before": a, "after": b})

    walk(before or {}, after, [], 0)
    return out


def order_changes(
    before: list[dict[str, Any]], after: list[dict[str, Any]]
) -> dict[str, list[str]]:
    old = {o["code"]: o for o in before}
    new = {o["code"]: o for o in after}
    return {
        "added": sorted(set(new) - set(old)),
        "removed": sorted(set(old) - set(new)),
        "changed": sorted(c for c in set(old) & set(new) if old[c] != new[c]),
    }
