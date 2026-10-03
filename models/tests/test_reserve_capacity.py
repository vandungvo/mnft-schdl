"""A08/4.3.2-4.3.3: optional (reserve) lots, optional BTP runs, and closable
shifts. Small hand-built fixture (style of test_contract.py's single()/tiny())
so every number is traceable by hand, instead of hoping a big dataset's
economics happen to exercise every code path.
"""
import copy
import unittest

from models.common.cp_engine import solve
from models.common.decoder import decode
from models.common.evaluate import evaluate, validate
from models.common.instance import STAGES, check_input


def _base():
    """1 product, 4 dedicated single-purpose machines. CAST has an already-open
    100-minute shift S1 plus a CLOSABLE 100-minute shift S2. CNC/PAINT/QC each
    get one generous always-open window so they are never the bottleneck.
    Every BTP code starts pre-stocked large so BTP timing never binds -- this
    fixture is about lot/shift selection, not BTP choreography (covered
    elsewhere in test_contract.py)."""
    # schema_version 4: each machine is keyed by the item its stage produces.
    trivial_setup = lambda item: {item: {item: 0}, "CLEAN": {item: 0}}
    open_window = lambda wid, end: {"id": wid, "shift": "S", "start": 0, "end": end}
    machines = {
        "CAST": {
            "stage": "cast", "minutes_per_unit": {"P_CAST": 1}, "fixed_minutes": 0,
            "initial_product": "P_CAST", "setup": trivial_setup("P_CAST"),
            "windows": [{"id": 0, "shift": "S1", "start": 0, "end": 100},
                        {"id": 1, "shift": "S2", "start": 100, "end": 200, "closable": True}],
            "shifts": [{"id": "S1", "day": 0, "start": 0, "end": 100, "available_minutes": 100},
                       {"id": "S2", "day": 0, "start": 100, "end": 200, "available_minutes": 100, "closable": True}],
            "mold": {"id": "MOLD", "cavities": 1, "limit_cycles": 1000, "initial_cycles": 0,
                     "maintenance_minutes": 5, "after_maintenance": "CLEAN"},
        },
        "CNC": {"stage": "cnc", "minutes_per_unit": {"P_CNC": 1}, "fixed_minutes": 0,
                "initial_product": "P_CNC", "setup": trivial_setup("P_CNC"),
                "windows": [open_window(0, 1000)],
                "shifts": [{"id": "S", "day": 0, "start": 0, "end": 1000, "available_minutes": 1000}]},
        "PAINT": {"stage": "paint", "minutes_per_unit": {"P_PAINT": 1}, "fixed_minutes": 0,
                  "initial_product": "P_PAINT", "setup": trivial_setup("P_PAINT"),
                  "windows": [open_window(0, 1000)],
                  "shifts": [{"id": "S", "day": 0, "start": 0, "end": 1000, "available_minutes": 1000}]},
        "QC": {"stage": "qc", "minutes_per_unit": {"P": 1}, "fixed_minutes": 0,
               "initial_product": "P", "setup": trivial_setup("P"),
               "windows": [open_window(0, 1000)],
               "shifts": [{"id": "S", "day": 0, "start": 0, "end": 1000, "available_minutes": 1000}]},
    }
    return {
        "schema_version": 4, "name": "reserve_fixture", "seed": 1, "origin": "2026-01-01T00:00:00+07:00",
        "time_unit": "minute", "horizon": 1000, "working_days": [0], "stages": list(STAGES),
        "products": ["P"], "product_color": {"P": "P"}, "product_line": {"P": "P"},
        "initial_inventory": {"P": 0}, "safety_stock": {"P": 0},
        "btp_codes": ["P_CAST", "P_CNC", "P_PAINT"],
        "btp_routing": {"P": {"cast": "P_CAST", "cnc": "P_CNC", "paint": "P_PAINT"}},
        "inventory_btp": {"P_CAST": 1000, "P_CNC": 1000, "P_PAINT": 1000},
        "btp_capacity": {}, "max_surplus_btp": 3000, "transfer_minutes": 0,
        "checkpoints": [1000], "minimum_lot": 10, "max_surplus": 200,
        "machines": machines,
        "orders": [{"id": "O1", "product": "P", "release": 0, "due": 1000, "priority": 1,
                    "urgent": False, "quantity": 80, "initial_allocated": 0,
                    "lot_allocations": {"MQ": 80}}],
        "lots": [{"id": "MQ", "order": "O1", "product": "P", "quantity": 80, "release": 0}],
        "weights": {"makespan": 0, "weighted_tardiness": 0, "setup_minutes": 0,
                    "idle_minutes": 1, "safety_shortfall": 3},
        "assumptions": ["Synthetic fixture for A08 reserve-capacity tests."],
    }


def _with_reserve_lot(qty, weights_extra):
    d = _base()
    d["lots"].append({"id": "RL", "product": "P", "quantity": qty, "release": 0, "optional": True})
    d["weights"] = {**d["weights"], "reserve_production": 0, "surplus_holding": 0, "shift_opening": 0, **weights_extra}
    return d


class OptionalFinishedLot(unittest.TestCase):
    def test_fills_already_open_idle_without_opening_closable_shift(self):
        # RL=15 fits CAST's already-open S1 leftover (100-80=20 min); safety
        # stock set so choosing it clearly helps, with shift_opening priced high
        # enough that opening S2 would never pay off -- isolates the "fill
        # existing idle" path from the "open a new shift" path.
        d = _with_reserve_lot(15, {})
        d["safety_stock"]["P"] = 20
        d["weights"]["reserve_production"] = 1
        d["weights"]["shift_opening"] = 1000
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertIsNotNone(schedule)
        v = validate(d, schedule)
        self.assertTrue(v["valid"], v["errors"])
        self.assertEqual(meta["reserve_lots_chosen"], ["RL"])
        rl_cast = next(r for r in schedule if r["lot"] == "RL" and r["stage"] == "cast")
        self.assertEqual(rl_cast["shift"], "S1")
        metrics, _ = evaluate(d, schedule)
        self.assertEqual(metrics["reserve_lots_chosen"], ["RL"])
        self.assertEqual(metrics["shift_opening"], 0)
        self.assertAlmostEqual(metrics["objective"], meta["solver_objective"], places=2)

    def test_opens_closable_shift_when_it_relieves_safety_shortfall(self):
        # RL=95 cannot fit S1's 20-minute leftover -- it can only run by opening
        # S2. Safety stock is high enough that the shortfall relief outweighs
        # the leftover idle inside S2 plus both flat reserve/shift costs.
        d = _with_reserve_lot(95, {})
        d["safety_stock"]["P"] = 60
        d["weights"]["reserve_production"] = 1
        d["weights"]["shift_opening"] = 10
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertIsNotNone(schedule)
        v = validate(d, schedule)
        self.assertTrue(v["valid"], v["errors"])
        self.assertEqual(meta["reserve_lots_chosen"], ["RL"])
        rl_cast = next(r for r in schedule if r["lot"] == "RL" and r["stage"] == "cast")
        self.assertEqual(rl_cast["shift"], "S2")
        metrics, _ = evaluate(d, schedule)
        self.assertEqual(metrics["shift_opening"], 1)
        self.assertAlmostEqual(metrics["objective"], meta["solver_objective"], places=2)

    def test_mandatory_baselines_never_pick_reserve_lots(self):
        d = _with_reserve_lot(15, {})
        d["safety_stock"]["P"] = 20
        check_input(d)
        for rule in ("fifo", "edd", "spt"):
            schedule = decode(d, rule=rule)
            self.assertIsNotNone(schedule)
            self.assertEqual({r["lot"] for r in schedule}, {"MQ"})
            v = validate(d, schedule)
            self.assertTrue(v["valid"], v["errors"])


class OptionalBtpRun(unittest.TestCase):
    """A single-stage run only ever touches CAST here -- no cnc/paint/qc rows --
    so it isolates the "open a closable shift" trade-off from the multi-stage
    idle-filling a 4-stage reserve lot also brings, unlike OptionalFinishedLot.
    """

    def test_chosen_run_feeds_the_next_stage(self):
        # Forced via fixed_lots/hint (mechanism correctness, not economics --
        # nothing in this fixture makes a lone cast-stage run economically
        # necessary once MQ's own cast run already credits P_CAST).
        d = _base()
        d["optional_btp_runs"] = [{"id": "RB", "product": "P", "stage": "cast", "quantity": 10, "release": 0}]
        check_input(d)
        forced_hint = [
            {"lot": "RB", "stage": "cast", "machine": "CAST", "block_start": 0, "start": 0, "end": 10,
             "setup_minutes": 0, "maintenance_minutes": 0, "cycles_after": 10, "window": 0, "shift": "S1"},
            {"lot": "MQ", "stage": "cast", "machine": "CAST", "block_start": 10, "start": 10, "end": 90,
             "setup_minutes": 0, "maintenance_minutes": 0, "cycles_after": 90, "window": 0, "shift": "S1"},
        ]
        schedule, meta = solve(d, seconds=10, hint=forced_hint, fixed_lots={"RB", "MQ"})
        self.assertIsNotNone(schedule)
        v = validate(d, schedule)
        self.assertTrue(v["valid"], v["errors"])
        self.assertEqual(meta["reserve_btp_runs_chosen"], ["RB"])
        rb_cast = next(r for r in schedule if r["lot"] == "RB" and r["stage"] == "cast")
        self.assertEqual((rb_cast["block_start"], rb_cast["end"]), (0, 10))
        # RB has no cnc/paint/qc rows of its own (single-stage) -- only its cast
        # row exists, and its credit is folded into the SAME P_CAST pool MQ's
        # own cast run also feeds (A09 pooling), which _btp_violations checks.

    def test_declines_closable_shift_when_not_worth_it(self):
        # RB=95 cannot fit S1's 20-minute leftover (MQ already uses 80/100) --
        # only S2 (closable) could hold it. Nothing here benefits from RB's
        # output (P_CAST is already generously stocked; no tardiness/makespan
        # weight is active), so opening S2 would be pure cost with zero payoff.
        d = _base()
        d["optional_btp_runs"] = [{"id": "RB", "product": "P", "stage": "cast", "quantity": 95, "release": 0}]
        d["weights"]["reserve_production"] = 1
        d["weights"]["shift_opening"] = 10
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertIsNotNone(schedule)
        v = validate(d, schedule)
        self.assertTrue(v["valid"], v["errors"])
        self.assertEqual(meta["reserve_btp_runs_chosen"], [])
        self.assertEqual({r["lot"] for r in schedule}, {"MQ"})
        metrics, _ = evaluate(d, schedule)
        self.assertEqual(metrics["shift_opening"], 0)
        self.assertEqual(metrics["reserve_production"], 0)
        self.assertAlmostEqual(metrics["objective"], meta["solver_objective"], places=2)

    def test_unchosen_run_never_appears_or_costs_anything(self):
        d = _base()
        d["optional_btp_runs"] = [{"id": "RB", "product": "P", "stage": "cast", "quantity": 10, "release": 0}]
        d["weights"]["reserve_production"] = 1000  # make choosing it clearly not worth it
        d["weights"]["shift_opening"] = 0
        d["weights"]["surplus_holding"] = 0
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertIsNotNone(schedule)
        self.assertEqual(meta["reserve_btp_runs_chosen"], [])
        self.assertEqual({r["lot"] for r in schedule}, {"MQ"})


class PullAheadPolicy(unittest.TestCase):
    """Contract manufacturing (A08): reserve work is "làm trước" for confirmed
    long-term orders, capped per product; unchosen candidates cost no surplus."""

    def _two_reserve_lots(self):
        # Both 15-unit lots fit the closable S2 (free to open here) and relieve a
        # large safety shortfall, so without any cap the solver takes both.
        d = _with_reserve_lot(15, {"reserve_production": 1, "shift_opening": 0})
        d["lots"].append({"id": "RL2", "product": "P", "quantity": 15, "release": 0, "optional": True})
        d["safety_stock"]["P"] = 60
        return d

    def test_uncapped_control_takes_both(self):
        d = self._two_reserve_lots()
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertEqual(sorted(meta["reserve_lots_chosen"]), ["RL", "RL2"])
        self.assertTrue(validate(d, schedule)["valid"])

    def test_long_term_demand_caps_reserve_per_product(self):
        d = self._two_reserve_lots()
        d["long_term_orders"] = [{"id": "LT1", "product": "P", "quantity": 20, "due": 2000}]
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertEqual(len(meta["reserve_lots_chosen"]), 1)
        v = validate(d, schedule)
        self.assertTrue(v["valid"], v["errors"])
        self.assertEqual(evaluate(d, schedule)[0]["reserve_quantity"], 15)

    def test_no_long_term_demand_means_no_reserve(self):
        d = self._two_reserve_lots()
        d["long_term_orders"] = []
        check_input(d)
        _, meta = solve(d, seconds=10)
        self.assertEqual(meta["reserve_lots_chosen"], [])

    def test_validator_rejects_reserve_beyond_long_term_demand(self):
        d = self._two_reserve_lots()
        schedule, _ = solve(d, seconds=10)  # uncapped: both chosen (30 units)
        d["long_term_orders"] = [{"id": "LT1", "product": "P", "quantity": 20, "due": 2000}]
        v = validate(d, schedule)
        self.assertFalse(v["valid"])
        self.assertTrue(any("long-term demand cap" in e for e in v["errors"]), v["errors"])

    def test_unchosen_candidate_does_not_consume_max_surplus(self):
        d = _with_reserve_lot(15, {})
        d["max_surplus"] = 0  # MQ has no technical surplus; RL alone would exceed it
        check_input(d)  # a candidate is not production -- input stays valid
        schedule, meta = solve(d, seconds=10)
        self.assertEqual(meta["reserve_lots_chosen"], [])
        self.assertTrue(validate(d, schedule)["valid"])

    def test_long_term_order_inside_horizon_is_rejected(self):
        d = _base()
        d["long_term_orders"] = [{"id": "LT1", "product": "P", "quantity": 20, "due": 500}]
        with self.assertRaisesRegex(AssertionError, "after the horizon"):
            check_input(d)


class MandatoryMakespan(unittest.TestCase):
    """Mục 4.3.1: the objective uses mandatory makespan (latest mandatory QC);
    reserve work that ends later is reported via schedule_end, not penalised."""

    def test_reserve_work_does_not_stretch_mandatory_makespan(self):
        d = _with_reserve_lot(95, {"reserve_production": 1, "shift_opening": 10})
        d["safety_stock"]["P"] = 60  # makes RL (only fits the closable S2) worth it
        d["weights"]["makespan"] = 1
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertEqual(meta["reserve_lots_chosen"], ["RL"])
        metrics, _ = evaluate(d, schedule)
        mq_qc = next(r["end"] for r in schedule if r["lot"] == "MQ" and r["stage"] == "qc")
        self.assertEqual(metrics["mandatory_makespan"], mq_qc)
        self.assertEqual(metrics["makespan"], metrics["mandatory_makespan"])
        self.assertEqual(metrics["schedule_end"], max(r["end"] for r in schedule))
        self.assertGreater(metrics["schedule_end"], metrics["mandatory_makespan"])
        self.assertAlmostEqual(metrics["objective"], meta["solver_objective"], places=2)


class NoPhantomSetup(unittest.TestCase):
    def test_unchosen_item_carries_no_setup_when_idle_outweighs_setup(self):
        # idle weight > setup weight used to let the solver book fake setup on an
        # unchosen candidate to shrink idle; the objectives then disagreed.
        d = _with_reserve_lot(15, {"reserve_production": 1000})  # never worth choosing
        d["weights"]["idle_minutes"] = 5
        d["weights"]["setup_minutes"] = 1
        # A non-zero cell gives every `su` room to be inflated (bound = max setup).
        d["machines"]["CAST"]["setup"]["CLEAN"]["P_CAST"] = 20
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        self.assertEqual(meta["reserve_lots_chosen"], [])
        metrics, _ = evaluate(d, schedule)
        self.assertAlmostEqual(metrics["objective"], meta["solver_objective"], places=2)


class BtpCapacityTieBreak(unittest.TestCase):
    """R12: a same-instant credit is booked BEFORE the debit, so it counts toward
    the capacity peak. The solver must agree with the validator on that."""

    def test_same_instant_credit_counts_toward_capacity(self):
        d = _base()
        # 50 in P_CAST is not enough for MQ's 80-unit CNC run, so CNC must wait
        # for MQ's own cast credit; at that instant the level peaks at 50+80=130.
        d["inventory_btp"]["P_CAST"] = 50
        d["btp_capacity"] = {"P_CAST": 100}
        check_input(d)
        schedule, meta = solve(d, seconds=10)
        if schedule is not None:  # any schedule returned must pass the validator
            v = validate(d, schedule)
            self.assertTrue(v["valid"], v["errors"])
        self.assertEqual(meta["status"], "INFEASIBLE")


class ReserveValidatorContract(unittest.TestCase):
    def test_partial_optional_lot_is_rejected(self):
        d = _with_reserve_lot(15, {})
        d["safety_stock"]["P"] = 20
        check_input(d)
        schedule, _ = solve(d, seconds=10)
        rl_rows = [r for r in schedule if r["lot"] == "RL"]
        self.assertTrue(rl_rows)  # this scenario's optimum chooses RL
        broken = copy.deepcopy([r for r in schedule if r["lot"] != "RL" or r["stage"] != "qc"])
        v = validate(d, broken)
        self.assertFalse(v["valid"])

    def test_duplicate_row_for_mandatory_lot_is_rejected(self):
        d = _with_reserve_lot(15, {})
        d["safety_stock"]["P"] = 20
        check_input(d)
        schedule, _ = solve(d, seconds=10)
        mq_cast = next(r for r in schedule if r["lot"] == "MQ" and r["stage"] == "cast")
        duplicated = copy.deepcopy(schedule) + [copy.deepcopy(mq_cast)]
        v = validate(d, duplicated)
        self.assertFalse(v["valid"])


if __name__ == "__main__":
    unittest.main()
