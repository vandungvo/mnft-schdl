"""Small exact case and adversarial validation tests; no benchmark speed assertions."""
import copy
import unittest

from models.common.instance import build, STAGES
from models.common.decoder import decode
from models.common.evaluate import evaluate, validate


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

    def test_precedence_detected(self):
        rows = copy.deepcopy(self.rows)
        row = next(r for r in rows if r["stage"] == "qc")
        delta = row["block_start"]
        for field in ("block_start","start","end"):
            row[field] -= delta
        self.assertTrue(any("precedence" in e for e in validate(self.data,rows)["errors"]))

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
