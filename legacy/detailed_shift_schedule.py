"""
Mo rong detailed_day_schedule_selforganize.py: THEM CA LAM VIEC that su.
Bao cao goc (muc 2.4.2) noi den "bien quyet dinh co nen bat may trong ca
nay khong" -- truoc gio minh moi lam o muc THO (bat/tat may CA NGAY, chua
co khai niem ca thuc). Gio lam dung: MOI NGAY = 3 CA, nhan cong lam theo
CA (khong theo ngay), nen chi phi kich hoat phai tinh THEO CA, khong phai
theo ngay.

Thay doi mo hinh:
  - Truoc: 1 "tai nguyen" lap lich = 1 may/ngay (VD Cast1 co 100 don vi
    thoi gian de dung ca ngay).
  - Gio  : 1 "tai nguyen" = 1 (may, ca)/ngay (VD Cast1-Ca1 co 34 don vi).
    Moi may co 3 tai nguyen nhu vay trong 1 ngay (Ca1, Ca2, Ca3).
  - Mot lo SAN PHAM phai nam GON trong 1 ca (khong noi ca tu dong -- doi
    ca thuong co ban giao/nghi giua ca, don gian hoa bang cach KHONG cho
    setup/changeover ke thua giua 2 ca).
  - Kich hoat 1 ca (goi cong nhan vao lam) ton SHIFT_ACTIVATION_COST,
    khong lien quan gi den ca kia cua CUNG may co bat hay khong.
  - Van cho phep "tang ca" (vuot ngan sach 1 ca) nhung phat rat nang,
    giong cach lam voi "vuot ca lam viec" o cap ngay truoc day.

Chay: python detailed_shift_schedule.py
"""

from ortools.sat.python import cp_model
import legacy.production_planning_2weeks as agg
import legacy.detailed_day_schedule as fixed

MACHINES = fixed.MACHINES
ELIGIBLE = fixed.ELIGIBLE
CAST_TIME = fixed.CAST_TIME
CNC_TIME = fixed.CNC_TIME
setup_time = fixed.setup_time

SHIFTS = [0, 1, 2]  # Ca 1, Ca 2, Ca 3 trong 1 ngay
SHIFT_NAME = {0: "Ca1", 1: "Ca2", 2: "Ca3"}

# Ngan sach 1 CA (khong phai 1 ngay nua) -- suy ra tu ngan sach ngay cu
# chia 3, lam tron len mot chut de tong 3 ca ~ bang ngan sach ngay cu.
SHIFT_BUDGET = {"cast": 34, "cnc": 27}

MAX_SLOTS = 6  # nhieu hon truoc (3->6) vi tai nguyen nho hon, de bi chia thanh nhieu lo hon
SHIFT_ACTIVATION_COST = 200   # chi phi goi cong nhan vao 1 CA (khong phai 1 ngay)
BATCH_COUNT_COST = 30
OVERTIME_COST = 10_000

# QUAN TRONG: MIN_BATCH=10 (cua ban ngay, LOT_MIN trong detailed_day_schedule.py)
# duoc chon cho quy mo CA NGAY (100/80 don vi). O quy mo 1 CA (34/27 don vi),
# nguong nay QUA LON cho loai C (CNC_TIME=4): 1 lo toi thieu 10 don vi da can
# 40 don vi thoi gian -- VUOT han ngan sach 1 ca (34) -- nghia la VE MAT TOAN
# HOC khong co cach nao chia lo loai C ma khong tang ca, bat ke solver gioi
# co nao. Phai giam MIN_BATCH rieng cho cap do CA.
MIN_BATCH_SHIFT = {"A": 5, "B": 5, "C": 4}  # du nho de it nhat 1 lo vua 1 ca (34/4=8.5 -> 4 la an toan)


def schedule_day_shifts(stage, day_plan, horizon=80):
    """day_plan: {type: qty} cho 1 ngay. Tra ve chi tiet theo (may, ca)."""
    active_types = [t for t, q in day_plan.items() if q > 0]
    resources = [(m, sh) for m in MACHINES[stage] for sh in SHIFTS]
    if not active_types:
        return {r: {"schedule": {}, "work": 0, "end": 0} for r in resources}

    unit_time = CAST_TIME if stage == "cast" else CNC_TIME
    use_setup = stage == "cast"
    budget = SHIFT_BUDGET[stage]
    model = cp_model.CpModel()

    names, size, present = [], {}, {}
    start, end, dur, job_type = {}, {}, {}, {}

    for t in active_types:
        qty = day_plan[t]
        slot_sizes = []
        for k in range(MAX_SLOTS):
            name = f"{t}-{stage}-{k}"
            sz = model.NewIntVar(0, qty, f"size_{name}")
            pr = model.NewBoolVar(f"present_{name}")
            model.Add(sz >= MIN_BATCH_SHIFT[t]).OnlyEnforceIf(pr)
            model.Add(sz == 0).OnlyEnforceIf(pr.Not())
            size[name], present[name] = sz, pr
            slot_sizes.append(sz)
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

    # --- Gan moi lo cho DUNG 1 (may, ca) neu duoc dung, khong thi khong gan gi ---
    assigned = {}
    for name in names:
        t = job_type[name]
        eligible_resources = [(m, sh) for (m, sh) in resources if t in ELIGIBLE[stage, m]]
        lits = []
        for (m, sh) in eligible_resources:
            lit = model.NewBoolVar(f"assign_{name}_{m}_{sh}")
            assigned[name, m, sh] = lit
            lits.append(lit)
        model.Add(sum(lits) == present[name])

    # --- Ca co duoc "kich hoat" (goi cong nhan) hay khong ---
    active = {}
    for (m, sh) in resources:
        a = model.NewBoolVar(f"active_{m}_{sh}")
        for name in names:
            if (name, m, sh) in assigned:
                model.AddImplication(assigned[name, m, sh], a)
        active[m, sh] = a

    # --- Xep thu tu trong TUNG (may, ca) bang AddCircuit (nhu truoc, quy mo nho hon) ---
    for (m, sh) in resources:
        eligible_names = [name for name in names if (name, m, sh) in assigned]
        DEPOT = 0
        idx = {name: i + 1 for i, name in enumerate(eligible_names)}
        arcs = []
        for name in eligible_names:
            arcs.append((idx[name], idx[name], assigned[name, m, sh].Not()))
        for name in eligible_names:
            arcs.append((DEPOT, idx[name], model.NewBoolVar(f"d0_{m}_{sh}_{name}")))
            arcs.append((idx[name], DEPOT, model.NewBoolVar(f"d1_{m}_{sh}_{name}")))
        arcs.append((DEPOT, DEPOT, model.NewBoolVar(f"dloop_{m}_{sh}")))
        for i_name in eligible_names:
            for k_name in eligible_names:
                if i_name == k_name:
                    continue
                lit = model.NewBoolVar(f"seq_{m}_{sh}_{i_name}_{k_name}")
                arcs.append((idx[i_name], idx[k_name], lit))
                su = setup_time(job_type[i_name], job_type[k_name]) if use_setup else 0
                model.Add(start[k_name] >= end[i_name] + su).OnlyEnforceIf(lit)
        model.AddCircuit(arcs)

    # --- Tang ca (vuot ngan sach 1 CA) -- soft, phat rat nang ---
    overtime_vars = []
    idle_vars = []
    for (m, sh) in resources:
        eligible_names = [name for name in names if (name, m, sh) in assigned]
        end_r = model.NewIntVar(0, horizon, f"end_{m}_{sh}")
        work_r = model.NewIntVar(0, horizon, f"work_{m}_{sh}")
        if eligible_names:
            end_contribs, work_contribs = [], []
            for name in eligible_names:
                c = model.NewIntVar(0, horizon, f"contrib_{m}_{sh}_{name}")
                model.Add(c == end[name]).OnlyEnforceIf(assigned[name, m, sh])
                model.Add(c == 0).OnlyEnforceIf(assigned[name, m, sh].Not())
                end_contribs.append(c)
                wc = model.NewIntVar(0, horizon, f"workcontrib_{m}_{sh}_{name}")
                model.Add(wc == dur[name]).OnlyEnforceIf(assigned[name, m, sh])
                model.Add(wc == 0).OnlyEnforceIf(assigned[name, m, sh].Not())
                work_contribs.append(wc)
            model.AddMaxEquality(end_r, end_contribs + [0])
            model.Add(work_r == sum(work_contribs))
        else:
            model.Add(end_r == 0)
            model.Add(work_r == 0)
        ot = model.NewIntVar(0, horizon, f"overtime_{m}_{sh}")
        model.AddMaxEquality(ot, [end_r - budget, 0])
        overtime_vars.append(ot)

        # --- Idle time BEN TRONG 1 ca DA kich hoat (muc 2.4.4 bao cao) ---
        # Neu khong phat idle o day, mot khi ca da duoc goi cong nhan, solver
        # khong co ly do gi de lap day het ngan sach con lai -- cong nhan
        # vao ca roi ngoi choi. Dung TONG KHOI LUONG (work_r), KHONG dung vi
        # tri ket thuc (end_r) -- neu dung end_r, solver co the "lach" bang
        # cach cho job bat dau TRE (che khoang trong o DAU ca thay vi cuoi
        # ca), idle van tinh ra 0 du cong nhan van ngoi choi luc dau ca.
        idle = model.NewIntVar(0, horizon, f"idle_{m}_{sh}")
        model.Add(idle >= budget - work_r).OnlyEnforceIf(active[m, sh])
        model.Add(idle == 0).OnlyEnforceIf(active[m, sh].Not())
        idle_vars.append(idle)

    makespan = model.NewIntVar(0, horizon, "makespan")
    model.AddMaxEquality(makespan, [end[name] for name in names] + [0])

    IDLE_COST = 8   # phat idle trong ca DA bat -- nho hon SHIFT_ACTIVATION_COST
                    # (khong ep phai bat them ca chi de lap day) nhung du de
                    # solver uu tien don viec vao ca dang chay thay vi de trong
    # Uu tien phu: bat dau CANG SOM CANG TOT khi khong co ly do gi phai tre
    # -- trong so cuc nho, chi de "phan xu" giua cac loi giai ngang nhau ve
    # moi mat khac, tranh Gantt hien thi khoang trong vo nghia o DAU ca.
    model.Minimize(
        OVERTIME_COST * sum(overtime_vars)
        + SHIFT_ACTIVATION_COST * sum(active[r] for r in resources)
        + IDLE_COST * sum(idle_vars)
        + BATCH_COUNT_COST * sum(present[name] for name in names)
        + makespan
        + sum(start[name] for name in names)
    )

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = 6
    status = solver.Solve(model)
    assert status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    out = {}
    for (m, sh) in resources:
        used = [name for name in names if (name, m, sh) in assigned and solver.Value(assigned[name, m, sh])]
        used.sort(key=lambda name: solver.Value(start[name]))
        sched = {name: (solver.Value(start[name]), solver.Value(end[name])) for name in used}
        work = sum(solver.Value(dur[name]) for name in used)
        end_time = max((e for _, e in sched.values()), default=0)
        out[m, sh] = {"schedule": sched, "work": work, "end": end_time, "type_of": {n: job_type[n] for n in used}}
    return out


def render_day(day, cast_plan, cnc_plan):
    print(f"=== Ngay {day} -- Duc: {cast_plan}  CNC: {cnc_plan} ===")
    for stage, plan in (("cast", cast_plan), ("cnc", cnc_plan)):
        res = schedule_day_shifts(stage, plan)
        budget = SHIFT_BUDGET[stage]
        for m in MACHINES[stage]:
            row = []
            n_shifts_active = 0
            for sh in SHIFTS:
                info = res[m, sh]
                if info["work"] == 0:
                    row.append(f"{SHIFT_NAME[sh]}:nghi")
                    continue
                n_shifts_active += 1
                lots = ",".join(f"{n}={info['type_of'][n]}({s}-{e})" for n, (s, e) in info["schedule"].items())
                flag = " *TANG CA*" if info["end"] > budget else ""
                row.append(f"{SHIFT_NAME[sh]}:[{lots}] work={info['work']}/{budget}{flag}")
            print(f"  {stage:>4}/{m}: " + "  |  ".join(row) + f"   (so ca bat: {n_shifts_active}/3)")
    print()


if __name__ == "__main__":
    agg_result = agg.build_and_solve()
    for day in agg.DAYS:
        cast_plan = {t: agg_result["plan"][t, day]["cast"] for t in agg.TYPES if agg_result["plan"][t, day]["cast"] > 0}
        cnc_plan = {t: agg_result["plan"][t, day]["cnc"] for t in agg.TYPES if agg_result["plan"][t, day]["cnc"] > 0}
        render_day(day, cast_plan, cnc_plan)
