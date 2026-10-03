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
from .decoder import decode
from .evaluate import evaluate, validate
from .instance import eligible, reserve_groups, run_due

MAX_DELAY = 960
POLISH_SHARE = .15  # share of the budget kept for the final compaction


def initial_genome(data):
    due = run_due(data)
    runs = data["runs"]
    order = sorted(range(len(runs)), key=lambda i: (due[runs[i]["id"]][0], -due[runs[i]["id"]][1], i))
    rank = {i: r for r, i in enumerate(order)}
    return [float(rank[i]) for i in range(len(order))]


def optimize(data, method, seconds, seed, patience=None):
    """seconds: time budget. patience: stop the search once this many seconds pass
    without a better schedule (then `seconds` is only a safety cap and the final
    compaction gets 15% of the time actually searched)."""
    rng = random.Random(seed)
    started = time.perf_counter()
    search_until = seconds * (1 - POLISH_SHARE) if patience is None else seconds
    last_gain = 0.0

    def searching():
        now = time.perf_counter() - started
        return now < search_until and (patience is None or now - last_gain < patience)
    runs = data["runs"]
    n = len(runs)
    options = sorted(reserve_groups(data))
    slots = [(i, mid) for i, run in enumerate(runs) for mid in eligible(data, run)]
    b0, d0, o0 = n, n + len(slots), n + len(slots) + n  # gene block offsets

    def decode_genome(g):
        chosen = tuple(o for j, o in enumerate(options) if g[o0 + j] > .5)
        return decode(data, priorities=g[:n], machine_bias={s: g[b0 + j] for j, s in enumerate(slots)},
                      delays={i: round(g[d0 + i]) for i in range(n) if g[d0 + i] >= .5}, options=chosen), chosen

    first = initial_genome(data) + [0.0] * len(slots) + [0.0] * n + [0.0] * len(options)
    evaluated, history = 0, []
    best, best_score = None, float("inf")

    def assess(g):
        nonlocal evaluated, best, best_score, last_gain
        rows, chosen = decode_genome(g)
        evaluated += 1
        if rows is None or (chosen and not validate(data, rows)["valid"]):
            return float("inf")  # stock cap etc. can only break when reserve work is on
        score = evaluate(data, rows)[0]["objective"]
        if score < best_score:
            best, best_score = rows, score
            last_gain = time.perf_counter() - started
            history.append({"seconds": time.perf_counter() - started, "objective": score, "evaluations": evaluated})
        return score

    def mutate(g):
        x = g.copy()
        for _ in range(rng.choice([1, 2, 4])):
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
        current, steps, accepted = first, 0, 0
        while searching():
            candidate = mutate(current)
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
                current, score = candidate, value
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
    if best is not None:
        left = seconds - searched if patience is None else min(seconds - searched, max(10.0, searched * POLISH_SHARE))
        polished = compact(data, best, seconds=max(.5, left))
        value = evaluate(data, polished)[0]["objective"]
        if value < best_score:
            best, best_score = polished, value
            history.append({"seconds": time.perf_counter() - started, "objective": value, "source": "compact"})
    return best, {"status": "HEURISTIC_FEASIBLE" if best else "NO_SOLUTION_FOUND", "history": history,
                  "evaluations": evaluated, "bound": None, "patience_seconds": patience, "stop_reason": stop,
                  "search_seconds": searched, "genes": {"delay_max": MAX_DELAY, "options": options}, **details}
