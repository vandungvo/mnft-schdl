"""Planner-in-the-loop edits of a finished schedule.

The planner moves runs between machines, reorders a machine or sets an earliest start;
the engine rebuilds the times (models/common/stage_runs/manual.py), the independent
validator checks the result and the evaluator scores it. A preview never writes; saving
stores the result as a new succeeded run on the same input snapshot, so it sits next to
the solver's options, is ranked by the same policy and can be compared and committed
like any of them. The source run is never modified (runs stay reproducible evidence).
"""
from __future__ import annotations

import copy
import time
from typing import Any

from models.common.instance import digest, upgrade_input
from models.common.stage_runs.evaluate import evaluate, validate
from models.common.stage_runs.manual import EditError, apply_edits, issues_of
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .audit import AuditService
from .config import Settings
from .engine.adapter import REPAIR_ALGORITHM, _stored_rows
from .errors import ApplicationError, RunNotFoundError
from .models import MasterDataset, PlanningPeriod, RunStatus, ScheduleOperation, ScheduleRun, utc_now
from .repository import ScheduleRunRepository
from .jobs import ScheduleJobDispatcher
from .schemas import ScheduleEditRequest, ScheduleOptimizeRequest

MANUAL_ALGORITHM = "manual"


def _engine_rows(run: ScheduleRun) -> list[dict[str, Any]]:
    """schedule_operations rows -> schema-5 engine rows (the run id is stored in `lot`)."""
    return [
        {
            "run": op.lot, "item": op.item, "stage": op.stage, "machine": op.machine,
            "block_start": op.block_start, "start": op.start, "end": op.end,
            "setup_minutes": op.setup_minutes, "maintenance_minutes": op.maintenance_minutes,
            "cycles_after": op.cycles_after, "mold": op.mold, "window": op.window, "shift": op.shift,
        }
        for op in run.operations
    ]


class ManualEditService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ScheduleRunRepository(session)

    def _base(self, run_id: str) -> tuple[ScheduleRun, dict[str, Any], list[dict[str, Any]]]:
        run = self.repository.get(run_id, with_operations=True)
        if run is None:
            raise RunNotFoundError(run_id)
        if run.status != RunStatus.SUCCEEDED.value:
            raise ApplicationError(
                "RUN_NOT_EDITABLE", f"Only a succeeded run can be edited; this one is {run.status}", status_code=409
            )
        data = upgrade_input(copy.deepcopy(run.input_snapshot))
        if data.get("schema_version") != 5:
            raise ApplicationError(
                "EDIT_NOT_SUPPORTED",
                "Manual editing is available for the 5-stage production model (schema_version 5) only",
                status_code=422,
            )
        return run, data, _engine_rows(run)

    def _require_open_period(self, run: ScheduleRun) -> None:
        """A closed period's schedule is history: no new options are stored for it."""
        dataset = self.session.get(MasterDataset, run.dataset_id) if run.dataset_id else None
        period = self.session.get(PlanningPeriod, dataset.owner_period_id) if dataset and dataset.owner_period_id else None
        if period is not None and period.closed_at is not None:
            raise ApplicationError("PERIOD_CLOSED", "A closed period cannot be changed", status_code=409)

    def preview(self, run_id: str, request: ScheduleEditRequest) -> dict[str, Any]:
        base, data, base_rows = self._base(run_id)
        outcome = self._evaluate(base, data, base_rows, request)
        return {key: outcome[key] for key in ("valid", "issues", "metrics", "base_metrics", "changes", "operations")}

    def _evaluate(self, base: ScheduleRun, data: dict[str, Any], base_rows: list[dict[str, Any]],
                  request: ScheduleEditRequest) -> dict[str, Any]:
        started = time.perf_counter()
        late = sorted(rid for rid, minute in request.not_before.items() if minute >= data["horizon"])
        if late:
            raise ApplicationError(
                "NOT_BEFORE_OUTSIDE_HORIZON", f"earliest starts at or after the end of the horizon: {late[:10]}", status_code=422,
            )
        result: dict[str, Any] = {"base_metrics": base.metrics or {}, "metrics": None, "operations": [], "changes": []}
        try:
            rows = apply_edits(data, base_rows, request.sequence, moved=request.moved,
                               not_before=request.not_before, compact=request.compact)
        except EditError as exc:
            return {**result, "valid": False, "issues": [{"code": exc.code, "subject": None, "minute": None, "raw": str(exc), "runs": exc.runs}]}
        check = validate(data, rows)
        old = {row["run"]: row for row in base_rows}
        changes = [
            {"run": row["run"], "stage": row["stage"], "from_machine": old[row["run"]]["machine"], "to_machine": row["machine"],
             "from_start": old[row["run"]]["block_start"], "to_start": row["block_start"]}
            for row in rows
            if (row["machine"], row["block_start"]) != (old[row["run"]]["machine"], old[row["run"]]["block_start"])
        ]
        stored = _stored_rows(rows)
        result.update(
            valid=check["valid"],
            issues=[{**issue, "runs": []} for issue in issues_of(check["errors"])],
            operations=[{"id": index, **row} for index, row in enumerate(stored)],
            changes=changes,
            validation=check,
            seconds=time.perf_counter() - started,
            rows=rows,
        )
        if check["valid"]:
            result["metrics"] = evaluate(data, rows)[0]
        return result

    def optimize(self, run_id: str, request: ScheduleOptimizeRequest, idempotency_key: str | None,
                 settings: Settings, dispatcher: ScheduleJobDispatcher) -> ScheduleRun:
        """Queue a CP-SAT re-optimisation around the (valid) edit; returns the queued run."""
        if idempotency_key:
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing
        if request.time_budget_seconds > settings.solver_max_budget_seconds:
            raise ApplicationError(
                "TIME_BUDGET_EXCEEDED",
                f"time_budget_seconds cannot exceed {settings.solver_max_budget_seconds}", status_code=422,
            )
        base, data, base_rows = self._base(run_id)
        self._require_open_period(base)
        outcome = self._evaluate(base, data, base_rows, request)
        if not outcome["valid"]:
            raise ApplicationError(
                "EDIT_INVALID", "Only a valid edit can be optimised", status_code=422, details={"issues": outcome["issues"]},
            )
        rows = outcome["rows"]
        known = {row["run"] for row in rows}
        unknown = sorted(set(request.pinned) - known)
        if unknown:
            raise ApplicationError("UNKNOWN_RUN", f"pinned runs not in the schedule: {unknown[:10]}", status_code=422)
        fixed = set(request.pinned)
        if request.keep_edited:
            fixed |= set(request.moved) | set(request.not_before)
        if request.freeze_until is not None:
            fixed |= {row["run"] for row in rows if row["block_start"] < request.freeze_until}
        if fixed >= known:
            raise ApplicationError("NOTHING_TO_OPTIMIZE", "Every run is pinned or frozen; nothing is left to optimise", status_code=422)
        run = ScheduleRun(
            idempotency_key=idempotency_key,
            dataset_id=base.dataset_id,
            dataset_revision=base.dataset_revision,
            plan_id=base.plan_id,
            status=RunStatus.QUEUED.value,
            algorithm=REPAIR_ALGORITHM,
            seed=request.seed,
            time_budget_seconds=request.time_budget_seconds,
            input_name=base.input_name,
            time_origin=base.time_origin,
            horizon_minutes=base.horizon_minutes,
            input_hash=base.input_hash,
            input_snapshot=base.input_snapshot,
            solver_metadata={
                "repair": {
                    "rows": rows,
                    "fixed": sorted(fixed),
                    "edited_from": base.id,
                    "edited_from_algorithm": base.algorithm,
                    "label": request.label,
                    "note": request.note,
                    "changed_runs": len(outcome["changes"]),
                    "pinned": len(request.pinned),
                    "freeze_until": request.freeze_until,
                    "keep_edited": request.keep_edited,
                }
            },
        )
        try:
            run = self.repository.add(run)
        except IntegrityError:
            self.session.rollback()
            if not idempotency_key:
                raise
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is None:
                raise
            return existing
        AuditService(self.session).record(
            "schedule_run.repair_queued", "schedule_run", run.id,
            details={"edited_from": base.id, "fixed_runs": len(fixed), "budget": request.time_budget_seconds},
        )
        try:
            dispatcher.submit(run.id)
        except Exception:
            self.repository.fail(run, code="JOB_DISPATCH_FAILED", message="The scheduling job could not be submitted to a worker")
        self.session.expire_all()
        return self.repository.get(run.id) or run

    def save(self, run_id: str, request: ScheduleEditRequest, idempotency_key: str | None) -> ScheduleRun:
        if idempotency_key:
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing
        base, data, base_rows = self._base(run_id)
        self._require_open_period(base)
        outcome = self._evaluate(base, data, base_rows, request)
        if not outcome["valid"]:
            raise ApplicationError(
                "EDIT_INVALID", "The edited schedule does not pass the independent validator",
                status_code=422, details={"issues": outcome["issues"]},
            )
        if not outcome["changes"]:
            raise ApplicationError("EDIT_EMPTY", "The edit changes nothing in the schedule", status_code=422)
        now = utc_now()
        run = ScheduleRun(
            idempotency_key=idempotency_key,
            dataset_id=base.dataset_id,
            dataset_revision=base.dataset_revision,
            plan_id=base.plan_id,
            retry_of_id=None,
            status=RunStatus.SUCCEEDED.value,
            algorithm=MANUAL_ALGORITHM,
            seed=base.seed,
            time_budget_seconds=0.0,
            input_name=base.input_name,
            time_origin=base.time_origin,
            horizon_minutes=base.horizon_minutes,
            input_hash=base.input_hash,
            input_snapshot=base.input_snapshot,
            operations=[ScheduleOperation(**row) for row in _stored_rows(outcome["rows"])],
            solver_status="MANUAL_EDIT",
            solver_metadata={
                "status": "MANUAL_EDIT",
                "edited_from": base.id,
                "edited_from_algorithm": base.algorithm,
                "label": request.label,
                "note": request.note,
                "moved": request.moved,
                "not_before": request.not_before,
                "compact": request.compact,
                "changed_runs": len(outcome["changes"]),
                "algorithm_seconds": outcome["seconds"],
                "history": [],
                "plan_hash": digest(request.model_dump(mode="json")),
            },
            validation=outcome["validation"],
            metrics=outcome["metrics"],
            started_at=now,
            finished_at=now,
        )
        try:
            run = self.repository.add(run)
        except IntegrityError:
            self.session.rollback()
            if not idempotency_key:
                raise
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is None:
                raise
            return existing
        AuditService(self.session).record(
            "schedule_run.manual_edit", "schedule_run", run.id,
            details={"edited_from": base.id, "changed_runs": len(outcome["changes"]), "label": request.label},
        )
        return run
