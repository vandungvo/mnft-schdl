"""Export shift-level (Tang 2b) detail cho dashboard, thay the Gantt ngay
bang Gantt CA (3 ca/ngay) -- dung detailed_shift_schedule.py, khong sua
logic solve, chi serialize ra JSON."""

import json
import production_planning_2weeks as agg
import detailed_shift_schedule as dss

agg_result = agg.build_and_solve()

data = {
    "types": agg.TYPES,
    "days": agg.DAYS,
    "shifts": dss.SHIFTS,
    "shift_name": dss.SHIFT_NAME,
    "wip_min": agg.WIP_MIN,
    "fg_min": agg.FG_MIN,
    "wip_target_end": agg.WIP_TARGET_END,
    "fg_target_end": agg.FG_TARGET_END,
    "safety_lead_days": agg.SAFETY_LEAD_DAYS,
    "shift_budget": dss.SHIFT_BUDGET,
    "aggregate": {
        "status": agg_result["status"],
        "cost_backlog": agg_result["cost_backlog"],
        "cost_safety": agg_result["cost_safety"],
        "cost_hold": agg_result["cost_hold"],
        "cost_setup": agg_result["cost_setup"],
        "cost_end_shortfall": agg_result["cost_end_shortfall"],
        "plan": {f"{t}|{d}": agg_result["plan"][t, d] for t in agg.TYPES for d in agg.DAYS},
    },
    "machines": dss.MACHINES,
    "detailed_shifts": {},
    "overloads": [],
}

n_shifts_on = 0
n_shifts_total = 0

for day in agg.DAYS:
    cast_plan = {t: agg_result["plan"][t, day]["cast"] for t in agg.TYPES if agg_result["plan"][t, day]["cast"] > 0}
    cnc_plan = {t: agg_result["plan"][t, day]["cnc"] for t in agg.TYPES if agg_result["plan"][t, day]["cnc"] > 0}

    day_data = {}
    for stage, plan in (("cast", cast_plan), ("cnc", cnc_plan)):
        res = dss.schedule_day_shifts(stage, plan)
        budget = dss.SHIFT_BUDGET[stage]
        for (m, sh), info in res.items():
            n_shifts_total += 1
            lots = [
                {"job": name, "type": info["type_of"][name], "start": s, "end": e}
                for name, (s, e) in info["schedule"].items()
            ]
            lots.sort(key=lambda x: x["start"])
            key = f"{m}|{sh}"
            day_data[key] = {"stage": stage, "machine": m, "shift": sh, "lots": lots,
                              "work": info["work"], "end": info["end"], "budget": budget}
            if info["work"] > 0:
                n_shifts_on += 1
            if info["end"] > budget:
                data["overloads"].append({
                    "day": day, "machine": m, "shift": sh, "stage": stage,
                    "need": info["end"], "budget": budget, "over": info["end"] - budget,
                })
    data["detailed_shifts"][str(day)] = day_data

data["shift_usage"] = {"on": n_shifts_on, "total": n_shifts_total}

with open("dashboard_shift_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

total_over = sum(o["over"] for o in data["overloads"])
print("Wrote dashboard_shift_data.json")
print(f"Ca kich hoat: {n_shifts_on}/{n_shifts_total}  |  So lan tang ca: {len(data['overloads'])}  |  Tong don vi tang ca: {total_over}")
