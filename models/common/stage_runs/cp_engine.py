"""CP-SAT model for schema 5 (fixed runs per stage, shared mold pool).

Decisions: for every run a (machine[, mold]) choice and a calendar window; for
every reserve option chosen / not chosen (all its runs together). Sequencing:
one circuit per machine (setup from the predecessor's item and mold, or from
the mold's after-maintenance state) and one circuit per mold (cycle counter and
maintenance exactly when the next run would exceed the limit). BTP stock is a
reservoir per code with a per-stage transfer lag. Objective terms are the same
as evaluate.evaluate(), which the caller uses to cross-check the solver value.
"""
from __future__ import annotations

import time
from ortools.sat.python import cp_model
from .evaluate import option_quantity
from .instance import (canonical, twin_groups, btp_stages, calendar, cast_setup, cycles, duration, eligible, is_continuous,
                       last_stage, molds_for, quantity, reserve_groups, upstream, uses_molds)


# Solver settings used when a start schedule is given (a cold solve keeps CP-SAT's defaults;
# override per call with `params`). Measured on the 2-week instance, 120 s from one SA schedule:
#   * presolve: the default (probing + several passes) takes ~20 s before the search starts
#     and bought nothing (cost 81k at the end against 62-73k); one pass without probing starts
#     the search after ~4 s.
#   * improvements come from CP-SAT's LNS workers; full-search workers mostly serve the bound.
#     Two of them keep the bound (it proves the service level optimal within a minute) and
#     leave the other threads to LNS: cost 50-57k against 57-73k with the default mix.
HINTED_PARAMS = {"cp_model_probing_level": 0, "max_presolve_iterations": 1}
FULL_SEARCH_WORKERS_WITH_HINT = 2


def solve(data, seconds=30, seed=11, hint=None, fixed_runs=None, workers=1, limits=None, params=None, log=None):
    """limits: {objective term: max value} -- epsilon constraints (e.g. safety_shortfall <= 2)
    used to trace the service/cost trade-off curve.
    hint: a valid schedule (rows). Every variable of the model is hinted from it, so the solver
    starts from that schedule at once instead of searching for a completion of a partial hint.
    workers: CP-SAT search workers. More than one also turns on CP-SAT's own LNS workers,
    which is where improvements of a hinted schedule come from on large instances.
    params: {CP-SAT parameter: value}, applied last. log: callable receiving the solver's
    log lines."""
    started = time.perf_counter()
    model = cp_model.CpModel()
    H = data["horizon"]
    runs = data["runs"]
    by_id = {r["id"]: r for r in runs}
    cal = {m: calendar(data, m) for m in data["machines"]}
    for stage in data["stages"]:
        kinds = {is_continuous(data, m) for m, s in data["machines"].items() if s["stage"] == stage}
        if len(kinds) > 1:
            raise ValueError(f"stage {stage}: mixing continuous and shift machines is not modelled")
    stage_on_shifts = {s: not any(is_continuous(data, m) for m, spec in data["machines"].items() if spec["stage"] == s)
                       for s in data["stages"]}
    max_setup = max(max(max(row.values()) for row in spec["setup"].values()) for spec in data["machines"].values())
    max_setup = max([max_setup] + [spec.get("mold_change_minutes", 0) for spec in data["machines"].values()])
    max_limit = max([m["limit_cycles"] for m in data.get("molds", {}).values()] or [0])
    max_maint = max([m["maintenance_minutes"] for m in data.get("molds", {}).values()] or [0])

    # Interchangeable twins are ordered by block start (symmetry breaking below), so on one
    # machine or mold a later twin can never come right before an earlier one: those
    # sequencing arcs are not created at all.
    twin_rank = {rid: (g, k) for g, ids in enumerate(twin_groups(data)) for k, rid in enumerate(ids)}

    def never_before(ri, rj):
        a, b = twin_rank.get(ri), twin_rank.get(rj)
        return a is not None and b is not None and a[0] == b[0] and a[1] > b[1]

    chosen = {o: model.new_bool_var(f"opt_{o}") for o in reserve_groups(data)}
    present = {r["id"]: (chosen[r["reserve_option"]] if "reserve_option" in r else None) for r in runs}
    V, pair, pair_by_machine, pair_by_mold, win, opens = {}, {}, {}, {}, {}, {}
    machine_lit, mold_lit = {}, {}
    # handles kept only to hint every variable from a start schedule (see the end of the build)
    length_var, same_parts, machine_empty, mold_len, mold_empty, mold_arcs = {}, {}, {}, {}, {}, {}
    tardy, cp_done, cp_credit, cp_ship, cp_short, cp_surplus, maint_lits = {}, {}, {}, {}, {}, {}, []
    shift_load = {}
    processing_terms = []
    for i, run in enumerate(runs):
        rid = run["id"]
        b, s, e = (model.new_int_var(0, H, f"{rid}_{n}") for n in "bse")
        su = model.new_int_var(0, max_setup, f"{rid}_su")
        maint = model.new_bool_var(f"{rid}_maint")
        used = model.new_int_var(0, max_limit, f"{rid}_used")
        V[rid] = {"b": b, "s": s, "e": e, "su": su, "maint": maint, "used": used}
        on = present[rid]
        if not uses_molds(data, run):
            model.add(maint == 0)
            model.add(used == 0)
        if on is not None:  # an unchosen reserve run carries no time, setup or cycles
            for var in (b, s, e, su, used):
                model.add(var == 0).only_enforce_if(on.Not())
            model.add(maint == 0).only_enforce_if(on.Not())
        lits = []
        longest = max(duration(data, run, mid) for mid in eligible(data, run))
        for mid in eligible(data, run):
            p = duration(data, run, mid)
            xm = model.new_bool_var(f"{rid}@{mid}")
            machine_lit[rid, mid] = xm
            sub = []
            for mold in (molds_for(data, run["item"]) or [None]):
                x = model.new_bool_var(f"{rid}@{mid}#{mold}")
                pair[rid, mid, mold] = x
                sub.append(x)
                mt = data["molds"][mold]["maintenance_minutes"] if mold else 0
                model.add(s == b + su + mt * maint).only_enforce_if(x)
                model.add(e == s + p).only_enforce_if(x)
                if mold:
                    pair_by_mold.setdefault(mold, []).append((rid, x))
            model.add(sum(sub) == xm)
            lits.append(xm)
            # e - b is the block on whichever machine runs it, so the bound uses the slowest
            # eligible machine (a bound from this machine's own time would forbid valid blocks
            # on a slower twin machine and make such a start schedule infeasible)
            length = model.new_int_var(0, longest + max_setup + max_maint, f"{rid}@{mid}_len")
            model.add(length == e - b)
            length_var[rid, mid] = length
            pair_by_machine.setdefault(mid, []).append((rid, xm, model.new_optional_interval_var(b, length, e, xm, f"{rid}@{mid}_iv")))
            if stage_on_shifts[run["stage"]]:
                processing_terms.append(p * xm)
            wins = []
            for w in cal[mid][0]:
                if w["end"] - w["start"] < p:
                    continue
                z = model.new_bool_var(f"{rid}@{mid}_w{w['id']}")
                win[rid, mid, w["id"]] = z
                wins.append(z)
                model.add(b >= w["start"]).only_enforce_if(z)
                model.add(e <= w["end"]).only_enforce_if(z)
                if w["shift"] is not None:
                    opens.setdefault((mid, w["shift"]), []).append(z)
                    shift_load.setdefault((mid, w["shift"]), []).append(p * z)
            model.add(sum(wins) == xm)
        if on is None:
            model.add_exactly_one(lits)
        else:
            model.add(sum(lits) == on)
    for mold, items in pair_by_mold.items():
        ys = {}
        for rid, x in items:
            ys.setdefault(rid, []).append(x)
        for rid, xs in ys.items():
            y = model.new_bool_var(f"{rid}~{mold}")
            model.add(sum(xs) == y)
            mold_lit[rid, mold] = y
    # symmetry breaking: interchangeable twins start in declaration order
    for ids in twin_groups(data):
        for a_, b_ in zip(ids, ids[1:]):
            model.add(V[a_]["b"] <= V[b_]["b"])
    # machines: no overlap + circuit for setups
    arc_lits = {}
    same_mold = {}

    def same(i, j):
        """Bool: runs i and j (same item) use the same mold."""
        key = tuple(sorted((i, j)))
        if key not in same_mold:
            ts = []
            for mold in molds_for(data, by_id[i]["item"]):
                t = model.new_bool_var(f"{i}={j}~{mold}")
                yi, yj = mold_lit[i, mold], mold_lit[j, mold]
                model.add_implication(t, yi)
                model.add_implication(t, yj)
                model.add_bool_or([t, yi.Not(), yj.Not()])
                ts.append(t)
                same_parts[key, mold] = t
            sm = model.new_bool_var(f"{i}={j}")
            model.add(sum(ts) == sm)
            same_mold[key] = sm
        return same_mold[key]

    for mid, nodes in pair_by_machine.items():
        spec = data["machines"][mid]
        model.add_no_overlap([iv for _, _, iv in nodes])
        if not any(v for row in spec["setup"].values() for v in row.values()) and                 not any(uses_molds(data, by_id[r]) for r, _, _ in nodes):
            for r, x, _ in nodes:  # setup-free machine (e.g. furnace): order only matters for overlap
                model.add(V[r]["su"] == 0).only_enforce_if(x)
            continue
        empty = model.new_bool_var(f"{mid}_empty")
        machine_empty[mid] = empty
        arcs = [(0, 0, empty)]
        model.add(sum(x for _, x, _ in nodes) == 0).only_enforce_if(empty)
        model.add(sum(x for _, x, _ in nodes) >= 1).only_enforce_if(empty.Not())
        for j, (rj, xj, _) in enumerate(nodes, 1):
            run_j = by_id[rj]
            arcs.append((j, j, xj.Not()))
            first, last = model.new_bool_var(f"{mid}_first_{rj}"), model.new_bool_var(f"{mid}_last_{rj}")
            arcs += [(0, j, first), (j, 0, last)]
            arc_lits[mid, None, rj], arc_lits[mid, rj, None] = first, last
            model.add_implication(first, xj)
            model.add_implication(last, xj)
            preds = [(first, None)]
            for i, (ri, xi, _) in enumerate(nodes, 1):
                if i == j or never_before(ri, rj):
                    continue
                a = model.new_bool_var(f"{mid}_{ri}>{rj}")
                arcs.append((i, j, a))
                arc_lits[mid, ri, rj] = a
                model.add_implication(a, xi)
                model.add_implication(a, xj)
                model.add(V[rj]["b"] >= V[ri]["e"]).only_enforce_if(a)
                preds.append((a, ri))
            vj = V[rj]
            molded = uses_molds(data, run_j)
            for a, ri in preds:
                prev = data["machine_initial_state"] if ri is None else by_id[ri]["item"]
                base = spec["setup"][prev][run_j["item"]]
                if not molded:
                    model.add(vj["su"] == base).only_enforce_if(a)
                    continue
                clean = {data["molds"][k]["after_maintenance"] for k in molds_for(data, run_j["item"])}
                assert len(clean) == 1, "molds of one item must share the after-maintenance state"
                model.add(vj["su"] == spec["setup"][clean.pop()][run_j["item"]]).only_enforce_if([a, vj["maint"]])
                changed = max(base, spec.get("mold_change_minutes", 0))
                if ri is None or not uses_molds(data, by_id[ri]):
                    model.add(vj["su"] == base).only_enforce_if([a, vj["maint"].Not()])
                elif by_id[ri]["item"] != run_j["item"]:
                    model.add(vj["su"] == changed).only_enforce_if([a, vj["maint"].Not()])
                else:
                    sm = same(ri, rj)
                    model.add(vj["su"] == base).only_enforce_if([a, vj["maint"].Not(), sm])
                    model.add(vj["su"] == changed).only_enforce_if([a, vj["maint"].Not(), sm.Not()])
        model.add_circuit(arcs)
    # molds: no overlap + circuit carrying the cycle counter
    for mold, spec in data.get("molds", {}).items():
        nodes = [(rid, y) for (rid, k), y in mold_lit.items() if k == mold]
        if not nodes:
            continue
        ivs = []
        for rid, y in nodes:
            ln = model.new_int_var(0, H, f"{rid}~{mold}_len")
            model.add(ln == V[rid]["e"] - V[rid]["b"])
            mold_len[rid, mold] = ln
            ivs.append(model.new_optional_interval_var(V[rid]["b"], ln, V[rid]["e"], y, f"{rid}~{mold}_iv"))
        model.add_no_overlap(ivs)
        empty = model.new_bool_var(f"{mold}_empty")
        mold_empty[mold] = empty
        arcs = [(0, 0, empty)]
        model.add(sum(y for _, y in nodes) == 0).only_enforce_if(empty)
        model.add(sum(y for _, y in nodes) >= 1).only_enforce_if(empty.Not())
        for j, (rj, yj) in enumerate(nodes, 1):
            c = cycles(data, by_id[rj], mold)
            arcs.append((j, j, yj.Not()))
            first, last = model.new_bool_var(f"{mold}_first_{rj}"), model.new_bool_var(f"{mold}_last_{rj}")
            arcs += [(0, j, first), (j, 0, last)]
            mold_arcs[mold, None, rj], mold_arcs[mold, rj, None] = first, last
            model.add_implication(first, yj)
            model.add_implication(last, yj)
            preds = [(first, None)]
            for i, (ri, yi) in enumerate(nodes, 1):
                if i == j or never_before(ri, rj):
                    continue
                a = model.new_bool_var(f"{mold}_{ri}>{rj}")
                arcs.append((i, j, a))
                mold_arcs[mold, ri, rj] = a
                model.add_implication(a, yi)
                model.add_implication(a, yj)
                model.add(V[rj]["b"] >= V[ri]["e"]).only_enforce_if(a)
                preds.append((a, ri))
            m, u = V[rj]["maint"], V[rj]["used"]
            for a, ri in preds:
                before = spec["initial_cycles"] if ri is None else V[ri]["used"]
                model.add(before + c >= spec["limit_cycles"] + 1).only_enforce_if([a, m])
                model.add(before + c <= spec["limit_cycles"]).only_enforce_if([a, m.Not()])
                model.add(u == c).only_enforce_if([a, m])
                model.add(u == before + c).only_enforce_if([a, m.Not()])
        model.add_circuit(arcs)
    # BTP reservoirs
    up = upstream(data)
    events = {c: [] for c in data["btp"]}
    for run in runs:
        rid, q = run["id"], quantity(data, run)
        act = present[rid] if present[rid] is not None else True
        if run["stage"] in btp_stages(data):
            events[run["item"]].append((V[rid]["e"] + data["transfer_minutes"][run["stage"]], q, act))
        if up[run["item"]]:
            events[up[run["item"]]].append((V[rid]["b"], -q, act))
    for code, ev in events.items():
        init = data["btp"][code]["initial_stock"]
        times, deltas, acts = [0] + [t for t, _, _ in ev], [init] + [d for _, d, _ in ev], [True] + [a for _, _, a in ev]
        cap = data["btp"][code].get("capacity")
        hi = cap if cap is not None else init + sum(d for d in deltas[1:] if d > 0)
        model.add_reservoir_constraint_with_active(times, deltas, acts, 0, max(hi, 0))
        if cap is not None:  # credit-before-debit peak at equal times (see schema-4 cp_engine)
            late = [t + 1 if d < 0 else t for t, d in zip(times, deltas)]
            model.add_reservoir_constraint_with_active(late, deltas, acts, min(0, sum(d for d in deltas if d < 0)), cap)
    # shifts, deliveries, finished stock
    shift_y, available = {}, []
    for (mid, sid), zs in opens.items():
        y = model.new_bool_var(f"{mid}_{sid}_open")
        model.add_max_equality(y, zs)
        shift_y[mid, sid] = y
        cap = next(s["available_minutes"] for s in cal[mid][1] if s["id"] == sid)
        available.append(cap * y)
        model.add(sum(shift_load[mid, sid]) <= cap * y)
    lots = [r for r in runs if r["stage"] == last_stage(data)]
    completion, tardiness = {}, []
    for o in data["orders"]:
        c = model.new_int_var(0, H, o["id"] + "_done")
        model.add_max_equality(c, [o["release"]] + [V[l]["e"] for l in o["lot_allocations"]])
        completion[o["id"]] = c
        t = model.new_int_var(0, H, o["id"] + "_tardy")
        model.add_max_equality(t, [0, c - o["due"]])
        tardy[o["id"]] = t
        tardiness.append(o["priority"] * t)
    shortfalls, surpluses = [], []
    qc_q = data["run_size"][last_stage(data)]
    for cp in data["checkpoints"]:
        done = {}
        for lot in lots:
            z = model.new_bool_var(f"{lot['id']}_by_{cp}")
            model.add(V[lot["id"]]["e"] <= cp).only_enforce_if(z)
            model.add(V[lot["id"]]["e"] > cp).only_enforce_if(z.Not())
            cp_done[lot["id"], cp] = z
            on = present[lot["id"]]
            if on is not None:
                cr = model.new_bool_var(f"{lot['id']}_credit_{cp}")
                model.add_bool_and([on, z]).only_enforce_if(cr)
                model.add_bool_or([on.Not(), z.Not()]).only_enforce_if(cr.Not())
                cp_credit[lot["id"], cp] = cr
                z = cr
            done[lot["id"]] = z
        shipped = {}
        for o in data["orders"]:
            z = model.new_bool_var(f"{o['id']}_ship_{cp}")
            model.add(completion[o["id"]] <= cp).only_enforce_if(z)
            model.add(completion[o["id"]] > cp).only_enforce_if(z.Not())
            shipped[o["id"]] = z
            cp_ship[o["id"], cp] = z
        for p, spec in data["products"].items():
            inv = spec["initial_stock"] + sum(qc_q * done[l["id"]] for l in lots if l["item"] == p)
            inv -= sum(o["quantity"] * shipped[o["id"]] for o in data["orders"] if o["product"] == p)
            model.add(inv >= 0)
            model.add(inv <= spec["stock_cap"])
            short = model.new_int_var(0, spec["safety_stock"], f"{p}_short_{cp}")
            model.add_max_equality(short, [0, spec["safety_stock"] - inv])
            shortfalls.append(short)
            cp_short[p, cp] = short
            sur = model.new_int_var(0, max(0, spec["stock_cap"] - spec["safety_stock"]), f"{p}_surplus_{cp}")
            model.add_max_equality(sur, [0, inv - spec["safety_stock"]])
            surpluses.append(sur)
            cp_surplus[p, cp] = sur
    makespan = model.new_int_var(0, H, "makespan")
    ends = [V[l["id"]]["e"] for l in lots if "reserve_option" not in l]
    if ends:
        model.add_max_equality(makespan, ends)
    else:  # e.g. a rolling-horizon window with upstream runs only
        model.add(makespan == 0)
    shift_runs = [r for r in runs if stage_on_shifts[r["stage"]]]
    setup_all = sum(V[r["id"]]["su"] for r in runs)
    setup_shift = sum(V[r["id"]]["su"] for r in shift_runs)
    # Maintenance minutes are those of the mold the run actually uses.
    maint_terms = []
    for (rid, k), y in mold_lit.items():
        if stage_on_shifts[by_id[rid]["stage"]]:
            mk = model.new_bool_var(f"{rid}~{k}_maint")
            model.add_bool_and([y, V[rid]["maint"]]).only_enforce_if(mk)
            model.add_bool_or([y.Not(), V[rid]["maint"].Not()]).only_enforce_if(mk.Not())
            maint_lits.append((rid, k, mk))
            maint_terms.append(data["molds"][k]["maintenance_minutes"] * mk)
    idle = sum(available) - sum(processing_terms) - setup_shift - sum(maint_terms)
    model.add(idle >= 0)
    maint_all = []
    for (rid, k), y in mold_lit.items():
        mk = model.new_bool_var(f"{rid}~{k}_maint_all")
        model.add_bool_and([y, V[rid]["maint"]]).only_enforce_if(mk)
        model.add_bool_or([y.Not(), V[rid]["maint"].Not()]).only_enforce_if(mk.Not())
        maint_lits.append((rid, k, mk))
        maint_all.append(data["molds"][k]["maintenance_minutes"] * mk)
    nonproductive = sum(available) - sum(processing_terms)
    reserve_units = sum(option_quantity(data, o) * lit for o, lit in chosen.items())
    btp_end = sum(v["initial_stock"] for v in data["btp"].values())
    for run in runs:
        q = quantity(data, run)
        coef = (q if run["stage"] in btp_stages(data) else 0) - (q if up[run["item"]] else 0)
        if coef:
            btp_end += coef * (present[run["id"]] if present[run["id"]] is not None else 1)
    terms = {"makespan": makespan, "weighted_tardiness": sum(tardiness), "setup_minutes": setup_all,
             "maintenance_minutes": sum(maint_all), "nonproductive_minutes": nonproductive, "idle_minutes": idle,
             "safety_shortfall": sum(shortfalls), "reserve_units": reserve_units,
             "reserve_production": sum(chosen.values()), "surplus_holding": sum(surpluses), "btp_end_units": btp_end}
    for term, cap in (limits or {}).items():
        model.add(terms[term] <= cap)
    w = data["weights"]
    tiers = data.get("objective_tiers", {})
    first, scale = set(tiers.get("tier1", [])), tiers.get("scale", 1)
    objective = (scale * sum(wt * terms[k] for k, wt in w.items() if k in first)
                 + sum(wt * terms[k] for k, wt in w.items() if k not in first))
    model.minimize(objective)
    if hint:
        # A start schedule fixes the value of every variable of the model. Hinting all of them
        # (not only the decisions) lets CP-SAT load the schedule as its first solution at once;
        # with a partial hint it first has to search for a completion, which on a 2-week
        # instance costs more time than a short budget has.
        hint = canonical(data, hint)
        rows = {r["run"]: r for r in hint}
        hinted = {}

        def put(var, value):
            hinted[var.index] = (var, int(value))

        def known(rid):  # a reserve run left out of the schedule is known too: it is absent
            return rid in rows or present[rid] is not None

        for rid, v in V.items():
            if not known(rid):
                continue
            r = rows.get(rid)
            for f, src in (("b", "block_start"), ("s", "start"), ("e", "end"), ("su", "setup_minutes"), ("used", "cycles_after")):
                put(v[f], r[src] if r else 0)
            put(v["maint"], bool(r and r["maintenance_minutes"] > 0))
            if r and fixed_runs and rid in fixed_runs:
                for f, src in (("b", "block_start"), ("s", "start"), ("e", "end")):
                    model.add(v[f] == r[src])
                model.add(pair[rid, r["machine"], r["mold"]] == 1)
        for (rid, mid, mold), x in pair.items():
            if known(rid):
                put(x, rid in rows and rows[rid]["machine"] == mid and rows[rid]["mold"] == mold)
        for (rid, mid), x in machine_lit.items():
            if known(rid):
                put(x, rid in rows and rows[rid]["machine"] == mid)
                put(length_var[rid, mid], rows[rid]["end"] - rows[rid]["block_start"] if rid in rows else 0)
        for (rid, mid, wid), z in win.items():
            if known(rid):
                put(z, rid in rows and rows[rid]["machine"] == mid and rows[rid]["window"] == wid)
        for (rid, mold), y in mold_lit.items():
            if known(rid):
                put(y, rid in rows and rows[rid]["mold"] == mold)
                put(mold_len[rid, mold], rows[rid]["end"] - rows[rid]["block_start"] if rid in rows else 0)
        for (key, mold), t in same_parts.items():
            if all(known(i) for i in key):
                put(t, all(i in rows and rows[i]["mold"] == mold for i in key))
        for key, sm in same_mold.items():
            if all(known(i) for i in key):
                put(sm, all(i in rows for i in key) and rows[key[0]]["mold"] == rows[key[1]]["mold"])
        for (rid, k, mk) in maint_lits:
            if known(rid):
                put(mk, rid in rows and rows[rid]["mold"] == k and rows[rid]["maintenance_minutes"] > 0)
        for o, lit in chosen.items():
            put(lit, all(i in rows for i in reserve_groups(data)[o]))
        complete = all(known(r["id"]) for r in runs)
        if complete:  # sequences, shifts and everything derived need the whole schedule
            ordered = sorted(hint, key=lambda r: r["block_start"])
            seq = set()
            for mid in data["machines"]:
                order = [None] + [r["run"] for r in ordered if r["machine"] == mid] + [None]
                seq.update((mid, a, b) for a, b in zip(order, order[1:]))
                if mid in machine_empty:
                    put(machine_empty[mid], len(order) == 2)
            for key, a in arc_lits.items():
                put(a, key in seq)
            seq = set()
            for mold in mold_empty:
                order = [None] + [r["run"] for r in ordered if r["mold"] == mold] + [None]
                seq.update((mold, a, b) for a, b in zip(order, order[1:]))
                put(mold_empty[mold], len(order) == 2)
            for key, a in mold_arcs.items():
                put(a, key in seq)
            opened = {(r["machine"], r["shift"]) for r in hint}
            for key, y in shift_y.items():
                put(y, key in opened)
            end_of = {rid: (rows[rid]["end"] if rid in rows else 0) for rid in V}
            done_at = {}
            for o in data["orders"]:
                done_at[o["id"]] = max([o["release"]] + [end_of[l] for l in o["lot_allocations"]])
                put(completion[o["id"]], done_at[o["id"]])
                put(tardy[o["id"]], max(0, done_at[o["id"]] - o["due"]))
            for (lid, cp), z in cp_done.items():
                put(z, end_of[lid] <= cp)
            for (lid, cp), cr in cp_credit.items():
                put(cr, lid in rows and end_of[lid] <= cp)
            for (oid, cp), z in cp_ship.items():
                put(z, done_at[oid] <= cp)
            for (pr, cp), short in cp_short.items():
                spec = data["products"][pr]
                inv = (spec["initial_stock"] + sum(qc_q for l in lots if l["item"] == pr and l["id"] in rows and end_of[l["id"]] <= cp)
                       - sum(o["quantity"] for o in data["orders"] if o["product"] == pr and done_at[o["id"]] <= cp))
                put(short, max(0, spec["safety_stock"] - inv))
                put(cp_surplus[pr, cp], max(0, inv - spec["safety_stock"]))
            put(makespan, max([end_of[l["id"]] for l in lots if "reserve_option" not in l] or [0]))
        for var, value in hinted.values():
            model.add_hint(var, value)
    build = time.perf_counter() - started
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max(.01, seconds - build)
    solver.parameters.num_search_workers = workers
    solver.parameters.random_seed = seed
    tuned = {}
    if hint:
        tuned.update(HINTED_PARAMS)
        if workers > 1:
            tuned["num_full_subsolvers"] = min(FULL_SEARCH_WORKERS_WITH_HINT, workers - 1)
    for name, value in {**tuned, **(params or {})}.items():
        setattr(solver.parameters, name, value)
    if log is not None:
        solver.parameters.log_search_progress = True
        solver.parameters.log_to_stdout = False
        solver.log_callback = log
    history = []

    class Progress(cp_model.CpSolverSolutionCallback):
        def on_solution_callback(self):
            history.append({"seconds": time.perf_counter() - started, "objective": self.objective_value,
                            "bound": self.best_objective_bound})

    status = solver.solve(model, Progress())
    meta = {"status": solver.status_name(status), "build_seconds": build, "solve_seconds": solver.wall_time,
            "history": history, "workers": workers,
            "bound": solver.best_objective_bound if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None,
            "bound_scope": "neighborhood" if fixed_runs else "full_static_model",
            "response_stats": solver.response_stats()}
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None, meta
    out = []
    for run in runs:
        rid = run["id"]
        sel = [(mid, mold) for (r, mid, mold), x in pair.items() if r == rid and solver.value(x)]
        if not sel:
            continue
        mid, mold = sel[0]
        wid = next(w for (r, m, w), z in win.items() if r == rid and m == mid and solver.value(z))
        window = next(w for w in cal[mid][0] if w["id"] == wid)
        v = V[rid]
        out.append({"run": rid, "stage": run["stage"], "item": run["item"], "machine": mid,
                    "block_start": solver.value(v["b"]), "start": solver.value(v["s"]), "end": solver.value(v["e"]),
                    "setup_minutes": solver.value(v["su"]),
                    "maintenance_minutes": data["molds"][mold]["maintenance_minutes"] * solver.value(v["maint"]) if mold else 0,
                    "mold": mold, "cycles_after": solver.value(v["used"]) if mold else 0,
                    "window": wid, "shift": window["shift"]})
    # Objective of the returned assignment, evaluated exactly in integers. CP-SAT's
    # own objective_value can drift by a few units at this coefficient scale
    # (tier 1 is multiplied by objective_tiers.scale), so it is kept only for reference.
    meta["solver_objective"] = solver.value(objective)
    meta["solver_reported_objective"] = solver.objective_value
    meta["solver_terms"] = {k: solver.value(v) for k, v in terms.items() if k in w}
    meta["solver_order_completion"] = {o: solver.value(c) for o, c in completion.items()}
    meta["reserve_options_chosen"] = sorted(o for o, lit in chosen.items() if solver.value(lit))
    return out, meta
