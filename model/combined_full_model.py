"""THI NGHIEM: gop Tang 1 (aggregate planning) va Tang 2 (detailed
scheduling) thanh MOT model CP-SAT duy nhat.

Dong co: kien truc 2 tang la mot phep THU HEP KHONG GIAN TIM KIEM. Tang 1
chot cast_qty/cnc_qty moi ngay ma khong biet ngan sach ca, machine
eligibility hay changeover that cua Tang 2 -- nen no co the chot sai so
luong/ngay ma khong co cach nao biet. Gan nhu moi van de da xu ly trong
phien nay deu bat nguon tu day:
  - 183/200 don vi thoi gian ranh la do Tang 1 chia lo theo ngay ma "mu"
    ve ngan sach 1 ca;
  - phai DO TAY tham so SAFETY_LEAD_DAYS (meo dich due date) vi khong co
    kenh phan hoi truc tiep tu Tang 2 len Tang 1.

Model gop KHONG CAN SAFETY_LEAD_DAYS: no dung dung due date that, va tu
can bang "san xuat som thi ton chi phi luu kho" voi "san xuat tre thi co
nguy co phai mo them ca" trong CUNG mot ham muc tieu.

KHONG sua file nao cua he thong 2 tang -- chi import hang so tu chung de
khong bi lech pha. Phan rang buoc lap lich duoi day phan chieu dung logic
cua detailed_shift_continuous.schedule_stage_continuous(), chi khac o cho
`day_plan` gio la BIEN quyet dinh chu khong phai tham so co dinh.

Chay: python combined_full_model.py
"""

import json
import math
import time
from pathlib import Path

from ortools.sat.python import cp_model

import production_planning_2weeks as agg
import detailed_shift_continuous as dsc

DASHBOARD_DIR = Path(__file__).resolve().parent.parent / "dashboard"

# --- Hang so: import truc tiep, khong dinh nghia lai ---
TYPES = agg.TYPES
DAYS = agg.DAYS
CAST_TIME = agg.CAST_TIME
CNC_TIME = agg.CNC_TIME
UNIT_TIME = {"cast": CAST_TIME, "cnc": CNC_TIME}

MACHINES = dsc.MACHINES
ELIGIBLE = dsc.ELIGIBLE
SHIFT_BUDGET = dsc.SHIFT_BUDGET
LOT_MAX = dsc.LOT_MAX
MIN_BATCH_SHIFT = dsc.MIN_BATCH_SHIFT
N_SHIFTS = dsc.N_SHIFTS
setup_time = dsc.setup_time

WIP_INIT, FG_INIT = agg.WIP_INIT, agg.FG_INIT
WIP_MIN, FG_MIN = agg.WIP_MIN, agg.FG_MIN
WIP_TARGET_END, FG_TARGET_END = agg.WIP_TARGET_END, agg.FG_TARGET_END
ORDERS = agg.ORDERS

COST_BACKLOG = agg.COST_BACKLOG_PER_UNIT_DAY
COST_SAFETY = agg.COST_SAFETY_BREACH_PER_UNIT_DAY
COST_WIP_HOLD = agg.COST_WIP_HOLD_PER_UNIT_DAY
COST_FG_HOLD = agg.COST_FG_HOLD_PER_UNIT_DAY
COST_END_SHORTFALL = agg.COST_END_SHORTFALL_PER_UNIT
SHIFT_ACTIVATION_COST = dsc.SHIFT_ACTIVATION_COST
BATCH_COUNT_COST = dsc.BATCH_COUNT_COST
OVERTIME_COST = dsc.OVERTIME_COST

HORIZON_QTY = agg.HORIZON_QTY

# Tran san luong 1 loai trong 1 ngay 1 cong doan. Day la HAN CHE MO HINH HOA
# de model giai duoc, khong phai rang buoc nghiep vu: so o (slot) phai khai
# bao truoc khi giai, ma so o = ceil(tran / LOT_MAX) + 1. Neu de tran theo
# dung nang luc may (VD CNC loai A: 2 may x 3 ca x 27 / 1 = 162 don vi ->
# 9 o) thi model no ra ~350 job node va khong the giai noi.
# DA KIEM CHUNG tran nay khong bop meo ket qua: chay lai voi 80 va 100 deu
# cho y het 63 ca / 82 don vi idle, va gia tri lon nhat ma loi giai thuc su
# dung chi la 60 (voi tran 80) / 52 (voi tran 100) -- tuc tran khong binding.
MAX_DAILY_QTY = 80


def demand_of(t, d):
    """Cau theo DUE DATE THAT -- khong dich ngay, khong SAFETY_LEAD_DAYS."""
    return sum(q for (tt, dd, q) in ORDERS if tt == t and dd == d)


def qty_upper_bound(stage, t):
    """Tran tren an toan cho so luong 1 loai trong 1 ngay 1 cong doan."""
    budget = SHIFT_BUDGET[stage]
    n_elig = len([m for m in MACHINES[stage] if t in ELIGIBLE[stage, m]])
    by_capacity = n_elig * N_SHIFTS * budget // UNIT_TIME[stage][t]
    return min(by_capacity, MAX_DAILY_QTY)


def build_and_solve(max_seconds=300, workers=1, seed=42, log=False, enforce_service=False):
    """enforce_service=True: ep MUC DICH VU bang dung pipeline 2 tang tot nhat
    (khong tre giao, khong thung nguong an toan, dat du muc tieu ton kho cuoi
    ky). Can thiet de SO SANH CONG BANG.

    Ly do: 2 tang chua bao gio toi uu so ca CUNG LUC voi ton kho -- Tang 1
    quyet dinh san luong khi chua he biet den chi phi kich hoat ca, Tang 2 chi
    toi thieu so ca VOI san luong da chot san. Model gop thi thay ca hai, va
    vi 1 ca ton 200 trong khi tre giao chi ton 20/don vi/ngay, no se san sang
    BO GIAO HANG de khoi mo them ca. Do la loi giai dung theo bo trong so hien
    tai, nhung khong cung mot muc dich vu -> khong the doi chieu truc tiep."""
    model = cp_model.CpModel()

    # =====================================================================
    # PHAN A -- Ton kho (logic y het Tang 1, nhung dung due date THAT)
    # =====================================================================
    cast_qty, cnc_qty = {}, {}
    wip_inv, fg_inv, backlog, shipped = {}, {}, {}, {}

    for t in TYPES:
        for d in DAYS:
            cast_qty[t, d] = model.NewIntVar(0, qty_upper_bound("cast", t), f"cast_{t}_{d}")
            cnc_qty[t, d] = model.NewIntVar(0, qty_upper_bound("cnc", t), f"cnc_{t}_{d}")
            wip_inv[t, d] = model.NewIntVar(0, HORIZON_QTY, f"wip_{t}_{d}")
            fg_inv[t, d] = model.NewIntVar(0, HORIZON_QTY, f"fg_{t}_{d}")
            backlog[t, d] = model.NewIntVar(0, HORIZON_QTY, f"backlog_{t}_{d}")
            shipped[t, d] = model.NewIntVar(0, HORIZON_QTY, f"shipped_{t}_{d}")

    for t in TYPES:
        for d in DAYS:
            prev_wip = WIP_INIT[t] if d == 1 else wip_inv[t, d - 1]
            prev_fg = FG_INIT[t] if d == 1 else fg_inv[t, d - 1]
            prev_backlog = 0 if d == 1 else backlog[t, d - 1]

            model.Add(wip_inv[t, d] == prev_wip + cast_qty[t, d] - cnc_qty[t, d])
            # CNC chi dung phoi DA CO TU TRUOC (giu nguyen rang buoc vat ly da
            # them o Tang 1) -- nho do cast va cnc cung ngay van duoc xep doc
            # lap tren truc thoi gian ma ket qua van kha thi.
            model.Add(cnc_qty[t, d] <= prev_wip)

            model.Add(shipped[t, d] <= prev_fg + cnc_qty[t, d])
            model.Add(fg_inv[t, d] == prev_fg + cnc_qty[t, d] - shipped[t, d])
            model.Add(backlog[t, d] == prev_backlog + demand_of(t, d) - shipped[t, d])

    wip_short, fg_short = {}, {}
    for t in TYPES:
        for d in DAYS:
            ws = model.NewIntVar(0, HORIZON_QTY, f"wshort_{t}_{d}")
            fs = model.NewIntVar(0, HORIZON_QTY, f"fshort_{t}_{d}")
            model.AddMaxEquality(ws, [WIP_MIN[t] - wip_inv[t, d], 0])
            model.AddMaxEquality(fs, [FG_MIN[t] - fg_inv[t, d], 0])
            wip_short[t, d], fg_short[t, d] = ws, fs

    end_wip_short, end_fg_short = {}, {}
    last = DAYS[-1]
    for t in TYPES:
        ews = model.NewIntVar(0, HORIZON_QTY, f"ewshort_{t}")
        efs = model.NewIntVar(0, HORIZON_QTY, f"efshort_{t}")
        model.AddMaxEquality(ews, [WIP_TARGET_END[t] - wip_inv[t, last], 0])
        model.AddMaxEquality(efs, [FG_TARGET_END[t] - fg_inv[t, last], 0])
        end_wip_short[t], end_fg_short[t] = ews, efs

    if enforce_service:
        for t in TYPES:
            model.Add(end_wip_short[t] == 0)
            model.Add(end_fg_short[t] == 0)
            for d in DAYS:
                model.Add(backlog[t, d] == 0)
                model.Add(wip_short[t, d] == 0)
                model.Add(fg_short[t, d] == 0)

    # =====================================================================
    # PHAN B -- Lap lich chi tiet (logic y het Tang 2), cho MOI (ngay, stage)
    # =====================================================================
    all_present, all_nshifts, all_overtime = [], [], []
    lot_info = {}      # (d, stage) -> danh sach (name, t, size_var, start, end)
    assign_lit = {}    # (d, stage, m) -> {name: literal assigned[name, m]}
    nshift_var = {}    # (d, stage, m) -> bien n

    for d in DAYS:
        for stage in ("cast", "cnc"):
            budget = SHIFT_BUDGET[stage]
            full_day = N_SHIFTS * budget
            unit_time = UNIT_TIME[stage]
            qty_of = cast_qty if stage == "cast" else cnc_qty

            # Truc thoi gian 1 may: toi da 3 ca + mot chut tang ca. Tran nay
            # AN TOAN o day (khac voi Tang 2 tach roi): san luong gio la bien,
            # nen tran chat chi HAN CHE chu khong bao gio gay INFEASIBLE.
            horizon = full_day + 2 * budget
            max_shifts = math.ceil(horizon / budget)

            names, size, present = [], {}, {}
            start, end, dur, job_type = {}, {}, {}, {}

            for t in TYPES:
                ub = qty_upper_bound(stage, t)
                n_slots = dsc.slots_needed(ub)
                slot_sizes = []
                for k in range(n_slots):
                    name = f"{t}-{stage}-{d}-{k}"
                    sz = model.NewIntVar(0, min(ub, LOT_MAX), f"size_{name}")
                    pr = model.NewBoolVar(f"present_{name}")
                    model.Add(sz >= MIN_BATCH_SHIFT[t]).OnlyEnforceIf(pr)
                    model.Add(sz == 0).OnlyEnforceIf(pr.Not())
                    size[name], present[name] = sz, pr
                    slot_sizes.append(sz)
                    if k > 0:
                        prev = f"{t}-{stage}-{d}-{k-1}"
                        model.Add(present[prev] >= pr)
                        model.Add(size[prev] >= size[name])  # pha doi xung
                    names.append(name)
                    job_type[name] = t

                    du = model.NewIntVar(0, horizon, f"dur_{name}")
                    model.Add(du == sz * unit_time[t])
                    s = model.NewIntVar(0, horizon, f"s_{name}")
                    e = model.NewIntVar(0, horizon, f"e_{name}")
                    model.Add(e == s + du)
                    model.Add(s == 0).OnlyEnforceIf(pr.Not())
                    start[name], end[name], dur[name] = s, e, du

                # DAY LA CHO 2 TANG DUOC NOI LIEN: san luong ngay = tong cac lo
                model.Add(sum(slot_sizes) == qty_of[t, d])

            all_present.extend(present[n] for n in names)
            lot_info[d, stage] = [(n, job_type[n], size[n], start[n], end[n]) for n in names]

            # --- Gan lo cho may (ton trong eligibility) ---
            assigned = {}
            for name in names:
                t = job_type[name]
                elig = [m for m in MACHINES[stage] if t in ELIGIBLE[stage, m]]
                lits = []
                for m in elig:
                    lit = model.NewBoolVar(f"assign_{name}_{m}")
                    assigned[name, m] = lit
                    lits.append(lit)
                model.Add(sum(lits) == present[name])

            # --- Thu tu tren tung may: AddCircuit + changeover + left-packing ---
            for m in MACHINES[stage]:
                elig_names = [n for n in names if (n, m) in assigned]
                assign_lit[d, stage, m] = {n: assigned[n, m] for n in elig_names}
                DEPOT = 0
                idx = {n: i + 1 for i, n in enumerate(elig_names)}
                arcs = []
                for n in elig_names:
                    arcs.append((idx[n], idx[n], assigned[n, m].Not()))
                for n in elig_names:
                    d0 = model.NewBoolVar(f"d0_{d}_{m}_{n}")
                    arcs.append((DEPOT, idx[n], d0))
                    model.Add(start[n] == 0).OnlyEnforceIf(d0)
                    arcs.append((idx[n], DEPOT, model.NewBoolVar(f"d1_{d}_{m}_{n}")))
                arcs.append((DEPOT, DEPOT, model.NewBoolVar(f"dloop_{d}_{stage}_{m}")))
                for i_n in elig_names:
                    for k_n in elig_names:
                        if i_n == k_n:
                            continue
                        lit = model.NewBoolVar(f"seq_{d}_{m}_{i_n}_{k_n}")
                        arcs.append((idx[i_n], idx[k_n], lit))
                        su = setup_time(stage, job_type[i_n], job_type[k_n])
                        model.Add(start[k_n] == end[i_n] + su).OnlyEnforceIf(lit)
                model.AddCircuit(arcs)

                # --- So ca kich hoat + tang ca ---
                end_m = model.NewIntVar(0, horizon, f"endm_{d}_{stage}_{m}")
                contribs = []
                for n in elig_names:
                    c = model.NewIntVar(0, horizon, f"contrib_{d}_{m}_{n}")
                    model.Add(c == end[n]).OnlyEnforceIf(assigned[n, m])
                    model.Add(c == 0).OnlyEnforceIf(assigned[n, m].Not())
                    contribs.append(c)
                model.AddMaxEquality(end_m, contribs + [0])

                nv = model.NewIntVar(0, max_shifts, f"nshifts_{d}_{stage}_{m}")
                model.Add(budget * nv >= end_m)
                nshift_var[d, stage, m] = nv
                all_nshifts.append(nv)

                ot = model.NewIntVar(0, horizon, f"ot_{d}_{stage}_{m}")
                model.AddMaxEquality(ot, [end_m - full_day, 0])
                all_overtime.append(ot)

                # CUT theo may: loai chi may nay lam duoc -> n >= khoi luong/budget
                forced = [t for t in TYPES
                          if [mm for mm in MACHINES[stage] if t in ELIGIBLE[stage, mm]] == [m]]
                if forced:
                    model.Add(budget * nv >= sum(unit_time[t] * qty_of[t, d] for t in forced))

            # CUT toan stage: budget * tong so ca >= tong khoi luong ngay do.
            # Hop le vi budget*n_m >= end_m >= khoi luong tren may m. O model
            # gop, khoi luong la BIEN nen day van la rang buoc tuyen tinh.
            model.Add(
                budget * sum(nshift_var[d, stage, m] for m in MACHINES[stage])
                >= sum(unit_time[t] * qty_of[t, d] for t in TYPES)
            )

    # =====================================================================
    # PHAN C -- Mot ham muc tieu duy nhat cho ca 2 tang
    # =====================================================================
    cost_backlog = COST_BACKLOG * sum(backlog[t, d] for t in TYPES for d in DAYS)
    cost_safety = COST_SAFETY * sum(wip_short[t, d] + fg_short[t, d] for t in TYPES for d in DAYS)
    cost_hold = sum(COST_WIP_HOLD * wip_inv[t, d] + COST_FG_HOLD * fg_inv[t, d]
                    for t in TYPES for d in DAYS)
    cost_end = COST_END_SHORTFALL * sum(end_wip_short[t] + end_fg_short[t] for t in TYPES)
    cost_shift = SHIFT_ACTIVATION_COST * sum(all_nshifts)
    cost_batch = BATCH_COUNT_COST * sum(all_present)
    cost_overtime = OVERTIME_COST * sum(all_overtime)

    model.Minimize(cost_backlog + cost_safety + cost_hold + cost_end
                   + cost_shift + cost_batch + cost_overtime)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_seconds
    solver.parameters.num_search_workers = workers
    solver.parameters.random_seed = seed
    solver.parameters.log_search_progress = log

    t0 = time.time()
    status = solver.Solve(model)
    elapsed = time.time() - t0
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"Model gop khong giai duoc: {solver.StatusName(status)}")

    V = solver.Value

    # --- Dong goi ket qua theo DUNG schema cua dashboard_cont_data.json ---
    detailed = {}
    total_idle = total_shifts = 0
    overloads = []
    for d in DAYS:
        day_data = {}
        for stage in ("cast", "cnc"):
            budget = SHIFT_BUDGET[stage]
            full_day = N_SHIFTS * budget
            by_name = {n: (t, sz, s, e) for (n, t, sz, s, e) in lot_info[d, stage]}
            for m in MACHINES[stage]:
                lots = []
                for n, lit in assign_lit[d, stage, m].items():
                    if not V(lit):          # lo khong duoc gan cho may nay
                        continue
                    t, sz, s, e = by_name[n]
                    if V(sz) == 0:
                        continue
                    lots.append({"job": n, "type": t, "start": V(s), "end": V(e)})
                lots.sort(key=lambda x: x["start"])
                work = sum(lo["end"] - lo["start"] for lo in lots)
                end_t = max((lo["end"] for lo in lots), default=0)
                n_sh = V(nshift_var[d, stage, m])
                day_data[m] = {"stage": stage, "lots": lots, "work": work, "end": end_t,
                               "budget": budget, "n_shifts": n_sh,
                               "idle": max(0, n_sh * budget - work)}
                total_idle += max(0, n_sh * budget - work)
                total_shifts += n_sh
                if end_t > full_day:
                    overloads.append({"day": d, "machine": m, "stage": stage,
                                      "need": end_t, "budget": full_day,
                                      "over": end_t - full_day})
        detailed[str(d)] = day_data

    plan = {}
    for t in TYPES:
        for d in DAYS:
            plan[f"{t}|{d}"] = {
                "cast": V(cast_qty[t, d]), "cnc": V(cnc_qty[t, d]),
                "wip": V(wip_inv[t, d]), "fg": V(fg_inv[t, d]),
                "backlog": V(backlog[t, d]), "shipped": V(shipped[t, d]),
                "wip_short": V(wip_short[t, d]), "fg_short": V(fg_short[t, d]),
            }

    return {
        "status": solver.StatusName(status),
        "objective": solver.ObjectiveValue(),
        "best_bound": solver.BestObjectiveBound(),
        "elapsed": elapsed,
        "costs": {
            "backlog": V(cost_backlog), "safety": V(cost_safety), "hold": V(cost_hold),
            "end_shortfall": V(cost_end), "shift": V(cost_shift),
            "batch": V(cost_batch), "overtime": V(cost_overtime),
        },
        "types": TYPES, "days": DAYS, "n_shifts_max": N_SHIFTS,
        "wip_min": WIP_MIN, "fg_min": FG_MIN,
        "wip_target_end": WIP_TARGET_END, "fg_target_end": FG_TARGET_END,
        "safety_lead_days": 0, "shift_budget": SHIFT_BUDGET, "lot_max": LOT_MAX,
        "machines": MACHINES,
        "aggregate": {"status": solver.StatusName(status), "plan": plan,
                      "cost_backlog": V(cost_backlog), "cost_safety": V(cost_safety),
                      "cost_hold": V(cost_hold), "cost_setup": 0,
                      "cost_end_shortfall": V(cost_end)},
        "detailed_cont": detailed,
        "overloads": overloads,
        "shift_usage": {"on": total_shifts,
                        "total": len(DAYS) * sum(len(v) for v in MACHINES.values()) * N_SHIFTS},
        "total_idle": total_idle,
        "max_daily_qty_used": max(
            max(V(cast_qty[t, d]) for t in TYPES for d in DAYS),
            max(V(cnc_qty[t, d]) for t in TYPES for d in DAYS),
        ),
    }


if __name__ == "__main__":
    import sys

    secs = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    wk = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    res = build_and_solve(max_seconds=secs, workers=wk)
    gap = ""
    if res["status"] != "OPTIMAL" and res["objective"]:
        gap = f"  (bound={res['best_bound']:.0f}, gap={100*(res['objective']-res['best_bound'])/res['objective']:.1f}%)"
    print(f"status={res['status']}  {res['elapsed']:.1f}s  obj={res['objective']:.0f}{gap}")
    print("chi phi:", res["costs"])
    print(f"idle={res['total_idle']}  ca={res['shift_usage']['on']}/{res['shift_usage']['total']}"
          f"  tang ca={len(res['overloads'])}  qty/ngay lon nhat={res['max_daily_qty_used']}"
          f" (tran {MAX_DAILY_QTY})")
    with open(DASHBOARD_DIR / "combined_model_result.json", "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False)
    print("Da ghi", DASHBOARD_DIR / "combined_model_result.json")
