"""Chay model gop (combined_full_model.py) o cau hinh "dich vu bang" va ghi
du lieu thang vao dashboard_combined.html.

KHONG dung den dashboard.html cua ban 2 tang.

Chay: python export_combined_dashboard.py [giay] [so_worker]
  mac dinh: 400 giay, 8 worker -- dung cau hinh da cho ket qua tot nhat o
  thi nghiem doi chung (63 ca, 82 don vi ranh, 0 tang ca).
"""

import json
import math
import re
import sys
from pathlib import Path

import production_planning_2weeks as agg
import detailed_shift_continuous as dsc
import combined_full_model as cm
import compare_combined_vs_twotier as cmp_mod

DASHBOARD_DIR = Path(__file__).resolve().parent.parent / "dashboard"
DASHBOARD = DASHBOARD_DIR / "dashboard_combined.html"
JSON_OUT = DASHBOARD_DIR / "combined_dashboard_data.json"

# So lieu doi chung cua pipeline 2 tang -- lay tu thi nghiem da chay
# (compare_combined_vs_twotier.py), ca hai deu OPTIMAL nen tai lap duoc.
TWO_TIER_BASELINE = [
    {"name": "2 tầng · LEAD=4", "cost": 18072, "shifts": 70, "idle": 292,
     "overtime": 0, "overtime_units": 0, "seconds": 83, "status": "OPTIMAL",
     "gap_pct": 0.0, "highlight": False},
    {"name": "2 tầng · LEAD=5", "cost": 17251, "shifts": 66, "idle": 177,
     "overtime": 1, "overtime_units": 3, "seconds": 67, "status": "OPTIMAL",
     "gap_pct": 0.0, "highlight": False},
]


def main():
    secs = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 8

    print(f"Dang giai model gop ({workers} worker, toi da {secs}s) ...", flush=True)
    res = cm.build_and_solve(max_seconds=secs, workers=workers, enforce_service=True)

    gap_pct = None
    if res["status"] != "OPTIMAL":
        gap_pct = 100 * (res["objective"] - res["best_bound"]) / max(1, abs(res["objective"]))

    # --- Can duoi thoi gian ranh, tinh y het ban 2 tang de so sanh duoc ---
    lb_shifts = lb_idle = 0
    work_by_stage = {"cast": 0, "cnc": 0}
    for d in agg.DAYS:
        for stage in ("cast", "cnc"):
            budget = dsc.SHIFT_BUDGET[stage]
            w = sum(i["work"] for i in res["detailed_cont"][str(d)].values()
                    if i["stage"] == stage)
            work_by_stage[stage] += w
            if w:
                lb_shifts += math.ceil(w / budget)
                lb_idle += math.ceil(w / budget) * budget - w

    lb_shifts_global = lb_idle_global = 0
    for stage in ("cast", "cnc"):
        budget = dsc.SHIFT_BUDGET[stage]
        w = work_by_stage[stage]
        if w:
            lb_shifts_global += math.ceil(w / budget)
            lb_idle_global += math.ceil(w / budget) * budget - w

    res["benchmarks"] = {
        "lb_shifts_given_plan": lb_shifts, "lb_idle_given_plan": lb_idle,
        "lb_shifts_global": lb_shifts_global, "lb_idle_global": lb_idle_global,
        "gap_shifts": res["shift_usage"]["on"] - lb_shifts,
        "total_work": work_by_stage,
    }

    # --- Cham diem bang DUNG thuoc do chung da dung o thi nghiem doi chung ---
    score = cmp_mod.score(res)
    res["unified_cost"] = {k: v for k, v in score.items() if not k.startswith("_")}
    res["solve"] = {"seconds": res["elapsed"], "gap_pct": gap_pct,
                    "objective": res["objective"], "best_bound": res["best_bound"],
                    "workers": workers}

    res["comparison"] = TWO_TIER_BASELINE + [{
        "name": "Model gộp (bản này)", "cost": score["TOTAL"],
        "shifts": res["shift_usage"]["on"], "idle": res["total_idle"],
        "overtime": len(res["overloads"]),
        "overtime_units": sum(o["over"] for o in res["overloads"]),
        "seconds": round(res["elapsed"]),
        "status": res["status"] if gap_pct is None else f"{res['status']} · gap {gap_pct:.1f}%",
        "gap_pct": gap_pct or 0.0, "highlight": True,
    }]

    # --- Kiem tra hop le vat ly truoc khi cong bo ---
    problems = cmp_mod.verify(res)
    hard = [p for p in problems if not p.startswith("[chua chat]")]
    print(f"Kiem tra hop le: {'DAT' if not hard else str(len(hard)) + ' VAN DE'}")
    for p in problems[:6]:
        print("   -", p)
    if hard:
        raise RuntimeError("Loi giai khong hop le ve vat ly, khong xuat dashboard.")

    res.pop("costs", None)
    payload = json.dumps(res, ensure_ascii=False)

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        f.write(payload)

    with open(DASHBOARD, encoding="utf-8") as f:
        html = f.read()
    safe = payload.replace("</", "<\\/")
    html, n = re.subn(r"^const DATA = .*;$", lambda _: f"const DATA = {safe};",
                      html, count=1, flags=re.MULTILINE)
    if n != 1:
        raise RuntimeError(f"Khong tim thay dong 'const DATA = ...;' trong {DASHBOARD}")
    with open(DASHBOARD, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Da ghi {JSON_OUT} va nhung vao {DASHBOARD}")
    print(f"  status={res['status']}" + (f" (gap {gap_pct:.1f}%)" if gap_pct else ""))
    print(f"  chi phi (thuoc do chung)={score['TOTAL']}  ca={res['shift_usage']['on']}"
          f"  idle={res['total_idle']}  tang ca={len(res['overloads'])}"
          f"  thoi gian={res['elapsed']:.0f}s")
    print(f"  qty/ngay lon nhat={res['max_daily_qty_used']} (tran {cm.MAX_DAILY_QTY})")


if __name__ == "__main__":
    main()
