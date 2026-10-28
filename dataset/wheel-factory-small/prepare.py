"""Data-preparation step: raw user input (tier 1) -> model input (tier 2).

    python dataset/wheel-factory-small/prepare.py [raw_input.json] [model_input.json]

The rules live in models/common/stage_runs/prepare.py (shared with the backend,
which compiles planning periods through the same step); this script only reads
and writes the files. See that module for what is derived.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models.common.stage_runs.prepare import (
    PrepError,
    check_model,
    check_raw,
    end_stock,
    prepare,
    stage_load,
)

__all__ = ["PrepError", "check_model", "check_raw", "end_stock", "prepare", "stage_load"]

HERE = Path(__file__).resolve().parent


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
