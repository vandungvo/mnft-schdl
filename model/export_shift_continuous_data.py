"""Export phuong an 'noi ca' (continuous) cho dashboard -- Gantt lien tuc
co gach chia ranh gioi ca.

Script nay GHI THANG vao dashboard.html (thay the bien `const DATA = {...}`),
khong con buoc dan tay bang script rieng nua -- truoc day dashboard.html va
dashboard_cont_data.json la hai nguon du lieu doc lap, khong co gi dam bao
chung dong bo, va trong kho co san 3 file JSON cua 3 the he model khac nhau
rat de dan nham.

Chay: python export_shift_continuous_data.py
"""

import json
import math
import re
from pathlib import Path

import production_planning_2weeks as agg
import detailed_shift_continuous as dsc

DASHBOARD_DIR = Path(__file__).resolve().parent.parent / "dashboard"
DASHBOARD = DASHBOARD_DIR / "dashboard.html"
JSON_OUT = DASHBOARD_DIR / "dashboard_cont_data.json"

agg_result = agg.build_and_solve()

data = {
    "types": agg.TYPES,
    "days": agg.DAYS,
    "n_shifts_max": dsc.N_SHIFTS,
    "wip_min": agg.WIP_MIN,
    "fg_min": agg.FG_MIN,
    "wip_target_end": agg.WIP_TARGET_END,
    "fg_target_end": agg.FG_TARGET_END,
    "safety_lead_days": agg.SAFETY_LEAD_DAYS,
    "shift_budget": dsc.SHIFT_BUDGET,
    "lot_max": dsc.LOT_MAX,
    "aggregate": {
        "status": agg_result["status"],
        "cost_backlog": agg_result["cost_backlog"],
        "cost_safety": agg_result["cost_safety"],
        "cost_hold": agg_result["cost_hold"],
        "cost_setup": agg_result["cost_setup"],
        "cost_end_shortfall": agg_result["cost_end_shortfall"],
        "plan": {f"{t}|{d}": agg_result["plan"][t, d] for t in agg.TYPES for d in agg.DAYS},
    },
    "machines": dsc.MACHINES,
    "detailed_cont": {},
    "overloads": [],
}

total_idle = 0
total_shifts_on = 0
# Can duoi so ca NEU giu nguyen ke hoach Tang 1 (chi toi uu duoc o Tang 2)
lb_shifts_given_plan = 0
# Tong khoi luong moi stage -- de tinh can duoi TOAN KY (neu Tang 1 duoc phep
# phan bo lai khoi luong giua cac ngay)
total_work_by_stage = {"cast": 0, "cnc": 0}

for day in agg.DAYS:
    cast_plan = {t: agg_result["plan"][t, day]["cast"] for t in agg.TYPES if agg_result["plan"][t, day]["cast"] > 0}
    cnc_plan = {t: agg_result["plan"][t, day]["cnc"] for t in agg.TYPES if agg_result["plan"][t, day]["cnc"] > 0}

    day_data = {}
    for stage, plan in (("cast", cast_plan), ("cnc", cnc_plan)):
        res = dsc.schedule_stage_continuous(stage, plan)
        budget = dsc.SHIFT_BUDGET[stage]
        full_day = dsc.N_SHIFTS * budget

        stage_work = sum(info["work"] for info in res.values())
        total_work_by_stage[stage] += stage_work
        lb_shifts_given_plan += math.ceil(stage_work / budget) if stage_work else 0

        for m, info in res.items():
            lots = [
                {"job": name, "type": info["type_of"][name], "start": s, "end": e}
                for name, (s, e) in info["schedule"].items()
            ]
            lots.sort(key=lambda x: x["start"])
            n_shifts = info["n_shifts"]
            # Kep ve 0: sau khi bo tran n <= 3 thi idle luon >= 0 ve mat toan
            # hoc, nhung giu max() lam luoi an toan de mot ngay QUA TAI khong
            # bao gio co the LAM GIAM con so idle tren dashboard.
            idle = max(0, n_shifts * budget - info["work"])
            day_data[m] = {"stage": stage, "lots": lots, "work": info["work"], "end": info["end"],
                           "budget": budget, "n_shifts": n_shifts, "idle": idle}
            total_idle += idle
            total_shifts_on += n_shifts
            if info["end"] > full_day:
                data["overloads"].append({
                    "day": day, "machine": m, "stage": stage,
                    "need": info["end"], "budget": full_day, "over": info["end"] - full_day,
                })
    data["detailed_cont"][str(day)] = day_data

data["shift_usage"] = {"on": total_shifts_on, "total": len(agg.DAYS) * sum(len(m) for m in dsc.MACHINES.values()) * dsc.N_SHIFTS}
data["total_idle"] = total_idle

# --- Hai moc so sanh, thay cho con so "272" tung viet cung trong dashboard ---
# (a) Can duoi khi GIU NGUYEN ke hoach Tang 1: neu total_idle == moc nay thi
#     Tang 2 da toi uu tuyet doi, khong con gi de vat o khau lap lich.
# (b) Can duoi TOAN KY: neu Tang 1 duoc phep don khoi luong giua cac ngay.
#     Khoang cach giua (a) va (b) chinh la phan lang phi do Tang 1 khong biet
#     ngan sach 1 ca la bao nhieu -- KHONG phai do machine eligibility.
lb_idle_given_plan = 0
for day in agg.DAYS:
    for stage in ("cast", "cnc"):
        budget = dsc.SHIFT_BUDGET[stage]
        w = sum(i["work"] for i in data["detailed_cont"][str(day)].values() if i["stage"] == stage)
        if w:
            lb_idle_given_plan += math.ceil(w / budget) * budget - w

lb_shifts_global = sum(
    math.ceil(total_work_by_stage[s] / dsc.SHIFT_BUDGET[s]) if total_work_by_stage[s] else 0
    for s in ("cast", "cnc")
)
lb_idle_global = sum(
    (math.ceil(total_work_by_stage[s] / dsc.SHIFT_BUDGET[s]) * dsc.SHIFT_BUDGET[s] - total_work_by_stage[s])
    if total_work_by_stage[s] else 0
    for s in ("cast", "cnc")
)

data["benchmarks"] = {
    # Luu y: ca hai can duoi deu BO QUA thoi gian changeover (chi dem khoi
    # luong gia cong thuan). Nen `gap_shifts` == 1 khong co nghia la con toi
    # uu duoc -- vi du Ngay 5 CNC can 4 ca thay vi 3 chinh vi 2 don vi doi do
    # ga khien khong cach chia nao vua duoc 3 ca.
    "lb_shifts_given_plan": lb_shifts_given_plan,
    "lb_idle_given_plan": lb_idle_given_plan,
    "lb_shifts_global": lb_shifts_global,
    "lb_idle_global": lb_idle_global,
    "gap_shifts": total_shifts_on - lb_shifts_given_plan,
    "total_work": total_work_by_stage,
}

payload = json.dumps(data, ensure_ascii=False)

with open(JSON_OUT, "w", encoding="utf-8") as f:
    f.write(payload)

# --- Ghi thang vao dashboard.html ---
# replace("</", "<\\/") de chuoi du lieu khong the vo tinh dong the <script>.
with open(DASHBOARD, encoding="utf-8") as f:
    html = f.read()

safe_payload = payload.replace("</", "<\\/")
new_html, n_sub = re.subn(
    r"^const DATA = .*;$",
    lambda _: f"const DATA = {safe_payload};",
    html,
    count=1,
    flags=re.MULTILINE,
)
if n_sub != 1:
    raise RuntimeError(f"Khong tim thay dong 'const DATA = ...;' trong {DASHBOARD}")

with open(DASHBOARD, "w", encoding="utf-8") as f:
    f.write(new_html)

print(f"Da ghi {JSON_OUT} va nhung truc tiep vao {DASHBOARD}")
print(f"Tong idle: {total_idle} (can duoi voi ke hoach Tang 1 hien tai: {lb_idle_given_plan}"
      f" | can duoi toan ky: {lb_idle_global})")
print(f"Tong ca kich hoat: {total_shifts_on}/{data['shift_usage']['total']}"
      f" (can duoi: {lb_shifts_given_plan})  |  So lan tang ca: {len(data['overloads'])}")
print(f"Chenh so voi can duoi (bo qua changeover): {data['benchmarks']['gap_shifts']} ca")
