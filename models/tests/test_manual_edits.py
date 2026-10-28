"""Planner edits of a schema-5 schedule (models/common/stage_runs/manual.py)."""
import copy
import unittest
from pathlib import Path

from models.common.instance import load
from models.common.stage_runs.experiment import execute
from models.common.stage_runs.decoder import decode
from models.common.stage_runs.evaluate import validate
from models.common.stage_runs.instance import eligible
from models.common.stage_runs.manual import EditError, apply_edits, issues_of, sequence_of

DATA = load(Path(__file__).resolve().parents[2] / "dataset" / "wheel-factory-small" / "model_input.json")
RUNS = {r["id"]: r for r in DATA["runs"]}


def key(rows):
    return sorted((r["run"], r["machine"], r["block_start"], r["mold"]) for r in rows)


def movable(rows):
    """A run, its machine and another machine that can make it."""
    for row in rows:
        others = [m for m in eligible(DATA, RUNS[row["run"]]) if m != row["machine"]]
        if others:
            return row["run"], row["machine"], others[0]
    raise AssertionError("no movable run in the fixture")


class ManualEdits(unittest.TestCase):
    def test_unedited_plan_rebuilds_the_same_schedule(self):
        # CP-SAT deliberately starts some runs late (to share shifts): anchoring keeps them there.
        rows_cp, _ = execute(DATA, "cp_sat_hint", 6, 11)
        for base in (decode(DATA, "edd"), decode(DATA, "fifo"), rows_cp):
            rows = apply_edits(DATA, base, sequence_of(base))
            self.assertEqual(key(rows), key(base))

    def test_moving_a_run_keeps_it_valid_and_only_pushes_what_it_must(self):
        base = decode(DATA, "edd")
        rid, source, target = movable(base)
        sequence = sequence_of(base)
        sequence[source].remove(rid)
        sequence.setdefault(target, []).insert(0, rid)
        rows = apply_edits(DATA, base, sequence, moved=[rid])
        self.assertTrue(validate(DATA, rows)["valid"])
        self.assertEqual(next(r for r in rows if r["run"] == rid)["machine"], target)
        before = {r["run"]: r["block_start"] for r in base}
        untouched = [r for r in rows if r["run"] != rid]
        self.assertTrue(all(r["block_start"] >= before[r["run"]] for r in untouched), "anchored runs never move earlier")

    def test_not_before_delays_a_run(self):
        base = decode(DATA, "edd")
        rid = base[0]["run"]
        later = base[0]["block_start"] + 240
        rows = apply_edits(DATA, base, sequence_of(base), not_before={rid: later})
        self.assertGreaterEqual(next(r for r in rows if r["run"] == rid)["block_start"], later)
        self.assertTrue(validate(DATA, rows)["valid"])

    def test_compact_left_shifts_an_unchanged_sequence(self):
        base = decode(DATA, "edd")
        delayed = apply_edits(DATA, base, sequence_of(base), not_before={base[0]["run"]: base[0]["block_start"] + 600})
        compacted = apply_edits(DATA, delayed, sequence_of(delayed), compact=True)
        self.assertTrue(validate(DATA, compacted)["valid"])
        self.assertLessEqual(sum(r["block_start"] for r in compacted), sum(r["block_start"] for r in delayed))

    def test_plan_errors_are_explicit(self):
        base = decode(DATA, "edd")
        rid, source, _ = movable(base)
        wrong = next(m for m in DATA["machines"] if m not in eligible(DATA, RUNS[rid]))
        cases = {
            "NOT_ELIGIBLE": lambda s: (s[source].remove(rid), s.setdefault(wrong, []).append(rid)),
            "DUPLICATE_RUN": lambda s: s[source].append(s[source][0]),
            "RUN_SET_CHANGED": lambda s: s[source].remove(rid),
            "UNKNOWN_MACHINE": lambda s: s.setdefault("NOPE", []),
        }
        for code, change in cases.items():
            sequence = copy.deepcopy(sequence_of(base))
            change(sequence)
            with self.assertRaises(EditError) as raised:
                apply_edits(DATA, base, sequence)
            self.assertEqual(raised.exception.code, code)

    def test_validator_messages_become_issue_codes(self):
        issues = issues_of(["F_SILVER: above stock_cap at checkpoint 1440", "BTP F_CAST negative at t=30", "x: something else"])
        self.assertEqual([i["code"] for i in issues], ["STOCK_CAP", "BTP_SHORT", "OTHER"])
        self.assertEqual((issues[0]["subject"], issues[0]["minute"]), ("F_SILVER", 1440))


if __name__ == "__main__":
    unittest.main()
