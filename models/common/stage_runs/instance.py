"""Schema-5 input: helpers shared by the evaluator, decoder and CP model.

Conventions fixed here (and documented in dataset/wheel-factory-small/SOURCE.md):
  * A run's quantity is run_size[stage]; its duration on machine m is
    ceil(quantity * minutes_per_unit + fixed_minutes).
  * Calendar: a machine with calendar "continuous" works the whole horizon; any
    other machine works every shift of shift_template each day. A run block
    (maintenance + setup + processing) lies inside ONE window = one shift minus
    its breaks and the machine's downtime (same rule as the schema-4 engine).
  * Molds are a pool keyed by the item they cast; a cast run uses exactly one
    mold of its item. Mounting a different mold than the machine's previous run
    costs at least mold_change_minutes; after maintenance the setup row is the
    mold's after_maintenance state.
"""
from __future__ import annotations

import math


class InputError(ValueError):
    pass


def btp_stages(data):
    return data["stages"][:-1]


def last_stage(data):
    return data["stages"][-1]


def upstream(data):
    """Item -> the item its stage consumes (None for the first stage)."""
    out = {}
    stages = btp_stages(data)
    for product, spec in data["products"].items():
        chain = [spec["route"][s] for s in stages] + [product]
        for k, item in enumerate(chain):
            out[item] = chain[k - 1] if k else None
    return out


def quantity(data, run):
    return data["run_size"][run["stage"]]


def duration(data, run, machine):
    spec = data["machines"][machine]
    return math.ceil(quantity(data, run) * spec["minutes_per_unit"][run["item"]] + spec["fixed_minutes"])


def eligible(data, run):
    return [m for m, spec in data["machines"].items()
            if spec["stage"] == run["stage"] and run["item"] in spec["minutes_per_unit"]]


def molds_for(data, item):
    return [k for k, spec in data.get("molds", {}).items() if spec["item"] == item]


def uses_molds(data, run):
    return bool(molds_for(data, run["item"]))


def cycles(data, run, mold):
    return math.ceil(quantity(data, run) / data["molds"][mold]["cavities"])


def is_continuous(data, machine):
    return data["machines"][machine].get("calendar") == "continuous"


def _cut(spans, holes):
    for a0, a1 in holes:
        spans = [p for s, e in spans for p in ((s, min(e, a0)), (max(s, a1), e)) if p[1] > p[0]]
    return spans


def calendar(data, machine):
    """(windows, shifts) of one machine.

    windows: [{"id", "shift", "start", "end"}], shifts: [{"id", "start", "end", "available_minutes"}].
    A continuous machine has windows with shift None and no shifts (it never
    enters the idle-minutes KPI: nobody is rostered to it).
    """
    spec = data["machines"][machine]
    downtime = [tuple(d) for d in spec.get("downtime", [])]
    windows, shifts = [], []
    if spec.get("calendar") == "continuous":
        for s, e in _cut([(0, data["horizon"])], downtime):
            windows.append({"id": len(windows), "shift": None, "start": s, "end": e})
        return windows, shifts
    for day in range(data["horizon"] // 1440):
        for key, sh in data["shift_template"].items():
            start, end = day * 1440 + sh["start"], day * 1440 + sh["end"]
            breaks = [(day * 1440 + a, day * 1440 + b) for a, b in sh.get("breaks", [])]
            spans = _cut(_cut([(start, end)], breaks), downtime)
            sid = f"D{day + 1:02}_{key}"
            shifts.append({"id": sid, "start": start, "end": end, "available_minutes": sum(e - s for s, e in spans)})
            for s, e in spans:
                windows.append({"id": len(windows), "shift": sid, "start": s, "end": e})
    return windows, shifts


def cast_setup(data, machine, prev_item, prev_mold, item, mold, maintained):
    """Setup before a run on `machine` (see module docstring for the mold rules)."""
    spec = data["machines"][machine]
    if maintained:
        return spec["setup"][data["molds"][mold]["after_maintenance"]][item]
    base = spec["setup"][prev_item][item]
    if mold is not None and prev_mold is not None and mold != prev_mold:
        return max(base, spec.get("mold_change_minutes", 0))
    return base


def reserve_groups(data):
    groups = {}
    for run in data["runs"]:
        if "reserve_option" in run:
            groups.setdefault(run["reserve_option"], []).append(run["id"])
    return groups


def order_of_lot(data):
    out = {}
    for order in data["orders"]:
        for lot in order["lot_allocations"]:
            out[lot] = order
    return out


def run_due(data):
    """Dispatch due date / priority per run: a QC lot takes its order's; an upstream
    run takes the most urgent order whose product route passes through its item.
    Reserve-only runs get no order (infinite due)."""
    lot_order = order_of_lot(data)
    out = {}
    for run in data["runs"]:
        if run["id"] in lot_order:
            o = lot_order[run["id"]]
            out[run["id"]] = (o["due"], o["priority"])
            continue
        prods = [p for p, s in data["products"].items()
                 if run["item"] == p or run["item"] in s["route"].values()]
        orders = [o for o in data["orders"] if o["product"] in prods]
        out[run["id"]] = (min(o["due"] for o in orders), max(o["priority"] for o in orders)) if orders and "reserve_option" not in run else (math.inf, 0)
    return out


def check(data):
    """Reject a schema-5 input the engine cannot interpret unambiguously."""
    def need(cond, msg):
        if not cond:
            raise InputError(msg)
    need(data.get("schema_version") == 5, "stage_runs engine needs schema_version 5")
    stages = data["stages"]
    need(set(data["run_size"]) == set(stages), "run_size must give one size per stage")
    need(set(data["transfer_minutes"]) == set(btp_stages(data)), "transfer_minutes must cover every stage but the last")
    ids = [r["id"] for r in data["runs"]]
    need(len(ids) == len(set(ids)), "duplicate run id")
    up = upstream(data)
    for run in data["runs"]:
        need(run["stage"] in stages, f"{run['id']}: unknown stage")
        need(eligible(data, run), f"{run['id']}: no machine makes {run['item']}")
        need(run["item"] in up, f"{run['id']}: item {run['item']} not on any product route")
        if uses_molds(data, run):
            for k in molds_for(data, run["item"]):
                need(cycles(data, run, k) <= data["molds"][k]["limit_cycles"], f"{run['id']}: run exceeds {k} cycle limit")
    for mid, spec in data["machines"].items():
        need(data["machine_initial_state"] in spec["setup"], f"{mid}: no setup row for initial state")
        need(spec.get("calendar", "shifts") in ("shifts", "continuous"), f"{mid}: bad calendar")
        for item in spec["minutes_per_unit"]:
            for row in spec["setup"].values():
                need(item in row, f"{mid}: setup matrix misses {item}")
    for k, mold in data.get("molds", {}).items():
        for mid, spec in data["machines"].items():
            if mold["item"] in spec["minutes_per_unit"]:
                need(mold["after_maintenance"] in spec["setup"], f"{mid}: no setup row after maintenance of {k}")
    lots = {r["id"]: r for r in data["runs"] if r["stage"] == last_stage(data)}
    for o in data["orders"]:
        need(sum(o["lot_allocations"].values()) + o["initial_allocated"] == o["quantity"], f"{o['id']}: allocation")
        for lid, q in o["lot_allocations"].items():
            need(lid in lots and lots[lid]["item"] == o["product"] and "reserve_option" not in lots[lid], f"{o['id']}: bad lot {lid}")
            need(0 < q <= data["run_size"][last_stage(data)], f"{o['id']}: bad quantity for {lid}")
    for code in data["btp"]:
        need(code in up, f"btp {code} not on any route")
    groups = reserve_groups(data)
    need(set(groups) == set(data.get("reserve_options", {})), "reserve_options and runs disagree")
    known = {"makespan", "weighted_tardiness", "setup_minutes", "maintenance_minutes", "nonproductive_minutes",
             "idle_minutes", "safety_shortfall", "reserve_units", "reserve_production", "surplus_holding", "btp_end_units"}
    need(set(data["weights"]) <= known, f"unknown weight keys {sorted(set(data['weights']) - known)}")
    tiers = data.get("objective_tiers", {})
    need(set(tiers.get("tier1", [])) <= set(data["weights"]), "objective_tiers.tier1 must name weighted terms")
    return data


def twin_groups(data):
    """Mandatory runs that are fully interchangeable: same stage and item and, for
    QC lots, the same order and allocated quantity. Returned in declaration order."""
    lot_order = {lid: (o["id"], q) for o in data["orders"] for lid, q in o["lot_allocations"].items()}
    groups = {}
    for run in data["runs"]:
        if "reserve_option" in run:
            continue
        groups.setdefault((run["stage"], run["item"], lot_order.get(run["id"])), []).append(run["id"])
    return [ids for ids in groups.values() if len(ids) > 1]


def canonical_map(data, rows):
    """{old run id: new run id} that orders interchangeable twins by block start."""
    by_run = {r["run"]: r for r in rows}
    relabel = {}
    for ids in twin_groups(data):
        present = [i for i in ids if i in by_run]
        ordered = sorted(present, key=lambda i: (by_run[i]["block_start"], ids.index(i)))
        for new_id, old_id in zip(present, ordered):
            relabel[old_id] = new_id
    return relabel


def canonical(data, rows):
    """Relabel interchangeable runs so their ids follow block-start order. The
    schedule is unchanged (twins are identical); it just agrees with the solver's
    symmetry-breaking order, so it can be used as a hint or fixed neighbourhood."""
    relabel = canonical_map(data, rows)
    return [{**r, "run": relabel.get(r["run"], r["run"])} for r in rows]
