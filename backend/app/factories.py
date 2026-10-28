"""Factories (versioned plant configuration) and their order book."""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import Any

from pydantic import ValidationError
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .errors import ApplicationError
from .factory_model import (
    DAY,
    FactoryConfig,
    describe_changes,
    downtime_by_machine,
    format_local,
    parse_local,
)
from .factory_schemas import (
    BookOrderCreate,
    BookOrderUpdate,
    FactoryCounts,
    FactoryDetail,
    FactorySummary,
    FactoryVersionResponse,
    OrderImportRequest,
    OrderImportResult,
    OrderImportRow,
    OrderImportSummary,
    OutlookResponse,
    OutlookStage,
    OutlookWeek,
)
from .models import BookOrder, Factory, FactoryVersion, PlanningPeriod, utc_now
from .order_import import parse_orders
from .request_context import current_actor

BOOK_FIELDS = ("product", "quantity", "due", "priority", "pickup", "customer", "note")


class FactoryService:
    def __init__(self, session: Session) -> None:
        self.session = session

    # ---------- reads

    def get(self, factory_id: str) -> Factory:
        factory = self.session.get(Factory, factory_id)
        if factory is None:
            raise ApplicationError(
                "FACTORY_NOT_FOUND", f"Factory '{factory_id}' was not found", status_code=404
            )
        return factory

    def version(self, factory_id: str, version: int) -> FactoryVersion:
        row = self.session.scalar(
            select(FactoryVersion).where(
                FactoryVersion.factory_id == factory_id, FactoryVersion.version == version
            )
        )
        if row is None:
            raise ApplicationError(
                "FACTORY_VERSION_NOT_FOUND",
                f"Factory version {version} was not found",
                status_code=404,
            )
        return row

    def config(self, factory_id: str, version: int | None = None) -> FactoryConfig:
        factory = self.get(factory_id)
        return FactoryConfig.model_validate(
            self.version(factory_id, version or factory.current_version).config
        )

    def applicable_version(self, factory_id: str, start: date) -> int:
        """Newest version whose effective date is on or before `start` (or has none)."""
        rows = self.session.scalars(
            select(FactoryVersion)
            .where(FactoryVersion.factory_id == factory_id)
            .order_by(FactoryVersion.version)
        ).all()
        usable = [
            r.version
            for r in rows
            if r.effective_from is None or r.effective_from <= start.isoformat()
        ]
        return max(usable) if usable else rows[0].version

    def list(self) -> list[FactorySummary]:
        factories = self.session.scalars(select(Factory).order_by(Factory.created_at)).all()
        return [self.summary(f) for f in factories]

    def summary(self, factory: Factory) -> FactorySummary:
        config = self.version(factory.id, factory.current_version).config
        open_orders = (
            self.session.scalar(
                select(func.count())
                .select_from(BookOrder)
                .where(BookOrder.factory_id == factory.id, BookOrder.status == "open")
            )
            or 0
        )
        periods = (
            self.session.scalar(
                select(func.count())
                .select_from(PlanningPeriod)
                .where(PlanningPeriod.factory_id == factory.id)
            )
            or 0
        )
        return FactorySummary(
            id=factory.id,
            name=factory.name,
            current_version=factory.current_version,
            counts=FactoryCounts(
                products=len(config["products"]),
                machines=len(config["machines"]),
                open_orders=open_orders,
                periods=periods,
            ),
            created_at=factory.created_at,
            updated_at=factory.updated_at,
        )

    def detail(self, factory_id: str) -> FactoryDetail:
        factory = self.get(factory_id)
        summary = self.summary(factory)
        return FactoryDetail(
            **summary.model_dump(),
            config=self.config(factory_id),
            versions=[FactoryVersionResponse.model_validate(v) for v in reversed(factory.versions)],
        )

    # ---------- writes

    def create(self, name: str, config: FactoryConfig, *, note: str | None = None) -> Factory:
        factory = Factory(name=name, current_version=1)
        self.session.add(factory)
        self.session.flush()
        self.session.add(
            FactoryVersion(
                factory_id=factory.id,
                version=1,
                effective_from=None,
                config=config.model_dump(mode="json"),
                note=note,
                changes=[],
                actor=current_actor.get(),
            )
        )
        self.session.flush()
        return factory

    def rename(self, factory_id: str, name: str) -> Factory:
        factory = self.get(factory_id)
        factory.name = name
        factory.updated_at = utc_now()
        self.session.commit()
        return factory

    def update_config(
        self,
        factory_id: str,
        *,
        expected_version: int,
        config: FactoryConfig,
        effective_from: date | None,
        note: str | None,
    ) -> Factory:
        factory = self.get(factory_id)
        if factory.current_version != expected_version:
            raise ApplicationError(
                "FACTORY_VERSION_CONFLICT",
                "The factory configuration was changed by someone else; reload before saving",
                status_code=409,
                details={"current_version": factory.current_version},
            )
        previous = self.version(factory_id, factory.current_version).config
        after = config.model_dump(mode="json")
        changes = describe_changes(previous, after)
        if not changes:
            raise ApplicationError(
                "FACTORY_UNCHANGED", "The configuration has no changes", status_code=422
            )
        version = factory.current_version + 1
        self.session.add(
            FactoryVersion(
                factory_id=factory_id,
                version=version,
                effective_from=effective_from.isoformat() if effective_from else None,
                config=after,
                note=note,
                changes=changes,
                actor=current_actor.get(),
            )
        )
        factory.current_version = version
        factory.updated_at = utc_now()
        self.session.commit()
        return factory


class OrderBookService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.factories = FactoryService(session)

    def list(
        self,
        factory_id: str,
        *,
        status: str | None,
        search: str | None,
        due_from: str | None,
        due_to: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[BookOrder], int]:
        self.factories.get(factory_id)
        filters: list[Any] = [BookOrder.factory_id == factory_id]
        if status:
            filters.append(BookOrder.status == status)
        if search:
            pattern = f"%{search.strip().lower()}%"
            filters.append(
                or_(
                    func.lower(BookOrder.code).like(pattern),
                    func.lower(BookOrder.product).like(pattern),
                    func.lower(func.coalesce(BookOrder.customer, "")).like(pattern),
                )
            )
        if due_from:
            filters.append(BookOrder.due >= due_from)
        if due_to:
            filters.append(BookOrder.due < due_to)
        items = list(
            self.session.scalars(
                select(BookOrder)
                .where(*filters)
                .order_by(BookOrder.due, BookOrder.code)
                .limit(limit)
                .offset(offset)
            )
        )
        total = (
            self.session.scalar(select(func.count()).select_from(BookOrder).where(*filters)) or 0
        )
        return items, total

    def open_orders(self, factory_id: str, *, due_before: str) -> list[BookOrder]:
        return list(
            self.session.scalars(
                select(BookOrder)
                .where(
                    BookOrder.factory_id == factory_id,
                    BookOrder.status == "open",
                    BookOrder.due < due_before,
                )
                .order_by(BookOrder.due, BookOrder.code)
            )
        )

    def get(self, factory_id: str, code: str) -> BookOrder:
        order = self.session.scalar(
            select(BookOrder).where(BookOrder.factory_id == factory_id, BookOrder.code == code)
        )
        if order is None:
            raise ApplicationError(
                "ORDER_NOT_FOUND", f"Order '{code}' was not found", status_code=404
            )
        return order

    def _check(self, factory_id: str, product: str, due: str) -> str:
        config = self.factories.config(factory_id)
        if product not in config.products:
            raise ApplicationError(
                "UNKNOWN_PRODUCT",
                f"Product '{product}' is not made by this factory",
                status_code=422,
            )
        try:
            return format_local(parse_local(due))
        except ValueError as exc:
            raise ApplicationError("INVALID_DUE", str(exc), status_code=422) from exc

    def create(self, factory_id: str, payload: BookOrderCreate) -> BookOrder:
        due = self._check(factory_id, payload.product, payload.due)
        existing = self.session.scalar(
            select(BookOrder).where(
                BookOrder.factory_id == factory_id, BookOrder.code == payload.code
            )
        )
        if existing is not None:
            raise ApplicationError(
                "ORDER_ALREADY_EXISTS", f"Order '{payload.code}' already exists", status_code=409
            )
        order = BookOrder(
            factory_id=factory_id,
            source="manual",
            status="open",
            **{**payload.model_dump(), "due": due},
        )
        self.session.add(order)
        self.session.commit()
        return order

    def update(self, factory_id: str, code: str, payload: BookOrderUpdate) -> BookOrder:
        order = self.get(factory_id, code)
        due = self._check(factory_id, payload.product, payload.due)
        for key, value in {**payload.model_dump(), "due": due}.items():
            setattr(order, key, value)
        if payload.status != "delivered":
            order.delivered_at = None
            order.delivered_period_id = None
        order.updated_at = utc_now()
        self.session.commit()
        return order

    def delete(self, factory_id: str, code: str) -> None:
        order = self.get(factory_id, code)
        if order.status == "delivered":
            raise ApplicationError(
                "ORDER_DELIVERED",
                "A delivered order is history; it cannot be deleted",
                status_code=409,
            )
        self.session.delete(order)
        self.session.commit()

    def add_many(self, factory_id: str, orders: list[dict[str, Any]], *, source: str) -> None:
        for spec in orders:
            self.session.add(BookOrder(factory_id=factory_id, status="open", source=source, **spec))
        self.session.flush()

    def mark_delivered(
        self, factory_id: str, delivered: dict[str, str], period_id: str
    ) -> list[str]:
        if not delivered:
            return []
        rows = self.session.scalars(
            select(BookOrder).where(
                BookOrder.factory_id == factory_id, BookOrder.code.in_(list(delivered))
            )
        ).all()
        done = []
        for order in rows:
            if order.status == "open":
                order.status = "delivered"
                order.delivered_at = delivered[order.code]
                order.delivered_period_id = period_id
                order.updated_at = utc_now()
                done.append(order.code)
        return sorted(done)

    # ---------- import

    def import_orders(self, factory_id: str, request: OrderImportRequest) -> OrderImportResult:
        config = self.factories.config(factory_id)
        try:
            sheet = parse_orders(
                request.format,
                request.content,
                products=list(config.products),
                default_due_time=config.default_due_time,
            )
        except (ValueError, UnicodeDecodeError) as exc:
            raise ApplicationError("IMPORT_UNREADABLE", str(exc), status_code=422) from exc
        existing = {
            o.code: o
            for o in self.session.scalars(
                select(BookOrder).where(BookOrder.factory_id == factory_id)
            )
        }
        rows: list[OrderImportRow] = []
        seen: set[str] = set()
        for parsed in sheet.rows:
            values = {
                "priority": 2,
                "pickup": "at_due",
                "customer": None,
                "note": None,
                **parsed.values,
            }
            code = values.get("code")
            action = "invalid" if parsed.errors else "add"
            changes: list[str] = []
            if not parsed.errors and code in existing:
                current = existing[code]
                changes = [k for k in BOOK_FIELDS if getattr(current, k) != values.get(k)]
                if current.status != "open":
                    action = "locked"
                    if changes:
                        parsed.warnings.append(_status_warning(current.status))
                else:
                    action = "update" if changes else "unchanged"
            if code:
                seen.add(code)
            rows.append(
                OrderImportRow(
                    row=parsed.row,
                    values=values,
                    action=action,
                    changes=changes,
                    errors=[m.as_dict() for m in parsed.errors],
                    warnings=[m.as_dict() for m in parsed.warnings],
                )
            )
        cancel = sorted(
            code
            for code, order in existing.items()
            if request.mode == "replace_open" and order.status == "open" and code not in seen
        )
        summary = OrderImportSummary(
            add=sum(r.action == "add" for r in rows),
            update=sum(r.action == "update" for r in rows),
            unchanged=sum(r.action == "unchanged" for r in rows),
            invalid=sum(r.action == "invalid" for r in rows),
            locked=sum(r.action == "locked" for r in rows),
            cancel=len(cancel),
        )
        result = OrderImportResult(
            columns=sheet.columns,
            unmatched_headers=sheet.unmatched_headers,
            missing_columns=sheet.missing_columns,
            rows=rows,
            cancel=cancel,
            summary=summary,
            committed=False,
        )
        if not request.commit:
            return result
        if sheet.missing_columns:
            raise ApplicationError(
                "IMPORT_MISSING_COLUMNS",
                "Required columns are missing",
                status_code=422,
                details=sheet.missing_columns,
            )
        if summary.invalid and not request.skip_invalid:
            raise ApplicationError(
                "IMPORT_HAS_ERRORS",
                "Some rows have errors; fix them or skip invalid rows",
                status_code=422,
                details={"invalid": summary.invalid},
            )
        for row in rows:
            fields = {k: row.values.get(k) for k in BOOK_FIELDS}
            if row.action == "add":
                self.session.add(
                    BookOrder(
                        factory_id=factory_id,
                        code=row.values["code"],
                        status="open",
                        source="import",
                        **fields,
                    )
                )
            elif row.action == "update":
                order = existing[row.values["code"]]
                for key, value in fields.items():
                    setattr(order, key, value)
                order.updated_at = utc_now()
        for code in cancel:
            existing[code].status = "cancelled"
            existing[code].updated_at = utc_now()
        self.session.commit()
        result.committed = True
        return result

    # ---------- rough-cut outlook

    def outlook(self, factory_id: str, *, start: date, weeks: int) -> OutlookResponse:
        """Weekly demand of open orders against stage capacity (rough-cut, setups excluded).

        Each week's demand is turned into whole runs per stage (run sizes of the
        plant) and timed on the fastest eligible machine; capacity is the plant
        calendar (shifts, rest days, holidays, recurring maintenance).
        """
        config = self.factories.config(factory_id)
        start = start - timedelta(days=start.weekday())
        end = start + timedelta(days=7 * weeks)
        orders = self.open_orders(
            factory_id, due_before=format_local(datetime.combine(end, datetime.min.time()))
        )
        today = format_local(datetime.combine(date.today(), datetime.min.time()))
        overdue = sum(o.due < today for o in orders)
        open_total = (
            self.session.scalar(
                select(func.count())
                .select_from(BookOrder)
                .where(BookOrder.factory_id == factory_id, BookOrder.status == "open")
            )
            or 0
        )
        scheduled_codes = _codes_in_open_periods(self.session, factory_id)
        soon = format_local(datetime.combine(date.today() + timedelta(days=7), datetime.min.time()))
        unscheduled_soon = sum(o.due < soon and o.code not in scheduled_codes for o in orders)

        out: list[OutlookWeek] = []
        for w in range(weeks):
            week_start = start + timedelta(days=7 * w)
            lo = format_local(datetime.combine(week_start, datetime.min.time()))
            hi = format_local(datetime.combine(week_start + timedelta(days=7), datetime.min.time()))
            week_orders = [o for o in orders if (lo <= o.due < hi) or (w == 0 and o.due < lo)]
            demand: dict[str, int] = {}
            for o in week_orders:
                demand[o.product] = demand.get(o.product, 0) + o.quantity
            out.append(
                OutlookWeek(
                    start=week_start.isoformat(),
                    end=(week_start + timedelta(days=6)).isoformat(),
                    orders=len(week_orders),
                    demand=demand,
                    stages=_stage_load(config, week_start, demand),
                )
            )
        return OutlookResponse(
            weeks=out,
            overdue_orders=overdue,
            open_orders=open_total,
            unscheduled_soon=unscheduled_soon,
        )


def _status_warning(status: str):  # type: ignore[no-untyped-def]
    from .order_import import Message

    if status == "delivered":
        return Message("Đơn đã giao — không cập nhật.", "Order already delivered — not updated.")
    return Message("Đơn đã huỷ — không cập nhật.", "Order cancelled — not updated.")


def _codes_in_open_periods(session: Session, factory_id: str) -> set[str]:
    codes: set[str] = set()
    for inputs in session.scalars(
        select(PlanningPeriod.inputs).where(
            PlanningPeriod.factory_id == factory_id, PlanningPeriod.closed_at.is_(None)
        )
    ):
        codes.update(o["code"] for o in inputs.get("orders", []))
    return codes


def _stage_load(
    config: FactoryConfig, week_start: date, demand: dict[str, int]
) -> list[OutlookStage]:
    holes = downtime_by_machine(config, week_start, 7)
    available: dict[str, int] = {}
    for mid, machine in config.machines.items():
        if machine.calendar == "continuous":
            spans = [(0, 7 * DAY)]
        else:
            spans = []
            for d in range(7):
                for shift in config.shift_template.values():
                    pieces = [(d * DAY + shift.start, d * DAY + shift.end)]
                    for a, b in shift.breaks:
                        pieces = _cut(pieces, d * DAY + a, d * DAY + b)
                    spans += pieces
        for a, b in holes[mid]:
            spans = _cut(spans, a, b)
        available[machine.stage] = available.get(machine.stage, 0) + sum(e - s for s, e in spans)

    stages = config.stages
    need_units: dict[str, int] = {}  # item -> units the stage making it must produce
    for product, qty in demand.items():
        if product not in config.products:
            continue
        need_units[product] = need_units.get(product, 0) + qty
        for stage in stages[:-1]:
            code = config.products[product].route[stage]
            need_units[code] = need_units.get(code, 0) + qty
    result = []
    for stage in stages:
        machines = [m for m in config.machines.values() if m.stage == stage]
        minutes = 0
        items = {i for m in machines for i in m.minutes_per_unit}
        for item, units in need_units.items():
            if item not in items:
                continue
            runs = math.ceil(units / config.run_size[stage])
            per_run = min(
                math.ceil(config.run_size[stage] * m.minutes_per_unit[item] + m.fixed_minutes)
                for m in machines
                if item in m.minutes_per_unit
            )
            minutes += runs * per_run
        have = available.get(stage, 0)
        result.append(
            OutlookStage(
                stage=stage,
                need_minutes=minutes,
                available_minutes=have,
                ratio=minutes / have if have else None,
            )
        )
    return result


def _cut(spans: list[tuple[int, int]], a0: int, a1: int) -> list[tuple[int, int]]:
    return [p for s, e in spans for p in ((s, min(e, a0)), (max(s, a1), e)) if p[1] > p[0]]


def validate_config(payload: dict[str, Any]) -> FactoryConfig:
    try:
        return FactoryConfig.model_validate(payload)
    except ValidationError as exc:
        raise ApplicationError(
            "FACTORY_CONFIG_INVALID",
            "The factory configuration is not valid",
            status_code=422,
            details=[error["msg"].removeprefix("Value error, ") for error in exc.errors()],
        ) from exc
