"""Planning periods: build a period from the plant and the order book, compile it to
a schema-5 scenario, and carry the committed schedule forward (next period,
reschedule after an incident, what-if variants)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .errors import ApplicationError
from .factories import FactoryService, OrderBookService
from .factory_model import (
    DAY,
    CompileResult,
    OpeningState,
    PeriodInputs,
    PeriodOrder,
    StockLevels,
    compile_period,
    describe_changes,
    format_local,
    parse_local,
    schedule_state,
    split_document,
)
from .factory_schemas import (
    BookSync,
    BookSyncChange,
    PeriodCounts,
    PeriodCreate,
    PeriodDecisionInfo,
    PeriodDetail,
    PeriodFactoryInfo,
    PeriodRunCounts,
    PeriodSummary,
    RescheduleCreate,
    RolloverCreate,
    StateResponse,
)
from .master_data import MasterDataService
from .models import (
    BookOrder,
    MasterDataset,
    PlanningPeriod,
    RunStatus,
    ScheduleDecision,
    ScheduleRun,
    utc_now,
)
from .schemas import SchedulingInputV5

ORDER_FIELDS = ("product", "quantity", "due", "priority", "pickup", "customer", "note")


def period_end(period: PlanningPeriod) -> date:
    return date.fromisoformat(period.start_date) + timedelta(days=period.days)


def default_name(start: date, days: int) -> str:
    last = start + timedelta(days=days - 1)
    return f"Kỳ {start:%d/%m} – {last:%d/%m/%Y}"


def book_to_period_order(order: BookOrder) -> PeriodOrder:
    return PeriodOrder(
        code=order.code,
        product=order.product,
        quantity=order.quantity,
        due=order.due,
        priority=order.priority,
        pickup=order.pickup,
        customer=order.customer,
        note=order.note,
        source="book",  # type: ignore[arg-type]
    )


class PeriodService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.factories = FactoryService(session)
        self.book = OrderBookService(session)

    # ------------------------------------------------------------ reads

    def get(self, period_id: str) -> PlanningPeriod:
        period = self.session.get(PlanningPeriod, period_id)
        if period is None:
            raise ApplicationError(
                "PERIOD_NOT_FOUND", f"Planning period '{period_id}' was not found", status_code=404
            )
        return period

    def list(self, factory_id: str | None, *, include_closed: bool = True) -> list[PeriodSummary]:
        query = select(PlanningPeriod)
        if factory_id:
            query = query.where(PlanningPeriod.factory_id == factory_id)
        if not include_closed:
            query = query.where(PlanningPeriod.closed_at.is_(None))
        periods = self.session.scalars(
            query.order_by(PlanningPeriod.start_date.desc(), PlanningPeriod.created_at.desc())
        ).all()
        return [self.summary(p) for p in periods]

    def summary(self, period: PlanningPeriod) -> PeriodSummary:
        dataset = self.session.get(MasterDataset, period.dataset_id) if period.dataset_id else None
        dataset_revision = dataset.revision if dataset else None
        runs = PeriodRunCounts(total=0, current=0, succeeded=0, active=0, failed=0)
        if dataset is not None:
            rows = self.session.execute(
                select(ScheduleRun.status, ScheduleRun.dataset_revision, func.count())
                .where(ScheduleRun.dataset_id == dataset.id)
                .group_by(ScheduleRun.status, ScheduleRun.dataset_revision)
            ).all()
            for status, revision, count in rows:
                runs.total += count
                if revision != dataset_revision:
                    continue
                runs.current += count
                if status == RunStatus.SUCCEEDED.value:
                    runs.succeeded += count
                elif status in (RunStatus.QUEUED.value, RunStatus.RUNNING.value):
                    runs.active += count
                elif status == RunStatus.FAILED.value:
                    runs.failed += count
        decision = self._latest_decision(period)
        decision_info = None
        if decision is not None:
            decision_info = PeriodDecisionInfo(
                period_id=period.id,
                run_id=decision.run_id,
                alternative=decision.alternative,
                policy=decision.policy,
                decided_at=decision.decided_at,
                dataset_revision=decision.dataset_revision,
                current=decision.dataset_revision == dataset_revision,
            )
        issues = period.compile_issues or []
        orders = period.inputs.get("orders", [])
        horizon_end = format_local(datetime.combine(period_end(period), datetime.min.time()))
        counts = PeriodCounts(
            orders=len(orders),
            scheduled=sum(o["due"] <= horizon_end for o in orders),
            long_term=sum(o["due"] > horizon_end for o in orders),
            exceptions=len(period.inputs.get("exceptions", [])),
            errors=sum(i["severity"] == "error" for i in issues),
            warnings=sum(i["severity"] == "warning" for i in issues),
        )
        if period.closed_at is not None:
            status = "closed"
        elif counts.errors and period.compiled_revision != period.revision:
            status = "needs_fix"
        elif dataset is None or period.compiled_revision is None:
            status = "needs_fix" if counts.errors else "draft"
        elif decision_info is not None and decision_info.current:
            status = "committed"
        elif runs.active:
            status = "solving"
        elif runs.succeeded:
            status = "options"
        else:
            status = "ready"
        return PeriodSummary(
            id=period.id,
            factory_id=period.factory_id,
            factory_version=period.factory_version,
            name=period.name,
            start_date=period.start_date,
            end_date=(period_end(period) - timedelta(days=1)).isoformat(),
            days=period.days,
            kind=period.kind,
            parent_id=period.parent_id,
            variant_label=period.variant_label,
            revision=period.revision,
            dataset_id=period.dataset_id,
            dataset_revision=dataset_revision,
            compiled_revision=period.compiled_revision,
            status=status,
            counts=counts,
            runs=runs,
            decision=decision_info,
            closed_at=period.closed_at,
            created_at=period.created_at,
            updated_at=period.updated_at,
        )

    def detail(self, period_id: str) -> PeriodDetail:
        period = self.get(period_id)
        summary = self.summary(period)
        factory = self.factories.get(period.factory_id)
        config = self.factories.config(period.factory_id, period.factory_version)
        root = self._root(period)
        family = [root, *self._children(root.id)]
        changes: list[dict[str, Any]] = []
        if period.parent_id:
            parent = self.session.get(PlanningPeriod, period.parent_id)
            if parent is not None:
                changes = describe_changes(
                    _comparable(parent.inputs), _comparable(period.inputs), depth=2
                )
        return PeriodDetail(
            **summary.model_dump(),
            inputs=PeriodInputs.model_validate(period.inputs),
            issues=period.compile_issues or [],
            load=period.compile_load or [],
            factory=PeriodFactoryInfo(
                name=factory.name,
                utc_offset=config.utc_offset,
                pinned_version=period.factory_version,
                applicable_version=self.factories.applicable_version(
                    period.factory_id, date.fromisoformat(period.start_date)
                ),
                latest_version=factory.current_version,
            ),
            family=[self.summary(p) for p in family],
            changes_vs_parent=changes,
            book_sync=self.book_sync(period)
            if period.closed_at is None
            else BookSync(added=[], changed=[], removed=[]),
        )

    def _root(self, period: PlanningPeriod) -> PlanningPeriod:
        seen = {period.id}
        while period.kind != "regular" and period.parent_id:
            parent = self.session.get(PlanningPeriod, period.parent_id)
            if parent is None or parent.id in seen:
                break
            seen.add(parent.id)
            period = parent
        return period

    def _children(self, period_id: str) -> list[PlanningPeriod]:
        out: list[PlanningPeriod] = []
        queue = [period_id]
        while queue:
            current = queue.pop(0)
            kids = self.session.scalars(
                select(PlanningPeriod)
                .where(PlanningPeriod.parent_id == current)
                .order_by(PlanningPeriod.created_at)
            ).all()
            out.extend(kids)
            queue.extend(k.id for k in kids)
        return out

    def _latest_decision(self, period: PlanningPeriod) -> ScheduleDecision | None:
        if not period.dataset_id:
            return None
        return self.session.scalar(
            select(ScheduleDecision)
            .where(ScheduleDecision.dataset_id == period.dataset_id)
            .order_by(ScheduleDecision.decided_at.desc(), ScheduleDecision.created_at.desc())
            .limit(1)
        )

    def committed(self, period: PlanningPeriod) -> tuple[PlanningPeriod, ScheduleRun]:
        """The schedule being executed for this period: its own commit, else the most
        recent commit among its variants (a variant may be the option chosen)."""
        root = self._root(period)
        candidates = [period] + [
            p
            for p in [root, *self._children(root.id)]
            if p.id != period.id and p.kind in ("regular", "variant")
        ]
        best: tuple[ScheduleDecision, PlanningPeriod] | None = None
        for candidate in candidates:
            decision = self._latest_decision(candidate)
            if (
                decision is not None
                and decision.run_id
                and (best is None or decision.decided_at > best[0].decided_at)
            ):
                best = (decision, candidate)
            if candidate is period and best is not None:
                break  # the period's own commit wins
        if best is None:
            raise ApplicationError(
                "PERIOD_NOT_COMMITTED", "Commit a schedule for this period first", status_code=409
            )
        run = self.session.scalar(
            select(ScheduleRun)
            .options(selectinload(ScheduleRun.operations))
            .where(ScheduleRun.id == best[0].run_id)
        )
        if run is None or run.status != RunStatus.SUCCEEDED.value:
            raise ApplicationError(
                "PERIOD_NOT_COMMITTED", "The committed run is no longer available", status_code=409
            )
        return best[1], run

    # ------------------------------------------------------------ create / edit

    def create(self, payload: PeriodCreate) -> PlanningPeriod:
        factory = self.factories.get(payload.factory_id)
        version = self.factories.applicable_version(factory.id, payload.start_date)
        config = self.factories.config(factory.id, version)
        days = payload.days or config.period_days
        inputs = PeriodInputs(policy=config.default_policy)
        notes: list[str] = []
        if payload.opening == "previous":
            previous = self._previous_committed(factory.id, payload.start_date)
            if previous is not None:
                source, run = self.committed(previous)
                state = schedule_state(run.input_snapshot, _rows(run), previous.days * DAY)
                inputs.opening = _opening_from(state, as_of=_local(previous, previous.days * DAY))
                inputs.policy = source.inputs.get("policy") or config.default_policy
                # Pull-ahead is not carried over: last period's long-term demand is
                # this period's regular demand, so the old choice rarely still fits.
                notes.append(f"Đầu kỳ dự kiến theo lịch đã chốt của {previous.name}.")
        if payload.pull_orders:
            end = date.fromisoformat(payload.start_date.isoformat()) + timedelta(
                days=days + config.lookahead_days
            )
            for order in self.book.open_orders(
                factory.id, due_before=format_local(datetime.combine(end, datetime.min.time()))
            ):
                inputs.orders.append(book_to_period_order(order))
        inputs.notes = notes
        period = PlanningPeriod(
            factory_id=factory.id,
            factory_version=version,
            name=payload.name or default_name(payload.start_date, days),
            start_date=payload.start_date.isoformat(),
            days=days,
            kind="regular",
            inputs=inputs.model_dump(mode="json"),
            revision=1,
            compile_issues=[],
            compile_load=[],
        )
        self.session.add(period)
        self.session.flush()
        self._compile(period)
        self.session.commit()
        return period

    def create_from_document(self, factory_id: str, doc: dict[str, Any]) -> PlanningPeriod:
        split = split_document(doc)
        period = PlanningPeriod(
            factory_id=factory_id,
            factory_version=1,
            name=default_name(split.start_date, split.days),
            start_date=split.start_date.isoformat(),
            days=split.days,
            kind="regular",
            inputs=split.inputs.model_dump(mode="json"),
            revision=1,
            compile_issues=[],
            compile_load=[],
        )
        self.session.add(period)
        self.session.flush()
        self._compile(period)
        return period

    def update_inputs(
        self, period_id: str, expected_revision: int, inputs: PeriodInputs
    ) -> PlanningPeriod:
        period = self._editable(period_id)
        if period.revision != expected_revision:
            raise ApplicationError(
                "REVISION_CONFLICT",
                "The period was changed by another request; reload before saving",
                status_code=409,
                details={"current_revision": period.revision},
            )
        period.inputs = inputs.model_dump(mode="json")
        period.revision += 1
        period.updated_at = utc_now()
        self.session.flush()
        self._compile(period)
        self.session.commit()
        return period

    def rename(self, period_id: str, name: str, variant_label: str | None) -> PlanningPeriod:
        period = self.get(period_id)
        period.name = name
        if period.kind == "variant" and variant_label:
            period.variant_label = variant_label
        period.updated_at = utc_now()
        self.session.commit()
        return period

    def upgrade_factory(self, period_id: str) -> PlanningPeriod:
        period = self._editable(period_id)
        version = self.factories.applicable_version(
            period.factory_id, date.fromisoformat(period.start_date)
        )
        if version == period.factory_version:
            return period
        period.factory_version = version
        period.revision += 1
        period.updated_at = utc_now()
        self.session.flush()
        self._compile(period)
        self.session.commit()
        return period

    def recompile(self, period_id: str) -> PlanningPeriod:
        period = self._editable(period_id)
        self._compile(period)
        self.session.commit()
        return period

    def _editable(self, period_id: str) -> PlanningPeriod:
        period = self.get(period_id)
        if period.closed_at is not None:
            raise ApplicationError(
                "PERIOD_CLOSED", "A closed period cannot be changed", status_code=409
            )
        return period

    def compile_preview(self, period: PlanningPeriod) -> CompileResult:
        config = self.factories.config(period.factory_id, period.factory_version)
        label = f"{period.name} · {period.variant_label}" if period.variant_label else period.name
        return compile_period(
            config,
            date.fromisoformat(period.start_date),
            period.days,
            PeriodInputs.model_validate(period.inputs),
            name=label[:200],
            derived_from=f"period:{period.id}",
        )

    def _compile(self, period: PlanningPeriod) -> CompileResult:
        result = self.compile_preview(period)
        period.compile_issues = [i.as_dict() for i in result.issues]
        period.compile_load = result.load
        if not result.ok:
            return result
        model = SchedulingInputV5.model_validate(result.model)
        service = MasterDataService(self.session)
        dataset = self.session.get(MasterDataset, period.dataset_id) if period.dataset_id else None
        # MasterDataService commits; keep the period row consistent across that commit.
        self.session.flush()
        if dataset is None:
            detail = service.import_input(model)
            dataset = self.session.get(MasterDataset, detail.id)
            assert dataset is not None
            dataset.owner_period_id = period.id
            period.dataset_id = dataset.id
        else:
            service.replace(dataset.id, model, expected_revision=dataset.revision)
        period.compiled_revision = period.revision
        self.session.flush()
        return result

    # ------------------------------------------------------------ variants, rollover, reschedule

    def create_variant(self, period_id: str, label: str) -> PlanningPeriod:
        source = self._editable(period_id)
        root = self._root(source)
        variant = PlanningPeriod(
            factory_id=source.factory_id,
            factory_version=source.factory_version,
            name=root.name,
            start_date=source.start_date,
            days=source.days,
            kind="variant",
            parent_id=source.id,
            variant_label=label,
            inputs=dict(source.inputs),
            revision=1,
            compile_issues=[],
            compile_load=[],
        )
        self.session.add(variant)
        self.session.flush()
        self._compile(variant)
        self.session.commit()
        return variant

    def state(self, period_id: str, at: str | None) -> StateResponse:
        period = self.get(period_id)
        source, run = self.committed(period)
        start = datetime.combine(date.fromisoformat(source.start_date), datetime.min.time())
        minute = (
            source.days * DAY
            if at is None
            else int((parse_local(at) - start).total_seconds() // 60)
        )
        minute = max(0, min(minute, source.days * DAY))
        state = schedule_state(run.input_snapshot, _rows(run), minute)
        local = lambda m: format_local(start + timedelta(minutes=m))  # noqa: E731
        return StateResponse(
            at=local(minute),
            source_period_id=source.id,
            run_id=run.id,
            finished=state.finished,
            btp=state.btp,
            molds=state.molds,
            delivered={k: local(v) for k, v in state.delivered.items()},
            earmarked=state.earmarked,
            busy_until={k: local(v) for k, v in state.busy_until.items()},
            in_progress=state.in_progress,
            started=state.started,
            total_runs=state.total_runs,
        )

    def close(self, period_id: str) -> list[str]:
        """Close a period: its committed schedule is taken as executed, so orders it
        delivered leave the order book. Variants and reschedules close with it."""
        period = self._editable(period_id)
        root = self._root(period)
        delivered = self._delivered(self._executing(root) or root)
        done = self.book.mark_delivered(root.factory_id, delivered, root.id)
        now = utc_now()
        for p in [root, *self._children(root.id)]:
            if p.closed_at is None:
                p.closed_at = now
        self.session.commit()
        return done

    def _delivered(self, execution: PlanningPeriod) -> dict[str, str]:
        """Orders delivered over the whole period when `execution` is what ran: its own
        deliveries, plus those each plan it replaced made before the cut-off."""
        delivered: dict[str, str] = {}
        current: PlanningPeriod | None = execution
        until: str | None = None  # local cut-off where the next plan took over
        while current is not None:
            source, run = self.committed(current)
            start = datetime.combine(date.fromisoformat(source.start_date), datetime.min.time())
            minute = (
                source.days * DAY
                if until is None
                else int((parse_local(until) - start).total_seconds() // 60)
            )
            state = schedule_state(run.input_snapshot, _rows(run), minute)
            for code, m in state.delivered.items():
                delivered.setdefault(code, format_local(start + timedelta(minutes=m)))
            if current.kind != "reschedule" or not current.parent_id:
                break
            until = current.inputs.get("opening", {}).get("as_of")
            current = self.session.get(PlanningPeriod, current.parent_id)
            if until is None:
                break
        return delivered

    def _executing(self, root: PlanningPeriod) -> PlanningPeriod | None:
        """Latest committed reschedule of a period, if the plan was replanned mid-way."""
        latest: tuple[datetime, PlanningPeriod] | None = None
        for p in self._children(root.id):
            if p.kind != "reschedule":
                continue
            decision = self._latest_decision(p)
            if decision is not None and (latest is None or decision.decided_at > latest[0]):
                latest = (decision.decided_at, p)
        return latest[1] if latest else None

    def rollover(self, period_id: str, payload: RolloverCreate) -> PlanningPeriod:
        """Close this period and open the next one from where its committed schedule ends."""
        period = self.get(period_id)
        root = self._root(period)
        if root.closed_at is None:
            self.close(root.id)
        start = payload.start_date or period_end(root)
        return self.create(
            PeriodCreate(
                factory_id=root.factory_id,
                start_date=start,
                days=payload.days,
                name=payload.name,
                opening="previous",
                pull_orders=True,
            )
        )

    def reschedule(self, period_id: str, payload: RescheduleCreate) -> PlanningPeriod:
        """Replan the rest of a period from a cut-off: what already ran is fixed, the
        state at the cut-off becomes the opening, new incidents become exceptions."""
        period = self._editable(period_id)
        source, run = self.committed(period)
        start = datetime.combine(date.fromisoformat(source.start_date), datetime.min.time())
        try:
            cutoff = parse_local(payload.cutoff)
        except ValueError as exc:
            raise ApplicationError("INVALID_CUTOFF", str(exc), status_code=422) from exc
        minute = int((cutoff - start).total_seconds() // 60)
        if not 0 < minute < source.days * DAY:
            raise ApplicationError(
                "INVALID_CUTOFF", "The cut-off must fall inside the period", status_code=422
            )
        state = schedule_state(run.input_snapshot, _rows(run), minute)
        child_start = cutoff.date()
        offset = int(
            (datetime.combine(child_start, datetime.min.time()) - start).total_seconds() // 60
        )
        days = (period_end(source) - child_start).days
        base = PeriodInputs.model_validate(source.inputs)
        orders = []
        scheduled = {o["id"] for o in run.input_snapshot["orders"]}
        for order in base.orders:
            if order.code in state.delivered:
                continue
            if order.code in scheduled:
                order = order.model_copy(
                    update={
                        "from_stock": state.earmarked.get(order.code, order.from_stock),
                        "source": order.source,
                    }
                )
            orders.append(order)
        known = {o.code for o in orders}
        orders += [o for o in payload.add_orders if o.code not in known]
        frozen = minute - offset
        inputs = PeriodInputs(
            orders=orders,
            opening=_opening_from(state, as_of=format_local(cutoff)),
            exceptions=[*base.exceptions, *payload.exceptions],
            policy=base.policy,
            reserve_policy={},
            frozen_until=frozen,
            busy_until={m: end - offset for m, end in state.busy_until.items()},
            notes=[
                f"Lập lại lịch từ {cutoff:%d/%m %H:%M} theo lịch đã chốt của {source.name}"
                f"{' · ' + source.variant_label if source.variant_label else ''}.",
                "Lượt đang chạy tại thời điểm cắt được coi là hoàn tất; "
                "máy bận tới khi lượt kết thúc.",
                "Phương án làm trước được tắt khi lập lại lịch; bật lại ở mục Chính sách nếu cần.",
            ],
        )
        label = payload.label or f"Lập lại từ {cutoff:%d/%m %H:%M}"
        child = PlanningPeriod(
            factory_id=source.factory_id,
            factory_version=source.factory_version,
            name=self._root(source).name,
            start_date=child_start.isoformat(),
            days=days,
            kind="reschedule",
            parent_id=source.id,
            variant_label=label,
            inputs=inputs.model_dump(mode="json"),
            revision=1,
            compile_issues=[],
            compile_load=[],
        )
        self.session.add(child)
        self.session.flush()
        self._compile(child)
        self.session.commit()
        return child

    def _previous_committed(self, factory_id: str, start: date) -> PlanningPeriod | None:
        candidates = self.session.scalars(
            select(PlanningPeriod)
            .where(
                PlanningPeriod.factory_id == factory_id,
                PlanningPeriod.kind == "regular",
                PlanningPeriod.start_date < start.isoformat(),
            )
            .order_by(PlanningPeriod.start_date.desc())
        ).all()
        for candidate in candidates:
            try:
                self.committed(candidate)
            except ApplicationError:
                continue
            execution = self._executing(candidate)
            return execution or candidate
        return None

    # ------------------------------------------------------------ order book sync

    def book_sync(self, period: PlanningPeriod) -> BookSync:
        config = self.factories.config(period.factory_id, period.factory_version)
        end = period_end(period) + timedelta(days=config.lookahead_days)
        window = format_local(datetime.combine(end, datetime.min.time()))
        book = {
            o.code: o
            for o in self.session.scalars(
                select(BookOrder).where(BookOrder.factory_id == period.factory_id)
            )
        }
        inputs = PeriodInputs.model_validate(period.inputs)
        mine = {o.code: o for o in inputs.orders}
        added = sorted(
            code
            for code, o in book.items()
            if o.status == "open" and o.due < window and code not in mine
        )
        changed = []
        removed = []
        for code, order in mine.items():
            if order.source != "book":
                continue
            current = book.get(code)
            if current is None or current.status == "cancelled":
                removed.append(code)
                continue
            fields = [k for k in ORDER_FIELDS if getattr(current, k) != getattr(order, k)]
            if fields:
                changed.append(BookSyncChange(code=code, fields=fields))
        return BookSync(added=added, changed=changed, removed=sorted(removed))

    def apply_book_sync(self, period_id: str, expected_revision: int) -> PlanningPeriod:
        period = self._editable(period_id)
        sync = self.book_sync(period)
        inputs = PeriodInputs.model_validate(period.inputs)
        book = {
            o.code: o
            for o in self.session.scalars(
                select(BookOrder).where(BookOrder.factory_id == period.factory_id)
            )
        }
        changed = {c.code for c in sync.changed}
        removed = set(sync.removed)
        orders = []
        for order in inputs.orders:
            if order.code in removed:
                continue
            if order.code in changed:
                fresh = book_to_period_order(book[order.code])
                order = fresh.model_copy(update={"from_stock": order.from_stock})
            orders.append(order)
        orders += [book_to_period_order(book[code]) for code in sync.added]
        inputs.orders = orders
        return self.update_inputs(period_id, expected_revision, inputs)

    def delete(self, period_id: str) -> None:
        period = self.get(period_id)
        targets = [period, *self._children(period.id)]
        for p in reversed(targets):
            if p.dataset_id:
                dataset = self.session.get(MasterDataset, p.dataset_id)
                if dataset is not None:
                    self.session.delete(dataset)
            self.session.delete(p)
        self.session.commit()


def _rows(run: ScheduleRun) -> list[dict[str, Any]]:
    return [
        {
            "lot": op.lot,
            "stage": op.stage,
            "machine": op.machine,
            "block_start": op.block_start,
            "start": op.start,
            "end": op.end,
            "mold": op.mold,
            "cycles_after": op.cycles_after,
        }
        for op in run.operations
    ]


def _local(period: PlanningPeriod, minute: int) -> str:
    start = datetime.combine(date.fromisoformat(period.start_date), datetime.min.time())
    return format_local(start + timedelta(minutes=minute))


def _opening_from(state: Any, *, as_of: str) -> OpeningState:
    levels = StockLevels(
        finished=dict(state.finished), btp=dict(state.btp), molds=dict(state.molds)
    )
    return OpeningState(**levels.model_dump(), projected=levels, as_of=as_of)


def _comparable(inputs: dict[str, Any]) -> dict[str, Any]:
    """Inputs keyed for a readable diff: orders/exceptions by code/id instead of list position."""
    out = dict(inputs)
    out["orders"] = {o["code"]: o for o in inputs.get("orders", [])}
    out["exceptions"] = {e["id"]: e for e in inputs.get("exceptions", [])}
    opening = dict(inputs.get("opening", {}))
    opening.pop("projected", None)
    opening.pop("as_of", None)
    out["opening"] = opening
    out.pop("notes", None)
    return out
