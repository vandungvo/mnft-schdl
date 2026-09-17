"""So sanh THUC NGHIEM: pipeline 2 tang vs model CP-SAT gop lam mot.

Chay 3 cau hinh, cham diem tat ca bang CUNG MOT thuoc do, roi kiem tra tinh
hop le vat ly cua ca ba (cung bo kiem tra nhu verify_schedule.py).

Chay: python compare_combined_vs_twotier.py [giay_cho_model_gop]
"""

import json
import math
import sys
import time
from pathlib import Path

import production_planning_2weeks as agg
import detailed_shift_continuous as dsc
import combined_full_model as cm

DASHBOARD_DIR = Path(__file__).resolve().parent.parent / "dashboard"

CAST_TIME, CNC_TIME = dsc.CAST_TIME, dsc.CNC_TIME


# ---------------------------------------------------------------------------
# Thuoc do CHUNG -- ap dung y het nhau cho ca 3 loi giai.
# ---------------------------------------------------------------------------
# Pipeline 2 tang khong he co mot "tong chi phi" duy nhat: Tang 1 toi thieu
# chi phi ton kho (va mot khoan COST_SETUP chi ton tai o cap ngay), Tang 2
# toi thieu so ca -- hai ham muc tieu roi rac. Muon so sanh duoc voi model gop
# thi phai cham lai CA BA bang cung mot cong thuc.
def score(data):
    p = data["aggregate"]["plan"]
    backlog = safety = hold = 0
    for t in agg.TYPES:
        for d in agg.DAYS:
            r = p[f"{t}|{d}"]
            backlog += r["backlog"]
            safety += r["wip_short"] + r["fg_short"]
            hold += agg.COST_WIP_HOLD_PER_UNIT_DAY * r["wip"] + agg.COST_FG_HOLD_PER_UNIT_DAY * r["fg"]
    last = agg.DAYS[-1]
    end_short = sum(max(0, agg.WIP_TARGET_END[t] - p[f"{t}|{last}"]["wip"])
                    + max(0, agg.FG_TARGET_END[t] - p[f"{t}|{last}"]["fg"]) for t in agg.TYPES)

    n_lots = sum(len(i["lots"]) for dd in data["detailed_cont"].values() for i in dd.values())
    over_units = sum(o["over"] for o in data["overloads"])

    # CO Y KHONG cong OVERTIME_COST (10.000/don vi) vao tong. Do la HE SO PHAT
    # noi bo cua model de day solver tranh tang ca, khong phai chi phi nghiep vu
    # that -- gop vao thi 3 don vi tang ca bien thanh 30.000 va lam mo hoan toan
    # moi khac biet khac. Tang ca duoc bao cao thanh cot rieng (so diem + so
    # don vi) de nguoi doc tu danh gia.
    c = {
        "backlog": agg.COST_BACKLOG_PER_UNIT_DAY * backlog,
        "safety": agg.COST_SAFETY_BREACH_PER_UNIT_DAY * safety,
        "hold": hold,
        "end_shortfall": agg.COST_END_SHORTFALL_PER_UNIT * end_short,
        "shift": dsc.SHIFT_ACTIVATION_COST * data["shift_usage"]["on"],
        "batch": dsc.BATCH_COUNT_COST * n_lots,
    }
    c["TOTAL"] = sum(c.values())
    c["_overtime_units"] = over_units
    c["_n_lots"] = n_lots
    c["_backlog_units"] = backlog
    c["_safety_units"] = safety
    c["_end_short_units"] = end_short
    return c


# ---------------------------------------------------------------------------
# Kiem tra hop le vat ly -- cung logic voi verify_schedule.py
# ---------------------------------------------------------------------------
def verify(data):
    problems = []
    plan = data["aggregate"]["plan"]

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

    for day in agg.DAYS:
        dd = data["detailed_cont"][str(day)]
        for t in agg.TYPES:
            # 1) CNC khong duoc tieu thu phoi chua duc xong
            cnc_lots = lots_of(dd, "cnc", t)
            if cnc_lots:
                wip_prev = agg.WIP_INIT[t] if day == 1 else plan[f"{t}|{day-1}"]["wip"]
                cast_lots = lots_of(dd, "cast", t)
                moments = sorted({e for _, e, _ in cast_lots} | {s for s, _, _ in cnc_lots}
                                 | {e for _, e, _ in cnc_lots})
                for T in moments:
                    supply = wip_prev + sum(q for _, e, q in cast_lots if e <= T)
                    used = 0
                    for s, e, q in cnc_lots:
                        if T >= e:
                            used += q
                        elif T > s:
                            used += (T - s) // CNC_TIME[t]
                    if used > supply:
                        problems.append(f"Ngay {day} loai {t}: t={T} tieu thu {used} > co {supply}")
                        break
            # 2) San luong chi tiet khop ke hoach
            for stage, key in (("cast", "cast"), ("cnc", "cnc")):
                got = sum(q for _, _, q in lots_of(dd, stage, t))
                if got != plan[f"{t}|{day}"][key]:
                    problems.append(f"Ngay {day} {stage} {t}: chi tiet {got} != ke hoach {plan[f'{t}|{day}'][key]}")

        for m, info in dd.items():
            stage = info["stage"]
            unit = CAST_TIME if stage == "cast" else CNC_TIME
            lots = sorted(info["lots"], key=lambda x: x["start"])
            for lot in lots:
                # 3) eligibility
                if lot["type"] not in dsc.ELIGIBLE[stage, m]:
                    problems.append(f"Ngay {day}: {m} khong duoc lam loai {lot['type']}")
                # 4) LOT_MAX
                if (lot["end"] - lot["start"]) // unit[lot["type"]] > dsc.LOT_MAX:
                    problems.append(f"Ngay {day} {m}: lo {lot['job']} vuot LOT_MAX")
            # 5) khong chong nhau + ton trong changeover
            for a, b in zip(lots, lots[1:]):
                need = dsc.setup_time(stage, a["type"], b["type"])
                if b["start"] < a["end"] + need:
                    problems.append(f"Ngay {day} {m}: {a['job']}->{b['job']} thieu changeover")
            # 6) so ca phai DU cho lich (rang buoc la budget*n >= end).
            # Dung ">=" chu khong phai "==": voi loi giai chua chung minh toi uu,
            # solver co the de n LON HON muc can thiet. Do khong phai loi giai
            # sai -- chi la loi giai chua chat. Bao cao rieng de khong lan voi
            # vi pham that su.
            expect = math.ceil(info["end"] / info["budget"]) if info["end"] else 0
            if info["n_shifts"] < expect:
                problems.append(f"Ngay {day} {m}: n_shifts {info['n_shifts']} < can {expect}")
            elif info["n_shifts"] > expect:
                problems.append(f"[chua chat] Ngay {day} {m}: n_shifts {info['n_shifts']} "
                                f"> muc can {expect} (loi giai chua toi uu)")
            if info["idle"] < 0:
                problems.append(f"Ngay {day} {m}: idle am")
    return problems


# ---------------------------------------------------------------------------
# Chay pipeline 2 tang voi mot gia tri SAFETY_LEAD_DAYS, tra ve cung schema
# ---------------------------------------------------------------------------
def run_two_tier(lead):
    agg.SAFETY_LEAD_DAYS = lead
    t0 = time.time()
    r = agg.build_and_solve()
    detailed, total_idle, total_shifts, overloads = {}, 0, 0, []
    for day in agg.DAYS:
        day_data = {}
        for stage, key in (("cast", "cast"), ("cnc", "cnc")):
            pl = {t: r["plan"][t, day][key] for t in agg.TYPES if r["plan"][t, day][key] > 0}
            res = dsc.schedule_stage_continuous(stage, pl) if pl else {
                m: {"schedule": {}, "work": 0, "end": 0, "n_shifts": 0, "type_of": {}}
                for m in dsc.MACHINES[stage]}
            budget = dsc.SHIFT_BUDGET[stage]
            full_day = dsc.N_SHIFTS * budget
            for m, info in res.items():
                lots = [{"job": n, "type": info["type_of"][n], "start": s, "end": e}
                        for n, (s, e) in info["schedule"].items()]
                lots.sort(key=lambda x: x["start"])
                idle = max(0, info["n_shifts"] * budget - info["work"])
                day_data[m] = {"stage": stage, "lots": lots, "work": info["work"],
                               "end": info["end"], "budget": budget,
                               "n_shifts": info["n_shifts"], "idle": idle}
                total_idle += idle
                total_shifts += info["n_shifts"]
                if info["end"] > full_day:
                    overloads.append({"day": day, "machine": m, "stage": stage,
                                      "need": info["end"], "budget": full_day,
                                      "over": info["end"] - full_day})
        detailed[str(day)] = day_data
    elapsed = time.time() - t0
    return {
        "status": r["status"], "elapsed": elapsed,
        "aggregate": {"plan": {f"{t}|{d}": r["plan"][t, d] for t in agg.TYPES for d in agg.DAYS}},
        "detailed_cont": detailed, "overloads": overloads,
        "shift_usage": {"on": total_shifts, "total": 120}, "total_idle": total_idle,
    }


def run_combined(label, secs, workers, enforce):
    print(f"[..] {label} ({workers} worker, toi da {secs}s) ...", flush=True)
    r = cm.build_and_solve(max_seconds=secs, workers=workers, enforce_service=enforce)
    if r["status"] != "OPTIMAL":
        gap = 100 * (r["objective"] - r["best_bound"]) / max(1, abs(r["objective"]))
        r["status"] = f"{r['status']} (gap {gap:.1f}%)"
    return r


if __name__ == "__main__":
    secs = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    results = {}

    for lead in (4, 5):
        print(f"[..] pipeline 2 tang, SAFETY_LEAD_DAYS={lead} ...", flush=True)
        results[f"2 tang LEAD={lead}"] = run_two_tier(lead)

    # 8 worker: nhanh hon nhieu tren model gop (da do: 1 worker cho ket qua te
    # hon han), doi lai KHONG tai lap duoc. 1 worker: tai lap duoc, chat luong
    # kem. Bao cao ca hai de thay dung su danh doi nay.
    results["Gop dich vu bang (8 worker)"] = run_combined("Gop, dich vu bang", secs, 8, True)
    results["Gop dich vu bang (1 worker)"] = run_combined("Gop, dich vu bang", secs, 1, True)
    results["Gop tu do danh doi (8 wk)"] = run_combined("Gop, tu do", secs, 8, False)

    print()
    hdr = (f"{'Cau hinh':<28}{'CHI PHI':>9}{'ca':>5}{'idle':>6}{'tangca':>8}{'(dv)':>6}"
           f"{'tre':>5}{'thung':>7}{'giay':>7}  trang thai")
    print(hdr)
    print("-" * len(hdr))
    for name, data in results.items():
        s = score(data)
        print(f"{name:<28}{s['TOTAL']:>9}{data['shift_usage']['on']:>5}{data['total_idle']:>6}"
              f"{len(data['overloads']):>8}{s['_overtime_units']:>6}{s['_backlog_units']:>5}"
              f"{s['_safety_units']:>7}{data['elapsed']:>7.0f}  {data['status']}")
    print("CHI PHI = backlog + an toan + ton kho + cuoi ky + kich hoat ca + so lo")
    print("          (KHONG gom he so phat tang ca 10.000/dv -- xem cot tangca rieng)")

    print()
    print("Chi tiet chi phi (cung thuoc do):")
    for name, data in results.items():
        s = score(data)
        print(f"  {name:<28} " + "  ".join(f"{k}={s[k]}" for k in
              ("backlog", "safety", "hold", "end_shortfall", "shift", "batch")))

    print()
    print("Kiem tra hop le vat ly:")
    for name, data in results.items():
        pr = verify(data)
        print(f"  {name:<26} {'DAT' if not pr else str(len(pr)) + ' VAN DE: ' + '; '.join(pr[:3])}")

    with open(DASHBOARD_DIR / "comparison_result.json", "w", encoding="utf-8") as f:
        json.dump({k: {"score": score(v), "shifts": v["shift_usage"]["on"],
                       "idle": v["total_idle"], "overloads": v["overloads"], "overtime_units": score(v)["_overtime_units"],
                       "elapsed": v["elapsed"], "status": v["status"]}
                   for k, v in results.items()}, f, ensure_ascii=False, indent=1)
    print("\nDa ghi", DASHBOARD_DIR / "comparison_result.json")
