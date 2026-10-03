"""Rolling-horizon CP-SAT for schema 5: solve the plan window by window.

Why: the monolithic CP-SAT model grows with every run x machine x shift and every
pair of runs on a machine; on the 2-week instance (269 runs) one worker finds no
schedule at all in 120 s, while on a 3-day instance (42 runs) it gets within
0.01% of its bound in seconds. So cut the horizon into windows of that size.

Each window k starts at T_k (a day boundary) and is a smaller schema-5 instance:
  * runs: the `max_runs` most urgent not-yet-committed mandatory runs by need
    date (see need_dates), plus, in the last days, the open reserve options;
    the window must finish them before T_k + lookahead (its horizon);
  * state at T_k folded into the input: all machines are down before T_k; BTP and
    finished stock = opening stock + committed production - committed use and
    shipped orders; mold cycle counters; each machine's setup row after its last
    committed run (cast machines assume a mold change: an upper bound, fixed
    exactly after stitching); only checkpoints after T_k.
A reserve option with any run committed becomes mandatory from then on, so it
stays all-or-nothing. The window is solved by CP-SAT hinted with its own EDD schedule (kept if CP-SAT
does not beat it). Runs that finish -- including transfer time -- before
T_{k+1} = T_k + step are committed; the rest go back into the pool. The last window
takes everything left. Committed rows are stitched and every setup is recomputed
from the real predecessor, so the result passes the full-instance validator.

Trade-off: a window cannot see orders beyond its lookahead, so the result is not
globally optimal; the lookahead (default 4 days, step 2 days) limits that myopia.
"""
from __future__ import annotations

import copy
import math
import time

from .cp_engine import solve
from .decoder import decode
from .evaluate import evaluate, validate
from .instance import btp_stages, calendar, cast_setup, last_stage, quantity, reserve_groups, upstream

DAY = 1440


def need_dates(data):
    """Run id -> the time its output is first needed. QC lots take their order's due
    date; upstream runs inherit, in declaration order, the need date of the
    downstream demand they are the first to cover after opening stock. Reserve
    runs: never (they are optional)."""
    runs, up = data["runs"], upstream(data)
    lot_due = {lid: o["due"] for o in data["orders"] for lid in o["lot_allocations"]}
    need = {r["id"]: lot_due.get(r["id"], math.inf) for r in runs if r["stage"] == last_stage(data)}
    for stage in reversed(btp_stages(data)):
        for code in sorted({r["item"] for r in runs if r["stage"] == stage}):
            consumers = [r for r in runs if up[r["item"]] == code and "reserve_option" not in r]
            demand = sorted((need[r["id"]], quantity(data, r)) for r in consumers)
            producers = [r for r in runs if r["item"] == code and "reserve_option" not in r]
            covered, k = data["btp"][code]["initial_stock"], 0
            for when, q in demand:
                covered -= q
                while covered < 0 and k < len(producers):
                    need[producers[k]["id"]] = when
                    covered += quantity(data, producers[k])
                    k += 1
            for r in producers[k:]:
                need[r["id"]] = math.inf
    for r in runs:
        if "reserve_option" in r:
            need[r["id"]] = math.inf
    return need


def _window(data, committed, open_ids, forced, start, end=None):
    """The schema-5 instance of one window (see module docstring). Runs of a
    `forced` reserve option (partly committed already) become mandatory."""
    runs = {r["id"]: r for r in data["runs"]}
    up = upstream(data)
    sub = copy.deepcopy(data)
    sub["runs"] = []
    for i in sorted(open_ids, key=lambda i: [r["id"] for r in data["runs"]].index(i)):
        r = copy.deepcopy(runs[i])
        if r.get("reserve_option") in forced:
            del r["reserve_option"]
        sub["runs"].append(r)
    if end is not None:  # the window must finish its own work: no pushing it past the window
        sub["horizon"] = end
    sub["checkpoints"] = [c for c in data["checkpoints"] if start < c <= sub["horizon"]]
    for spec in sub["machines"].values():
        spec["downtime"] = sorted(spec.get("downtime", []) + ([[0, start]] if start else []))
    btp = {c: v["initial_stock"] for c, v in data["btp"].items()}
    fin = {p: s["initial_stock"] for p, s in data["products"].items()}
    for r in committed.values():
        run, q = runs[r["run"]], quantity(data, runs[r["run"]])
        if run["stage"] in btp_stages(data):
            btp[run["item"]] += q
        else:
            fin[run["item"]] += q
        if up[run["item"]]:
            btp[up[run["item"]]] -= q
    orders = []
    for o in data["orders"]:
        left = {lid: q for lid, q in o["lot_allocations"].items() if lid not in committed}
        if not left and o["release"] <= start:
            fin[o["product"]] -= o["quantity"]  # all lots made, picked up before the window
            continue
        if any(lid not in open_ids for lid in left) or o["release"] > sub["horizon"]:
            continue  # its lots belong to a later window, or it is picked up after this one
        orders.append({**o, "lot_allocations": left, "initial_allocated": o["quantity"] - sum(left.values())})
    sub["orders"] = orders
    for c, v in btp.items():
        sub["btp"][c]["initial_stock"] = v
    for p, v in fin.items():
        sub["products"][p]["initial_stock"] = v
        sub["products"][p]["stock_cap"] = max(sub["products"][p]["stock_cap"], v)
    for mold, spec in sub.get("molds", {}).items():
        mine = [r for r in committed.values() if r["mold"] == mold]
        if mine:
            spec["initial_cycles"] = max(mine, key=lambda r: r["end"])["cycles_after"]
    init = data["machine_initial_state"]
    for mid, spec in sub["machines"].items():
        mine = [r for r in committed.values() if r["machine"] == mid]
        if not mine:
            continue
        last = max(mine, key=lambda r: r["end"])
        row = dict(spec["setup"][runs[last["run"]]["item"]])
        if last["mold"] is not None:  # the next mold is unknown here: assume a change
            row = {item: max(v, spec.get("mold_change_minutes", 0)) for item, v in row.items()}
        spec["setup"][init] = row
    keep = {r["id"] for r in sub["runs"]}
    sub["reserve_options"] = {o: v for o, v in data.get("reserve_options", {}).items()
                              if o not in forced and any(i in keep for i in reserve_groups(data)[o])}
    return sub


def _fix_setups(data, rows):
    """Recompute every setup from the real predecessor on its machine; the window
    instances only over-estimate it, so the block can only start later."""
    runs = {r["id"]: r for r in data["runs"]}
    out = []
    for mid in data["machines"]:
        wins = calendar(data, mid)[0]  # window ids differ in the window instances
        prev_item, prev_mold = data["machine_initial_state"], None
        for r in sorted((r for r in rows if r["machine"] == mid), key=lambda r: r["block_start"]):
            item = runs[r["run"]]["item"]
            su = cast_setup(data, mid, prev_item, prev_mold, item, r["mold"], r["maintenance_minutes"] > 0)
            assert su <= r["setup_minutes"], (r["run"], su, r["setup_minutes"])
            b = r["start"] - r["maintenance_minutes"] - su
            w = next(w for w in wins if w["start"] <= b and r["end"] <= w["end"])
            out.append({**r, "setup_minutes": su, "block_start": b, "window": w["id"], "shift": w["shift"]})
            prev_item, prev_mold = item, r["mold"]
    return out


def solve_rolling(data, seconds=120, seed=11, workers=1, step_days=2, lookahead_days=4, max_runs=60, reserve_days=4):
    """max_runs: at most this many mandatory runs per window (in guide order), so every
    window stays a size CP-SAT handles (the 3-day instance has 42 runs; 60 tested best on the
    2-week one against 40-90)."""
    started = time.perf_counter()
    runs = {r["id"]: r for r in data["runs"]}
    need = need_dates(data)
    groups = reserve_groups(data)
    committed, forced, windows, history = {}, set(), [], []
    starts = list(range(0, data["horizon"], step_days * DAY))
    for k, start in enumerate(starts):
        final = k == len(starts) - 1
        cutoff = math.inf if final else start + lookahead_days * DAY
        # the most urgent open work first (stage order breaks ties: upstream before downstream)
        stage_rank = {st: n for n, st in enumerate(data["stages"])}
        # QC lots wait for the window their order is picked up in: packed earlier they
        # would only sit in the finished-goods warehouse (and can overflow stock_cap)
        mandatory = sorted((i for i, r in runs.items() if "reserve_option" not in r and i not in committed
                            and (final or r["stage"] != last_stage(data) or need[i] <= cutoff)),
                           key=lambda i: (need[i], stage_rank[runs[i]["stage"]], i))
        if not final:
            mandatory = mandatory[:max_runs]
        mandatory += [i for o in forced for i in groups[o] if i not in committed]
        # pull-ahead work is for weeks 3-4: offer it only in the windows near the end
        late = start >= data["horizon"] - reserve_days * DAY
        reserve = [i for o, ids in groups.items() if o not in forced for i in ids] if late else []
        open_ids = set(mandatory) | set(reserve)
        if not mandatory and not final:
            windows.append({"start": start, "runs": 0, "status": "EMPTY", "seconds": 0, "committed": 0})
            continue
        t0 = time.perf_counter()
        left = seconds - (t0 - started)
        budget = max(1.0, left / (len(starts) - k))
        sub = _window(data, committed, open_ids, forced, start, None if final else min(data["horizon"], cutoff))
        hint = decode(sub, "edd")
        if hint is None:  # the window's share does not fit before its end: let it run on
            sub = _window(data, committed, open_ids, forced, start)
            hint = decode(sub, "edd")
        if hint is None:
            raise RuntimeError(f"window at day {start // DAY + 1}: no EDD schedule to start from")
        score = lambda rows: evaluate(sub, rows)[0]["objective"] if rows else math.inf  # noqa: E731
        base = score(hint)  # an empty window (only optional reserve work left) has no EDD schedule
        rows, meta = solve(sub, seconds=budget, seed=seed + k, hint=hint, workers=workers)
        status = meta["status"]
        if not rows or score(rows) > base:
            rows, status = hint, f"{status}->EDD"
        check = validate(sub, rows)
        if not check["valid"]:
            raise RuntimeError(f"window at day {start // DAY + 1}: invalid schedule {check['errors'][:3]}")
        commit_until = math.inf if final else start + step_days * DAY
        n = 0
        for r in rows:
            run = runs[r["run"]]
            ready = r["end"] + (data["transfer_minutes"][run["stage"]] if run["stage"] in btp_stages(data) else 0)
            if ready <= commit_until:
                committed[r["run"]] = r
                n += 1
                if "reserve_option" in run:  # all-or-nothing: the rest of the option is now due
                    forced.add(run["reserve_option"])
        windows.append({"start": start, "cutoff": None if final else cutoff, "runs": len(sub["runs"]),
                        "status": status, "seconds": round(time.perf_counter() - t0, 2),
                        "build_seconds": round(meta.get("build_seconds", 0), 2), "committed": n})

    rows = _fix_setups(data, list(committed.values()))
    value = evaluate(data, rows)[0]["objective"]
    history.append({"seconds": time.perf_counter() - started, "objective": value})
    return rows, {"status": "HEURISTIC_FEASIBLE", "history": history, "bound": None,
                  "bound_scope": "none; windows are solved separately", "windows": windows, "workers": workers,
                  "step_days": step_days, "lookahead_days": lookahead_days, "max_runs": max_runs, "reserve_days": reserve_days}
