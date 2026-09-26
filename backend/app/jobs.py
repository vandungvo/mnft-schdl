from __future__ import annotations

import logging
from concurrent.futures import CancelledError, Future, ThreadPoolExecutor
from threading import Lock

from sqlalchemy.orm import Session, sessionmaker

from .audit import AuditService
from .engine.adapter import InvalidScheduleError, NoScheduleError, SchedulingEngine
from .repository import ScheduleRunRepository

logger = logging.getLogger(__name__)


class ScheduleJobDispatcher:
    """Dispatches persisted jobs and keeps execution behind a replaceable boundary.

    The MVP uses a bounded local executor. The database claim makes duplicate submissions
    harmless and allows a later external worker to use the same job contract.
    """

    def __init__(
        self,
        session_factory: sessionmaker[Session],
        engine: SchedulingEngine,
        *,
        max_workers: int,
        inline: bool = False,
    ) -> None:
        self._session_factory = session_factory
        self._engine = engine
        self._inline = inline
        self._executor = (
            None
            if inline
            else ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="schedule-solver")
        )
        self._futures: set[Future[None]] = set()
        self._lock = Lock()

    def submit(self, run_id: str) -> None:
        if self._inline:
            self._execute(run_id)
            return
        assert self._executor is not None
        future = self._executor.submit(self._execute, run_id)
        with self._lock:
            self._futures.add(future)
        future.add_done_callback(self._discard)

    def _discard(self, future: Future[None]) -> None:
        with self._lock:
            self._futures.discard(future)
        try:
            error = future.exception()
        except CancelledError:
            logger.warning("Schedule worker future was cancelled")
            return
        if error is not None:
            logger.error(
                "Unhandled schedule worker future failure",
                exc_info=(type(error), error, error.__traceback__),
            )

    def _execute(self, run_id: str) -> None:
        with self._session_factory() as session:
            repository = ScheduleRunRepository(session)
            if not repository.claim(run_id):
                return
            run = repository.get(run_id)
            if run is None:
                logger.error("Claimed run disappeared", extra={"run_id": run_id})
                return
            logger.info("Schedule run started", extra={"run_id": run_id})
            try:
                result = self._engine.run(
                    run.input_snapshot,
                    algorithm=run.algorithm,
                    time_budget_seconds=run.time_budget_seconds,
                    seed=run.seed,
                )
                repository.complete(
                    run,
                    operations=result.operations,
                    solver_status=result.solver_status,
                    solver_metadata=result.solver_metadata,
                    validation=result.validation,
                    metrics=result.metrics,
                )
                AuditService(session).record(
                    "schedule_run.succeeded",
                    "schedule_run",
                    run_id,
                    actor="scheduler-worker",
                    details={"solver_status": result.solver_status},
                )
                logger.info("Schedule run completed", extra={"run_id": run_id})
            except NoScheduleError as exc:
                session.rollback()
                run = repository.get(run_id)
                if run is None:
                    return
                repository.fail(
                    run,
                    code="NO_SCHEDULE_FOUND",
                    message=str(exc),
                    solver_status=exc.solver_status,
                    solver_metadata=exc.metadata,
                    validation={"valid": False, "errors": [str(exc)]},
                )
                AuditService(session).record(
                    "schedule_run.failed",
                    "schedule_run",
                    run_id,
                    actor="scheduler-worker",
                    details={"error_code": "NO_SCHEDULE_FOUND"},
                )
                logger.warning("No schedule found", extra={"run_id": run_id})
            except InvalidScheduleError as exc:
                session.rollback()
                run = repository.get(run_id)
                if run is None:
                    return
                repository.fail(
                    run,
                    code="INVALID_SCHEDULE",
                    message=str(exc),
                    validation=exc.validation,
                )
                AuditService(session).record(
                    "schedule_run.failed",
                    "schedule_run",
                    run_id,
                    actor="scheduler-worker",
                    details={"error_code": "INVALID_SCHEDULE"},
                )
                logger.error("Invalid schedule rejected", extra={"run_id": run_id})
            except Exception:
                session.rollback()
                run = repository.get(run_id)
                if run is None:
                    logger.exception("Run disappeared while handling a scheduling failure")
                    return
                repository.fail(
                    run,
                    code="SOLVER_ERROR",
                    message="The scheduling engine failed unexpectedly",
                )
                AuditService(session).record(
                    "schedule_run.failed",
                    "schedule_run",
                    run_id,
                    actor="scheduler-worker",
                    details={"error_code": "SOLVER_ERROR"},
                )
                logger.exception("Unexpected scheduling failure", extra={"run_id": run_id})

    def shutdown(self) -> None:
        if self._executor is not None:
            self._executor.shutdown(wait=True, cancel_futures=False)
