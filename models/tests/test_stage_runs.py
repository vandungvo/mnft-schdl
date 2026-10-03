"""Schema-5 engine (models/common/stage_runs) on dataset/wheel-factory-small."""
import copy
import json
import unittest
from pathlib import Path

from models.common.instance import load
from models.common.experiment import execute
from models.common.stage_runs.decoder import decode
from models.common.stage_runs.evaluate import evaluate, validate
from models.common.stage_runs.cp_engine import solve

DATASET = Path(__file__).resolve().parents[2] / "dataset" / "wheel-factory-small"
DATA = load(DATASET / "model_input.json")
MANUAL = json.loads((DATASET / "manual_schedule.json").read_text(encoding="utf-8"))["schedule"]


def row(rows, run):
    return next(r for r in rows if r["run"] == run)


def errors_after(change):
    rows = copy.deepcopy(MANUAL)
    change(rows)
    return " | ".join(validate(DATA, rows)["errors"])


class Baselines(unittest.TestCase):
    def test_rolling_horizon_valid(self):
        from models.common.stage_runs.rolling import solve_rolling
        rows, meta = solve_rolling(DATA, seconds=10, seed=11, step_days=1, lookahead_days=2)
        check = validate(DATA, rows)
        self.assertTrue(check["valid"], check["errors"])
        self.assertGreater(len(meta["windows"]), 1, "the 3-day instance should be cut into several windows")

    def test_dispatch_rules_valid(self):
        for rule in ("fifo", "edd", "spt"):
            rows = decode(DATA, rule)
            self.assertIsNotNone(rows, rule)
            self.assertTrue(validate(DATA, rows)["valid"], rule)
            self.assertFalse(evaluate(DATA, rows)[0]["reserve_options_chosen"], "baselines never pull ahead")

    def test_manual_schedule_valid_and_scored(self):
        check = validate(DATA, MANUAL)
        self.assertTrue(check["valid"], check["errors"])
        metrics = evaluate(DATA, MANUAL)[0]
        self.assertEqual((metrics["objective_tier1"], metrics["objective_tier2"]), (160, 6356))
        self.assertEqual(metrics["activated_shifts"], 7)
        self.assertEqual(metrics["nonproductive_minutes"], metrics["available_minutes"] - metrics["processing_minutes"])
        self.assertEqual(metrics["reserve_options_chosen"], ["RB001"])

    def test_every_method_runs_through_the_common_entry_point(self):
        seconds = {"simulated_annealing": 3, "genetic_algorithm": 3, "cp_sat": 4, "cp_sat_hint": 8, "cp_lns": 12}
        for method in ("fifo", "edd", "spt", "simulated_annealing", "genetic_algorithm", "cp_sat_hint", "cp_lns"):
            rows, meta = execute(DATA, method, seconds.get(method, 1), 11)
            self.assertIsNotNone(rows, method)
            self.assertTrue(validate(DATA, rows)["valid"], method)


class Objective(unittest.TestCase):
    def test_tier_one_dominates(self):
        from models.common.stage_runs.evaluate import objective_terms
        scale = DATA["objective_tiers"]["scale"]
        worse_service = objective_terms(DATA, {**evaluate(DATA, MANUAL)[0], "safety_shortfall": 9})
        cheaper_ops = {**evaluate(DATA, MANUAL)[0], "nonproductive_minutes": 0, "setup_minutes": 0}
        self.assertGreater(worse_service["objective"], objective_terms(DATA, cheaper_ops)["objective"])
        self.assertLess(evaluate(DATA, decode(DATA, "fifo"))[0]["objective_tier2"], scale)

    def test_maintenance_is_never_rewarded(self):
        w = DATA["weights"]
        self.assertGreaterEqual(w.get("maintenance_minutes", 0), 0)
        self.assertNotIn("idle_minutes", w, "true idle would make setup/maintenance lower the score")


class Improvements(unittest.TestCase):
    def test_compact_keeps_validity_and_never_worsens(self):
        from models.common.stage_runs.compact import compact
        for rule in ("fifo", "edd"):
            rows = decode(DATA, rule)
            out = compact(DATA, rows, seconds=5)
            self.assertTrue(validate(DATA, out)["valid"])
            self.assertLessEqual(evaluate(DATA, out)[0]["objective"], evaluate(DATA, rows)[0]["objective"])

    def test_canonical_relabel_is_equivalent(self):
        from models.common.stage_runs.instance import canonical
        rows = decode(DATA, "spt")
        same = canonical(DATA, rows)
        self.assertTrue(validate(DATA, same)["valid"])
        self.assertEqual(evaluate(DATA, same)[0]["objective"], evaluate(DATA, rows)[0]["objective"])

    def test_delays_and_options_decode_to_whole_minutes(self):
        idx = {r["id"]: i for i, r in enumerate(DATA["runs"])}
        rows = decode(DATA, "edd", delays={idx["L003"]: 300}, options=("RB001",))
        self.assertTrue(validate(DATA, rows)["valid"])
        self.assertIn("R_CAST-RB001", {r["run"] for r in rows})
        self.assertGreaterEqual(row(rows, "L003")["block_start"], 300)

    def test_fractional_times_rejected(self):
        self.assertIn("whole minutes", errors_after(lambda rows: row(rows, "L003").update(block_start=2078.5)))


class CpModel(unittest.TestCase):
    def test_solver_objective_matches_evaluator(self):
        rows, meta = solve(DATA, seconds=8, seed=11, hint=decode(DATA, "edd"))
        self.assertIsNotNone(rows)
        self.assertTrue(validate(DATA, rows)["valid"])
        self.assertAlmostEqual(evaluate(DATA, rows)[0]["objective"], meta["solver_objective"], places=2)

    def test_fixed_runs_are_kept(self):
        from models.common.stage_runs.instance import canonical
        hint = canonical(DATA, decode(DATA, "edd"))
        fixed = {r["run"] for r in hint}
        rows, _ = solve(DATA, seconds=5, seed=3, hint=hint, fixed_runs=fixed)
        self.assertIsNotNone(rows)
        self.assertTrue(validate(DATA, rows)["valid"])
        # Reserve runs are not in the hint, so the solver may still add them.
        for r in (r for r in rows if r["run"] in fixed):
            h = row(hint, r["run"])
            self.assertEqual((r["machine"], r["start"], r["end"]), (h["machine"], h["start"], h["end"]))


class ValidatorCatches(unittest.TestCase):
    def test_missing_mandatory_run(self):
        self.assertIn("missing mandatory", errors_after(lambda rows: rows.remove(row(rows, "L003"))))

    def test_partial_reserve_option(self):
        extra = {**row(MANUAL, "R_CAST-RB001")}
        rows = [r for r in MANUAL if r["run"] != "R_CAST-RB001"]
        self.assertTrue(validate(DATA, rows)["valid"], "dropping a whole option is fine")
        rl = {"run": "RL001", "stage": "qc", "item": "F_SILVER", "machine": "QC_1", "block_start": 2200,
              "start": 2204, "end": 2239, "setup_minutes": 4, "maintenance_minutes": 0, "mold": None,
              "cycles_after": 0, "window": extra["window"], "shift": extra["shift"]}
        self.assertIn("all-or-nothing", " | ".join(validate(DATA, MANUAL + [rl])["errors"]))

    def test_machine_overlap(self):
        def move(rows):
            r = row(rows, "F_MACH-03")
            r.update(block_start=1300, start=1300, end=1468, machine="CNC_1")
        self.assertIn("overlap", errors_after(move))

    def test_wrong_setup(self):
        self.assertIn("setup", errors_after(lambda rows: row(rows, "L004").update(setup_minutes=0, start=2000, end=2035)))

    def test_mold_change_is_not_free(self):
        # F_CAST-02 on the same machine with the OTHER F mold: +60' change needed.
        self.assertIn("setup", errors_after(lambda rows: row(rows, "F_CAST-02").update(mold="MOLD_F1", cycles_after=48)))

    def test_missing_maintenance(self):
        def drop(rows):
            r = row(rows, "F_CAST-04")
            r.update(maintenance_minutes=0, setup_minutes=0, block_start=342, cycles_after=64)
        self.assertIn("maintenance", errors_after(drop))

    def test_btp_shortfall(self):
        # paint the last F black run before its machining output has arrived
        self.assertIn("negative", errors_after(lambda rows: row(rows, "F_BLACK_PAINT-01").update(block_start=1700, start=1700, end=1740)))

    def test_block_across_a_break(self):
        self.assertIn("window", errors_after(lambda rows: row(rows, "L003").update(block_start=2150, start=2154, end=2189)))

    def test_mold_on_two_machines_at_once(self):
        def clash(rows):
            r = row(rows, "R_CAST-01")
            r.update(mold="MOLD_F2", item="F_CAST")
        self.assertTrue(errors_after(clash))


if __name__ == "__main__":
    unittest.main()
