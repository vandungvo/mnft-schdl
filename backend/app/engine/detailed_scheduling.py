"""Production Scheduling engine (Tầng 2 — Detailed, horizon 2 tuần, đúc→CNC).

Bọc lại nguyên trạng thuật toán CP-SAT (AddCircuit flexible machine
assignment + changeover + "máy bật/tắt" soft-active) từ
`poc/scheduling_poc_multi.py` và `model/detailed_day_schedule.py` — không sửa
logic solve, chỉ tham số hoá `MACHINES`/`ELIGIBLE`/`CHANGEOVER`/ngân sách ca
làm việc thay vì hằng số module-level, để service layer của module
`scheduling` truyền dữ liệu Master Data (machines, machine_eligibility,
changeover_matrix, shifts) vào.

TODO (roadmap tuần 2-3, 7): chưa có router/service gọi các hàm này —
`app/modules/scheduling/` mới có skeleton thư mục. Việc gọi
`run_two_weeks()` cần đầu ra của `aggregate_planning.build_and_solve()` làm
input (đúng kiến trúc phân tầng mục 3).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ortools.sat.python import cp_model

Stage = str  # "cast" | "cnc"


@dataclass
class DetailedSchedulingConfig:
    machines: dict[Stage, list[str]] = field(
        default_factory=lambda: {"cast": ["Cast1", "Cast2"], "cnc": ["CNC1", "CNC2"]}
    )
    eligible: dict[tuple[Stage, str], set[str]] = field(
        default_factory=lambda: {
            ("cast", "Cast1"): {"A", "B", "C"},
            ("cast", "Cast2"): {"A", "B"},
            ("cnc", "CNC1"): {"A", "B", "C"},
            ("cnc", "CNC2"): {"A", "C"},
        }
    )
    changeover: dict[frozenset, int] = field(
        default_factory=lambda: {
            frozenset({"A", "B"}): 2,
            frozenset({"A", "C"}): 3,
            frozenset({"B", "C"}): 2,
        }
    )
    # Mặc định = CAST_CAP_PER_DAY // 2, CNC_CAP_PER_DAY // 2 của aggregate_planning
    # (204 // 2, 162 // 2) -- suy ra ngân sách 1 ngày cho TỪNG máy từ tổng công
    # suất hệ thống của Tầng 1, giống `detailed_day_schedule.py` gốc.
    machine_daily_budget: dict[str, int] = field(
        default_factory=lambda: {"Cast1": 102, "Cast2": 102, "CNC1": 81, "CNC2": 81}
    )
    lot_max: int = 20
    lot_min: int = 10
    overtime_cost: int = 10_000
    activation_cost: int = 500
    horizon: int = 200
    max_time_in_seconds: float = 15
    num_search_workers: int = 8


def setup_time(cfg: DetailedSchedulingConfig, ti: str, tj: str) -> int:
    return 0 if ti == tj else cfg.changeover[frozenset({ti, tj})]


def split_into_lots(qty: int, max_lot: int, min_lot: int) -> list[int]:
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


def build_jobs_for_day(
    cfg: DetailedSchedulingConfig, day_plan: dict[str, int], stage: Stage, unit_time: dict[str, int]
) -> list[tuple[str, str, int]]:
    jobs = []
    for t, qty in day_plan.items():
        for i, lot_qty in enumerate(split_into_lots(qty, cfg.lot_max, cfg.lot_min), start=1):
            jobs.append((f"{t}-{stage}-{i}", t, lot_qty * unit_time[t]))
    return jobs


def schedule_stage(cfg: DetailedSchedulingConfig, stage: Stage, jobs: list[tuple[str, str, int]]) -> dict:
    """Xếp các lô trong `jobs` lên các máy của `stage` bằng AddCircuit (flexible
    machine assignment + changeover phụ thuộc trình tự + phạt vượt ca/khởi động máy)."""
    machines = cfg.machines[stage]
    if not jobs:
        return {m: {"schedule": {}, "work": 0, "end": 0} for m in machines}

    model = cp_model.CpModel()
    start, end, dur = {}, {}, {}
    job_type = {}
    for name, t, d in jobs:
        s = model.NewIntVar(0, cfg.horizon, f"s_{name}")
        e = model.NewIntVar(0, cfg.horizon, f"e_{name}")
        model.Add(e == s + d)
        start[name], end[name], dur[name] = s, e, d
        job_type[name] = t

    use_setup = stage == "cast"
    assigned = {}
    for name, t, d in jobs:
        eligible_machines = [m for m in machines if t in cfg.eligible[stage, m]]
        lits = []
        for m in eligible_machines:
            lit = model.NewBoolVar(f"assign_{name}_{m}")
            assigned[name, m] = lit
            lits.append(lit)
        model.AddExactlyOne(lits)

    active = {}
    for m in machines:
        a = model.NewBoolVar(f"active_{m}")
        for name, t, d in jobs:
            if (name, m) in assigned:
                model.AddImplication(assigned[name, m], a)
        active[m] = a

    for m in machines:
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
                su = setup_time(cfg, job_type[i_name], job_type[k_name]) if use_setup else 0
                model.Add(start[k_name] >= end[i_name] + su).OnlyEnforceIf(lit)
        model.AddCircuit(arcs)

    makespan = model.NewIntVar(0, cfg.horizon, "makespan")
    model.AddMaxEquality(makespan, [end[name] for name, t, d in jobs])

    overtime_vars = []
    for m in machines:
        eligible_jobs = [name for name, t, d in jobs if (name, m) in assigned]
        budget = cfg.machine_daily_budget[m]
        end_m = model.NewIntVar(0, cfg.horizon, f"end_{m}")
        if eligible_jobs:
            contribs = []
            for name in eligible_jobs:
                c = model.NewIntVar(0, cfg.horizon, f"contrib_{m}_{name}")
                model.Add(c == end[name]).OnlyEnforceIf(assigned[name, m])
                model.Add(c == 0).OnlyEnforceIf(assigned[name, m].Not())
                contribs.append(c)
            model.AddMaxEquality(end_m, contribs + [0])
        else:
            model.Add(end_m == 0)
        ot = model.NewIntVar(0, cfg.horizon, f"overtime_{m}")
        model.AddMaxEquality(ot, [end_m - budget, 0])
        overtime_vars.append(ot)

    model.Minimize(
        cfg.overtime_cost * sum(overtime_vars)
        + cfg.activation_cost * sum(active[m] for m in machines)
        + makespan
    )

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = cfg.num_search_workers
    solver.parameters.max_time_in_seconds = cfg.max_time_in_seconds
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"Tang 2 (detailed scheduling) khong giai duoc: status={solver.StatusName(status)}")

    per_machine = {}
    for m in machines:
        jobs_here = [name for name, t, d in jobs if (name, m) in assigned and solver.Value(assigned[name, m])]
        jobs_here.sort(key=lambda name: solver.Value(start[name]))
        sched = {name: (solver.Value(start[name]), solver.Value(end[name])) for name in jobs_here}
        work = sum(dur[name] for name in jobs_here)
        end_time = max((e for _, e in sched.values()), default=0)
        per_machine[m] = {"schedule": sched, "work": work, "end": end_time}
    return per_machine


def run_day(
    cfg: DetailedSchedulingConfig,
    day: int,
    cast_plan: dict[str, int],
    cnc_plan: dict[str, int],
    cast_time: dict[str, int],
    cnc_time: dict[str, int],
) -> dict:
    """Chạy Tầng 2 cho 1 ngày, đối chiếu với kế hoạch Tầng 1 (`cast_plan`/`cnc_plan`)."""
    cast_jobs = build_jobs_for_day(cfg, cast_plan, "cast", cast_time)
    cnc_jobs = build_jobs_for_day(cfg, cnc_plan, "cnc", cnc_time)
    job_type = {name: t for name, t, d in cast_jobs + cnc_jobs}

    cast_result = schedule_stage(cfg, "cast", cast_jobs)
    cnc_result = schedule_stage(cfg, "cnc", cnc_jobs)

    overloads = []
    for stage, result in (("cast", cast_result), ("cnc", cnc_result)):
        for m, info in result.items():
            budget = cfg.machine_daily_budget[m]
            if info["end"] > budget:
                overloads.append({"day": day, "stage": stage, "machine": m, "over_by": info["end"] - budget})

    return {
        "day": day,
        "job_type": job_type,
        "cast": cast_result,
        "cnc": cnc_result,
        "overloads": overloads,
    }


def run_two_weeks(
    cfg: DetailedSchedulingConfig,
    days: list[int],
    aggregate_plan: dict,
    cast_time: dict[str, int],
    cnc_time: dict[str, int],
) -> dict:
    """`aggregate_plan` = `aggregate_planning.build_and_solve(...)["plan"]` (đầu ra Tầng 1)."""
    days_result = []
    all_overloads = []
    for day in days:
        cast_plan = {
            e["type"]: e["cast"] for e in aggregate_plan.values() if e["day"] == day and e["cast"] > 0
        }
        cnc_plan = {
            e["type"]: e["cnc"] for e in aggregate_plan.values() if e["day"] == day and e["cnc"] > 0
        }
        day_result = run_day(cfg, day, cast_plan, cnc_plan, cast_time, cnc_time)
        days_result.append(day_result)
        all_overloads.extend(day_result["overloads"])
    return {"days": days_result, "overloads": all_overloads}
