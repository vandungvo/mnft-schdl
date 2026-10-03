from __future__ import annotations

import time
from ortools.sat.python import cp_model
from .instance import BTP_STAGES, STAGES, duration, eligible, pull_ahead_cap, setup, stage_item, technical_surplus


def solve(data, seconds=30, seed=11, hint=None, fixed_lots=None):
    """Full static model; LNS uses explicit fixed-lot restrictions, not global bounds.

    A08/4.3.2-4.3.3 (reserve capacity): a `lot` with `optional: True` and every
    entry of `data["optional_btp_runs"]` is a solver DECISION (chosen or not),
    generated up front by the caller -- never invented here (mục 3.2 keeps joint
    lot-size optimisation out of scope). A mandatory lot always runs; an optional
    item contributes nothing (no time, no BTP, no inventory) when not chosen.
    """
    started = time.perf_counter()
    model = cp_model.CpModel()
    h = data["horizon"]
    lots = data["lots"]
    runs = data.get("optional_btp_runs", [])
    max_setup = max(t for m in data["machines"].values() for row in m["setup"].values() for t in row.values())
    max_cycles = max(m.get("mold", {}).get("limit_cycles", 0) for m in data["machines"].values())
    op = {}
    candidates = {m: [] for m in data["machines"]}
    selected, window_vars, intervals = {}, {}, {m: [] for m in data["machines"]}
    opens = {}
    available = []
    processing_terms = []
    hint_lookup = {(r["lot"], r["stage"]): r for r in hint or []}
    lot_chosen = {}  # optional-lot id -> its tying BoolVar (absent = mandatory/always-on)
    run_chosen = {}  # optional_btp_runs id -> its BoolVar
    def integer(name, hi=h):
        return model.new_int_var(0, hi, name)
    def add_stage_node(item, stage, apply_release, is_optional, chosen):
        """Build one (item, stage) op-node + its per-machine choice literals.

        `chosen` is None for mandatory items (unconditional). For optional items
        it is a BoolVar shared across every stage of the same item, so an item
        either runs its whole declared route or contributes nothing at all.
        """
        lid = item["id"]
        key = (lid, stage)
        b,s,e = [integer(f"{lid}_{stage}_{name}") for name in ("b","s","e")]
        su = integer(f"{lid}_{stage}_su", max_setup)
        maintenance = model.new_bool_var(f"{lid}_{stage}_maintenance")
        used = integer(f"{lid}_{stage}_cycles", max_cycles)
        op[key] = {"b": b, "s": s, "e": e, "su": su, "maintenance": maintenance, "used": used}
        if stage != "cast":
            model.add(maintenance == 0)
            model.add(used == 0)
        elif is_optional:
            # Closes an exploit: an unchosen optional item's cast-stage node has
            # no arc ever enforcing it, so `maintenance`/`used` would otherwise be
            # free booleans the solver could flip to shrink the idle penalty
            # (idle = available - processing - setup - maintenance) for zero real
            # work. Pin them off whenever the item is not chosen.
            model.add(maintenance == 0).only_enforce_if(chosen.Not())
            model.add(used == 0).only_enforce_if(chosen.Not())
        if is_optional:
            # Same exploit through setup, at EVERY stage: an unchosen item's `su`
            # is otherwise free, and whenever idle_minutes outweighs setup_minutes
            # the solver books phantom setup on it to shrink idle.
            model.add(su == 0).only_enforce_if(chosen.Not())
        if apply_release:
            model.add(b >= item["release"])
        if is_optional:
            # Safe even when never visited: keeps unchosen items from carrying an
            # unconstrained/garbage end time into anything that reads op[*]['e'].
            model.add(e == 0).only_enforce_if(chosen.Not())
        choices = []
        for mid in eligible(data, item, stage):
            spec = data["machines"][mid]
            x = model.new_bool_var(f"{lid}_{stage}_{mid}")
            selected[key, mid] = x
            candidates[mid].append((key, item, x))
            choices.append(x)
            p = duration(data, item, mid)
            mt = spec.get("mold", {}).get("maintenance_minutes", 0)
            model.add(s == b+su+mt*maintenance).only_enforce_if(x)
            model.add(e == s+p).only_enforce_if(x)
            length = integer(f"{lid}_{mid}_length", p+max_setup+mt)
            model.add(length == p+su+mt*maintenance)
            interval = model.new_optional_interval_var(b,length,e,x,f"{lid}_{mid}_block")
            intervals[mid].append(interval)
            processing_terms.append(p*x)
            wins = []
            for window in spec["windows"]:
                if window.get("closable") and not is_optional:
                    continue  # R06/A08: mandatory work must fit already-open capacity
                if window["end"] < item["release"] + p or window["end"]-window["start"] < p:
                    continue
                z = model.new_bool_var(f"{lid}_{mid}_w{window['id']}")
                window_vars[key, mid, window["id"]] = z
                wins.append(z)
                model.add(b >= window["start"]).only_enforce_if(z)
                model.add(e <= window["end"]).only_enforce_if(z)
                opens.setdefault((mid,window["shift"]), []).append(z)
            model.add(sum(wins) == x)
        if is_optional:
            model.add(sum(choices) == chosen)
        else:
            model.add_exactly_one(choices)
    for lot in lots:
        lid = lot["id"]
        is_optional = bool(lot.get("optional"))
        chosen = model.new_bool_var(f"{lid}_chosen") if is_optional else None
        if is_optional:
            lot_chosen[lid] = chosen
        for k, stage in enumerate(STAGES):
            add_stage_node(lot, stage, k == 0, is_optional, chosen)
    for run in runs:
        rid = run["id"]
        chosen = model.new_bool_var(f"{rid}_chosen")
        run_chosen[rid] = chosen
        add_stage_node(run, run["stage"], True, True, chosen)
    # C7b: BTP (semi-finished) reservoir per BTP code (A09: a code is a free-standing
    # identity that one or more (product, stage in {cast,cnc,paint}) can share). A
    # stage-k run credits qty at E_o + transfer_minutes (fixed handoff lag) into the
    # code its OWN (product, stage) routes to; the stage-(k+1) run of ANY lot whose
    # (product, prior-stage) routes to the SAME code debits qty at its block-start
    # W_o. No same-lot precedence remains (A10): interleaving across lots — and now
    # across products sharing a code — is allowed.
    transfer_minutes = data.get("transfer_minutes", 0)
    routing = data["btp_routing"]
    # (time, delta, active) per BTP code; `active` gates a reserve item's event
    # off entirely when it is not chosen (A08) instead of trusting its garbage
    # b/e value -- a mandatory item's events are always active (literal True).
    events_by_code = {code: [] for code in data["btp_codes"]}
    for lot in lots:
        active = lot_chosen.get(lot["id"], True)
        for k, stage in enumerate(BTP_STAGES):
            code = routing[lot["product"]][stage]
            events_by_code[code].append((op[lot["id"], stage]["e"] + transfer_minutes, lot["quantity"], active))
            next_stage = STAGES[k+1]
            events_by_code[code].append((op[lot["id"], next_stage]["b"], -lot["quantity"], active))
    for run in runs:
        code = routing[run["product"]][run["stage"]]
        events_by_code[code].append((op[run["id"], run["stage"]]["e"] + transfer_minutes, run["quantity"], run_chosen[run["id"]]))
    for code, events in events_by_code.items():
        initial = data.get("inventory_btp", {}).get(code, 0)
        times = [0] + [t for t, _, _ in events]
        level_changes = [initial] + [d for _, d, _ in events]
        actives = [True] + [a for _, _, a in events]
        cap = data.get("btp_capacity", {}).get(code)
        # Safe upper bound when uncapped: the level can never exceed everything
        # ever credited (initial stock plus all production events for this code).
        max_level = cap if cap is not None else initial + sum(d for _, d, _ in events if d > 0)
        model.add_reservoir_constraint_with_active(times, level_changes, actives, 0, max(max_level, 0))
        if cap is not None:
            # R12 books a same-instant credit BEFORE the debit, so the capacity
            # peak includes it; the reservoir above nets same-instant events and
            # would miss that peak. Re-check the cap with every debit moved one
            # minute later: with integer times this is exactly credit-first at a
            # tie and never tighter elsewhere (the pre-debit level was already
            # bounded by the cap).
            late = [t + 1 if d < 0 else t for t, d in zip(times, level_changes)]
            floor = -sum(-d for d in level_changes if d < 0)
            model.add_reservoir_constraint_with_active(late, level_changes, actives, min(floor, 0), cap)
    arcs_record = {}
    for mid, nodes in candidates.items():
        machine = data["machines"][mid]
        model.add_no_overlap(intervals[mid])
        empty = model.new_bool_var(f"{mid}_empty")
        arcs = [(0,0,empty)]
        model.add(sum(x for _,_,x in nodes) == 0).only_enforce_if(empty)
        model.add(sum(x for _,_,x in nodes) >= 1).only_enforce_if(empty.Not())
        for j,(key,lot,x) in enumerate(nodes, 1):
            arcs.append((j,j,x.Not()))
            first = model.new_bool_var(f"{mid}_first_{j}")
            last = model.new_bool_var(f"{mid}_last_{j}")
            arcs.extend([(0,j,first),(j,0,last)])
            arcs_record[mid, None, key] = first
            arcs_record[mid, key, None] = last
            model.add_implication(first,x)
            model.add_implication(last,x)
            predecessors = [(first, None, None)]
            for i,(prev_key,prev_lot,prev_x) in enumerate(nodes, 1):
                if i == j:
                    continue
                arc = model.new_bool_var(f"{mid}_{i}_{j}")
                arcs.append((i,j,arc))
                arcs_record[mid,prev_key,key] = arc
                model.add_implication(arc,x)
                model.add_implication(arc,prev_x)
                model.add(op[key]["b"] >= op[prev_key]["e"]).only_enforce_if(arc)
                predecessors.append((arc,prev_key,prev_lot))
            mold = machine.get("mold")
            target = stage_item(data, lot, machine["stage"])
            for arc,prev_key,prev_lot in predecessors:
                previous = machine["initial_product"] if prev_lot is None else stage_item(data, prev_lot, machine["stage"])
                if mold:
                    cycles = (lot["quantity"]+mold["cavities"]-1)//mold["cavities"]
                    before = mold["initial_cycles"] if prev_key is None else op[prev_key]["used"]
                    need = op[key]["maintenance"]
                    model.add(before+cycles >= mold["limit_cycles"]+1).only_enforce_if([arc,need])
                    model.add(before+cycles <= mold["limit_cycles"]).only_enforce_if([arc,need.Not()])
                    model.add(op[key]["used"] == cycles).only_enforce_if([arc,need])
                    model.add(op[key]["used"] == before+cycles).only_enforce_if([arc,need.Not()])
                    model.add(op[key]["su"] == setup(data,mid,mold["after_maintenance"],target)).only_enforce_if([arc,need])
                    model.add(op[key]["su"] == setup(data,mid,previous,target)).only_enforce_if([arc,need.Not()])
                else:
                    model.add(op[key]["su"] == setup(data,mid,previous,target)).only_enforce_if(arc)
        model.add_circuit(arcs)
    shift_vars = {}
    for (mid,sid), values in opens.items():
        y = model.new_bool_var(f"{mid}_{sid}_open")
        model.add_max_equality(y, values)
        shift_vars[mid,sid] = y
        minutes = next(s["available_minutes"] for s in data["machines"][mid]["shifts"] if s["id"] == sid)
        available.append(minutes*y)
    completion, tardiness = {}, []
    for order in data["orders"]:
        c = integer(order["id"]+"_complete")
        model.add_max_equality(c, [order["release"]] + [op[lid,"qc"]["e"] for lid in order["lot_allocations"]])
        completion[order["id"]] = c
        t = integer(order["id"]+"_tardy")
        model.add_max_equality(t,[0,c-order["due"]])
        tardiness.append(order["priority"]*t)
        if "deadline" in order:
            model.add(c <= order["deadline"])
    max_finished = {p: data["initial_inventory"][p] + sum(l["quantity"] for l in lots if l["product"] == p)
                     for p in data["products"]}
    shortfalls, surpluses = [], []
    for checkpoint in data["checkpoints"]:
        finished, shipped = {}, {}
        for lot in lots:
            z = model.new_bool_var(f"{lot['id']}_done_{checkpoint}")
            model.add(op[lot["id"],"qc"]["e"] <= checkpoint).only_enforce_if(z)
            model.add(op[lot["id"],"qc"]["e"] > checkpoint).only_enforce_if(z.Not())
            if lot["id"] in lot_chosen:
                # A08: an unchosen reserve lot must not credit finished inventory
                # just because its otherwise-unconstrained `e` happens to satisfy
                # the checkpoint comparison; require BOTH chosen and finished.
                chosen = lot_chosen[lot["id"]]
                credited = model.new_bool_var(f"{lot['id']}_credited_{checkpoint}")
                model.add(credited <= chosen)
                model.add(credited <= z)
                model.add(credited >= chosen+z-1)
                finished[lot["id"]] = credited
            else:
                finished[lot["id"]] = z
        for order in data["orders"]:
            z = model.new_bool_var(f"{order['id']}_ship_{checkpoint}")
            model.add(completion[order["id"]] <= checkpoint).only_enforce_if(z)
            model.add(completion[order["id"]] > checkpoint).only_enforce_if(z.Not())
            shipped[order["id"]] = z
        for product in data["products"]:
            inv = data["initial_inventory"][product] + sum(l["quantity"]*finished[l["id"]] for l in lots if l["product"] == product)
            inv -= sum(o["quantity"]*shipped[o["id"]] for o in data["orders"] if o["product"] == product)
            model.add(inv >= 0)
            cap = data.get("inventory_cap", {}).get(product)
            if cap is not None:
                model.add(inv <= cap)  # R04: trần tồn theo sản phẩm
            short = integer(f"{product}_short_{checkpoint}", data["safety_stock"][product])
            model.add_max_equality(short,[0,data["safety_stock"][product]-inv])
            shortfalls.append(short)
            # 4.3.2/4.3.3 "rủi ro tồn dư": inert (weight 0) unless weights declare
            # surplus_holding, so datasets without a reserve policy are unaffected.
            hi = max(0, (cap if cap is not None else max_finished[product]) - data["safety_stock"][product])
            surplus = integer(f"{product}_surplus_{checkpoint}", hi)
            model.add_max_equality(surplus,[0,inv-data["safety_stock"][product]])
            surpluses.append(surplus)
    # Nonnegative inventory at intermediate events follows fixed, non-overallocated
    # order allocations and shipping only after ALL allocated lots complete QC.
    # Mục 4.3.1: the objective's makespan is MANDATORY makespan -- the latest QC
    # completion of a mandatory lot (from horizon start = minute 0). Reserve work
    # (pull-ahead lots/BTP runs) must not stretch it; the full schedule end incl.
    # reserve work is reported separately by evaluate() as schedule_end.
    makespan = integer("mandatory_makespan")
    model.add_max_equality(makespan, [op[l["id"], "qc"]["e"] for l in lots if l["id"] not in lot_chosen])
    setup_total = sum(v["su"] for v in op.values())
    maint_total = sum(data["machines"][eligible(data,l,"cast")[0]]["mold"]["maintenance_minutes"]*op[l["id"],"cast"]["maintenance"] for l in lots)
    maint_total += sum(data["machines"][eligible(data,r,"cast")[0]]["mold"]["maintenance_minutes"]*op[r["id"],"cast"]["maintenance"] for r in runs if r["stage"] == "cast")
    idle = sum(available)-sum(processing_terms)-setup_total-maint_total
    model.add(idle >= 0)
    # A08/4.3.2: an optional item chosen -- finished lot or single-stage BTP
    # run -- pays a small flat "sản xuất tăng thêm" weight; a closable shift
    # actually opened pays its own flat "mở ca" weight, on top of any idle
    # minutes it introduces (already counted above). Both default to 0, so a
    # dataset without a reserve policy gets byte-identical objectives to before.
    # A02/R04: technical surplus (fixed by the input) plus CHOSEN reserve lots
    # stays within max_surplus -- an unchosen candidate no longer eats the limit.
    reserve_lot_qty = {lid: next(l["quantity"] for l in lots if l["id"] == lid) for lid in lot_chosen}
    model.add(sum(technical_surplus(data).values())
              + sum(q*lot_chosen[lid] for lid,q in reserve_lot_qty.items()) <= data["max_surplus"])
    # A08 contract-manufacturing policy: reserve work is "làm trước" for confirmed
    # long-term orders, so per product it may not exceed their remaining demand.
    # Symmetry breaking: interchangeable reserve candidates (same product, size,
    # release) are picked in declaration order -- same optimum, far less search.
    twins = {}
    for lot in lots:
        if lot["id"] in lot_chosen:
            twins.setdefault((lot["product"], lot["quantity"], lot["release"]), []).append(lot_chosen[lot["id"]])
    for group in twins.values():
        for earlier, later in zip(group, group[1:]):
            model.add(later <= earlier)
    cap = pull_ahead_cap(data)
    if cap is not None:
        for product, limit in cap.items():
            ahead = [l["quantity"]*lot_chosen[l["id"]] for l in lots if l["id"] in lot_chosen and l["product"] == product]
            ahead += [r["quantity"]*run_chosen[r["id"]] for r in runs if r["product"] == product]
            if ahead:
                model.add(sum(ahead) <= limit)
    reserve_chosen_total = sum(lot_chosen.values())+sum(run_chosen.values())
    closable_shift_ids = {(mid,s["id"]) for mid,m in data["machines"].items() for s in m["shifts"] if s.get("closable")}
    shift_opening_total = sum(y for key,y in shift_vars.items() if key in closable_shift_ids)
    w = data["weights"]
    objective = (w["makespan"]*makespan+w["weighted_tardiness"]*sum(tardiness)+w["setup_minutes"]*setup_total
                 +w["idle_minutes"]*idle+w["safety_shortfall"]*sum(shortfalls)
                 +w.get("reserve_production",0)*reserve_chosen_total
                 +w.get("surplus_holding",0)*sum(surpluses)
                 +w.get("shift_opening",0)*shift_opening_total)
    model.minimize(objective)
    if hint:
        # A08: a hint built from a run that had no (or a different) reserve
        # selection simply doesn't cover every optional op-node -- skip those
        # instead of crashing; the solver searches them from scratch.
        for key, v in op.items():
            row = hint_lookup.get(key)
            if row is None:
                continue
            for field, source in [("b","block_start"),("s","start"),("e","end"),("su","setup_minutes"),("used","cycles_after")]:
                model.add_hint(v[field],row[source])
            model.add_hint(v["maintenance"], int(row["maintenance_minutes"]>0))
            if fixed_lots and key[0] in fixed_lots:
                for field, source in [("b","block_start"),("s","start"),("e","end")]:
                    model.add(v[field] == row[source])
                model.add(selected[key,row["machine"]] == 1)
        for (key,mid), x in selected.items():
            row = hint_lookup.get(key)
            if row is not None:
                model.add_hint(x,int(row["machine"] == mid))
        for (key,mid,wid), z in window_vars.items():
            row = hint_lookup.get(key)
            if row is not None:
                model.add_hint(z,int(row["machine"] == mid and row["window"] == wid))
        chosen_arcs = set()
        for mid in data["machines"]:
            seq = sorted([r for r in hint if r["machine"] == mid],key=lambda r:r["block_start"])
            keys = [None]+[(r["lot"],r["stage"]) for r in seq]+[None]
            chosen_arcs.update((mid,a,b) for a,b in zip(keys,keys[1:]))
        for key,arc in arcs_record.items():
            model.add_hint(arc,int(key in chosen_arcs))
        opened = {(r["machine"],r["shift"]) for r in hint}
        for key,y in shift_vars.items():
            model.add_hint(y,int(key in opened))
    build_seconds = time.perf_counter()-started
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max(.01, seconds-build_seconds)
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = seed
    history = []
    class Progress(cp_model.CpSolverSolutionCallback):
        def on_solution_callback(self):
            history.append({"seconds": time.perf_counter()-started, "objective": self.objective_value})
    status = solver.solve(model, Progress())
    metadata = {"status": solver.status_name(status), "build_seconds": build_seconds,
                "solve_seconds": solver.wall_time, "history": history,
                "bound": solver.best_objective_bound if status in (cp_model.OPTIMAL,cp_model.FEASIBLE) else None,
                "bound_scope": "neighborhood" if fixed_lots else "full_static_model",
                "response_stats": solver.response_stats()}
    if status not in (cp_model.OPTIMAL,cp_model.FEASIBLE):
        return None, metadata
    def emit(item, stage, is_optional):
        key = item["id"], stage
        v = op[key]
        chosen_machines = [mid for mid in eligible(data,item,stage) if solver.value(selected[key,mid])]
        if is_optional and not chosen_machines:
            return None  # A08: reserve item not chosen this solve -- no row
        mid = chosen_machines[0]
        spec = data["machines"][mid]
        wid = next(wid for (k,m,wid),z in window_vars.items() if k == key and m == mid and solver.value(z))
        window = next(w for w in spec["windows"] if w["id"] == wid)
        # Row shape stays byte-identical to the pre-A08 contract (backend does
        # ScheduleOperation(**row)); which lot/run ids were chosen lives in
        # metadata["reserve_lots_chosen"]/["reserve_btp_runs_chosen"] instead.
        return {"lot": item["id"],"stage": stage,"machine":mid,
                "block_start":solver.value(v["b"]),"start":solver.value(v["s"]),"end":solver.value(v["e"]),
                "setup_minutes":solver.value(v["su"]),"maintenance_minutes":spec.get("mold",{}).get("maintenance_minutes",0)*solver.value(v["maintenance"]),
                "cycles_after":solver.value(v["used"]),"mold":spec.get("mold",{}).get("id"),
                "window":wid,"shift":window["shift"]}
    rows = []
    for lot in lots:
        is_optional = lot["id"] in lot_chosen
        for stage in STAGES:
            row = emit(lot, stage, is_optional)
            if row is not None:
                rows.append(row)
    for run in runs:
        row = emit(run, run["stage"], True)
        if row is not None:
            rows.append(row)
    metadata["solver_objective"] = solver.objective_value
    metadata["reserve_lots_chosen"] = [lid for lid,v in lot_chosen.items() if solver.value(v)]
    metadata["reserve_btp_runs_chosen"] = [rid for rid,v in run_chosen.items() if solver.value(v)]
    return rows, metadata
