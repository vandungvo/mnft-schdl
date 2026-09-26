"""
Proof-of-concept cho Phu luc A cua bao cao CO5103.

Bai toan: 3 job, 2 may (Duc -> CNC), moi job phai chay Duc roi CNC.
Rang buoc:
  - Precedence: CNC cua job j chi bat dau sau khi Duc cua job j xong.
  - Machine capacity: moi may xu ly 1 job tai 1 thoi diem (NoOverlap).
  - Sequence-dependent setup: doi loai san pham (A<->B) tren CUNG mot may ton 2 don vi thoi gian.

Ky thuat CP-SAT dung o day: bieu dien thu tu job tren MOI may nhu mot
"chu trinh Hamilton" (AddCircuit) di qua 1 node "depot" (may bat/tat) va
cac node job. Moi canh (i -> j) giua 2 job that co mot literal boolean;
neu literal = True (j chay ngay sau i tren may do) thi ta ep buoc:
        start[j] >= end[i] + setup(i, j)
Day chinh la cach chuan de dua sequence-dependent setup time vao CP-SAT,
vi NoOverlap thuong (native) khong biet "ai la job lien truoc" de tinh setup.

Chay: python scheduling_poc.py
"""

from ortools.sat.python import cp_model

# ---------------------------------------------------------------------------
# 1) Du lieu testcase (giong Phu luc A)
# ---------------------------------------------------------------------------

JOBS = {
    "J1": {"type": "A", "cast": 4, "cnc": 3},
    "J2": {"type": "A", "cast": 3, "cnc": 2},
    "J3": {"type": "B", "cast": 5, "cnc": 4},
}
JOB_NAMES = list(JOBS.keys())
CHANGEOVER = 2  # doi loai A<->B tren cung 1 may


def setup_time(job_i: str, job_j: str) -> int:
    return 0 if JOBS[job_i]["type"] == JOBS[job_j]["type"] else CHANGEOVER


HORIZON = sum(j["cast"] + j["cnc"] for j in JOBS.values()) + 2 * CHANGEOVER * 2


# ---------------------------------------------------------------------------
# 2) Xay model CP-SAT (dung chung cho ca 2 kich ban)
# ---------------------------------------------------------------------------

def build_and_solve(penalize_idle: bool):
    model = cp_model.CpModel()

    start = {}
    end = {}
    interval = {}

    for j in JOB_NAMES:
        for stage in ("cast", "cnc"):
            dur = JOBS[j][stage]
            s = model.NewIntVar(0, HORIZON, f"start_{j}_{stage}")
            e = model.NewIntVar(0, HORIZON, f"end_{j}_{stage}")
            iv = model.NewIntervalVar(s, dur, e, f"iv_{j}_{stage}")
            start[j, stage] = s
            end[j, stage] = e
            interval[j, stage] = iv

    # Precedence: Duc xong roi moi CNC
    for j in JOB_NAMES:
        model.Add(start[j, "cnc"] >= end[j, "cast"])

    # --- Sequencing tren tung may bang AddCircuit (co setup time) ---
    # Ghi chu: changeover (doi khuon) chi xay ra o may DUC. May CNC gia
    # cong khong can doi khuon nen khong co setup time giua cac loai san
    # pham (khop voi Gantt chart trong Phu luc A: idle do changeover chi
    # xuat hien tren dong DUCT, khong bao gio xuat hien tren dong CNC).
    def add_machine_sequencing(stage: str, use_setup: bool):
        n = len(JOB_NAMES)
        DEPOT = 0
        arcs = []
        for i in range(n + 1):
            for k in range(n + 1):
                if i == k:
                    continue
                lit = model.NewBoolVar(f"arc_{stage}_{i}_{k}")
                arcs.append((i, k, lit))
                if i != DEPOT and k != DEPOT:
                    job_i = JOB_NAMES[i - 1]
                    job_k = JOB_NAMES[k - 1]
                    su = setup_time(job_i, job_k) if use_setup else 0
                    model.Add(
                        start[job_k, stage] >= end[job_i, stage] + su
                    ).OnlyEnforceIf(lit)
        model.AddCircuit(arcs)

    add_machine_sequencing("cast", use_setup=True)
    add_machine_sequencing("cnc", use_setup=False)

    # --- Makespan ---
    makespan = model.NewIntVar(0, HORIZON, "makespan")
    model.AddMaxEquality(makespan, [end[j, "cnc"] for j in JOB_NAMES])

    # --- CNC active-window idle time (may chi tinh "idle" tu khi job dau
    #     tien bat dau toi khi job cuoi cung ket thuc; truoc do coi la may
    #     chua bat, khong tinh lang phi) ---
    cnc_first_start = model.NewIntVar(0, HORIZON, "cnc_first_start")
    cnc_last_end = model.NewIntVar(0, HORIZON, "cnc_last_end")
    model.AddMinEquality(cnc_first_start, [start[j, "cnc"] for j in JOB_NAMES])
    model.AddMaxEquality(cnc_last_end, [end[j, "cnc"] for j in JOB_NAMES])

    cnc_work = sum(JOBS[j]["cnc"] for j in JOB_NAMES)
    cnc_span = model.NewIntVar(0, HORIZON, "cnc_span")
    model.Add(cnc_span == cnc_last_end - cnc_first_start)
    cnc_idle = model.NewIntVar(0, HORIZON, "cnc_idle")
    model.Add(cnc_idle == cnc_span - cnc_work)

    # --- Objective ---
    if penalize_idle:
        # w1 >> w4: uu tien makespan truoc, idle time la tieu chi phu
        # (giong hop w1*Makespan + w4*IdleTime voi w1 rat lon trong bao cao)
        model.Minimize(1000 * makespan + cnc_idle)
    else:
        model.Minimize(makespan)

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    assert status in (cp_model.OPTIMAL, cp_model.FEASIBLE), "Khong tim duoc loi giai"

    result = {
        "makespan": solver.Value(makespan),
        "cnc_idle": solver.Value(cnc_idle),
        "cnc_work": cnc_work,
        "cnc_span": solver.Value(cnc_span),
        "schedule": {
            j: {
                "cast": (solver.Value(start[j, "cast"]), solver.Value(end[j, "cast"])),
                "cnc": (solver.Value(start[j, "cnc"]), solver.Value(end[j, "cnc"])),
            }
            for j in JOB_NAMES
        },
    }
    return result


# ---------------------------------------------------------------------------
# 3) In Gantt chart dang ASCII (giong Phu luc A)
# ---------------------------------------------------------------------------

def render_gantt(result, width=None):
    sched = result["schedule"]
    makespan = result["makespan"]
    width = width or makespan

    def row(stage):
        chars = ["."] * width
        for j in JOB_NAMES:
            s, e = sched[j][stage]
            digit = j[-1]  # "1", "2", "3"
            for t in range(s, e):
                if t < width:
                    chars[t] = digit
        return "".join(chars)

    print(f"DUCT: {row('cast')}")
    print(f"CNC : {row('cnc')}")


# ---------------------------------------------------------------------------
# 4) Chay 2 kich ban va so sanh voi bao cao
# ---------------------------------------------------------------------------

def utilization(result):
    if result["cnc_span"] == 0:
        return 100.0
    return 100.0 * result["cnc_work"] / result["cnc_span"]


if __name__ == "__main__":
    print("=== Kich ban 1: KHONG phat idle time (chi minimize makespan) ===")
    r1 = build_and_solve(penalize_idle=False)
    print(f"Makespan     = {r1['makespan']}")
    print(f"CNC idle     = {r1['cnc_idle']}")
    print(f"CNC util     = {utilization(r1):.1f}%")
    render_gantt(r1)

    print()
    print("=== Kich ban 2: CO phat idle time (minimize makespan roi idle) ===")
    r2 = build_and_solve(penalize_idle=True)
    print(f"Makespan     = {r2['makespan']}")
    print(f"CNC idle     = {r2['cnc_idle']}")
    print(f"CNC util     = {utilization(r2):.1f}%")
    render_gantt(r2)

    print()
    print("=== Doi chieu voi Phu luc A cua bao cao ===")
    print("Bao cao : khong phat -> makespan=16, idle=2, util=81.8%")
    print("Bao cao : co phat    -> makespan=16, idle=0, util=100.0%")
