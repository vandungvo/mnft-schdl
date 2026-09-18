#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
token-dashboard.py — Render docs/token-dashboard.html tu usage-index.json.

Self-contained hoan toan: SVG ve tay (KHONG CDN, KHONG ECharts, KHONG cai gi).
Mo bang double-click. Tieng Viet co dau.

Chay:
  python3 .claude/scripts/token-track/token-ingest.py     # cap nhat so lieu truoc
  python3 .claude/scripts/token-track/token-dashboard.py   # sinh HTML
"""
import json
import os
import html
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, ".claude", "token-tracking")
INDEX_PATH = os.path.join(DATA_DIR, "usage-index.json")
OUT_PATH = os.path.join(PROJECT_ROOT, "docs", "token-dashboard.html")


def fmt_usd(x):
    return "${:,.2f}".format(x or 0)


def fmt_tok(n):
    n = int(n or 0)
    if n >= 1_000_000:
        return "%.1fM" % (n / 1_000_000)
    if n >= 1_000:
        return "%.0fk" % (n / 1_000)
    return str(n)


def esc(s):
    return html.escape(str(s if s is not None else ""))


def bar_rows(items, label_key, value_key, max_rows=15, subfmt=None):
    """Sinh HTML cac hang bar ngang. items: list dict."""
    if not items:
        return '<p class="empty">Chưa có dữ liệu.</p>'
    top = items[:max_rows]
    mx = max((it.get(value_key, 0) or 0) for it in top) or 1
    rows = []
    for it in top:
        val = it.get(value_key, 0) or 0
        pct = 100.0 * val / mx
        label = esc(it.get(label_key, ""))
        sub = ""
        if subfmt:
            sub = '<span class="sub">%s</span>' % subfmt(it)
        rows.append(
            '<div class="bar-row">'
            '<div class="bar-label" title="%s">%s%s</div>'
            '<div class="bar-track"><div class="bar-fill" style="width:%.1f%%"></div></div>'
            '<div class="bar-val">%s</div>'
            '</div>' % (label, label, sub, pct, fmt_usd(val))
        )
    return "\n".join(rows)


def donut_svg(segments, size=180):
    """segments: list (label, value, color). Ve donut SVG."""
    total = sum(v for _, v, _ in segments) or 1
    cx = cy = size / 2
    r = size / 2 - 6
    inner = r * 0.58
    import math
    start = -90.0
    paths = []
    for label, val, color in segments:
        frac = val / total
        end = start + frac * 360
        a0 = math.radians(start)
        a1 = math.radians(end)
        x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
        xi0, yi0 = cx + inner * math.cos(a0), cy + inner * math.sin(a0)
        xi1, yi1 = cx + inner * math.cos(a1), cy + inner * math.sin(a1)
        large = 1 if (end - start) > 180 else 0
        d = ("M %.2f %.2f A %.2f %.2f 0 %d 1 %.2f %.2f "
             "L %.2f %.2f A %.2f %.2f 0 %d 0 %.2f %.2f Z") % (
            x0, y0, r, r, large, x1, y1, xi1, yi1, inner, inner, large, xi0, yi0)
        paths.append('<path d="%s" fill="%s"/>' % (d, color))
        start = end
    return '<svg viewBox="0 0 %d %d" class="donut">%s</svg>' % (size, size, "".join(paths))


def line_svg(days, w=760, h=200):
    """days: list (label, value). Ve line chart cost theo ngay."""
    if not days:
        return '<p class="empty">Chưa có dữ liệu ngày.</p>'
    pad = 30
    vals = [v for _, v in days]
    mx = max(vals) or 1
    n = len(days)
    def x(i):
        return pad + (w - 2 * pad) * (i / max(n - 1, 1))
    def y(v):
        return h - pad - (h - 2 * pad) * (v / mx)
    pts = " ".join("%.1f,%.1f" % (x(i), y(v)) for i, (_, v) in enumerate(days))
    area = "%.1f,%.1f " % (x(0), h - pad) + pts + " %.1f,%.1f" % (x(n - 1), h - pad)
    dots = "".join('<circle cx="%.1f" cy="%.1f" r="2.5"/>' % (x(i), y(v))
                   for i, (_, v) in enumerate(days))
    # nhan truc x: dau, giua, cuoi
    labels = []
    for i in (0, n // 2, n - 1):
        if 0 <= i < n:
            labels.append('<text x="%.1f" y="%d" class="axl">%s</text>'
                          % (x(i), h - 8, esc(days[i][0][5:])))
    ymax = '<text x="4" y="14" class="axl">%s</text>' % fmt_usd(mx)
    return ('<svg viewBox="0 0 %d %d" class="line">'
            '<polygon points="%s" class="area"/>'
            '<polyline points="%s" class="ln"/>%s%s%s</svg>'
            % (w, h, area, pts, dots, "".join(labels), ymax))


PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"]


def build_html(d):
    totals = d.get("totals", {})
    root = totals.get("root", {})
    sub = totals.get("subagent", {})
    codex = totals.get("codex", {})
    sessions = d.get("sessions", {})
    skills = d.get("skills", {})
    subagents = d.get("subagents", {})
    codex_sessions = d.get("codex_sessions", [])
    by_day = d.get("by_day", {})

    grand = (root.get("cost_usd", 0) + sub.get("cost_usd", 0))
    total_tok = (root.get("input", 0) + root.get("output", 0) + root.get("cache_read", 0)
                 + root.get("cache_write_5m", 0) + root.get("cache_write_1h", 0))
    cread = root.get("cache_read", 0)
    cread_pct_tok = 100.0 * cread / (total_tok or 1)
    cread_cost = cread * 1.5 / 1_000_000  # xap xi @opus cache_read
    cread_pct_cost = 100.0 * cread_cost / (root.get("cost_usd", 0) or 1)

    # Donut cost bucket
    cost_input = root.get("input", 0) * 15 / 1e6
    cost_output = root.get("output", 0) * 75 / 1e6
    cost_cwrite = (root.get("cache_write_5m", 0) * 18.75 + root.get("cache_write_1h", 0) * 30) / 1e6
    cost_cread = cread * 1.5 / 1e6
    donut = donut_svg([
        ("Cache write", cost_cwrite, PALETTE[0]),
        ("Output", cost_output, PALETTE[1]),
        ("Input", cost_input, PALETTE[2]),
        ("Cache read", cost_cread, PALETTE[3]),
    ])
    donut_legend = "".join(
        '<div class="lg"><span class="dot" style="background:%s"></span>%s <b>%s</b></div>' % (c, l, fmt_usd(v))
        for l, v, c in [("Cache write", cost_cwrite, PALETTE[0]),
                        ("Output", cost_output, PALETTE[1]),
                        ("Input", cost_input, PALETTE[2]),
                        ("Cache read", cost_cread, PALETTE[3])])

    # Session rows
    sess_list = [dict(v, _sid=k) for k, v in sessions.items()]
    sess_rows = bar_rows(
        sess_list, "_label", "cost_usd", max_rows=15,
        subfmt=lambda it: "%s · %d msg" % (esc((it.get("first_ts", "") or "")[:10]), it.get("messages", 0)))
    # them label ngan
    for it in sess_list:
        it["_label"] = "%s… (%s)" % (it["_sid"][:8], (it.get("model", "") or "")
                                     .replace("claude-", "")[:10])
    sess_rows = bar_rows(
        sess_list, "_label", "cost_usd", max_rows=15,
        subfmt=lambda it: " %s · %d msg" % ((it.get("first_ts", "") or "")[:10], it.get("messages", 0)))

    # Skill rows
    skill_list = [dict(v) for v in skills.values()]
    skill_rows = bar_rows(
        skill_list, "skill", "cost_usd", max_rows=20,
        subfmt=lambda it: " · %d lần" % it.get("runs", 0) if it.get("runs") else "")

    # Subagent rows
    sa_list = [dict(v) for v in subagents.values()]
    sa_rows = bar_rows(sa_list, "agent_type", "cost_usd", max_rows=20,
                       subfmt=lambda it: " · %d msg" % it.get("messages", 0))

    # Codex rows
    cx_rows = ""
    if codex_sessions:
        rr = []
        for s in codex_sessions[:15]:
            rr.append('<tr><td>%s</td><td>%s</td><td class="num">%s</td>'
                      '<td class="num">%s</td><td class="num">%s</td><td class="num">%s</td></tr>'
                      % (esc((s.get("started", "") or "")[:10]), esc(s.get("model", "")),
                         fmt_tok(s.get("input", 0)), fmt_tok(s.get("cached", 0)),
                         fmt_tok(s.get("output", 0)), fmt_usd(s.get("cost_usd", 0))))
        cx_rows = "\n".join(rr)

    # Line chart theo ngay
    day_points = [(k, v.get("cost_usd", 0)) for k, v in sorted(by_day.items()) if k != "unknown"]
    line = line_svg(day_points)

    gen = d.get("generated_at", "")[:19].replace("T", " ")
    proj = os.path.basename(d.get("project_root", "project"))

    return PAGE.format(
        proj=esc(proj), gen=esc(gen),
        grand=fmt_usd(grand),
        root_cost=fmt_usd(root.get("cost_usd", 0)),
        sub_cost=fmt_usd(sub.get("cost_usd", 0)),
        codex_cost=fmt_usd(codex.get("cost_usd", 0)),
        n_sess=len(sessions), n_skill=len([s for s in skills if s != "(no-skill)"]),
        n_sa=len(subagents), n_cx=len(codex_sessions),
        total_tok=fmt_tok(total_tok),
        cread_pct_tok="%.1f" % cread_pct_tok, cread_pct_cost="%.1f" % cread_pct_cost,
        donut=donut, donut_legend=donut_legend,
        line=line,
        sess_rows=sess_rows, skill_rows=skill_rows, sa_rows=sa_rows,
        cx_block=(CODEX_BLOCK.format(codex_cost=fmt_usd(codex.get("cost_usd", 0)),
                                     rows=cx_rows) if codex_sessions else ""),
    )


CODEX_BLOCK = """
    <section class="card">
      <h2>Codex (/delegate) <span class="tag warn">ước lượng · quota OpenAI riêng</span></h2>
      <p class="muted">Token Codex tính vào subscription OpenAI, KHÔNG phải Anthropic. Đây là ước lượng $ theo giá GPT (sửa ở <code>pricing.json → codex_models</code>). Tổng: <b>{codex_cost}</b>.</p>
      <table class="tbl">
        <thead><tr><th>Ngày</th><th>Model</th><th class="num">Input</th><th class="num">Cached</th><th class="num">Output</th><th class="num">Ước tính $</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </section>"""


PAGE = """<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Token Dashboard — {proj}</title>
<style>
/* Light mode mac dinh, khong doi theo theme he dieu hanh */
:root {{
  --bg:#f7f8fa; --card:#fff; --ink:#1a1d24; --muted:#6b7280; --line:#e5e7eb;
  --accent:#6366f1; --track:#eef0f4;
}}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  font-size:14px; line-height:1.5; }}
.wrap {{ max-width:1080px; margin:0 auto; padding:28px 20px 60px; }}
header {{ display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:8px; margin-bottom:20px; }}
h1 {{ font-size:20px; margin:0; }}
h2 {{ font-size:15px; margin:0 0 14px; display:flex; align-items:center; gap:8px; }}
.muted,.gen {{ color:var(--muted); font-size:12px; }}
.kpis {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:20px; }}
.kpi {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; }}
.kpi .v {{ font-size:24px; font-weight:700; }}
.kpi .l {{ color:var(--muted); font-size:12px; margin-top:2px; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:20px; margin-bottom:16px; }}
.grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
@media (max-width:760px) {{ .grid2 {{ grid-template-columns:1fr; }} }}
.bar-row {{ display:grid; grid-template-columns:1fr 2fr auto; gap:10px; align-items:center; padding:5px 0; }}
.bar-label {{ font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
.bar-label .sub {{ color:var(--muted); font-size:11px; }}
.bar-track {{ background:var(--track); border-radius:6px; height:14px; overflow:hidden; }}
.bar-fill {{ background:var(--accent); height:100%; border-radius:6px; }}
.bar-val {{ font-variant-numeric:tabular-nums; font-size:12.5px; font-weight:600; }}
.donut {{ width:180px; height:180px; }}
.donut-wrap {{ display:flex; gap:20px; align-items:center; flex-wrap:wrap; }}
.lg {{ font-size:12.5px; margin:3px 0; }}
.dot {{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:6px; vertical-align:middle; }}
.line {{ width:100%; height:auto; }}
.line .area {{ fill:var(--accent); opacity:.12; }}
.line .ln {{ fill:none; stroke:var(--accent); stroke-width:2; }}
.line circle {{ fill:var(--accent); }}
.line .axl {{ fill:var(--muted); font-size:10px; }}
.tbl {{ width:100%; border-collapse:collapse; font-size:12.5px; }}
.tbl th,.tbl td {{ text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); }}
.tbl th {{ color:var(--muted); font-weight:600; }}
.tbl .num {{ text-align:right; font-variant-numeric:tabular-nums; }}
.tag {{ font-size:10.5px; font-weight:600; padding:2px 8px; border-radius:20px; background:var(--track); color:var(--muted); }}
.tag.warn {{ background:#fef3c7; color:#92400e; }}
.callout {{ background:var(--track); border-left:3px solid var(--accent); padding:10px 14px; border-radius:8px; font-size:12.5px; margin-top:12px; }}
.empty {{ color:var(--muted); font-style:italic; }}
code {{ background:var(--track); padding:1px 5px; border-radius:4px; font-size:12px; }}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div><h1>Token Dashboard — {proj}</h1>
    <div class="gen">Cập nhật: {gen} UTC · số liệu best-effort (lower-bound) từ transcript, không phải hóa đơn chính thức</div></div>
  </header>

  <div class="kpis">
    <div class="kpi"><div class="v">{grand}</div><div class="l">Tổng Claude (phiên chính + subagent)</div></div>
    <div class="kpi"><div class="v">{root_cost}</div><div class="l">Phiên chính · {n_sess} session</div></div>
    <div class="kpi"><div class="v">{sub_cost}</div><div class="l">Subagent · {n_sa} loại</div></div>
    <div class="kpi"><div class="v">{codex_cost}</div><div class="l">Codex (ước lượng) · {n_cx} session</div></div>
    <div class="kpi"><div class="v">{total_tok}</div><div class="l">Tổng token phiên chính</div></div>
  </div>

  <div class="grid2">
    <section class="card">
      <h2>Chi phí theo loại token</h2>
      <div class="donut-wrap">{donut}<div>{donut_legend}</div></div>
      <div class="callout"><b>Cache read = {cread_pct_tok}% token nhưng chỉ ~{cread_pct_cost}% chi phí.</b> Đọc lại cache rẻ hơn nhiều — token nhiều không đồng nghĩa tốn nhiều tiền.</div>
    </section>
    <section class="card">
      <h2>Chi phí theo ngày</h2>
      {line}
    </section>
  </div>

  <section class="card">
    <h2>Chi phí theo skill <span class="tag">{n_skill} skill có dữ liệu</span></h2>
    <p class="muted">Cần bật hook <code>PreToolUse(Skill)</code> để gán token cho từng skill. Trước khi bật, phần lớn nằm ở <code>(no-skill)</code>. Xem README để bật.</p>
    {skill_rows}
  </section>

  <section class="card">
    <h2>Chi phí theo subagent</h2>
    {sa_rows}
  </section>

  <section class="card">
    <h2>Top session tốn nhất</h2>
    {sess_rows}
  </section>

  {cx_block}

  <footer class="muted" style="margin-top:24px">
    Sinh bởi <code>.claude/scripts/token-track/token-dashboard.py</code>.
    Cập nhật số: <code>python3 .claude/scripts/token-track/token-ingest.py</code> rồi chạy lại lệnh này.
  </footer>
</div>
</body>
</html>"""


def main():
    if not os.path.exists(INDEX_PATH):
        print("[token-dashboard] Chưa có usage-index.json. Chạy token-ingest.py trước.")
        return
    d = json.load(open(INDEX_PATH, encoding="utf-8"))
    htmlout = build_html(d)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(htmlout)
    print("[token-dashboard] Đã ghi %s" % os.path.relpath(OUT_PATH, PROJECT_ROOT))


if __name__ == "__main__":
    main()
