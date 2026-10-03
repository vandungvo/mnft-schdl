"""Method dispatch for schema 5 -- mirrors models/common/experiment.execute().

Called from models.common.experiment.execute() when the input has
schema_version 5, so every run_one/run_all artifact path stays the same.
"""
from __future__ import annotations

import os
import random
import time
from .compact import compact
from .decoder import decode
from .evaluate import evaluate, validate
from .instance import canonical


def heuristic_start(data, seconds=6.0):
    """Best dispatch-rule schedule after shift consolidation -- the incumbent/hint
    for CP-SAT+hint and CP-LNS. Returns (rows, objective, rule)."""
    best = (None, float("inf"), None)
    for rule in ("fifo", "edd", "spt"):
        rows = decode(data, rule)
        if rows is None:
            continue
        rows = compact(data, rows, seconds=seconds / 3)
        if not validate(data, rows)["valid"]:
            continue
        value = evaluate(data, rows)[0]["objective"]
        if value < best[1]:
            best = (canonical(data, rows), value, rule)
    return best


def _neighbourhood(data, incumbent, rng, kind):
    ids = [r["id"] for r in data["runs"]]
    if kind == "time":  # everything touching a random 8-16 h window: lets whole shifts empty out
        start = rng.randrange(0, data["horizon"] - 480, 60)
        length = rng.choice([480, 720, 960])
        return {r["run"] for r in incumbent if r["block_start"] < start + length and r["end"] > start}
    if kind == "machine":
        machines = rng.sample(list(data["machines"]), 2)
        return {r["run"] for r in incumbent if r["machine"] in machines}
    if kind == "stage":
        stage = rng.choice(data["stages"])
        return {r["id"] for r in data["runs"] if r["stage"] == stage}
    return set(rng.sample(ids, max(4, len(ids) // 5)))


def execute(data, method, seconds, seed, workers=None):
    """workers: CP-SAT search workers; default MNFT_CP_WORKERS or 1 (fair single-thread comparison).
    MNFT_PATIENCE (seconds): SA/GA/CP-LNS stop after this long without improvement;
    `seconds` then acts as a safety cap. Unset = run the whole budget (default)."""
    started = time.perf_counter()
    workers = workers or int(os.environ.get("MNFT_CP_WORKERS", "1"))
    patience = float(os.environ["MNFT_PATIENCE"]) if os.environ.get("MNFT_PATIENCE") else None
    if method in ("fifo", "edd", "spt"):
        rows = decode(data, rule=method)
        return rows, {"status": "HEURISTIC_FEASIBLE" if rows else "NO_SOLUTION_FOUND", "bound": None, "history": []}
    if method in ("simulated_annealing", "genetic_algorithm"):
        from .search import optimize
        return optimize(data, "sa" if method == "simulated_annealing" else "ga", seconds, seed, patience)
    if method == "cp_rolling":
        from .rolling import solve_rolling
        return solve_rolling(data, seconds=seconds, seed=seed, workers=workers)
    from .cp_engine import solve
    if method == "cp_sat":
        rows, meta = solve(data, seconds=seconds, seed=seed, workers=workers)
        meta["workers"] = workers
        return rows, meta
    incumbent, initial, rule = heuristic_start(data)
    if incumbent is None:
        return None, {"status": "NO_SOLUTION_FOUND", "history": [], "bound": None}
    source = f"{rule.upper()} + dồn ca"
    if method == "cp_sat_hint":
        rows, meta = solve(data, seconds=max(.01, seconds - (time.perf_counter() - started)), seed=seed,
                           hint=incumbent, workers=workers)
        meta["solver_status"] = meta["status"]
        meta["initial_hint_objective"] = initial
        meta["hint_source"] = source
        meta["workers"] = workers
        if rows is None or evaluate(data, rows)[0]["objective"] > initial:
            rows = incumbent
            meta["status"] = "HEURISTIC_FALLBACK"
            meta.pop("solver_objective", None)
        meta["history"].insert(0, {"seconds": time.perf_counter() - started, "objective": initial, "source": source})
        return rows, meta
    if method != "cp_lns":
        raise ValueError(f"unknown method {method}")
    rng = random.Random(seed)
    best = initial
    history = [{"seconds": time.perf_counter() - started, "objective": best, "source": source}]
    iterations = []
    kinds = ["time", "machine", "stage", "random"]
    last_gain = time.perf_counter() - started
    stop = "budget"
    while seconds - (time.perf_counter() - started) > 3:
        if patience is not None and time.perf_counter() - started - last_gain >= patience:
            stop = "no_improvement"
            break
        kind = kinds[len(iterations) % len(kinds)]
        released = _neighbourhood(data, incumbent, rng, kind)
        fixed = {r["run"] for r in incumbent} - released
        rows, meta = solve(data, seconds=min(10, seconds - (time.perf_counter() - started)),
                           seed=seed + len(iterations), hint=incumbent, fixed_runs=fixed, workers=workers)
        iterations.append({"neighbourhood": kind, "released_runs": sorted(released), "status": meta["status"],
                           "build_seconds": meta["build_seconds"], "solve_seconds": meta["solve_seconds"]})
        if rows:
            check = validate(data, rows)
            if not check["valid"]:
                raise ValueError(check)
            value = evaluate(data, rows)[0]["objective"]
            if abs(value - meta["solver_objective"]) > .01:
                raise ValueError("LNS objective disagrees with independent evaluator")
            if value < best:
                incumbent, best = canonical(data, rows), value
                last_gain = time.perf_counter() - started
                history.append({"seconds": time.perf_counter() - started, "objective": value,
                                "iteration": len(iterations), "neighbourhood": kind})
    return incumbent, {"status": "HEURISTIC_FEASIBLE", "history": history, "iterations": iterations, "bound": None,
                       "bound_scope": "none; neighborhood bounds are not global", "initial_hint_objective": initial,
                       "hint_source": source, "workers": workers, "patience_seconds": patience, "stop_reason": stop}
