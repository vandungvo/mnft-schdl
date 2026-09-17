"""
Phien ban mo rong cua scheduling_poc.py:
  - NHIEU may cung loai (parallel machines) cho moi cong doan: 2 may Duc,
    2 may CNC -> them quyet dinh "job nay chay tren may nao" (flexible /
    unrelated-machine assignment), khong chi "thu tu tren 1 may" nhu ban dau.
  - Machine eligibility: khong phai may nao cung lam duoc moi loai san
    pham (vd Cast2 khong co khuon lam loai C; CNC2 khong co do gia loai B).
  - NHIEU don hang hon: 8 job, 3 loai san pham A/B/C, bang changeover
    3x3 giua cac loai (chi ap dung o may Duc, giong lap luan da kiem
    chung trong scheduling_poc.py).
  - Van giu co che "phat idle time" de tang utilization, nhung gio tinh
    tong idle tren CA HAI may CNC.

Ky thuat CP-SAT: moi may la 1 chu trinh Hamilton rieng (AddCircuit) tren
tap {depot} + {cac job ĐỦ ĐIỀU KIỆN chay tren may do}. Voi moi job, neu
job KHONG duoc gan cho may nay, no "tu quay vong" (self-loop) de bi loai
khoi chu trinh cua may do -- day la cach chuan de bieu dien "node tuy
chon" (optional node) trong AddCircuit, dung de model hoa flexible
machine assignment.

Chay: python scheduling_poc_multi.py
"""

from itertools import permutations
from ortools.sat.python import cp_model

# ---------------------------------------------------------------------------
# 1) Du lieu: 8 job, 3 loai san pham, 2 may Duc + 2 may CNC
# ---------------------------------------------------------------------------

JOBS = {
    "J1": {"type": "A", "cast": 4, "cnc": 3},
    "J2": {"type": "A", "cast": 3, "cnc": 2},
    "J3": {"type": "B", "cast": 5, "cnc": 4},
    "J4": {"type": "B", "cast": 4, "cnc": 3},
    "J5": {"type": "C", "cast": 6, "cnc": 5},
    "J6": {"type": "A", "cast": 3, "cnc": 2},
    "J7": {"type": "C", "cast": 5, "cnc": 4},
    "J8": {"type": "B", "cast": 4, "cnc": 3},
}
JOB_NAMES = list(JOBS.keys())

MACHINES = {
    "cast": ["Cast1", "Cast2"],
    "cnc": ["CNC1", "CNC2"],
}

# Machine eligibility: loai san pham ma may do LAM DUOC.
ELIGIBLE = {
    ("cast", "Cast1"): {"A", "B", "C"},
    ("cast", "Cast2"): {"A", "B"},        # khong co khuon cho C
    ("cnc", "CNC1"): {"A", "B", "C"},
    ("cnc", "CNC2"): {"A", "C"},          # khong co do gia cho B
}

# Changeover (doi khuon) giua cac loai san pham -- chi ap dung o may Duc.
CHANGEOVER = {
    frozenset({"A", "B"}): 2,
    frozenset({"A", "C"}): 3,
    frozenset({"B", "C"}): 2,
}


def setup_time(type_i: str, type_j: str) -> int:
    if type_i == type_j:
        return 0
    return CHANGEOVER[frozenset({type_i, type_j})]


HORIZON = 70


# ---------------------------------------------------------------------------
# 2) Model CP-SAT
# ---------------------------------------------------------------------------

def build_and_solve(penalize_idle: bool):
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

    # Precedence: Duc xong roi moi CNC (khong phu thuoc may nao duoc chon)
    for j in JOB_NAMES:
        model.Add(start[j, "cnc"] >= end[j, "cast"])

    # --- Flexible machine assignment: moi job-stage chon dung 1 may du dieu kien ---
    assigned = {}
    for j in JOB_NAMES:
        jtype = JOBS[j]["type"]
        for stage in ("cast", "cnc"):
            eligible_machines = [
                m for m in MACHINES[stage] if jtype in ELIGIBLE[stage, m]
            ]
            assert eligible_machines, f"{j} ({jtype}) khong co may {stage} phu hop"
            lits = []
            for m in eligible_machines:
                lit = model.NewBoolVar(f"assign_{j}_{stage}_{m}")
                assigned[j, stage, m] = lit
                lits.append(lit)
            model.AddExactlyOne(lits)

    cnc_gaps = []  # gap variables giua 2 job lien tiep tren cung 1 may CNC

    def add_machine_circuit(stage: str, m: str, use_setup: bool, collect_gaps: bool):
        eligible_jobs = [j for j in JOB_NAMES if (j, stage, m) in assigned]
        DEPOT = 0
        index_of = {j: idx + 1 for idx, j in enumerate(eligible_jobs)}
        arcs = []

        # self-loop: job khong duoc gan cho may nay -> bi loai khoi chu trinh
        for j in eligible_jobs:
            not_assigned = assigned[j, stage, m].Not()
            arcs.append((index_of[j], index_of[j], not_assigned))

        # depot <-> job (job dau tien / cuoi cung trong chuoi cua may nay)
        for j in eligible_jobs:
            arcs.append((DEPOT, index_of[j], model.NewBoolVar(f"d0_{stage}_{m}_{j}")))
            arcs.append((index_of[j], DEPOT, model.NewBoolVar(f"d1_{stage}_{m}_{j}")))

        # depot self-loop (cho phep may khong co job nao -> "may tat")
        arcs.append((DEPOT, DEPOT, model.NewBoolVar(f"depot_loop_{stage}_{m}")))

        # job -> job (thu tu lien tiep tren may nay)
        for i in eligible_jobs:
            for k in eligible_jobs:
                if i == k:
                    continue
                lit = model.NewBoolVar(f"seq_{stage}_{m}_{i}_{k}")
                arcs.append((index_of[i], index_of[k], lit))
                su = setup_time(JOBS[i]["type"], JOBS[k]["type"]) if use_setup else 0
                model.Add(start[k, stage] >= end[i, stage] + su).OnlyEnforceIf(lit)
                if collect_gaps:
                    gap = model.NewIntVar(0, HORIZON, f"gap_{stage}_{m}_{i}_{k}")
                    model.Add(gap == start[k, stage] - end[i, stage]).OnlyEnforceIf(lit)
                    model.Add(gap == 0).OnlyEnforceIf(lit.Not())
                    cnc_gaps.append(gap)

        model.AddCircuit(arcs)

    for m in MACHINES["cast"]:
        add_machine_circuit("cast", m, use_setup=True, collect_gaps=False)
    for m in MACHINES["cnc"]:
        add_machine_circuit("cnc", m, use_setup=False, collect_gaps=True)

    # --- Makespan ---
    makespan = model.NewIntVar(0, HORIZON, "makespan")
    model.AddMaxEquality(makespan, [end[j, "cnc"] for j in JOB_NAMES])

    total_cnc_idle = model.NewIntVar(0, HORIZON * len(JOB_NAMES), "total_cnc_idle")
    model.Add(total_cnc_idle == sum(cnc_gaps))

    if penalize_idle:
        model.Minimize(1000 * makespan + total_cnc_idle)
    else:
        model.Minimize(makespan)

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = 20
    status = solver.Solve(model)
    assert status in (cp_model.OPTIMAL, cp_model.FEASIBLE), "Khong tim duoc loi giai"

    # --- Trich xuat lich theo tung may (tinh trong Python tu ket qua solver) ---
    per_machine = {}
    for stage in ("cast", "cnc"):
        for m in MACHINES[stage]:
            jobs_here = [
                j for j in JOB_NAMES
                if (j, stage, m) in assigned and solver.Value(assigned[j, stage, m])
            ]
            jobs_here.sort(key=lambda j: solver.Value(start[j, stage]))
            work = sum(JOBS[j][stage] for j in jobs_here)
            if jobs_here:
                first = solver.Value(start[jobs_here[0], stage])
                last = solver.Value(end[jobs_here[-1], stage])
                span = last - first
            else:
                first = last = span = 0
            idle = span - work
            util = (100.0 * work / span) if span > 0 else None
            per_machine[stage, m] = {
                "jobs": jobs_here,
                "schedule": {j: (solver.Value(start[j, stage]), solver.Value(end[j, stage])) for j in jobs_here},
                "work": work,
                "span": span,
                "idle": idle,
                "util": util,
            }

    return {
        "status": solver.StatusName(status),
        "makespan": solver.Value(makespan),
        "total_cnc_idle": solver.Value(total_cnc_idle),
        "per_machine": per_machine,
    }


# ---------------------------------------------------------------------------
# 3) In ket qua
# ---------------------------------------------------------------------------

def render_gantt(per_machine, width):
    for (stage, m), info in per_machine.items():
        chars = ["."] * width
        for j, (s, e) in info["schedule"].items():
            digit = j[1:]  # "1".."8"
            label = digit if len(digit) == 1 else digit[-1]
            for t in range(s, e):
                if t < width:
                    chars[t] = label
        util_str = f"{info['util']:.1f}%" if info["util"] is not None else "N/A (may tat)"
        print(f"{stage:>4}/{m:<5}: {''.join(chars)}   work={info['work']:>2} idle={info['idle']:>2} util={util_str}")


def print_scenario(title, result):
    print(f"=== {title} ===")
    print(f"Solver status = {result['status']}")
    print(f"Makespan      = {result['makespan']}")
    print(f"Tong CNC idle = {result['total_cnc_idle']}")
    render_gantt(result["per_machine"], width=result["makespan"] + 1)
    print()


if __name__ == "__main__":
    r1 = build_and_solve(penalize_idle=False)
    print_scenario("Kich ban 1: KHONG phat idle time", r1)

    r2 = build_and_solve(penalize_idle=True)
    print_scenario("Kich ban 2: CO phat idle time (uu tien makespan, roi toi thieu idle)", r2)
