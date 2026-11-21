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


# hybrid: share of the budget for the SA portfolio, and its ceiling in seconds. On the 2-week
# instance the portfolio reaches the best service level within 25-75 s and then gains little
# (cost 97k after 73 s, 96k after 180 s), while CP-SAT keeps cutting cost, so long budgets go to CP-SAT.
SA_SHARE, SA_CAP = .4, 90.0


def auto_workers():
    """CP-SAT workers when none are asked for: half the logical cores, at least 2.
    On the 2-week instance 8 workers beat 16 on an 8-core/16-thread machine in every
    pairing tried (the model is large and the two threads of a core compete); at least 2
    because a single worker has no LNS, which is what improves a hinted schedule."""
    cores = os.cpu_count() or 1
    return 1 if cores == 1 else max(2, cores // 2)


def hybrid(data, seconds, seed, workers=None, sa_processes=None):
    """Rules -> SA portfolio -> CP-SAT started from the best schedule so far.

    Why this order (measured on dataset/wheel-factory-2weeks, 269 runs):
      * monolithic CP-SAT finds no schedule at all in hours, and started from a dispatch
        rule it barely moves the service level in minutes; SA brings late orders down
        within a minute but hardly reduces operating cost;
      * CP-SAT started from the SA schedule keeps that service level and cuts operating
        cost (its LNS workers re-pack runs into fewer shifts).
    1. FIFO/EDD/SPT: a valid schedule in well under a second, the fallback.
    2. SA with one process per seed for SA_SHARE of the budget (at most SA_CAP seconds).
    3. CP-SAT with every variable hinted from the best schedule, for the time left.
    Each step keeps the previous result unless it is beaten, so the outcome is never worse
    than the best dispatch rule. workers: CP-SAT workers, default MNFT_CP_WORKERS or
    auto_workers() (this method is about using the machine, not about a single-thread
    comparison); sa_processes: SA seeds run in parallel, default one per worker, at most 8."""
    from .cp_engine import solve
    from .search import portfolio
    started = time.perf_counter()
    elapsed = lambda: time.perf_counter() - started  # noqa: E731
    workers = workers or int(os.environ.get("MNFT_CP_WORKERS", "0")) or auto_workers()
    sa_processes = sa_processes or min(8, workers)
    best, best_value, source = None, float("inf"), None

    def offer(rows, label):
        nonlocal best, best_value, source
        if rows is None or not validate(data, rows)["valid"]:
            return None
        value = evaluate(data, rows)[0]["objective"]
        if value < best_value:
            best, best_value, source = canonical(data, rows), value, label
        return value

    phases, history = [], []
    for rule in ("fifo", "edd", "spt"):
        offer(decode(data, rule), rule.upper())
    phases.append({"phase": "rules", "until_seconds": elapsed(), "objective": best_value if best else None, "source": source})
    if best:
        history.append({"seconds": elapsed(), "objective": best_value, "source": source})

    sa_seconds = min(SA_CAP, max(seconds * SA_SHARE, min(5.0, seconds * .6)))
    seeds = [seed + 1000 * k for k in range(sa_processes)]
    search_started = elapsed()
    tried, trail = [], []
    for s, (rows, meta) in zip(seeds, portfolio(data, sa_seconds, seeds)):
        before = best_value
        value = offer(rows, f"SA seed {s}")
        tried.append({"seed": s, "objective": value, "evaluations": meta.get("evaluations")})
        if value is not None and value < before:  # the convergence curve shown is the winning seed's
            trail = [{**h, "seconds": search_started + h["seconds"], "source": f"SA seed {s}"} for h in meta["history"]]
    floor = history[-1]["objective"] if history else float("inf")
    history += [h for h in trail if h["objective"] < floor]
    phases.append({"phase": "search", "until_seconds": elapsed(), "objective": best_value if best else None,
                   "budget_seconds": sa_seconds, "processes": len(seeds), "seeds": tried})
    if best is None:
        return None, {"status": "NO_SOLUTION_FOUND", "history": [], "bound": None, "phases": phases}
    if not history or history[-1]["objective"] > best_value:
        history.append({"seconds": elapsed(), "objective": best_value, "source": source})

    meta = {"status": "HEURISTIC_FEASIBLE", "bound": None, "bound_scope": "none; CP-SAT step did not run"}
    rows, start_value, start_source = best, best_value, source
    remaining = seconds - elapsed()
    if remaining > 2:
        cp_started = elapsed()
        solved, meta = solve(data, seconds=remaining, seed=seed, hint=best, workers=workers)
        meta["solver_status"] = meta["status"]
        value = offer(solved, "CP-SAT")
        if value is not None and value <= start_value:  # equal counts: CP-SAT may have proved it optimal
            rows = solved
            history += [{**h, "seconds": cp_started + h["seconds"], "source": "CP-SAT"}
                        for h in meta.pop("history") if h["objective"] < start_value]
        else:  # nothing better within the time left: keep the search result
            meta["status"] = "HEURISTIC_FEASIBLE"
            meta.pop("solver_objective", None)
            meta.pop("history", None)
        phases.append({"phase": "cp_sat", "until_seconds": elapsed(), "objective": best_value,
                       "budget_seconds": remaining, "workers": workers, "solver_status": meta["solver_status"]})
    meta.update({"history": history, "phases": phases, "workers": workers, "sa_processes": len(seeds),
                 "hint_source": start_source, "initial_hint_objective": start_value})
    return rows, meta


def execute(data, method, seconds, seed, workers=None):
    """workers: CP-SAT search workers; default MNFT_CP_WORKERS or 1 (fair single-thread comparison;
    `hybrid` defaults to auto_workers() instead).
    MNFT_PATIENCE (seconds): SA/GA/CP-LNS stop after this long without improvement;
    `seconds` then acts as a safety cap. Unset = run the whole budget (default)."""
    started = time.perf_counter()
    if method == "hybrid":
        return hybrid(data, seconds, seed, workers)
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
