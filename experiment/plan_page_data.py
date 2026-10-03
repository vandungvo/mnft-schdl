"""Extract page data for scheduling-plan.html from one models/run_all comparison run.

    python experiment/plan_page_data.py <comparison_dir> <out.json>

For every method: the best valid seed (rows, shifts, deliveries, KPI -- same
layout as the page's DATA entries) plus a `speed` record over all seeds
(wall time, time to first valid schedule, time to best, improvement history).
Also writes `_input`: the planner-facing summary of the input (orders, stock,
calendar) so the page can render the "Tình huống" section from data.
"""
from __future__ import annotations

import csv
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("prepare", ROOT / "dataset" / "wheel-factory-small" / "prepare.py")
prepare = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(prepare)
KEYS = {"fifo": "fifo", "edd": "edd", "spt": "spt", "simulated_annealing": "sa", "genetic_algorithm": "ga",
        "cp_sat": "cpsat", "cp_sat_hint": "cpsathint", "cp_lns": "cplns",
        "cp_sat_long": "cpsatlong", "cp_rolling": "cprolling"}
KPI = ["makespan", "weighted_tardiness", "setup_minutes", "idle_minutes", "maintenance_minutes", "nonproductive_minutes",
       "safety_shortfall", "reserve_units", "surplus_holding", "btp_end_units", "objective", "objective_tier1", "objective_tier2"]


def read_csv(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def history(result):
    """[(seconds, objective)] on one clock (seconds since the method started).
    CP-SAT+hint logs solver times from solve start and the hint entry at the end;
    shift them by the time spent before the solve so all methods share one axis."""
    h = result.get("history") or []
    if result["method"] == "cp_sat_hint" and h:
        before = max(0.0, result["algorithm_seconds"] - result.get("build_seconds", 0) - result.get("solve_seconds", 0))
        offset = before + result.get("build_seconds", 0)
        out = [(round(before, 3), h[0]["objective"])]
        out += [(round(offset + e["seconds"], 3), e["objective"]) for e in h[1:]]
    else:
        out = [(round(e["seconds"], 3), e["objective"]) for e in h]
    out.sort()
    best, mono = float("inf"), []
    for t, v in out:  # keep only improvements: the curve is "best found so far"
        if v < best:
            best = v
            mono.append([t, int(v)])
    return mono


def shift_window(data, sid):
    day, name = sid.split("_")
    w = data["shift_template"][name]
    base = (int(day[1:]) - 1) * 1440
    return base + w["start"], base + w["end"]


def entry(data, folder, result):
    m = result["metrics"]
    rows = [[r["run"], r["machine"], r["block_start"], r["maintenance_minutes"], r["setup_minutes"], r["start"], r["end"], r["mold"]]
            for r in json.loads((folder / "schedule.json").read_text(encoding="utf-8"))]
    rows.sort(key=lambda r: (r[2], r[1]))
    active = []
    for s in read_csv(folder / "shifts.csv"):
        a, z = shift_window(data, s["shift"])
        load = int(float(s["processing"]) + float(s["setup"]) + float(s["maintenance"]))
        active.append([s["machine"], a, z, int(float(s["available"])), load])
    active.sort(key=lambda a: (a[0], a[1]))
    deliveries = [{"order": d["order"], "time": int(d["time"]), "due": int(d["due"]), "tardiness": int(d["tardiness"]),
                   "priority": int(d["priority"])} for d in read_csv(folder / "deliveries.csv")]
    return {"rows": rows, "options": m.get("reserve_options_chosen", []), "kpi": {k: m[k] for k in KPI},
            "deliveries": deliveries, "active": active, "btp_end": m["btp_end"], "fin_end": m["end_inventory"],
            "maint": m["maintenance_count"], "late": m["late_orders"], "status": result["status"]}


def input_summary(data):
    mandatory = [r for r in data["runs"] if "reserve_option" not in r]
    lots = {r["id"]: r["item"] for r in data["runs"] if r["stage"] == data["stages"][-1] and "reserve_option" not in r}
    lot_order = {}
    for o in data["orders"]:
        for lot in o["lot_allocations"]:
            lot_order.setdefault(lot, []).append(o["id"])
    groups = {}
    for r in data["runs"]:
        if "reserve_option" in r:
            groups.setdefault(r["reserve_option"], []).append(r["stage"])
    return {
        "name": data.get("name"), "origin": data.get("origin"), "horizon": data["horizon"],
        "checkpoints": len(data["checkpoints"]), "runs": len(data["runs"]),
        "mandatory_runs": sum("reserve_option" not in r for r in data["runs"]),
        "stage_runs": {s: sum(r["stage"] == s for r in data["runs"] if "reserve_option" not in r) for s in data["stages"]},
        "orders": [{"id": o["id"], "product": o["product"], "quantity": o["quantity"], "stock": o["initial_allocated"],
                    "due": o["due"], "priority": o["priority"], "lots": list(o["lot_allocations"])} for o in data["orders"]],
        "lots": {lot: [item, ", ".join(lot_order.get(lot, []))] for lot, item in lots.items()},
        "products": {p: {k: s[k] for k in ("initial_stock", "safety_stock", "stock_cap")} for p, s in data["products"].items()},
        "btp": {c: s["initial_stock"] for c, s in data["btp"].items()},
        "run_size": data["run_size"], "transfer": data["transfer_minutes"],
        "downtime": {m: s["downtime"] for m, s in data["machines"].items() if s.get("downtime")},
        "molds": {k: {"item": v["item"], "limit": v["limit_cycles"], "used": v["initial_cycles"]} for k, v in data.get("molds", {}).items()},
        "long_term": data.get("long_term_orders", []),
        "reserve": {o: {"for": spec["pull_ahead_for"], "stages": groups.get(o, [])} for o, spec in data.get("reserve_options", {}).items()},
        "weights": data["weights"], "tiers": data.get("objective_tiers", {}),
        "btp_end_mandatory": sum(prepare.end_stock(data, mandatory).values()),
        "load": {label: {st: round(n / h, 3) for st, (n, h) in prepare.stage_load(data, subset).items()}
                 for label, subset in (("mandatory", mandatory), ("all", data["runs"]))},
    }


def main(comparison, out):
    comparison = Path(comparison)
    root = comparison.parents[1]
    data = json.loads((comparison / "input.json").read_text(encoding="utf-8"))
    config = json.loads((comparison / "config.json").read_text(encoding="utf-8"))
    results = json.loads((comparison / "results.json").read_text(encoding="utf-8"))
    by_method = {}
    for r in results:
        by_method.setdefault(r["method"], []).append(r)
    page = {"_run": {"run_id": config["run_id"], "seconds": config["seconds"], "seeds": config["seeds"]},
            "_weights": data["weights"], "_checkpoints": len(data["checkpoints"]),
            "_tiers": data.get("objective_tiers", {}), "_input": input_summary(data), "_speed": {}}
    for method, runs in by_method.items():
        key = KEYS[method]
        valid = [r for r in runs if r["validation"]["valid"]]
        speed = []
        for r in runs:
            h = history(r) if r["validation"]["valid"] else []
            final = r["metrics"]["objective"] if r["validation"]["valid"] else None
            speed.append({"seed": r["seed"], "status": r["status"], "valid": r["validation"]["valid"],
                          "seconds": round(r["algorithm_seconds"], 3), "build": round(r.get("build_seconds", 0) or 0, 3),
                          "objective": final, "first": h[0][0] if h else (round(r["algorithm_seconds"], 3) if final is not None else None),
                          "best_at": h[-1][0] if h else (round(r["algorithm_seconds"], 3) if final is not None else None),
                          "evaluations": r.get("evaluations"), "history": h})
        page["_speed"][key] = speed
        if not valid:
            page[key] = {"missing": True, "status": runs[0]["status"]}
            continue
        best = min(valid, key=lambda r: r["metrics"]["objective"])
        folder = root / best["method"] / "results" / config["run_id"] / f"seed_{best['seed']}"
        e = entry(data, folder, best)
        e.update(seed=best["seed"], seeds=len(runs), valid_runs=len(valid), seconds=config["seconds"],
                 all_objectives=sorted(r["metrics"]["objective"] for r in valid))
        if best.get("windows"):
            e["windows"] = best["windows"]
            e["window_params"] = {k: best.get(k) for k in ("step_days", "lookahead_days", "max_runs", "reserve_days")}
        page[key] = e
    Path(out).write_text(json.dumps(page, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("OK", out, {k: ("missing" if v.get("missing") else v["kpi"]["objective"]) for k, v in page.items() if not k.startswith("_")})


if __name__ == "__main__":
    main(*sys.argv[1:3])
