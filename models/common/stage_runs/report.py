"""Static Gantt page for a schema-5 run (written next to result.json by run_one)."""
from __future__ import annotations

import html
import json

COLORS = {"F_SILVER": "#7FA7C9", "F_BLACK": "#3E4A63", "R_SILVER": "#86BFB2", "R_BLACK": "#6E4E70"}


def _color(item, stage):
    if stage == "heat":
        return "#C9824A"
    for key, col in COLORS.items():
        if item.startswith(key):
            return col
    return "#7FA7C9" if item.startswith("F") else "#86BFB2"


def gantt(path, data, rows, result):
    machines = list(data["machines"])
    end = max(r["end"] for r in rows)
    horizon = min(data["horizon"], ((end // 1440) + 1) * 1440)
    left, width = 120, 1400
    scale = width / horizon
    parts = []
    for i, mid in enumerate(machines):
        y = 40 + i * 44
        parts.append(f'<text x="6" y="{y + 26}" font-size="13" font-weight="600">{mid}</text>')
        for r in (r for r in rows if r["machine"] == mid):
            segs = [(r["block_start"], r["maintenance_minutes"], "#8A96A3", "bảo trì khuôn"),
                    (r["block_start"] + r["maintenance_minutes"], r["setup_minutes"], "#B9C3CE", "setup"),
                    (r["start"], r["end"] - r["start"], _color(r["item"], r["stage"]), "chạy")]
            for s, ln, col, kind in segs:
                if ln:
                    tip = html.escape(f'{r["run"]} {kind}: {s}–{s + ln} phút; {r["machine"]}'
                                      + (f' {r["mold"]}' if r["mold"] else "") + (f'; {r["shift"]}' if r["shift"] else ""))
                    parts.append(f'<rect x="{left + s * scale:.1f}" y="{y + 6}" width="{max(.8, ln * scale):.1f}" height="30" fill="{col}"><title>{tip}</title></rect>')
    for day in range(horizon // 1440 + 1):
        x = left + day * 1440 * scale
        parts.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="30" y2="{40 + len(machines) * 44}" stroke="#cbd5e1"/>'
                     f'<text x="{x + 4:.1f}" y="24" font-size="12">Ngày {day + 1}</text>')
    svg_h = 50 + len(machines) * 44
    page = ('<!doctype html><meta charset="utf-8"><title>Gantt</title>'
            '<style>body{font:14px system-ui;margin:24px;color:#172033}section{overflow:auto}pre{white-space:pre-wrap}</style>'
            f'<h1>{html.escape(result["method"])} · seed {result["seed"]} · {html.escape(result.get("status", ""))}</h1>'
            '<p>Rê chuột lên thanh để xem lượt, thời gian, máy, khuôn, ca. Xám đậm: bảo trì khuôn; xám nhạt: setup; cam: nhiệt luyện.</p>'
            f'<section><svg width="{left + width + 20}" height="{svg_h}">' + "".join(parts) + '</svg></section><pre>'
            + html.escape(json.dumps(result.get("metrics"), indent=2, ensure_ascii=False)) + '</pre>')
    path.write_text(page, encoding="utf-8")
