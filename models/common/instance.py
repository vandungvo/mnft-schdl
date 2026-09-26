from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "input" / "wheel_factory.json"
STAGES = ("cast", "cnc", "paint", "qc")


def save_json(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load(path=DEFAULT_INPUT):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    check_input(data)
    return data


def digest(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


def duration(data, lot, machine):
    spec = data["machines"][machine]
    return math.ceil(lot["quantity"] * spec["minutes_per_unit"][lot["product"]] + spec["fixed_minutes"])


def setup(data, machine, previous, product):
    return data["machines"][machine]["setup"][previous][product]


def eligible(data, lot, stage):
    return [m for m, spec in data["machines"].items()
            if spec["stage"] == stage and lot["product"] in spec["minutes_per_unit"]]


def check_input(data):
    """Reject inputs outside the explicit experimental contract before solving."""
    lots = {l["id"]: l for l in data["lots"]}
    assert len(lots) == len(data["lots"]), "Duplicate lot ids"
    assert len({o["id"] for o in data["orders"]}) == len(data["orders"]), "Duplicate order ids"
    assert data["stages"] == list(STAGES)
    allocated = {lid:0 for lid in lots}
    initial = {p:0 for p in data["products"]}
    molds = []
    for machine in data["machines"].values():
        windows = sorted(machine["windows"],key=lambda w:w["start"])
        assert all(0 <= w["start"] < w["end"] <= data["horizon"] for w in windows)
        assert all(a["end"] <= b["start"] for a,b in zip(windows,windows[1:])), "Overlapping calendar"
        for shift in machine["shifts"]:
            assert shift["available_minutes"] == sum(w["end"]-w["start"] for w in windows if w["shift"] == shift["id"])
        if "mold" in machine:
            mold = machine["mold"]
            molds.append(mold["id"])
            assert 0 <= mold["initial_cycles"] <= mold["limit_cycles"]
            assert mold["cavities"] > 0 and mold["maintenance_minutes"] > 0
    assert len(molds) == len(set(molds)), "This experiment requires dedicated, non-shared molds"
    for lot in lots.values():
        assert lot["quantity"] >= data["minimum_lot"] and lot["release"] >= 0
        assert len(eligible(data,lot,"cast")) == 1, "One dedicated casting machine per family required"
        mold = data["machines"][eligible(data,lot,"cast")[0]]["mold"]
        assert math.ceil(lot["quantity"]/mold["cavities"]) <= mold["limit_cycles"]
        assert all(eligible(data,lot,s) for s in STAGES), "Missing eligible machine"
    for order in data["orders"]:
        assert order["quantity"] > 0 and order["priority"] > 0
        assert order["initial_allocated"] >= 0 and order["lot_allocations"]
        initial[order["product"]] += order["initial_allocated"]
        assert sum(order["lot_allocations"].values())+order["initial_allocated"] == order["quantity"]
        for lid,qty in order["lot_allocations"].items():
            assert lid in lots and qty > 0 and lots[lid]["product"] == order["product"]
            assert lots[lid]["order"] == order["id"], "Decoder assumes one parent order per fixed lot"
            assert lots[lid]["release"] >= order["release"]
            allocated[lid] += qty
    assert all(0 < allocated[lid] <= l["quantity"] for lid,l in lots.items())
    assert all(initial[p] <= data["initial_inventory"][p] for p in initial)
    assert sum(l["quantity"]-allocated[lid] for lid,l in lots.items()) <= data["max_surplus"]


def build(seed=20260919):
    rng = random.Random(seed)
    products = ["F_SILVER", "F_BLACK", "R_SILVER", "R_BLACK"]
    # Wall-clock minutes from 00:00 Monday 2026-09-21; weekend retained.
    days = [0, 1, 2, 3, 4, 7, 8, 9, 10, 11]
    specs = {
        "CAST_F": ("cast", products[:2], 1.05, 5),
        "CAST_R": ("cast", products[2:], 1.2, 5),
        "CNC_1": ("cnc", products[:3], 1.65, 8),
        "CNC_2": ("cnc", products, 1.85, 8),
        "PAINT_1": ("paint", products, .70, 30),
        "PAINT_2": ("paint", products, .85, 30),
        "QC_1": ("qc", products, .65, 8),
    }
    machines = {}
    for mid, (stage, allowed, rate, fixed) in specs.items():
        matrix = {}
        for prev in products + ["CLEAN"]:
            matrix[prev] = {}
            for product in products:
                if prev == product:
                    val = 0
                elif stage == "paint":
                    val = 12 if prev.endswith("SILVER") and product.endswith("BLACK") else 24
                    if prev != "CLEAN" and prev.split("_")[1] == product.split("_")[1]:
                        val = 0
                else:
                    val = {"cast": 12, "cnc": 18, "qc": 4}[stage]
                    if prev == "CLEAN":
                        val += 4
                matrix[prev][product] = val
        downtime = []
        if mid == "CNC_1":
            downtime = [[2 * 1440 + 840, 2 * 1440 + 1020]]
        if mid == "PAINT_1":
            downtime = [[7 * 1440 + 360, 7 * 1440 + 600]]
        windows, shifts = [], []
        for day in days:
            for shift_num, (a, b, c, d) in enumerate([(360, 600, 630, 840), (840, 1080, 1110, 1320)]):
                sid = f"D{day+1:02}_S{shift_num+1}"
                segments = [[day * 1440 + a, day * 1440 + b], [day * 1440 + c, day * 1440 + d]]
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
                shifts.append({"id": sid, "day": day, "start": day * 1440 + a,
                               "end": day * 1440 + d, "available_minutes": sum(y-x for x,y in segments)})
                for x, y in segments:
                    windows.append({"id": len(windows), "shift": sid, "start": x, "end": y})
        machines[mid] = {"stage": stage, "minutes_per_unit": {p: rate for p in allowed},
                         "fixed_minutes": fixed, "initial_product": allowed[0], "setup": matrix,
                         "windows": windows, "shifts": shifts, "downtime": downtime}
        if stage == "cast":
            machines[mid]["mold"] = {"id": f"MOLD_{mid[-1]}", "cavities": 2,
                                       "limit_cycles": 140, "initial_cycles": 95 if mid == "CAST_F" else 115,
                                       "maintenance_minutes": 45, "after_maintenance": "CLEAN"}
    orders, lots = [], []
    first = set()
    for i in range(36):
        product = products[(i * 3 + i // 4) % 4]
        wave = i // 6
        release_day = days[wave]
        release = release_day * 1440 + 360
        urgent = i in [7, 16, 25, 31]
        due_day = days[min(9, wave + (0 if urgent else rng.choice([1, 1, 2, 2])))]
        due = due_day * 1440 + (840 if urgent else 1320)
        initial = 12 if product not in first else 0
        first.add(product)
        count = 2 if i % 3 == 0 else 1
        order_lots = []
        allocated = []
        for k in range(count):
            qty = rng.choice([60, 72, 84, 96])
            lid = f"L{len(lots)+1:03}"
            order_lots.append(lid)
            allocated.append(qty - (4 if k == count - 1 else 0))
            lots.append({"id": lid, "order": f"O{i+1:03}", "product": product,
                         "quantity": qty, "release": release})
        orders.append({"id": f"O{i+1:03}", "product": product, "release": release, "due": due,
                       "priority": 4 if urgent else rng.choice([1, 1, 2]), "urgent": urgent,
                       "quantity": sum(allocated) + initial, "initial_allocated": initial,
                       "lot_allocations": dict(zip(order_lots, allocated))})
    data = {"schema_version": 1, "name": "wheel_factory_48_lots_2weeks", "seed": seed,
            "origin": "2026-09-21T00:00:00+07:00", "time_unit": "minute", "horizon": 14 * 1440,
            "working_days": days, "stages": list(STAGES), "products": products,
            "initial_inventory": {p: 18 for p in products}, "safety_stock": {p: 30 for p in products},
            "checkpoints": [(d+1)*1440 for d in range(14)], "minimum_lot": 60,
            "max_surplus": 144, "machines": machines, "orders": orders, "lots": lots,
            "weights": {"makespan": 1, "weighted_tardiness": 15, "setup_minutes": 3,
                        "idle_minutes": 1, "safety_shortfall": 20},
            "assumptions": [
                "Synthetic engineering assumptions, not measured factory data.",
                "Fixed lots and fixed order allocation; no partial shipment; ship as soon as all allocated lots finish QC.",
                "Dedicated fixed front/rear molds; finish variants share geometry. No mold transport.",
                "Maintenance is mandatory just before the next lot would exceed cycles; no discretionary early maintenance.",
                "Maintenance + setup + processing form one contiguous block inside an availability window for ALL methods.",
                "Block cannot cross a break or shift boundary; conservative restriction beyond the general requirements.",
                "Shifts are activated iff occupied. Setup, maintenance and processing all count as occupied time.",
                "Urgent releases and downtime known at planning time; this is an offline comparison, not online rescheduling.",
                "No WIP at origin; material available at release; no scrap, transport times or labor capacity."]}
    return data


if __name__ == "__main__":
    save_json(DEFAULT_INPUT, build())
    print(DEFAULT_INPUT)
