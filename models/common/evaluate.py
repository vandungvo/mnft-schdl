from __future__ import annotations

from collections import Counter, defaultdict
from .instance import duration, eligible, setup, STAGES


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
                          "shortfall": max(0, data["safety_stock"][p]-value)})
    return deliveries, ledger, daily


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
                           "utilization": processing/available if available else None})
    available = sum(s["available"] for s in shifts)
    processing = sum(s["processing"] for s in shifts)
    metrics = {
        "makespan": max(r["end"] for r in schedule),
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
        "produced_quantity": sum(l["quantity"] for l in data["lots"]),
        "shipped_quantity": sum(d["quantity"] for d in deliveries),
        "end_inventory": {p: data["initial_inventory"][p] + sum(e["delta"] for e in ledger if e["product"] == p)
                          for p in data["products"]}}
    metrics["objective"] = sum(data["weights"][k]*metrics[k] for k in data["weights"])
    return metrics, {"deliveries": deliveries, "inventory_events": ledger, "daily_inventory": daily, "shifts": shifts}


def validate(data, schedule):
    """Reconstruct feasibility from timestamps/input; never trust a solver's flags."""
    errors = []
    lots = {l["id"]: l for l in data["lots"]}
    expected = {(lid, st) for lid in lots for st in STAGES}
    counts = Counter((r["lot"], r["stage"]) for r in schedule)
    if set(counts) != expected or any(v != 1 for v in counts.values()):
        return {"valid": False, "errors": ["Missing, duplicate or unexpected operations."]}
    lookup = {(r["lot"], r["stage"]): r for r in schedule}
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
        ready = lot["release"] if k == 0 else lookup[r["lot"], STAGES[k-1]]["end"]
        setup_start = r["start"]-r["setup_minutes"]
        # This experiment's maintenance block also waits for predecessor readiness.
        if r["block_start"] < ready:
            errors.append(prefix + ": precedence/release violation")
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
            if r["setup_minutes"] != setup(data, mid, previous, lot["product"]):
                errors.append(f"{mid}/{r['lot']}: wrong setup")
            if r["cycles_after"] != used:
                errors.append(f"{mid}: wrong cycle counter")
            previous, last_end = lot["product"], r["end"]
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
    for lid, lot in lots.items():
        if lot["quantity"] < data["minimum_lot"] or allocated[lid] > lot["quantity"]:
            errors.append("Lot size/allocation violation")
    if sum(l["quantity"]-allocated[lid] for lid,l in lots.items()) > data["max_surplus"]:
        errors.append("Excess production limit exceeded")
    deliveries, ledger, _ = inventory_and_deliveries(data, schedule)
    if any(e["inventory"] < 0 for e in ledger):
        errors.append("Negative physical inventory")
    for order, delivery in zip(data["orders"], deliveries):
        if "deadline" in order and delivery["time"] > order["deadline"]:
            errors.append("Hard deadline violated")
    return {"valid": not errors, "errors": errors, "operations_checked": len(schedule),
            "scope": "static fixed-lot scenario; dedicated molds; contiguous prep/processing blocks"}
