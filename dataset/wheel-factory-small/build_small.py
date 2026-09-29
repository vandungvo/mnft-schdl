"""Generator for a SMALL synthetic wheel-factory instance that exercises every
business rule in report/problem-requirements/problem_requirements.md that the
current engine schema (schema_version 3, see models/common/instance.py) supports.

Run from anywhere: `python dataset/wheel-factory-small/build_small.py`.
Design rationale (why each number was picked) is in the companion SOURCE.md.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
# Import the real project validator so this instance is checked with the exact
# same contract as models/input/wheel_factory.json, not a re-implementation.
from models.common.instance import check_input, STAGES  # noqa: E402

PRODUCTS = ["F_SILVER", "F_BLACK", "R_SILVER", "R_BLACK"]
CLEAN = "CLEAN"
# Machine state at t=0: nothing set up yet, so the first lot on any machine pays a flat
# initial setup regardless of product (replaces a per-machine preassigned product).
INITIAL = "INITIAL"
INITIAL_SETUP_MINUTES = 10


def setup_matrix(stage, allowed):
    """Same formula as models/common/instance.py's build(), scoped to `allowed`."""
    matrix = {}
    matrix[INITIAL] = {product: INITIAL_SETUP_MINUTES for product in allowed}
    for prev in allowed + [CLEAN]:
        matrix[prev] = {}
        for product in allowed:
            if prev == product:
                val = 0
            elif stage == "paint":
                val = 12 if prev.endswith("SILVER") and product.endswith("BLACK") else 24
                if prev != CLEAN and prev.split("_")[1] == product.split("_")[1]:
                    val = 0  # same color, different line: no paint-booth changeover
            else:
                val = {"cast": 12, "cnc": 18, "qc": 4}[stage]
                if prev == CLEAN:
                    val += 4
            matrix[prev][product] = val
    return matrix


SHIFT_TEMPLATE = {
    "S1": (0, 480, None),
    "S2": (480, 960, (720, 750)),  # 30-minute break 12:00-12:30
    "S3": (960, 1440, None),
}


def build_calendar(days, shift_keys, downtime=None):
    downtime = downtime or []
    windows, shifts = [], []
    for day in days:
        for key in shift_keys:
            start, end, brk = SHIFT_TEMPLATE[key]
            segments = [[day * 1440 + start, day * 1440 + end]]
            if brk:
                b0, b1 = day * 1440 + brk[0], day * 1440 + brk[1]
                segments = [[segments[0][0], b0], [b1, segments[0][1]]]
            for lo, hi in downtime:
                pieces = []
                for x, y in segments:
                    if hi <= x or lo >= y:
                        pieces.append([x, y])
                    else:
                        if x < lo:
                            pieces.append([x, lo])
                        if hi < y:
                            pieces.append([hi, y])
                segments = pieces
            sid = f"D{day + 1:02}_{key}"
            shifts.append({
                "id": sid, "day": day,
                "start": day * 1440 + start, "end": day * 1440 + end,
                "available_minutes": sum(y - x for x, y in segments),
            })
            for x, y in segments:
                windows.append({"id": len(windows), "shift": sid, "start": x, "end": y})
    return windows, shifts


def build():
    days = [0, 1]  # 2-day horizon: small enough to trace by hand
    horizon = len(days) * 1440

    machine_specs = {
        "CAST_1": dict(stage="cast", allowed=["F_SILVER", "F_BLACK"], rate=1.2, fixed=5,
                       initial_product=INITIAL, shift_keys=["S1", "S2"], downtime=[]),
        "CAST_2": dict(stage="cast", allowed=["R_SILVER", "R_BLACK"], rate=1.3, fixed=5,
                       initial_product=INITIAL, shift_keys=["S1", "S2"], downtime=[]),
        "CNC_1": dict(stage="cnc", allowed=["F_SILVER", "F_BLACK", "R_SILVER"], rate=1.5, fixed=8,
                      initial_product=INITIAL, shift_keys=["S1", "S2"], downtime=[]),
        "CNC_2": dict(stage="cnc", allowed=PRODUCTS, rate=1.7, fixed=8,
                      initial_product=INITIAL, shift_keys=["S1", "S2"], downtime=[[900, 930]]),
        "PAINT_1": dict(stage="paint", allowed=PRODUCTS, rate=0.8, fixed=15,
                        initial_product=INITIAL, shift_keys=["S2", "S3"], downtime=[]),
        "QC_1": dict(stage="qc", allowed=PRODUCTS, rate=0.6, fixed=5,
                     initial_product=INITIAL, shift_keys=["S2", "S3"], downtime=[]),
    }

    machines = {}
    for mid, spec in machine_specs.items():
        windows, shifts = build_calendar(days, spec["shift_keys"], spec["downtime"])
        machines[mid] = {
            "stage": spec["stage"],
            "minutes_per_unit": {p: spec["rate"] for p in spec["allowed"]},
            "fixed_minutes": spec["fixed"],
            "initial_product": spec["initial_product"],
            "setup": setup_matrix(spec["stage"], spec["allowed"]),
            "windows": windows,
            "shifts": shifts,
            "downtime": spec["downtime"],
        }

    # CAST_1: limit 12, initial 8 -> forces maintenance before lot #1 and lot #3.
    machines["CAST_1"]["mold"] = {"id": "MOLD_1", "cavities": 4, "limit_cycles": 12,
                                    "initial_cycles": 8, "maintenance_minutes": 25,
                                    "after_maintenance": CLEAN}
    # CAST_2: limit 10, initial 2 -> forces maintenance only before lot #2.
    machines["CAST_2"]["mold"] = {"id": "MOLD_2", "cavities": 4, "limit_cycles": 10,
                                    "initial_cycles": 2, "maintenance_minutes": 25,
                                    "after_maintenance": CLEAN}

    lots = [
        {"id": "L001", "order": "O001", "product": "F_SILVER", "quantity": 20, "release": 0},
        {"id": "L002", "order": "O001", "product": "F_SILVER", "quantity": 24, "release": 0},
        {"id": "L003", "order": "O002", "product": "F_BLACK", "quantity": 20, "release": 0},
        {"id": "L004", "order": "O003", "product": "R_SILVER", "quantity": 20, "release": 0},
        {"id": "L005", "order": "O004", "product": "R_BLACK", "quantity": 24, "release": 0},
    ]

    orders = [
        {"id": "O001", "product": "F_SILVER", "release": 0, "due": 960, "priority": 4,
         "urgent": True, "quantity": 44, "initial_allocated": 4,
         "lot_allocations": {"L001": 20, "L002": 20}},
        {"id": "O002", "product": "F_BLACK", "release": 0, "due": 1800, "priority": 2,
         "urgent": False, "quantity": 20, "initial_allocated": 0,
         "lot_allocations": {"L003": 20}},
        {"id": "O003", "product": "R_SILVER", "release": 0, "due": 2160, "priority": 1,
         "urgent": False, "quantity": 20, "initial_allocated": 0,
         "lot_allocations": {"L004": 20}},
        {"id": "O004", "product": "R_BLACK", "release": 0, "due": 2400, "priority": 2,
         "urgent": False, "quantity": 24, "initial_allocated": 4,
         "lot_allocations": {"L005": 20}},
    ]

    # BTP codes shared across colors at cast/cnc (color not fixed until paint);
    # only the paint-stage BTP code is color-specific. This is the concrete
    # "BTP shared across final products (e.g. multiple paint colors)" case A09
    # explicitly calls out.
    btp_codes = ["F_CAST", "R_CAST", "F_CNC", "R_CNC",
                 "F_SILVER_PAINT", "F_BLACK_PAINT", "R_SILVER_PAINT", "R_BLACK_PAINT"]
    btp_routing = {
        "F_SILVER": {"cast": "F_CAST", "cnc": "F_CNC", "paint": "F_SILVER_PAINT"},
        "F_BLACK": {"cast": "F_CAST", "cnc": "F_CNC", "paint": "F_BLACK_PAINT"},
        "R_SILVER": {"cast": "R_CAST", "cnc": "R_CNC", "paint": "R_SILVER_PAINT"},
        "R_BLACK": {"cast": "R_CAST", "cnc": "R_CNC", "paint": "R_BLACK_PAINT"},
    }
    # Opening semi-finished stock at every stage buffer (cast/cnc/paint), sized like a real
    # shop: the upstream buffers (cast) hold the most, downstream ones less. Stock at code X
    # is what the NEXT stage draws from, so paint-code stock lets QC start before the
    # first paint run finishes. Total 34 = max_surplus_btp below.
    inventory_btp = {
        "F_CAST": 8, "R_CAST": 4,
        "F_CNC": 6, "R_CNC": 4,
        "F_SILVER_PAINT": 4, "F_BLACK_PAINT": 3,
        "R_SILVER_PAINT": 3, "R_BLACK_PAINT": 2,
    }
    # Capacity set above each line's total in-flight quantity (F: 20+24+20=64,
    # R: 20+24=44) so the field is genuinely enforced by cp_engine.py's reservoir
    # constraint without depending on a specific optimal schedule's exact timing.
    # Plus the opening CNC stock (F: 6, R: 4) so the cap still sits above worst-case level.
    btp_capacity = {"F_CNC": 70, "R_CNC": 48}

    data = {
        "schema_version": 3,
        "name": "wheel_factory_small_5_lots_2days",
        "seed": 20260930,
        "origin": "2026-09-28T00:00:00+07:00",
        "time_unit": "minute",
        "horizon": horizon,
        "working_days": days,
        "stages": list(STAGES),
        "products": PRODUCTS,
        "product_color": {p: p.split("_")[1] for p in PRODUCTS},
        "product_line": {p: p.split("_")[0] for p in PRODUCTS},
        "initial_inventory": {"F_SILVER": 10, "F_BLACK": 6, "R_SILVER": 6, "R_BLACK": 8},
        "safety_stock": {"F_SILVER": 8, "F_BLACK": 6, "R_SILVER": 6, "R_BLACK": 6},
        "btp_codes": btp_codes,
        "btp_routing": btp_routing,
        "inventory_btp": inventory_btp,
        "btp_capacity": btp_capacity,
        "max_surplus_btp": 34,
        "transfer_minutes": 10,
        "checkpoints": [(d + 1) * 1440 for d in range(len(days))],
        "minimum_lot": 20,
        "max_surplus": 10,
        "machines": machines,
        "orders": orders,
        "lots": lots,
        "weights": {"makespan": 1, "weighted_tardiness": 15, "setup_minutes": 3,
                    "idle_minutes": 1, "safety_shortfall": 20},
        "assumptions": [
            "Small illustrative instance for report/problem-requirements/problem_requirements.md, "
            "not measured factory data.",
            "5 lots / 4 orders / 6 machines / 2-day horizon: small enough to trace by hand, still "
            "exercises every schema-supported business rule (A01-A10, R01-R07, R09, R12).",
            "CNC stage has genuine FJSP choice for F_SILVER/F_BLACK/R_SILVER (CNC_1 or CNC_2); "
            "R_BLACK is only eligible on CNC_2, showing partial machine eligibility.",
            "CAST_1 mold (limit 12, initial 8) is forced into maintenance before lot #1 and "
            "lot #3 regardless of solver sequencing; CAST_2 mold (limit 10, initial 2) is forced "
            "into maintenance only before lot #2 -- deliberately contrasting maintenance cadence.",
            "BTP codes are shared across colors at cast/cnc (F_CAST, F_CNC, R_CAST, R_CNC) because "
            "paint has not happened yet; only the paint-stage BTP code is color-specific -- the "
            "concrete 'BTP shared across colors' case flagged in A09.",
            "Order O001 is split into two lots (L001+L002) to exercise the one-order-to-many-lots "
            "rule in A01; O001 and O004 also use nonzero initial_allocated to exercise A02.",
            "Lots L002 and L005 are sized above their order allocation (24 vs 20) to exercise the "
            "technical-surplus allowance in A02/R04 (max_surplus=10 >= the 4+4 declared surplus).",
            "All orders are confirmed at the start of the horizon (release = 0 for every order and lot); the file does not model late-arriving orders or staggered material availability.",
            "CNC_2 carries a declared downtime window on day 0 distinct from its shift breaks, to "
            "exercise the downtime carve-out in R06 separately from calendar breaks.",
            "Upstream stages (cast, cnc) run shifts S1+S2; downstream stages (paint, qc) run "
            "shifts S2+S3 -- per-machine shift activation, not every machine on every shift (A03).",
            "NOT modeled by this instance (schema/engine limitation, not a business omission): "
            "optional/reserve lot selection for idle-filling (A08, muc 4.3.2) has no field in "
            "schema_version 3 and no decision variable in models/common/cp_engine.py yet; and "
            "live rescheduling event ingestion (A07/R11) has no dynamic-event input format here -- "
            "this file is a single static planning snapshot only.",
        ],
    }
    return data


if __name__ == "__main__":
    data = build()
    check_input(data)
    out = Path(__file__).resolve().parent / "wheel_factory_small.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("OK, wrote", out)
