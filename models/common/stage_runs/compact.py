"""Shift consolidation: local search that re-times runs of a finished schedule.

A move takes one run and shifts it to another calendar window of the SAME
machine, inside the gap left by its machine predecessor/successor and (for cast
runs) its mold predecessor/successor. Machine and mold order are unchanged, so
setup, maintenance and cycle counters stay exact; stock, calendar and finished
goods are re-checked by validate(). A move is kept only if the objective drops.
This lets append-only schedules (dispatch rules, SA/GA decoder) wait for an
already-open shift instead of opening a new one.
"""
from __future__ import annotations

import time
from .evaluate import evaluate, validate
from .instance import calendar


def _score(data, rows):
    return evaluate(data, rows)[0]["objective"] if validate(data, rows)["valid"] else float("inf")


def compact(data, rows, seconds=10.0, max_passes=6):
    started = time.perf_counter()
    windows = {m: calendar(data, m)[0] for m in data["machines"]}
    best = [dict(r) for r in rows]
    best_score = _score(data, best)
    for _ in range(max_passes):
        improved = False
        for idx in sorted(range(len(best)), key=lambda i: -best[i]["block_start"]):
            if time.perf_counter() - started > seconds:
                return best
            r = best[idx]
            length = r["end"] - r["block_start"]
            same_m = sorted((x for x in best if x["machine"] == r["machine"]), key=lambda x: x["block_start"])
            k = same_m.index(r)
            lo = same_m[k - 1]["end"] if k else 0
            hi = same_m[k + 1]["block_start"] if k + 1 < len(same_m) else data["horizon"]
            if r["mold"]:
                same_k = sorted((x for x in best if x["mold"] == r["mold"]), key=lambda x: x["block_start"])
                j = same_k.index(r)
                lo = max(lo, same_k[j - 1]["end"] if j else 0)
                hi = min(hi, same_k[j + 1]["block_start"] if j + 1 < len(same_k) else data["horizon"])
            candidates = []
            for w in windows[r["machine"]]:
                a, b = max(lo, w["start"]), min(hi, w["end"])
                if b - a >= length:
                    candidates += [(a, w), (b - length, w)]
            for start, w in candidates:
                if start == r["block_start"]:
                    continue
                shift = start - r["block_start"]
                moved = {**r, "block_start": start, "start": r["start"] + shift, "end": r["end"] + shift,
                         "window": w["id"], "shift": w["shift"]}
                trial = best[:idx] + [moved] + best[idx + 1:]
                value = _score(data, trial)
                if value < best_score:
                    best, best_score, improved = trial, value, True
                    break
        if not improved:
            break
    return best
