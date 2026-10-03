"""Serial schedule generation for schema 5 (FIFO/EDD/SPT and the SA/GA decoder).

Same mechanism as the schema-4 decoder (models/common/decoder.py): at each step
every ready mandatory run gets its earliest feasible placement (append-only per
machine, first window it fits in); the run with the earliest block start wins,
ties broken by the rule key. Reserve options are never chosen here -- that is an
economic decision, not a dispatch rule (same as schema 4). A QC lot also waits
while the finished-goods warehouse would exceed stock_cap at a checkpoint.

Speed (same output as the plain version, checked in tests): a run's best placement
only changes when something it depends on changes -- the state of a machine it can
use, of a mold it can use, the stock of the code it consumes, or the finished lots
of its product. Placing a run marks exactly the runs that depend on what it
changed; only those are recomputed, every other cached placement is reused. The first
window that can hold a block is found by binary search on window ends.
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


def decode(data, rule="edd", priorities=None, machine_bias=None, delays=None, options=()):
    """delays: {run index: minutes} -- the run may not start before its earliest
    feasible time plus this delay (lets a search wait to consolidate shifts).
    options: reserve options to include (all their runs); rules pass none."""
    runs = data["runs"]
    todo = [i for i, r in enumerate(runs) if r.get("reserve_option") in (None, *options)]
    due = run_due(data)
    up = upstream(data)
    windows = {m: calendar(data, m)[0] for m in data["machines"]}
    ends = {m: [w["end"] for w in ws] for m, ws in windows.items()}
    mach = {m: {"end": 0, "item": data["machine_initial_state"], "mold": None} for m in data["machines"]}
    molds = {k: {"used": v["initial_cycles"], "free": 0} for k, v in data.get("molds", {}).items()}
    credits = {c: [] for c in data["btp"]}
    consumed = {c: 0 for c in data["btp"]}
    finished = {p: [] for p in data["products"]}
    shipped = {p: [(o["release"], o["quantity"]) for o in data["orders"] if o["product"] == p] for p in data["products"]}
    btp = set(btp_stages(data))

    static = {}  # per run: quantity, consumed code, (machine, mold, minutes, cycles) options, due
    for i in todo:
        run = runs[i]
        opts = [(mid, mold, duration(data, run, mid), cycles(data, run, mold) if mold else 0)
                for mid in eligible(data, run) for mold in (molds_for(data, run["item"]) or [None])]
        static[i] = (quantity(data, run), up[run["item"]], opts, due[run["id"]])

    # who depends on what: placing a run dirties exactly these runs' cached placement
    by_mach, by_mold, by_code, by_prod = {}, {}, {}, {}
    for i, (_, code, opts, _) in static.items():
        for mid, mold, _, _ in opts:
            by_mach.setdefault(mid, set()).add(i)
            if mold:
                by_mold.setdefault(mold, set()).add(i)
        if code:
            by_code.setdefault(code, set()).add(i)
        if runs[i]["item"] in finished:
            by_prod.setdefault(runs[i]["item"], set()).add(i)
    cache = {}
    dirty = set(todo)

    def place(i):
        run = runs[i]
        q, code, opts, _ = static[i]
        lower = 0
        if code:
            lower = _ready_time(data["btp"][code]["initial_stock"], credits[code], consumed[code], q)
            if lower is None:
                return None
        if run["item"] in finished:
            lower = max(lower, _cap_ready(data, run["item"], finished[run["item"]], q, shipped[run["item"]]))
        if delays:
            lower += delays.get(i, 0)
        best = None
        for mid, mold, p, c in opts:
            st = mach[mid]
            maint, used, free = 0, 0, 0
            if mold:
                spec = data["molds"][mold]
                used, free = molds[mold]["used"] + c, molds[mold]["free"]
                if used > spec["limit_cycles"]:
                    maint, used = spec["maintenance_minutes"], c
            su = cast_setup(data, mid, st["item"], st["mold"], run["item"], mold, maint > 0)
            earliest = max(st["end"], lower, free)
            length = maint + su + p
            ws = windows[mid]
            # windows ending before earliest + length cannot hold the block: skip them
            for k in range(bisect_left(ends[mid], earliest + length), len(ws)):
                w = ws[k]
                b = max(earliest, w["start"])
                if b + length <= w["end"]:
                    row = {"run": run["id"], "stage": run["stage"], "item": run["item"], "machine": mid,
                           "block_start": b, "start": b + maint + su, "end": b + length,
                           "setup_minutes": su, "maintenance_minutes": maint, "mold": mold,
                           "cycles_after": used if mold else 0, "window": w["id"], "shift": w["shift"]}
                    bias = 0 if machine_bias is None else machine_bias.get((i, mid), 0)
                    key = (row["end"] + bias, row["end"], mid, mold or "")
                    if best is None or key < best[0]:
                        best = (key, row)
                    break
        return None if best is None else best[1]

    rows = []
    while todo:
        candidates = []
        for i in dirty:
            cache[i] = place(i)
        dirty.clear()
        for i in todo:
            row = cache[i]
            if row is None:
                continue
            d, prio = static[i][3]
            if priorities is not None:
                key = (priorities[i], i)
            elif rule == "fifo":
                key = (0, i)  # every run is released at 0: input order
            elif rule == "spt":
                key = (row["end"] - row["start"], d, i)
            else:
                key = (d, -prio, i)
            candidates.append(((row["block_start"], key), i, row))
        if not candidates:
            return None
        _, i, row = min(candidates, key=lambda c: c[0])
        run = runs[i]
        rows.append(row)
        mach[row["machine"]] = {"end": row["end"], "item": run["item"], "mold": row["mold"]}
        dirty |= by_mach[row["machine"]]
        if row["mold"]:
            molds[row["mold"]] = {"used": row["cycles_after"], "free": row["end"]}
            dirty |= by_mold[row["mold"]]
        q = static[i][0]
        if run["stage"] in btp:
            insort(credits[run["item"]], (row["end"] + data["transfer_minutes"][run["stage"]], q))
            dirty |= by_code.get(run["item"], set())
        if up[run["item"]]:
            consumed[up[run["item"]]] += q
            dirty |= by_code.get(up[run["item"]], set())
        if run["item"] in finished:
            finished[run["item"]].append((row["end"], q))
            dirty |= by_prod[run["item"]]
        todo.remove(i)
        cache.pop(i, None)
        dirty &= set(todo)
    return rows
