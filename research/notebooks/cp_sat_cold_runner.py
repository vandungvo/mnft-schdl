"""Run the bundled schema-5 CP-SAT engine with no initial schedule."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import platform
import time
from pathlib import Path

import ortools

from models.common.stage_runs.cp_engine import solve
from models.common.stage_runs.evaluate import evaluate, validate
from models.common.stage_runs.instance import check
from models.common.stage_runs.report import gantt


def save_json(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def write_csv(path, rows):
    if not rows:
        return
    with Path(path).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def run(input_path, output, seconds, workers, seed):
    if not math.isfinite(seconds) or seconds <= 0 or workers < 1 or not 0 <= seed < 2**31:
        raise ValueError("seconds > 0, workers >= 1, and 0 <= seed < 2**31 are required")
    data = json.loads(Path(input_path).read_text(encoding="utf-8"))
    if data.get("schema_version") != 5:
        raise ValueError("This runner requires schema_version 5")
    check(data)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    # Match models.common.instance.digest so existing experiments can be compared.
    input_digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    config = {
        "method": "cp_sat_cold_long", "run_id": output.name, "seed": seed,
        "budget_seconds": seconds, "workers": workers,
        "hint_source": None, "use_hint": False, "fixed_runs": None,
        "input_sha256": input_digest,
        "environment": {"python": platform.python_version(), "ortools": ortools.__version__,
                        "platform": platform.platform(), "processor": platform.processor(), "workers": workers},
    }
    save_json(output / "input.json", data)
    save_json(output / "config.json", config)
    save_json(output / "result.json", {**config, "status": "RUNNING"})
    print(f"Cold CP-SAT: {len(data['runs'])} runs, {len(data['orders'])} orders, "
          f"{data['horizon'] / 1440:g} days; hint=None; workers={workers}; budget={seconds:g}s", flush=True)
    started = time.perf_counter()
    try:
        # Direct call: no dispatcher, decoder, SA, GA, saved schedule, or fallback.
        rows, meta = solve(data, seconds=seconds, seed=seed, hint=None,
                           fixed_runs=None, workers=workers, limits=None)
        result = {**config, **meta, "algorithm_seconds": time.perf_counter() - started,
                  "has_schedule": rows is not None}
        (output / "solver.log").write_text(meta.get("response_stats", ""), encoding="utf-8")
        save_json(output / "history.json", meta.get("history", []))
        result["validation"] = validate(data, rows) if rows is not None else {
            "valid": False, "errors": ["No schedule returned; inspect solver status."]}
        if rows is not None:
            metrics, details = evaluate(data, rows)
            result["metrics"] = metrics
            if not result["validation"]["valid"]:
                save_json(output / "invalid_schedule.json", rows)
                raise ValueError(result["validation"])
            if abs(metrics["objective"] - meta["solver_objective"]) > .01:
                raise ValueError("Solver objective differs from the independent evaluator")
            bound = meta.get("bound")
            result["gap"] = max(0, (metrics["objective"] - bound) / max(1, abs(metrics["objective"]))) if bound is not None else None
            save_json(output / "schedule.json", rows)
            write_csv(output / "schedule.csv", rows)
            for name, records in details.items():
                write_csv(output / f"{name}.csv", records)
            gantt(output / "gantt.html", data, rows, result)
        result["total_seconds"] = time.perf_counter() - started
        save_json(output / "result.json", result)
        # Same comparison JSON shape as run_long, for downstream analysis.
        save_json(output / "results.json", [result])
        metrics = result.get("metrics", {})
        lines = ["# CP-SAT từ đầu — không gợi ý", "",
                 f"- Trạng thái: **{result['status']}**",
                 f"- Thời gian: {result['algorithm_seconds']:.2f} giây",
                 f"- Worker: {workers}; seed: {seed}; hint: None",
                 f"- Lịch hợp lệ: {result['validation']['valid']}",
                 f"- Objective: {metrics.get('objective')}",
                 f"- Tầng 1 / tầng 2: {metrics.get('objective_tier1')} / {metrics.get('objective_tier2')}",
                 f"- Cận dưới: {result.get('bound')}; gap tổng: {result.get('gap')}", "",
                 "UNKNOWN = chưa tìm được lịch trong ngân sách, không phải kết luận vô nghiệm.",
                 "FEASIBLE = có lịch; OPTIMAL = đã chứng minh tối ưu theo cấu hình solver."]
        (output / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"DONE: {result['status']}; objective={metrics.get('objective')}; output={output}", flush=True)
        return result
    except BaseException as exc:
        save_json(output / "result.json", {**config,
                  "status": "INTERRUPTED" if isinstance(exc, KeyboardInterrupt) else "ERROR",
                  "error": str(exc), "total_seconds": time.perf_counter() - started})
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seconds", type=float, required=True)
    parser.add_argument("--workers", type=int, required=True)
    parser.add_argument("--seed", type=int, default=11)
    args = parser.parse_args()
    run(args.input, args.output, args.seconds, args.workers, args.seed)
