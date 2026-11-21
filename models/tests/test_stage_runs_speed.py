"""Speed paths of the schema-5 engine: they must not change what is computed.

The decoder caches placements per class of interchangeable runs, the solver gets a hint
for every variable and never creates sequencing arcs that symmetry breaking rules out, and
`hybrid` chains rules -> SA portfolio -> CP-SAT. Each test pins the behaviour the speed-up
relies on.
"""
import hashlib
import json
import random
import unittest
from pathlib import Path

from models.common.experiment import execute, methods_for
from models.common.instance import load
from models.common.stage_runs.cp_engine import solve
from models.common.stage_runs.decoder import decode, prepare
from models.common.stage_runs.evaluate import evaluate, validate
from models.common.stage_runs.instance import calendar, eligible, reserve_groups
from models.common.stage_runs.search import initial_genome, portfolio

ROOT = Path(__file__).resolve().parents[2]
SMALL = load(ROOT / "dataset" / "wheel-factory-small" / "model_input.json")
TWO_WEEKS = load(ROOT / "dataset" / "wheel-factory-2weeks" / "model_input.json")


def genomes(data, count, seed):
    """Decoder inputs like the ones SA/GA produce: a walk of mutations from the EDD genome."""
    rng = random.Random(seed)
    runs = data["runs"]
    n = len(runs)
    options = sorted(reserve_groups(data))
    slots = [(i, mid) for i, run in enumerate(runs) for mid in eligible(data, run)]
    b0, d0, o0 = n, n + len(slots), n + len(slots) + n
    g = initial_genome(data) + [0.0] * len(slots) + [0.0] * n + [0.0] * len(options)
    for _ in range(count):
        for _ in range(rng.choice([1, 2, 4, 12])):
            u = rng.random()
            if u < .5:
                a, b = rng.sample(range(n), 2)
                g[a], g[b] = g[b], g[a]
            elif u < .65:
                g[b0 + rng.randrange(len(slots))] = rng.uniform(-600, 600)
            elif u < .92:
                g[d0 + rng.randrange(n)] = 0.0 if rng.random() < .4 else rng.uniform(0, 960)
            elif options:
                j = rng.randrange(len(options))
                g[o0 + j] = 1.0 - g[o0 + j]
        yield dict(priorities=g[:n], machine_bias={s: g[b0 + j] for j, s in enumerate(slots)},
                   delays={i: round(g[d0 + i]) for i in range(n) if g[d0 + i] >= .5},
                   options=tuple(o for j, o in enumerate(options) if g[o0 + j] > .5))


def digest(data, count):
    """One hash over the schedules of the three rules and `count` genomes."""
    h = hashlib.sha256()
    context = prepare(data)
    for kw in [dict(rule=r) for r in ("fifo", "edd", "spt")] + list(genomes(data, count, 7)):
        h.update(json.dumps(decode(data, **kw, context=context), sort_keys=True).encode())
    return h.hexdigest()[:16]


class DecoderIsUnchanged(unittest.TestCase):
    """Digests recorded from the plain decoder (one placement per run, no shared context)
    before placements were cached per class: the fast decoder must build the same rows."""

    def test_small_instance(self):
        self.assertEqual(digest(SMALL, 400), "be53739d36deb6dd")

    def test_two_week_instance(self):
        self.assertEqual(digest(TWO_WEEKS, 120), "20821ba216955dd4")

    def test_shared_context_gives_the_same_schedule(self):
        self.assertEqual(decode(SMALL, "edd", context=prepare(SMALL)), decode(SMALL, "edd"))

    def test_calendar_results_are_private_copies(self):
        machine = next(iter(SMALL["machines"]))
        windows, _ = calendar(SMALL, machine)
        windows[0]["start"] = -1
        windows.clear()
        self.assertGreaterEqual(calendar(SMALL, machine)[0][0]["start"], 0)


class SolverStartsFromTheHint(unittest.TestCase):
    def solve_logged(self, hint):
        lines = []
        rows, meta = solve(SMALL, seconds=6, seed=11, hint=hint, log=lines.append)
        self.assertIsNotNone(rows)
        self.assertTrue(validate(SMALL, rows)["valid"])
        self.assertAlmostEqual(evaluate(SMALL, rows)[0]["objective"], meta["solver_objective"], places=2)
        return "\n".join(lines)

    def test_every_variable_is_hinted(self):
        self.assertIn("The solution hint is complete and is feasible", self.solve_logged(decode(SMALL, "edd")))

    def test_hint_with_a_reserve_option_is_complete(self):
        option = sorted(reserve_groups(SMALL))[0]
        hint = decode(SMALL, "edd", options=(option,))
        self.assertTrue(validate(SMALL, hint)["valid"])
        self.assertIn("The solution hint is complete and is feasible", self.solve_logged(hint))

    def test_two_week_hint_is_complete(self):
        """The 2-week instance has machines of different speed in one stage and mold
        maintenance: the block-length bound must allow every valid block."""
        lines = []
        hint = decode(TWO_WEEKS, "edd")
        # stop at the first solution: that is the hinted schedule, loaded without any search
        rows, _ = solve(TWO_WEEKS, seconds=120, seed=11, hint=hint, workers=2, log=lines.append,
                        params={"stop_after_first_solution": True})
        self.assertIn("The solution hint is complete and is feasible", "\n".join(lines))
        self.assertIsNotNone(rows)
        self.assertEqual(evaluate(TWO_WEEKS, rows)[0]["objective"], evaluate(TWO_WEEKS, hint)[0]["objective"])


class Hybrid(unittest.TestCase):
    def test_never_worse_than_the_best_rule_and_reports_its_phases(self):
        from models.common.stage_runs.experiment import hybrid
        rows, meta = hybrid(SMALL, seconds=12, seed=11, workers=2, sa_processes=1)
        self.assertTrue(validate(SMALL, rows)["valid"])
        value = evaluate(SMALL, rows)[0]["objective"]
        rules = min(evaluate(SMALL, decode(SMALL, r))[0]["objective"] for r in ("fifo", "edd", "spt"))
        self.assertLessEqual(value, rules)
        self.assertEqual([p["phase"] for p in meta["phases"]], ["rules", "search", "cp_sat"])
        objectives = [p["objective"] for p in meta["phases"]]
        self.assertEqual(objectives, sorted(objectives, reverse=True), "a later phase never loses ground")
        self.assertEqual(meta["phases"][-1]["objective"], value)
        if "solver_objective" in meta:
            self.assertAlmostEqual(meta["solver_objective"], value, places=2)
        seconds = [h["seconds"] for h in meta["history"]]
        self.assertEqual(seconds, sorted(seconds))

    def test_registered_for_schema_5_only(self):
        self.assertIn("hybrid", methods_for(SMALL))
        self.assertNotIn("hybrid", methods_for({"schema_version": 4}))
        rows, meta = execute(SMALL, "hybrid", 6, 11, workers=1)
        self.assertTrue(validate(SMALL, rows)["valid"])
        self.assertEqual(meta["sa_processes"], 1)

    def test_portfolio_runs_one_search_per_seed(self):
        results = portfolio(SMALL, 2, [11, 1011])
        self.assertEqual(len(results), 2)
        for rows, meta in results:
            self.assertTrue(validate(SMALL, rows)["valid"])
            self.assertGreater(meta["evaluations"], 0)

    def test_portfolio_relay_keeps_what_a_round_reached(self):
        """Every seed starts round 2 from the best genome of round 1, so none ends worse than it."""
        from models.common.stage_runs.search import optimize
        first = optimize(SMALL, "sa", 1.5, 11, polish=False, keep_genome=True)[1]
        rows, _ = optimize(SMALL, "sa", 1.0, 12, start=first["genome"], polish=False)
        self.assertLessEqual(evaluate(SMALL, rows)[0]["objective"], first["objective"])
        for rows, meta in portfolio(SMALL, 3, [11, 1011], rounds=2):
            self.assertTrue(validate(SMALL, rows)["valid"])
            self.assertEqual(meta["relay_rounds"], 2)
            self.assertNotIn("genome", meta)
            objectives = [h["objective"] for h in meta["history"]]
            self.assertEqual(objectives, sorted(objectives, reverse=True))


if __name__ == "__main__":
    unittest.main()
