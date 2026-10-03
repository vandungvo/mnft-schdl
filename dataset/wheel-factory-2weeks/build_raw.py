"""Build raw_input.json (tier 1) for the 2-week instance from the small instance.

    python dataset/wheel-factory-2weeks/build_raw.py
    python dataset/wheel-factory-small/prepare.py dataset/wheel-factory-2weeks/raw_input.json dataset/wheel-factory-2weeks/model_input.json

Machines, molds, setups, run sizes, transfer delays and weights are copied
unchanged from ../wheel-factory-small/raw_input.json -- same factory, so scores
differ only because of horizon, demand and calendar. What changes:

  * horizon 14 days from Monday 2026-10-05, a stock checkpoint at every day end
  * Sundays (day 7 and 14) closed for every machine, furnaces included; furnaces run
    24/7 on other days, plus one planned 8 h furnace service (HT_2, day 9) and a
    4 h CNC_2 service (day 4)
  * the customer collects 3 times a week (Tue/Thu/Sat 16:00) -> 6 rounds x 4 products
    = 24 orders; quantities drawn once with a fixed seed around a base mix
  * one rush order (priority 4) per week; larger safety stocks and stock caps
  * release = due: goods are collected at the pickup time, never earlier
  * F_SILVER and R_BLACK open below safety stock; R-line WIP in proportion to demand
  * long-term orders for weeks 3-4 and a reserve policy with 5 pull-ahead options
"""
from __future__ import annotations

import copy
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
SMALL = HERE.parent / "wheel-factory-small" / "raw_input.json"
DAY = 1440
DAYS = 14
SEED = 20261005
BASE_MIX = {"F_SILVER": 64, "F_BLACK": 32, "R_SILVER": 48, "R_BLACK": 28}  # per pickup round
PICKUP_DAYS = [2, 4, 6, 9, 11, 13]  # Tue, Thu, Sat of both weeks (day 1 = Monday)
RUSH = {(2, "F_SILVER"), (9, "R_SILVER")}  # one priority-4 order per week
PRIORITY = {"F_SILVER": 3, "F_BLACK": 2, "R_SILVER": 2, "R_BLACK": 1}


def build():
    raw = copy.deepcopy(json.loads(SMALL.read_text(encoding="utf-8")))
    rng = random.Random(SEED)
    raw["name"] = "wheel_factory_5stages_2weeks"
    raw["origin"] = "2026-10-05T00:00:00+07:00"
    raw["horizon"] = DAYS * DAY
    raw["checkpoints"] = [d * DAY for d in range(1, DAYS + 1)]

    sundays = [[6 * DAY, 7 * DAY], [13 * DAY, 14 * DAY]]
    for spec in raw["machines"].values():  # the whole plant rests on Sunday, furnaces included
        spec["downtime"] = [list(x) for x in sundays]
    raw["machines"]["CNC_2"]["downtime"].insert(0, [3 * DAY + 480, 3 * DAY + 720])   # day 4, 08:00-12:00
    raw["machines"]["HT_2"]["downtime"].insert(1, [8 * DAY + 480, 8 * DAY + 960])     # day 9, 08:00-16:00

    # F_SILVER and R_BLACK open below safety stock (after a heavy shipping week), so the
    # plan has to rebuild it -- otherwise the safety-stock term can never bind.
    stock = {"F_SILVER": (18, 24, 160), "F_BLACK": (20, 12, 90), "R_SILVER": (30, 18, 120), "R_BLACK": (8, 12, 80)}
    for p, (init, safety, cap) in stock.items():
        raw["products"][p].update(initial_stock=init, safety_stock=safety, stock_cap=cap)
    # WIP per line roughly in proportion to its demand (R is about 80% of F)
    raw["btp"] = {"F_CAST": {"initial_stock": 16}, "R_CAST": {"initial_stock": 12},
                  "F_HEAT": {"initial_stock": 48}, "R_HEAT": {"initial_stock": 40},
                  "F_MACH": {"initial_stock": 12}, "R_MACH": {"initial_stock": 10},
                  "F_SILVER_PAINT": {"initial_stock": 6}, "F_BLACK_PAINT": {"initial_stock": 4},
                  "R_SILVER_PAINT": {"initial_stock": 5}, "R_BLACK_PAINT": {"initial_stock": 3}}

    orders, n = [], 0
    left = {p: max(0, s[0] - s[1]) for p, s in stock.items()}  # only stock above safety serves the first round
    for day in PICKUP_DAYS:
        for product, base in BASE_MIX.items():
            n += 1
            qty = int(round(base * rng.uniform(.75, 1.25) / 4)) * 4  # whole cartons of 4
            take = min(left[product], qty) if day == PICKUP_DAYS[0] else 0
            left[product] -= take
            rush = (day, product) in RUSH
            due = (day - 1) * DAY + (720 if rush else 960)
            # release = due: the customer collects at the agreed time, so finished
            # goods made early wait in stock (and count against stock_cap)
            orders.append({"id": f"O{n:03}", "product": product, "quantity": qty, "due": due,
                           "priority": 4 if rush else PRIORITY[product], "release": due,
                           "initial_allocated": take})
    raw["orders"] = orders
    raw["long_term_orders"] = [
        {"id": "LT001", "product": "F_SILVER", "quantity": 160, "due": 16 * DAY},
        {"id": "LT002", "product": "F_BLACK", "quantity": 60, "due": 18 * DAY},
        {"id": "LT003", "product": "R_SILVER", "quantity": 100, "due": 18 * DAY},
        {"id": "LT004", "product": "R_BLACK", "quantity": 40, "due": 20 * DAY}]
    raw["reserve_policy"] = {"F_SILVER": {"finished_lots": 2}, "F_BLACK": {"finished_lots": 1},
                             "R_SILVER": {"btp_runs": {"cast": 1}}, "R_BLACK": {"btp_runs": {"cast": 1}}}
    return raw


if __name__ == "__main__":
    out = HERE / "raw_input.json"
    out.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("OK, wrote", out)
