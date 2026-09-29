from __future__ import annotations

from datetime import timedelta
from time import perf_counter
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request, Response, status
from models.common.experiment import METHODS
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ..audit import AuditService
from ..database import session_dependency
from ..errors import ApplicationError
from ..master_data import MasterDataService
from ..models import MasterDataset, ProductionPlan, RunStatus, ScheduleRun, utc_now
from ..planning import ProductionPlanningService
from ..repository import ScheduleRunRepository
from ..schemas import (
    AuditEventList,
    AuditEventResponse,
    BtpCodeCreate,
    BtpCodeRename,
    BtpInventoryUpsert,
    BtpRoutingSet,
    HealthResponse,
    MachineReplace,
    MasterDatasetDetail,
    MasterDatasetImport,
    MasterDatasetList,
    OrderUpdate,
    ProductCreate,
    ProductionPlanCreate,
    ProductionPlanDetail,
    ProductionPlanList,
    ProductionPlanSummary,
    ProductUpdate,
    ScheduleRunCreate,
    ScheduleRunDetail,
    ScheduleRunList,
    ScheduleRunRetry,
    ScheduleRunSummary,
)
from ..services import ScheduleRunService

router = APIRouter()


def get_session(request: Request):  # type: ignore[no-untyped-def]
    yield from session_dependency(request.app.state.session_factory)


DbSession = Annotated[Session, Depends(get_session)]


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health(request: Request, session: DbSession) -> HealthResponse:
    started = perf_counter()
    session.execute(text("SELECT 1"))
    database_latency_ms = round((perf_counter() - started) * 1000, 2)
    settings = request.app.state.settings
    dataset_count = session.scalar(select(func.count()).select_from(MasterDataset)) or 0
    production_plan_count = session.scalar(select(func.count()).select_from(ProductionPlan)) or 0
    plans_needing_attention = (
        session.scalar(
            select(func.count())
            .select_from(ProductionPlan)
            .where(ProductionPlan.status == "NEEDS_ATTENTION")
        )
        or 0
    )
    schedule_run_count = session.scalar(select(func.count()).select_from(ScheduleRun)) or 0
    queued_runs = (
        session.scalar(
            select(func.count())
            .select_from(ScheduleRun)
            .where(ScheduleRun.status == RunStatus.QUEUED)
        )
        or 0
    )
    running_runs = (
        session.scalar(
            select(func.count())
            .select_from(ScheduleRun)
            .where(ScheduleRun.status == RunStatus.RUNNING)
        )
        or 0
    )
    failed_runs_24h = (
        session.scalar(
            select(func.count())
            .select_from(ScheduleRun)
            .where(
                ScheduleRun.status == RunStatus.FAILED,
                ScheduleRun.created_at >= utc_now() - timedelta(hours=24),
            )
        )
        or 0
    )
    latest_run_finished_at = session.scalar(
        select(ScheduleRun.finished_at)
        .where(ScheduleRun.finished_at.is_not(None))
        .order_by(ScheduleRun.finished_at.desc())
        .limit(1)
    )
    return HealthResponse(
        service=settings.application_name,
        environment=settings.environment,
        master_data_status="ready" if dataset_count else "empty",
        master_dataset_count=dataset_count,
        production_plan_count=production_plan_count,
        plans_needing_attention=plans_needing_attention,
        schedule_run_count=schedule_run_count,
        solver_default_budget_seconds=settings.solver_default_budget_seconds,
        solver_max_budget_seconds=settings.solver_max_budget_seconds,
        supported_algorithms=METHODS,
        database_latency_ms=database_latency_ms,
        queued_runs=queued_runs,
        running_runs=running_runs,
        failed_runs_24h=failed_runs_24h,
        latest_run_finished_at=latest_run_finished_at,
    )


@router.get("/audit-events", response_model=AuditEventList, tags=["system"])
def list_audit_events(
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    resource_type: Annotated[str | None, Query(max_length=80)] = None,
    resource_id: Annotated[str | None, Query(max_length=100)] = None,
) -> AuditEventList:
    items, total = AuditService(session).list(
        limit=limit,
        offset=offset,
        resource_type=resource_type,
        resource_id=resource_id,
    )
    return AuditEventList(
        items=[AuditEventResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/master-data/datasets/import",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
    tags=["master-data"],
)
def import_master_dataset(payload: MasterDatasetImport, session: DbSession) -> MasterDatasetDetail:
    dataset = MasterDataService(session).import_input(payload.input)
    AuditService(session).record(
        "master_data.imported", "master_dataset", dataset.id, details={"revision": dataset.revision}
    )
    return dataset


@router.get(
    "/master-data/datasets",
    response_model=MasterDatasetList,
    tags=["master-data"],
)
def list_master_datasets(
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
) -> MasterDatasetList:
    items, total = MasterDataService(session).list(limit=limit, offset=offset, search=search)
    return MasterDatasetList(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/master-data/datasets/{dataset_id}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def get_master_dataset(dataset_id: str, session: DbSession) -> MasterDatasetDetail:
    return MasterDataService(session).get_detail(dataset_id)


@router.put(
    "/master-data/datasets/{dataset_id}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def replace_master_dataset(
    dataset_id: str, payload: MasterDatasetImport, session: DbSession
) -> MasterDatasetDetail:
    if payload.expected_revision is None:
        raise ApplicationError(
            "REVISION_REQUIRED",
            "expected_revision is required when replacing master data",
            status_code=428,
        )
    dataset = MasterDataService(session).replace(
        dataset_id, payload.input, expected_revision=payload.expected_revision
    )
    AuditService(session).record(
        "master_data.replaced", "master_dataset", dataset_id, details={"revision": dataset.revision}
    )
    return dataset


@router.post(
    "/master-data/datasets/{dataset_id}/products",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def create_product(
    dataset_id: str, payload: ProductCreate, session: DbSession
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).create_product(dataset_id, **payload.model_dump())
    AuditService(session).record(
        "product.created",
        "master_dataset",
        dataset_id,
        details={"code": payload.code, "revision": dataset.revision},
    )
    return dataset


@router.patch(
    "/master-data/datasets/{dataset_id}/products/{product_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def update_product(
    dataset_id: str, product_code: str, payload: ProductUpdate, session: DbSession
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).update_product(
        dataset_id, product_code, **payload.model_dump()
    )
    AuditService(session).record(
        "product.updated",
        "master_dataset",
        dataset_id,
        details={"code": product_code, "revision": dataset.revision},
    )
    return dataset


@router.delete(
    "/master-data/datasets/{dataset_id}/products/{product_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def delete_product(
    dataset_id: str,
    product_code: str,
    session: DbSession,
    expected_revision: Annotated[int, Query(gt=0)],
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).delete_product(
        dataset_id, product_code, expected_revision=expected_revision
    )
    AuditService(session).record(
        "product.deleted",
        "master_dataset",
        dataset_id,
        details={"code": product_code, "revision": dataset.revision},
    )
    return dataset


@router.post(
    "/master-data/datasets/{dataset_id}/btp-codes",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def create_btp_code(
    dataset_id: str, payload: BtpCodeCreate, session: DbSession
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).create_btp_code(dataset_id, **payload.model_dump())
    AuditService(session).record(
        "btp_code.created", "master_dataset", dataset_id,
        details={"code": payload.code, "revision": dataset.revision},
    )
    return dataset


@router.patch(
    "/master-data/datasets/{dataset_id}/btp-codes/{btp_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def rename_btp_code(
    dataset_id: str, btp_code: str, payload: BtpCodeRename, session: DbSession
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).rename_btp_code(
        dataset_id, btp_code, expected_revision=payload.expected_revision, new_code=payload.code
    )
    AuditService(session).record(
        "btp_code.renamed", "master_dataset", dataset_id,
        details={"code": btp_code, "new_code": payload.code, "revision": dataset.revision},
    )
    return dataset


@router.delete(
    "/master-data/datasets/{dataset_id}/btp-codes/{btp_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def delete_btp_code(
    dataset_id: str,
    btp_code: str,
    session: DbSession,
    expected_revision: Annotated[int, Query(gt=0)],
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).delete_btp_code(
        dataset_id, btp_code, expected_revision=expected_revision
    )
    AuditService(session).record(
        "btp_code.deleted", "master_dataset", dataset_id,
        details={"code": btp_code, "revision": dataset.revision},
    )
    return dataset


@router.put(
    "/master-data/datasets/{dataset_id}/btp-codes/{btp_code}/inventory",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def upsert_btp_inventory(
    dataset_id: str, btp_code: str, payload: BtpInventoryUpsert, session: DbSession
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).upsert_btp_inventory(
        dataset_id, btp_code, **payload.model_dump()
    )
    AuditService(session).record(
        "btp_inventory.updated", "master_dataset", dataset_id,
        details={"code": btp_code, "revision": dataset.revision},
    )
    return dataset


@router.delete(
    "/master-data/datasets/{dataset_id}/btp-codes/{btp_code}/inventory",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def delete_btp_inventory(
    dataset_id: str,
    btp_code: str,
    session: DbSession,
    expected_revision: Annotated[int, Query(gt=0)],
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).delete_btp_inventory(
        dataset_id, btp_code, expected_revision=expected_revision
    )
    AuditService(session).record(
        "btp_inventory.deleted", "master_dataset", dataset_id,
        details={"code": btp_code, "revision": dataset.revision},
    )
    return dataset


@router.put(
    "/master-data/datasets/{dataset_id}/products/{product_code}/routing/{stage}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def set_btp_routing(
    dataset_id: str, product_code: str, stage: str, payload: BtpRoutingSet, session: DbSession
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).set_btp_routing(
        dataset_id, product_code, stage,
        expected_revision=payload.expected_revision, btp_code=payload.btp_code,
    )
    AuditService(session).record(
        "btp_routing.updated", "master_dataset", dataset_id,
        details={"code": product_code, "stage": stage, "btp_code": payload.btp_code, "revision": dataset.revision},
    )
    return dataset


@router.patch(
    "/master-data/datasets/{dataset_id}/orders/{order_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def update_order(
    dataset_id: str, order_code: str, payload: OrderUpdate, session: DbSession
) -> MasterDatasetDetail:
    values = payload.model_dump(exclude={"expected_revision"})
    dataset = MasterDataService(session).update_order(
        dataset_id,
        order_code,
        expected_revision=payload.expected_revision,
        values=values,
    )
    AuditService(session).record(
        "order.updated",
        "master_dataset",
        dataset_id,
        details={"code": order_code, "revision": dataset.revision},
    )
    return dataset


@router.delete(
    "/master-data/datasets/{dataset_id}/orders/{order_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def delete_order(
    dataset_id: str,
    order_code: str,
    session: DbSession,
    expected_revision: Annotated[int, Query(gt=0)],
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).delete_order(
        dataset_id, order_code, expected_revision=expected_revision
    )
    AuditService(session).record(
        "order.deleted",
        "master_dataset",
        dataset_id,
        details={"code": order_code, "revision": dataset.revision},
    )
    return dataset


@router.put(
    "/master-data/datasets/{dataset_id}/machines/{machine_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def replace_machine(
    dataset_id: str, machine_code: str, payload: MachineReplace, session: DbSession
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).replace_machine(
        dataset_id,
        machine_code,
        expected_revision=payload.expected_revision,
        machine=payload.machine.model_dump(mode="json", exclude_none=True),
    )
    AuditService(session).record(
        "machine.updated",
        "master_dataset",
        dataset_id,
        details={"code": machine_code, "revision": dataset.revision},
    )
    return dataset


@router.delete(
    "/master-data/datasets/{dataset_id}/machines/{machine_code}",
    response_model=MasterDatasetDetail,
    response_model_exclude_none=True,
    tags=["master-data"],
)
def delete_machine(
    dataset_id: str,
    machine_code: str,
    session: DbSession,
    expected_revision: Annotated[int, Query(gt=0)],
) -> MasterDatasetDetail:
    dataset = MasterDataService(session).delete_machine(
        dataset_id, machine_code, expected_revision=expected_revision
    )
    AuditService(session).record(
        "machine.deleted",
        "master_dataset",
        dataset_id,
        details={"code": machine_code, "revision": dataset.revision},
    )
    return dataset


@router.delete(
    "/master-data/datasets/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["master-data"],
)
def delete_master_dataset(dataset_id: str, session: DbSession) -> Response:
    MasterDataService(session).delete(dataset_id)
    AuditService(session).record("master_data.deleted", "master_dataset", dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/production-plans",
    response_model=ProductionPlanDetail,
    status_code=status.HTTP_201_CREATED,
    tags=["production-planning"],
)
def create_production_plan(
    payload: ProductionPlanCreate, session: DbSession
) -> ProductionPlanDetail:
    plan = ProductionPlanningService(session).create(payload)
    AuditService(session).record(
        "production_plan.created",
        "production_plan",
        plan.id,
        details={"dataset_id": payload.dataset_id},
    )
    return ProductionPlanDetail.model_validate(plan)


@router.get(
    "/production-plans",
    response_model=ProductionPlanList,
    tags=["production-planning"],
)
def list_production_plans(
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    plan_status: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    search: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
) -> ProductionPlanList:
    items, total = ProductionPlanningService(session).list(
        limit=limit,
        offset=offset,
        status=plan_status,
        search=search,
    )
    return ProductionPlanList(
        items=[ProductionPlanSummary.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/production-plans/{plan_id}",
    response_model=ProductionPlanDetail,
    tags=["production-planning"],
)
def get_production_plan(plan_id: str, session: DbSession) -> ProductionPlanDetail:
    return ProductionPlanDetail.model_validate(ProductionPlanningService(session).get(plan_id))


@router.delete(
    "/production-plans/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["production-planning"],
)
def delete_production_plan(plan_id: str, session: DbSession) -> Response:
    ProductionPlanningService(session).delete(plan_id)
    AuditService(session).record("production_plan.deleted", "production_plan", plan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/schedule-runs",
    response_model=ScheduleRunSummary,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["scheduling"],
)
def create_schedule_run(
    payload: ScheduleRunCreate,
    request: Request,
    session: DbSession,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key", max_length=200)] = None,
) -> ScheduleRunSummary:
    service = ScheduleRunService(session, request.app.state.dispatcher, request.app.state.settings)
    existing = (
        ScheduleRunRepository(session).get_by_idempotency_key(idempotency_key)
        if idempotency_key
        else None
    )
    run = service.create(payload, idempotency_key)
    if existing is None:
        AuditService(session).record(
            "schedule_run.created", "schedule_run", run.id, details={"algorithm": run.algorithm}
        )
    return ScheduleRunSummary.model_validate(run)


@router.post(
    "/schedule-runs/{run_id}/retry",
    response_model=ScheduleRunSummary,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["scheduling"],
)
def retry_schedule_run(
    run_id: str,
    payload: ScheduleRunRetry,
    request: Request,
    session: DbSession,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key", max_length=200)] = None,
) -> ScheduleRunSummary:
    service = ScheduleRunService(session, request.app.state.dispatcher, request.app.state.settings)
    existing = (
        ScheduleRunRepository(session).get_by_idempotency_key(idempotency_key)
        if idempotency_key
        else None
    )
    run = service.retry(run_id, payload, idempotency_key)
    if existing is None:
        AuditService(session).record(
            "schedule_run.retried",
            "schedule_run",
            run.id,
            details={"retry_of_id": run_id, "algorithm": run.algorithm},
        )
    return ScheduleRunSummary.model_validate(run)


@router.get("/schedule-runs", response_model=ScheduleRunList, tags=["scheduling"])
def list_schedule_runs(
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    run_status: Annotated[RunStatus | None, Query(alias="status")] = None,
    algorithm: Annotated[str | None, Query(max_length=40)] = None,
    search: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
) -> ScheduleRunList:
    items, total = ScheduleRunRepository(session).list(
        limit=limit,
        offset=offset,
        status=run_status.value if run_status else None,
        algorithm=algorithm,
        search=search,
    )
    return ScheduleRunList(
        items=[ScheduleRunSummary.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/schedule-runs/{run_id}",
    response_model=ScheduleRunDetail,
    tags=["scheduling"],
)
def get_schedule_run(run_id: str, request: Request, session: DbSession) -> ScheduleRunDetail:
    service = ScheduleRunService(session, request.app.state.dispatcher, request.app.state.settings)
    return ScheduleRunDetail.model_validate(service.get(run_id, with_operations=True))
