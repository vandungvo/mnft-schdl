from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session, selectinload

from .models import RunStatus, ScheduleOperation, ScheduleRun


def utc_now() -> datetime:
    return datetime.now(UTC)


class ScheduleRunRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, run: ScheduleRun) -> ScheduleRun:
        self.session.add(run)
        self.session.commit()
        self.session.refresh(run)
        return run

    def get(self, run_id: str, *, with_operations: bool = False) -> ScheduleRun | None:
        statement = select(ScheduleRun).where(ScheduleRun.id == run_id)
        if with_operations:
            statement = statement.options(selectinload(ScheduleRun.operations))
        return self.session.scalar(statement)

    def get_by_idempotency_key(self, key: str) -> ScheduleRun | None:
        return self.session.scalar(select(ScheduleRun).where(ScheduleRun.idempotency_key == key))

    def list(
        self,
        *,
        limit: int,
        offset: int,
        status: str | None = None,
        algorithm: str | None = None,
        search: str | None = None,
    ) -> tuple[list[ScheduleRun], int]:
        filters = []
        if status:
            filters.append(ScheduleRun.status == status)
        if algorithm:
            filters.append(ScheduleRun.algorithm == algorithm)
        if search:
            pattern = f"%{search.strip().lower()}%"
            filters.append(
                or_(
                    func.lower(ScheduleRun.input_name).like(pattern),
                    func.lower(ScheduleRun.input_hash).like(pattern),
                )
            )
        items = list(
            self.session.scalars(
                select(ScheduleRun)
                .where(*filters)
                .order_by(ScheduleRun.created_at.desc(), ScheduleRun.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = (
            self.session.scalar(select(func.count()).select_from(ScheduleRun).where(*filters)) or 0
        )
        return items, total

    def claim(self, run_id: str) -> bool:
        now = utc_now()
        result = self.session.execute(
            update(ScheduleRun)
            .where(
                ScheduleRun.id == run_id,
                ScheduleRun.status == RunStatus.QUEUED.value,
            )
            .values(status=RunStatus.RUNNING.value, started_at=now, updated_at=now)
        )
        self.session.commit()
        return result.rowcount == 1

    def complete(
        self,
        run: ScheduleRun,
        *,
        operations: list[dict[str, Any]],
        solver_status: str,
        solver_metadata: dict[str, Any],
        validation: dict[str, Any],
        metrics: dict[str, Any],
    ) -> None:
        run.operations = [ScheduleOperation(**operation) for operation in operations]
        run.status = RunStatus.SUCCEEDED.value
        run.solver_status = solver_status
        run.solver_metadata = solver_metadata
        run.validation = validation
        run.metrics = metrics
        run.error_code = None
        run.error_message = None
        run.finished_at = utc_now()
        run.updated_at = run.finished_at
        self.session.commit()

    def fail(
        self,
        run: ScheduleRun,
        *,
        code: str,
        message: str,
        solver_status: str | None = None,
        solver_metadata: dict[str, Any] | None = None,
        validation: dict[str, Any] | None = None,
    ) -> None:
        run.status = RunStatus.FAILED.value
        run.solver_status = solver_status
        run.solver_metadata = solver_metadata
        run.validation = validation
        run.error_code = code
        run.error_message = message
        run.finished_at = utc_now()
        run.updated_at = run.finished_at
        self.session.commit()

    def recover_interrupted(self) -> list[str]:
        """Requeue unfinished jobs after a clean application process restart."""
        rows = list(
            self.session.scalars(
                select(ScheduleRun).where(
                    ScheduleRun.status.in_([RunStatus.QUEUED.value, RunStatus.RUNNING.value])
                )
            )
        )
        for run in rows:
            run.status = RunStatus.QUEUED.value
            run.started_at = None
            run.updated_at = utc_now()
        self.session.commit()
        return [run.id for run in rows]
