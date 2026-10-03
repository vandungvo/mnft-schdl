from __future__ import annotations

from collections import Counter, defaultdict
from .instance import BTP_STAGES, duration, eligible, pull_ahead_cap, setup, stage_item, STAGES


def _items(data):
    """A08: combined id -> dict lookup covering mandatory/optional lots AND
    single-stage optional_btp_runs, so schedule rows for either kind can be
    resolved the same way (`r["lot"]` doubles as a generic item id)."""
    out = {l["id"]: l for l in data["lots"]}
    out.update({r["id"]: r for r in data.get("optional_btp_runs", [])})
    return out


def _btp_violations(data, schedule):
    """R12: reservoir per BTP code (A09: one or more (product, stage in
    {cast,cnc,paint}) routings can share a code); A09/A10 ordering.

    Production credits at a run's end E_o plus the fixed transfer_minutes handoff
    lag, into the code its OWN (product, stage) routes to; the next stage's run of
    ANY lot whose (product, prior-stage) routes to the SAME code debits at its
    block-start W_o (setup start if any, else processing start). Same-instant
    events are merged (completion counted before consumption nets out).
    """
    items = _items(data)
    routing = data["btp_routing"]
    transfer_minutes = data.get("transfer_minutes", 0)
    events = []
    for r in schedule:
        product = items[r["lot"]]["product"]
        quantity = items[r["lot"]]["quantity"]
        if r["stage"] in BTP_STAGES:
            code = routing[product][r["stage"]]
            events.append((r["end"] + transfer_minutes, 0, code, quantity))
        stage_index = STAGES.index(r["stage"])
        if stage_index > 0:
            prev_stage = STAGES[stage_index - 1]
            code = routing[product][prev_stage]
            events.append((r["block_start"], 1, code, -quantity))
    events.sort(key=lambda e: (e[0], e[1]))
    level = {code: data.get("inventory_btp", {}).get(code, 0) for code in data.get("btp_codes", [])}
    errors = []
    for time, _kind, code, delta in events:
        level[code] = level.get(code, 0) + delta
        if level[code] < 0:
            errors.append(f"BTP {code}: negative inventory at t={time}")
        cap = data.get("btp_capacity", {}).get(code)
        if cap is not None and level[code] > cap:
            errors.append(f"BTP {code}: exceeds capacity at t={time}")
    return errors


def inventory_and_deliveries(data, schedule):
    qc = {r["lot"]: r["end"] for r in schedule if r["stage"] == "qc"}
    deliveries = []
    for order in data["orders"]:
        completed = max([order["release"]] + [qc[lid] for lid in order["lot_allocations"]])
        deliveries.append({"order": order["id"], "product": order["product"],
                           "time": completed, "quantity": order["quantity"], "due": order["due"],
                           "tardiness": max(0, completed-order["due"]), "priority": order["priority"]})
    events = []
    for lot in data["lots"]:
        # A08: an optional lot the schedule never chose to run has no QC row --
        # it contributes nothing to finished-goods inventory, same as if it did
        # not exist for this particular schedule.
        if lot["id"] in qc:
            events.append((qc[lot["id"]], 0, lot["product"], lot["quantity"], lot["id"]))
    for d in deliveries:
        events.append((d["time"], 1, d["product"], -d["quantity"], d["order"]))
    inventory = dict(data["initial_inventory"])
    ledger = []
    for time, kind, product, delta, source in sorted(events):
        inventory[product] += delta
        ledger.append({"time": time, "kind": "QC" if kind == 0 else "SHIP",
                       "source": source, "product": product, "delta": delta, "inventory": inventory[product]})
    daily = []
    for checkpoint in data["checkpoints"]:
        values = dict(data["initial_inventory"])
        for e in ledger:
            if e["time"] <= checkpoint:
                values[e["product"]] += e["delta"]
        for p, value in values.items():
            daily.append({"time": checkpoint, "product": p, "inventory": value,
                          "shortfall": max(0, data["safety_stock"][p]-value),
                          "surplus": max(0, value-data["safety_stock"][p])})
    return deliveries, ledger, daily


def _chosen_reserve_items(data, schedule):
    """A08: which optional lot/run ids this SCHEDULE actually chose, derived
    purely from which rows are present -- never trusted from solver metadata,
    matching the file's "reconstruct feasibility from timestamps" discipline."""
    present = {(r["lot"], r["stage"]) for r in schedule}
    lots = [l for l in data["lots"] if l.get("optional") and all((l["id"], s) in present for s in STAGES)]
    runs = [r for r in data.get("optional_btp_runs", []) if (r["id"], r["stage"]) in present]
    return lots, runs


def evaluate(data, schedule):
    deliveries, ledger, daily = inventory_and_deliveries(data, schedule)
    shifts = []
    for mid, machine in data["machines"].items():
        for shift in machine["shifts"]:
            rows = [r for r in schedule if r["machine"] == mid and r["shift"] == shift["id"]]
            if not rows:
                continue
            processing = sum(r["end"]-r["start"] for r in rows)
            setup_time = sum(r["setup_minutes"] for r in rows)
            maintenance = sum(r["maintenance_minutes"] for r in rows)
            available = shift["available_minutes"]
            shifts.append({"machine": mid, "shift": shift["id"], "available": available,
                           "processing": processing, "setup": setup_time, "maintenance": maintenance,
                           "idle": available-processing-setup_time-maintenance,
                           "utilization": processing/available if available else None,
                           "closable": bool(shift.get("closable"))})
    available = sum(s["available"] for s in shifts)
    processing = sum(s["processing"] for s in shifts)
    reserve_lots, reserve_runs = _chosen_reserve_items(data, schedule)
    qc_lot_ids = {r["lot"] for r in schedule if r["stage"] == "qc"}
    mandatory_ids = {l["id"] for l in data["lots"] if not l.get("optional")}
    mandatory_makespan = max(r["end"] for r in schedule if r["stage"] == "qc" and r["lot"] in mandatory_ids)
    metrics = {
        # Mục 4.3.1: mandatory_makespan = latest QC completion of a mandatory lot;
        # it is the objective term. `makespan` is kept as its alias for existing
        # consumers (weights key, backend schema, CSVs). schedule_end also counts
        # reserve (pull-ahead) work so a stretched schedule is never hidden.
        "makespan": mandatory_makespan,
        "mandatory_makespan": mandatory_makespan,
        "schedule_end": max(r["end"] for r in schedule),
        "weighted_tardiness": sum(d["priority"]*d["tardiness"] for d in deliveries),
        "total_tardiness": sum(d["tardiness"] for d in deliveries),
        "late_orders": sum(d["tardiness"] > 0 for d in deliveries),
        "max_tardiness": max(d["tardiness"] for d in deliveries),
        "setup_minutes": sum(s["setup"] for s in shifts),
        "maintenance_minutes": sum(s["maintenance"] for s in shifts),
        "maintenance_count": sum(r["maintenance_minutes"] > 0 for r in schedule),
        "idle_minutes": sum(s["idle"] for s in shifts),
        "safety_shortfall": sum(d["shortfall"] for d in daily),
        "activated_shifts": len(shifts), "productive_utilization": processing/available if available else None,
        "processing_minutes": processing, "available_minutes": available,
        # A08: a reserve lot the schedule never chose contributes nothing --
        # only count lots that actually reached QC (mandatory ones always do).
        "produced_quantity": sum(l["quantity"] for l in data["lots"] if l["id"] in qc_lot_ids),
        "shipped_quantity": sum(d["quantity"] for d in deliveries),
        "end_inventory": {p: data["initial_inventory"][p] + sum(e["delta"] for e in ledger if e["product"] == p)
                          for p in data["products"]},
        # 4.3.2/4.3.3 economic_capacity_cost terms (D02: báo tách bắt buộc vs dự
        # trữ). Zero for any dataset without a reserve policy or closable
        # shifts, so pre-A08 objectives are unaffected.
        "reserve_production": len(reserve_lots)+len(reserve_runs),
        "reserve_quantity": sum(i["quantity"] for i in reserve_lots + reserve_runs),
        "surplus_holding": sum(d["surplus"] for d in daily),
        "shift_opening": sum(1 for s in shifts if s["closable"]),
        "reserve_lots_chosen": [l["id"] for l in reserve_lots],
        "reserve_btp_runs_chosen": [r["id"] for r in reserve_runs]}
    metrics["objective"] = sum(data["weights"][k]*metrics[k] for k in data["weights"])
    return metrics, {"deliveries": deliveries, "inventory_events": ledger, "daily_inventory": daily, "shifts": shifts}


def validate(data, schedule):
    """Reconstruct feasibility from timestamps/input; never trust a solver's flags."""
    errors = []
    lots = _items(data)
    run_ids = {r["id"] for r in data.get("optional_btp_runs", [])}
    mandatory_ids = {l["id"] for l in data["lots"] if not l.get("optional")}
    optional_lot_ids = {l["id"] for l in data["lots"] if l.get("optional")}
    counts = Counter((r["lot"], r["stage"]) for r in schedule)
    present_ids = {r["lot"] for r in schedule}
    # Mandatory lots: exactly one row per stage, always. Optional lots (A08):
    # all-4-or-nothing -- a lot that shows up for some but not every stage is a
    # contradiction (chosen in some stages, not chosen in others). Optional BTP
    # runs: at most one row for their single declared stage.
    expected_mandatory = {(lid, st) for lid in mandatory_ids for st in STAGES}
    bad = set(counts) - expected_mandatory - {(lid, st) for lid in optional_lot_ids for st in STAGES} \
        - {(r["id"], r["stage"]) for r in data.get("optional_btp_runs", [])}
    if bad or any(v != 1 for v in counts.values()) or not expected_mandatory <= set(counts):
        return {"valid": False, "errors": ["Missing, duplicate or unexpected operations."]}
    for lid in optional_lot_ids:
        stages_present = {st for st in STAGES if (lid, st) in counts}
        if stages_present and stages_present != set(STAGES):
            errors.append(f"{lid}: optional lot scheduled for some stages but not all")
    for r in schedule:
        lot = lots[r["lot"]]
        mid = r["machine"]
        prefix = f'{r["lot"]}/{r["stage"]}'
        if mid not in eligible(data, lot, r["stage"]):
            errors.append(prefix + ": ineligible machine")
            continue
        machine = data["machines"][mid]
        if r["end"]-r["start"] != duration(data, lot, mid):
            errors.append(prefix + ": wrong duration")
        k = STAGES.index(r["stage"])
        setup_start = r["start"]-r["setup_minutes"]
        # Same-lot cross-stage precedence is no longer required (A10): stages only
        # connect through BTP stock, checked separately in _btp_violations below.
        # A run's declared stage is its own first/only stage regardless of where
        # that stage sits in STAGES, so it always gets the release check too.
        if (k == 0 or r["lot"] in run_ids) and r["block_start"] < lot["release"]:
            errors.append(prefix + ": release violation")
        if setup_start-r["block_start"] != r["maintenance_minutes"]:
            errors.append(prefix + ": inconsistent prep timestamps")
        if not any(w["shift"] == r["shift"] and w["id"] == r["window"]
                   and w["start"] <= r["block_start"] <= r["start"] < r["end"] <= w["end"]
                   for w in machine["windows"]):
            errors.append(prefix + ": outside calendar window")
        if not 0 <= r["block_start"] < r["end"] <= data["horizon"]:
            errors.append(prefix + ": outside horizon")
    for mid, machine in data["machines"].items():
        sequence = sorted([r for r in schedule if r["machine"] == mid], key=lambda r: r["block_start"])
        previous, last_end = machine["initial_product"], 0
        mold = machine.get("mold")
        used = mold["initial_cycles"] if mold else 0
        for r in sequence:
            lot = lots[r["lot"]]
            if r["block_start"] < last_end:
                errors.append(f"{mid}: overlap")
            maint = 0
            if mold:
                cycles = (lot["quantity"]+mold["cavities"]-1)//mold["cavities"]
                if used+cycles > mold["limit_cycles"]:
                    maint = mold["maintenance_minutes"]
                    used = 0
                    previous = mold["after_maintenance"]
                used += cycles
                if used > mold["limit_cycles"]:
                    errors.append(f"{mid}: mold cycles exceeded")
            if r["maintenance_minutes"] != maint:
                errors.append(f"{mid}/{r['lot']}: wrong maintenance")
            if r.get("mold") != (mold["id"] if mold else None):
                errors.append(f"{mid}: wrong mold")
            item = stage_item(data, lot, machine["stage"])
            if r["setup_minutes"] != setup(data, mid, previous, item):
                errors.append(f"{mid}/{r['lot']}: wrong setup")
            if r["cycles_after"] != used:
                errors.append(f"{mid}: wrong cycle counter")
            previous, last_end = item, r["end"]
    allocated = defaultdict(int)
    allocated_initial = defaultdict(int)
    for order in data["orders"]:
        allocated_initial[order["product"]] += order["initial_allocated"]
        if sum(order["lot_allocations"].values())+order["initial_allocated"] != order["quantity"]:
            errors.append("Order allocation does not conserve quantity")
        for lid, qty in order["lot_allocations"].items():
            allocated[lid] += qty
            if qty < 0 or lots[lid]["product"] != order["product"]:
                errors.append("Invalid product/quantity allocation")
    for p, qty in allocated_initial.items():
        if qty > data["initial_inventory"][p]:
            errors.append("Initial stock allocated twice")
    # A02/R04's max_surplus bounds finished-LOT surplus (technical + reserve);
    # optional_btp_runs are a separate concept (semi-finished capacity-fill,
    # bounded by max_surplus_btp/R12 via _btp_violations instead) and must not
    # be folded into this count.
    finished_lots = {l["id"]: l for l in data["lots"]}
    for lid, lot in finished_lots.items():
        if lot["quantity"] < data["minimum_lot"] or allocated[lid] > lot["quantity"]:
            errors.append("Lot size/allocation violation")
    # Only reserve lots this SCHEDULE actually ran count (unchosen candidates cost nothing).
    reserve_lots, reserve_runs = _chosen_reserve_items(data, schedule)
    mandatory_surplus = sum(l["quantity"]-allocated[lid] for lid,l in finished_lots.items() if not l.get("optional"))
    if mandatory_surplus + sum(l["quantity"] for l in reserve_lots) > data["max_surplus"]:
        errors.append("Excess production limit exceeded")
    cap = pull_ahead_cap(data)
    if cap is not None:
        for p, limit in cap.items():
            ahead = sum(i["quantity"] for i in reserve_lots + reserve_runs if i["product"] == p)
            if ahead > limit:
                errors.append(f"{p}: reserve production {ahead} exceeds long-term demand cap {limit}")
    deliveries, ledger, _ = inventory_and_deliveries(data, schedule)
    if any(e["inventory"] < 0 for e in ledger):
        errors.append("Negative physical inventory")
    errors.extend(_btp_violations(data, schedule))
    for order, delivery in zip(data["orders"], deliveries):
        if "deadline" in order and delivery["time"] > order["deadline"]:
            errors.append("Hard deadline violated")
    return {"valid": not errors, "errors": errors, "operations_checked": len(schedule),
            "scope": "static fixed-lot scenario; dedicated molds; contiguous prep/processing blocks"}
