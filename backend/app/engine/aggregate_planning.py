"""Production Planning engine (Tầng 1 — Aggregate, theo tháng/quý).

Bọc lại nguyên trạng thuật toán CP-SAT của `model/production_planning_2weeks.py`
(KHÔNG sửa logic solve) thành một hàm `build_and_solve()` nhận input qua
`AggregatePlanningInput` thay vì đọc hằng số module-level, để service layer của
module `planning` (`app/modules/planning/services.py`) có thể truyền dữ liệu
đọc từ DB (orders, inventory_snapshot) vào.

Các tham số cấu trúc (thời gian xử lý, công suất máy, chi phí, changeover...)
giữ nguyên giá trị mặc định như prototype gốc — vẫn là hằng số nghiệp vụ đã
được kiểm chứng, không phải dữ liệu người dùng nhập hàng ngày qua Master Data
(TODO tuần 5-6: đưa các hằng số này vào CRUD `machines`/sản phẩm khi cần).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ortools.sat.python import cp_model


@dataclass
class AggregatePlanningInput:
    types: list[str] = field(default_factory=lambda: ["A", "B", "C"])
    days: list[int] = field(default_factory=lambda: list(range(1, 11)))

    cast_time: dict[str, int] = field(default_factory=lambda: {"A": 2, "B": 3, "C": 4})
    cnc_time: dict[str, int] = field(default_factory=lambda: {"A": 1, "B": 2, "C": 3})

    n_machines_per_stage: int = 2
    cast_cap_per_day: int = 2 * 3 * 34  # 204
    cnc_cap_per_day: int = 2 * 3 * 27  # 162

    changeover_reserve: dict[str, int] = field(default_factory=lambda: {"cast": 3, "cnc": 2})
    setup_cast_time: dict[str, int] = field(default_factory=lambda: {"A": 6, "B": 8, "C": 10})
    setup_cnc_time: dict[str, int] = field(default_factory=lambda: {"A": 4, "B": 6, "C": 8})
    min_batch: dict[str, int] = field(default_factory=lambda: {"A": 15, "B": 15, "C": 10})

    # Tồn kho đầu kỳ + ngưỡng an toàn -- lấy từ `inventory_snapshot` (Master Data).
    wip_init: dict[str, int] = field(default_factory=lambda: {"A": 25, "B": 20, "C": 12})
    fg_init: dict[str, int] = field(default_factory=lambda: {"A": 35, "B": 28, "C": 18})
    wip_min: dict[str, int] = field(default_factory=lambda: {"A": 20, "B": 15, "C": 10})
    fg_min: dict[str, int] = field(default_factory=lambda: {"A": 30, "B": 25, "C": 15})

    safety_lead_days: int = 5
    wip_target_end: dict[str, int] = field(default_factory=lambda: {"A": 40, "B": 30, "C": 20})
    fg_target_end: dict[str, int] = field(default_factory=lambda: {"A": 60, "B": 50, "C": 30})

    # Đơn hàng -- lấy từ bảng `orders` (Master Data): (type, due_day, qty)
    orders: list[tuple[str, int, int]] = field(
        default_factory=lambda: [
            ("A", 2, 40), ("A", 5, 35), ("A", 9, 50),
            ("B", 3, 45), ("B", 7, 30), ("B", 10, 40),
            ("C", 4, 25), ("C", 8, 35), ("C", 10, 20),
        ]
    )

    cost_backlog_per_unit_day: int = 20
    cost_safety_breach_per_unit_day: int = 10
    cost_wip_hold_per_unit_day: int = 1
    cost_fg_hold_per_unit_day: int = 2
    cost_setup: dict[str, int] = field(default_factory=lambda: {"A": 15, "B": 20, "C": 25})
    cost_end_shortfall_per_unit: int = 5

    # Ràng buộc công suất riêng của máy duy nhất làm được 1 loại (suy ra từ
    # machine eligibility) -- xem giải thích trong `production_planning_2weeks.py`.
    # list[(stage, type, per_machine_cap)]
    single_machine_caps: list[tuple[str, str, int]] = field(
        default_factory=lambda: [("cast", "C", 204 // 2), ("cnc", "B", 162 // 2)]
    )

    horizon_qty: int = 300
    max_time_in_seconds: float = 120
    num_search_workers: int = 1
    random_seed: int = 42


def _planned_due_day(dd: int, days: list[int], safety_lead_days: int) -> int:
    shifted = dd - safety_lead_days
    return dd if shifted < days[0] else shifted


def build_and_solve(cfg: AggregatePlanningInput) -> dict:
    model = cp_model.CpModel()

    types, days = cfg.types, cfg.days

    def demand_of(t, d):
        return sum(
            q for (tt, dd, q) in cfg.orders
            if tt == t and _planned_due_day(dd, days, cfg.safety_lead_days) == d
        )

    cast_qty, cnc_qty = {}, {}
    wip_inv, fg_inv, backlog = {}, {}, {}
    produce_cast, produce_cnc = {}, {}
    setup_cast, setup_cnc = {}, {}
    shipped = {}

    for t in types:
        for d in days:
            cast_qty[t, d] = model.NewIntVar(0, cfg.horizon_qty, f"cast_{t}_{d}")
            cnc_qty[t, d] = model.NewIntVar(0, cfg.horizon_qty, f"cnc_{t}_{d}")
            wip_inv[t, d] = model.NewIntVar(0, cfg.horizon_qty, f"wip_{t}_{d}")
            fg_inv[t, d] = model.NewIntVar(0, cfg.horizon_qty, f"fg_{t}_{d}")
            backlog[t, d] = model.NewIntVar(0, cfg.horizon_qty, f"backlog_{t}_{d}")
            shipped[t, d] = model.NewIntVar(0, cfg.horizon_qty, f"shipped_{t}_{d}")
            produce_cast[t, d] = model.NewBoolVar(f"pcast_{t}_{d}")
            produce_cnc[t, d] = model.NewBoolVar(f"pcnc_{t}_{d}")
            setup_cast[t, d] = model.NewBoolVar(f"scast_{t}_{d}")
            setup_cnc[t, d] = model.NewBoolVar(f"scnc_{t}_{d}")

    for t in types:
        for d in days:
            model.Add(cast_qty[t, d] == 0).OnlyEnforceIf(produce_cast[t, d].Not())
            model.Add(cast_qty[t, d] >= cfg.min_batch[t]).OnlyEnforceIf(produce_cast[t, d])
            model.Add(cnc_qty[t, d] == 0).OnlyEnforceIf(produce_cnc[t, d].Not())
            model.Add(cnc_qty[t, d] >= cfg.min_batch[t]).OnlyEnforceIf(produce_cnc[t, d])

            prev_cast = produce_cast[t, d - 1] if d > days[0] else None
            prev_cnc = produce_cnc[t, d - 1] if d > days[0] else None
            if prev_cast is None:
                model.Add(setup_cast[t, d] == produce_cast[t, d])
                model.Add(setup_cnc[t, d] == produce_cnc[t, d])
            else:
                model.Add(setup_cast[t, d] <= produce_cast[t, d])
                model.Add(setup_cast[t, d] <= 1 - prev_cast)
                model.Add(setup_cast[t, d] >= produce_cast[t, d] - prev_cast)
                model.Add(setup_cnc[t, d] <= produce_cnc[t, d])
                model.Add(setup_cnc[t, d] <= 1 - prev_cnc)
                model.Add(setup_cnc[t, d] >= produce_cnc[t, d] - prev_cnc)

    for t in types:
        for d in days:
            prev_wip = cfg.wip_init[t] if d == days[0] else wip_inv[t, d - 1]
            model.Add(wip_inv[t, d] == prev_wip + cast_qty[t, d] - cnc_qty[t, d])
            model.Add(cnc_qty[t, d] <= prev_wip)

    for t in types:
        for d in days:
            prev_fg = cfg.fg_init[t] if d == days[0] else fg_inv[t, d - 1]
            prev_backlog = 0 if d == days[0] else backlog[t, d - 1]
            dem = demand_of(t, d)
            model.Add(shipped[t, d] <= prev_fg + cnc_qty[t, d])
            model.Add(fg_inv[t, d] == prev_fg + cnc_qty[t, d] - shipped[t, d])
            model.Add(backlog[t, d] == prev_backlog + dem - shipped[t, d])

    wip_shortfall, fg_shortfall = {}, {}
    for t in types:
        for d in days:
            ws = model.NewIntVar(0, cfg.horizon_qty, f"wip_short_{t}_{d}")
            fs = model.NewIntVar(0, cfg.horizon_qty, f"fg_short_{t}_{d}")
            model.AddMaxEquality(ws, [cfg.wip_min[t] - wip_inv[t, d], 0])
            model.AddMaxEquality(fs, [cfg.fg_min[t] - fg_inv[t, d], 0])
            wip_shortfall[t, d] = ws
            fg_shortfall[t, d] = fs

    end_wip_shortfall, end_fg_shortfall = {}, {}
    last_day = days[-1]
    for t in types:
        ews = model.NewIntVar(0, cfg.horizon_qty, f"end_wip_short_{t}")
        efs = model.NewIntVar(0, cfg.horizon_qty, f"end_fg_short_{t}")
        model.AddMaxEquality(ews, [cfg.wip_target_end[t] - wip_inv[t, last_day], 0])
        model.AddMaxEquality(efs, [cfg.fg_target_end[t] - fg_inv[t, last_day], 0])
        end_wip_shortfall[t] = ews
        end_fg_shortfall[t] = efs

    for d in days:
        extra_cast = sum(produce_cast[t, d] for t in types) - 1
        extra_cnc = sum(produce_cnc[t, d] for t in types) - 1

        model.Add(
            sum(cfg.cast_time[t] * cast_qty[t, d] + cfg.setup_cast_time[t] * setup_cast[t, d] for t in types)
            + cfg.changeover_reserve["cast"] * extra_cast
            <= cfg.cast_cap_per_day
        )
        model.Add(
            sum(cfg.cnc_time[t] * cnc_qty[t, d] + cfg.setup_cnc_time[t] * setup_cnc[t, d] for t in types)
            + cfg.changeover_reserve["cnc"] * extra_cnc
            <= cfg.cnc_cap_per_day
        )

        for stage, t, per_machine_cap in cfg.single_machine_caps:
            qty_var = cast_qty[t, d] if stage == "cast" else cnc_qty[t, d]
            unit_time = cfg.cast_time[t] if stage == "cast" else cfg.cnc_time[t]
            model.Add(unit_time * qty_var <= per_machine_cap)

    cost_backlog = sum(cfg.cost_backlog_per_unit_day * backlog[t, d] for t in types for d in days)
    cost_safety = sum(
        cfg.cost_safety_breach_per_unit_day * (wip_shortfall[t, d] + fg_shortfall[t, d])
        for t in types for d in days
    )
    cost_hold = sum(
        cfg.cost_wip_hold_per_unit_day * wip_inv[t, d] + cfg.cost_fg_hold_per_unit_day * fg_inv[t, d]
        for t in types for d in days
    )
    cost_setup = sum(cfg.cost_setup[t] * (setup_cast[t, d] + setup_cnc[t, d]) for t in types for d in days)
    cost_end_shortfall = sum(
        cfg.cost_end_shortfall_per_unit * (end_wip_shortfall[t] + end_fg_shortfall[t]) for t in types
    )

    model.Minimize(cost_backlog + cost_safety + cost_hold + cost_setup + cost_end_shortfall)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = cfg.max_time_in_seconds
    solver.parameters.num_search_workers = cfg.num_search_workers
    solver.parameters.random_seed = cfg.random_seed
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"Tang 1 (aggregate planning) khong giai duoc: status={solver.StatusName(status)}")

    def val(x):
        return solver.Value(x)

    result = {
        "status": solver.StatusName(status),
        "cost_backlog": val(cost_backlog),
        "cost_safety": val(cost_safety),
        "cost_hold": val(cost_hold),
        "cost_setup": val(cost_setup),
        "cost_end_shortfall": val(cost_end_shortfall),
        "plan": {},
    }
    for t in types:
        for d in days:
            result["plan"][f"{t}|{d}"] = {
                "type": t,
                "day": d,
                "cast": val(cast_qty[t, d]),
                "cnc": val(cnc_qty[t, d]),
                "wip": val(wip_inv[t, d]),
                "fg": val(fg_inv[t, d]),
                "backlog": val(backlog[t, d]),
                "shipped": val(shipped[t, d]),
                "wip_short": val(wip_shortfall[t, d]),
                "fg_short": val(fg_shortfall[t, d]),
            }
    result["end_wip_shortfall"] = {t: val(end_wip_shortfall[t]) for t in types}
    result["end_fg_shortfall"] = {t: val(end_fg_shortfall[t]) for t in types}
    return result
