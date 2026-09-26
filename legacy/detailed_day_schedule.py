"""
Tang 2 (detailed scheduling) noi tiep Tang 1 (aggregate planning trong
production_planning_2weeks.py) -- dung kien truc phan cap thuc te trong
san xuat: Aggregate Planning -> Detailed Scheduling.

Tang 1 chi quyet dinh MOI NGAY san xuat bao nhieu don vi MOI LOAI (muc
tong hop, kiem tra TONG cong suat he thong, khong biet may nao lam
duoc loai nao). Tang 2 nhan dau ra cua Tang 1 lam INPUT va xep CU THE:
lo nao chay tren may nao, thu tu ra sao trong ngay -- dung lai bo may +
machine eligibility + changeover tu scheduling_poc_multi.py.

Diem quan trong (chinh la ly do can ca 2 tang): Tang 1 chi kiem tra
TONG cong suat (VD CNC_CAP_PER_DAY=160 cho ca 2 may CNC gop lai) ma
KHONG biet may nao lam duoc loai nao. Ke hoach "tren giay" co the wo
tinh kha thi (tong du cong suat) nhung THUC TE khong thuc hien duoc vi
1 loai bi don het vao 1 may (do eligibility), vuot qua suc chua rieng
cua may do trong 1 ca. Tang 2 la noi PHAT HIEN dieu nay -- xem ket qua
Ngay 10, may CNC1 phai gong het viec cua loai B (CNC2 khong lam duoc B).

Chay: python detailed_day_schedule.py
"""

from ortools.sat.python import cp_model
import legacy.production_planning_2weeks as agg

MACHINES = {"cast": ["Cast1", "Cast2"], "cnc": ["CNC1", "CNC2"]}
ELIGIBLE = {
    ("cast", "Cast1"): {"A", "B", "C"},
    ("cast", "Cast2"): {"A", "B"},        # khong co khuon cho C
    ("cnc", "CNC1"): {"A", "B", "C"},
    ("cnc", "CNC2"): {"A", "C"},          # khong co do ga cho B
}
CHANGEOVER = {
    frozenset({"A", "B"}): 2,
    frozenset({"A", "C"}): 3,
    frozenset({"B", "C"}): 2,
}
CAST_TIME = agg.CAST_TIME
CNC_TIME = agg.CNC_TIME

# Cong suat DANH NGHIA cua TUNG may trong 1 ca lam viec -- suy ra tu tong
# cong suat cua Tang 1 chia deu cho so may cung loai (gia dinh 2 may
# giong nhau ve so gio lam).
MACHINE_DAILY_BUDGET = {
    "Cast1": agg.CAST_CAP_PER_DAY // 2,
    "Cast2": agg.CAST_CAP_PER_DAY // 2,
    "CNC1": agg.CNC_CAP_PER_DAY // 2,
    "CNC2": agg.CNC_CAP_PER_DAY // 2,
}

LOT_MAX = 20
LOT_MIN = 10


def setup_time(ti, tj):
    return 0 if ti == tj else CHANGEOVER[frozenset({ti, tj})]


def split_into_lots(qty, max_lot=LOT_MAX, min_lot=LOT_MIN):
    """Chia so luong 1 ngay thanh cac lo (batch) thuc te de xep vao may,
    khong lo nao nho hon min_lot (tru khi ca ngay chi co vay)."""
    if qty <= 0:
        return []
    lots, remaining = [], qty
    while remaining > max_lot:
        lots.append(max_lot)
        remaining -= max_lot
    if remaining > 0:
        if lots and remaining < min_lot:
            lots[-1] += remaining
        else:
            lots.append(remaining)
    return lots


def build_jobs_for_day(day_plan, stage):
    unit_time = CAST_TIME if stage == "cast" else CNC_TIME
    jobs = []
    for t, qty in day_plan.items():
        for i, lot_qty in enumerate(split_into_lots(qty), start=1):
            jobs.append((f"{t}-{stage}-{i}", t, lot_qty * unit_time[t]))
    return jobs


def schedule_stage(stage, jobs, horizon=200):
    """Xep cac lo trong `jobs` len cac may cua `stage` bang AddCircuit
    (nhu scheduling_poc_multi.py). KHONG gioi han cung thoi gian may o
    day (de model luon co loi giai) -- kiem tra vuot ca SAU KHI giai."""
    if not jobs:
        return {m: {"schedule": {}, "work": 0, "end": 0} for m in MACHINES[stage]}

    model = cp_model.CpModel()
    start, end, dur = {}, {}, {}
    job_type = {}
    for name, t, d in jobs:
        s = model.NewIntVar(0, horizon, f"s_{name}")
        e = model.NewIntVar(0, horizon, f"e_{name}")
        model.Add(e == s + d)
        start[name], end[name], dur[name] = s, e, d
        job_type[name] = t

    use_setup = stage == "cast"
    assigned = {}
    for name, t, d in jobs:
        eligible_machines = [m for m in MACHINES[stage] if t in ELIGIBLE[stage, m]]
        lits = []
        for m in eligible_machines:
            lit = model.NewBoolVar(f"assign_{name}_{m}")
            assigned[name, m] = lit
            lits.append(lit)
        model.AddExactlyOne(lits)

    # --- May co "bat" hay khong -- muc 2.4.2 bao cao: khong bat may thua ---
    active = {}
    for m in MACHINES[stage]:
        a = model.NewBoolVar(f"active_{m}")
        for name, t, d in jobs:
            if (name, m) in assigned:
                model.AddImplication(assigned[name, m], a)
        active[m] = a

    for m in MACHINES[stage]:
        eligible_jobs = [name for name, t, d in jobs if (name, m) in assigned]
        DEPOT = 0
        idx = {name: i + 1 for i, name in enumerate(eligible_jobs)}
        arcs = []
        for name in eligible_jobs:
            arcs.append((idx[name], idx[name], assigned[name, m].Not()))
        for name in eligible_jobs:
            arcs.append((DEPOT, idx[name], model.NewBoolVar(f"d0_{m}_{name}")))
            arcs.append((idx[name], DEPOT, model.NewBoolVar(f"d1_{m}_{name}")))
        arcs.append((DEPOT, DEPOT, model.NewBoolVar(f"dloop_{m}")))
        for i_name in eligible_jobs:
            for k_name in eligible_jobs:
                if i_name == k_name:
                    continue
                lit = model.NewBoolVar(f"seq_{m}_{i_name}_{k_name}")
                arcs.append((idx[i_name], idx[k_name], lit))
                su = setup_time(job_type[i_name], job_type[k_name]) if use_setup else 0
                model.Add(start[k_name] >= end[i_name] + su).OnlyEnforceIf(lit)
        model.AddCircuit(arcs)

    makespan = model.NewIntVar(0, horizon, "makespan")
    model.AddMaxEquality(makespan, [end[name] for name, t, d in jobs])

    # --- Qua ca lam viec cua tung may (soft, phat rat nang) ---
    # end_m = end cua job KET THUC SAU CUNG trong so cac job THUC SU duoc
    # gan cho may m (dung contrib = end[name] neu duoc gan, nguoc lai 0 --
    # khong the loc truoc vi assignment la bien quyet dinh, chua biet luc build model).
    overtime_vars = []
    for m in MACHINES[stage]:
        eligible_jobs = [name for name, t, d in jobs if (name, m) in assigned]
        budget = MACHINE_DAILY_BUDGET[m]
        end_m = model.NewIntVar(0, horizon, f"end_{m}")
        if eligible_jobs:
            contribs = []
            for name in eligible_jobs:
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

    # Uu tien: (1) khong tao qua tai MOI, (2) dung it may nhat, (3) makespan ngan.
    OVERTIME_COST = 10_000
    ACTIVATION_COST = 500
    model.Minimize(
        OVERTIME_COST * sum(overtime_vars)
        + ACTIVATION_COST * sum(active[m] for m in MACHINES[stage])
        + makespan
    )

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = 15
    status = solver.Solve(model)
    assert status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    per_machine = {}
    for m in MACHINES[stage]:
        jobs_here = [name for name, t, d in jobs if (name, m) in assigned and solver.Value(assigned[name, m])]
        jobs_here.sort(key=lambda name: solver.Value(start[name]))
        sched = {name: (solver.Value(start[name]), solver.Value(end[name])) for name in jobs_here}
        work = sum(dur[name] for name in jobs_here)
        end_time = max((e for _, e in sched.values()), default=0)
        per_machine[m] = {"schedule": sched, "work": work, "end": end_time}
    return per_machine


def render_gantt(per_machine, job_type):
    width = max((info["end"] for info in per_machine.values()), default=0) + 1
    width = max(width, 1)
    for m, info in per_machine.items():
        chars = ["."] * width
        for name, (s, e) in info["schedule"].items():
            label = job_type[name]
            for t in range(s, min(e, width)):
                chars[t] = label
        budget = MACHINE_DAILY_BUDGET[m]
        flag = f"  *** VUOT CA LAM VIEC (ca={budget}) ***" if info["end"] > budget else ""
        print(f"{m:<5}: {''.join(chars):<{width}} work={info['work']:>3} end={info['end']:>3}{flag}")


def run_day(day, agg_result):
    cast_plan = {t: agg_result["plan"][t, day]["cast"] for t in agg.TYPES if agg_result["plan"][t, day]["cast"] > 0}
    cnc_plan = {t: agg_result["plan"][t, day]["cnc"] for t in agg.TYPES if agg_result["plan"][t, day]["cnc"] > 0}

    print(f"=== Ke hoach tong hop (Tang 1 - aggregate) cho Ngay {day} ===")
    print(f"Duc: {cast_plan}   (tong thoi gian can = "
          f"{sum(CAST_TIME[t] * q for t, q in cast_plan.items())} / cong suat he thong {agg.CAST_CAP_PER_DAY})")
    print(f"CNC: {cnc_plan}   (tong thoi gian can = "
          f"{sum(CNC_TIME[t] * q for t, q in cnc_plan.items())} / cong suat he thong {agg.CNC_CAP_PER_DAY})")
    print()

    cast_jobs = build_jobs_for_day(cast_plan, "cast")
    cnc_jobs = build_jobs_for_day(cnc_plan, "cnc")
    job_type = {name: t for name, t, d in cast_jobs + cnc_jobs}

    print(f"--- Lich chi tiet may DUC, Ngay {day} (Tang 2 - detailed) ---")
    cast_result = schedule_stage("cast", cast_jobs)
    render_gantt(cast_result, job_type)
    print()

    print(f"--- Lich chi tiet may CNC, Ngay {day} (Tang 2 - detailed) ---")
    cnc_result = schedule_stage("cnc", cnc_jobs)
    render_gantt(cnc_result, job_type)
    print()

    # --- Doi chieu: ke hoach tong hop co THUC SU kha thi khong? ---
    print("--- Doi chieu kha thi: Tang 1 (tren giay) vs Tang 2 (thuc te tung may) ---")
    overloads = []
    for stage, result in (("cast", cast_result), ("cnc", cnc_result)):
        for m, info in result.items():
            budget = MACHINE_DAILY_BUDGET[m]
            if info["end"] > budget:
                over = info["end"] - budget
                print(f"* May {m} ({stage}): can {info['end']} nhung ca lam viec chi co {budget} "
                      f"-> THIEU {over} don vi thoi gian -- PHAI TANG CA hoac DOI SANG NGAY KHAC, "
                      f"du Tang 1 tuong tong cong suat con du.")
                overloads.append((day, stage, m, over))
            else:
                print(f"* May {m} ({stage}): dung {info['end']}/{budget} -> OK, con du {budget - info['end']}.")
    print()
    return overloads


def run_all_days():
    print("################################################################")
    print("# Giai Tang 1 (aggregate planning, 10 ngay) mot lan duy nhat")
    print("################################################################")
    agg_result = agg.build_and_solve()
    print(f"Status Tang 1 = {agg_result['status']}\n")

    all_overloads = []
    for day in agg.DAYS:
        print("################################################################")
        print(f"# NGAY {day}")
        print("################################################################")
        overloads = run_day(day, agg_result)
        all_overloads.extend(overloads)

    print("################################################################")
    print("# TONG KET 2 TUAN: Tang 1 (tren giay) vs Tang 2 (thuc te)")
    print("################################################################")
    if not all_overloads:
        print("Khong ngay nao vuot ca lam viec cua may -- ke hoach Tang 1 THUC SU kha thi o muc chi tiet.")
    else:
        print(f"Phat hien {len(all_overloads)} truong hop may vuot ca lam viec du Tang 1 tuong con du cong suat:")
        for day, stage, m, over in all_overloads:
            print(f"  - Ngay {day}, may {m} ({stage}): thieu {over} don vi thoi gian")
        print()
        print("=> Ke hoach Tang 1 chi dung o muc 'tong cong suat toan he thong', khong biet may nao lam")
        print("   duoc loai nao. Can hoac (a) tang ca cho may bi qua tai vao dung ngay do, (b) doi mot")
        print("   phan san luong loai bi ket sang ngay khac trong ke hoach Tang 1, hoac (c) ve lau dai")
        print("   dau tu them dieu kien may de giam phu thuoc vao 1 may duy nhat cho 1 loai san pham.")


if __name__ == "__main__":
    run_all_days()
