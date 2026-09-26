from __future__ import annotations

import logging

from models.common.instance import digest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import Settings
from .errors import ApplicationError, RunNotFoundError
from .jobs import ScheduleJobDispatcher
from .master_data import MasterDataService
from .models import RunStatus, ScheduleRun
from .planning import ProductionPlanningService
from .repository import ScheduleRunRepository
from .schemas import ScheduleRunCreate, ScheduleRunRetry

logger = logging.getLogger(__name__)


class ScheduleRunService:
    def __init__(
        self,
        session: Session,
        dispatcher: ScheduleJobDispatcher,
        settings: Settings,
    ) -> None:
        self.repository = ScheduleRunRepository(session)
        self.dispatcher = dispatcher
        self.settings = settings

    def create(self, request: ScheduleRunCreate, idempotency_key: str | None) -> ScheduleRun:
        if idempotency_key:
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing

        budget = request.time_budget_seconds or self.settings.solver_default_budget_seconds
        if budget > self.settings.solver_max_budget_seconds:
            raise ApplicationError(
                "TIME_BUDGET_EXCEEDED",
                f"time_budget_seconds cannot exceed {self.settings.solver_max_budget_seconds}",
                status_code=422,
            )
        dataset_id: str | None = None
        dataset_revision: int | None = None
        plan_id: str | None = None
        if request.dataset_id is not None:
            scheduling_input, dataset_revision = MasterDataService(
                self.repository.session
            ).get_scheduling_input(request.dataset_id)
            dataset_id = request.dataset_id
        elif request.plan_id is not None:
            scheduling_input, dataset_id, dataset_revision = ProductionPlanningService(
                self.repository.session
            ).get_scheduling_input(request.plan_id)
            plan_id = request.plan_id
        else:
            assert request.input is not None
            scheduling_input = request.input
        input_snapshot = scheduling_input.to_engine_dict()
        candidate = ScheduleRun(
            idempotency_key=idempotency_key,
            dataset_id=dataset_id,
            dataset_revision=dataset_revision,
            plan_id=plan_id,
            algorithm=request.algorithm,
            seed=request.seed,
            time_budget_seconds=budget,
            input_name=scheduling_input.name,
            time_origin=scheduling_input.origin,
            horizon_minutes=scheduling_input.horizon,
            input_hash=digest(input_snapshot),
            input_snapshot=input_snapshot,
        )
        try:
            run = self.repository.add(candidate)
        except IntegrityError:
            # A concurrent retry can pass the initial lookup before either request
            # commits. The unique key remains the source of truth in that race.
            self.repository.session.rollback()
            if not idempotency_key:
                raise
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is None:
                raise
            return existing
        self._dispatch(run)
        # Inline execution (used by tests and maintenance commands) completes in a
        # separate session. Expire this identity map so the response never returns
        # stale QUEUED state. In normal async mode it still returns the latest commit.
        self.repository.session.expire_all()
        return self.repository.get(run.id) or run

    def retry(
        self,
        run_id: str,
        request: ScheduleRunRetry,
        idempotency_key: str | None,
    ) -> ScheduleRun:
        if idempotency_key:
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing
        source = self.get(run_id)
        if source.status in {RunStatus.QUEUED.value, RunStatus.RUNNING.value}:
            raise ApplicationError(
                "RUN_NOT_TERMINAL",
                "Only a completed, failed, or cancelled run can be retried",
                status_code=409,
            )
        budget = request.time_budget_seconds or source.time_budget_seconds
        if budget > self.settings.solver_max_budget_seconds:
            raise ApplicationError(
                "TIME_BUDGET_EXCEEDED",
                f"time_budget_seconds cannot exceed {self.settings.solver_max_budget_seconds}",
                status_code=422,
            )
        candidate = ScheduleRun(
            idempotency_key=idempotency_key,
            dataset_id=source.dataset_id,
            dataset_revision=source.dataset_revision,
            plan_id=source.plan_id,
            retry_of_id=source.id,
            algorithm=request.algorithm or source.algorithm,
            seed=source.seed if request.seed is None else request.seed,
            time_budget_seconds=budget,
            input_name=source.input_name,
            time_origin=source.time_origin,
            horizon_minutes=source.horizon_minutes,
            input_hash=source.input_hash,
            input_snapshot=source.input_snapshot,
        )
        try:
            run = self.repository.add(candidate)
        except IntegrityError:
            self.repository.session.rollback()
            if not idempotency_key:
                raise
            existing = self.repository.get_by_idempotency_key(idempotency_key)
            if existing is None:
                raise
            return existing
        self._dispatch(run)
        self.repository.session.expire_all()
        return self.repository.get(run.id) or run

    def _dispatch(self, run: ScheduleRun) -> None:
        try:
            self.dispatcher.submit(run.id)
        except Exception:
            self.repository.fail(
                run,
                code="JOB_DISPATCH_FAILED",
                message="The scheduling job could not be submitted to a worker",
            )
            logger.exception("Schedule run dispatch failed", extra={"run_id": run.id})

    def get(self, run_id: str, *, with_operations: bool = False) -> ScheduleRun:
        run = self.repository.get(run_id, with_operations=with_operations)
        if run is None:
            raise RunNotFoundError(run_id)
        return run
