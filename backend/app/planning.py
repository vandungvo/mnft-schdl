from __future__ import annotations

from collections import defaultdict
from typing import Any

from models.common.instance import digest, duration, eligible
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .errors import ApplicationError
from .master_data import MasterDataService
from .models import ProductionPlan
from .schemas import ProductionPlanCreate, SchedulingInput


class ProductionPlanningService:
    """Build immutable, deterministic aggregate plans from revisioned master data."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, request: ProductionPlanCreate) -> ProductionPlan:
        scheduling_input, revision = MasterDataService(self.session).get_scheduling_input(
            request.dataset_id
        )
        period_end = request.period_end or scheduling_input.horizon
        if request.period_start >= period_end or period_end > scheduling_input.horizon:
            raise ApplicationError(
                "INVALID_PLANNING_PERIOD",
                "Planning period must satisfy 0 <= period_start < period_end <= horizon",
                status_code=422,
                details={"horizon": scheduling_input.horizon},
            )

        existing = self.session.scalar(
            select(ProductionPlan).where(
                ProductionPlan.dataset_id == request.dataset_id,
                ProductionPlan.dataset_revision == revision,
                ProductionPlan.period_start == request.period_start,
                ProductionPlan.period_end == period_end,
                ProductionPlan.bucket_minutes == request.bucket_minutes,
            )
        )
        if existing is not None:
            return existing

        snapshot = scheduling_input.to_engine_dict()
        result, plan_status = self._calculate(
            snapshot,
            period_start=request.period_start,
            period_end=period_end,
            bucket_minutes=request.bucket_minutes,
        )
        plan = ProductionPlan(
            dataset_id=request.dataset_id,
            dataset_revision=revision,
            input_hash=digest(snapshot),
            input_snapshot=snapshot,
            period_start=request.period_start,
            period_end=period_end,
            bucket_minutes=request.bucket_minutes,
            status=plan_status,
            result=result,
        )
        try:
            self.session.add(plan)
            self.session.commit()
            self.session.refresh(plan)
        except IntegrityError:
            # Concurrent identical requests converge on the database uniqueness rule.
            self.session.rollback()
            existing = self.session.scalar(
                select(ProductionPlan).where(
                    ProductionPlan.dataset_id == request.dataset_id,
                    ProductionPlan.dataset_revision == revision,
                    ProductionPlan.period_start == request.period_start,
                    ProductionPlan.period_end == period_end,
                    ProductionPlan.bucket_minutes == request.bucket_minutes,
                )
            )
            if existing is None:
                raise
            return existing
        return plan

    def get(self, plan_id: str) -> ProductionPlan:
        plan = self.session.get(ProductionPlan, plan_id)
        if plan is None:
            raise ApplicationError(
                "PRODUCTION_PLAN_NOT_FOUND",
                f"Production plan '{plan_id}' was not found",
                status_code=404,
            )
        return plan

    def list(
        self,
        *,
        limit: int,
        offset: int,
        status: str | None = None,
        search: str | None = None,
    ) -> tuple[list[ProductionPlan], int]:
        filters = []
        if status:
            filters.append(ProductionPlan.status == status)
        if search:
            pattern = f"%{search.strip().lower()}%"
            filters.append(
                or_(
                    func.lower(ProductionPlan.id).like(pattern),
                    func.lower(ProductionPlan.input_snapshot["name"].as_string()).like(pattern),
                )
            )
        plans = list(
            self.session.scalars(
                select(ProductionPlan)
                .where(*filters)
                .order_by(ProductionPlan.created_at.desc(), ProductionPlan.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = (
            self.session.scalar(select(func.count()).select_from(ProductionPlan).where(*filters))
            or 0
        )
        return plans, total

    def delete(self, plan_id: str) -> None:
        plan = self.get(plan_id)
        self.session.delete(plan)
        self.session.commit()

    def get_scheduling_input(self, plan_id: str) -> tuple[SchedulingInput, str | None, int]:
        plan = self.get(plan_id)
        return (
            SchedulingInput.model_validate(plan.input_snapshot),
            plan.dataset_id,
            plan.dataset_revision,
        )

    @staticmethod
    def _calculate(
        data: dict[str, Any], *, period_start: int, period_end: int, bucket_minutes: int
    ) -> tuple[dict[str, Any], str]:
        orders = [order for order in data["orders"] if period_start < order["due"] <= period_end]
        order_ids = {order["id"] for order in orders}
        lots = [lot for lot in data["lots"] if lot["order"] in order_ids]

        demand: defaultdict[str, int] = defaultdict(int)
        inventory_allocated: defaultdict[str, int] = defaultdict(int)
        planned_lots: defaultdict[str, int] = defaultdict(int)
        for order in orders:
            demand[order["product"]] += order["quantity"]
            inventory_allocated[order["product"]] += order["initial_allocated"]
        for lot in lots:
            planned_lots[lot["product"]] += lot["quantity"]

        products: list[dict[str, Any]] = []
        has_shortfall = False
        for product in data["products"]:
            initial = data["initial_inventory"][product]
            product_demand = demand[product]
            safety = data["safety_stock"][product]
            projected = initial + planned_lots[product] - product_demand
            shortfall = max(0, safety - projected)
            has_shortfall = has_shortfall or shortfall > 0
            products.append(
                {
                    "product": product,
                    "demand_qty": product_demand,
                    "initial_inventory": initial,
                    "inventory_allocated": inventory_allocated[product],
                    "required_production_qty": max(0, product_demand + safety - initial),
                    "planned_lot_qty": planned_lots[product],
                    "projected_ending_inventory": projected,
                    "safety_stock": safety,
                    "safety_shortfall": shortfall,
                }
            )

        stages: list[dict[str, Any]] = []
        has_overload = False
        for stage in data["stages"]:
            required = 0
            for lot in lots:
                machines = eligible(data, lot, stage)
                required += min(duration(data, lot, machine) for machine in machines)
            available = sum(
                max(0, min(window["end"], period_end) - max(window["start"], period_start))
                for machine in data["machines"].values()
                if machine["stage"] == stage
                for window in machine["windows"]
            )
            overloaded = required > available
            has_overload = has_overload or overloaded
            stages.append(
                {
                    "stage": stage,
                    "lot_count": len(lots),
                    "required_minutes": required,
                    "available_minutes": available,
                    "load_ratio": round(required / available, 4) if available else None,
                    "overloaded": overloaded,
                }
            )

        buckets: list[dict[str, Any]] = []
        cursor = period_start
        while cursor < period_end:
            bucket_end = min(period_end, cursor + bucket_minutes)
            bucket_orders = [order for order in orders if cursor < order["due"] <= bucket_end]
            bucket_order_ids = {order["id"] for order in bucket_orders}
            bucket_lots = [lot for lot in lots if lot["order"] in bucket_order_ids]
            bucket_demand: defaultdict[str, int] = defaultdict(int)
            bucket_production: defaultdict[str, int] = defaultdict(int)
            for order in bucket_orders:
                bucket_demand[order["product"]] += order["quantity"]
            for lot in bucket_lots:
                bucket_production[lot["product"]] += lot["quantity"]
            buckets.append(
                {
                    "start": cursor,
                    "end": bucket_end,
                    "products": [
                        {
                            "product": product,
                            "demand_qty": bucket_demand[product],
                            "production_qty": bucket_production[product],
                        }
                        for product in data["products"]
                    ],
                }
            )
            cursor = bucket_end

        warnings = []
        if has_overload:
            warnings.append("At least one stage exceeds its calendar capacity lower bound.")
        if has_shortfall:
            warnings.append("At least one product ends below its configured safety-stock target.")
        warnings.append(
            "Aggregate capacity excludes sequence-dependent setup and mold maintenance; "
            "the validated detailed schedule remains the execution authority."
        )
        assumptions = [
            "Orders are assigned to the period containing their due minute (start, end].",
            "Each lot uses its fastest eligible machine duration as a capacity lower bound.",
            "Initial inventory is treated as available at the start of the selected period.",
            *data.get("assumptions", []),
        ]
        result = {
            "order_count": len(orders),
            "lot_count": len(lots),
            "products": products,
            "stages": stages,
            "buckets": buckets,
            "warnings": warnings,
            "assumptions": assumptions,
        }
        return result, "NEEDS_ATTENTION" if has_overload or has_shortfall else "READY"
