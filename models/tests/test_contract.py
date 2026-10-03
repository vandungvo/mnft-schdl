"""Small exact case and adversarial validation tests; no benchmark speed assertions."""
import copy
import unittest

from ortools.sat.python import cp_model

from models.common.instance import build, STAGES
from models.common.decoder import decode
from models.common.evaluate import evaluate, validate


class ReservoirSimultaneousEvents(unittest.TestCase):
    """Locks in the OR-Tools semantics C7b's implementation in cp_engine.py relies
    on: mathematical_model.md flags this as unverified ("chưa kiểm ngữ nghĩa sự
    kiện đồng thời"). Same-instant events must net out (merge) rather than be
    checked in an adversarial per-event order; distinct-time events must still
    respect real chronological order."""

    def test_same_instant_events_merge_net_effect(self):
        model = cp_model.CpModel()
        t = model.new_int_var(0, 100, "t")
        model.add_reservoir_constraint([t, t], [-3, 3], 0, 10)
        solver = cp_model.CpSolver()
        self.assertIn(solver.solve(model), (cp_model.OPTIMAL, cp_model.FEASIBLE))

    def test_same_instant_events_still_enforce_bounds(self):
        model = cp_model.CpModel()
        t = model.new_int_var(0, 100, "t")
        model.add_reservoir_constraint([t, t], [-5, 3], 0, 10)
        solver = cp_model.CpSolver()
        self.assertEqual(solver.solve(model), cp_model.INFEASIBLE)

    def test_distinct_times_require_production_before_consumption(self):
        consume_first = cp_model.CpModel()
        consume_first.add_reservoir_constraint([5, 10], [-3, 3], 0, 10)
        self.assertEqual(cp_model.CpSolver().solve(consume_first), cp_model.INFEASIBLE)

        produce_first = cp_model.CpModel()
        produce_first.add_reservoir_constraint([5, 10], [3, -3], 0, 10)
        self.assertIn(cp_model.CpSolver().solve(produce_first), (cp_model.OPTIMAL, cp_model.FEASIBLE))


def single():
    """One lot, zero initial BTP: its own casting run is the ONLY possible source
    for its own CNC run, so any transfer_minutes lag is forced and unambiguous."""
    d = build()
    d["lots"] = copy.deepcopy(d["lots"][:1])
    d["orders"] = []
    d["initial_inventory"] = {p: 0 for p in d["products"]}
    lot = d["lots"][0]
    lot["release"], lot["order"] = 360, "T0"
    d["orders"].append({"id": lot["order"], "product": lot["product"], "release": 360, "due": 1800,
                         "priority": 1, "quantity": lot["quantity"], "initial_allocated": 0,
                         "lot_allocations": {lot["id"]: lot["quantity"]}})
    d["checkpoints"] = [1440, 2880]
    d["horizon"] = 2880
    for machine in d["machines"].values():
        machine["windows"] = [w for w in machine["windows"] if w["end"] <= 2880]
        machine["shifts"] = [s for s in machine["shifts"] if s["end"] <= 2880]
    return d


def tiny():
    d = build()
    # Pick one lot each of two products, reset to a short self-contained instance.
    d["lots"] = copy.deepcopy(d["lots"][:2])
    d["orders"] = []
    d["initial_inventory"] = {p:0 for p in d["products"]}
    for i,l in enumerate(d["lots"]):
        l["release"] = 360
        l["order"] = f"T{i}"
        d["orders"].append({"id":l["order"],"product":l["product"],"release":360,"due":1800,
                             "priority":1,"quantity":l["quantity"],"initial_allocated":0,
                             "lot_allocations":{l["id"]:l["quantity"]}})
    d["checkpoints"] = [1440,2880]
    d["horizon"] = 2880
    for machine in d["machines"].values():
        machine["windows"] = [w for w in machine["windows"] if w["end"]<=2880]
        machine["shifts"] = [s for s in machine["shifts"] if s["end"]<=2880]
    return d


def cross_product_shared_code():
    """A09's actual example: F_SILVER and F_BLACK share one casting blank (same
    line, cast on the SAME machine, diverging only at paint) — route both
    products' cast stage to one shared BTP code instead of their own dedicated
    ones, so a CNC run of either product may consume BTP the OTHER produced."""
    d = build()
    first = next(l for l in d["lots"] if l["product"] == "F_SILVER")
    second = next(l for l in d["lots"] if l["product"] == "F_BLACK")
    d["lots"] = copy.deepcopy([first, second])
    d["orders"] = []
    d["initial_inventory"] = {p: 0 for p in d["products"]}
    for i, lot in enumerate(d["lots"]):
        lot["release"], lot["order"] = 360, f"T{i}"
        d["orders"].append({"id": lot["order"], "product": lot["product"], "release": 360, "due": 1800,
                             "priority": 1, "quantity": lot["quantity"], "initial_allocated": 0,
                             "lot_allocations": {lot["id"]: lot["quantity"]}})
    d["checkpoints"] = [1440, 2880]
    d["horizon"] = 2880
    for machine in d["machines"].values():
        machine["windows"] = [w for w in machine["windows"] if w["end"] <= 2880]
        machine["shifts"] = [s for s in machine["shifts"] if s["end"] <= 2880]
    shared = "F_SHARED_CAST"
    d["btp_codes"] = d["btp_codes"] + [shared]
    d["btp_routing"]["F_SILVER"]["cast"] = shared
    d["btp_routing"]["F_BLACK"]["cast"] = shared
    # schema_version 4: the casting machine is keyed by what it casts, so the two
    # colour-specific cast items collapse into the one shared blank (no changeover
    # between them -- they are physically the same part).
    old = {"F_SILVER_CAST", "F_BLACK_CAST"}
    cast = d["machines"]["CAST_F"]
    rate = cast["minutes_per_unit"]["F_SILVER_CAST"]
    cast["minutes_per_unit"] = {shared: rate}
    rows = {(shared if prev in old else prev): row for prev, row in cast["setup"].items()}
    cast["setup"] = {prev: {shared: 0 if prev == shared else row["F_SILVER_CAST"]} for prev, row in rows.items()}
    if cast["initial_product"] in old:
        cast["initial_product"] = shared
    d["btp_codes"] = [c for c in d["btp_codes"] if c not in old]
    return d


class BTPCodeSharing(unittest.TestCase):
    """A09: 1 BTP code CAN be shared by multiple finished products, not just by
    multiple lots of the same product (BTPTransferLag/decoder already covers the
    single-product interleave; this covers genuine cross-product pooling)."""

    def test_decoder_lets_either_product_consume_the_shared_pool(self):
        data = cross_product_shared_code()
        rows = decode(data, "edd")
        self.assertTrue(validate(data, rows)["valid"], rows)
        cast_rows = sorted((r for r in rows if r["stage"] == "cast"), key=lambda r: r["end"])
        cnc_rows = {r["lot"]: r for r in rows if r["stage"] == "cnc"}
        first_cast, second_cast = cast_rows
        # The SECOND lot's CNC may legitimately start using BTP the FIRST lot (a
        # DIFFERENT product) produced — cross-product pooling, not just same-lot.
        second_lot_cnc = cnc_rows[second_cast["lot"]]
        self.assertGreaterEqual(
            second_lot_cnc["block_start"], first_cast["end"] + data["transfer_minutes"],
        )

    def test_validator_flags_shortfall_shared_across_products(self):
        data = cross_product_shared_code()
        rows = copy.deepcopy(decode(data, "edd"))
        cast_rows = sorted((r for r in rows if r["stage"] == "cast"), key=lambda r: r["end"])
        earliest_cast = cast_rows[0]
        target = min((r for r in rows if r["stage"] == "cnc"), key=lambda r: r["block_start"])
        # Move it to start strictly before EITHER cast run has produced anything —
        # the shared pool is empty at that instant no matter which product needed it.
        shift = target["block_start"] - max(0, earliest_cast["end"] - 1)
        for field in ("block_start", "start", "end"):
            target[field] -= shift
        check = validate(data, rows)
        self.assertFalse(check["valid"])
        self.assertTrue(any("BTP" in e for e in check["errors"]), check["errors"])

    def test_cp_engine_pools_across_products(self):
        from models.common.cp_engine import solve
        data = cross_product_shared_code()
        hint = decode(data, "edd")
        rows, meta = solve(data, seconds=10, seed=11, hint=hint)
        self.assertIsNotNone(rows, meta)
        self.assertTrue(validate(data, rows)["valid"])


class BTPTransferLag(unittest.TestCase):
    """A09/R12 extension: BTP is only usable downstream transfer_minutes after the
    upstream run physically ends. Exercises all 3 independent sites that encode
    this rule: decoder.py (baselines), cp_engine.py (CP-SAT), evaluate.py (validator)."""

    def test_decoder_enforces_lag_when_stock_is_the_only_source(self):
        data = single()
        rows = decode(data, "edd")
        self.assertTrue(validate(data, rows)["valid"], rows)
        cast_row = next(r for r in rows if r["stage"] == "cast")
        cnc_row = next(r for r in rows if r["stage"] == "cnc")
        self.assertGreaterEqual(cnc_row["block_start"], cast_row["end"] + data["transfer_minutes"])

    def test_validator_rejects_schedule_that_skips_the_lag(self):
        data = single()
        rows = copy.deepcopy(decode(data, "edd"))
        cast_row = next(r for r in rows if r["stage"] == "cast")
        cnc_row = next(r for r in rows if r["stage"] == "cnc")
        # Pull CNC's block_start back to exactly cast's end (0-lag), violating C7b.
        shift = cnc_row["block_start"] - cast_row["end"]
        for field in ("block_start", "start", "end"):
            cnc_row[field] -= shift
        check = validate(data, rows)
        self.assertFalse(check["valid"])
        self.assertTrue(any("BTP" in e for e in check["errors"]), check["errors"])

    def test_cp_engine_respects_lag(self):
        from models.common.cp_engine import solve
        data = single()
        hint = decode(data, "edd")
        rows, meta = solve(data, seconds=10, seed=11, hint=hint)
        self.assertIsNotNone(rows, meta)
        self.assertTrue(validate(data, rows)["valid"])
        cast_row = next(r for r in rows if r["stage"] == "cast")
        cnc_row = next(r for r in rows if r["stage"] == "cnc")
        self.assertGreaterEqual(cnc_row["block_start"], cast_row["end"] + data["transfer_minutes"])


class Contract(unittest.TestCase):
    def setUp(self):
        self.data = build()
        self.rows = decode(self.data,"edd")

    def test_all_baselines_valid(self):
        for rule in ("fifo","edd","spt"):
            check = validate(self.data,decode(self.data,rule))
            self.assertTrue(check["valid"],check)

    def test_missing_operation_detected(self):
        self.assertFalse(validate(self.data,self.rows[:-1])["valid"])

    def test_machine_overlap_detected(self):
        rows = copy.deepcopy(self.rows)
        pairs = [r for r in rows if r["machine"] == "CNC_2"]
        a,b = pairs[:2]
        delta = a["block_start"]-b["block_start"]
        for field in ("block_start","start","end"):
            b[field] += delta
        self.assertTrue(any("overlap" in e for e in validate(self.data,rows)["errors"]))

    def test_maintenance_and_setup_detected(self):
        for field in ("maintenance_minutes","setup_minutes"):
            rows = copy.deepcopy(self.rows)
            row = next(r for r in rows if r[field]>0)
            row[field] = 0
            self.assertFalse(validate(self.data,rows)["valid"])

    def test_btp_shortfall_detected(self):
        """A10/R12: a stage's run may not consume BTP that has not been produced yet."""
        rows = copy.deepcopy(self.rows)
        row = next(r for r in rows if r["stage"] == "qc")
        delta = row["block_start"]
        for field in ("block_start","start","end"):
            row[field] -= delta
        self.assertTrue(any("BTP" in e for e in validate(self.data,rows)["errors"]))

    def test_same_lot_precedence_not_required(self):
        """A10: stage k+1 no longer needs to wait for its OWN lot's stage k to finish."""
        rows = decode(self.data,"edd")
        by_lot = {}
        for r in rows:
            by_lot.setdefault(r["lot"],{})[r["stage"]] = r
        interleaved = any(
            by_lot[lot][STAGES[k]]["block_start"] < by_lot[lot][STAGES[k-1]]["end"]
            for lot in by_lot for k in range(1,4)
        )
        self.assertTrue(interleaved, "expected at least one cross-lot BTP interleave in a 48-lot instance")
        self.assertTrue(validate(self.data,rows)["valid"])

    def test_lot_and_inventory_allocation(self):
        data = copy.deepcopy(self.data)
        data["orders"][0]["initial_allocated"] = 999
        self.assertFalse(validate(data,self.rows)["valid"])

    def test_idle_uses_entire_shift(self):
        metrics,details = evaluate(self.data,self.rows)
        self.assertEqual(metrics["idle_minutes"],sum(s["available"]-s["processing"]-s["setup"]-s["maintenance"] for s in details["shifts"]))
        self.assertLess(metrics["productive_utilization"],1)
        self.assertTrue(all(e["inventory"]>=0 for e in details["inventory_events"]))

    def test_cp_matches_independent_objective(self):
        from models.common.cp_engine import solve
        d = tiny()
        hint = decode(d,"edd")
        self.assertTrue(validate(d,hint)["valid"])
        rows,meta = solve(d,seconds=10,seed=11,hint=hint)
        self.assertIsNotNone(rows,meta)
        self.assertTrue(validate(d,rows)["valid"])
        self.assertAlmostEqual(evaluate(d,rows)[0]["objective"],meta["solver_objective"])
        self.assertLessEqual(meta["solver_objective"],evaluate(d,hint)[0]["objective"])


if __name__ == "__main__":
    unittest.main()


class StageItemKeying(unittest.TestCase):
    """schema_version 4: machine speed/setup/eligibility are keyed by what the
    stage produces (BTP code at cast/cnc/paint, finished product at qc)."""

    def test_product_keyed_btp_machine_is_rejected(self):
        from models.common.instance import check_input
        d = build()
        cast = d["machines"]["CAST_F"]
        cast["minutes_per_unit"]["F_SILVER"] = cast["minutes_per_unit"].pop("F_SILVER_CAST")
        with self.assertRaisesRegex(AssertionError, "not cast-stage items"):
            check_input(d)

    def test_routing_that_merges_downstream_is_rejected(self):
        from models.common.instance import check_input
        d = build()
        # Different cast blanks feeding ONE cnc code: a cnc run could not tell
        # which cast pool it draws from.
        d["btp_routing"]["F_BLACK"]["cnc"] = "F_SILVER_CNC"
        with self.assertRaisesRegex(AssertionError, "ambiguous input for cnc"):
            check_input(d)

    def test_shared_blank_has_no_colour_changeover_before_paint(self):
        import json
        from pathlib import Path
        path = Path(__file__).resolve().parents[2] / "dataset" / "wheel-factory-small" / "model_input.json"
        d = json.loads(path.read_text(encoding="utf-8"))
        # This dataset is schema_version 5 (runs of fixed size per stage, route
        # under `products`), which the schema-4 engine cannot load; read the
        # route and setup matrix directly instead of via instance.py helpers.
        silver, black = d["products"]["F_SILVER"]["route"], d["products"]["F_BLACK"]["route"]
        for stage, machine in (("cast", "CAST_1"), ("machining", "CNC_1")):
            self.assertEqual(silver[stage], black[stage])
            item = silver[stage]
            self.assertEqual(d["machines"][machine]["setup"][item][item], 0)
        self.assertGreater(d["machines"]["PAINT_1"]["setup"][silver["paint"]][black["paint"]], 0)
