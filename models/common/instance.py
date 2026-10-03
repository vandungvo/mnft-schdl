from __future__ import annotations

import copy
import hashlib
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "input" / "wheel_factory.json"
STAGES = ("cast", "cnc", "paint", "qc")
BTP_STAGES = STAGES[:-1]  # cast, cnc, paint: stages that hold semi-finished (BTP) stock


def save_json(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load(path=DEFAULT_INPUT):
    data = upgrade_input(json.loads(Path(path).read_text(encoding="utf-8")))
    if data.get("schema_version") == 5:
        # Fixed runs per stage (dataset/wheel-factory-small/model_input.json):
        # a separate engine, see models/common/stage_runs/.
        from .stage_runs.instance import check
        return check(data)
    check_input(data)
    return data


def upgrade_input(data):
    """Explicit schema_version 3 -> 4 conversion; any other version passes through.

    v3 keyed cast/cnc/paint machines by FINAL product; v4 keys them by the BTP
    code that stage produces (see stage_item). The relabel goes through
    btp_routing. If two products route to one code but v3 gave them different
    rates/setups (e.g. a colour changeover at cast), the old data is ambiguous
    and is rejected rather than guessed. Returns a new dict; the input (e.g. a
    stored run snapshot) is never modified.
    """
    if data.get("schema_version") != 3:
        return data
    data = copy.deepcopy(data)
    routing = data.get("btp_routing", {})

    def put(target, key, value, where):
        if key in target and target[key] != value:
            raise ValueError(f"Cannot upgrade to schema_version 4: {where} maps two products "
                             f"onto '{key}' with different values ({target[key]} vs {value})")
        target[key] = value

    for mid, machine in data["machines"].items():
        stage = machine["stage"]
        if stage not in BTP_STAGES:
            continue
        item = lambda key: routing[key][stage] if key in routing else key  # noqa: E731
        rates = {}
        for p, v in machine["minutes_per_unit"].items():
            put(rates, item(p), v, f"{mid}.minutes_per_unit")
        matrix = {}
        for prev, row in machine["setup"].items():
            for p, v in row.items():
                put(matrix.setdefault(item(prev), {}), item(p), v, f"{mid}.setup[{item(prev)}]")
        machine["minutes_per_unit"], machine["setup"] = rates, matrix
        machine["initial_product"] = item(machine["initial_product"])
    data["schema_version"] = 4
    return data


def digest(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


def stage_item(data, lot, stage):
    """Code a machine at `stage` actually works on (schema_version 4).

    cast/cnc/paint: the BTP code that stage PRODUCES for the lot's product
    (btp_routing), e.g. F_SILVER and F_BLACK both cast F_CAST. qc: the finished
    product itself. Machine speed, setup matrix and eligibility are keyed by this
    code, never by the final product, so colour-blind stages cannot carry
    colour-specific setups or eligibility.
    """
    if stage in BTP_STAGES:
        return data["btp_routing"][lot["product"]][stage]
    return lot["product"]


def duration(data, lot, machine):
    spec = data["machines"][machine]
    item = stage_item(data, lot, spec["stage"])
    return math.ceil(lot["quantity"] * spec["minutes_per_unit"][item] + spec["fixed_minutes"])


def setup(data, machine, previous, item):
    """`previous`/`item` are stage items (see stage_item) or a declared machine state."""
    return data["machines"][machine]["setup"][previous][item]


def eligible(data, lot, stage):
    item = stage_item(data, lot, stage)
    return [m for m, spec in data["machines"].items()
            if spec["stage"] == stage and item in spec["minutes_per_unit"]]


def technical_surplus(data):
    """Per product: units mandatory lots make beyond their order allocations (A02)."""
    allocated = {}
    for order in data["orders"]:
        for lid, qty in order["lot_allocations"].items():
            allocated[lid] = allocated.get(lid, 0) + qty
    out = {p: 0 for p in data["products"]}
    for lot in data["lots"]:
        if not lot.get("optional"):
            out[lot["product"]] += lot["quantity"] - allocated.get(lot["id"], 0)
    return out


def pull_ahead_cap(data):
    """Per product: how many units reserve work may make ahead of time, or None.

    Contract-manufacturing policy (A08): reserve production is "làm trước" for
    confirmed long-term orders beyond the horizon, never speculative stock. So
    chosen reserve lots + reserve BTP runs of product p may not exceed p's
    long-term demand minus what mandatory lots already over-produce for p.
    None = dataset declares no long_term_orders (reserve bounded only by
    max_surplus / inventory_cap, the pre-policy behaviour).
    """
    if "long_term_orders" not in data:
        return None
    demand = {p: 0 for p in data["products"]}
    for order in data["long_term_orders"]:
        demand[order["product"]] += order["quantity"]
    tech = technical_surplus(data)
    return {p: max(0, demand[p] - tech[p]) for p in data["products"]}


def stage_items(data, stage):
    """Every code a machine at `stage` may legitimately be keyed by.

    BTP stage: any catalogued BTP code not routed at a DIFFERENT stage (a code
    no product routes to yet is allowed, so re-routing a product never strands a
    machine). qc: finished products.
    """
    if stage in BTP_STAGES:
        elsewhere = {codes[s] for codes in data["btp_routing"].values() for s in BTP_STAGES if s != stage}
        return set(data.get("btp_codes", [])) - elsewhere
    return set(data["products"])


def _check_routing(data):
    """A09 routing must give every stage an unambiguous input.

    Input of stage k = output of stage k-1, so two products that share a code at
    stage k must share the code at every earlier stage (routes may only split
    going downstream, never merge); otherwise one F_CNC run would not know which
    cast pool to draw from. A code also belongs to exactly one stage.
    """
    routing = data["btp_routing"]
    owner = {}
    for p in data["products"]:
        assert all(s in routing.get(p, {}) for s in BTP_STAGES), f"Missing BTP routing for '{p}'"
    for p, codes in routing.items():
        for s in BTP_STAGES:
            prior = owner.setdefault(codes[s], s)
            assert prior == s, f"BTP code '{codes[s]}' used at both '{prior}' and '{s}'"
    assert not set(owner) & set(data["products"]), "BTP codes must differ from finished product codes"
    products = list(routing)
    for i, p in enumerate(products):
        for q in products[i+1:]:
            for k, s in enumerate(BTP_STAGES):
                if routing[p][s] == routing[q][s]:
                    for earlier in BTP_STAGES[:k]:
                        assert routing[p][earlier] == routing[q][earlier], (
                            f"'{p}' and '{q}' share '{routing[p][s]}' at {s} but differ at {earlier}: "
                            f"ambiguous input for {s}")


def _check_machine_keys(data):
    """schema_version 4: machine data keyed by stage item, never by final product at a BTP stage."""
    for mid, spec in data["machines"].items():
        valid = stage_items(data, spec["stage"])
        rates = set(spec["minutes_per_unit"])
        assert rates <= valid, (f"{mid}: minutes_per_unit keys {sorted(rates - valid)} are not "
                                f"{spec['stage']}-stage items {sorted(valid)}")
        states = {spec["initial_product"]}
        if "mold" in spec:
            states.add(spec["mold"]["after_maintenance"])
        # A row is either one of this machine's items or a pure machine state
        # (INITIAL, CLEAN, ...); a product/BTP code from another stage is a keying error.
        codes = set(data["products"]) | set(data.get("btp_codes", []))
        for prev, row in spec["setup"].items():
            assert prev in valid or prev not in codes, f"{mid}: setup row '{prev}' is not a {spec['stage']} item"
            assert set(row) <= valid, f"{mid}: setup row '{prev}' has non-{spec['stage']} items {sorted(set(row) - valid)}"
            assert rates <= set(row), f"{mid}: setup row '{prev}' misses {sorted(rates - set(row))}"
        for state in states:
            assert state in spec["setup"], f"{mid}: missing setup row for state '{state}'"


def check_input(data):
    """Reject inputs outside the explicit experimental contract before solving."""
    lots = {l["id"]: l for l in data["lots"]}
    assert len(lots) == len(data["lots"]), "Duplicate lot ids"
    assert len({o["id"] for o in data["orders"]}) == len(data["orders"]), "Duplicate order ids"
    assert data["stages"] == list(STAGES)
    assert data.get("schema_version") == 4, "schema_version 4 required: machine data keyed by stage item"
    _check_routing(data)
    _check_machine_keys(data)
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
    # A08/4.3.2: an optional (reserve) lot is never tied to an order's
    # lot_allocations by construction -- it exists to fill idle capacity /
    # safety stock, not a specific order -- so it is exempt from the
    # "every lot backs some order" rule that mandatory lots must satisfy.
    assert all(l.get("optional") or (0 < allocated[lid] <= l["quantity"]) for lid,l in lots.items())
    assert all(initial[p] <= data["initial_inventory"][p] for p in initial)
    # Static part of A02/R04: technical surplus of MANDATORY lots is fixed by the
    # input. Reserve lots only count once chosen, so the solver/validator enforce
    # technical + chosen reserve <= max_surplus (an unchosen candidate costs nothing).
    assert sum(technical_surplus(data).values()) <= data["max_surplus"], "Technical surplus exceeds max_surplus"
    long_term_ids = [o["id"] for o in data.get("long_term_orders", [])]
    assert len(set(long_term_ids)) == len(long_term_ids), "Duplicate long_term_orders ids"
    assert not set(long_term_ids) & {o["id"] for o in data["orders"]}, "long_term_orders id collides with an order"
    for order in data.get("long_term_orders", []):
        assert order["product"] in data["products"], f"long_term_orders '{order['id']}': unknown product"
        assert order["quantity"] > 0, f"long_term_orders '{order['id']}': quantity must be positive"
        # Beyond this run's horizon by definition; in-horizon demand belongs in `orders`.
        assert order["due"] > data["horizon"], f"long_term_orders '{order['id']}': due must be after the horizon"
    assert data.get("transfer_minutes", 0) >= 0, "transfer_minutes must be non-negative"
    # BTP (semi-finished) catalog + routing (A09): a btp_code is a free-standing
    # identity, distinct from finished product codes, that one or more
    # (product, stage in {cast,cnc,paint}) routings can share.
    btp_codes_list = data.get("btp_codes", [])
    assert len(set(btp_codes_list)) == len(btp_codes_list), "Duplicate BTP codes"
    btp_codes = set(btp_codes_list)
    btp_routing = data.get("btp_routing", {})
    for p in data["products"]:
        assert p in data.get("product_color", {}), f"Missing catalog color for product '{p}'"
        assert p in data.get("product_line", {}), f"Missing catalog line for product '{p}'"
        for s in BTP_STAGES:
            code = btp_routing.get(p, {}).get(s)
            assert code is not None, f"Missing BTP routing for ({p}, {s})"
            assert code in btp_codes, f"BTP routing ({p}, {s}) references unknown code '{code}'"
    inventory_btp = data.get("inventory_btp", {})
    btp_capacity = data.get("btp_capacity", {})
    for code, qty in inventory_btp.items():
        assert code in btp_codes, f"inventory_btp references unknown BTP code '{code}'"
        assert qty >= 0
    for code, cap in btp_capacity.items():
        assert code in btp_codes, f"btp_capacity references unknown BTP code '{code}'"
        assert cap > 0
    # Every lot runs every stage (mandatory-lot model); a given lot's own stage-k
    # production always resolves to the SAME code as its own stage-(k+1)
    # consumption (both via btp_routing[lot.product][stage_k]), so no schedule can
    # create BTP surplus beyond declared initial stock, even when products share a
    # code — summing per-code (not per-product) avoids double counting shared codes.
    assert sum(inventory_btp.values()) <= data.get("max_surplus_btp", 0)
    # R04: optional per-product cap on finished-goods inventory ("trần tồn theo
    # sản phẩm"). Absent = uncapped (unchanged pre-A08 behaviour).
    inventory_cap = data.get("inventory_cap", {})
    for p, cap in inventory_cap.items():
        assert p in data["products"], f"inventory_cap references unknown product '{p}'"
        assert cap > 0 and cap >= data["initial_inventory"][p], f"inventory_cap for '{p}' below opening stock"
    # A08/4.3.2-4.3.3: optional (reserve) work generated up front as a finite set
    # of candidates -- the solver only gets a chosen/not-chosen decision per
    # candidate, it never invents lot sizes or run counts itself (mục 3.2 keeps
    # joint lot-size optimisation out of scope).
    for run in data.get("optional_btp_runs", []):
        assert run["id"] not in lots, f"optional_btp_runs id '{run['id']}' collides with a lot id"
        assert run["product"] in data["products"], f"optional_btp_runs references unknown product '{run['product']}'"
        assert run["stage"] in BTP_STAGES, f"optional_btp_runs stage must be one of {BTP_STAGES}"
        assert run["quantity"] >= data["minimum_lot"] and run["release"] >= 0
        assert eligible(data, run, run["stage"]), f"optional_btp_runs '{run['id']}': missing eligible machine"
        if run["stage"] == "cast":
            assert len(eligible(data, run, "cast")) == 1, "One dedicated casting machine per family required"
            mold = data["machines"][eligible(data, run, "cast")[0]]["mold"]
            assert math.ceil(run["quantity"]/mold["cavities"]) <= mold["limit_cycles"], \
                f"optional_btp_runs '{run['id']}': exceeds mold cycle limit"
    run_ids = [r["id"] for r in data.get("optional_btp_runs", [])]
    assert len(set(run_ids)) == len(run_ids), "Duplicate optional_btp_runs ids"
    policy = data.get("reserve_policy")
    if policy is not None:
        for p in policy.get("finished_products", []):
            assert p in data["products"], f"reserve_policy.finished_products: unknown product '{p}'"
        for p, stages in policy.get("btp_products", {}).items():
            assert p in data["products"], f"reserve_policy.btp_products: unknown product '{p}'"
            assert all(s in BTP_STAGES for s in stages), f"reserve_policy.btp_products['{p}']: bad stage"
        for mid, shift_keys in policy.get("closable_shifts", {}).items():
            assert mid in data["machines"], f"reserve_policy.closable_shifts: unknown machine '{mid}'"
        assert policy.get("finished_lot_size", data["minimum_lot"]) >= data["minimum_lot"]
        assert policy.get("btp_run_size", data["minimum_lot"]) >= data["minimum_lot"]
    for machine in data["machines"].values():
        closable_ids = {s["id"] for s in machine["shifts"] if s.get("closable")}
        for window in machine["windows"]:
            if window.get("closable"):
                assert window["shift"] in closable_ids, "closable window must belong to a closable shift"


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
        # schema_version 4: key by stage item. Every product has its own code at every
        # stage here (no sharing), so this is a pure relabel of the product-keyed formula.
        item = lambda x: f"{x}_{stage.upper()}" if stage in BTP_STAGES and x in products else x
        matrix = {item(prev): {item(p): v for p, v in row.items()} for prev, row in matrix.items()}
        machines[mid] = {"stage": stage, "minutes_per_unit": {item(p): rate for p in allowed},
                         "fixed_minutes": fixed, "initial_product": item(allowed[0]), "setup": matrix,
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
    data = {"schema_version": 4, "name": "wheel_factory_48_lots_2weeks", "seed": seed,
            "origin": "2026-09-21T00:00:00+07:00", "time_unit": "minute", "horizon": 14 * 1440,
            "working_days": days, "stages": list(STAGES), "products": products,
            "product_color": {p: p.split("_")[1] for p in products},
            "product_line": {p: p.split("_")[0] for p in products},
            "initial_inventory": {p: 18 for p in products}, "safety_stock": {p: 30 for p in products},
            "btp_codes": [f"{p}_{s.upper()}" for p in products for s in BTP_STAGES],
            "btp_routing": {p: {s: f"{p}_{s.upper()}" for s in BTP_STAGES} for p in products},
            "inventory_btp": {}, "btp_capacity": {}, "max_surplus_btp": 0, "transfer_minutes": 10,
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
                "No WIP at origin; material available at release; no scrap or labor capacity.",
                "Fixed 10-minute transfer lag between adjacent stages (cast->cnc->paint->qc) before "
                "BTP is available downstream; no explicit transportation resource/routing modeled."]}
    return data


if __name__ == "__main__":
    save_json(DEFAULT_INPUT, build())
    print(DEFAULT_INPUT)
