"""Explanation engine (mục 2.3, mục 5): critical path, machine-gap, bottleneck,
counterfactual.

Bọc lại nguyên trạng logic của `trace_critical_path`, `explain_machine_gaps`,
`bottleneck_summary`, `explain_rush_order` từ `poc/scheduling_poc_inventory.py`
— không sửa thuật toán, chỉ tham số hoá:
- `jobs`: dict job -> {"type": str, "due": int, "qty": int} thay vì hằng số
  module-level `JOBS`.
- `setup_time_fn`: callable(type_a, type_b) -> int thay vì đọc `CHANGEOVER`
  module-level trực tiếp (đọc từ `changeover_matrix` Master Data).
- `explain_rush_order` nhận `solve_fn(mode, due_overrides) -> result` thay vì
  gọi thẳng `build_and_solve` của 1 file cụ thể — cho phép tiêm bất kỳ engine
  job-level nào hỗ trợ due date (TODO bên dưới).

Các hàm này thao tác trên "result" có cấu trúc y hệt
`scheduling_poc_inventory.build_and_solve()`: `per_machine[(stage, machine)]`
= {"schedule": {job: (start, end)}, "work", "span", "idle", "util"},
`machine_of[(job, stage)]` = machine, `orders[job]` = {"qty", "due",
"completion", "tardy", "holding"}.

TODO (mục 5, nợ lại): chưa có engine job-level với due date/qty được bọc từ
`scheduling_poc_inventory.py` (chỉ trích các hàm giải thích, không phải
`build_and_solve` của file đó) — `app/modules/scheduling/` cần bổ sung 1 biến
thể của `detailed_scheduling` có due date trước khi `explain_rush_order` /
`/explain/counterfactual` chạy được trên dữ liệu thật. `/explain/bottleneck`
hiện dùng `bottleneck_from_aggregate_plan` (đơn giản hơn, khớp với
Aggregate Planning — đã implement) thay vì `bottleneck_summary` đầy đủ.
"""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

JobInfo = dict[str, Any]
Result = dict[str, Any]
SetupTimeFn = Callable[[str, str], int]


def _sequence(result: Result, stage: str, machine: str) -> list[tuple[str, tuple[int, int]]]:
    sched = result["per_machine"][stage, machine]["schedule"]
    return sorted(sched.items(), key=lambda kv: kv[1][0])


def trace_critical_path(
    result: Result,
    jobs: dict[str, JobInfo],
    setup_time_fn: SetupTimeFn,
    job: str,
    stage: str = "cnc",
    max_hops: int = 30,
) -> list[str]:
    """Đi ngược chuỗi nguyên nhân khiến `job` bắt đầu/kết thúc lúc đó."""
    lines: list[str] = []
    cur_job, cur_stage = job, stage
    for _ in range(max_hops):
        m = result["machine_of"][cur_job, cur_stage]
        seq = _sequence(result, cur_stage, m)
        seq_jobs = [j for j, _ in seq]
        idx = seq_jobs.index(cur_job)
        s, _e = result["per_machine"][cur_stage, m]["schedule"][cur_job]

        if idx > 0:
            pred_job = seq_jobs[idx - 1]
            pred_end = result["per_machine"][cur_stage, m]["schedule"][pred_job][1]
            su = setup_time_fn(jobs[pred_job]["type"], jobs[cur_job]["type"]) if cur_stage == "cast" else 0
            machine_bound = pred_end + su
        else:
            pred_job, su, machine_bound = None, 0, 0

        own_bound = (
            result["per_machine"]["cast", result["machine_of"][cur_job, "cast"]]["schedule"][cur_job][1]
            if cur_stage == "cnc"
            else 0
        )

        tight = max(own_bound, machine_bound)
        slack = s - tight

        stage_vn = "Duc" if cur_stage == "cast" else "CNC"
        if slack > 0:
            if result.get("mode") == "jit":
                reason = (
                    "la lua chon CO CHU DICH cua solver de giam chi phi tre han/ton kho "
                    "(mo hinh dang toi uu dung 2 loai chi phi nay)."
                )
            else:
                reason = (
                    "KHONG bi rang buoc nao ep, nhung o che do 'asap' solver chi toi uu makespan "
                    "-> day chi la 1 trong nhieu loi giai co CUNG makespan toi uu, khong phan anh "
                    "uu tien kinh doanh nao ca. Can can trong, dung suy dien day la 'lua chon JIT'."
                )
            lines.append(
                f"{cur_job} ({stage_vn}/{m}) bat dau luc {s}, trong khi som nhat co the la luc {tight} "
                f"=> CHU DONG TRI HOAN {slack} don vi -> {reason}"
            )
            break
        if pred_job is not None and machine_bound >= own_bound:
            if su > 0:
                lines.append(
                    f"{cur_job} ({stage_vn}/{m}) bat dau luc {s} = {pred_job} ket thuc luc {pred_end} "
                    f"+ changeover {su} ({jobs[pred_job]['type']}->{jobs[cur_job]['type']}) "
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


def explain_machine_gaps(
    result: Result, jobs: dict[str, JobInfo], setup_time_fn: SetupTimeFn, stage: str, machine: str
) -> list[str]:
    seq = _sequence(result, stage, machine)
    lines: list[str] = []
    for i in range(1, len(seq)):
        prev_job, (_, pe) = seq[i - 1]
        job, (s, _) = seq[i]
        gap = s - pe
        if gap <= 0:
            continue
        su = setup_time_fn(jobs[prev_job]["type"], jobs[job]["type"]) if stage == "cast" else 0
        if gap == su:
            if su > 0:
                lines.append(f"{prev_job}->{job}: trong {gap} = dung thoi gian doi khuon -> KHONG lang phi.")
            continue
        extra = gap - su
        if stage == "cnc":
            cast_m = result["machine_of"][job, "cast"]
            cast_end = result["per_machine"]["cast", cast_m]["schedule"][job][1]
            if cast_end > pe + su:
                lines.append(
                    f"{prev_job}->{job}: trong {gap}, trong do cho {job} Duc xong (luc {cast_end}) "
                    f"-> KHONG phai may nhan roi, la do cong doan truoc chua xong."
                )
                continue
        lines.append(
            f"{prev_job}->{job}: trong {gap} (chi can {su} de doi khuon) "
            f"-> {extra} don vi la TRI HOAN CHU DONG (nhuong may / tranh xong qua som)."
        )
    return lines


def bottleneck_summary(result: Result) -> list[str]:
    lines: list[str] = []
    used = {k: v for k, v in result["per_machine"].items() if v["util"] is not None}
    if used:
        (stage, m), info = max(used.items(), key=lambda kv: kv[1]["util"])
        lines.append(f"May co utilization cao nhat (nut that tiem nang): {m} ({stage}) = {info['util']:.1f}%")
    near = [
        (j, o["due"] - o["completion"]) for j, o in result["orders"].items() if 0 <= o["due"] - o["completion"] <= 2
    ]
    if near:
        near_str = ", ".join(f"{j} (con {s} don vi truoc han)" for j, s in near)
        lines.append(f"Don SAT HAN GIAO, de tre neu co bien dong nho: {near_str}")
    tardy_jobs = [j for j, o in result["orders"].items() if o["tardy"] > 0]
    if tardy_jobs:
        lines.append(f"Don dang TRE han: {', '.join(tardy_jobs)}")
    return lines


def explain_rush_order(
    base_result: Result,
    solve_fn: Callable[[str, dict[str, int]], Result],
    rush_job: str,
    new_due: int,
    mode: str = "jit",
) -> dict:
    """Counterfactual: nếu `rush_job` phải đổi due date thành `new_due`, những
    đơn nào bị ảnh hưởng và ảnh hưởng bao nhiêu? `solve_fn` = engine job-level
    hỗ trợ `due_overrides` (xem TODO đầu module)."""
    new_result = solve_fn(mode, {rush_job: new_due})
    diffs = []
    for j, o in base_result["orders"].items():
        before = o["completion"]
        after = new_result["orders"][j]["completion"]
        diffs.append({"job": j, "before": before, "after": after, "diff": after - before})
    before_cost = base_result["total_tardy_cost"] + base_result["total_hold_cost"]
    after_cost = new_result["total_tardy_cost"] + new_result["total_hold_cost"]
    return {
        "rush_job": rush_job,
        "new_due": new_due,
        "diffs": diffs,
        "cost_before": before_cost,
        "cost_after": after_cost,
        "cost_delta": after_cost - before_cost,
        "new_result": new_result,
    }


def bottleneck_from_aggregate_plan(result: dict, cast_cap_per_day: int, cnc_cap_per_day: int) -> list[str]:
    """Bottleneck đơn giản hoá cho kết quả Aggregate Planning (mục Production
    Planning, đã implement) — dùng cho `/explain/bottleneck` cho tới khi có
    detailed run job-level (xem TODO đầu module)."""
    lines: list[str] = []
    by_day: dict[int, dict[str, int]] = {}
    for entry in result["plan"].values():
        d = entry["day"]
        totals = by_day.setdefault(d, {"cast": 0, "cnc": 0})
        totals["cast"] += entry["cast"]
        totals["cnc"] += entry["cnc"]

    util = []
    for d, totals in by_day.items():
        util.append((d, "cast", totals["cast"] / cast_cap_per_day if cast_cap_per_day else 0))
        util.append((d, "cnc", totals["cnc"] / cnc_cap_per_day if cnc_cap_per_day else 0))
    if util:
        d, stage, u = max(util, key=lambda x: x[2])
        lines.append(f"Ngay {d}, cong doan {stage}: utilization cao nhat = {u * 100:.1f}% cong suat he thong.")

    backlog_orders = [
        (entry["type"], entry["day"], entry["backlog"]) for entry in result["plan"].values() if entry["backlog"] > 0
    ]
    if backlog_orders:
        lines.append(
            "Don sat/tre han (backlog > 0): "
            + ", ".join(f"{t}/Ngay{d} (backlog={b})" for t, d, b in backlog_orders)
        )
    else:
        lines.append("Khong co don nao bi backlog trong ke hoach nay.")

    shortfalls = [
        (t, d, entry["wip_short"], entry["fg_short"])
        for entry in result["plan"].values()
        for t, d in [(entry["type"], entry["day"])]
        if entry["wip_short"] > 0 or entry["fg_short"] > 0
    ]
    if shortfalls:
        lines.append(
            "Duoi nguong ton kho an toan: "
            + ", ".join(f"{t}/Ngay{d} (wip_short={ws}, fg_short={fs})" for t, d, ws, fs in shortfalls)
        )
    return lines
