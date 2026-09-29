from __future__ import annotations

import time
from ortools.sat.python import cp_model
from .instance import BTP_STAGES, STAGES, duration, eligible, setup


def solve(data, seconds=30, seed=11, hint=None, fixed_lots=None):
    """Full static model; LNS uses explicit fixed-lot restrictions, not global bounds."""
    started = time.perf_counter()
    model = cp_model.CpModel()
    h = data["horizon"]
    lots = data["lots"]
    max_setup = max(t for m in data["machines"].values() for row in m["setup"].values() for t in row.values())
    max_cycles = max(m.get("mold", {}).get("limit_cycles", 0) for m in data["machines"].values())
    op = {}
    candidates = {m: [] for m in data["machines"]}
    selected, window_vars, intervals = {}, {}, {m: [] for m in data["machines"]}
    opens = {}
    available = []
    processing_terms = []
    hint_lookup = {(r["lot"], r["stage"]): r for r in hint or []}
    def integer(name, hi=h):
        return model.new_int_var(0, hi, name)
    for lot in lots:
        lid = lot["id"]
        for k, stage in enumerate(STAGES):
            key = (lid, stage)
            b,s,e = [integer(f"{lid}_{stage}_{name}") for name in ("b","s","e")]
            su = integer(f"{lid}_{stage}_su", max_setup)
            maintenance = model.new_bool_var(f"{lid}_{stage}_maintenance")
            used = integer(f"{lid}_{stage}_cycles", max_cycles)
            op[key] = {"b": b, "s": s, "e": e, "su": su, "maintenance": maintenance, "used": used}
            if stage != "cast":
                model.add(maintenance == 0)
                model.add(used == 0)
            if k == 0:
                model.add(b >= lot["release"])
            choices = []
            for mid in eligible(data, lot, stage):
                spec = data["machines"][mid]
                x = model.new_bool_var(f"{lid}_{stage}_{mid}")
                selected[key, mid] = x
                candidates[mid].append((key, lot, x))
                choices.append(x)
                p = duration(data, lot, mid)
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
                    if window["end"] < lot["release"] + p or window["end"]-window["start"] < p:
                        continue
                    z = model.new_bool_var(f"{lid}_{mid}_w{window['id']}")
                    window_vars[key, mid, window["id"]] = z
                    wins.append(z)
                    model.add(b >= window["start"]).only_enforce_if(z)
                    model.add(e <= window["end"]).only_enforce_if(z)
                    opens.setdefault((mid,window["shift"]), []).append(z)
                model.add(sum(wins) == x)
            model.add_exactly_one(choices)
    # C7b: BTP (semi-finished) reservoir per BTP code (A09: a code is a free-standing
    # identity that one or more (product, stage in {cast,cnc,paint}) can share). A
    # stage-k run credits qty at E_o + transfer_minutes (fixed handoff lag) into the
    # code its OWN (product, stage) routes to; the stage-(k+1) run of ANY lot whose
    # (product, prior-stage) routes to the SAME code debits qty at its block-start
    # W_o. No same-lot precedence remains (A10): interleaving across lots — and now
    # across products sharing a code — is allowed.
    transfer_minutes = data.get("transfer_minutes", 0)
    routing = data["btp_routing"]
    events_by_code = {code: [] for code in data["btp_codes"]}
    for lot in lots:
        for k, stage in enumerate(BTP_STAGES):
            code = routing[lot["product"]][stage]
            events_by_code[code].append((op[lot["id"], stage]["e"] + transfer_minutes, lot["quantity"]))
            next_stage = STAGES[k+1]
            events_by_code[code].append((op[lot["id"], next_stage]["b"], -lot["quantity"]))
    for code, events in events_by_code.items():
        initial = data.get("inventory_btp", {}).get(code, 0)
        times = [0] + [t for t, _ in events]
        level_changes = [initial] + [d for _, d in events]
        cap = data.get("btp_capacity", {}).get(code)
        # Safe upper bound when uncapped: the level can never exceed everything
        # ever credited (initial stock plus all production events for this code).
        max_level = cap if cap is not None else initial + sum(d for _, d in events if d > 0)
        model.add_reservoir_constraint(times, level_changes, 0, max(max_level, 0))
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
            for arc,prev_key,prev_lot in predecessors:
                previous = machine["initial_product"] if prev_lot is None else prev_lot["product"]
                if mold:
                    cycles = (lot["quantity"]+mold["cavities"]-1)//mold["cavities"]
                    before = mold["initial_cycles"] if prev_key is None else op[prev_key]["used"]
                    need = op[key]["maintenance"]
                    model.add(before+cycles >= mold["limit_cycles"]+1).only_enforce_if([arc,need])
                    model.add(before+cycles <= mold["limit_cycles"]).only_enforce_if([arc,need.Not()])
                    model.add(op[key]["used"] == cycles).only_enforce_if([arc,need])
                    model.add(op[key]["used"] == before+cycles).only_enforce_if([arc,need.Not()])
                    model.add(op[key]["su"] == setup(data,mid,mold["after_maintenance"],lot["product"])).only_enforce_if([arc,need])
                    model.add(op[key]["su"] == setup(data,mid,previous,lot["product"])).only_enforce_if([arc,need.Not()])
                else:
                    model.add(op[key]["su"] == setup(data,mid,previous,lot["product"])).only_enforce_if(arc)
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
    shortfalls = []
    for checkpoint in data["checkpoints"]:
        finished, shipped = {}, {}
        for lot in lots:
            z = model.new_bool_var(f"{lot['id']}_done_{checkpoint}")
            model.add(op[lot["id"],"qc"]["e"] <= checkpoint).only_enforce_if(z)
            model.add(op[lot["id"],"qc"]["e"] > checkpoint).only_enforce_if(z.Not())
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
            short = integer(f"{product}_short_{checkpoint}", data["safety_stock"][product])
            model.add_max_equality(short,[0,data["safety_stock"][product]-inv])
            shortfalls.append(short)
    # Nonnegative inventory at intermediate events follows fixed, non-overallocated
    # order allocations and shipping only after ALL allocated lots complete QC.
    makespan = integer("makespan")
    model.add_max_equality(makespan, [v["e"] for v in op.values()])
    setup_total = sum(v["su"] for v in op.values())
    maint_total = sum(data["machines"][eligible(data,l,"cast")[0]]["mold"]["maintenance_minutes"]*op[l["id"],"cast"]["maintenance"] for l in lots)
    idle = sum(available)-sum(processing_terms)-setup_total-maint_total
    model.add(idle >= 0)
    w = data["weights"]
    objective = w["makespan"]*makespan+w["weighted_tardiness"]*sum(tardiness)+w["setup_minutes"]*setup_total+w["idle_minutes"]*idle+w["safety_shortfall"]*sum(shortfalls)
    model.minimize(objective)
    if hint:
        for key, v in op.items():
            row = hint_lookup[key]
            for field, source in [("b","block_start"),("s","start"),("e","end"),("su","setup_minutes"),("used","cycles_after")]:
                model.add_hint(v[field],row[source])
            model.add_hint(v["maintenance"], int(row["maintenance_minutes"]>0))
            if fixed_lots and key[0] in fixed_lots:
                for field, source in [("b","block_start"),("s","start"),("e","end")]:
                    model.add(v[field] == row[source])
                model.add(selected[key,row["machine"]] == 1)
        for (key,mid), x in selected.items():
            model.add_hint(x,int(hint_lookup[key]["machine"] == mid))
        for (key,mid,wid), z in window_vars.items():
            row = hint_lookup[key]
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
    rows = []
    for lot in lots:
        for stage in STAGES:
            key = lot["id"],stage
            v = op[key]
            mid = next(mid for mid in eligible(data,lot,stage) if solver.value(selected[key,mid]))
            spec = data["machines"][mid]
            wid = next(wid for (k,m,wid),z in window_vars.items() if k == key and m == mid and solver.value(z))
            window = next(w for w in spec["windows"] if w["id"] == wid)
            rows.append({"lot": lot["id"],"stage": stage,"machine":mid,
                         "block_start":solver.value(v["b"]),"start":solver.value(v["s"]),"end":solver.value(v["e"]),
                         "setup_minutes":solver.value(v["su"]),"maintenance_minutes":spec.get("mold",{}).get("maintenance_minutes",0)*solver.value(v["maintenance"]),
                         "cycles_after":solver.value(v["used"]),"mold":spec.get("mold",{}).get("id"),
                         "window":wid,"shift":window["shift"]})
    metadata["solver_objective"] = solver.objective_value
    return rows, metadata
