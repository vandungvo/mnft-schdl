"""Tim tat ca cac CA bi trong (co kich hoat nhung khong lap day), giai
thich xem do la GIOI HAN CONG SUAT THAT (khong the tranh) hay CON DU DIA
TOI UU THEM, bang cach so sanh voi "so ca toi thieu can bat" ly thuyet."""

import json
import math
import detailed_shift_schedule as dss

with open("dashboard_shift_data.json", encoding="utf-8") as f:
    data = json.load(f)

MACHINES = dss.MACHINES
BUDGET = dss.SHIFT_BUDGET

print(f"{'Ngay':4} {'Stage':5} {'May':6} {'Ca':4} {'Work':>5} {'Budget':>6} {'Idle':>5}   Ghi chu")
print("-" * 90)

total_idle = 0
total_structural = 0
rows_by_day_stage = {}

for day_str, day_data in sorted(data["detailed_shifts"].items(), key=lambda kv: int(kv[0])):
    day = int(day_str)
    # gom theo (day, stage) de tinh idle toi thieu ly thuyet
    for stage in ("cast", "cnc"):
        machines = MACHINES[stage]
        budget = BUDGET[stage]
        entries = [(m, sh, day_data[f"{m}|{sh}"]) for m in machines for sh in dss.SHIFTS]
        total_demand = sum(info["work"] for _, _, info in entries)
        active_entries = [(m, sh, info) for m, sh, info in entries if info["work"] > 0]
        if not active_entries:
            continue
        n_active = len(active_entries)
        n_min_needed = math.ceil(total_demand / budget) if total_demand > 0 else 0
        # Idle TOI THIEU neu dung DUNG so ca can thiet (khong phai so ca THUC TE dang dung)
        structural_idle = max(0, n_min_needed * budget - total_demand)
        actual_idle = sum(budget - info["work"] for _, _, info in active_entries)

        for m, sh, info in active_entries:
            idle = budget - info["work"]
            total_idle += idle
            if idle == 0:
                continue
            if n_active == n_min_needed:
                note = f"KHONG THE GIAM -- da dung so ca toi thieu ({n_min_needed}) de cho {total_demand} don vi ({stage})"
            else:
                note = f"CON CO THE GOM: dang dung {n_active} ca nhung ly thuyet chi can {n_min_needed} ca cho {total_demand} don vi"
            print(f"{day:4} {stage:5} {m:6} {dss.SHIFT_NAME[sh]:4} {info['work']:>5} {budget:>6} {idle:>5}   {note}")
        total_structural += structural_idle

print("-" * 90)
print(f"Tong idle toan bo 2 tuan: {total_idle} don vi thoi gian")
print(f"Trong do idle CAU TRUC (khong the tranh, da dung dung so ca toi thieu): {total_structural} don vi")
print(f"Idle CON CO THE TOI UU (neu gom lai dung so ca toi thieu): {total_idle - total_structural} don vi")
