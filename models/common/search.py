from __future__ import annotations

import math
import random
import time
from .decoder import decode
from .evaluate import evaluate
from .instance import STAGES, eligible


def initial_genome(data):
    # A08: optional lots are never dispatched by decode() (it pre-marks them
    # done, see decoder.py) so their priority never actually matters here --
    # they simply have no order to rank by. Sort them last with a neutral key
    # instead of touching `orders[...]`, which would KeyError on `lot["order"]`.
    orders = {o["id"]:o for o in data["orders"]}
    def key(i):
        lot = data["lots"][i]
        if lot.get("optional"):
            return (float("inf"), 0, i)
        return (orders[lot["order"]]["due"], -orders[lot["order"]]["priority"], i)
    order = sorted(range(len(data["lots"])), key=key)
    rank = {idx:r for r,idx in enumerate(order)}
    return [float(rank[i]*4+k) for i in range(len(order)) for k in range(4)]


def optimize(data, method, seconds, seed):
    rng = random.Random(seed)
    started = time.perf_counter()
    n = len(data["lots"])*4
    def decode_genome(genome):
        priorities, genes = genome[:n],genome[n:]
        bias = {}
        j = 0
        for i,lot in enumerate(data["lots"]):
            for k,stage in enumerate(STAGES):
                for mid in eligible(data,lot,stage):
                    bias[i,k,mid] = genes[j]
                    j += 1
        return decode(data, priorities=priorities, machine_bias=bias)
    extra = sum(len(eligible(data,l,s)) for l in data["lots"] for s in STAGES)
    first = initial_genome(data)+[0.0]*extra
    evaluated, history = 0, []
    best, best_score = None, float("inf")
    def assess(g):
        nonlocal evaluated,best,best_score
        rows = decode_genome(g)
        evaluated += 1
        score = evaluate(data,rows)[0]["objective"] if rows else float("inf")
        if score < best_score:
            best,best_score = rows,score
            history.append({"seconds":time.perf_counter()-started,"objective":score,"evaluations":evaluated})
        return score
    def mutate(g):
        x = g.copy()
        for _ in range(rng.choice([1,2,4])):
            if rng.random() < .7:
                a,b = rng.sample(range(n),2)
                x[a],x[b] = x[b],x[a]
            else:
                a = rng.randrange(n,len(x))
                x[a] = rng.uniform(-600,600)
        return x
    score = assess(first)
    if method == "sa":
        current = first
        steps,accepted = 0,0
        while time.perf_counter()-started < seconds:
            candidate = mutate(current)
            value = assess(candidate)
            fraction = min(1,(time.perf_counter()-started)/seconds)
            temperature = max(1,score*.04*(.005**fraction))
            if value < score or (math.isfinite(value) and rng.random() < math.exp(min(0,(score-value)/temperature))):
                current,score = candidate,value
                accepted += 1
            steps += 1
        details = {"iterations":steps,"accepted_moves":accepted,"initial_temperature_fraction":.04}
    else:
        population = [(score,first)]
        while len(population) < 14 and time.perf_counter()-started < seconds:
            g = first.copy()
            for _ in range(8):
                g = mutate(g)
            population.append((assess(g),g))
        generations = 0
        while time.perf_counter()-started < seconds:
            population.sort(key=lambda t:t[0])
            new = population[:2]
            while len(new) < len(population) and time.perf_counter()-started < seconds:
                def tournament():
                    return min(rng.sample(population,min(3,len(population))),key=lambda t:t[0])[1]
                a,b = tournament(),tournament()
                child = [x if rng.random()<.5 else y for x,y in zip(a,b)]
                child = mutate(child)
                new.append((assess(child),child))
            population = new
            generations += 1
        details = {"generations":generations,"population_size":14,"elite":2,"selection":"tournament_3","crossover":"uniform_random_keys"}
    return best,{"status":"HEURISTIC_FEASIBLE" if best else "NO_SOLUTION_FOUND", "history":history,
                 "evaluations":evaluated,"bound":None,**details}
