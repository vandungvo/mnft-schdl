from __future__ import annotations

from .instance import BTP_STAGES, STAGES, duration, eligible, setup, stage_item


def _btp_ready_time(data, btp_events, consumed, code, qty):
    """Earliest time enough already-committed BTP(code) exists for qty.

    Interchangeable across lots AND across products sharing the same code (A09):
    any routed lot's production credits the same pool. Returns None if even all
    committed production so far is insufficient.
    """
    threshold = consumed.get(code, 0) + qty
    available = data.get("inventory_btp", {}).get(code, 0)
    if available >= threshold:
        return 0
    for time, produced_qty in sorted(btp_events.get(code, [])):
        available += produced_qty
        if available >= threshold:
            return time
    return None


def decode(data, rule="edd", priorities=None, machine_bias=None):
    """Serial schedule generation, append-only per machine, ready operations only."""
    orders = {o["id"]: o for o in data["orders"]}
    lots = data["lots"]
    # A08: baselines never choose reserve (optional) work -- that is an economic
    # trade-off decision, not a dispatch rule. Pre-mark optional lots as already
    # past their last stage (k==4) so the dispatch loop below always skips them,
    # while keeping `enumerate(lots)` over the FULL list so index-based callers
    # (search.py's priorities/machine_bias, keyed by (lot_index, stage)) stay
    # aligned -- filtering `lots` itself would shift those indices.
    next_stage = {l["id"]: (4 if l.get("optional") else 0) for l in lots}
    mandatory_ops = sum(4 for l in lots if not l.get("optional"))
    # BTP ledger (A09/A10/R12): stage k+1 draws from the shared pool built by ANY
    # routed lot's stage-k completion — same product or, sharing a BTP code, a
    # DIFFERENT product too (no more same-lot precedence). `btp_events` holds
    # (time, qty) production credits per BTP code; `consumed` is the running
    # total already claimed from that code.
    btp_events: dict[str, list[tuple[int, int]]] = {}
    consumed: dict[str, int] = {}
    states = {m: {"end": 0, "product": s["initial_product"],
                  "used": s.get("mold", {}).get("initial_cycles", 0)} for m,s in data["machines"].items()}
    rows = []
    while len(rows) < mandatory_ops:
        candidates = []
        for index, lot in enumerate(lots):
            k = next_stage[lot["id"]]
            if k == 4:
                continue
            stage = STAGES[k]
            lower_bound = lot["release"]
            if k > 0:
                code = data["btp_routing"][lot["product"]][STAGES[k-1]]
                lower_bound = _btp_ready_time(data, btp_events, consumed, code, lot["quantity"])
                if lower_bound is None:
                    continue
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
                su, p = setup(data, mid, previous, stage_item(data, lot, stage)), duration(data, lot, mid)
                for window in spec["windows"]:
                    begin = max(state["end"], lower_bound, window["start"])
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
        states[row["machine"]] = {"end": row["end"], "product": stage_item(data, lot, row["stage"]), "used": row["cycles_after"]}
        committed_k = STAGES.index(row["stage"])
        if row["stage"] in BTP_STAGES:
            # Fixed transfer lag: BTP is only usable downstream transfer_minutes after
            # the stage-k run physically ends (mirrors cp_engine.py's C7b reservoir).
            code = data["btp_routing"][lot["product"]][row["stage"]]
            credit_time = row["end"] + data.get("transfer_minutes", 0)
            btp_events.setdefault(code, []).append((credit_time, lot["quantity"]))
        if committed_k > 0:
            code = data["btp_routing"][lot["product"]][STAGES[committed_k - 1]]
            consumed[code] = consumed.get(code, 0) + lot["quantity"]
        next_stage[lot["id"]] += 1
    return rows
