"""Kiểm tra độc lập một lịch với dữ liệu ca chuẩn và tính KPI.

Không giải bài toán, chỉ đọc lịch (danh sách lượt chạy) rồi kiểm ràng buộc:
lượt chạy, lịch ca/downtime, không chồng máy, setup, tồn bán thành phẩm (mọi sự kiện),
khuôn/bảo trì, giao hàng, tồn thành phẩm.

Dùng:  python experiment/check_schedule.py [schedule.json] [data.json]
"""
import io
import json
import math
import sys
from fractions import Fraction

sched_path = sys.argv[1] if len(sys.argv) > 1 else "experiment/results/manual_schedule.json"
data_path = sys.argv[2] if len(sys.argv) > 2 else "experiment/data/standard_case.json"
d = json.load(io.open(data_path, encoding="utf-8"))
sc = json.load(io.open(sched_path, encoding="utf-8"))

errors = []
def need(cond, msg):
    if not cond:
        errors.append(msg)

LOT = d["lot_size"]
H = d["horizon"]
stages = d["stages"]
btp_stages = d["btp_stages"]
lots = {l["id"]: l for l in d["lots"]}
orders = {o["id"]: o for o in d["orders"]}
machines = d["machines"]
molds = d["molds"]
opened = set(sc.get("opened_optional_shifts", []))
runs = sc["runs"]
maints = sc.get("maintenance", [])

def proc_time(m, prod, q):
    mm = machines[m]
    return math.ceil(Fraction(str(mm["fixed_minutes"])) + q * Fraction(str(mm["minutes_per_unit"][prod])))

# ---------- cửa sổ khả dụng của từng máy ----------
def free_windows(m):
    wins = []
    for s in d["shifts"]:
        if not (s["fixed_on"] or s["id"] in opened):
            continue
        cur = s["start"]
        for bs, be in sorted(s["breaks"]):
            wins.append([cur, bs])
            cur = be
        wins.append([cur, s["end"]])
    for dt in d["downtimes"]:
        if dt["machine"] != m:
            continue
        new = []
        for a, b in wins:
            if dt["end"] <= a or dt["start"] >= b:
                new.append([a, b])
            else:
                if a < dt["start"]:
                    new.append([a, dt["start"]])
                if dt["end"] < b:
                    new.append([dt["end"], b])
        wins = new
    return wins

FREE = {m: free_windows(m) for m in machines}
def inside_window(m, a, b):
    return any(wa <= a and b <= wb for wa, wb in FREE[m])

# ---------- kiểm từng lượt ----------
seen = set()
for r in runs:
    rid = r["id"]
    lot = lots.get(r["lot"])
    need(lot is not None, f"{rid}: lô lạ {r['lot']}")
    if lot is None:
        continue
    key = (r["lot"], r["stage"])
    need(key not in seen, f"{rid}: trùng lượt {key}")
    seen.add(key)
    m = r["machine"]
    mm = machines.get(m)
    need(mm is not None and mm["stage"] == r["stage"], f"{rid}: máy {m} không thuộc công đoạn {r['stage']}")
    if mm is None:
        continue
    need(lot["product"] in mm["eligible"], f"{rid}: máy {m} không đủ điều kiện {lot['product']}")
    need(r["end"] - r["start"] == proc_time(m, lot["product"], lot["quantity"]),
         f"{rid}: thời lượng {r['end'] - r['start']} != {proc_time(m, lot['product'], lot['quantity'])}")
    need(r["setup_start"] + r["setup_minutes"] == r["start"], f"{rid}: setup không sát ngay trước gia công")
    need(r["setup_start"] >= lot["release"], f"{rid}: bắt đầu trước release lô ({lot['release']})")
    need(0 <= r["setup_start"] and r["end"] <= H, f"{rid}: ngoài horizon")
    if r["setup_minutes"] > 0:
        need(inside_window(m, r["setup_start"], r["start"]), f"{rid}: setup cắt nghỉ/downtime/ca tắt")
    need(inside_window(m, r["start"], r["end"]), f"{rid}: gia công cắt nghỉ/downtime/ca tắt")

for lid, l in lots.items():
    if l["type"] == "required":
        need((lid, "qc") in seen, f"lô bắt buộc {lid} thiếu lượt QC")

# ---------- không chồng lấn và setup theo thứ tự trên từng máy ----------
timeline = {m: [] for m in machines}
for r in runs:
    a = r["setup_start"]
    timeline[r["machine"]].append((a, r["end"], "run", r))
for mt in maints:
    timeline.setdefault(mt["machine"], []).append((mt["start"], mt["end"], "maint", mt))
    need(inside_window(mt["machine"], mt["start"], mt["end"]), f"{mt['id']}: bảo trì cắt nghỉ/downtime/ca tắt")
    mo = molds[mt["mold"]]
    need(mt["machine"] in mo["compatible_machines"], f"{mt['id']}: máy không tương thích khuôn")
    need(mt["end"] - mt["start"] == mo["maintenance_minutes"], f"{mt['id']}: thời lượng bảo trì sai")

setup_total = 0
busy = {m: 0 for m in machines}
proc_total = {m: 0 for m in machines}
for m, items in timeline.items():
    items.sort(key=lambda x: (x[0], x[1]))
    state = machines[m]["initial_state"]
    prev_end = None
    for a, b, kind, obj in items:
        need(prev_end is None or a >= prev_end, f"{m}: chồng lấn tại {a} ({obj['id']})")
        prev_end = max(prev_end or 0, b)
        if kind == "maint":
            state = "CLEAN"
            busy[m] += b - a
        else:
            prod = lots[obj["lot"]]["product"]
            exp = machines[m]["setup"][state][prod]
            need(obj["setup_minutes"] == exp, f"{obj['id']}: setup {obj['setup_minutes']} != {exp} ({state}->{prod}) trên {m}")
            setup_total += obj["setup_minutes"]
            busy[m] += obj["setup_minutes"] + (obj["end"] - obj["start"])
            proc_total[m] += obj["end"] - obj["start"]
            state = prod
for dt in d["downtimes"]:
    for a, b, kind, obj in timeline[dt["machine"]]:
        need(b <= dt["start"] or a >= dt["end"], f"{obj['id']} đè downtime")

# ---------- khuôn: không đồng thời, bộ đếm chu kỳ ----------
mold_events = {g: [] for g in molds}
for r in runs:
    if r["stage"] == "cast":
        prod = lots[r["lot"]]["product"]
        gs = [g for g, mo in molds.items() if mo["product"] == prod and r["machine"] in mo["compatible_machines"]]
        need(len(gs) == 1, f"{r['id']}: không xác định được khuôn")
        if gs:
            mold_events[gs[0]].append((r["start"], r["end"], "cast", r))
for mt in maints:
    mold_events[mt["mold"]].append((mt["start"], mt["end"], "maint", mt))
cycle_log = {}
for g, ev in mold_events.items():
    ev.sort(key=lambda x: (x[0], x[1]))
    used = molds[g]["used_cycles"]
    last = None
    cycle_log[g] = []
    for a, b, kind, obj in ev:
        need(last is None or a >= last, f"khuôn {g}: dùng đồng thời tại {a}")
        last = b
        if kind == "maint":
            used = 0
        else:
            used += math.ceil(LOT / molds[g]["cavities"])
            need(used <= molds[g]["max_cycles"], f"khuôn {g}: vượt ngưỡng chu kỳ ({used}) tại {obj['id']}")
        cycle_log[g].append((obj["id"], used))

# ---------- tồn bán thành phẩm tại mọi sự kiện ----------
ev = []   # (thời điểm, 0=nhập trước 1=rút sau, (sản phẩm, công đoạn), ±lượng)
for r in runs:
    prod = lots[r["lot"]]["product"]
    k = stages.index(r["stage"])
    if r["stage"] in btp_stages:
        ev.append((r["end"], 0, (prod, r["stage"]), +LOT, r["id"]))
    if k > 0:
        ev.append((r["setup_start"], 1, (prod, stages[k - 1]), -LOT, r["id"]))
level = {(p, s): d["inventory"]["btp"]["initial"][p][s] for p in d["products"] for s in btp_stages}
cap_default = d["inventory"]["btp"]["capacity"]["default"]
ev.sort(key=lambda x: (x[0], x[1]))
peak = dict(level)
for t, typ, key, dq, rid in ev:
    level[key] += dq
    need(level[key] >= 0, f"tồn BTP {key} âm ({level[key]}) tại t={t} do {rid}")
    if cap_default is not None:
        need(level[key] <= cap_default, f"tồn BTP {key} vượt sức chứa tại t={t}")
    peak[key] = max(peak[key], level[key])
end_btp = sum(level.values())
need(end_btp <= d["reserve_policy"]["max_surplus_btp"], f"tồn BTP cuối kỳ {end_btp} vượt giới hạn")

# ---------- giao hàng, tồn thành phẩm ----------
qc_end = {r["lot"]: r["end"] for r in runs if r["stage"] == "qc"}
ship = {}
tard = {}
for oid, o in orders.items():
    ends = []
    for lid in o["lot_allocations"]:
        need(lid in qc_end, f"đơn {oid}: lô {lid} chưa xong QC")
        ends.append(qc_end.get(lid, 10 ** 9))
    ship[oid] = max([o["release"]] + ends)
    tard[oid] = max(0, ship[oid] - o["due"])
    need(ship[oid] < 10 ** 9, f"đơn {oid} không giao được")

fg = dict(d["inventory"]["finished"]["initial"])
fcap = d["inventory"]["finished"]["capacity"]
fev = []
for lid, t in qc_end.items():
    fev.append((t, 0, lots[lid]["product"], +lots[lid]["quantity"], lid))
for oid, t in ship.items():
    fev.append((t, 1, orders[oid]["product"], -orders[oid]["quantity"], oid))
fev.sort(key=lambda x: (x[0], x[1]))
for t, typ, p, dq, ident in fev:
    fg[p] += dq
    need(fg[p] >= 0, f"tồn thành phẩm {p} âm tại t={t} ({ident})")
    need(fg[p] <= fcap[p], f"tồn thành phẩm {p} vượt trần tại t={t}")

def fg_at(t):
    lv = dict(d["inventory"]["finished"]["initial"])
    for tt, typ, p, dq, ident in fev:
        if tt <= t:
            lv[p] += dq
    return lv

def btp_at(t):
    lv = {(p, s): d["inventory"]["btp"]["initial"][p][s] for p in d["products"] for s in btp_stages}
    for tt, typ, key, dq, rid in ev:
        if tt <= t:
            lv[key] += dq
    return lv

# dư thành phẩm
selected = set(qc_end)
alloc = {lid: 0 for lid in lots}
for o in orders.values():
    for lid, q in o["lot_allocations"].items():
        alloc[lid] += q
surplus = sum(lots[l]["quantity"] - alloc[l] for l in selected)
need(surplus <= d["reserve_policy"]["max_surplus_finished"], f"dư thành phẩm {surplus} vượt giới hạn")

# ---------- KPI ----------
def available_minutes(m):
    return sum(b - a for a, b in FREE[m])
cmax = max([qc_end[l] for l, x in lots.items() if x["type"] == "required" and l in qc_end] or [0])
idle = {m: available_minutes(m) - busy[m] for m in machines}
for m in machines:
    need(idle[m] >= 0, f"{m}: bận nhiều hơn khả dụng")
wtard = sum(orders[o]["priority"] * tard[o] for o in orders)
short = 0
short_detail = []
for cp in d["checkpoints"]:
    lv = fg_at(cp)
    for p in d["products"]:
        s = max(0, d["inventory"]["finished"]["safety"][p] - lv[p])
        short += s
        short_detail.append((cp, p, lv[p], s))
opt_cost = 0
for r in runs:
    if lots[r["lot"]]["type"] == "optional":
        opt_cost += d["reserve_policy"]["optional_run_cost"][r["stage"]]
hold = 0.0
for cp in d["checkpoints"]:
    for (p, s), q in btp_at(cp).items():
        hold += q * d["inventory"]["btp"]["holding_cost_per_unit_day"][s]
    for p, q in fg_at(cp).items():
        hold += q * d["inventory"]["finished"]["holding_cost_per_unit_day"]
open_cost = 0
for s in d["shifts"]:
    if s["id"] in opened:
        open_cost += s["open_cost"] * len(machines)
w = d["weights"]
F = (w["makespan"] * cmax + w["weighted_tardiness"] * wtard + w["setup_minutes"] * setup_total
     + w["idle_minutes"] * sum(idle.values()) + w["safety_shortfall"] * short
     + w["optional_run_cost"] * opt_cost + w["holding_cost"] * hold + w["shift_open_cost"] * open_cost)

print("=== KẾT QUẢ KIỂM TRA ===")
print("Số lượt chạy:", len(runs), "| bảo trì:", len(maints))
print("Makespan lô bắt buộc (phút):", cmax)
print("Giao hàng (phút):", ship)
print("Độ trễ (phút):", tard, "| trễ có trọng số:", wtard)
print("Tổng setup (phút):", setup_total)
print("Bận theo máy:", busy)
print("Idle trong ca bật theo máy:", idle, "| tổng:", sum(idle.values()))
tot_av = sum(available_minutes(m) for m in machines)
print("Hiệu suất sản xuất (gia công / khả dụng): %.1f%%" % (100 * sum(proc_total.values()) / tot_av))
print("Bộ đếm khuôn:", cycle_log)
print("Tồn BTP đỉnh:", {f"{p}/{s}": v for (p, s), v in peak.items() if v})
print("Tồn BTP cuối kỳ:", end_btp)
print("Tồn thành phẩm tại mốc:", [(cp, fg_at(cp)) for cp in d["checkpoints"]])
print("Thiếu safety stock:", short, short_detail)
print("Dư thành phẩm:", surplus, "| chi phí lượt tùy chọn:", opt_cost, "| chi phí lưu:", round(hold, 2), "| mở ca:", open_cost)
print("Mục tiêu F (theo trọng số trong dữ liệu): %.2f" % F)
if errors:
    print("\nLỖI (%d):" % len(errors))
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("\nOK: lịch hợp lệ theo mọi kiểm tra")
