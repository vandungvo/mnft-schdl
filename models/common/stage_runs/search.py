"""Simulated Annealing / Genetic Algorithm over random keys (schema 5).

Genome = [priority per run] + [machine bias per (run, eligible machine), -600..600]
       + [delay per run, minutes the run waits past its earliest start, 0..960]
       + [one gene per reserve option, > 0.5 = pull ahead].
decoder.decode() builds the schedule; the delay genes let the search wait for an
already-open shift, and the option genes let it decide pull-ahead work (the
dispatch rules can do neither). The best schedule is polished by compact().
"""
from __future__ import annotations

import math
import random
import time
from .compact import compact
from .decoder import decode, prepare
from .evaluate import evaluate, validate
from .instance import eligible, reserve_groups, run_due

MAX_DELAY = 960
POLISH_SHARE = .15  # share of the budget kept for the final compaction
PULL_LATE = .25     # SA: share of moves aimed at an order that is late in the current schedule


def _sa(job):
    data, seconds, seed, start, polish = job
    return optimize(data, "sa", seconds, seed, start=start, polish=polish, keep_genome=True)


def relay_rounds(seconds):
    """Rounds of a portfolio of this length: one hand-over at half time, unless a round
    would be too short to search (a few seconds on a 2-week plan is a few dozen schedules).
    More hand-overs cost diversity: with three rounds one run in three ended with every
    seed in the same local optimum (one late order), with one or two rounds none did."""
    return 2 if seconds >= 16 else 1


def portfolio(data, seconds, seeds, rounds=None):
    """SA on several seeds at once, one process per seed: [(rows, meta)] in seed order.

    SA is single-threaded Python and its result varies a lot with the seed (on the 2-week
    instance, a minute gives anything from the best service level to two late orders), so
    spare cores are best spent on more seeds. The seeds run as a relay: the time is cut
    into `rounds`; after a round the worse half of the seeds restart from the best genome
    any of them reached, the better half carry on from their own. A lucky seed lifts the
    stragglers instead of finishing alone, and the other lineages stay different (when
    every seed adopted the leader, all eight ended in the same local optimum with one
    late order). Only the last round polishes its schedules (compaction). One seed runs
    plain SA in this process; if worker processes cannot be started, so does the first seed."""
    if len(seeds) == 1:
        return [optimize(data, "sa", seconds, seeds[0])]
    import multiprocessing
    from concurrent.futures import ProcessPoolExecutor
    from concurrent.futures.process import BrokenProcessPool
    rounds = rounds or relay_rounds(seconds)
    try:
        # spawn everywhere: the caller may be a multi-threaded server process
        with ProcessPoolExecutor(max_workers=len(seeds), mp_context=multiprocessing.get_context("spawn")) as pool:
            starts, evaluations, trails = [None] * len(seeds), [0] * len(seeds), [[] for _ in seeds]
            for r in range(rounds):
                last = r == rounds - 1
                results = list(pool.map(_sa, [(data, seconds / rounds, s + r, starts[k], last) for k, s in enumerate(seeds)]))
                for k, (_, meta) in enumerate(results):
                    evaluations[k] += meta["evaluations"]
                    trails[k] += [{**h, "seconds": h["seconds"] + r * seconds / rounds} for h in meta["history"]
                                  if not trails[k] or h["objective"] < trails[k][-1]["objective"]]
                    meta.update(evaluations=evaluations[k], history=trails[k], relay_rounds=rounds)
                ranked = sorted((k for k, (_, meta) in enumerate(results) if meta.get("genome")), key=lambda k: results[k][1]["objective"])
                for place, k in enumerate(ranked):
                    starts[k] = results[k if place < (len(seeds) + 1) // 2 else ranked[0]][1]["genome"]
            for _, meta in results:
                meta.pop("genome", None)
            return results
    except (OSError, BrokenProcessPool):
        return [optimize(data, "sa", seconds, seeds[0])]


def initial_genome(data):
    due = run_due(data)
    runs = data["runs"]
    order = sorted(range(len(runs)), key=lambda i: (due[runs[i]["id"]][0], -due[runs[i]["id"]][1], i))
    rank = {i: r for r, i in enumerate(order)}
    return [float(rank[i]) for i in range(len(order))]


def optimize(data, method, seconds, seed, patience=None, start=None, polish=True, keep_genome=False):
    """seconds: time budget. patience: stop the search once this many seconds pass
    without a better schedule (then `seconds` is only a safety cap and the final
    compaction gets 15% of the time actually searched).
    start: genome to search from instead of the EDD one. polish=False skips the final
    compaction (the whole budget is searched). keep_genome: also return the best genome
    and its objective in the metadata (portfolio() relays them between rounds)."""
    rng = random.Random(seed)
    started = time.perf_counter()
    search_until = seconds * (1 - POLISH_SHARE) if patience is None and polish else seconds
    last_gain = 0.0

    def searching():
        now = time.perf_counter() - started
        return now < search_until and (patience is None or now - last_gain < patience)
    runs = data["runs"]
    n = len(runs)
    options = sorted(reserve_groups(data))
    slots = [(i, mid) for i, run in enumerate(runs) for mid in eligible(data, run)]
    b0, d0, o0 = n, n + len(slots), n + len(slots) + n  # gene block offsets

    context = prepare(data)  # the instance does not change during the search

    def decode_genome(g):
        chosen = tuple(o for j, o in enumerate(options) if g[o0 + j] > .5)
        return decode(data, priorities=g[:n], machine_bias={s: g[b0 + j] for j, s in enumerate(slots)},
                      delays={i: round(g[d0 + i]) for i in range(n) if g[d0 + i] >= .5}, options=chosen,
                      context=context), chosen

    first = list(start) if start is not None else initial_genome(data) + [0.0] * len(slots) + [0.0] * n + [0.0] * len(options)
    evaluated, history = 0, []
    best, best_score, best_genome = None, float("inf"), None
    # For the move that pulls a late order forward: the runs that can feed each order at each
    # stage (its own lots at the last stage, runs of its product's item at the others).
    stages = data["stages"]
    by_stage = {s: [i for i, r in enumerate(runs) if r["stage"] == s] for s in stages}
    index = {r["id"]: i for i, r in enumerate(runs)}
    feeders = {}
    for o in data["orders"]:
        route = data["products"][o["product"]]["route"]
        for s in stages:
            feeders[o["id"], s] = ([index[l] for l in o["lot_allocations"]] if s == stages[-1]
                                   else [i for i in by_stage[s] if runs[i]["item"] == route[s]])
    late_seen = []  # late orders of the schedule assessed last

    def assess(g):
        nonlocal evaluated, best, best_score, best_genome, last_gain, late_seen
        rows, chosen = decode_genome(g)
        evaluated += 1
        if rows is None or (chosen and not validate(data, rows)["valid"]):
            return float("inf")  # stock cap etc. can only break when reserve work is on
        metrics, details = evaluate(data, rows)
        score = metrics["objective"]
        late_seen = [d["order"] for d in details["deliveries"] if d["tardiness"] > 0]
        if score < best_score:
            best, best_score, best_genome = rows, score, g
            last_gain = time.perf_counter() - started
            history.append({"seconds": time.perf_counter() - started, "objective": score, "evaluations": evaluated})
        return score

    def mutate(g, late=()):
        """late: orders late in the schedule of `g`. Tier 1 is searched greedily (see the
        temperature below), so random swaps rarely find the few runs that matter for the
        last late order; a share of the moves therefore takes one run that feeds a late
        order and swaps its priority with an earlier-ranked run of the same stage."""
        x = g.copy()
        for _ in range(rng.choice([1, 2, 4])):
            if late and rng.random() < PULL_LATE:
                stage = rng.choice(stages)
                pool = feeders[rng.choice(late), stage]
                if pool:
                    a = rng.choice(pool)
                    ahead = [b for b in by_stage[stage] if x[b] < x[a]]
                    if ahead:
                        b = rng.choice(ahead)
                        x[a], x[b] = x[b], x[a]
                    x[d0 + a] = 0.0
                continue
            u = rng.random()
            if u < .5:
                a, b = rng.sample(range(n), 2)
                x[a], x[b] = x[b], x[a]
            elif u < .65 and slots:
                x[b0 + rng.randrange(len(slots))] = rng.uniform(-600, 600)
            elif u < .92:
                x[d0 + rng.randrange(n)] = 0.0 if rng.random() < .4 else rng.uniform(0, MAX_DELAY)
            elif options:
                j = rng.randrange(len(options))
                x[o0 + j] = 1.0 - x[o0 + j]
        return x

    score = assess(first)
    if method == "sa":
        current, steps, accepted, late = first, 0, 0, late_seen
        while searching():
            candidate = mutate(current, late)
            value = assess(candidate)
            # cooling runs on the budget; with patience the budget is a cap, so cool
            # over the patience window instead (otherwise it never gets cold)
            span = search_until if patience is None else min(search_until, last_gain + patience)
            fraction = min(1, (time.perf_counter() - started) / span)
            # temperature on the tier-2 scale: tier 1 differences are always rejected
            # unless they improve (they are 1e6 times larger)
            scale = data.get("objective_tiers", {}).get("scale", 1)
            base = (score % scale) if math.isfinite(score) else 1e4
            temperature = max(1, base * .04 * (.005 ** fraction))
            if value < score or (math.isfinite(value) and rng.random() < math.exp(min(0, (score - value) / temperature))):
                current, score, late = candidate, value, late_seen
                accepted += 1
            steps += 1
        details = {"iterations": steps, "accepted_moves": accepted, "initial_temperature_fraction": .04}
    else:
        population = [(score, first)]
        while len(population) < 14 and searching():
            g = first.copy()
            for _ in range(8):
                g = mutate(g)
            population.append((assess(g), g))
        generations = 0
        while searching():
            population.sort(key=lambda t: t[0])
            new = population[:2]
            while len(new) < len(population) and searching():
                def tournament():
                    return min(rng.sample(population, min(3, len(population))), key=lambda t: t[0])[1]
                a, b = tournament(), tournament()
                child = mutate([x if rng.random() < .5 else y for x, y in zip(a, b)])
                new.append((assess(child), child))
            population = new
            generations += 1
        details = {"generations": generations, "population_size": 14, "elite": 2,
                   "selection": "tournament_3", "crossover": "uniform_random_keys"}
    searched = time.perf_counter() - started
    stop = "budget" if patience is None or searched >= search_until else "no_improvement"
    if best is not None and polish:
        left = seconds - searched if patience is None else min(seconds - searched, max(10.0, searched * POLISH_SHARE))
        polished = compact(data, best, seconds=max(.5, left))
        value = evaluate(data, polished)[0]["objective"]
        if value < best_score:
            best, best_score = polished, value
            history.append({"seconds": time.perf_counter() - started, "objective": value, "source": "compact"})
    relay = {"genome": best_genome, "objective": best_score} if keep_genome else {}
    return best, {"status": "HEURISTIC_FEASIBLE" if best else "NO_SOLUTION_FOUND", "history": history,
                  "evaluations": evaluated, "bound": None, "patience_seconds": patience, "stop_reason": stop,
                  "search_seconds": searched, "genes": {"delay_max": MAX_DELAY, "options": options}, **details, **relay}
