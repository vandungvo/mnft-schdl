from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .errors import ApplicationError, RunNotFoundError
from .models import MasterDataset, RunStatus, ScheduleDecision, ScheduleRun, utc_now
from .request_context import current_actor
from .schemas import ScheduleDecisionCreate


class DecisionService:
    """Committed schedules per scenario. Append-only: a newer one supersedes, none is edited."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self, dataset_id: str, payload: ScheduleDecisionCreate
    ) -> tuple[ScheduleDecision, bool]:
        """Returns the decision and whether it is new (False = legacy import already stored)."""
        self._require_dataset(dataset_id)
        if payload.legacy_key:
            existing = self.session.scalar(
                select(ScheduleDecision).where(ScheduleDecision.legacy_key == payload.legacy_key)
            )
            if existing is not None:
                return existing, False
        elif payload.decided_at is not None:
            raise ApplicationError(
                "DECIDED_AT_NOT_ALLOWED",
                "decided_at may only be set when importing a legacy decision (legacy_key)",
                status_code=422,
            )

        run = self.session.get(ScheduleRun, payload.run_id)
        if run is None:
            raise RunNotFoundError(payload.run_id)
        if run.dataset_id != dataset_id:
            raise ApplicationError(
                "DECISION_RUN_MISMATCH",
                f"Schedule run '{run.id}' was not generated from this scenario",
                status_code=422,
            )
        if run.status != RunStatus.SUCCEEDED.value:
            raise ApplicationError(
                "DECISION_RUN_NOT_SUCCEEDED",
                f"Only a succeeded run can be committed; this one is {run.status}",
                status_code=409,
            )

        decision = ScheduleDecision(
            dataset_id=dataset_id,
            run_id=run.id,
            dataset_revision=run.dataset_revision,
            input_hash=run.input_hash,
            algorithm=run.algorithm,
            seed=run.seed,
            alternative=payload.alternative,
            policy=payload.policy,
            score=payload.score,
            late=payload.late,
            shortfall=payload.shortfall,
            shifts=payload.shifts,
            reason=payload.reason,
            actor=current_actor.get(),
            legacy_key=payload.legacy_key,
            decided_at=self._decided_at(payload.decided_at),
        )
        self.session.add(decision)
        self.session.commit()
        self.session.refresh(decision)
        return decision, True

    def list(
        self, dataset_id: str, *, limit: int, offset: int
    ) -> tuple[list[ScheduleDecision], int]:
        self._require_dataset(dataset_id)
        where = ScheduleDecision.dataset_id == dataset_id
        items = list(
            self.session.scalars(
                select(ScheduleDecision)
                .where(where)
                .order_by(ScheduleDecision.decided_at.desc(), ScheduleDecision.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = (
            self.session.scalar(select(func.count()).select_from(ScheduleDecision).where(where))
            or 0
        )
        return items, total

    def _require_dataset(self, dataset_id: str) -> None:
        if self.session.get(MasterDataset, dataset_id) is None:
            raise ApplicationError(
                "DATASET_NOT_FOUND", f"Master dataset '{dataset_id}' was not found", status_code=404
            )

    @staticmethod
    def _decided_at(value: datetime | None) -> datetime:
        now = utc_now()
        if value is None:
            return now
        value = value if value.tzinfo else value.replace(tzinfo=UTC)
        # A browser clock may run ahead; a decision cannot be recorded in the future.
        return min(value, now)
