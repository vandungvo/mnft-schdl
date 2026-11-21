"""Serial schedule generation for schema 5 (FIFO/EDD/SPT and the SA/GA decoder).

Same mechanism as the schema-4 decoder (models/common/decoder.py): at each step
every ready mandatory run gets its earliest feasible placement (append-only per
machine, first window it fits in); the run with the earliest block start wins,
ties broken by the rule key. Reserve options are never chosen here -- that is an
economic decision, not a dispatch rule (same as schema 4). A QC lot also waits
while the finished-goods warehouse would exceed stock_cap at a checkpoint.

Speed (same output as the plain version, checked in tests against stored digests):
  * a run's best placement only changes when something it depends on changes --
    the state of a machine it can use, of a mold it can use, the stock of the code
    it consumes, or the finished lots of its product. Placing a run marks exactly
    what depends on what it changed; only that is recomputed.
  * interchangeable runs share one placement. Runs of the same stage, item and
    quantity with the same delay and machine bias (most of a 2-week plan: dozens
    of identical runs per item) form a class; the placement is computed once per
    class and only the class's most urgent remaining run competes. This is what
    bounds how many schedules SA/GA can try per second on a 2-week instance.
  * the first window that can hold a block is found by binary search on window ends.
  * everything that depends on the input only (calendars, due dates, each run's
    machine/mold options, deliveries per checkpoint) is built once by prepare() and
    reused by a search that decodes thousands of genomes of the same instance.
"""
from __future__ import annotations

from bisect import bisect_left, insort

from .instance import (calendar, cast_setup, cycles, duration, eligible, molds_for, quantity,
                       run_due, upstream, btp_stages)


def _ready_time(initial, credits, consumed, qty):
    """Earliest time cumulative stock covers everything already consumed plus qty
    (safe for consumers placed earlier or later, see validate()). `credits` is kept
    sorted by the caller."""
    need = consumed + qty
    available = initial
    if available >= need:
        return 0
    for t, q in credits:
        available += q
        if available >= need:
            return t
    return None


def _cap_ready(data, product, lots, qty, out=None):
    """Earliest block start for a QC lot of `qty` so finished stock stays within
    stock_cap at every checkpoint: a full warehouse makes packing wait. Deliveries
    are projected at their release (the pickup time), lots already placed at their
    end. Returns 0 when no checkpoint is at risk, or when even the last one is
    (then nothing helps -- validate() reports it)."""
    spec = data["products"][product]
    if out is None:
        out = [(o["release"], o["quantity"]) for o in data["orders"] if o["product"] == product]
    late = [c for c in data["checkpoints"]
            if spec["initial_stock"] + sum(q for t, q in lots if t <= c) - sum(q for t, q in out if t <= c) + qty > spec["stock_cap"]]
    if not late or late[-1] == data["checkpoints"][-1]:
        return 0
    return late[-1]


def prepare(data):
    """Everything decode() needs that depends on the input only. Build it once and pass it
    as `context` when decoding many genomes of the same (unchanged) instance."""
    runs = data["runs"]
    up = upstream(data)
    windows = {m: calendar(data, m)[0] for m in data["machines"]}
    checkpoints = list(data["checkpoints"])
    static = []
    for run in runs:
        opts = tuple((mid, mold, duration(data, run, mid), cycles(data, run, mold) if mold else 0)
                     for mid in eligible(data, run) for mold in (molds_for(data, run["item"]) or [None]))
        static.append((quantity(data, run), up[run["item"]], opts))
    # finished stock at each checkpoint before any lot is packed: opening stock minus the
    # deliveries projected at their release (the pickup time), see _cap_ready()
    base = {p: [spec["initial_stock"] - sum(o["quantity"] for o in data["orders"] if o["product"] == p and o["release"] <= c)
                for c in checkpoints] for p, spec in data["products"].items()}
    return {"up": up, "windows": windows, "ends": {m: [w["end"] for w in ws] for m, ws in windows.items()},
            "due": run_due(data), "static": static, "checkpoints": checkpoints, "base": base,
            "btp": set(btp_stages(data))}


def decode(data, rule="edd", priorities=None, machine_bias=None, delays=None, options=(), context=None):
    """delays: {run index: minutes} -- the run may not start before its earliest
    feasible time plus this delay (lets a search wait to consolidate shifts).
    options: reserve options to include (all their runs); rules pass none.
    context: prepare(data), to skip rebuilding it for every genome of a search."""
    ctx = context or prepare(data)
    runs = data["runs"]
    todo = [i for i, r in enumerate(runs) if r.get("reserve_option") in (None, *options)]
    due, up, windows, ends, static, btp = ctx["due"], ctx["up"], ctx["windows"], ctx["ends"], ctx["static"], ctx["btp"]
    checkpoints = ctx["checkpoints"]
    last_checkpoint = len(checkpoints) - 1
    mach = {m: {"end": 0, "item": data["machine_initial_state"], "mold": None} for m in data["machines"]}
    molds = {k: {"used": v["initial_cycles"], "free": 0} for k, v in data.get("molds", {}).items()}
    credits = {c: [] for c in data["btp"]}
    consumed = {c: 0 for c in data["btp"]}
    # finished[product][k]: finished stock at checkpoint k given the lots placed so far
    finished = {p: list(levels) for p, levels in ctx["base"].items()}
    caps = {p: spec["stock_cap"] for p, spec in data["products"].items()}
    transfer = data["transfer_minutes"]
    spt = priorities is None and rule == "spt"

    # Classes of interchangeable runs: same stage, item and quantity (hence the same
    # machine/mold options), same delay and machine bias. A class keeps its runs most
    # urgent first; only the first one competes and all of them share one placement.
    classes, members = {}, []
    for i in todo:
        run = runs[i]
        q, code, opts = static[i]
        delay = delays.get(i, 0) if delays else 0
        bias = tuple(machine_bias.get((i, o[0]), 0) for o in opts) if machine_bias is not None else None
        key = (run["stage"], run["item"], q, opts, delay, bias)
        c = classes.get(key)
        if c is None:
            c = classes[key] = len(members)
            members.append({"stage": run["stage"], "item": run["item"], "q": q, "code": code,
                            "opts": opts, "delay": delay, "bias": bias, "queue": [], "next": 0})
        d, prio = due[run["id"]]
        if priorities is not None:
            order = (priorities[i], i)
        elif rule == "fifo":
            order = (0, i)  # every run is released at 0: input order
        elif spt:
            order = (d, i)  # the processing time, equal within a class, is prepended when competing
        else:
            order = (d, -prio, i)
        members[c]["queue"].append((order, i))
    for cls in members:
        cls["queue"].sort()

    # who depends on what: placing a run dirties exactly these classes' cached placement
    by_mach, by_mold, by_code, by_prod = {}, {}, {}, {}
    for c, cls in enumerate(members):
        for mid, mold, _, _ in cls["opts"]:
            by_mach.setdefault(mid, set()).add(c)
            if mold:
                by_mold.setdefault(mold, set()).add(c)
        if cls["code"]:
            by_code.setdefault(cls["code"], set()).add(c)
        if cls["item"] in finished:
            by_prod.setdefault(cls["item"], set()).add(c)
    alive = set(range(len(members)))
    cache = {}
    dirty = set(alive)
    nothing = frozenset()

    def place(cls):
        item, q, code = cls["item"], cls["q"], cls["code"]
        lower = 0
        if code:
            lower = _ready_time(data["btp"][code]["initial_stock"], credits[code], consumed[code], q)
            if lower is None:
                return None
        if item in finished:
            # same rule as _cap_ready(): wait for the last checkpoint this lot would overfill,
            # unless that is the final one (then waiting cannot help)
            levels, cap = finished[item], caps[item]
            for k in range(last_checkpoint, -1, -1):
                if levels[k] + q > cap:
                    if k != last_checkpoint and checkpoints[k] > lower:
                        lower = checkpoints[k]
                    break
        lower += cls["delay"]
        best = None
        for n, (mid, mold, p, c) in enumerate(cls["opts"]):
            st = mach[mid]
            maint, used, free = 0, 0, 0
            if mold:
                spec = data["molds"][mold]
                used, free = molds[mold]["used"] + c, molds[mold]["free"]
                if used > spec["limit_cycles"]:
                    maint, used = spec["maintenance_minutes"], c
            su = cast_setup(data, mid, st["item"], st["mold"], item, mold, maint > 0)
            earliest = max(st["end"], lower, free)
            length = maint + su + p
            ws = windows[mid]
            # windows ending before earliest + length cannot hold the block: skip them
            for k in range(bisect_left(ends[mid], earliest + length), len(ws)):
                w = ws[k]
                b = max(earliest, w["start"])
                if b + length <= w["end"]:
                    end = b + length
                    key = (end + (cls["bias"][n] if cls["bias"] is not None else 0), end, mid, mold or "")
                    if best is None or key < best[0]:
                        best = (key, {"stage": cls["stage"], "item": item, "machine": mid,
                                      "block_start": b, "start": b + maint + su, "end": end,
                                      "setup_minutes": su, "maintenance_minutes": maint, "mold": mold,
                                      "cycles_after": used if mold else 0, "window": w["id"], "shift": w["shift"]})
                    break
        return None if best is None else best[1]

    rows = []
    for _ in range(len(todo)):
        for c in dirty:
            cache[c] = place(members[c])
        dirty.clear()
        best = None
        for c in alive:
            placed = cache[c]
            if placed is None:
                continue
            cls = members[c]
            order, i = cls["queue"][cls["next"]]
            key = (placed["block_start"], (placed["end"] - placed["start"], *order) if spt else order)
            if best is None or key < best[0]:
                best = (key, c, i, placed)
        if best is None:
            return None
        _, c, i, placed = best
        run = runs[i]
        row = {"run": run["id"], **placed}
        rows.append(row)
        mach[row["machine"]] = {"end": row["end"], "item": run["item"], "mold": row["mold"]}
        dirty |= by_mach[row["machine"]]
        if row["mold"]:
            molds[row["mold"]] = {"used": row["cycles_after"], "free": row["end"]}
            dirty |= by_mold[row["mold"]]
        q = members[c]["q"]
        if run["stage"] in btp:
            insort(credits[run["item"]], (row["end"] + transfer[run["stage"]], q))
            dirty |= by_code.get(run["item"], nothing)
        if up[run["item"]]:
            consumed[up[run["item"]]] += q
            dirty |= by_code.get(up[run["item"]], nothing)
        if run["item"] in finished:
            levels, end = finished[run["item"]], row["end"]
            for k, checkpoint in enumerate(checkpoints):
                if end <= checkpoint:
                    levels[k] += q
            dirty |= by_prod[run["item"]]
        members[c]["next"] += 1
        if members[c]["next"] == len(members[c]["queue"]):
            alive.discard(c)
            cache.pop(c, None)
        dirty &= alive
    return rows
