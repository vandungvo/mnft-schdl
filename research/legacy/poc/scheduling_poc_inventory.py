"""
Mo rong tiep tu scheduling_poc_multi.py: them TON KHO thanh pham vao bai
toan de tra loi cau hoi thuc te "nen san xuat khi nao?" chu khong chi
"chay nhanh nhat co the".

Y tuong (dung "vua du de rang buoc lich san xuat" nhu muc 1.3 bao cao noi,
khong di sau toi uu ton kho doc lap):
  - Moi don hang co SO LUONG (qty) va HAN GIAO (due date).
  - Neu job hoan thanh CNC truoc due date -> thanh pham phai nam trong
    kho cho den luc giao -> phat sinh CHI PHI TON KHO ti le voi
    qty * so ngay nam kho (holding).
  - Neu job hoan thanh SAU due date -> TRE HAN (tardiness), phat nang
    hon nhieu (trong thuc te tre don hang thuong toi te hon la ton kho
    som vai ngay).

So sanh 2 chien luoc lap lich tren CUNG mot du lieu (8 don hang, 2 may
Duc + 2 may CNC, machine eligibility + changeover nhu truoc):

  A) "ASAP"  - chi minimize makespan (chay het cong suat, xong cang som
     cang tot) -> hop ly neu muc tieu la giai phong may, nhung co the
     lam hang xong qua som, ton kho lau khong can thiet.
  B) "JIT"   - minimize (chi phi tre han + chi phi ton kho), khong ep
     phai xong som -> may co the CHU DONG tri hoan mot don chua gap de
     giam ton kho, mien la van kip han giao.

Chay: python scheduling_poc_inventory.py
"""

from ortools.sat.python import cp_model

# ---------------------------------------------------------------------------
# 1) Du lieu: 8 don hang, co qty + due date
# ---------------------------------------------------------------------------

JOBS = {
    # job:  type  cast cnc  qty  due
    "J1": {"type": "A", "cast": 4, "cnc": 3, "qty": 40, "due": 14},
    "J2": {"type": "A", "cast": 3, "cnc": 2, "qty": 30, "due": 26},
    "J3": {"type": "B", "cast": 5, "cnc": 4, "qty": 50, "due": 16},
    "J4": {"type": "B", "cast": 4, "cnc": 3, "qty": 35, "due": 24},
    "J5": {"type": "C", "cast": 6, "cnc": 5, "qty": 45, "due": 18},
    "J6": {"type": "A", "cast": 3, "cnc": 2, "qty": 25, "due": 28},
    "J7": {"type": "C", "cast": 5, "cnc": 4, "qty": 40, "due": 15},
    "J8": {"type": "B", "cast": 4, "cnc": 3, "qty": 30, "due": 22},
}
JOB_NAMES = list(JOBS.keys())

MACHINES = {"cast": ["Cast1", "Cast2"], "cnc": ["CNC1", "CNC2"]}
ELIGIBLE = {
    ("cast", "Cast1"): {"A", "B", "C"},
    ("cast", "Cast2"): {"A", "B"},
    ("cnc", "CNC1"): {"A", "B", "C"},
    ("cnc", "CNC2"): {"A", "C"},
}
CHANGEOVER = {
    frozenset({"A", "B"}): 2,
    frozenset({"A", "C"}): 3,
    frozenset({"B", "C"}): 2,
}

# Trong so chi phi (moi don vi qty * moi don vi thoi gian)
COST_TARDY_PER_UNIT = 20   # tre han: rat dat -> mat khach, phat hop dong
COST_HOLD_PER_UNIT = 1     # ton kho som: re hon nhieu, nhung khong phai mien phi
IDLE_TIEBREAK_WEIGHT = 1   # trong so nho de van uu tien lap day may khi khong anh huong JIT


def setup_time(ti, tj):
    return 0 if ti == tj else CHANGEOVER[frozenset({ti, tj})]


HORIZON = 70


# ---------------------------------------------------------------------------
# 2) Model dung chung, chi khac objective
# ---------------------------------------------------------------------------

def build_and_solve(mode: str, due_overrides: dict = None):
    """mode = 'asap' hoac 'jit'.

    due_overrides: {job: due_moi} -- dung cho counterfactual ("neu don X
    can gap som hon thi sao?") ma khong can sua du lieu goc JOBS.
    """
    due_overrides = due_overrides or {}
    model = cp_model.CpModel()

    start, end = {}, {}
    for j in JOB_NAMES:
        for stage in ("cast", "cnc"):
            dur = JOBS[j][stage]
            s = model.NewIntVar(0, HORIZON, f"start_{j}_{stage}")
            e = model.NewIntVar(0, HORIZON, f"end_{j}_{stage}")
            model.Add(e == s + dur)
            start[j, stage] = s
            end[j, stage] = e

    for j in JOB_NAMES:
        model.Add(start[j, "cnc"] >= end[j, "cast"])

    assigned = {}
    for j in JOB_NAMES:
        jtype = JOBS[j]["type"]
        for stage in ("cast", "cnc"):
            eligible_machines = [m for m in MACHINES[stage] if jtype in ELIGIBLE[stage, m]]
            lits = []
            for m in eligible_machines:
                lit = model.NewBoolVar(f"assign_{j}_{stage}_{m}")
                assigned[j, stage, m] = lit
                lits.append(lit)
            model.AddExactlyOne(lits)

    cnc_gaps = []

    def add_machine_circuit(stage, m, use_setup, collect_gaps):
        eligible_jobs = [j for j in JOB_NAMES if (j, stage, m) in assigned]
        DEPOT = 0
        idx = {j: i + 1 for i, j in enumerate(eligible_jobs)}
        arcs = []
        for j in eligible_jobs:
            arcs.append((idx[j], idx[j], assigned[j, stage, m].Not()))
        for j in eligible_jobs:
            arcs.append((DEPOT, idx[j], model.NewBoolVar(f"d0_{stage}_{m}_{j}")))
            arcs.append((idx[j], DEPOT, model.NewBoolVar(f"d1_{stage}_{m}_{j}")))
        arcs.append((DEPOT, DEPOT, model.NewBoolVar(f"dloop_{stage}_{m}")))
        for i in eligible_jobs:
            for k in eligible_jobs:
                if i == k:
                    continue
                lit = model.NewBoolVar(f"seq_{stage}_{m}_{i}_{k}")
                arcs.append((idx[i], idx[k], lit))
                su = setup_time(JOBS[i]["type"], JOBS[k]["type"]) if use_setup else 0
                model.Add(start[k, stage] >= end[i, stage] + su).OnlyEnforceIf(lit)
                if collect_gaps:
                    gap = model.NewIntVar(0, HORIZON, f"gap_{stage}_{m}_{i}_{k}")
                    model.Add(gap == start[k, stage] - end[i, stage]).OnlyEnforceIf(lit)
                    model.Add(gap == 0).OnlyEnforceIf(lit.Not())
                    cnc_gaps.append(gap)
        model.AddCircuit(arcs)

    for m in MACHINES["cast"]:
        add_machine_circuit("cast", m, True, False)
    for m in MACHINES["cnc"]:
        add_machine_circuit("cnc", m, False, True)

    makespan = model.NewIntVar(0, HORIZON, "makespan")
    model.AddMaxEquality(makespan, [end[j, "cnc"] for j in JOB_NAMES])
    total_cnc_idle = model.NewIntVar(0, HORIZON * len(JOB_NAMES), "total_cnc_idle")
    model.Add(total_cnc_idle == sum(cnc_gaps))

    # --- Ton kho: tardy (tre han) va holding (ton kho som) ---
    tardy, holding = {}, {}
    for j in JOB_NAMES:
        due = due_overrides.get(j, JOBS[j]["due"])
        diff = model.NewIntVar(-HORIZON, HORIZON, f"diff_{j}")
        model.Add(diff == end[j, "cnc"] - due)
        t = model.NewIntVar(0, HORIZON, f"tardy_{j}")
        h = model.NewIntVar(0, HORIZON, f"hold_{j}")
        model.AddMaxEquality(t, [diff, 0])
        model.AddMaxEquality(h, [-diff, 0])
        tardy[j] = t
        holding[j] = h

    total_tardy_cost = sum(JOBS[j]["qty"] * COST_TARDY_PER_UNIT * tardy[j] for j in JOB_NAMES)
    total_hold_cost = sum(JOBS[j]["qty"] * COST_HOLD_PER_UNIT * holding[j] for j in JOB_NAMES)

    if mode == "asap":
        model.Minimize(makespan)
    elif mode == "jit":
        model.Minimize(total_tardy_cost + total_hold_cost + IDLE_TIEBREAK_WEIGHT * total_cnc_idle)
    else:
        raise ValueError(mode)

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = 20
    status = solver.Solve(model)
    assert status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    per_machine = {}
    machine_of = {}
    for stage in ("cast", "cnc"):
        for m in MACHINES[stage]:
            jobs_here = [j for j in JOB_NAMES if (j, stage, m) in assigned and solver.Value(assigned[j, stage, m])]
            jobs_here.sort(key=lambda j: solver.Value(start[j, stage]))
            for j in jobs_here:
                machine_of[j, stage] = m
            work = sum(JOBS[j][stage] for j in jobs_here)
            if jobs_here:
                first = solver.Value(start[jobs_here[0], stage])
                last = solver.Value(end[jobs_here[-1], stage])
                span = last - first
            else:
                span = 0
            per_machine[stage, m] = {
                "schedule": {j: (solver.Value(start[j, stage]), solver.Value(end[j, stage])) for j in jobs_here},
                "work": work,
                "span": span,
                "idle": span - work,
                "util": (100.0 * work / span) if span > 0 else None,
            }

    orders = {}
    for j in JOB_NAMES:
        comp = solver.Value(end[j, "cnc"])
        orders[j] = {
            "qty": JOBS[j]["qty"],
            "due": due_overrides.get(j, JOBS[j]["due"]),
            "completion": comp,
            "tardy": solver.Value(tardy[j]),
            "holding": solver.Value(holding[j]),
        }

    return {
        "mode": mode,
        "status": solver.StatusName(status),
        "makespan": solver.Value(makespan),
        "total_cnc_idle": solver.Value(total_cnc_idle),
        "total_tardy_cost": solver.Value(total_tardy_cost),
        "total_hold_cost": solver.Value(total_hold_cost),
        "per_machine": per_machine,
        "machine_of": machine_of,
        "orders": orders,
    }


# ---------------------------------------------------------------------------
# 3) Lop giai thich (Explanation Layer) -- muc 2.5 bao cao
#
# 4 loai giai thich duoc trien khai:
#   (a) Critical path  -> tra loi "vi sao job X hoan thanh/tre luc T?"
#   (b) Utilization report -> tra loi "vi sao may Y co khoang trong?"
#   (c) Sensitivity / bottleneck -> "may nao la nut that, don nao sat nut?"
#   (d) Counterfactual -> "neu don Z can gap hon thi don nao bi day lui?"
# ---------------------------------------------------------------------------

def _sequence(result, stage, machine):
    """Danh sach job tren 1 may, sap theo thoi gian bat dau (chinh la thu
    tu thuc te ma solver da chon, khong can doc lai bien circuit)."""
    sched = result["per_machine"][stage, machine]["schedule"]
    return sorted(sched.items(), key=lambda kv: kv[1][0])


def trace_critical_path(result, job, stage="cnc", max_hops=30):
    """Di nguoc chuoi nguyen nhan khien `job` bat dau/ket thuc luc do.

    Tai moi buoc, so sanh thoi diem bat dau THUC TE voi 2 "can duoi" ky
    thuat: (1) may vua rang cho job lien truoc xong (machine_bound), va
    (2) rang buoc precedence tu chinh no (own_bound, vd Duc phai xong
    truoc CNC). Neu ca 2 deu KHONG giai thich duoc (start > max ca hai)
    -> day la lua chon CHU DONG cua solver (vi ly do chi phi/JIT), khong
    phai bi ep boi rang buoc cung.
    """
    lines = []
    cur_job, cur_stage = job, stage
    for _ in range(max_hops):
        m = result["machine_of"][cur_job, cur_stage]
        seq = _sequence(result, cur_stage, m)
        seq_jobs = [j for j, _ in seq]
        idx = seq_jobs.index(cur_job)
        s, e = result["per_machine"][cur_stage, m]["schedule"][cur_job]

        if idx > 0:
            pred_job = seq_jobs[idx - 1]
            pred_end = result["per_machine"][cur_stage, m]["schedule"][pred_job][1]
            su = setup_time(JOBS[pred_job]["type"], JOBS[cur_job]["type"]) if cur_stage == "cast" else 0
            machine_bound = pred_end + su
        else:
            pred_job, su, machine_bound = None, 0, 0

        own_bound = result["per_machine"]["cast", result["machine_of"][cur_job, "cast"]]["schedule"][cur_job][1] \
            if cur_stage == "cnc" else 0

        tight = max(own_bound, machine_bound)
        slack = s - tight

        stage_vn = "Duc" if cur_stage == "cast" else "CNC"
        if slack > 0:
            if result.get("mode") == "jit":
                reason = ("la lua chon CO CHU DICH cua solver de giam chi phi tre han/ton kho "
                           "(mo hinh dang toi uu dung 2 loai chi phi nay).")
            else:
                reason = ("KHONG bi rang buoc nao ep, nhung o che do 'asap' solver chi toi uu makespan "
                           "-> day chi la 1 trong nhieu loi giai co CUNG makespan toi uu, khong phan anh "
                           "uu tien kinh doanh nao ca. Can can trong, dung suy dien day la 'lua chon JIT'.")
            lines.append(
                f"{cur_job} ({stage_vn}/{m}) bat dau luc {s}, trong khi som nhat co the la luc {tight} "
                f"=> CHU DONG TRI HOAN {slack} don vi -> {reason}"
            )
            break
        if pred_job is not None and machine_bound >= own_bound:
            if su > 0:
                lines.append(
                    f"{cur_job} ({stage_vn}/{m}) bat dau luc {s} = {pred_job} ket thuc luc {pred_end} "
                    f"+ changeover {su} ({JOBS[pred_job]['type']}->{JOBS[cur_job]['type']}) "
                    f"=> may {m} la NUT THAT, dang ban voi {pred_job}."
                )
            else:
                lines.append(
                    f"{cur_job} ({stage_vn}/{m}) bat dau luc {s} = ngay khi {pred_job} ket thuc luc {pred_end} "
                    f"=> may {m} la NUT THAT, dang ban voi {pred_job}."
                )
            cur_job = pred_job
            continue
        if cur_stage == "cnc":
            lines.append(
                f"{cur_job} (CNC) bat dau luc {s} = ngay khi cong doan Duc cua CHINH NO xong luc {own_bound} "
                f"=> cho CHINH NO Duc xong (precedence), khong phai loi may CNC."
            )
            cur_stage = "cast"
            continue
        lines.append(f"{cur_job} (Duc/{m}) la job DAU TIEN tren may nay, bat dau luc {s} (khong bi chan boi gi).")
        break
    return lines


def explain_machine_gaps(result, stage, machine):
    """Phan loai tung khoang trong tren 1 may: do doi khuon (khong lang
    phi), do cho cong doan truoc (Duc chua xong), hay do tri hoan chu
    dong (JIT)."""
    seq = _sequence(result, stage, machine)
    lines = []
    for i in range(1, len(seq)):
        prev_job, (_, pe) = seq[i - 1]
        job, (s, _) = seq[i]
        gap = s - pe
        if gap <= 0:
            continue
        su = setup_time(JOBS[prev_job]["type"], JOBS[job]["type"]) if stage == "cast" else 0
        if gap == su:
            if su > 0:
                lines.append(f"  {prev_job}->{job}: trong {gap} = dung thoi gian doi khuon -> KHONG lang phi.")
            continue
        extra = gap - su
        if stage == "cnc":
            cast_m = result["machine_of"][job, "cast"]
            cast_end = result["per_machine"]["cast", cast_m]["schedule"][job][1]
            if cast_end > pe + su:
                lines.append(
                    f"  {prev_job}->{job}: trong {gap}, trong do cho {job} Duc xong (luc {cast_end}) "
                    f"-> KHONG phai may nhan roi, la do cong doan truoc chua xong."
                )
                continue
        lines.append(f"  {prev_job}->{job}: trong {gap} (chi can {su} de doi khuon) "
                     f"-> {extra} don vi la TRI HOAN CHU DONG (nhuong may / tranh xong qua som).")
    return lines


def bottleneck_summary(result):
    lines = []
    used = {k: v for k, v in result["per_machine"].items() if v["util"] is not None}
    if used:
        (stage, m), info = max(used.items(), key=lambda kv: kv[1]["util"])
        lines.append(f"May co utilization cao nhat (nut that tiem nang): {m} ({stage}) = {info['util']:.1f}%")
    near = [(j, o["due"] - o["completion"]) for j, o in result["orders"].items()
            if 0 <= o["due"] - o["completion"] <= 2]
    if near:
        near_str = ", ".join(f"{j} (con {s} don vi truoc han)" for j, s in near)
        lines.append(f"Don SAT HAN GIAO, de tre neu co bien dong nho: {near_str}")
    tardy_jobs = [j for j, o in result["orders"].items() if o["tardy"] > 0]
    if tardy_jobs:
        lines.append(f"Don dang TRE han: {', '.join(tardy_jobs)}")
    return lines


def explain_rush_order(base_result, rush_job, new_due, mode="jit"):
    """Counterfactual: neu `rush_job` phai doi due date thanh `new_due`,
    nhung don nao bi anh huong va anh huong bao nhieu?"""
    print(f"--- Counterfactual: neu {rush_job} can gap gap, due doi {JOBS[rush_job]['due']} -> {new_due} ---")
    new_result = build_and_solve(mode, due_overrides={rush_job: new_due})
    print(f"{'Job':4} {'Truoc':>6} {'Sau':>6} {'Lech':>6}")
    for j in JOB_NAMES:
        before = base_result["orders"][j]["completion"]
        after = new_result["orders"][j]["completion"]
        diff = after - before
        marker = "  <-- BI DAY LUI" if diff > 0 else ("  <-- SOM HON" if diff < 0 else "")
        print(f"{j:4} {before:>6} {after:>6} {diff:>6}{marker}")
    before_cost = base_result["total_tardy_cost"] + base_result["total_hold_cost"]
    after_cost = new_result["total_tardy_cost"] + new_result["total_hold_cost"]
    print(f"Tong chi phi: {before_cost} -> {after_cost} (thay doi {after_cost - before_cost:+d})")
    print()
    return new_result


# ---------------------------------------------------------------------------
# 4) In ket qua
# ---------------------------------------------------------------------------

def render_gantt(per_machine, width):
    for (stage, m), info in per_machine.items():
        chars = ["."] * width
        for j, (s, e) in info["schedule"].items():
            label = j[1:]
            for t in range(s, e):
                if t < width:
                    chars[t] = label
        util_str = f"{info['util']:.1f}%" if info["util"] is not None else "N/A"
        print(f"{stage:>4}/{m:<5}: {''.join(chars)}   work={info['work']:>2} idle={info['idle']:>2} util={util_str}")


def render_orders(orders):
    print(f"{'Job':4} {'Qty':>4} {'Due':>4} {'Xong':>5} {'Tre':>4} {'Ton kho (don vi thoi gian)':>27}")
    for j, o in orders.items():
        status = ""
        if o["tardy"] > 0:
            status = f"TRE {o['tardy']}"
        elif o["holding"] > 0:
            status = f"ton kho {o['holding']}"
        else:
            status = "dung han (JIT)"
        print(f"{j:4} {o['qty']:>4} {o['due']:>4} {o['completion']:>5} {o['tardy']:>4} {status:>27}")


def print_scenario(title, r):
    print(f"=== {title} ===")
    print(f"Status = {r['status']} | Makespan = {r['makespan']} | Tong CNC idle = {r['total_cnc_idle']}")
    print(f"Chi phi tre han = {r['total_tardy_cost']} | Chi phi ton kho = {r['total_hold_cost']} "
          f"| TONG CHI PHI = {r['total_tardy_cost'] + r['total_hold_cost']}")
    render_gantt(r["per_machine"], width=max(r["makespan"], max(o["completion"] for o in r["orders"].values())) + 1)
    render_orders(r["orders"])
    print()


if __name__ == "__main__":
    r_asap = build_and_solve("asap")
    print_scenario("Chien luoc A: ASAP (minimize makespan)", r_asap)

    r_jit = build_and_solve("jit")
    print_scenario("Chien luoc B: JIT (minimize chi phi tre han + ton kho)", r_jit)

    print("=== So sanh tong ket ===")
    for name, r in (("ASAP", r_asap), ("JIT", r_jit)):
        total_cost = r["total_tardy_cost"] + r["total_hold_cost"]
        print(f"{name:5}: makespan={r['makespan']:>3}  tardy_cost={r['total_tardy_cost']:>5}  "
              f"hold_cost={r['total_hold_cost']:>5}  TOTAL_COST={total_cost:>5}")
    print()

    # -------------------------------------------------------------------
    # LOP GIAI THICH
    # -------------------------------------------------------------------
    print("############################################################")
    print("# LOP GIAI THICH (Explanation Layer)")
    print("############################################################")
    print()

    print("--- (a) Critical path: vi sao cac don TRE han o kich ban ASAP? ---")
    for j, o in r_asap["orders"].items():
        if o["tardy"] > 0:
            print(f"* {j} tre {o['tardy']} don vi (due={o['due']}, xong={o['completion']}):")
            for line in trace_critical_path(r_asap, j):
                print(f"    - {line}")
    print()

    print("--- (a) Critical path: vi du giai thich 1 don duoc TON KHO o kich ban JIT ---")
    example_holding_job = next((j for j, o in r_jit["orders"].items() if o["holding"] > 0), None)
    if example_holding_job:
        o = r_jit["orders"][example_holding_job]
        print(f"* {example_holding_job} ton kho {o['holding']} don vi (due={o['due']}, xong={o['completion']}):")
        for line in trace_critical_path(r_jit, example_holding_job):
            print(f"    - {line}")
    print()

    print("--- (b) Utilization report: khoang trong tren tung may CNC (kich ban JIT) ---")
    for m in MACHINES["cnc"]:
        gaps = explain_machine_gaps(r_jit, "cnc", m)
        print(f"* CNC/{m}:")
        if gaps:
            for line in gaps:
                print(line)
        else:
            print("  Khong co khoang trong dang ke.")
    print()

    print("--- (c) Sensitivity / bottleneck (kich ban JIT) ---")
    for line in bottleneck_summary(r_jit):
        print(f"* {line}")
    print()

    print("--- (d) Counterfactual: don J6 (dang due=28, thoai mai nhat) bat ngo can gap, due=10 ---")
    explain_rush_order(r_jit, "J6", 10, mode="jit")
