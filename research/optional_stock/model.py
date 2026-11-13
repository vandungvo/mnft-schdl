from __future__ import annotations

from collections import Counter
from typing import Any

from ortools.sat.python import cp_model


STAGES = ("cast", "cnc", "paint", "qc")


def _merge_contiguous_windows(windows: list[dict[str, Any]]) -> list[dict[str, int]]:
    """Merge adjacent staffed windows while preserving real breaks/downtime."""
    merged: list[dict[str, int]] = []
    for window in sorted(windows, key=lambda item: (item["start"], item["end"])):
        if merged and merged[-1]["end"] == window["start"]:
            merged[-1]["end"] = window["end"]
        else:
            merged.append({"start": window["start"], "end": window["end"]})
    return merged


def _shift_at(data: dict[str, Any], minute: int) -> str:
    """Return the shift containing a minute; callers use end - 1 for block ends."""
    return next(
        shift["id"]
        for shift in data["shifts"]
        if shift["start"] <= minute < shift["end"]
    )


def _overlap(start: int, end: int, range_start: int, range_end: int) -> int:
    return max(0, min(end, range_end) - max(start, range_start))


def build_demo_instance() -> dict[str, Any]:
    """Small deterministic case for the optional-stock policy.

    All three shifts on all four machines are already staffed and open. Each
    shift has a declared 30-minute break. Required production replaces the
    quantity shipped, so end inventory equals safety stock before any optional
    lot is selected.
    """
    required_templates = [
        {
            "priority": 2,
            "processing": {"cast": 60, "cnc": 75, "paint": 45, "qc": 25},
            "setup": {"cast": 10, "cnc": 10, "paint": 10, "qc": 5},
        },
        {
            "priority": 1,
            "processing": {"cast": 70, "cnc": 65, "paint": 40, "qc": 25},
            "setup": {"cast": 10, "cnc": 10, "paint": 10, "qc": 5},
        },
    ]
    required = []
    for wave in range(3):
        for template_index, template in enumerate(required_templates):
            number = wave * len(required_templates) + template_index + 1
            required.append(
                {
                    **template,
                    "id": f"REQ_{number}",
                    "kind": "required",
                    "order": f"ORDER_{number}",
                    "product": "WHEEL",
                    "quantity": 40,
                    "route": list(STAGES),
                    # Release applies to casting; later stages follow precedence.
                    # Every order/material is available at the horizon start.
                    "release": 0,
                    "due": (wave + 1) * 480,
                }
            )
    optional_template = {
        "kind": "optional_stock",
        "order": None,
        "product": "WHEEL",
        "quantity": 40,
        "route": list(STAGES),
        "release": 0,
        "processing": {"cast": 50, "cnc": 60, "paint": 35, "qc": 20},
        "setup": {"cast": 10, "cnc": 10, "paint": 10, "qc": 5},
    }
    optional = [{**optional_template, "id": f"STOCK_{i}"} for i in range(1, 3)]
    # This lot represents physical WIP already completed by CNC_1 before the
    # horizon. Its upstream conversion cost is sunk, and it can feed PAINT_1
    # immediately when that resource would otherwise be idle.
    optional.append(
        {
            "id": "WIP_AFTER_CNC_1",
            "kind": "optional_stock",
            "source": "initial_wip_after_cnc_1",
            "order": None,
            "product": "WHEEL",
            "quantity": 40,
            "route": ["paint", "qc"],
            "release": 0,
            "processing": {"paint": 35, "qc": 20},
            "setup": {"paint": 10, "qc": 5},
            "incremental_production_per_unit": 0,
        }
    )
    shifts = []
    for number, start in enumerate((0, 480, 960), 1):
        shifts.append(
            {
                "id": f"SHIFT_{number}",
                "name": f"Ca {number}",
                "clock": ("06:00–14:00", "14:00–22:00", "22:00–06:00")[number - 1],
                "start": start,
                "end": start + 480,
                "break_start": start + 240,
                "break_end": start + 270,
                "available_minutes": 450,
            }
        )
    windows = [
        {"shift": shift["id"], "start": start, "end": end}
        for shift in shifts
        for start, end in (
            (shift["start"], shift["break_start"]),
            (shift["break_end"], shift["end"]),
        )
    ]
    continuous_windows = _merge_contiguous_windows(windows)
    return {
        "name": "optional_stock_open_shift_demo",
        "time_unit": "minute",
        "currency": "VND",
        "horizon": 1440,
        "stages": list(STAGES),
        "shifts": shifts,
        "machines": {
            stage: {
                "id": f"{stage.upper()}_1",
                # Keep shift windows for capacity reporting. Scheduling uses the
                # merged windows so work may cross a continuously staffed handoff.
                "windows": windows,
                "continuous_windows": continuous_windows,
            }
            for stage in STAGES
        },
        "lots": required + optional,
        "initial_inventory": 20,
        "safety_stock": 20,
        "max_inventory": 140,
        "committed_demand": sum(lot["quantity"] for lot in required),
        "cost_scenarios": {
            "low_holding_cost": {
                "idle_per_minute": 600,
                "optional_production_per_unit": 1500,
                "holding_per_unit": 300,
                "surplus_risk_per_unit": 250,
                "incremental_setup_per_minute": 500,
            },
            "high_holding_cost": {
                "idle_per_minute": 600,
                "optional_production_per_unit": 1500,
                "holding_per_unit": 4000,
                "surplus_risk_per_unit": 250,
                "incremental_setup_per_minute": 500,
            },
        },
        "scope": [
            "Three already-open 8-hour shifts on one machine per stage; each shift has a 30-minute break.",
            "Operations may cross adjacent staffed shift boundaries, but may not cross breaks or downtime.",
            "One initial WIP lot has already completed CNC_1 and is available directly to PAINT_1.",
            "Fixed lot sizes; optional lots use one presence decision each.",
            "Fixed per-lot setup duration, not sequence-dependent setup.",
            "No mold maintenance, downtime, overtime, or rescheduling in this controlled experiment.",
        ],
    }


def _build_and_solve(
    data: dict[str, Any],
    *,
    include_optional: bool,
    costs: dict[str, int] | None,
    baseline_tardiness: dict[str, int] | None,
    seconds: float,
    seed: int,
) -> dict[str, Any]:
    model = cp_model.CpModel()
    horizon = data["horizon"]
    lots = [lot for lot in data["lots"] if include_optional or lot["kind"] == "required"]
    presence: dict[str, cp_model.IntVar] = {}
    starts: dict[tuple[str, str], cp_model.IntVar] = {}
    ends: dict[tuple[str, str], cp_model.IntVar] = {}
    intervals: dict[str, list[cp_model.IntervalVar]] = {stage: [] for stage in STAGES}

    for lot in lots:
        lid = lot["id"]
        selected = model.new_bool_var(f"selected_{lid}")
        presence[lid] = selected
        if lot["kind"] == "required":
            model.add(selected == 1)
        route = lot.get("route", list(STAGES))
        for index, stage in enumerate(route):
            duration = lot["setup"][stage] + lot["processing"][stage]
            start = model.new_int_var(0, horizon, f"{lid}_{stage}_start")
            end = model.new_int_var(0, horizon, f"{lid}_{stage}_end")
            starts[lid, stage] = start
            ends[lid, stage] = end
            interval = model.new_optional_interval_var(start, duration, end, selected, f"{lid}_{stage}")
            intervals[stage].append(interval)
            model.add(start >= lot["release"]).only_enforce_if(selected)
            model.add(end <= horizon).only_enforce_if(selected)
            choices = []
            availability_windows = data["machines"][stage].get(
                "continuous_windows", data["machines"][stage]["windows"]
            )
            for window_index, window in enumerate(availability_windows):
                choice = model.new_bool_var(f"{lid}_{stage}_window_{window_index}")
                model.add(start >= window["start"]).only_enforce_if(choice)
                model.add(end <= window["end"]).only_enforce_if(choice)
                model.add_implication(choice, selected)
                choices.append((window, choice))
            model.add(sum(choice for _, choice in choices) == selected)
            if index:
                model.add(start >= ends[lid, route[index - 1]]).only_enforce_if(selected)

    for stage in STAGES:
        model.add_no_overlap(intervals[stage])

    optional_lots = [lot for lot in lots if lot["kind"] == "optional_stock"]
    optional_quantity = sum(lot["quantity"] * presence[lot["id"]] for lot in optional_lots)
    final_inventory_expr = data["initial_inventory"] + optional_quantity
    model.add(final_inventory_expr >= data["safety_stock"])
    model.add(final_inventory_expr <= data["max_inventory"])

    tardiness: dict[str, cp_model.IntVar] = {}
    required_lots = [lot for lot in lots if lot["kind"] == "required"]
    for lot in required_lots:
        tardy = model.new_int_var(0, horizon, f"tardy_{lot['order']}")
        model.add_max_equality(tardy, [0, ends[lot["id"], "qc"] - lot["due"]])
        tardiness[lot["order"]] = tardy
        if baseline_tardiness is not None:
            model.add(tardy <= baseline_tardiness[lot["order"]])

    mandatory_makespan = model.new_int_var(0, horizon, "mandatory_makespan")
    model.add_max_equality(mandatory_makespan, [ends[lot["id"], "qc"] for lot in required_lots])

    effective_completion = []
    for lot in lots:
        value = model.new_int_var(0, horizon, f"effective_completion_{lot['id']}")
        model.add(value == ends[lot["id"], "qc"]).only_enforce_if(presence[lot["id"]])
        model.add(value == 0).only_enforce_if(presence[lot["id"]].Not())
        effective_completion.append(value)
    schedule_end = model.new_int_var(0, horizon, "schedule_end")
    model.add_max_equality(schedule_end, effective_completion)

    total_capacity = sum(
        window["end"] - window["start"]
        for machine in data["machines"].values()
        for window in machine["windows"]
    )
    occupied_expr = sum(
        (lot["setup"][stage] + lot["processing"][stage]) * presence[lot["id"]]
        for lot in lots
        for stage in lot.get("route", list(STAGES))
    )
    idle_expr = total_capacity - occupied_expr

    if costs is None:
        weighted_tardiness = sum(
            lot["priority"] * tardiness[lot["order"]] for lot in required_lots
        )
        model.minimize(weighted_tardiness * (horizon + 1) + mandatory_makespan)
    else:
        optional_setup = sum(
            sum(lot["setup"].values()) * presence[lot["id"]] for lot in optional_lots
        )
        optional_production_cost = sum(
            lot["quantity"]
            * lot.get("incremental_production_per_unit", costs["optional_production_per_unit"])
            * presence[lot["id"]]
            for lot in optional_lots
        )
        economic_cost = (
            costs["idle_per_minute"] * idle_expr
            + optional_production_cost
            + costs["holding_per_unit"] * optional_quantity
            + costs["surplus_risk_per_unit"] * optional_quantity
            + costs["incremental_setup_per_minute"] * optional_setup
        )
        # Lexicographic order: economic cost, required makespan, schedule end,
        # then total starts. The final term places ready WIP into early holes
        # without weakening any higher-priority decision.
        effective_starts = []
        for lot in lots:
            for stage in lot.get("route", list(STAGES)):
                value = model.new_int_var(0, horizon, f"effective_start_{lot['id']}_{stage}")
                model.add(value == starts[lot["id"], stage]).only_enforce_if(presence[lot["id"]])
                model.add(value == 0).only_enforce_if(presence[lot["id"]].Not())
                effective_starts.append(value)
        max_start_sum = horizon * len(effective_starts)
        fine_scale = max_start_sum + 1
        time_scale = horizon + 1
        model.minimize(
            economic_cost * time_scale * time_scale * fine_scale
            + mandatory_makespan * time_scale * fine_scale
            + schedule_end * fine_scale
            + sum(effective_starts)
        )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = seconds
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = seed
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"status": solver.status_name(status), "rows": [], "selected_optional_lots": []}

    selected_optional = [lot["id"] for lot in optional_lots if solver.value(presence[lot["id"]])]
    rows = []
    for lot in lots:
        if not solver.value(presence[lot["id"]]):
            continue
        for stage in lot.get("route", list(STAGES)):
            block_start = solver.value(starts[lot["id"], stage])
            setup_minutes = lot["setup"][stage]
            end = solver.value(ends[lot["id"], stage])
            start_shift = _shift_at(data, block_start)
            end_shift = _shift_at(data, end - 1)
            rows.append(
                {
                    "lot": lot["id"],
                    "kind": lot["kind"],
                    "product": lot["product"],
                    "quantity": lot["quantity"],
                    "stage": stage,
                    "machine": data["machines"][stage]["id"],
                    # Keep shift as the starting shift for CSV compatibility.
                    "shift": start_shift,
                    "start_shift": start_shift,
                    "end_shift": end_shift,
                    "block_start": block_start,
                    "setup_minutes": setup_minutes,
                    "processing_start": block_start + setup_minutes,
                    "processing_minutes": lot["processing"][stage],
                    "end": end,
                }
            )
    rows.sort(key=lambda row: (row["block_start"], STAGES.index(row["stage"]), row["lot"]))
    result = {
        "status": solver.status_name(status),
        "objective_bound": solver.best_objective_bound,
        "selected_optional_lots": selected_optional,
        "selected_optional_quantity": sum(
            lot["quantity"] for lot in optional_lots if lot["id"] in selected_optional
        ),
        "mandatory_makespan": solver.value(mandatory_makespan),
        "schedule_end": solver.value(schedule_end),
        "tardiness_by_order": {order: solver.value(value) for order, value in tardiness.items()},
        "rows": rows,
    }
    result["metrics"] = calculate_metrics(data, result, costs)
    return result


def calculate_metrics(
    data: dict[str, Any], result: dict[str, Any], costs: dict[str, int] | None
) -> dict[str, Any]:
    rows = result["rows"]
    total_capacity = sum(
        window["end"] - window["start"]
        for machine in data["machines"].values()
        for window in machine["windows"]
    )
    processing = sum(row["processing_minutes"] for row in rows)
    setup = sum(row["setup_minutes"] for row in rows)
    idle = total_capacity - processing - setup
    optional_rows = [row for row in rows if row["kind"] == "optional_stock"]
    selected_ids = set(result["selected_optional_lots"])
    lot_by_id = {lot["id"]: lot for lot in data["lots"]}
    optional_quantity = sum(lot_by_id[lid]["quantity"] for lid in selected_ids)
    metrics: dict[str, Any] = {
        "open_capacity_minutes": total_capacity,
        "processing_minutes": processing,
        "required_processing_minutes": sum(
            row["processing_minutes"] for row in rows if row["kind"] == "required"
        ),
        "optional_processing_minutes": sum(row["processing_minutes"] for row in optional_rows),
        "setup_minutes": setup,
        "idle_minutes": idle,
        "productive_utilization": processing / total_capacity,
        "occupied_utilization": (processing + setup) / total_capacity,
        "end_inventory": data["initial_inventory"] + optional_quantity,
        "safety_stock": data["safety_stock"],
        "max_inventory": data["max_inventory"],
    }
    by_shift = []
    for shift in data["shifts"]:
        capacity = shift["available_minutes"] * len(data["machines"])
        allocations = []
        for row in rows:
            setup = _overlap(
                row["block_start"],
                row["processing_start"],
                shift["start"],
                shift["end"],
            )
            processing = _overlap(
                row["processing_start"], row["end"], shift["start"], shift["end"]
            )
            if setup or processing:
                allocations.append((row, setup, processing))
        shift_processing = sum(processing for _, _, processing in allocations)
        shift_setup = sum(setup for _, setup, _ in allocations)
        by_shift.append(
            {
                "shift": shift["id"],
                "name": shift["name"],
                "clock": shift["clock"],
                "capacity_minutes": capacity,
                "required_processing_minutes": sum(
                    processing
                    for row, _, processing in allocations
                    if row["kind"] == "required"
                ),
                "optional_processing_minutes": sum(
                    processing
                    for row, _, processing in allocations
                    if row["kind"] == "optional_stock"
                ),
                "setup_minutes": shift_setup,
                "idle_minutes": capacity - shift_processing - shift_setup,
                "productive_utilization": shift_processing / capacity,
                "occupied_utilization": (shift_processing + shift_setup) / capacity,
            }
        )
    metrics["by_shift"] = by_shift
    if costs is not None:
        optional_setup = sum(row["setup_minutes"] for row in optional_rows)
        breakdown = {
            "idle_cost": idle * costs["idle_per_minute"],
            "optional_production_cost": sum(
                lot_by_id[lid]["quantity"]
                * lot_by_id[lid].get(
                    "incremental_production_per_unit", costs["optional_production_per_unit"]
                )
                for lid in selected_ids
            ),
            "holding_cost": optional_quantity * costs["holding_per_unit"],
            "surplus_risk_cost": optional_quantity * costs["surplus_risk_per_unit"],
            "incremental_setup_cost": optional_setup * costs["incremental_setup_per_minute"],
            "shift_opening_and_overtime_cost": 0,
        }
        breakdown["economic_capacity_cost"] = sum(breakdown.values())
        required_occupied = sum(
            lot["processing"][stage] + lot["setup"][stage]
            for lot in data["lots"]
            if lot["kind"] == "required"
            for stage in lot.get("route", list(STAGES))
        )
        no_optional_cost = (total_capacity - required_occupied) * costs["idle_per_minute"]
        breakdown["no_optional_reference_cost"] = no_optional_cost
        breakdown["saving_vs_no_optional"] = no_optional_cost - breakdown["economic_capacity_cost"]
        metrics["costs"] = breakdown
    return metrics


def solve_phase1(data: dict[str, Any], seconds: float = 5, seed: int = 11) -> dict[str, Any]:
    return _build_and_solve(
        data,
        include_optional=False,
        costs=None,
        baseline_tardiness=None,
        seconds=seconds,
        seed=seed,
    )


def solve_phase2(
    data: dict[str, Any],
    costs: dict[str, int],
    baseline: dict[str, Any],
    seconds: float = 5,
    seed: int = 11,
) -> dict[str, Any]:
    return _build_and_solve(
        data,
        include_optional=True,
        costs=costs,
        baseline_tardiness=baseline["tardiness_by_order"],
        seconds=seconds,
        seed=seed,
    )


def validate_result(
    data: dict[str, Any], result: dict[str, Any], baseline: dict[str, Any]
) -> dict[str, Any]:
    errors: list[str] = []
    lots = {lot["id"]: lot for lot in data["lots"]}
    rows = result["rows"]
    counts = Counter((row["lot"], row["stage"]) for row in rows)
    selected = set(result["selected_optional_lots"])
    expected_lots = {
        lid for lid, lot in lots.items() if lot["kind"] == "required" or lid in selected
    }
    expected = {
        (lid, stage)
        for lid in expected_lots
        for stage in lots[lid].get("route", list(STAGES))
    }
    if set(counts) != expected or any(value != 1 for value in counts.values()):
        errors.append("Selected lots do not have exactly one operation per stage.")
    lookup = {(row["lot"], row["stage"]): row for row in rows}
    for lid in expected_lots:
        lot = lots[lid]
        route = lot.get("route", list(STAGES))
        for index, stage in enumerate(route):
            row = lookup.get((lid, stage))
            if row is None:
                continue
            if row["end"] - row["block_start"] != lot["setup"][stage] + lot["processing"][stage]:
                errors.append(f"{lid}/{stage}: wrong block duration")
            if row["processing_start"] - row["block_start"] != row["setup_minutes"]:
                errors.append(f"{lid}/{stage}: wrong setup boundary")
            if not 0 <= row["block_start"] < row["end"] <= data["horizon"]:
                errors.append(f"{lid}/{stage}: outside open shift")
            availability_windows = data["machines"][stage].get(
                "continuous_windows", data["machines"][stage]["windows"]
            )
            if not any(
                window["start"] <= row["block_start"] < row["end"] <= window["end"]
                for window in availability_windows
            ):
                errors.append(f"{lid}/{stage}: crosses a break or downtime")
            if row["start_shift"] != _shift_at(data, row["block_start"]):
                errors.append(f"{lid}/{stage}: wrong start shift")
            if row["end_shift"] != _shift_at(data, row["end"] - 1):
                errors.append(f"{lid}/{stage}: wrong end shift")
            if index and row["block_start"] < lookup[lid, route[index - 1]]["end"]:
                errors.append(f"{lid}/{stage}: precedence violation")
    for stage in STAGES:
        sequence = sorted((row for row in rows if row["stage"] == stage), key=lambda row: row["block_start"])
        for previous, current in zip(sequence, sequence[1:]):
            if current["block_start"] < previous["end"]:
                errors.append(f"{stage}: machine overlap")
    if any(
        result["tardiness_by_order"][order] > value
        for order, value in baseline["tardiness_by_order"].items()
    ):
        errors.append("Optional production worsened required-order tardiness.")
    end_inventory = result["metrics"]["end_inventory"]
    if not data["safety_stock"] <= end_inventory <= data["max_inventory"]:
        errors.append("End inventory is outside safety/max bounds.")
    if result["metrics"]["idle_minutes"] < 0:
        errors.append("Negative idle indicates capacity overuse.")
    return {
        "valid": not errors,
        "errors": errors,
        "operations_checked": len(rows),
        "selected_optional_lots_checked": sorted(selected),
    }
