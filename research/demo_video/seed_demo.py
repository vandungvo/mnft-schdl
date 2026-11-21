"""Seed a realistic, English-language demo plant through the public API.

Story (today = Sat 21 Nov 2026):
* Plant: 5-stage alloy wheel line (casting -> T6 heat treatment -> CNC -> paint -> test & pack),
  front and rear 17-inch wheels in silver and black. Machine data comes from the 2-week research
  instance (dataset/wheel-factory-2weeks), only renamed and given real-looking names, shifts,
  holidays, weekly maintenance and three objective policies.
* Order book: deliveries Tue/Thu/Sat 16:00 from 9 Nov 2026 to 2 Jan 2027, split across OEM
  assembly plants, aftermarket distributors and one export customer; one rush order a week.
* Period "Weeks 46-47" (9-22 Nov): generated, committed and closed (its orders are delivered).
* Period "Weeks 48-49" (23 Nov - 6 Dec): rolled over from it, opening stock projected from the
  committed schedule -- the one the demo plans live.
* Factory version 2 effective 7 Dec: a third CNC lathe is commissioned.

Usage (demo backend must be running, empty factory table):
    python research/demo_video/seed_demo.py --out <dir>
Writes <dir>/new_orders.csv (orders imported on camera) and <dir>/seed_result.json.
"""

from __future__ import annotations

import argparse
import copy
import json
import random
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from backend.app.factory_model import split_document  # noqa: E402

SEED_DOC = ROOT / "backend" / "app" / "seed" / "wheel_factory_5stages.json"
FACTORY_NAME = "Riverside Alloy Wheels - Plant 1"


# ---------------------------------------------------------------- tiny API client


class Api:
    def __init__(self, base: str) -> None:
        self.base = base.rstrip("/")

    def call(self, method: str, path: str, body: object | None = None, headers: dict | None = None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            raise SystemExit(f"{method} {path} -> {exc.code}: {exc.read().decode()[:2000]}") from exc

    get = lambda self, p: self.call("GET", p)  # noqa: E731
    post = lambda self, p, b=None, h=None: self.call("POST", p, b, h)  # noqa: E731
    put = lambda self, p, b: self.call("PUT", p, b)  # noqa: E731


# ---------------------------------------------------------------- the plant


def build_config() -> dict:
    split = split_document(json.loads(SEED_DOC.read_text(encoding="utf-8")))
    cfg = split.config.model_dump(mode="json")
    cfg["stage_names"] = {
        "cast": "Casting",
        "heat": "Heat treatment",
        "machining": "Machining",
        "paint": "Painting",
        "qc": "Test & packing",
    }
    cfg["shift_template"] = {
        "S1": {"name": "Night shift", "start": 0, "end": 480, "breaks": [[240, 270]]},
        "S2": {"name": "Day shift", "start": 480, "end": 960, "breaks": [[720, 750]]},
        "S3": {"name": "Evening shift", "start": 960, "end": 1440, "breaks": [[1200, 1230]]},
    }
    cfg["weekly_off"] = [6]  # Mon-Sat production, Sunday off
    cfg["holidays"] = [
        "2027-01-01",  # New Year's Day
        *[(date(2027, 2, 4) + timedelta(days=i)).isoformat() for i in range(7)],  # Lunar New Year
    ]
    cfg["maintenance_rules"] = [
        {"machine": "CNC_2", "weekday": 2, "start": 480, "end": 600,
         "note": "Weekly preventive maintenance: spindle and coolant check"},
        {"machine": "PAINT_1", "weekday": 5, "start": 1200, "end": 1320,
         "note": "Paint booth filter change"},
    ]
    names = {
        "F_SILVER": "Front wheel 17x1.40 - Silver",
        "F_BLACK": "Front wheel 17x1.40 - Matte black",
        "R_SILVER": "Rear wheel 17x1.60 - Silver",
        "R_BLACK": "Rear wheel 17x1.60 - Matte black",
    }
    for code, name in names.items():
        cfg["products"][code]["name"] = name
    btp_names = {
        "F_CAST": "Front wheel - raw casting",
        "R_CAST": "Rear wheel - raw casting",
        "F_HEAT": "Front wheel - heat treated (T6)",
        "R_HEAT": "Rear wheel - heat treated (T6)",
        "F_MACH": "Front wheel - machined",
        "R_MACH": "Rear wheel - machined",
        "F_SILVER_PAINT": "Front wheel - painted silver",
        "F_BLACK_PAINT": "Front wheel - painted black",
        "R_SILVER_PAINT": "Rear wheel - painted silver",
        "R_BLACK_PAINT": "Rear wheel - painted black",
    }
    for code, name in btp_names.items():
        cfg["btp"][code]["name"] = name
    machine_names = {
        "CAST_1": "Gravity die-casting cell 1",
        "CAST_2": "Gravity die-casting cell 2",
        "HT_1": "T6 batch furnace 1",
        "HT_2": "T6 batch furnace 2",
        "CNC_1": "CNC lathe 1",
        "CNC_2": "CNC lathe 2",
        "PAINT_1": "Paint conveyor line",
        "QC_1": "Test & packing station",
    }
    for code, name in machine_names.items():
        cfg["machines"][code]["name"] = name
    base = split.config.policy(None)
    weights = dict(base.weights)
    cfg["policies"] = [
        {
            "key": "on_time",
            "name": "On-time delivery first",
            "description": "Late orders and safety-stock gaps are minimised first; running cost only breaks ties.",
            "weights": weights,
            "tier1": ["weighted_tardiness", "safety_shortfall"],
            "scale": 1_000_000,
        },
        {
            "key": "balanced",
            "name": "Balanced",
            "description": "Lateness, stock gaps and running cost traded off in one weighted sum.",
            "weights": {**weights, "weighted_tardiness": 15, "safety_shortfall": 20},
            "tier1": [],
            "scale": 1,
        },
        {
            "key": "low_cost",
            "name": "Lowest running cost",
            "description": "For slack weeks: fewer shifts, setups and idle machine time; small delays tolerated.",
            "weights": {**weights, "weighted_tardiness": 4, "safety_shortfall": 6,
                        "nonproductive_minutes": 6, "setup_minutes": 4},
            "tier1": [],
            "scale": 1,
        },
    ]
    cfg["default_policy"] = "on_time"
    return cfg


def with_third_cnc(cfg: dict) -> dict:
    new = copy.deepcopy(cfg)
    cnc3 = copy.deepcopy(new["machines"]["CNC_2"])
    cnc3["name"] = "CNC lathe 3 (new)"
    cnc3["minutes_per_unit"] = {k: 6.0 for k in cnc3["minutes_per_unit"]}
    new["machines"]["CNC_3"] = cnc3
    return new


# ---------------------------------------------------------------- the order book

# Two-week mix of the research instance per delivery day (wheels): F silver, F black, R silver, R black.
MIX = {"F_SILVER": 60, "F_BLACK": 28, "R_SILVER": 44, "R_BLACK": 30}
PRIORITY = {"F_SILVER": 3, "F_BLACK": 2, "R_SILVER": 2, "R_BLACK": 1}
OEM = ["Saigon Motor Assembly", "Hanoi Moto Works"]
AFTERMARKET = ["Mekong Parts Distribution", "Danang Spare Parts"]
EXPORT = "PT Nusantara Moto (export)"
NOTES_OEM = ["Line-side delivery, gate 3", "Kanban call-off", None, None, None]
NOTES_AFTER = ["Mixed pallet with rear wheels", None, None, "Repack in retail boxes"]


def round4(x: float) -> int:
    return max(4, int(round(x / 4.0)) * 4)


def build_orders(start: date, end: date, rng: random.Random) -> list[dict]:
    orders: list[dict] = []
    seq = 0
    day = start
    while day <= end:
        if day.weekday() in (1, 3, 5):  # Tue, Thu, Sat
            for product, base in MIX.items():
                qty = round4(base * rng.uniform(0.8, 1.2))
                silver = product.endswith("SILVER")
                buyers = OEM if silver else AFTERMARKET
                split = [qty] if qty < 40 else [round4(qty * 0.6), qty - round4(qty * 0.6)]
                for i, part in enumerate(split):
                    if part <= 0:
                        continue
                    seq += 1
                    customer = buyers[(i + day.toordinal()) % len(buyers)]
                    notes = NOTES_OEM if silver else NOTES_AFTER
                    orders.append({
                        "code": f"SO-{day:%y%m%d}-{seq:03d}",
                        "product": product,
                        "quantity": part,
                        "due": f"{day.isoformat()}T16:00",
                        "priority": PRIORITY[product],
                        "pickup": "at_due",
                        "customer": customer,
                        "note": rng.choice(notes),
                    })
            if day.weekday() == 3:  # Thursday container for the export customer
                seq += 1
                orders.append({
                    "code": f"EX-{day:%y%m%d}-{seq:03d}",
                    "product": rng.choice(["F_BLACK", "R_BLACK"]),
                    "quantity": round4(rng.uniform(12, 24)),
                    "due": f"{day.isoformat()}T16:00",
                    "priority": 2,
                    "pickup": "at_due",
                    "customer": EXPORT,
                    "note": "Container cut-off 18:00 at Cat Lai port",
                })
        if day.weekday() == 1:  # one rush order a week, due Tuesday noon
            seq += 1
            orders.append({
                "code": f"RUSH-{day:%y%m%d}",
                "product": rng.choice(["F_SILVER", "R_SILVER"]),
                "quantity": round4(rng.uniform(24, 40)),
                "due": f"{day.isoformat()}T12:00",
                "priority": 4,
                "pickup": "at_due",
                "customer": rng.choice(OEM),
                "note": "Rush: assembly line short of wheels",
            })
        day += timedelta(days=1)
    return orders


NEW_ORDERS_CSV = """Order no,Customer,Product,Qty,Delivery date,Time,Priority,Note
SO-261203-901,Saigon Motor Assembly,F_SILVER,48,03/12/2026,16:00,High,New scooter model launch batch
SO-261203-902,Saigon Motor Assembly,R_SILVER,40,03/12/2026,16:00,Normal,New scooter model launch batch
SO-261205-903,Danang Spare Parts,R_BLACK,24,05/12/2026,16:00,Low,
SO-261128-904,Hanoi Moto Works,F_SILVER,32,28/11/2026,12:00,Urgent,Warranty replacements - customer escalation
{update_row}
"""


def new_orders_csv(orders: list[dict]) -> str:
    # One existing order whose customer raised the call-off, so the preview shows an update too.
    target = next(o for o in orders if o["code"].startswith("SO-261126") and o["product"] == "F_SILVER")
    d = target["due"]
    row = (f"{target['code']},{target['customer']},{target['product']},{target['quantity'] + 8},"
           f"{d[8:10]}/{d[5:7]}/{d[0:4]},{d[11:16]},High,Customer raised the call-off")
    return NEW_ORDERS_CSV.format(update_row=row)


# ---------------------------------------------------------------- helpers


def wait_runs(api: Api, run_ids: list[str], timeout: float = 900) -> list[dict]:
    t0 = time.time()
    while True:
        runs = [api.get(f"/schedule-runs/{rid}") for rid in run_ids]
        if all(r["status"].lower() in ("succeeded", "failed", "cancelled") for r in runs):
            return runs
        if time.time() - t0 > timeout:
            raise SystemExit("runs did not finish in time")
        time.sleep(3)


def queue(api: Api, dataset_id: str, algorithm: str, budget: float, seed: int = 11) -> str:
    run = api.post(
        "/schedule-runs",
        {"dataset_id": dataset_id, "algorithm": algorithm, "seed": seed, "time_budget_seconds": budget},
        {"Idempotency-Key": str(uuid.uuid4())},
    )
    return run["id"]


def commit_best(api: Api, period: dict, runs: list[dict], reason: str) -> dict:
    ok = [r for r in runs if r["status"].lower() == "succeeded"]
    if not ok:
        raise SystemExit("no successful run to commit")
    best = min(ok, key=lambda r: (r["metrics"]["objective_tier1"], r["metrics"]["objective_tier2"]))
    m = best["metrics"]
    return api.post(
        f"/master-data/datasets/{period['dataset_id']}/decisions",
        {
            "run_id": best["id"],
            "alternative": "#1 Fewest late priority orders",
            "policy": "On-time delivery first",
            "score": "",
            "late": m["late_orders"],
            "shortfall": m["safety_shortfall"],
            "shifts": m["activated_shifts"],
            "reason": reason,
        },
    )


# ---------------------------------------------------------------- main


def main() -> None:
    parser = argparse.ArgumentParser()
    # 127.0.0.1, not localhost: on Windows "localhost" may try ::1 first and stall on every request.
    parser.add_argument("--api", default="http://127.0.0.1:8100/api/v1")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--budget", type=float, default=60)
    args = parser.parse_args()
    api = Api(args.api)
    args.out.mkdir(parents=True, exist_ok=True)

    if api.get("/factories")["total"]:
        raise SystemExit("the demo database already has a factory; start from an empty one")

    cfg = build_config()
    factory = api.post("/factories", {"name": FACTORY_NAME, "config": cfg})
    fid = factory["id"]
    print("factory", fid)

    rng = random.Random(20261109)
    orders = build_orders(date(2026, 11, 9), date(2027, 1, 2), rng)
    for order in orders:
        api.post(f"/factories/{fid}/orders", {k: v for k, v in order.items() if v is not None})
    print("orders", len(orders))

    # Period 1 (9-22 Nov): realistic opening stock and WIP from the research instance.
    seed_doc = json.loads(SEED_DOC.read_text(encoding="utf-8"))
    p1 = api.post("/periods", {"factory_id": fid, "start_date": "2026-11-09", "name": "Weeks 46-47",
                               "opening": "zero", "pull_orders": True})
    inputs = p1["inputs"]
    inputs["opening"]["finished"] = {k: v["initial_stock"] for k, v in seed_doc["products"].items()}
    inputs["opening"]["btp"] = {k: v["initial_stock"] for k, v in seed_doc["btp"].items()}
    inputs["opening"]["molds"] = {k: v["initial_cycles"] for k, v in seed_doc["molds"].items()}
    inputs["exceptions"] = [{
        "id": "EX1", "machine": "HT_2", "start": "2026-11-17T08:00", "end": "2026-11-17T16:00",
        "kind": "maintenance", "note": "Thermocouple replacement on furnace 2",
    }]
    inputs["policy"] = "on_time"
    p1 = api.put(f"/periods/{p1['id']}/inputs", {"expected_revision": p1["revision"], "inputs": inputs})
    print("period 1", p1["id"], p1["status"], [i["en"] for i in p1["issues"] if i["severity"] == "error"])
    runs = wait_runs(api, [queue(api, p1["dataset_id"], "edd", 10),
                           queue(api, p1["dataset_id"], "hybrid", args.budget)])
    commit_best(api, p1, runs, "Fewest late orders; the rush order of 10 Nov is covered from stock. "
                               "Approved in the Friday planning meeting.")
    # Its last delivery is today (Sat 21 Nov): close it so its orders leave the book as delivered,
    # otherwise they are carried into the next period as overdue.
    p1 = api.post(f"/periods/{p1['id']}/close")
    print("period 1", p1["status"])

    # Period 2 (23 Nov - 6 Dec): planned live in the demo; opening stock = projected end of period 1.
    p2 = api.post(f"/periods/{p1['id']}/rollover", {"name": "Weeks 48-49"})
    print("period 2", p2["id"], p2["status"], p2["counts"])

    # Factory version 2: a third CNC lathe from 7 Dec (after period 2).
    api.put(f"/factories/{fid}/config", {
        "expected_version": 1,
        "config": with_third_cnc(cfg),
        "effective_from": "2026-12-07",
        "note": "CNC lathe 3 commissioned (purchase order PO-2026-118)",
    })

    # Aggregate plan for the 4-stage research scenario (Advanced section).
    datasets = api.get("/master-data/datasets?limit=10&owner=standalone")["items"]
    if datasets:
        api.post("/production-plans", {"dataset_id": datasets[0]["id"], "period_start": 0,
                                       "bucket_minutes": 1440})

    (args.out / "new_orders.csv").write_text(new_orders_csv(orders), encoding="utf-8")
    (args.out / "seed_result.json").write_text(json.dumps(
        {"factory_id": fid, "period1": p1["id"], "period2": p2["id"], "orders": len(orders)}, indent=2))
    print("done")


if __name__ == "__main__":
    main()
