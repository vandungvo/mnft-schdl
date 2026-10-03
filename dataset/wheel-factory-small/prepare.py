"""Data-preparation step: raw user input (tier 1) -> model input (tier 2).

    python dataset/wheel-factory-small/prepare.py [raw_input.json] [model_input.json]

Tier 1 (`raw_input.json`) holds only what a planner types in: orders, stock,
machines, shifts, run sizes, reserve policy, weights. This script derives what
the scheduler needs on top of it and writes tier 2 (`model_input.json`, never
edited by hand):

  * orders[].lot_allocations -- QC lots cut from net order demand (mục 3.3.1)
  * runs                     -- every cast/cnc/paint/qc run of fixed size (A10)
  * reserve_options          -- A08 pull-ahead options, each chosen all-or-nothing

Rules are generic (any product/BTP layout); nothing here is specific to this
instance. Should move to models/common once the engine reads schema 5.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


class PrepError(ValueError):
    """Raw input is inconsistent or asks for something the rules forbid."""


# ---------- helpers over the raw data ----------

def btp_stages(raw):
    return raw["stages"][:-1]


def upstream_of(raw):
    """Item -> the item its stage draws from (None at the first stage)."""
    out = {}
    for product, spec in raw["products"].items():
        chain = [spec["route"][s] for s in btp_stages(raw)] + [product]
        for k, item in enumerate(chain):
            out[item] = chain[k - 1] if k else None
    return out


def stage_of(raw, item):
    if item in raw["products"]:
        return raw["stages"][-1]
    return next(s for p in raw["products"].values() for s, code in p["route"].items() if code == item)


def plan_runs(raw, paint_draw, stock):
    """Fewest fixed-size runs per BTP code so `stock` covers what the next stage
    draws, walking back from paint. Returns ({code: count}, stock after)."""
    size, up = raw["run_size"], upstream_of(raw)
    draw, counts, left = dict(paint_draw), {}, dict(stock)
    for stage in reversed(btp_stages(raw)):
        for code in sorted(c for c in draw if stage_of(raw, c) == stage):
            n = math.ceil(max(0, draw[code] - left.get(code, 0)) / size[stage])
            counts[code] = n
            left[code] = left.get(code, 0) + n * size[stage] - draw[code]
            if up[code]:
                draw[up[code]] = draw.get(up[code], 0) + n * size[stage]
    return counts, left


def runs_for(raw, counts, id_fmt, **extra):
    out = []
    for stage in btp_stages(raw):
        for code in sorted(c for c in counts if stage_of(raw, c) == stage):
            out += [{"id": id_fmt.format(code=code, k=k), "stage": stage, "item": code, **extra}
                    for k in range(1, counts[code] + 1)]
    return out


def end_stock(raw, runs):
    size, up = raw["run_size"], upstream_of(raw)
    level = {c: s["initial_stock"] for c, s in raw["btp"].items()}
    for r in runs:
        if r["stage"] != raw["stages"][-1]:
            level[r["item"]] += size[r["stage"]]
        if up[r["item"]]:
            level[up[r["item"]]] -= size[r["stage"]]
    return level


# ---------- derivation steps ----------

def cut_lots(raw):
    """Mục 3.3.1: per product, pool net demand (quantity - initial_allocated) of its
    orders, cut into QC lots of run_size.qc, allocate to orders by ascending due."""
    q = raw["run_size"]["qc"]
    lots, allocations, n = [], {o["id"]: {} for o in raw["orders"]}, 0
    for product in raw["products"]:
        orders = sorted((o for o in raw["orders"] if o["product"] == product), key=lambda o: o["due"])
        need = [[o["id"], o["quantity"] - o["initial_allocated"]] for o in orders]
        for _ in range(math.ceil(sum(x for _, x in need) / q)):
            n += 1
            lot, room = f"L{n:03}", q
            lots.append({"id": lot, "stage": "qc", "item": product})
            for entry in need:
                take = min(room, entry[1])
                if take:
                    allocations[entry[0]][lot] = take
                    entry[1] -= take
                    room -= take
    return lots, allocations


def pull_ahead_caps(raw, lots, allocations):
    """A08: long-term demand minus finished technical surplus, per product."""
    q = raw["run_size"]["qc"]
    caps = {p: 0 for p in raw["products"]}
    for o in raw["long_term_orders"]:
        caps[o["product"]] += o["quantity"]
    allocated = {}
    for per_order in allocations.values():
        for lot, qty in per_order.items():
            allocated[lot] = allocated.get(lot, 0) + qty
    for lot in lots:
        caps[lot["item"]] -= q - allocated.get(lot["id"], 0)
    return caps


def reserve(raw, stock, caps):
    """A08 options from reserve_policy. Finished-lot options get the extra upstream
    runs they need. Each option may use mandatory leftover stock that no earlier
    option claimed, never another option's surplus, so every subset is feasible."""
    size, runs, options = raw["run_size"], [], {}
    used = {p: 0 for p in raw["products"]}
    rl = rb = 0
    for product, policy in raw.get("reserve_policy", {}).items():
        for _ in range(policy.get("finished_lots", 0)):
            rl += 1
            option = f"RL{rl:03}"
            used[product] += size["qc"]
            code = raw["products"][product]["route"]["paint"]
            counts, after = plan_runs(raw, {code: size["qc"]}, stock)
            # Pass on only the mandatory leftover this option did NOT claim -- never
            # its own surplus -- so no option depends on another being chosen and any
            # subset the solver picks still has enough stock (checked in check_model).
            stock = {c: min(stock[c], after[c]) for c in stock}
            runs += runs_for(raw, counts, "{code}-" + option + "-{k}", reserve_option=option)
            runs.append({"id": option, "stage": "qc", "item": product, "reserve_option": option})
            options[option] = {"pull_ahead_for": product}
        for stage, count in policy.get("btp_runs", {}).items():
            for _ in range(count):
                rb += 1
                option = f"RB{rb:03}"
                used[product] += size[stage]
                code = raw["products"][product]["route"][stage]
                runs.append({"id": f"{code}-{option}", "stage": stage, "item": code, "reserve_option": option})
                options[option] = {"pull_ahead_for": product}
    for p, qty in used.items():
        if qty > caps[p]:
            raise PrepError(f"reserve_policy for {p}: {qty} units > pull-ahead cap {caps[p]} "
                            f"(long-term orders minus technical surplus)")
    return runs, options


def prepare(raw):
    check_raw(raw)
    lots, allocations = cut_lots(raw)
    paint_draw = {}
    for lot in lots:
        code = raw["products"][lot["item"]]["route"]["paint"]
        paint_draw[code] = paint_draw.get(code, 0) + raw["run_size"]["qc"]
    opening = {c: s["initial_stock"] for c, s in raw["btp"].items()}
    counts, leftover = plan_runs(raw, paint_draw, opening)
    mandatory = runs_for(raw, counts, "{code}-{k:02}") + lots
    reserve_runs, options = reserve(raw, leftover, pull_ahead_caps(raw, lots, allocations))

    model = {"schema_version": 5, "derived_from": "raw_input.json"}
    for key, value in raw.items():
        if key == "reserve_policy":
            continue
        if key == "orders":
            value = [{**o, "lot_allocations": allocations[o["id"]]} for o in value]
        model[key] = value
    model["reserve_options"] = options
    model["runs"] = mandatory + reserve_runs
    check_model(model)
    return model


# ---------- checks ----------

def check_raw(raw):
    stages = raw["stages"]
    if set(raw["run_size"]) != set(stages):
        raise PrepError("run_size must give one size per stage")
    makes = {s: set() for s in stages}
    for m in raw["machines"].values():
        makes[m["stage"]] |= set(m["minutes_per_unit"])
    # Molds are a pool keyed by the item they make; any machine of that stage can
    # mount any of them (a mold sits on one machine at a time -- scheduler's job).
    molds = raw.get("molds", {})
    mold_items = {}
    for mold_id, mold in molds.items():
        stage = next((s for s, items in makes.items() if mold["item"] in items), None)
        if stage is None:
            raise PrepError(f"{mold_id}: no machine makes {mold['item']}")
        if math.ceil(raw["run_size"][stage] / mold["cavities"]) > mold["limit_cycles"]:
            raise PrepError(f"{mold_id}: one run exceeds the mold cycle limit")
        mold_items.setdefault(stage, set()).add(mold["item"])
    for stage, items in mold_items.items():
        if items != makes[stage]:
            raise PrepError(f"stage {stage} uses molds but {sorted(makes[stage] - items)} has none")
    after = {mold["after_maintenance"] for mold in molds.values()}
    for mid, m in raw["machines"].items():
        rows = set(m["setup"]) - {raw["machine_initial_state"]}
        if raw["machine_initial_state"] not in m["setup"]:
            raise PrepError(f"{mid}: no setup row for machine_initial_state")
        if m["stage"] in mold_items:
            if not after <= rows:
                raise PrepError(f"{mid}: no setup row for the after-maintenance state")
            rows -= after
        if rows != set(m["minutes_per_unit"]):
            raise PrepError(f"{mid}: setup rows do not match the items it makes")
    if set(raw["transfer_minutes"]) != set(btp_stages(raw)):
        raise PrepError("transfer_minutes must give one delay per stage before the last")
    for mid, m in raw["machines"].items():
        if m.get("calendar", "shifts") not in ("shifts", "continuous"):
            raise PrepError(f"{mid}: calendar must be 'shifts' or 'continuous'")
        if any(v < 0 for v in m["minutes_per_unit"].values()) or m["fixed_minutes"] < 0:
            raise PrepError(f"{mid}: negative time")
    for p, spec in raw["products"].items():
        if set(spec["route"]) != set(btp_stages(raw)):
            raise PrepError(f"{p}: route must name one BTP code per stage before the last")
        for stage, code in spec["route"].items():
            if code not in raw["btp"] or code not in makes[stage]:
                raise PrepError(f"{p}: no BTP entry or no machine for {code} at {stage}")
        if p not in makes[stages[-1]]:
            raise PrepError(f"{p}: no machine at {stages[-1]}")
        if spec["initial_stock"] > spec["stock_cap"]:
            raise PrepError(f"{p}: initial_stock above stock_cap")
    taken = {}
    for o in raw["orders"]:
        if not 0 <= o["initial_allocated"] <= o["quantity"]:
            raise PrepError(f"{o['id']}: initial_allocated out of range")
        taken[o["product"]] = taken.get(o["product"], 0) + o["initial_allocated"]
    for p, qty in taken.items():
        if qty > raw["products"][p]["initial_stock"]:
            raise PrepError(f"{p}: orders take {qty} from stock, only {raw['products'][p]['initial_stock']}")


def check_model(model):
    runs = {r["id"]: r for r in model["runs"]}
    if len(runs) != len(model["runs"]):
        raise PrepError("duplicate run id")
    for o in model["orders"]:
        if sum(o["lot_allocations"].values()) + o["initial_allocated"] != o["quantity"]:
            raise PrepError(f"{o['id']}: allocation does not add up")
    # Quantities add up for EVERY subset of reserve options the solver could choose.
    mandatory = [r for r in model["runs"] if "reserve_option" not in r]
    options = list(model["reserve_options"])
    for mask in range(2 ** len(options)):
        chosen = {o for k, o in enumerate(options) if mask >> k & 1}
        subset = mandatory + [r for r in model["runs"] if r.get("reserve_option") in chosen]
        short = {c: v for c, v in end_stock(model, subset).items() if v < 0}
        if short:
            raise PrepError(f"options {sorted(chosen)}: BTP short at end {short}")
    for stage, (need, have) in stage_load(model, mandatory).items():
        if need > have:
            raise PrepError(f"stage {stage}: mandatory runs need {need} min, machines have {have}")


def available_minutes(model, machine):
    """Working minutes of one machine over the horizon (shift calendar or 24/7),
    minus breaks and declared downtime."""
    horizon, spans = model["horizon"], []
    if machine.get("calendar", "shifts") == "continuous":
        spans = [(0, horizon)]
    else:
        for day in range(horizon // 1440):
            for shift in model["shift_template"].values():
                cuts = [(day * 1440 + a, day * 1440 + b) for a, b in shift.get("breaks", [])]
                start = day * 1440 + shift["start"]
                for a, b in sorted(cuts) + [(day * 1440 + shift["end"],) * 2]:
                    spans.append((start, a))
                    start = b
    total = sum(max(0, b - a) for a, b in spans)
    for d0, d1 in machine.get("downtime", []):
        total -= sum(max(0, min(b, d1) - max(a, d0)) for a, b in spans)
    return total


def duration(model, run, machine):
    spec = model["machines"][machine]
    size = model["run_size"][run["stage"]]
    return math.ceil(size * spec["minutes_per_unit"][run["item"]] + spec["fixed_minutes"])


def stage_load(model, runs):
    """Per stage: (processing minutes on the fastest machine, available minutes of
    all machines of the stage). Setup/maintenance excluded, so this is a LOWER
    bound on need -- load > 100% proves infeasible, < 100% does not prove feasible."""
    out = {}
    for stage in model["stages"]:
        machines = [m for m, spec in model["machines"].items() if spec["stage"] == stage]
        need = sum(min(duration(model, r, m) for m in machines if r["item"] in model["machines"][m]["minutes_per_unit"])
                   for r in runs if r["stage"] == stage)
        out[stage] = (need, sum(available_minutes(model, model["machines"][m]) for m in machines))
    return out


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "raw_input.json"
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "model_input.json"
    model = prepare(json.loads(src.read_text(encoding="utf-8")))
    dst.write_text(json.dumps(model, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("OK, wrote", dst)
    for stage in model["stages"]:
        print(f"{stage:7}", [r["id"] for r in model["runs"] if r["stage"] == stage])
    print("lot_allocations:", {o["id"]: o["lot_allocations"] for o in model["orders"]})
    mand = [r for r in model["runs"] if "reserve_option" not in r]
    left = end_stock(model, mand)
    print("BTP left at end (mandatory only):", left, "total", sum(left.values()))
    for label, subset in (("mandatory", mand), ("with all reserve", model["runs"])):
        print(f"load ({label}):", ", ".join(f"{s} {n}/{h} ({n / h:.0%})" for s, (n, h) in stage_load(model, subset).items()))
