"""Manual edits of a schema-5 schedule (planner in the loop).

The planner decides *what goes where and in which order*: the machine of every run,
the run order on each machine, and optionally an earliest start for a run. The times
are rebuilt here: each machine takes its runs strictly in the given order, each run at
its earliest feasible block (calendar window, setup from its predecessor, mold free and
maintained when due, upstream BTP available, finished-goods cap) -- the placement rules
of decoder.decode(), so the result is a semi-active schedule of the planner's sequence.

Machines advance together: at every step the head of each machine queue gets its
earliest placement and the earliest one is committed (block starts never go back in
time, as in the decoder). A head that has to wait for stock made on another machine
simply waits; the rebuild only fails when every head waits for something that no
remaining run will ever produce. evaluate.validate() still has the last word (e.g. a
BTP buffer above its capacity because of the chosen order).

apply_edits() is the entry point: it anchors the runs the planner did not touch at their
old start, so an edit only pushes what it has to.
"""
from __future__ import annotations

import re
from bisect import bisect_left, insort
from collections import Counter

from .decoder import _cap_ready, _ready_time
from .instance import btp_stages, calendar, cast_setup, cycles, duration, eligible, molds_for, quantity, upstream


class EditError(ValueError):
    """A plan that cannot be rebuilt; `code` is stable for the UI, `runs` names the culprits."""

    def __init__(self, code: str, message: str, runs=()):  # type: ignore[no-untyped-def]
        super().__init__(message)
        self.code = code
        self.runs = sorted(runs)


def sequence_of(rows):
    """{machine: [run ids in block-start order]} of an existing schedule."""
    out: dict[str, list[str]] = {}
    for row in sorted(rows, key=lambda r: (r["machine"], r["block_start"])):
        out.setdefault(row["machine"], []).append(row["run"])
    return out


def hints_of(rows):
    """(preferred_molds, tie_rank) of an existing schedule, for rebuild()."""
    ordered = sorted(rows, key=lambda r: (r["block_start"], r["end"], r["machine"]))
    return {r["run"]: r["mold"] for r in rows if r["mold"]}, {r["run"]: i for i, r in enumerate(ordered)}


def _check_plan(data, sequence, runs_expected):
    by_id = {r["id"]: r for r in data["runs"]}
    counts = Counter(rid for ids in sequence.values() for rid in ids)
    unknown_machines = [m for m in sequence if m not in data["machines"]]
    if unknown_machines:
        raise EditError("UNKNOWN_MACHINE", f"unknown machines: {sorted(unknown_machines)}")
    unknown = [rid for rid in counts if rid not in by_id]
    if unknown:
        raise EditError("UNKNOWN_RUN", f"unknown runs: {sorted(unknown)}", unknown)
    twice = [rid for rid, n in counts.items() if n > 1]
    if twice:
        raise EditError("DUPLICATE_RUN", f"runs placed more than once: {sorted(twice)}", twice)
    missing = set(runs_expected) - set(counts)
    extra = set(counts) - set(runs_expected)
    if missing or extra:
        raise EditError("RUN_SET_CHANGED", "an edit may move runs, not add or drop them", missing | extra)
    wrong = [rid for m, ids in sequence.items() for rid in ids if m not in eligible(data, by_id[rid])]
    if wrong:
        raise EditError("NOT_ELIGIBLE", f"runs on a machine that cannot make them: {sorted(wrong)}", wrong)
    return by_id


def rebuild(data, sequence, runs_expected, not_before=None, preferred_molds=None, tie_rank=None):
    """sequence: {machine: [run ids]} covering exactly `runs_expected` (the runs of the
    edited schedule, so chosen reserve options stay chosen). not_before: {run id: minute}.
    preferred_molds: {run id: mold} kept when it is as early as any other mold.
    tie_rank: {run id: rank} breaks ties between machines starting at the same minute
    (they compete for molds and stock). Passing the edited schedule's molds and order
    makes an unedited plan rebuild into that very schedule.
    Returns engine rows; raises EditError when the plan cannot be rebuilt."""
    by_id = _check_plan(data, sequence, runs_expected)
    not_before = not_before or {}
    preferred_molds = preferred_molds or {}
    tie_rank = tie_rank or {}
    up = upstream(data)
    btp = set(btp_stages(data))
    windows = {m: calendar(data, m)[0] for m in data["machines"]}
    ends = {m: [w["end"] for w in ws] for m, ws in windows.items()}
    mach = {m: {"end": 0, "item": data["machine_initial_state"], "mold": None} for m in data["machines"]}
    molds = {k: {"used": v["initial_cycles"], "free": 0} for k, v in data.get("molds", {}).items()}
    credits = {c: [] for c in data["btp"]}
    consumed = {c: 0 for c in data["btp"]}
    finished = {p: [] for p in data["products"]}
    shipped = {p: [(o["release"], o["quantity"]) for o in data["orders"] if o["product"] == p] for p in data["products"]}

    def place(rid, mid):
        run = by_id[rid]
        q = quantity(data, run)
        code = up[run["item"]]
        lower = not_before.get(rid, 0)
        if code:
            ready = _ready_time(data["btp"][code]["initial_stock"], credits[code], consumed[code], q)
            if ready is None:
                return None
            lower = max(lower, ready)
        if run["item"] in finished:
            lower = max(lower, _cap_ready(data, run["item"], finished[run["item"]], q, shipped[run["item"]]))
        best = None
        p = duration(data, run, mid)
        for mold in molds_for(data, run["item"]) or [None]:
            st = mach[mid]
            maint, used, free = 0, 0, 0
            if mold:
                spec = data["molds"][mold]
                c = cycles(data, run, mold)
                used, free = molds[mold]["used"] + c, molds[mold]["free"]
                if used > spec["limit_cycles"]:
                    maint, used = spec["maintenance_minutes"], c
            su = cast_setup(data, mid, st["item"], st["mold"], run["item"], mold, maint > 0)
            earliest = max(st["end"], lower, free)
            length = maint + su + p
            ws = windows[mid]
            for k in range(bisect_left(ends[mid], earliest + length), len(ws)):
                w = ws[k]
                b = max(earliest, w["start"])
                if b + length <= w["end"]:
                    row = {"run": rid, "stage": run["stage"], "item": run["item"], "machine": mid,
                           "block_start": b, "start": b + maint + su, "end": b + length,
                           "setup_minutes": su, "maintenance_minutes": maint, "mold": mold,
                           "cycles_after": used if mold else 0, "window": w["id"], "shift": w["shift"]}
                    key = (row["end"], mold != preferred_molds.get(rid), mold or "")
                    if best is None or key < best[0]:
                        best = (key, row)
                    break
        return None if best is None else best[1]

    queues = {m: list(ids) for m, ids in sequence.items() if ids}
    rows = []
    while queues:
        candidates = []
        for mid, queue in queues.items():
            row = place(queue[0], mid)
            if row is not None:
                candidates.append(((row["block_start"], tie_rank.get(queue[0], len(tie_rank)), mid), mid, row))
        if not candidates:
            heads = [queue[0] for queue in queues.values()]
            raise EditError("NO_FEASIBLE_SLOT", "no run at the head of a machine queue can be placed "
                            "(stock it needs is never produced before it, or the horizon is full)", heads)
        _, mid, row = min(candidates, key=lambda c: c[0])
        run = by_id[row["run"]]
        rows.append(row)
        queues[mid].pop(0)
        if not queues[mid]:
            del queues[mid]
        mach[mid] = {"end": row["end"], "item": run["item"], "mold": row["mold"]}
        if row["mold"]:
            molds[row["mold"]] = {"used": row["cycles_after"], "free": row["end"]}
        q = quantity(data, run)
        if run["stage"] in btp:
            insort(credits[run["item"]], (row["end"] + data["transfer_minutes"][run["stage"]], q))
        if up[run["item"]]:
            consumed[up[run["item"]]] += q
        if run["item"] in finished:
            finished[run["item"]].append((row["end"], q))
    return rows


def apply_edits(data, base_rows, sequence, moved=(), not_before=None, compact=False):
    """Rebuild `base_rows` after the planner's edits, disturbing as little as possible.

    Unless `compact`, every run the planner did not move keeps its old start as a lower
    bound (right-shift repair, as in APS tools): runs only slide later when an edit
    pushes them, nothing else is reshuffled. `moved` runs go as early as their new place
    allows; `not_before` (planner's earliest starts) overrides both. With `compact` the
    whole sequence is left-shifted instead."""
    anchors = {} if compact else {r["run"]: r["block_start"] for r in base_rows if r["run"] not in set(moved)}
    anchors.update(not_before or {})
    molds, rank = hints_of(base_rows)
    return rebuild(data, sequence, [r["run"] for r in base_rows], anchors, molds, rank)


ISSUE_PATTERNS = (
    (r"^(?P<subject>\S+): above stock_cap at checkpoint (?P<minute>\d+)", "STOCK_CAP"),
    (r"^BTP (?P<subject>\S+) negative at t=(?P<minute>\d+)", "BTP_SHORT"),
    (r"^BTP (?P<subject>\S+) above capacity at t=(?P<minute>\d+)", "BTP_CAPACITY"),
    (r"^(?P<subject>\S+): negative finished stock at t=(?P<minute>\d+)", "FINISHED_SHORT"),
    (r"^(?P<subject>\S+): outside horizon", "HORIZON"),
)


def issues_of(errors):
    """Validator messages -> {code, subject, minute, raw} the UI can phrase for a planner."""
    out = []
    for raw in errors:
        for pattern, code in ISSUE_PATTERNS:
            match = re.match(pattern, raw)
            if match:
                minute = match.groupdict().get("minute")
                out.append({"code": code, "subject": match["subject"], "minute": int(minute) if minute else None, "raw": raw})
                break
        else:
            out.append({"code": "OTHER", "subject": None, "minute": None, "raw": raw})
    return out


def repair(data, rows, fixed, seconds=30.0, seed=11, workers=1):
    """Re-optimise around the planner (large neighbourhood search, as cp_lns): start from
    `rows` (an edited, valid schedule); each round CP-SAT may re-sequence one neighbourhood
    -- a time window, two machines, a stage or a random set -- of the runs *not* in
    `fixed`, everything else held where it is. Pinned runs keep machine, mold and times
    exactly; the solver may still add build-ahead (reserve) runs in free capacity. The
    edit is the starting incumbent, so the result is never worse than what the planner had.
    A shift-consolidation pass over the unpinned runs (compact) comes first: it is cheap
    and often all a hand edit needs.

    Twins (interchangeable runs) are relabelled by block start, as the solver's symmetry
    breaking expects; pins therefore follow their *blocks* (stage, item, machine, start),
    not run ids, through every relabel."""
    import random
    import time

    from .compact import compact
    from .cp_engine import solve
    from .evaluate import evaluate, validate
    from .experiment import _neighbourhood
    from .instance import canonical

    started = time.perf_counter()
    block = lambda r: (r["stage"], r["item"], r["machine"], r["block_start"])  # noqa: E731
    pinned_blocks = {block(r) for r in rows if r["run"] in set(fixed)}
    incumbent = canonical(data, rows)
    initial = best = evaluate(data, incumbent)[0]["objective"]
    rng = random.Random(seed)
    kinds = ["time", "machine", "stage", "random"]
    history = [{"seconds": time.perf_counter() - started, "objective": initial, "source": "manual edit"}]
    # Cheap first: let unpinned runs wait for an already-open shift (same machine order), then LNS.
    frozen = {r["run"] for r in incumbent if block(r) in pinned_blocks}
    packed = compact(data, incumbent, seconds=min(10.0, seconds / 4), frozen=frozen)
    value = evaluate(data, packed)[0]["objective"]
    if value < best and validate(data, packed)["valid"]:
        incumbent, best = canonical(data, packed), value
        history.append({"seconds": time.perf_counter() - started, "objective": value, "source": "shift consolidation"})
    iterations = []
    while not iterations or seconds - (time.perf_counter() - started) > 2:
        pinned = {r["run"] for r in incumbent if block(r) in pinned_blocks}
        kind = kinds[len(iterations) % len(kinds)]
        released = _neighbourhood(data, incumbent, rng, kind) - pinned
        if not released:
            iterations.append({"neighbourhood": kind, "released_runs": [], "status": "NOTHING_FREE"})
            if len(iterations) > 20 and all(it["status"] == "NOTHING_FREE" for it in iterations):
                break  # everything is pinned: nothing to optimise
            continue
        hold = {r["run"] for r in incumbent} - released
        remaining = max(0.5, seconds - (time.perf_counter() - started))
        out, meta = solve(data, seconds=min(10.0, remaining), seed=seed + len(iterations), hint=incumbent, fixed_runs=hold, workers=workers)
        iterations.append({"neighbourhood": kind, "released_runs": len(released), "status": meta["status"],
                           "solve_seconds": meta.get("solve_seconds")})
        if not out:
            continue
        check = validate(data, out)
        if not check["valid"]:
            raise ValueError(check)
        value = evaluate(data, out)[0]["objective"]
        if abs(value - meta["solver_objective"]) > .01:
            raise ValueError("repair objective disagrees with the independent evaluator")
        if value < best:
            incumbent, best = canonical(data, out), value
            history.append({"seconds": time.perf_counter() - started, "objective": value, "iteration": len(iterations), "neighbourhood": kind})
    return incumbent, {
        "status": "REPAIR_IMPROVED" if best < initial else "REPAIR_KEPT_EDIT",
        "history": history, "iterations": iterations, "bound": None,
        "bound_scope": "none; neighbourhood bounds are not global",
        "initial_hint_objective": initial, "hint_source": "manual edit",
        "fixed_runs": len(pinned_blocks), "workers": workers,
    }
