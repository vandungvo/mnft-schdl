"""Independent validator + KPI evaluator for schema-5 schedules.

Row: {"run","stage","item","machine","block_start","start","end","setup_minutes",
      "maintenance_minutes","mold","cycles_after","window","shift"}.
validate() rebuilds everything from the input and the timestamps; it never trusts
a solver's flags. evaluate() uses the same objective terms as the schema-4 engine
(models/common/evaluate.py) so results stay comparable.
"""
from __future__ import annotations

from collections import Counter
from .instance import (btp_stages, calendar, cast_setup, cycles, duration, eligible, last_stage,
                       order_of_lot, quantity, reserve_groups, upstream, uses_molds)


def option_quantity(data, option):
    """Units an option pulls ahead: its QC lot, or (BTP-only option) its runs."""
    runs = {r["id"]: r for r in data["runs"]}
    ids = reserve_groups(data)[option]
    lots = [i for i in ids if runs[i]["stage"] == last_stage(data)]
    return sum(quantity(data, runs[i]) for i in (lots or ids))


def chosen_options(data, rows):
    present = {r["run"] for r in rows}
    return sorted(o for o, ids in reserve_groups(data).items() if all(i in present for i in ids))


def _deliveries(data, rows):
    qc = {r["run"]: r["end"] for r in rows if r["stage"] == last_stage(data)}
    out = []
    for o in data["orders"]:
        t = max([o["release"]] + [qc.get(l, float("inf")) for l in o["lot_allocations"]])
        out.append({"order": o["id"], "product": o["product"], "time": t, "quantity": o["quantity"],
                    "due": o["due"], "tardiness": max(0, t - o["due"]), "priority": o["priority"]})
    return out


def _finished_events(data, rows, deliveries):
    runs = {r["id"]: r for r in data["runs"]}
    ev = [(r["end"], 0, runs[r["run"]]["item"], quantity(data, runs[r["run"]]), r["run"])
          for r in rows if r["stage"] == last_stage(data)]
    ev += [(d["time"], 1, d["product"], -d["quantity"], d["order"]) for d in deliveries]
    return sorted(ev)


def validate(data, rows):
    errors = []
    runs = {r["id"]: r for r in data["runs"]}
    counts = Counter(r["run"] for r in rows)
    unknown = [i for i in counts if i not in runs]
    if unknown or any(v != 1 for v in counts.values()):
        return {"valid": False, "errors": [f"unknown or duplicated runs: {sorted(unknown) or [i for i, v in counts.items() if v != 1]}"]}
    mandatory = {r["id"] for r in data["runs"] if "reserve_option" not in r}
    missing = mandatory - set(counts)
    if missing:
        errors.append(f"missing mandatory runs: {sorted(missing)}")
    for option, ids in reserve_groups(data).items():
        got = [i for i in ids if i in counts]
        if got and len(got) != len(ids):
            errors.append(f"reserve option {option}: runs {sorted(set(ids) - set(got))} missing (all-or-nothing)")
    cal = {m: calendar(data, m) for m in data["machines"]}
    for r in rows:
        run, p = runs[r["run"]], f'{r["run"]}'
        if any(not isinstance(r[k], int) or isinstance(r[k], bool) for k in
               ("block_start", "start", "end", "setup_minutes", "maintenance_minutes", "cycles_after")):
            errors.append(p + ": times and minutes must be whole minutes (int)")
            continue
        if r["stage"] != run["stage"] or r.get("item") != run["item"]:
            errors.append(p + ": stage/item differ from input")
        if r["machine"] not in eligible(data, run):
            errors.append(p + f": {r['machine']} cannot make {run['item']}")
            continue
        if r["end"] - r["start"] != duration(data, run, r["machine"]):
            errors.append(p + ": wrong duration")
        if r["block_start"] + r["maintenance_minutes"] + r["setup_minutes"] != r["start"]:
            errors.append(p + ": block pieces do not add up")
        wins = [w for w in cal[r["machine"]][0] if w["id"] == r["window"]]
        if not wins or wins[0]["shift"] != r["shift"] or not (wins[0]["start"] <= r["block_start"] and r["end"] <= wins[0]["end"]):
            errors.append(p + ": outside its calendar window")
        if not 0 <= r["block_start"] < r["end"] <= data["horizon"]:
            errors.append(p + ": outside horizon")
        if uses_molds(data, run):
            if r["mold"] not in data["molds"] or data["molds"][r["mold"]]["item"] != run["item"]:
                errors.append(p + ": needs a mold for " + run["item"])
        elif r["mold"] is not None or r["maintenance_minutes"]:
            errors.append(p + ": mold/maintenance on a stage without molds")
    # molds: one machine at a time, cycle counter, maintenance exactly when needed
    for k, spec in data.get("molds", {}).items():
        used, last_end = spec["initial_cycles"], None
        for r in sorted((r for r in rows if r["mold"] == k), key=lambda r: r["block_start"]):
            if last_end is not None and r["block_start"] < last_end:
                errors.append(f"{k}: used by two runs at once ({r['run']})")
            c = cycles(data, runs[r["run"]], k)
            need = used + c > spec["limit_cycles"]
            if need != bool(r["maintenance_minutes"]) or (need and r["maintenance_minutes"] != spec["maintenance_minutes"]):
                errors.append(f"{r['run']}: maintenance of {k} {'missing' if need else 'not allowed'}")
            used = (0 if need else used) + c
            if r["cycles_after"] != used:
                errors.append(f"{r['run']}: wrong cycle counter for {k}")
            last_end = r["end"]
    # machines: no overlap, setup from predecessor (item, mold, maintenance)
    for mid, spec in data["machines"].items():
        prev_item, prev_mold, last_end = data["machine_initial_state"], None, 0
        for r in sorted((r for r in rows if r["machine"] == mid), key=lambda r: r["block_start"]):
            if r["block_start"] < last_end:
                errors.append(f"{mid}: overlap at {r['run']}")
            item = runs[r["run"]]["item"]
            want = cast_setup(data, mid, prev_item, prev_mold, item, r["mold"], r["maintenance_minutes"] > 0)
            if r["setup_minutes"] != want:
                errors.append(f"{r['run']}: setup {r['setup_minutes']} != {want}")
            prev_item, prev_mold, last_end = item, r["mold"], r["end"]
    # BTP stock (A09/A10/R12): credit at end + transfer of the producing stage,
    # debit at the consuming block start; credit first at the same minute.
    up = upstream(data)
    events = []
    for r in rows:
        run = runs[r["run"]]
        if run["stage"] in btp_stages(data):
            events.append((r["end"] + data["transfer_minutes"][run["stage"]], 0, run["item"], quantity(data, run)))
        if up[run["item"]]:
            events.append((r["block_start"], 1, up[run["item"]], -quantity(data, run)))
    level = {c: v["initial_stock"] for c, v in data["btp"].items()}
    for t, _, code, q in sorted(events):
        level[code] = level.get(code, 0) + q
        if level[code] < 0:
            errors.append(f"BTP {code} negative at t={t}")
        cap = data["btp"].get(code, {}).get("capacity")
        if cap is not None and level[code] > cap:
            errors.append(f"BTP {code} above capacity at t={t}")
    deliveries = _deliveries(data, rows)
    inv = {p: s["initial_stock"] for p, s in data["products"].items()}
    for t, _, p, q, src in _finished_events(data, rows, deliveries):
        inv[p] += q
        if inv[p] < 0:
            errors.append(f"{p}: negative finished stock at t={t} ({src})")
    for c in data["checkpoints"]:
        for p, v in _stock_at(data, rows, deliveries, c).items():
            if v > data["products"][p]["stock_cap"]:
                errors.append(f"{p}: above stock_cap at checkpoint {c}")
    return {"valid": not errors, "errors": errors, "operations_checked": len(rows),
            "scope": "schema 5: fixed runs per stage, shared mold pool, one window per block"}


def _stock_at(data, rows, deliveries, checkpoint):
    values = {p: s["initial_stock"] for p, s in data["products"].items()}
    for t, _, p, q, _src in _finished_events(data, rows, deliveries):
        if t <= checkpoint:
            values[p] += q
    return values


def evaluate(data, rows):
    runs = {r["id"]: r for r in data["runs"]}
    deliveries = _deliveries(data, rows)
    shifts = []
    for mid in data["machines"]:
        for sh in calendar(data, mid)[1]:
            mine = [r for r in rows if r["machine"] == mid and r["shift"] == sh["id"]]
            if not mine:
                continue
            processing = sum(r["end"] - r["start"] for r in mine)
            setup = sum(r["setup_minutes"] for r in mine)
            maint = sum(r["maintenance_minutes"] for r in mine)
            shifts.append({"machine": mid, "shift": sh["id"], "available": sh["available_minutes"],
                           "processing": processing, "setup": setup, "maintenance": maint,
                           "idle": sh["available_minutes"] - processing - setup - maint,
                           "utilization": processing / sh["available_minutes"]})
    daily = []
    for c in data["checkpoints"]:
        for p, v in _stock_at(data, rows, deliveries, c).items():
            safe = data["products"][p]["safety_stock"]
            daily.append({"time": c, "product": p, "inventory": v, "shortfall": max(0, safe - v), "surplus": max(0, v - safe)})
    options = chosen_options(data, rows)
    lots = [r for r in rows if r["stage"] == last_stage(data)]
    mandatory_lots = [r for r in lots if "reserve_option" not in runs[r["run"]]]
    available = sum(s["available"] for s in shifts)
    processing = sum(s["processing"] for s in shifts)
    ledger = []
    inv = {p: s["initial_stock"] for p, s in data["products"].items()}
    for t, k, p, q, src in _finished_events(data, rows, deliveries):
        inv[p] += q
        ledger.append({"time": t, "kind": "QC" if k == 0 else "SHIP", "source": src, "product": p, "delta": q, "inventory": inv[p]})
    up = upstream(data)
    btp_end = {c: v["initial_stock"] for c, v in data["btp"].items()}
    for r in rows:
        run = runs[r["run"]]
        if run["stage"] in btp_stages(data):
            btp_end[run["item"]] = btp_end.get(run["item"], 0) + quantity(data, run)
        if up[run["item"]]:
            btp_end[up[run["item"]]] -= quantity(data, run)
    metrics = {
        "makespan": max((r["end"] for r in mandatory_lots), default=0),
        "mandatory_makespan": max((r["end"] for r in mandatory_lots), default=0),
        "schedule_end": max(r["end"] for r in rows),
        "weighted_tardiness": sum(d["priority"] * d["tardiness"] for d in deliveries),
        "total_tardiness": sum(d["tardiness"] for d in deliveries),
        "late_orders": sum(d["tardiness"] > 0 for d in deliveries),
        "max_tardiness": max((d["tardiness"] for d in deliveries), default=0),
        "setup_minutes": sum(r["setup_minutes"] for r in rows),
        "maintenance_minutes": sum(r["maintenance_minutes"] for r in rows),
        "maintenance_count": sum(r["maintenance_minutes"] > 0 for r in rows),
        "idle_minutes": sum(s["idle"] for s in shifts),
        "safety_shortfall": sum(d["shortfall"] for d in daily),
        "activated_shifts": len(shifts),
        "productive_utilization": processing / available if available else None,
        "processing_minutes": processing, "available_minutes": available,
        "produced_quantity": sum(quantity(data, runs[r["run"]]) for r in lots),
        "shipped_quantity": sum(d["quantity"] for d in deliveries),
        "end_inventory": inv, "btp_end": btp_end,
        "reserve_production": len(options),
        "reserve_quantity": sum(option_quantity(data, o) for o in options),
        "surplus_holding": sum(d["surplus"] for d in daily),
        "shift_opening": 0,
        "reserve_options_chosen": options,
        # Every minute of an opened (staffed) shift is paid; only processing makes
        # product. Setup and maintenance are therefore non-productive here and carry
        # their own extra weight in the objective -- never a discount (see SOURCE.md).
        "nonproductive_minutes": available - processing,
        "reserve_units": sum(option_quantity(data, o) for o in options),
        "btp_end_units": sum(btp_end.values()),
    }
    metrics.update(objective_terms(data, metrics))
    return metrics, {"deliveries": deliveries, "inventory_events": ledger, "daily_inventory": daily, "shifts": shifts}


def objective_terms(data, metrics):
    """Lexicographic objective (requirements mục 4.3.2): tier 1 = service level
    (tardiness, safety shortfall) strictly before tier 2 = operating cost.
    objective = scale * tier1 + tier2, with scale larger than any tier-2 value."""
    tiers = data.get("objective_tiers", {})
    first = set(tiers.get("tier1", []))
    scale = tiers.get("scale", 1)
    t1 = sum(w * metrics[k] for k, w in data["weights"].items() if k in first)
    t2 = sum(w * metrics[k] for k, w in data["weights"].items() if k not in first)
    return {"objective_tier1": t1, "objective_tier2": t2, "objective": scale * t1 + t2}
