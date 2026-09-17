"""Export Tang 1 (aggregate) + Tang 2 (detailed) results to a single JSON
file for the visual dashboard artifact. Reuses build_and_solve()/schedule_stage()
from the existing modules -- no logic duplicated, just serialization."""

import json
import production_planning_2weeks as agg
import detailed_day_schedule as det
import detailed_day_schedule_selforganize as sel

agg_result = agg.build_and_solve()

data = {
    "types": agg.TYPES,
    "days": agg.DAYS,
    "wip_min": agg.WIP_MIN,
    "fg_min": agg.FG_MIN,
    "wip_target_end": agg.WIP_TARGET_END,
    "fg_target_end": agg.FG_TARGET_END,
    "safety_lead_days": agg.SAFETY_LEAD_DAYS,
    "aggregate": {
        "status": agg_result["status"],
        "cost_backlog": agg_result["cost_backlog"],
        "cost_safety": agg_result["cost_safety"],
        "cost_hold": agg_result["cost_hold"],
        "cost_setup": agg_result["cost_setup"],
        "cost_end_shortfall": agg_result["cost_end_shortfall"],
        "plan": {f"{t}|{d}": agg_result["plan"][t, d] for t in agg.TYPES for d in agg.DAYS},
    },
    "machine_budget": det.MACHINE_DAILY_BUDGET,
    "detailed": {},
    "overloads": [],
}

for day in agg.DAYS:
    cast_plan = {t: agg_result["plan"][t, day]["cast"] for t in agg.TYPES if agg_result["plan"][t, day]["cast"] > 0}
    cnc_plan = {t: agg_result["plan"][t, day]["cnc"] for t in agg.TYPES if agg_result["plan"][t, day]["cnc"] > 0}

    # Model TU quyet dinh so luong lo/kich thuoc lo (khong chia lo thu cong nua)
    cast_result = sel.schedule_stage_selforganize("cast", cast_plan)
    cnc_result = sel.schedule_stage_selforganize("cnc", cnc_plan)

    day_data = {}
    for stage, result in (("cast", cast_result), ("cnc", cnc_result)):
        for m, info in result.items():
            budget = det.MACHINE_DAILY_BUDGET[m]
            lots = [
                {"job": name, "type": name.split("-")[0], "start": s, "end": e}
                for name, (s, e) in info["schedule"].items()
            ]
            lots.sort(key=lambda x: x["start"])
            day_data[m] = {"stage": stage, "lots": lots, "work": info["work"], "end": info["end"], "budget": budget}
            if info["end"] > budget:
                data["overloads"].append({
                    "day": day, "machine": m, "stage": stage,
                    "need": info["end"], "budget": budget, "over": info["end"] - budget,
                })
    data["detailed"][str(day)] = day_data

with open("dashboard_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

print("Wrote dashboard_data.json")
print(f"Total cost: {sum(agg_result[k] for k in ('cost_backlog','cost_safety','cost_hold','cost_setup','cost_end_shortfall'))}")
print(f"Overloads: {len(data['overloads'])}")
