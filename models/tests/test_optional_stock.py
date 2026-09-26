import unittest

from models.optional_stock.model import (
    build_demo_instance,
    solve_phase1,
    solve_phase2,
    validate_result,
)


class OptionalStockPolicy(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_demo_instance()
        cls.baseline = solve_phase1(cls.data, seconds=5, seed=11)

    def test_low_holding_cost_uses_bounded_spare_capacity(self):
        result = solve_phase2(
            self.data,
            self.data["cost_scenarios"]["low_holding_cost"],
            self.baseline,
            seconds=5,
            seed=11,
        )
        self.assertTrue(validate_result(self.data, result, self.baseline)["valid"])
        self.assertEqual(result["selected_optional_quantity"], 120)
        self.assertEqual(result["metrics"]["end_inventory"], self.data["max_inventory"])
        self.assertGreater(result["metrics"]["costs"]["saving_vs_no_optional"], 0)
        self.assertIn("WIP_AFTER_CNC_1", result["selected_optional_lots"])

    def test_high_holding_cost_keeps_capacity_idle(self):
        result = solve_phase2(
            self.data,
            self.data["cost_scenarios"]["high_holding_cost"],
            self.baseline,
            seconds=5,
            seed=11,
        )
        self.assertTrue(validate_result(self.data, result, self.baseline)["valid"])
        self.assertEqual(result["selected_optional_quantity"], 0)
        self.assertEqual(result["metrics"]["costs"]["saving_vs_no_optional"], 0)

    def test_optional_lots_never_worsen_required_tardiness(self):
        for costs in self.data["cost_scenarios"].values():
            result = solve_phase2(self.data, costs, self.baseline, seconds=5, seed=11)
            self.assertEqual(result["tardiness_by_order"], self.baseline["tardiness_by_order"])

    def test_all_casting_is_released_at_horizon_start_and_respects_calendars(self):
        result = solve_phase2(
            self.data,
            self.data["cost_scenarios"]["low_holding_cost"],
            self.baseline,
            seconds=5,
            seed=11,
        )
        shifts_by_lot = {}
        for row in result["rows"]:
            shifts_by_lot.setdefault(row["lot"], set()).add(row["shift"])
        self.assertTrue(shifts_by_lot)
        self.assertTrue(all(lot["release"] == 0 for lot in self.data["lots"]))
        self.assertTrue(validate_result(self.data, result, self.baseline)["valid"])

    def test_operation_can_continue_across_staffed_shift_handoff(self):
        result = solve_phase2(
            self.data,
            self.data["cost_scenarios"]["low_holding_cost"],
            self.baseline,
            seconds=5,
            seed=11,
        )
        crossing_cnc = [
            row
            for row in result["rows"]
            if row["stage"] == "cnc" and row["block_start"] < 480 < row["end"]
        ]
        self.assertEqual(len(crossing_cnc), 1)
        self.assertEqual(crossing_cnc[0]["start_shift"], "SHIFT_1")
        self.assertEqual(crossing_cnc[0]["end_shift"], "SHIFT_2")
        self.assertLess(crossing_cnc[0]["processing_start"], 480)

        shift1 = next(item for item in result["metrics"]["by_shift"] if item["shift"] == "SHIFT_1")
        shift2 = next(item for item in result["metrics"]["by_shift"] if item["shift"] == "SHIFT_2")
        self.assertGreater(shift1["required_processing_minutes"], 0)
        self.assertGreater(shift2["required_processing_minutes"], 0)

    def test_initial_cnc_wip_fills_paint_capacity_in_shift_1(self):
        result = solve_phase2(
            self.data,
            self.data["cost_scenarios"]["low_holding_cost"],
            self.baseline,
            seconds=5,
            seed=11,
        )
        wip_rows = [row for row in result["rows"] if row["lot"] == "WIP_AFTER_CNC_1"]
        self.assertEqual({row["stage"] for row in wip_rows}, {"paint", "qc"})
        paint = next(row for row in wip_rows if row["stage"] == "paint")
        self.assertEqual(paint["start_shift"], "SHIFT_1")
        self.assertLessEqual(paint["end"], 480)


if __name__ == "__main__":
    unittest.main()
