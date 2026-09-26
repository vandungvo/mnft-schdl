"""Vẽ biểu đồ Gantt của một lịch (mặc định: lịch lập tay của ca chuẩn).

Dùng:  python experiment/plot_gantt.py [schedule.json] [data.json] [out_prefix]
Ra:    <out_prefix>.png và <out_prefix>.svg
"""
import io
import json
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
from matplotlib.patches import Patch

sched_path = sys.argv[1] if len(sys.argv) > 1 else "experiment/results/manual_schedule.json"
data_path = sys.argv[2] if len(sys.argv) > 2 else "experiment/data/standard_case.json"
out_prefix = sys.argv[3] if len(sys.argv) > 3 else "experiment/results/gantt_manual_schedule"

sc = json.load(io.open(sched_path, encoding="utf-8"))
d = json.load(io.open(data_path, encoding="utf-8"))
lots = {l["id"]: l for l in d["lots"]}
orders = {o["id"]: o for o in d["orders"]}
rows = ["CAST_1", "CAST_2", "CNC_1", "CNC_2", "PAINT_1", "QC_1"]
ROW = {m: i for i, m in enumerate(rows)}
GIAO = len(rows)  # hàng cuối: giao hàng

COLOR = {"F_SILVER": "#4C78A8", "R_BLACK": "#E8833A"}
SETUP_C = "#BDBDBD"
MAINT_C = "#7B4FA3"
BREAK_C = "#9E9E9E"
DOWN_C = "#D62728"

# ---- thời điểm giao hàng (giao ngay khi đủ hàng) ----
qc_end = {r["lot"]: r["end"] for r in sc["runs"] if r["stage"] == "qc"}
ship = {o: max([orders[o]["release"]] + [qc_end[l] for l in orders[o]["lot_allocations"]]) for o in orders}

# ---- các đoạn thời gian cần vẽ: ngày 1 và ngày 2 (ngày 3 trống) ----
ends = [r["end"] for r in sc["runs"]]
day2_end = max(e for e in ends if e > 1440)
panels = [(-10, 495, "Ngày 1 — thứ Hai 21/09 (ca S1 06:00–14:00)"),
          (1430, day2_end + 40, "Ngày 2 — thứ Ba 22/09")]
base_of = [0, 1440]

def clock(t):
    tot = 360 + t
    return "%02d:%02d" % ((tot % 1440) // 60, tot % 60)

fig = plt.figure(figsize=(17, 6.6))
gs = GridSpec(1, 2, width_ratios=[p[1] - p[0] for p in panels], wspace=0.04)
axes = [fig.add_subplot(gs[0, i]) for i in range(2)]

def clip_bar(ax, lo, hi, a, b, y, **kw):
    """Vẽ thanh [a,b) nếu giao với cửa sổ hiển thị."""
    if b <= lo or a >= hi:
        return False
    ax.barh(y, b - a, left=a, height=0.62, **kw)
    return True

for pi, ax in enumerate(axes):
    lo, hi, title = panels[pi]
    ax.set_xlim(lo, hi)
    ax.set_ylim(GIAO + 0.7, -0.7)
    ax.set_title(title, fontsize=11, loc="left", fontweight="bold")

    # giờ nghỉ (mọi máy) và ca
    for s in d["shifts"]:
        for bs, be in s["breaks"]:
            if be > lo and bs < hi:
                ax.axvspan(max(bs, lo), min(be, hi), ymin=0, ymax=1, facecolor=BREAK_C, alpha=0.28, hatch="///", edgecolor="#777", linewidth=0)
        if s["fixed_on"] and lo < s["end"] < hi:   # chỉ đánh dấu hết ca bắt buộc (S1)
            ax.axvline(s["end"], color="#444", linestyle="--", linewidth=1)
            ax.text(s["end"] - 3, -0.62, "hết ca " + s["id"].split("_")[1], ha="right", va="bottom", fontsize=7, color="#444")
    # downtime từng máy
    for dt in d["downtimes"]:
        y = ROW[dt["machine"]]
        clip_bar(ax, lo, hi, dt["start"], dt["end"], y, facecolor=DOWN_C, alpha=0.30, hatch="xx", edgecolor=DOWN_C, linewidth=0.6)
        if lo < dt["start"] < hi:
            ax.text((dt["start"] + dt["end"]) / 2, y + 0.42, "downtime", ha="center", va="center", fontsize=6.5, color=DOWN_C)

    # bảo trì
    for mt in sc["maintenance"]:
        y = ROW[mt["machine"]]
        if clip_bar(ax, lo, hi, mt["start"], mt["end"], y, facecolor=MAINT_C, edgecolor="black", linewidth=0.6):
            ax.text((mt["start"] + mt["end"]) / 2, y, "BT\n" + mt["mold"].replace("MOLD_", "khuôn "), ha="center", va="center", fontsize=6.5, color="white", fontweight="bold")

    # lượt chạy: setup rồi gia công
    for r in sc["runs"]:
        y = ROW[r["machine"]]
        l = lots[r["lot"]]
        if r["setup_minutes"] > 0:
            if clip_bar(ax, lo, hi, r["setup_start"], r["start"], y, facecolor=SETUP_C, edgecolor="black", linewidth=0.6):
                ax.text((r["setup_start"] + r["start"]) / 2, y, "set\n%d" % r["setup_minutes"], ha="center", va="center", fontsize=5.5, color="#222")
        hatch = "\\\\" if l["type"] == "optional" else None
        if clip_bar(ax, lo, hi, r["start"], r["end"], y, facecolor=COLOR[l["product"]], edgecolor="black", linewidth=0.7, hatch=hatch):
            mid = (r["start"] + r["end"]) / 2
            fs = 6.5 if (r["end"] - r["start"]) >= 30 else 5.5
            ax.text(mid, y, r["lot"], ha="center", va="center", fontsize=fs, color="white", fontweight="bold")

    # hàng giao hàng
    for oid, t in ship.items():
        if lo <= t <= hi:
            ax.plot([t], [GIAO], marker="D", color="#2E7D32", markersize=7, markeredgecolor="black", markeredgewidth=0.6)
            ax.text(t, GIAO + 0.34, "%s\n%s" % (oid, clock(t)), ha="center", va="top", fontsize=6.5, color="#1B5E20")
            due = orders[oid]["due"]
            if lo <= due <= hi:
                ax.plot([due], [GIAO], marker="|", color="#B71C1C", markersize=12, markeredgewidth=2)

    # trục x theo giờ đồng hồ
    step = 60 if pi == 0 else 30
    ticks = [t for t in range(int(lo) - int(lo) % step + step, int(hi), step) if t >= lo + 1 or True]
    ticks = [base_of[pi] + k * step for k in range(0, int((hi - base_of[pi]) // step) + 1) if lo <= base_of[pi] + k * step <= hi]
    ax.set_xticks(ticks)
    ax.set_xticklabels([clock(t) for t in ticks], fontsize=8)
    ax.grid(axis="x", color="#DDD", linewidth=0.6)
    ax.set_axisbelow(True)
    if pi == 0:
        ax.set_yticks(range(GIAO + 1))
        ax.set_yticklabels(rows + ["Giao hàng"], fontsize=9)
    else:
        ax.set_yticks([])
    for sp in ("top", "right"):
        ax.spines[sp].set_visible(False)

legend = [
    Patch(facecolor=COLOR["F_SILVER"], edgecolor="black", label="Bánh trước bạc"),
    Patch(facecolor=COLOR["R_BLACK"], edgecolor="black", label="Bánh sau đen"),
    Patch(facecolor="white", edgecolor="black", hatch="\\\\", label="Lô dự trữ (L10, L12)"),
    Patch(facecolor=SETUP_C, edgecolor="black", label="Setup (phút)"),
    Patch(facecolor=MAINT_C, edgecolor="black", label="Bảo trì khuôn"),
    Patch(facecolor=BREAK_C, alpha=0.4, hatch="///", label="Giờ nghỉ 30 phút"),
    Patch(facecolor=DOWN_C, alpha=0.4, hatch="xx", label="Downtime"),
    plt.Line2D([0], [0], marker="D", color="w", markerfacecolor="#2E7D32", markeredgecolor="black", markersize=8, label="Giao đơn (mọi hạn giao đều nằm sau khung nhìn)"),
]
fig.legend(handles=legend, loc="lower center", ncol=8, fontsize=8, frameon=False, bbox_to_anchor=(0.5, -0.005))

# ghi chú: lô sơn xong sát cuối ca phải chờ QC sang ngày sau
last_paint = max((r for r in sc["runs"] if r["stage"] == "paint" and r["end"] < 1440), key=lambda r: r["end"])
next_qc = next(r for r in sc["runs"] if r["stage"] == "qc" and r["lot"] == last_paint["lot"])
if next_qc["start"] > 1440 - 1 and next_qc["start"] >= 1440:
    axes[0].annotate("%s sơn xong %s, QC sang ngày 2 (%s)" % (last_paint["lot"], clock(last_paint["end"]), clock(next_qc["start"])),
                     xy=(last_paint["end"], ROW["QC_1"]), xytext=(last_paint["end"] - 6, ROW["QC_1"] + 0.55),
                     ha="right", va="center", fontsize=7, style="italic", color="#444",
                     arrowprops=dict(arrowstyle="->", color="#444", lw=0.8))
cmax = max(qc_end[l] for l, x in lots.items() if x["type"] == "required")
fig.suptitle("Gantt lịch lập tay — ca chuẩn (makespan %d phút, trễ giao hàng 0, ngày 3 không có việc)" % cmax,
             fontsize=13, fontweight="bold", x=0.01, ha="left")
fig.subplots_adjust(left=0.07, right=0.99, top=0.86, bottom=0.16)
fig.savefig(out_prefix + ".png", dpi=150)
fig.savefig(out_prefix + ".svg")
print("ok:", out_prefix + ".png", out_prefix + ".svg")
