"""Long run: let every method go until it is done, not until a fixed budget.

    python -m models.run_long --input <model_input.json> [--patience 600] [--cap 7200]
                              [--cp-hours 8] [--cp-workers 8] [--seeds 11 29 47]

1. FIFO/EDD/SPT once (one pass, nothing to run longer).
2. SA, GA, CP-LNS, CP rolling per seed, 1 worker, sequential: stop after `--patience` seconds
   without a better schedule (MNFT_PATIENCE), `--cap` seconds as a safety cap.
3. CP-SAT with `--cp-workers` workers, hinted with the best schedule from step 1-2,
   until it proves OPTIMAL or `--cp-hours` pass. Its history keeps the lower bound,
   so the gap to optimal is known at every point.
4. Optional (`--cold-hours` > 0): CP-SAT with no hint at all (method `cp_sat_cold_long`),
   same workers, until OPTIMAL or `--cold-hours` pass.

Heuristic runs are saved by the usual run_one (runs/v2/<method>/results/<run_id>/);
the CP-SAT run as method `cp_sat_long`. The comparison folder has the same layout as
run_all (input.json, config.json, results.json, REPORT.md), so
experiment/plan_page_data.py reads it unchanged.
"""
import argparse
import json
import os
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import ortools

from models.common.experiment import _engine, run_one, runs_root, write_csv
from models.common.instance import digest, load, save_json


def cp_long(data, run_id, start_rows, start_method, hours, workers, seed=11, method="cp_sat_long"):
    from models.common.stage_runs.cp_engine import solve
    out = runs_root(data) / method / "results" / run_id / f"seed_{seed}"
    out.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    rows, meta = solve(data, seconds=hours * 3600, seed=seed, hint=start_rows, workers=workers)
    algorithm_seconds = time.perf_counter() - started
    check, score_of, draw = _engine(data)
    result = {"method": method, "seed": seed, "run_id": run_id, "input_sha256": digest(data),
              "budget_seconds": hours * 3600, "algorithm_seconds": algorithm_seconds,
              "environment": {"python": sys.version, "ortools": ortools.__version__, "platform": platform.platform(),
                              "processor": platform.processor(), "workers": workers},
              "hint_source": start_method, **meta}
    result["validation"] = check(data, rows) if rows else {"valid": False, "errors": ["No schedule returned"]}
    if rows:
        metrics, details = score_of(data, rows)
        result["metrics"] = metrics
        if abs(metrics["objective"] - meta["solver_objective"]) > .01:
            raise ValueError(f"Solver/evaluator objective mismatch: {metrics['objective']} != {meta['solver_objective']}")
        if not result["validation"]["valid"]:
            raise ValueError(result["validation"])
        bound = meta.get("bound")
        result["gap"] = max(0, (metrics["objective"] - bound) / max(1, abs(metrics["objective"]))) if bound is not None else None
        save_json(out / "schedule.json", rows)
        write_csv(out / "schedule.csv", rows)
        for name, records in details.items():
            write_csv(out / f"{name}.csv", records)
        draw(out / "gantt.html", data, rows, result)
    result["total_seconds"] = time.perf_counter() - started
    save_json(out / "result.json", result)
    (out / "solver.log").write_text(meta.get("response_stats", ""), encoding="utf-8")
    print(f"{method} status={result['status']} objective={result.get('metrics', {}).get('objective')} "
          f"bound={meta.get('bound')} time={algorithm_seconds:.0f}s", flush=True)
    return result, out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", type=Path, required=True)
    p.add_argument("--patience", type=float, default=600)
    p.add_argument("--cap", type=float, default=7200)
    p.add_argument("--cp-hours", type=float, default=8)
    p.add_argument("--cp-workers", type=int, default=8)
    p.add_argument("--cold-hours", type=float, default=0,
                   help="also run CP-SAT without any hint (method cp_sat_cold_long) after the hinted run; 0 = skip")
    p.add_argument("--seeds", type=int, nargs="+", default=[11, 29, 47])
    args = p.parse_args()
    data = load(args.input)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    folder = runs_root(data) / "comparison" / run_id
    folder.mkdir(parents=True)
    save_json(folder / "input.json", data)
    save_json(folder / "config.json", {"run_id": run_id, "input_sha256": digest(data), "kind": "long",
                                       "seconds": args.cap, "patience": args.patience, "seeds": args.seeds,
                                       "cp_hours": args.cp_hours, "cp_workers": args.cp_workers,
                                       "execution": "sequential; heuristics 1 worker, stop on no improvement; "
                                                    "CP-SAT hinted with the best schedule found"})
    print(f"RUN_ID={run_id}", flush=True)
    os.environ["MNFT_PATIENCE"] = str(args.patience)
    os.environ["MNFT_CP_WORKERS"] = "1"
    results = []
    for method in ("fifo", "edd", "spt", "simulated_annealing", "genetic_algorithm", "cp_lns", "cp_rolling"):
        for seed in (args.seeds[:1] if method in ("fifo", "edd", "spt") else args.seeds):
            result, path = run_one(method, args.input, args.cap, seed, run_id)
            result["artifacts"] = path
            results.append(result)
            save_json(folder / "results.json", [{k: v for k, v in r.items() if k != "artifacts"} for r in results])
    best = min((r for r in results if r["validation"]["valid"]), key=lambda r: r["metrics"]["objective"])
    start = json.loads((best["artifacts"] / "schedule.json").read_text(encoding="utf-8"))
    start_method = f"{best['method']} seed {best['seed']}"
    cp, _ = cp_long(data, run_id, start, start_method, args.cp_hours, args.cp_workers)
    results.append(cp)
    save_json(folder / "results.json", [{k: v for k, v in r.items() if k != "artifacts"} for r in results])
    if args.cold_hours > 0:
        cold, _ = cp_long(data, run_id, None, None, args.cold_hours, args.cp_workers, method="cp_sat_cold_long")
        results.append(cold)
    clean = [{k: v for k, v in r.items() if k != "artifacts"} for r in results]
    save_json(folder / "results.json", clean)
    lines = ["# Đợt chạy dài: chạy tới khi xong, không theo ngân sách cố định", "",
             f"Run `{run_id}`; SHA256 input `{digest(data)}`.",
             f"SA/GA/CP-LNS: 1 worker, dừng sau {args.patience:g} s không cải thiện, mốc an toàn {args.cap:g} s. "
             f"CP-SAT: {args.cp_workers} worker, gợi ý từ lịch tốt nhất ({start_method}), dừng khi OPTIMAL hoặc sau {args.cp_hours:g} giờ."
             + (f" CP-SAT không gợi ý (cp_sat_cold_long): {args.cp_workers} worker, dừng khi OPTIMAL hoặc sau {args.cold_hours:g} giờ." if args.cold_hours > 0 else ""),
             "", "| Phương pháp / seed | Trạng thái | Lý do dừng | Objective | Cận dưới | Thời gian (s) |", "|---|---|---|---:|---:|---:|"]
    for r in clean:
        lines.append(f"| {r['method']} / {r['seed']} | {r['status']} | {r.get('stop_reason', '—')} | "
                     f"{r.get('metrics', {}).get('objective', '—')} | {r.get('bound') if r.get('bound') is not None else '—'} | "
                     f"{r['algorithm_seconds']:.0f} |")
    (folder / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"REPORT={folder / 'REPORT.md'}", flush=True)


if __name__ == "__main__":
    main()
