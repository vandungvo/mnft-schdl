from __future__ import annotations

from .instance import STAGES, duration, eligible, setup


def decode(data, rule="edd", priorities=None, machine_bias=None):
    """Serial schedule generation, append-only per machine, ready operations only."""
    orders = {o["id"]: o for o in data["orders"]}
    lots = data["lots"]
    next_stage = {l["id"]: 0 for l in lots}
    ready = {l["id"]: l["release"] for l in lots}
    states = {m: {"end": 0, "product": s["initial_product"],
                  "used": s.get("mold", {}).get("initial_cycles", 0)} for m,s in data["machines"].items()}
    rows = []
    while len(rows) < len(lots)*4:
        candidates = []
        for index, lot in enumerate(lots):
            k = next_stage[lot["id"]]
            if k == 4:
                continue
            stage = STAGES[k]
            options = []
            for mid in eligible(data, lot, stage):
                spec, state = data["machines"][mid], states[mid]
                mold = spec.get("mold")
                used, previous, maint = state["used"], state["product"], 0
                if mold:
                    cycles = (lot["quantity"]+mold["cavities"]-1)//mold["cavities"]
                    if cycles > mold["limit_cycles"]:
                        continue
                    if used+cycles > mold["limit_cycles"]:
                        used, previous, maint = 0, mold["after_maintenance"], mold["maintenance_minutes"]
                    used += cycles
                su, p = setup(data, mid, previous, lot["product"]), duration(data, lot, mid)
                for window in spec["windows"]:
                    begin = max(state["end"], ready[lot["id"]], window["start"])
                    if begin+maint+su+p <= window["end"]:
                        row = {"lot": lot["id"], "stage": stage, "machine": mid,
                               "block_start": begin, "start": begin+maint+su, "end": begin+maint+su+p,
                               "setup_minutes": su, "maintenance_minutes": maint, "cycles_after": used,
                               "mold": mold["id"] if mold else None, "window": window["id"], "shift": window["shift"]}
                        penalty = 0 if machine_bias is None else machine_bias.get((index,k,mid), 0)
                        options.append((row["end"]+penalty, row["end"], mid, row))
                        break
            if not options:
                continue
            row = min(options, key=lambda x: x[:3])[3]
            order = orders[lot["order"]]
            if priorities is not None:
                key = (priorities[index*4+k], index, k)
            elif rule == "fifo":
                key = (lot["release"], index, k)
            elif rule == "spt":
                key = (row["end"]-row["start"], order["due"], index)
            else:
                key = (order["due"], -order["priority"], index, k)
            # Advance to the next dispatch event before applying priorities;
            # do not reserve a machine for a future release while ready work waits.
            candidates.append(((row["block_start"], key), index, row))
        if not candidates:
            return None
        _, index, row = min(candidates, key=lambda x: x[0])
        lot = lots[index]
        rows.append(row)
        states[row["machine"]] = {"end": row["end"], "product": lot["product"], "used": row["cycles_after"]}
        next_stage[lot["id"]] += 1
        ready[lot["id"]] = row["end"]
    return rows
