"""Kiem tra tinh HOP LE VAT LY cua lich chi tiet da export.

Kiem tra chinh: tai moi thoi diem, so phoi (WIP) ma cong doan CNC da tieu thu
khong duoc vuot qua so phoi THUC SU CO SAN = ton dau ngay + cac lo Duc DA
HOAN THANH tinh den thoi diem do.

Day la script da phat hien loi "Tang 2 giai cast va cnc doc lap ma khong co
rang buoc precedence" (8/10 ngay vi pham). Giu lai de chay hoi quy moi khi
doi model.

Chay: python verify_schedule.py
"""

import json
import math
from pathlib import Path

import legacy.production_planning_2weeks as agg
import legacy.detailed_shift_continuous as dsc

DASHBOARD_DIR = Path(__file__).resolve().parent.parent / "dashboard"

with open(DASHBOARD_DIR / "dashboard_cont_data.json", encoding="utf-8") as f:
    data = json.load(f)

CAST_TIME, CNC_TIME = dsc.CAST_TIME, dsc.CNC_TIME
plan = data["aggregate"]["plan"]
problems = []


def lots_of(day_data, stage, t):
    out = []
    for m, info in day_data.items():
        if info["stage"] != stage:
            continue
        for lot in info["lots"]:
            if lot["type"] == t:
                unit = CAST_TIME[t] if stage == "cast" else CNC_TIME[t]
                out.append((lot["start"], lot["end"], (lot["end"] - lot["start"]) // unit))
    return out


# ---------------------------------------------------------------------------
# 1) Phoi bán thanh pham: CNC khong duoc tieu thu phoi chua duc xong
# ---------------------------------------------------------------------------
for day in agg.DAYS:
    dd = data["detailed_cont"][str(day)]
    for t in agg.TYPES:
        cnc_lots = lots_of(dd, "cnc", t)
        if not cnc_lots:
            continue
        wip_prev = agg.WIP_INIT[t] if day == 1 else plan[f"{t}|{day-1}"]["wip"]
        cast_lots = lots_of(dd, "cast", t)
        moments = sorted({e for _, e, _ in cast_lots} | {s for s, _, _ in cnc_lots}
                         | {e for _, e, _ in cnc_lots})
        for T in moments:
            supply = wip_prev + sum(q for _, e, q in cast_lots if e <= T)
            consumed = 0
            for s, e, q in cnc_lots:
                if T >= e:
                    consumed += q
                elif T > s:
                    consumed += (T - s) // CNC_TIME[t]
            if consumed > supply:
                problems.append(
                    f"Ngay {day} loai {t}: tai t={T} da tieu thu {consumed} phoi "
                    f"nhung chi co {supply} (ton dau ngay {wip_prev})")
                break

# ---------------------------------------------------------------------------
# 2) San luong chi tiet phai khop dung ke hoach Tang 1
# ---------------------------------------------------------------------------
for day in agg.DAYS:
    dd = data["detailed_cont"][str(day)]
    for t in agg.TYPES:
        for stage, key in (("cast", "cast"), ("cnc", "cnc")):
            got = sum(q for _, _, q in lots_of(dd, stage, t))
            want = plan[f"{t}|{day}"][key]
            if got != want:
                problems.append(f"Ngay {day} {stage} loai {t}: lich chi tiet {got} != ke hoach {want}")

# ---------------------------------------------------------------------------
# 3) Machine eligibility
# ---------------------------------------------------------------------------
for day in agg.DAYS:
    for m, info in data["detailed_cont"][str(day)].items():
        for lot in info["lots"]:
            if lot["type"] not in dsc.ELIGIBLE[info["stage"], m]:
                problems.append(f"Ngay {day}: {m} khong duoc phep lam loai {lot['type']}")

# ---------------------------------------------------------------------------
# 4) Lo khong chong nhau tren cung 1 may + ton trong changeover + LOT_MAX
# ---------------------------------------------------------------------------
for day in agg.DAYS:
    for m, info in data["detailed_cont"][str(day)].items():
        stage = info["stage"]
        unit = CAST_TIME if stage == "cast" else CNC_TIME
        lots = sorted(info["lots"], key=lambda x: x["start"])
        for lot in lots:
            qty = (lot["end"] - lot["start"]) // unit[lot["type"]]
            if qty > dsc.LOT_MAX:
                problems.append(f"Ngay {day} {m}: lo {lot['job']} co {qty} > LOT_MAX={dsc.LOT_MAX}")
        for a, b in zip(lots, lots[1:]):
            need = dsc.setup_time(stage, a["type"], b["type"])
            if b["start"] < a["end"] + need:
                problems.append(
                    f"Ngay {day} {m}: {a['job']} ket thuc {a['end']} + changeover {need} "
                    f"> {b['job']} bat dau {b['start']}")

# ---------------------------------------------------------------------------
# 5) So ca kich hoat phai dung = ceil(end / budget), va idle khong am
# ---------------------------------------------------------------------------
for day in agg.DAYS:
    for m, info in data["detailed_cont"][str(day)].items():
        budget = info["budget"]
        expect = math.ceil(info["end"] / budget) if info["end"] else 0
        if info["n_shifts"] != expect:
            problems.append(f"Ngay {day} {m}: n_shifts={info['n_shifts']} != ceil({info['end']}/{budget})={expect}")
        if info["idle"] < 0:
            problems.append(f"Ngay {day} {m}: idle am ({info['idle']})")

# ---------------------------------------------------------------------------
# 6) Tang 1: khong backlog, khong vuot cong suat may don le
# ---------------------------------------------------------------------------
for day in agg.DAYS:
    for t in agg.TYPES:
        if plan[f"{t}|{day}"]["backlog"] > 0:
            problems.append(f"Ngay {day} loai {t}: con backlog {plan[f'{t}|{day}']['backlog']}")
    if CAST_TIME["C"] * plan[f"C|{day}"]["cast"] > agg.CAST_CAP_PER_DAY // 2:
        problems.append(f"Ngay {day}: khoi luong duc C vuot nang luc rieng cua Cast1")
    if CNC_TIME["B"] * plan[f"B|{day}"]["cnc"] > agg.CNC_CAP_PER_DAY // 2:
        problems.append(f"Ngay {day}: khoi luong CNC B vuot nang luc rieng cua CNC1")

print("=" * 70)
if problems:
    print(f"PHAT HIEN {len(problems)} VAN DE:")
    for p in problems:
        print("  -", p)
else:
    print("TAT CA KIEM TRA DEU DAT -- lich chi tiet hop le ve vat ly.")
print("=" * 70)

# Tang ca KHONG phai loi hop le (model van cho phep, chi phat rat nang) nhung
# phai hien thi rieng, khong duoc chim trong dong "tat ca deu dat".
if data["overloads"]:
    total_over = sum(o["over"] for o in data["overloads"])
    print(f"CANH BAO -- {len(data['overloads'])} diem TANG CA (tong {total_over} don vi vuot "
          f"qua ca 3 ca cua may):")
    for o in data["overloads"]:
        print(f"  - Ngay {o['day']} {o['machine']} ({o['stage']}): can {o['need']}/{o['budget']}"
              f" -> vuot {o['over']}")
else:
    print("Khong co diem nao phai tang ca.")

print(f"Tong idle: {data['total_idle']}  |  Ca kich hoat: {data['shift_usage']['on']}"
      f"/{data['shift_usage']['total']}  |  Tang ca: {len(data['overloads'])} lan")
