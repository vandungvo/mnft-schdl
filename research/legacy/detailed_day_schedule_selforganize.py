"""
So sanh voi detailed_day_schedule.py: o file do, MINH tu chia san luong
moi ngay thanh cac lo co dinh (ham split_into_lots, toi da 20 don vi/lo)
roi moi dua cho CP-SAT xep lich -- tuc la MINH da quyet dinh truoc cau
truc lo, solver chi con viec xep thu tu + chon may.

O file nay, KHONG chia lo truoc nua. So luong moi loai trong ngay duoc
dua thang cho model duoi dang mot so "o lo" (slot) toi da, moi slot co
KICH THUOC LA BIEN QUYET DINH (co the = 0 nghia la khong dung slot do).
Model TU QUYET DINH nen chia thanh may lo, moi lo bao nhieu, chay may
nao, thu tu ra sao -- tat ca trong CUNG mot lan giai, khong qua buoc
tien xu ly nao cua con nguoi.

Chay: python detailed_day_schedule_selforganize.py
So sanh output voi: python detailed_day_schedule.py
"""

from ortools.sat.python import cp_model
import legacy.production_planning_2weeks as agg
import legacy.detailed_day_schedule as fixed  # tai su dung MACHINES/ELIGIBLE/CHANGEOVER/BUDGET

MACHINES = fixed.MACHINES
ELIGIBLE = fixed.ELIGIBLE
MACHINE_DAILY_BUDGET = fixed.MACHINE_DAILY_BUDGET
CAST_TIME = fixed.CAST_TIME
CNC_TIME = fixed.CNC_TIME
setup_time = fixed.setup_time
MIN_BATCH = fixed.LOT_MIN  # kich thuoc toi thieu 1 lo neu duoc dung (10)
MAX_SLOTS = 3  # so "o lo" toi da model duoc quyen dung cho 1 loai/ngay -- KHONG ep phai dung het


def schedule_stage_selforganize(stage, day_plan, horizon=200):
    """day_plan: {type: qty}. Model tu quyet dinh so luong lo, kich thuoc
    tung lo, may nao, thu tu nao -- khong co buoc chia lo thu cong."""
    active_types = [t for t, q in day_plan.items() if q > 0]
    if not active_types:
        return {m: {"schedule": {}, "work": 0, "end": 0, "sizes": {}} for m in MACHINES[stage]}

    unit_time = CAST_TIME if stage == "cast" else CNC_TIME
    use_setup = stage == "cast"
    model = cp_model.CpModel()

    names = []          # danh sach "batch" (t, k)
    size, present = {}, {}
    start, end, dur = {}, {}, {}
    job_type = {}

    for t in active_types:
        qty = day_plan[t]
        slot_sizes = []
        for k in range(MAX_SLOTS):
            name = f"{t}-{stage}-{k}"
            sz = model.NewIntVar(0, qty, f"size_{name}")
            pr = model.NewBoolVar(f"present_{name}")
            model.Add(sz >= MIN_BATCH).OnlyEnforceIf(pr)
            model.Add(sz == 0).OnlyEnforceIf(pr.Not())
            size[name], present[name] = sz, pr
            slot_sizes.append(sz)
            # be gay doi xung: slot sau chi duoc dung neu slot truoc da dung
            if k > 0:
                model.Add(present[f"{t}-{stage}-{k-1}"] >= pr)
            names.append(name)
            job_type[name] = t
        model.Add(sum(slot_sizes) == qty)

        for k in range(MAX_SLOTS):
            name = f"{t}-{stage}-{k}"
            d = model.NewIntVar(0, horizon, f"dur_{name}")
            model.Add(d == size[name] * unit_time[t])
            s = model.NewIntVar(0, horizon, f"s_{name}")
            e = model.NewIntVar(0, horizon, f"e_{name}")
            model.Add(e == s + d)
            start[name], end[name], dur[name] = s, e, d

    assigned = {}
    for name in names:
        t = job_type[name]
        eligible_machines = [m for m in MACHINES[stage] if t in ELIGIBLE[stage, m]]
        lits = []
        for m in eligible_machines:
            lit = model.NewBoolVar(f"assign_{name}_{m}")
            assigned[name, m] = lit
            lits.append(lit)
        model.Add(sum(lits) == present[name])  # chi gan may NEU slot duoc dung

    active = {}
    for m in MACHINES[stage]:
        a = model.NewBoolVar(f"active_{m}")
        for name in names:
            if (name, m) in assigned:
                model.AddImplication(assigned[name, m], a)
        active[m] = a

    for m in MACHINES[stage]:
        eligible_names = [name for name in names if (name, m) in assigned]
        DEPOT = 0
        idx = {name: i + 1 for i, name in enumerate(eligible_names)}
        arcs = []
        for name in eligible_names:
            arcs.append((idx[name], idx[name], assigned[name, m].Not()))
        for name in eligible_names:
            arcs.append((DEPOT, idx[name], model.NewBoolVar(f"d0_{m}_{name}")))
            arcs.append((idx[name], DEPOT, model.NewBoolVar(f"d1_{m}_{name}")))
        arcs.append((DEPOT, DEPOT, model.NewBoolVar(f"dloop_{m}")))
        for i_name in eligible_names:
            for k_name in eligible_names:
                if i_name == k_name:
                    continue
                lit = model.NewBoolVar(f"seq_{m}_{i_name}_{k_name}")
                arcs.append((idx[i_name], idx[k_name], lit))
                su = setup_time(job_type[i_name], job_type[k_name]) if use_setup else 0
                model.Add(start[k_name] >= end[i_name] + su).OnlyEnforceIf(lit)
        model.AddCircuit(arcs)

    makespan = model.NewIntVar(0, horizon, "makespan")
    model.AddMaxEquality(makespan, [end[name] for name in names])

    overtime_vars = []
    for m in MACHINES[stage]:
        eligible_names = [name for name in names if (name, m) in assigned]
        budget = MACHINE_DAILY_BUDGET[m]
        end_m = model.NewIntVar(0, horizon, f"end_{m}")
        if eligible_names:
            contribs = []
            for name in eligible_names:
                c = model.NewIntVar(0, horizon, f"contrib_{m}_{name}")
                model.Add(c == end[name]).OnlyEnforceIf(assigned[name, m])
                model.Add(c == 0).OnlyEnforceIf(assigned[name, m].Not())
                contribs.append(c)
            model.AddMaxEquality(end_m, contribs + [0])
        else:
            model.Add(end_m == 0)
        ot = model.NewIntVar(0, horizon, f"overtime_{m}")
        model.AddMaxEquality(ot, [end_m - budget, 0])
        overtime_vars.append(ot)

    OVERTIME_COST = 10_000
    ACTIVATION_COST = 500
    BATCH_COUNT_COST = 50   # uu tien it lo hon neu khong anh huong gi khac -- nhung KHONG ep buoc
    model.Minimize(
        OVERTIME_COST * sum(overtime_vars)
        + ACTIVATION_COST * sum(active[m] for m in MACHINES[stage])
        + BATCH_COUNT_COST * sum(present[name] for name in names)
        + makespan
    )

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = 20
    status = solver.Solve(model)
    assert status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    per_machine = {}
    for m in MACHINES[stage]:
        used = [name for name in names if (name, m) in assigned and solver.Value(assigned[name, m])]
        used.sort(key=lambda name: solver.Value(start[name]))
        sched = {name: (solver.Value(start[name]), solver.Value(end[name])) for name in used}
        work = sum(solver.Value(dur[name]) for name in used)
        end_time = max((e for _, e in sched.values()), default=0)
        per_machine[m] = {
            "schedule": sched, "work": work, "end": end_time,
            "sizes": {name: solver.Value(size[name]) for name in used},
        }
    return per_machine


def render_gantt(per_machine, job_type_of_name):
    width = max((info["end"] for info in per_machine.values()), default=0) + 1
    width = max(width, 1)
    for m, info in per_machine.items():
        chars = ["."] * width
        for name, (s, e) in info["schedule"].items():
            label = job_type_of_name[name]
            for t in range(s, min(e, width)):
                chars[t] = label
        budget = MACHINE_DAILY_BUDGET[m]
        flag = f"  *** VUOT CA LAM VIEC (ca={budget}) ***" if info["end"] > budget else ""
        sizes = ", ".join(f"{n}={v}" for n, v in info["sizes"].items())
        print(f"{m:<5}: {''.join(chars):<{width}} work={info['work']:>3} end={info['end']:>3}{flag}")
        if sizes:
            print(f"        lo: {sizes}")


def run_day(day, agg_result):
    cast_plan = {t: agg_result["plan"][t, day]["cast"] for t in agg.TYPES if agg_result["plan"][t, day]["cast"] > 0}
    cnc_plan = {t: agg_result["plan"][t, day]["cnc"] for t in agg.TYPES if agg_result["plan"][t, day]["cnc"] > 0}

    print(f"=== Ngay {day} -- Duc: {cast_plan}  CNC: {cnc_plan} ===")

    cast_result = schedule_stage_selforganize("cast", cast_plan)
    cnc_result = schedule_stage_selforganize("cnc", cnc_plan)

    job_type = {}
    for m, info in list(cast_result.items()) + list(cnc_result.items()):
        for name in info["schedule"]:
            job_type[name] = name.split("-")[0]

    print("--- DUC (model tu chia lo) ---")
    render_gantt(cast_result, job_type)
    print("--- CNC (model tu chia lo) ---")
    render_gantt(cnc_result, job_type)

    n_batches = sum(len(info["schedule"]) for info in list(cast_result.values()) + list(cnc_result.values()))
    print(f"Tong so lo model tu tao ra hom nay: {n_batches}")
    print()
    return n_batches


if __name__ == "__main__":
    agg_result = agg.build_and_solve()
    total_batches = 0
    for day in agg.DAYS:
        total_batches += run_day(day, agg_result)
    print(f"TONG so lo ca 2 tuan (model tu quyet dinh): {total_batches}")
