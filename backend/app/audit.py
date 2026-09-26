from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import AuditEvent
from .request_context import current_actor


class AuditService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def record(
        self,
        action: str,
        resource_type: str,
        resource_id: str | None,
        *,
        actor: str | None = None,
        details: dict | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            actor=actor or current_actor.get(),
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
        )
        self.session.add(event)
        self.session.commit()
        self.session.refresh(event)
        return event

    def list(
        self,
        *,
        limit: int,
        offset: int,
        resource_type: str | None = None,
        resource_id: str | None = None,
    ) -> tuple[list[AuditEvent], int]:
        filters = []
        if resource_type:
            filters.append(AuditEvent.resource_type == resource_type)
        if resource_id:
            filters.append(AuditEvent.resource_id == resource_id)
        query = select(AuditEvent).where(*filters)
        items = list(
            self.session.scalars(
                query.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = self.session.scalar(
            select(func.count()).select_from(AuditEvent).where(*filters)
        ) or 0
        return items, total
