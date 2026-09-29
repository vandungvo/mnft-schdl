from __future__ import annotations

from collections import defaultdict
from typing import Any

from models.common.instance import digest
from pydantic import ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .errors import ApplicationError
from .models import (
    MachineCapability,
    MachineChangeover,
    MachineDowntime,
    MachineShift,
    MachineWindow,
    MasterBtpCode,
    MasterBtpInventory,
    MasterBtpRouting,
    MasterDataset,
    MasterLot,
    MasterLotAllocation,
    MasterMachine,
    MasterMold,
    MasterOrder,
    MasterProduct,
    utc_now,
)
from .schemas import (
    MasterDatasetCounts,
    MasterDatasetDetail,
    MasterDatasetSummary,
    SchedulingInput,
)

BTP_STAGES = ("cast", "cnc", "paint")


def _routing_by_product(rows: list[MasterBtpRouting]) -> dict[str, dict[str, str]]:
    grouped: dict[str, dict[str, str]] = {}
    for row in rows:
        grouped.setdefault(row.product_code, {})[row.stage] = row.btp_code
    return grouped


class MasterDataService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def import_input(self, scheduling_input: SchedulingInput) -> MasterDatasetDetail:
        raw = scheduling_input.to_engine_dict()
        source_hash = digest(raw)
        existing = self.session.scalar(
            select(MasterDataset).where(MasterDataset.source_hash == source_hash)
        )
        if existing is not None:
            return self.get_detail(existing.id)

        dataset = MasterDataset(
            source_hash=source_hash,
            revision=1,
        )
        self._apply_metadata(dataset, scheduling_input)
        try:
            self.session.add(dataset)
            self.session.flush()
            self._import_products(dataset.id, raw)
            self._import_btp_codes(dataset.id, raw)
            self._import_btp_routing(dataset.id, raw)
            self._import_btp_inventory(dataset.id, raw)
            self._import_machines(dataset.id, raw)
            self._import_demand(dataset.id, raw)
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            existing = self.session.scalar(
                select(MasterDataset).where(MasterDataset.source_hash == source_hash)
            )
            if existing is None:
                raise
            return self.get_detail(existing.id)
        except Exception:
            self.session.rollback()
            raise
        return self.get_detail(dataset.id)

    def replace(
        self,
        dataset_id: str,
        scheduling_input: SchedulingInput,
        *,
        expected_revision: int,
    ) -> MasterDatasetDetail:
        dataset = self._get(dataset_id)
        if dataset.revision != expected_revision:
            self._raise_revision_conflict(dataset.revision)
        raw = scheduling_input.to_engine_dict()
        source_hash = digest(raw)
        if source_hash == dataset.source_hash:
            return self.get_detail(dataset_id)
        conflict = self.session.scalar(
            select(MasterDataset).where(
                MasterDataset.source_hash == source_hash,
                MasterDataset.id != dataset_id,
            )
        )
        if conflict is not None:
            raise ApplicationError(
                "DATASET_ALREADY_EXISTS",
                "An identical master dataset already exists",
                status_code=409,
                details={"dataset_id": conflict.id},
            )
        try:
            claimed = self.session.execute(
                update(MasterDataset)
                .where(
                    MasterDataset.id == dataset_id,
                    MasterDataset.revision == expected_revision,
                )
                .values(revision=expected_revision + 1, updated_at=utc_now())
                .execution_options(synchronize_session=False)
            )
            if claimed.rowcount != 1:
                self.session.rollback()
                current = self._get(dataset_id)
                self._raise_revision_conflict(current.revision)
            dataset.products.clear()
            dataset.machines.clear()
            dataset.orders.clear()
            dataset.lots.clear()
            dataset.btp_inventory.clear()
            dataset.btp_routing.clear()
            dataset.btp_codes.clear()
            self.session.flush()
            dataset.source_hash = source_hash
            dataset.revision = expected_revision + 1
            dataset.updated_at = utc_now()
            self._apply_metadata(dataset, scheduling_input)
            self._import_products(dataset.id, raw)
            self._import_btp_codes(dataset.id, raw)
            self._import_btp_routing(dataset.id, raw)
            self._import_btp_inventory(dataset.id, raw)
            self._import_machines(dataset.id, raw)
            self._import_demand(dataset.id, raw)
            self.session.commit()
            self.session.expire_all()
        except Exception:
            self.session.rollback()
            raise
        return self.get_detail(dataset_id)

    def create_product(
        self,
        dataset_id: str,
        *,
        expected_revision: int,
        code: str,
        color: str,
        line: str,
        initial_inventory: int,
        safety_stock: int,
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            if code in raw["products"]:
                raise ApplicationError(
                    "PRODUCT_ALREADY_EXISTS", f"Product '{code}' already exists", status_code=409
                )
            raw["products"].append(code)
            raw["product_color"][code] = color
            raw["product_line"][code] = line
            raw["initial_inventory"][code] = initial_inventory
            raw["safety_stock"][code] = safety_stock
            # New product starts with its own dedicated BTP codes (no assumed
            # sharing) — user can consolidate/re-route via the routing UI later.
            raw["btp_routing"][code] = {}
            for stage in BTP_STAGES:
                btp_code = f"{code}_{stage.upper()}"
                if btp_code not in raw["btp_codes"]:
                    raw["btp_codes"].append(btp_code)
                raw["btp_routing"][code][stage] = btp_code

        return self._mutate(dataset_id, expected_revision, mutate)

    def update_product(
        self,
        dataset_id: str,
        code: str,
        *,
        expected_revision: int,
        color: str,
        line: str,
        initial_inventory: int,
        safety_stock: int,
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            self._require_code(raw["products"], code, "PRODUCT_NOT_FOUND")
            raw["product_color"][code] = color
            raw["product_line"][code] = line
            raw["initial_inventory"][code] = initial_inventory
            raw["safety_stock"][code] = safety_stock

        return self._mutate(dataset_id, expected_revision, mutate)

    def delete_product(
        self, dataset_id: str, code: str, *, expected_revision: int
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            self._require_code(raw["products"], code, "PRODUCT_NOT_FOUND")
            used = any(item["product"] == code for item in [*raw["orders"], *raw["lots"]])
            used = used or any(
                code in machine["minutes_per_unit"]
                or machine["initial_product"] == code
                or code in machine["setup"]
                or any(code in targets for targets in machine["setup"].values())
                for machine in raw["machines"].values()
            )
            if used:
                raise ApplicationError(
                    "PRODUCT_IN_USE",
                    f"Product '{code}' is referenced by demand or machine configuration",
                    status_code=409,
                )
            raw["products"].remove(code)
            raw["product_color"].pop(code, None)
            raw["product_line"].pop(code, None)
            raw["initial_inventory"].pop(code)
            raw["safety_stock"].pop(code)
            raw["btp_routing"].pop(code, None)

        return self._mutate(dataset_id, expected_revision, mutate)

    def create_btp_code(
        self, dataset_id: str, *, expected_revision: int, code: str
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            if code in raw["btp_codes"]:
                raise ApplicationError(
                    "BTP_CODE_ALREADY_EXISTS", f"BTP code '{code}' already exists", status_code=409
                )
            raw["btp_codes"].append(code)

        return self._mutate(dataset_id, expected_revision, mutate)

    def rename_btp_code(
        self, dataset_id: str, code: str, *, expected_revision: int, new_code: str
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            self._require_code(raw["btp_codes"], code, "BTP_CODE_NOT_FOUND")
            if new_code != code and new_code in raw["btp_codes"]:
                raise ApplicationError(
                    "BTP_CODE_ALREADY_EXISTS", f"BTP code '{new_code}' already exists", status_code=409
                )
            raw["btp_codes"] = [new_code if item == code else item for item in raw["btp_codes"]]
            for stage_map in raw["btp_routing"].values():
                for stage, mapped in list(stage_map.items()):
                    if mapped == code:
                        stage_map[stage] = new_code
            if code in raw["inventory_btp"]:
                raw["inventory_btp"][new_code] = raw["inventory_btp"].pop(code)
            if code in raw["btp_capacity"]:
                raw["btp_capacity"][new_code] = raw["btp_capacity"].pop(code)

        return self._mutate(dataset_id, expected_revision, mutate)

    def delete_btp_code(
        self, dataset_id: str, code: str, *, expected_revision: int
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            self._require_code(raw["btp_codes"], code, "BTP_CODE_NOT_FOUND")
            used = any(
                mapped == code for stage_map in raw["btp_routing"].values() for mapped in stage_map.values()
            )
            if used:
                raise ApplicationError(
                    "BTP_CODE_IN_USE",
                    f"BTP code '{code}' is referenced by a product/stage routing",
                    status_code=409,
                )
            raw["btp_codes"].remove(code)
            raw["inventory_btp"].pop(code, None)
            raw["btp_capacity"].pop(code, None)

        return self._mutate(dataset_id, expected_revision, mutate)

    def set_btp_routing(
        self, dataset_id: str, product_code: str, stage: str, *, expected_revision: int, btp_code: str
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            self._require_code(raw["products"], product_code, "PRODUCT_NOT_FOUND")
            if stage not in BTP_STAGES:
                raise ApplicationError(
                    "BTP_STAGE_INVALID",
                    f"'{stage}' is not a semi-finished stage (expected one of {BTP_STAGES})",
                    status_code=422,
                )
            self._require_code(raw["btp_codes"], btp_code, "BTP_CODE_NOT_FOUND")
            raw["btp_routing"].setdefault(product_code, {})[stage] = btp_code

        return self._mutate(dataset_id, expected_revision, mutate)

    def upsert_btp_inventory(
        self,
        dataset_id: str,
        btp_code: str,
        *,
        expected_revision: int,
        initial_qty: int,
        capacity: int | None,
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            self._require_code(raw["btp_codes"], btp_code, "BTP_CODE_NOT_FOUND")
            raw["inventory_btp"][btp_code] = initial_qty
            if capacity is None:
                raw["btp_capacity"].pop(btp_code, None)
            else:
                raw["btp_capacity"][btp_code] = capacity

        return self._mutate(dataset_id, expected_revision, mutate)

    def delete_btp_inventory(
        self, dataset_id: str, btp_code: str, *, expected_revision: int
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            self._require_code(raw["btp_codes"], btp_code, "BTP_CODE_NOT_FOUND")
            raw["inventory_btp"].pop(btp_code, None)
            raw["btp_capacity"].pop(btp_code, None)

        return self._mutate(dataset_id, expected_revision, mutate)

    def update_order(
        self, dataset_id: str, order_code: str, *, expected_revision: int, values: dict[str, Any]
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            order = next((item for item in raw["orders"] if item["id"] == order_code), None)
            if order is None:
                raise ApplicationError(
                    "ORDER_NOT_FOUND", f"Order '{order_code}' was not found", status_code=404
                )
            order.update(values)
            if order.get("deadline") is None:
                order.pop("deadline", None)

        return self._mutate(dataset_id, expected_revision, mutate)

    def delete_order(
        self, dataset_id: str, order_code: str, *, expected_revision: int
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            before = len(raw["orders"])
            raw["orders"] = [item for item in raw["orders"] if item["id"] != order_code]
            if len(raw["orders"]) == before:
                raise ApplicationError(
                    "ORDER_NOT_FOUND", f"Order '{order_code}' was not found", status_code=404
                )
            raw["lots"] = [item for item in raw["lots"] if item["order"] != order_code]

        return self._mutate(dataset_id, expected_revision, mutate)

    def replace_machine(
        self,
        dataset_id: str,
        machine_code: str,
        *,
        expected_revision: int,
        machine: dict[str, Any],
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            raw["machines"][machine_code] = machine

        return self._mutate(dataset_id, expected_revision, mutate)

    def delete_machine(
        self, dataset_id: str, machine_code: str, *, expected_revision: int
    ) -> MasterDatasetDetail:
        def mutate(raw: dict[str, Any]) -> None:
            if machine_code not in raw["machines"]:
                raise ApplicationError(
                    "MACHINE_NOT_FOUND",
                    f"Machine '{machine_code}' was not found",
                    status_code=404,
                )
            raw["machines"].pop(machine_code)

        return self._mutate(dataset_id, expected_revision, mutate)

    def _mutate(
        self,
        dataset_id: str,
        expected_revision: int,
        mutation,  # type: ignore[no-untyped-def]
    ) -> MasterDatasetDetail:
        detail = self.get_detail(dataset_id)
        if detail.revision != expected_revision:
            self._raise_revision_conflict(detail.revision)
        raw = detail.input.to_engine_dict()
        mutation(raw)
        try:
            scheduling_input = SchedulingInput.model_validate(raw)
        except ValidationError as exc:
            raise ApplicationError(
                "MASTER_DATA_VALIDATION_ERROR",
                "The change would make the scheduling dataset invalid",
                status_code=422,
                details=[error["msg"] for error in exc.errors()],
            ) from exc
        return self.replace(dataset_id, scheduling_input, expected_revision=expected_revision)

    @staticmethod
    def _require_code(values: list[str], code: str, error_code: str) -> None:
        if code not in values:
            raise ApplicationError(error_code, f"'{code}' was not found", status_code=404)

    @staticmethod
    def _raise_revision_conflict(current_revision: int) -> None:
        raise ApplicationError(
            "REVISION_CONFLICT",
            "Master data was changed by another request; reload before saving",
            status_code=409,
            details={"current_revision": current_revision},
        )

    @staticmethod
    def _apply_metadata(dataset: MasterDataset, scheduling_input: SchedulingInput) -> None:
        dataset.name = scheduling_input.name
        dataset.schema_version = scheduling_input.schema_version
        dataset.seed = scheduling_input.seed
        dataset.origin = scheduling_input.origin
        dataset.time_unit = scheduling_input.time_unit
        dataset.horizon = scheduling_input.horizon
        dataset.working_days = scheduling_input.working_days
        dataset.stages = scheduling_input.stages
        dataset.checkpoints = scheduling_input.checkpoints
        dataset.minimum_lot = scheduling_input.minimum_lot
        dataset.max_surplus = scheduling_input.max_surplus
        dataset.max_surplus_btp = scheduling_input.max_surplus_btp
        dataset.transfer_minutes = scheduling_input.transfer_minutes
        dataset.weights = scheduling_input.weights.model_dump(mode="json")
        dataset.assumptions = scheduling_input.assumptions

    def _import_products(self, dataset_id: str, raw: dict[str, Any]) -> None:
        self.session.add_all(
            [
                MasterProduct(
                    dataset_id=dataset_id,
                    code=code,
                    color=raw["product_color"].get(code, "UNKNOWN"),
                    line=raw["product_line"].get(code, "UNKNOWN"),
                    initial_inventory=raw["initial_inventory"][code],
                    safety_stock=raw["safety_stock"][code],
                    sort_index=index,
                )
                for index, code in enumerate(raw["products"])
            ]
        )

    def _import_btp_codes(self, dataset_id: str, raw: dict[str, Any]) -> None:
        self.session.add_all(
            [
                MasterBtpCode(dataset_id=dataset_id, code=code, sort_index=index)
                for index, code in enumerate(raw["btp_codes"])
            ]
        )

    def _import_btp_routing(self, dataset_id: str, raw: dict[str, Any]) -> None:
        self.session.add_all(
            [
                MasterBtpRouting(
                    dataset_id=dataset_id, product_code=product_code, stage=stage, btp_code=btp_code
                )
                for product_code, stage_map in raw["btp_routing"].items()
                for stage, btp_code in stage_map.items()
            ]
        )

    def _import_btp_inventory(self, dataset_id: str, raw: dict[str, Any]) -> None:
        codes = set(raw["inventory_btp"]) | set(raw["btp_capacity"])
        self.session.add_all(
            [
                MasterBtpInventory(
                    dataset_id=dataset_id,
                    btp_code=code,
                    initial_qty=raw["inventory_btp"].get(code, 0),
                    capacity=raw["btp_capacity"].get(code),
                )
                for code in codes
            ]
        )

    def _import_machines(self, dataset_id: str, raw: dict[str, Any]) -> None:
        for machine_index, (code, spec) in enumerate(raw["machines"].items()):
            machine = MasterMachine(
                dataset_id=dataset_id,
                code=code,
                stage=spec["stage"],
                fixed_minutes=spec["fixed_minutes"],
                initial_product=spec["initial_product"],
                sort_index=machine_index,
            )
            self.session.add(machine)
            self.session.flush()
            self.session.add_all(
                [
                    MachineCapability(
                        machine_id=machine.id,
                        product_code=product,
                        minutes_per_unit=minutes,
                    )
                    for product, minutes in spec["minutes_per_unit"].items()
                ]
            )
            self.session.add_all(
                [
                    MachineChangeover(
                        machine_id=machine.id,
                        from_product=from_product,
                        to_product=to_product,
                        minutes=minutes,
                    )
                    for from_product, targets in spec["setup"].items()
                    for to_product, minutes in targets.items()
                ]
            )
            self.session.add_all(
                [
                    MachineWindow(
                        machine_id=machine.id,
                        external_id=window["id"],
                        shift_code=window["shift"],
                        start=window["start"],
                        end=window["end"],
                    )
                    for window in spec["windows"]
                ]
            )
            self.session.add_all(
                [
                    MachineShift(
                        machine_id=machine.id,
                        code=shift["id"],
                        day=shift["day"],
                        start=shift["start"],
                        end=shift["end"],
                        available_minutes=shift["available_minutes"],
                        sort_index=index,
                    )
                    for index, shift in enumerate(spec["shifts"])
                ]
            )
            self.session.add_all(
                [
                    MachineDowntime(machine_id=machine.id, start=start, end=end)
                    for start, end in spec["downtime"]
                ]
            )
            if mold := spec.get("mold"):
                self.session.add(
                    MasterMold(
                        machine_id=machine.id,
                        code=mold["id"],
                        cavities=mold["cavities"],
                        limit_cycles=mold["limit_cycles"],
                        initial_cycles=mold["initial_cycles"],
                        maintenance_minutes=mold["maintenance_minutes"],
                        after_maintenance=mold["after_maintenance"],
                    )
                )

    def _import_demand(self, dataset_id: str, raw: dict[str, Any]) -> None:
        order_by_code: dict[str, MasterOrder] = {}
        for index, spec in enumerate(raw["orders"]):
            order = MasterOrder(
                dataset_id=dataset_id,
                code=spec["id"],
                product_code=spec["product"],
                release=spec["release"],
                due=spec["due"],
                priority=spec["priority"],
                urgent=spec["urgent"],
                quantity=spec["quantity"],
                initial_allocated=spec["initial_allocated"],
                deadline=spec.get("deadline"),
                sort_index=index,
            )
            self.session.add(order)
            order_by_code[order.code] = order

        lot_by_code: dict[str, MasterLot] = {}
        for index, spec in enumerate(raw["lots"]):
            lot = MasterLot(
                dataset_id=dataset_id,
                code=spec["id"],
                order_code=spec["order"],
                product_code=spec["product"],
                quantity=spec["quantity"],
                release=spec["release"],
                sort_index=index,
            )
            self.session.add(lot)
            lot_by_code[lot.code] = lot

        self.session.flush()
        self.session.add_all(
            [
                MasterLotAllocation(
                    order_id=order_by_code[order["id"]].id,
                    lot_id=lot_by_code[lot_code].id,
                    quantity=quantity,
                )
                for order in raw["orders"]
                for lot_code, quantity in order["lot_allocations"].items()
            ]
        )

    def list(
        self, *, limit: int, offset: int, search: str | None = None
    ) -> tuple[list[MasterDatasetSummary], int]:
        filters = []
        if search:
            filters.append(func.lower(MasterDataset.name).like(f"%{search.strip().lower()}%"))
        datasets = list(
            self.session.scalars(
                self._dataset_query()
                .where(*filters)
                .order_by(MasterDataset.updated_at.desc(), MasterDataset.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = (
            self.session.scalar(select(func.count()).select_from(MasterDataset).where(*filters))
            or 0
        )
        return [self._summary(dataset, is_ready=True, errors=[]) for dataset in datasets], total

    def get_detail(self, dataset_id: str) -> MasterDatasetDetail:
        dataset = self._get(dataset_id)
        raw = self._assemble(dataset)
        errors: list[str] = []
        try:
            scheduling_input = SchedulingInput.model_validate(raw)
        except ValidationError as exc:
            errors = [error["msg"] for error in exc.errors()]
            # This branch is reachable after partial CRUD edits. Returning the
            # raw invalid document as a typed detail would be misleading.
            raise ApplicationError(
                "DATASET_NOT_READY",
                "Master dataset is incomplete or inconsistent",
                status_code=409,
                details=errors,
            ) from exc
        summary = self._summary(dataset, is_ready=not errors, errors=errors)
        return MasterDatasetDetail(**summary.model_dump(), input=scheduling_input)

    def get_scheduling_input(self, dataset_id: str) -> tuple[SchedulingInput, int]:
        detail = self.get_detail(dataset_id)
        return detail.input, detail.revision

    def delete(self, dataset_id: str) -> None:
        dataset = self._get(dataset_id)
        self.session.delete(dataset)
        self.session.commit()

    def _get(self, dataset_id: str) -> MasterDataset:
        dataset = self.session.scalar(self._dataset_query().where(MasterDataset.id == dataset_id))
        if dataset is None:
            raise ApplicationError(
                "DATASET_NOT_FOUND",
                f"Master dataset '{dataset_id}' was not found",
                status_code=404,
            )
        return dataset

    @staticmethod
    def _dataset_query():  # type: ignore[no-untyped-def]
        return select(MasterDataset).options(
            selectinload(MasterDataset.products),
            selectinload(MasterDataset.machines).selectinload(MasterMachine.capabilities),
            selectinload(MasterDataset.machines).selectinload(MasterMachine.changeovers),
            selectinload(MasterDataset.machines).selectinload(MasterMachine.windows),
            selectinload(MasterDataset.machines).selectinload(MasterMachine.shifts),
            selectinload(MasterDataset.machines).selectinload(MasterMachine.downtimes),
            selectinload(MasterDataset.machines).selectinload(MasterMachine.mold),
            selectinload(MasterDataset.orders).selectinload(MasterOrder.allocations),
            selectinload(MasterDataset.lots),
            selectinload(MasterDataset.btp_inventory),
            selectinload(MasterDataset.btp_codes),
            selectinload(MasterDataset.btp_routing),
        )

    @staticmethod
    def _summary(
        dataset: MasterDataset, *, is_ready: bool, errors: list[str]
    ) -> MasterDatasetSummary:
        return MasterDatasetSummary(
            id=dataset.id,
            name=dataset.name,
            source_hash=dataset.source_hash,
            schema_version=dataset.schema_version,
            revision=dataset.revision,
            origin=dataset.origin,
            horizon=dataset.horizon,
            is_ready=is_ready,
            readiness_errors=errors,
            counts=MasterDatasetCounts(
                products=len(dataset.products),
                machines=len(dataset.machines),
                orders=len(dataset.orders),
                lots=len(dataset.lots),
            ),
            created_at=dataset.created_at,
            updated_at=dataset.updated_at,
        )

    @staticmethod
    def _assemble(dataset: MasterDataset) -> dict[str, Any]:
        products = sorted(dataset.products, key=lambda item: item.sort_index)
        machines = sorted(dataset.machines, key=lambda item: item.sort_index)
        orders = sorted(dataset.orders, key=lambda item: item.sort_index)
        lots = sorted(dataset.lots, key=lambda item: item.sort_index)
        lot_by_id = {lot.id: lot for lot in lots}

        machine_specs: dict[str, Any] = {}
        for machine in machines:
            setup: defaultdict[str, dict[str, int]] = defaultdict(dict)
            for changeover in machine.changeovers:
                setup[changeover.from_product][changeover.to_product] = changeover.minutes
            spec: dict[str, Any] = {
                "stage": machine.stage,
                "minutes_per_unit": {
                    item.product_code: item.minutes_per_unit
                    for item in sorted(machine.capabilities, key=lambda item: item.product_code)
                },
                "fixed_minutes": machine.fixed_minutes,
                "initial_product": machine.initial_product,
                "setup": dict(setup),
                "windows": [
                    {
                        "id": item.external_id,
                        "shift": item.shift_code,
                        "start": item.start,
                        "end": item.end,
                    }
                    for item in sorted(machine.windows, key=lambda item: item.external_id)
                ],
                "shifts": [
                    {
                        "id": item.code,
                        "day": item.day,
                        "start": item.start,
                        "end": item.end,
                        "available_minutes": item.available_minutes,
                    }
                    for item in sorted(machine.shifts, key=lambda item: item.sort_index)
                ],
                "downtime": [
                    [item.start, item.end]
                    for item in sorted(machine.downtimes, key=lambda item: item.start)
                ],
            }
            if machine.mold is not None:
                spec["mold"] = {
                    "id": machine.mold.code,
                    "cavities": machine.mold.cavities,
                    "limit_cycles": machine.mold.limit_cycles,
                    "initial_cycles": machine.mold.initial_cycles,
                    "maintenance_minutes": machine.mold.maintenance_minutes,
                    "after_maintenance": machine.mold.after_maintenance,
                }
            machine_specs[machine.code] = spec

        return {
            "schema_version": dataset.schema_version,
            "name": dataset.name,
            "seed": dataset.seed,
            "origin": dataset.origin,
            "time_unit": dataset.time_unit,
            "horizon": dataset.horizon,
            "working_days": dataset.working_days,
            "stages": dataset.stages,
            "products": [product.code for product in products],
            "product_color": {product.code: product.color for product in products},
            "product_line": {product.code: product.line for product in products},
            "initial_inventory": {product.code: product.initial_inventory for product in products},
            "safety_stock": {product.code: product.safety_stock for product in products},
            "btp_codes": [item.code for item in sorted(dataset.btp_codes, key=lambda item: item.sort_index)],
            "btp_routing": _routing_by_product(dataset.btp_routing),
            "inventory_btp": {row.btp_code: row.initial_qty for row in dataset.btp_inventory},
            "btp_capacity": {
                row.btp_code: row.capacity for row in dataset.btp_inventory if row.capacity is not None
            },
            "max_surplus_btp": dataset.max_surplus_btp,
            "transfer_minutes": dataset.transfer_minutes,
            "checkpoints": dataset.checkpoints,
            "minimum_lot": dataset.minimum_lot,
            "max_surplus": dataset.max_surplus,
            "machines": machine_specs,
            "orders": [
                {
                    "id": order.code,
                    "product": order.product_code,
                    "release": order.release,
                    "due": order.due,
                    "priority": order.priority,
                    "urgent": order.urgent,
                    "quantity": order.quantity,
                    "initial_allocated": order.initial_allocated,
                    "lot_allocations": {
                        lot_by_id[allocation.lot_id].code: allocation.quantity
                        for allocation in order.allocations
                    },
                    **({"deadline": order.deadline} if order.deadline is not None else {}),
                }
                for order in orders
            ],
            "lots": [
                {
                    "id": lot.code,
                    "order": lot.order_code,
                    "product": lot.product_code,
                    "quantity": lot.quantity,
                    "release": lot.release,
                }
                for lot in lots
            ],
            "weights": dataset.weights,
            "assumptions": dataset.assumptions,
        }
