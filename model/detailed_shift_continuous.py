"""
Phuong an "noi ca": thay vi coi moi ca la 1 hop rieng biet (AddCircuit
rieng cho tung (may,ca) nhu detailed_shift_schedule.py), gio coi MOI MAY
la 1 duong thoi gian LIEN TUC trong ngay (giong het
detailed_day_schedule_selforganize.py), nhung chi phi kich hoat duoc
tinh THEO SO CA ma lich lam viec cua may do THUC SU cham toi -- khong
phai 1 cuc "bat may ca ngay" nhu ban selforganize cu.

Y tuong: neu lich cua 1 may keo dai den t=50 (voi budget/ca=34), lich do
"cham" sang ca 2 (50>34), nen phai tra chi phi kich hoat CA 2 CUNG (2 ca
kich hoat), nhung KHONG con mat idle do lam tron o ranh gioi ca 1/ca 2
nua -- vi job duoc phep chay xuyen qua (ban giao ca giua chung, dung
thuc te nha may 3 ca lien tuc).

So_ca_kich_hoat = ceil(end_may / SHIFT_BUDGET) -- mo hinh bang 1 bien
nguyen n voi rang buoc SHIFT_BUDGET*n >= end_may; solver tu day n xuong
gia tri nho nhat co the vi cang lon cang ton chi phi. Mien cua n KHONG bi
kep o 3: ca thu 4 tro di van bieu dien duoc (va bi phat rat nang qua bien
overtime), nho do idle = n*budget - work luon >= 0.

Tai sao cach do "idle theo vi tri ket thuc" o day la DUNG, trong khi ban
3-hop cu phai do theo KHOI LUONG: trong 1 lan goi ham, tong khoi luong ca
stage la hang so, nen minimize(200 * sum(n_m)) TUONG DUONG CHINH XAC voi
minimize(tong idle). Solver khong con cho de "giau" idle bang cach cho job
bat dau tre -- hon nua left-packing (xem ben duoi) da bien vi tri thanh
ham cua thu tu, khong con la bien tu do.

Chay: python detailed_shift_continuous.py
Kiem tra tinh hop le vat ly cua ket qua: python verify_schedule.py
So sanh voi: python detailed_shift_schedule.py (ban "3 hop rieng biet")
"""

import math

from ortools.sat.python import cp_model
import production_planning_2weeks as agg
import detailed_day_schedule as fixed
import detailed_shift_schedule as dss

MACHINES = fixed.MACHINES
ELIGIBLE = fixed.ELIGIBLE
CAST_TIME = fixed.CAST_TIME
CNC_TIME = fixed.CNC_TIME

SHIFT_BUDGET = dss.SHIFT_BUDGET          # 34 (cast) / 27 (cnc) -- ngan sach 1 ca
MIN_BATCH_SHIFT = dss.MIN_BATCH_SHIFT    # {"A":5,"B":5,"C":4}
SHIFT_ACTIVATION_COST = dss.SHIFT_ACTIVATION_COST  # 200 / ca
BATCH_COUNT_COST = 30
OVERTIME_COST = 10_000
N_SHIFTS = 3

# Kich thuoc lo TOI DA. Khong co tran nay, BATCH_COUNT_COST (phat so lo) se
# day solver ve mot lo khong lo duy nhat chay xuyen ca 3 ca -- tung thay lo
# 50 san pham loai A chay lien tuc 100 don vi thoi gian. Vua phi thuc te
# (kiem tra chat luong, khuon hao mon, ghi nhan san luong theo ca) vua lam
# MIN_BATCH_SHIFT tro nen vo nghia vi khong bao gio binding.
LOT_MAX = fixed.LOT_MAX  # 20 -- giu dung gia tri cua ban cap ngay truoc do

# --- Changeover: AP DUNG CHO CA 2 CONG DOAN ---
# GIA DINH NGHIEP VU (khong phai suy nguoc tu testcase): doi loai san pham
# tren may CNC phai doi DO GA, tren may Duc phai doi KHUON. Doi do ga nhanh
# hon doi khuon dang ke -> lay xap xi 1/2 thoi gian.
#
# Truoc day CNC duoc gan setup = 0 tuyet doi, ly do ghi trong scheduling_poc.py
# la "khop voi Gantt Phu luc A". Gia dinh do TU MAU THUAN voi chinh model:
#   (a) ELIGIBLE noi CNC2 khong lam duoc loai B vi THIEU DO GA -- tuc la CNC
#       CO do ga chuyen dung theo loai, nen doi loai khong the ton 0 thoi gian;
#   (b) Tang 1 van tinh SETUP_CNC_TIME = {A:4, B:6, C:8} va tru vao cong suat.
# Hai tang dang mo hinh hoa cung mot hien tuong theo hai cach loai tru nhau.
CHANGEOVER = {
    "cast": fixed.CHANGEOVER,  # {AB:2, AC:3, BC:2} -- doi khuon
    "cnc": {                   # doi do ga, ~1/2 thoi gian doi khuon
        frozenset({"A", "B"}): 1,
        frozenset({"A", "C"}): 2,
        frozenset({"B", "C"}): 1,
    },
}


def setup_time(stage, ti, tj):
    """Thoi gian changeover khi may `stage` chuyen tu loai ti sang loai tj."""
    return 0 if ti == tj else CHANGEOVER[stage][frozenset({ti, tj})]


def slots_needed(qty):
    """So o (slot) can cap cho 1 loai trong 1 ngay: du de chia het qty theo
    LOT_MAX, cong 1 o du phong de con duong chia lo sang may thu hai.

    Truoc day MAX_SLOTS la hang so cung = 6 cho MOI loai. Vi AddCircuit sinh
    O(n^2) literal voi n = so_loai * MAX_SLOTS, 3 loai x 6 o = 18 node =>
    ~306 arc moi may, phan lon la cac node "vang mat" doi xung hoan toan voi
    nhau -> cay tim kiem no ra: 9/15 bai toan con cham tran 6 giay va chi tra
    ve FEASIBLE (khong chung minh duoc toi uu), moi lan chay mot ket qua khac.
    Cap dong theo nhu cau that lam kich thuoc model giam manh."""
    return max(1, math.ceil(qty / LOT_MAX)) + 1


def schedule_stage_continuous(stage, day_plan):
    """day_plan: {type: qty}. Moi may la 1 duong thoi gian lien tuc; chi
    phi tinh theo so ca (ceil(end/budget)) ma lich CHAM toi."""
    active_types = [t for t, q in day_plan.items() if q > 0]
    budget = SHIFT_BUDGET[stage]
    full_day = N_SHIFTS * budget
    if not active_types:
        return {m: {"schedule": {}, "work": 0, "end": 0, "n_shifts": 0, "type_of": {}}
                for m in MACHINES[stage]}

    unit_time = CAST_TIME if stage == "cast" else CNC_TIME
    n_slots = {t: slots_needed(day_plan[t]) for t in active_types}

    # --- Horizon tinh DONG theo khoi luong that ---
    # Truoc day: horizon = 3*budget + 30 (so 30 la magic number). Chi can
    # Tang 1 lap ke hoach 35 don vi loai C trong 1 ngay (140 don vi thoi gian,
    # bat buoc don het vao Cast1 vi Cast2 khong co khuon C) la horizon=132
    # khong du -> model INFEASIBLE -> AssertionError, sap chuong trinh thay vi
    # bao cao qua tai. Kich ban what-if "don gap" se dam thang vao day.
    # Can tren an toan = toan bo khoi luong don len 1 may + toan bo changeover.
    total_work = sum(day_plan[t] * unit_time[t] for t in active_types)
    max_setup = max(CHANGEOVER[stage].values())
    horizon = total_work + max_setup * sum(n_slots.values()) + 1

    model = cp_model.CpModel()

    names, size, present = [], {}, {}
    start, end, dur, job_type = {}, {}, {}, {}

    for t in active_types:
        qty = day_plan[t]
        slot_sizes = []
        for k in range(n_slots[t]):
            name = f"{t}-{stage}-{k}"
            sz = model.NewIntVar(0, min(qty, LOT_MAX), f"size_{name}")
            pr = model.NewBoolVar(f"present_{name}")
            model.Add(sz >= MIN_BATCH_SHIFT[t]).OnlyEnforceIf(pr)
            model.Add(sz == 0).OnlyEnforceIf(pr.Not())
            size[name], present[name] = sz, pr
            slot_sizes.append(sz)
            if k > 0:
                prev = f"{t}-{stage}-{k-1}"
                model.Add(present[prev] >= pr)
                # Pha doi xung: cac o cung mot loai la HOAN TOAN hoan vi duoc
                # cho nhau (cung toc do gia cong), nen co the gia dinh WLOG
                # kich thuoc khong tang dan. Cat bo k! loi giai trung lap.
                model.Add(size[prev] >= size[name])
            names.append(name)
            job_type[name] = t
        model.Add(sum(slot_sizes) == qty)

        for k in range(n_slots[t]):
            name = f"{t}-{stage}-{k}"
            d = model.NewIntVar(0, horizon, f"dur_{name}")
            model.Add(d == size[name] * unit_time[t])
            s = model.NewIntVar(0, horizon, f"s_{name}")
            e = model.NewIntVar(0, horizon, f"e_{name}")
            model.Add(e == s + d)
            # Lo vang mat khong co y nghia vi tri -> ghim ve 0 thay vi de tu
            # do (tranh solver phai mo rong tim kiem tren bien vo nghia).
            model.Add(s == 0).OnlyEnforceIf(present[name].Not())
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
        model.Add(sum(lits) == present[name])

    for m in MACHINES[stage]:
        eligible_names = [name for name in names if (name, m) in assigned]
        DEPOT = 0
        idx = {name: i + 1 for i, name in enumerate(eligible_names)}
        arcs = []
        for name in eligible_names:
            arcs.append((idx[name], idx[name], assigned[name, m].Not()))
        # --- LEFT-PACKING (don sat ve dau truc thoi gian) ---
        # Lo dau tien tren may bat dau tai t=0, moi lo ke tiep bat dau NGAY
        # khi lo truoc xong + thoi gian changeover. Dung "==" chu khong phai
        # ">=".
        # Vi sao hop le: trong 1 stage khong co release date, khong co
        # precedence giua cac lo, va cac lo deu chay tren cung 1 may -- nen
        # voi MOI thu tu cho truoc, don sat trai luon kha thi va luon toi uu
        # (khong bao gio co ly do de may ngoi cho giua chung).
        # Vi sao quan trong: truoc day vi tri la bien tu do, chi bi "khuyen
        # khich" som bang tie-break `sum(start)` trong so 1. Solver phai duyet
        # ca khong gian vi tri de CHUNG MINH toi uu -> 9/15 bai toan con cham
        # tran thoi gian. Bien no thanh rang buoc cung xoa han chieu tim kiem
        # do: chi con lai phan quyet dinh that su (gan may, thu tu, chia lo).
        for name in eligible_names:
            d0 = model.NewBoolVar(f"d0_{m}_{name}")
            arcs.append((DEPOT, idx[name], d0))
            model.Add(start[name] == 0).OnlyEnforceIf(d0)
            arcs.append((idx[name], DEPOT, model.NewBoolVar(f"d1_{m}_{name}")))
        arcs.append((DEPOT, DEPOT, model.NewBoolVar(f"dloop_{m}")))
        for i_name in eligible_names:
            for k_name in eligible_names:
                if i_name == k_name:
                    continue
                lit = model.NewBoolVar(f"seq_{m}_{i_name}_{k_name}")
                arcs.append((idx[i_name], idx[k_name], lit))
                su = setup_time(stage, job_type[i_name], job_type[k_name])
                model.Add(start[k_name] == end[i_name] + su).OnlyEnforceIf(lit)
        model.AddCircuit(arcs)

    # --- So ca kich hoat = ceil(end_may / budget); vuot ca3 -> tang ca (soft) ---
    n_shifts_used, overtime_vars = {}, []
    for m in MACHINES[stage]:
        eligible_names = [name for name in names if (name, m) in assigned]
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

        # So ca kich hoat = ceil(end_may / budget), KHONG kep tran o N_SHIFTS.
        # Truoc day dung capped_end = min(end_m, full_day) roi ep n <= 3. Khi
        # khoi luong 1 may vuot ca 3 ca, n bi ghim = 3 trong khi work > 3*budget
        # -> idle = n*budget - work AM (da do duoc -18 voi C=30 don vi), va
        # export cong thang so am do vao total_idle: mot ngay QUA TAI lai LAM
        # GIAM con so idle tren dashboard -- nguoc hoan toan y nghia.
        # Bo tran di thi n*budget >= end_m >= work luon dung, nen idle >= 0 tu
        # dong. Ca thu 4 tro di van bi phat rat nang qua bien `ot` ben duoi.
        max_shifts = math.ceil(horizon / budget)
        n = model.NewIntVar(0, max_shifts, f"nshifts_{m}")
        model.Add(budget * n >= end_m)  # solver tu ep n = ceil(end_m/budget), nho nhat co the
        n_shifts_used[m] = n

        ot = model.NewIntVar(0, horizon, f"overtime_{m}")
        model.AddMaxEquality(ot, [end_m - full_day, 0])
        overtime_vars.append(ot)

        # --- CUT 1 (theo may): neu mot loai chi co DUY NHAT may nay lam duoc
        # thi toan bo khoi luong loai do chac chan nam tren may nay, nen so ca
        # cua may khong the it hon ceil(khoi_luong_ep_buoc / budget). ---
        forced = sum(
            day_plan[t] * unit_time[t]
            for t in active_types
            if [mm for mm in MACHINES[stage] if t in ELIGIBLE[stage, mm]] == [m]
        )
        if forced:
            model.Add(n_shifts_used[m] >= math.ceil(forced / budget))

    # --- CUT 2 (toan stage): tong so ca >= ceil(tong khoi luong / budget) ---
    # Hop le vi budget*n_m >= end_m >= work_m voi moi may, cong lai ta duoc
    # budget * sum(n_m) >= tong khoi luong (la hang so da biet truoc).
    # Rang buoc nay DU THUA ve mat logic (khong cat bo loi giai hop le nao)
    # nhung cuc ky quan trong ve hieu nang: no dua thang can duoi vao model,
    # nho do solver chung minh duoc toi uu ngay thay vi phai duyet het khong
    # gian gan may/chia lo de tu suy ra.
    model.Add(
        sum(n_shifts_used[m] for m in MACHINES[stage]) >= math.ceil(total_work / budget)
    )

    # Da BO `makespan` va BO tie-break `sum(start)`: left-packing o tren da
    # dam bao khong con khoang trong vo nghia trong Gantt, nen hai so hang
    # trong so 1 do chi con tac dung lam cham viec chung minh toi uu.
    #
    # Tie-break con lai: uu tien may co chi so nho hon (Cast1 truoc Cast2).
    # Thuan tuy de KET QUA TAT DINH -- nhieu loi giai co cung chi phi that
    # (doi vai tro 2 may la mot vi du), khong co tie-break thi worker nao tim
    # ra truoc se thang, va ket qua doi giua cac lan chay du da co random_seed.
    machine_pref = []
    for i, m in enumerate(MACHINES[stage]):
        for name in names:
            if (name, m) in assigned:
                machine_pref.append(i * assigned[name, m])

    model.Minimize(
        OVERTIME_COST * sum(overtime_vars)
        + SHIFT_ACTIVATION_COST * sum(n_shifts_used[m] for m in MACHINES[stage])
        + BATCH_COUNT_COST * sum(present[name] for name in names)
        + sum(machine_pref)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30
    # 1 worker + seed co dinh = ket qua TAI LAP DUOC (xem giai thich day du
    # trong production_planning_2weeks.py). Da do: 8 worker + seed van cho 3
    # ket qua khac nhau trong 3 lan chay, 1 worker cho dung 1 ket qua.
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 42
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(
            f"Solver failed: {solver.StatusName(status)} cho {stage}/{day_plan}"
        )

    out = {}
    for m in MACHINES[stage]:
        used = [name for name in names if (name, m) in assigned and solver.Value(assigned[name, m])]
        used.sort(key=lambda name: solver.Value(start[name]))
        sched = {name: (solver.Value(start[name]), solver.Value(end[name])) for name in used}
        work = sum(solver.Value(dur[name]) for name in used)
        end_time = max((e for _, e in sched.values()), default=0)
        out[m] = {
            "schedule": sched, "work": work, "end": end_time,
            "n_shifts": solver.Value(n_shifts_used[m]),
            "type_of": {n: job_type[n] for n in used},
        }
    return out


def render_day(day, cast_plan, cnc_plan):
    print(f"=== Ngay {day} -- Duc: {cast_plan}  CNC: {cnc_plan} ===")
    for stage, plan in (("cast", cast_plan), ("cnc", cnc_plan)):
        res = schedule_stage_continuous(stage, plan)
        budget = SHIFT_BUDGET[stage]
        for m in MACHINES[stage]:
            info = res[m]
            lots = ", ".join(f"{n}={info['type_of'][n]}({s}-{e})" for n, (s, e) in info["schedule"].items())
            idle = info["n_shifts"] * budget - info["work"]
            print(f"  {stage:>4}/{m}: [{lots}]  work={info['work']}  ca_kich_hoat={info['n_shifts']}  "
                  f"idle_thuc={idle}")
    print()


if __name__ == "__main__":
    agg_result = agg.build_and_solve()
    for day in agg.DAYS:
        cast_plan = {t: agg_result["plan"][t, day]["cast"] for t in agg.TYPES if agg_result["plan"][t, day]["cast"] > 0}
        cnc_plan = {t: agg_result["plan"][t, day]["cnc"] for t in agg.TYPES if agg_result["plan"][t, day]["cnc"] > 0}
        render_day(day, cast_plan, cnc_plan)
