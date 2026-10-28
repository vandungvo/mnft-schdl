from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response, status

from ..audit import AuditService
from ..errors import ApplicationError
from ..factories import FactoryService, OrderBookService
from ..factory_model import split_document
from ..factory_schemas import (
    BookOrderCreate,
    BookOrderList,
    BookOrderResponse,
    BookOrderUpdate,
    FactoryConfigUpdate,
    FactoryCreate,
    FactoryDetail,
    FactoryImport,
    FactoryList,
    FactoryRename,
    FactoryVersionDetail,
    OrderImportRequest,
    OrderImportResult,
    OutlookResponse,
    PeriodCreate,
    PeriodDetail,
    PeriodInputsUpdate,
    PeriodList,
    PeriodRename,
    RescheduleCreate,
    RolloverCreate,
    StateResponse,
    VariantCreate,
)
from ..periods import PeriodService
from .routes import DbSession

router = APIRouter()


# ---------------------------------------------------------------- factories


@router.get("/factories", response_model=FactoryList, tags=["factories"])
def list_factories(session: DbSession) -> FactoryList:
    items = FactoryService(session).list()
    return FactoryList(items=items, total=len(items))


@router.post(
    "/factories",
    response_model=FactoryDetail,
    status_code=status.HTTP_201_CREATED,
    tags=["factories"],
)
def create_factory(payload: FactoryCreate, session: DbSession) -> FactoryDetail:
    service = FactoryService(session)
    factory = service.create(payload.name, payload.config)
    session.commit()
    AuditService(session).record("factory.created", "factory", factory.id)
    return service.detail(factory.id)


@router.post(
    "/factories/import",
    response_model=FactoryDetail,
    status_code=status.HTTP_201_CREATED,
    tags=["factories"],
)
def import_factory(payload: FactoryImport, session: DbSession) -> FactoryDetail:
    factory = import_factory_document(
        session, payload.name, payload.document, create_period=payload.create_period
    )
    AuditService(session).record("factory.imported", "factory", factory)
    return FactoryService(session).detail(factory)


def import_factory_document(session, name: str, document: dict, *, create_period: bool) -> str:  # type: ignore[no-untyped-def]
    """Split a schema-5 document into plant, order book and first period; returns the factory id."""
    try:
        split = split_document(document)
    except (KeyError, TypeError, ValueError) as exc:
        raise ApplicationError(
            "FACTORY_IMPORT_INVALID",
            "The document is not a schema-5 factory input",
            status_code=422,
            details=[str(exc)],
        ) from exc
    factory = FactoryService(session).create(name, split.config, note="Nhập từ tài liệu schema 5")
    OrderBookService(session).add_many(
        factory.id,
        [
            {
                "code": o.code,
                "product": o.product,
                "quantity": o.quantity,
                "due": o.due,
                "priority": o.priority,
                "pickup": o.pickup,
                "customer": o.customer,
                "note": o.note,
            }
            for o in split.inputs.orders
        ],
        source="import",
    )
    if create_period:
        PeriodService(session).create_from_document(factory.id, document)
    session.commit()
    return factory.id


@router.get("/factories/{factory_id}", response_model=FactoryDetail, tags=["factories"])
def get_factory(factory_id: str, session: DbSession) -> FactoryDetail:
    return FactoryService(session).detail(factory_id)


@router.patch("/factories/{factory_id}", response_model=FactoryDetail, tags=["factories"])
def rename_factory(factory_id: str, payload: FactoryRename, session: DbSession) -> FactoryDetail:
    service = FactoryService(session)
    service.rename(factory_id, payload.name)
    AuditService(session).record(
        "factory.renamed", "factory", factory_id, details={"name": payload.name}
    )
    return service.detail(factory_id)


@router.put("/factories/{factory_id}/config", response_model=FactoryDetail, tags=["factories"])
def update_factory_config(
    factory_id: str, payload: FactoryConfigUpdate, session: DbSession
) -> FactoryDetail:
    service = FactoryService(session)
    factory = service.update_config(
        factory_id,
        expected_version=payload.expected_version,
        config=payload.config,
        effective_from=payload.effective_from,
        note=payload.note,
    )
    AuditService(session).record(
        "factory.configured",
        "factory",
        factory_id,
        details={
            "version": factory.current_version,
            "effective_from": str(payload.effective_from or ""),
        },
    )
    return service.detail(factory_id)


@router.get(
    "/factories/{factory_id}/versions/{version}",
    response_model=FactoryVersionDetail,
    tags=["factories"],
)
def get_factory_version(factory_id: str, version: int, session: DbSession) -> FactoryVersionDetail:
    row = FactoryService(session).version(factory_id, version)
    return FactoryVersionDetail.model_validate(row)


@router.get("/factories/{factory_id}/outlook", response_model=OutlookResponse, tags=["factories"])
def factory_outlook(
    factory_id: str,
    session: DbSession,
    start: date | None = None,
    weeks: Annotated[int, Query(ge=1, le=26)] = 8,
) -> OutlookResponse:
    return OrderBookService(session).outlook(factory_id, start=start or date.today(), weeks=weeks)


# ---------------------------------------------------------------- order book


@router.get("/factories/{factory_id}/orders", response_model=BookOrderList, tags=["order-book"])
def list_book_orders(
    factory_id: str,
    session: DbSession,
    order_status: Annotated[
        Literal["open", "delivered", "cancelled"] | None, Query(alias="status")
    ] = None,
    search: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    due_from: Annotated[str | None, Query(max_length=16)] = None,
    due_to: Annotated[str | None, Query(max_length=16)] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 500,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> BookOrderList:
    items, total = OrderBookService(session).list(
        factory_id,
        status=order_status,
        search=search,
        due_from=due_from,
        due_to=due_to,
        limit=limit,
        offset=offset,
    )
    return BookOrderList(
        items=[BookOrderResponse.model_validate(o) for o in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/factories/{factory_id}/orders",
    response_model=BookOrderResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["order-book"],
)
def create_book_order(
    factory_id: str, payload: BookOrderCreate, session: DbSession
) -> BookOrderResponse:
    order = OrderBookService(session).create(factory_id, payload)
    AuditService(session).record(
        "order.created", "factory", factory_id, details={"code": order.code}
    )
    return BookOrderResponse.model_validate(order)


@router.put(
    "/factories/{factory_id}/orders/{code}", response_model=BookOrderResponse, tags=["order-book"]
)
def update_book_order(
    factory_id: str, code: str, payload: BookOrderUpdate, session: DbSession
) -> BookOrderResponse:
    order = OrderBookService(session).update(factory_id, code, payload)
    AuditService(session).record(
        "order.updated", "factory", factory_id, details={"code": code, "status": order.status}
    )
    return BookOrderResponse.model_validate(order)


@router.delete(
    "/factories/{factory_id}/orders/{code}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["order-book"],
)
def delete_book_order(factory_id: str, code: str, session: DbSession) -> Response:
    OrderBookService(session).delete(factory_id, code)
    AuditService(session).record("order.deleted", "factory", factory_id, details={"code": code})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/factories/{factory_id}/orders/import", response_model=OrderImportResult, tags=["order-book"]
)
def import_book_orders(
    factory_id: str, payload: OrderImportRequest, session: DbSession
) -> OrderImportResult:
    result = OrderBookService(session).import_orders(factory_id, payload)
    if result.committed:
        AuditService(session).record(
            "order.imported", "factory", factory_id, details=result.summary.model_dump()
        )
    return result


# ---------------------------------------------------------------- planning periods


@router.get("/periods", response_model=PeriodList, tags=["periods"])
def list_periods(
    session: DbSession,
    factory_id: Annotated[str | None, Query(min_length=36, max_length=36)] = None,
    include_closed: bool = True,
) -> PeriodList:
    items = PeriodService(session).list(factory_id, include_closed=include_closed)
    return PeriodList(items=items, total=len(items))


@router.post(
    "/periods", response_model=PeriodDetail, status_code=status.HTTP_201_CREATED, tags=["periods"]
)
def create_period(payload: PeriodCreate, session: DbSession) -> PeriodDetail:
    service = PeriodService(session)
    period = service.create(payload)
    AuditService(session).record(
        "period.created", "planning_period", period.id, details={"start": period.start_date}
    )
    return service.detail(period.id)


@router.get("/periods/{period_id}", response_model=PeriodDetail, tags=["periods"])
def get_period(period_id: str, session: DbSession) -> PeriodDetail:
    return PeriodService(session).detail(period_id)


@router.patch("/periods/{period_id}", response_model=PeriodDetail, tags=["periods"])
def rename_period(period_id: str, payload: PeriodRename, session: DbSession) -> PeriodDetail:
    service = PeriodService(session)
    service.rename(period_id, payload.name, payload.variant_label)
    return service.detail(period_id)


@router.put("/periods/{period_id}/inputs", response_model=PeriodDetail, tags=["periods"])
def update_period_inputs(
    period_id: str, payload: PeriodInputsUpdate, session: DbSession
) -> PeriodDetail:
    service = PeriodService(session)
    period = service.update_inputs(period_id, payload.expected_revision, payload.inputs)
    AuditService(session).record(
        "period.inputs_updated", "planning_period", period_id, details={"revision": period.revision}
    )
    return service.detail(period_id)


@router.post("/periods/{period_id}/recompile", response_model=PeriodDetail, tags=["periods"])
def recompile_period(period_id: str, session: DbSession) -> PeriodDetail:
    service = PeriodService(session)
    service.recompile(period_id)
    return service.detail(period_id)


@router.post("/periods/{period_id}/upgrade-factory", response_model=PeriodDetail, tags=["periods"])
def upgrade_period_factory(period_id: str, session: DbSession) -> PeriodDetail:
    service = PeriodService(session)
    period = service.upgrade_factory(period_id)
    AuditService(session).record(
        "period.factory_upgraded",
        "planning_period",
        period_id,
        details={"version": period.factory_version},
    )
    return service.detail(period_id)


@router.post("/periods/{period_id}/book-sync", response_model=PeriodDetail, tags=["periods"])
def apply_period_book_sync(
    period_id: str, session: DbSession, expected_revision: Annotated[int, Query(gt=0)]
) -> PeriodDetail:
    service = PeriodService(session)
    service.apply_book_sync(period_id, expected_revision)
    AuditService(session).record("period.book_synced", "planning_period", period_id)
    return service.detail(period_id)


@router.post(
    "/periods/{period_id}/variants",
    response_model=PeriodDetail,
    status_code=status.HTTP_201_CREATED,
    tags=["periods"],
)
def create_period_variant(
    period_id: str, payload: VariantCreate, session: DbSession
) -> PeriodDetail:
    service = PeriodService(session)
    variant = service.create_variant(period_id, payload.label)
    AuditService(session).record(
        "period.variant_created", "planning_period", variant.id, details={"of": period_id}
    )
    return service.detail(variant.id)


@router.get("/periods/{period_id}/state", response_model=StateResponse, tags=["periods"])
def get_period_state(
    period_id: str, session: DbSession, at: Annotated[str | None, Query(max_length=19)] = None
) -> StateResponse:
    return PeriodService(session).state(period_id, at)


@router.post(
    "/periods/{period_id}/reschedule",
    response_model=PeriodDetail,
    status_code=status.HTTP_201_CREATED,
    tags=["periods"],
)
def reschedule_period(
    period_id: str, payload: RescheduleCreate, session: DbSession
) -> PeriodDetail:
    service = PeriodService(session)
    child = service.reschedule(period_id, payload)
    AuditService(session).record(
        "period.rescheduled",
        "planning_period",
        child.id,
        details={"of": period_id, "cutoff": payload.cutoff},
    )
    return service.detail(child.id)


@router.post("/periods/{period_id}/close", response_model=PeriodDetail, tags=["periods"])
def close_period(period_id: str, session: DbSession) -> PeriodDetail:
    service = PeriodService(session)
    delivered = service.close(period_id)
    AuditService(session).record(
        "period.closed", "planning_period", period_id, details={"delivered": len(delivered)}
    )
    return service.detail(period_id)


@router.post(
    "/periods/{period_id}/rollover",
    response_model=PeriodDetail,
    status_code=status.HTTP_201_CREATED,
    tags=["periods"],
)
def rollover_period(period_id: str, payload: RolloverCreate, session: DbSession) -> PeriodDetail:
    service = PeriodService(session)
    following = service.rollover(period_id, payload)
    AuditService(session).record(
        "period.rolled_over", "planning_period", following.id, details={"from": period_id}
    )
    return service.detail(following.id)


@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["periods"])
def delete_period(period_id: str, session: DbSession) -> Response:
    PeriodService(session).delete(period_id)
    AuditService(session).record("period.deleted", "planning_period", period_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
