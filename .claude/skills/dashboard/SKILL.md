---
name: dashboard
description: Dùng khi cần dashboard HTML trực quan tổng hợp toàn bộ workspace BA — kanban theo status, coverage/traceability thật (FR↔US↔AC↔test), tiến độ pipeline per-feature, chỉ số chất lượng/rủi ro, và action items ưu tiên. `/dashboard` hoặc `/dashboard <feature>`.
allowed-tools: Read, Write, Bash, Glob, Grep
user-invocable: true
disable-model-invocation: true
argument-hint: "[<feature>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /dashboard — BA Workspace HTML Dashboard‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Sinh 1 file HTML self-contained __đọc là hiểu liền__: mở lên biết ngay vault khỏe hay không + việc gấp nhất là gì, rồi mới tới bằng chứng chi tiết.

Nội dung trả lời 4 câu (theo thứ tự quan trọng giảm dần — cũng là thứ tự HIỂN THỊ):
1) __Vault khỏe không?__ — verdict 1 dòng (🔴/🟡/🟢) + 4 đèn sức khỏe (Coverage · Tiến độ · Độ tươi · Rủi ro). Liếc phát biết.
2) __Việc gấp nhất?__ — top 5-6 action ưu tiên P0→ kèm lệnh chạy.
3) __Từng feature đi tới đâu?__ — tiến độ pipeline URD→…→test per feature, feature yếu lên trước.
4) __Lỗ hổng & rủi ro chi tiết?__ — FR chưa phủ, US mồ côi, UC chưa test, doc mục, review quá hạn, OQ. Để BA đào khi cần.

> __Nguyên tắc report tốt (BẮT BUỘC theo):__ kết luận lên trên, bằng chứng xuống dưới. Đầu trang = 1 verdict + 4 đèn màu (không bắt user tự cộng số để đoán). Feature/việc __có vấn đề xếp trước__ feature ổn. Giọng cho BA làm việc: giữ mã FR/US/UC thật + lệnh chạy, KHÔNG giấu số sau thuật ngữ. Đừng mở đầu bằng chart trang trí — chart phục vụ kết luận, không thay kết luận.

> Đây là skill DUY NHẤT cho việc quan sát trạng thái vault (skill `/health` console đã bỏ 2026-07-13 — dashboard này thay thế hoàn toàn). Các số liệu cấu trúc trùng nhau (__counts/coverage/orphans/stale__) lấy DETERMINISTIC từ Knowledge Graph trước; `_scripts/workspace-status.py` chỉ giữ metric KG chưa có và là fallback flow cũ khi KG lỗi. Verdict/đèn vẫn phải deterministic từ data model đã ghép, KHÔNG tự chấm bằng prompt (2 lần chạy phải ra cùng verdict).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __L1 approval__ trước Write (file generated, vẫn tính action).
* __Output path theo scope__ — project-wide: `docs/_shared/dashboard.html` (re-run overwrite). Per-feature: `docs/_shared/dashboard-{feature}.html` (path RIÊNG, KHÔNG đè bản project-wide, để `/dashboard <feature>` không xoá mất global view).
* __Self-contained__ — chỉ depend __ECharts__ (1 CDN) cho charts + __List.js__ (1 CDN) cho filter/sort bảng. Mọi data inline trong file. Chart.js đã bỏ (2026-07-13) — ECharts có sẵn native funnel + heatmap + graph mà Chart.js phải thêm plugin.
* __Read-only data scan__ — KHÔNG edit doc nào. Chỉ scan qua engine + đọc thêm 1 số marker body. L1 chỉ cho Write file HTML cuối.
* __Nguồn số liệu có phân vai__ — `kg counts`/`kg coverage`/`kg orphans` là nguồn chính cho counts, coverage, orphan và stale; `_scripts/workspace-status.py` chỉ bổ sung pipeline/freshness/quality/action items cùng các metric KG chưa biểu diễn. Nếu bất kỳ query KG nào `KG-ERROR` hoặc exit ≠ 0, chạy lại flow cũ bằng `workspace-status.py` cho toàn bộ phần metric trùng lặp. KHÔNG suy diễn lại con số bằng prompt (tránh dashboard lệch với engine).
* __Vietnamese-first UI__ — labels/headers tiếng Việt; doc titles giữ ngôn ngữ gốc.
* __Theme-aware__ — dark mode toggle (CSS variables 2 tầng + localStorage + `prefers-color-scheme`).
* __Graceful degradation__ — CDN offline → kanban + tables vẫn hiện, chỉ charts không render. Không crash.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Verdict/đèn là DETERMINISTIC__ — đọc thẳng `health.verdict` + `health.lights` từ JSON, KHÔNG tự chấm màu bằng prompt (2 lần chạy phải ra cùng kết quả; ngưỡng đèn định ở `compute_health` trong engine). Verdict tổng = đèn tệ nhất quyết định (1 đỏ → cả vault đỏ).
* __Kết luận trên, chart dưới__ — nếu định thêm chart, KHÔNG đặt nó trên verdict/việc-gấp. Chart trang trí đầu trang = phản mục tiêu "nhìn là hiểu liền".
* **Coverage `null` ≠ 0%** — feature chưa có FR (chưa /srs) trả `coverage_pct=null` → "—" xám, KHÔNG "0% đỏ" (0% chỉ đúng khi CÓ FR mà chưa US nào phủ, vd vocabulary-flashcard 15 FR / 0 US = 0% thật).
* __Sort để vấn đề lên trước__ — pipeline sort `pct` tăng dần, coverage sort `coverage_pct` tăng dần, action_items đã sort P0→. Feature ổn (100%/xanh) nằm cuối — user không phải cuộn tìm chỗ yếu.
* __Naming cũ vs mới__ — engine đã chịu cả `srs/spec.md` (demo cũ) lẫn `srs/{feature}-spec.md`. Dashboard chỉ đọc JSON.
* __Feature folder nhiễu__ — engine đã loại folder rỗng / chỉ brainstorm / meta (`guides`, `userguide`) khỏi `pipeline` + `coverage`.
* __Self-contained ưu tiên__ — bố cục mặc định chỉ cần HTML+CSS (bar/card), KHÔNG cần CDN. Chỉ thêm ECharts/List.js khi thật sự thêm giá trị, kèm guard `if(window.echarts)` để offline không vỡ.
* __Empty vault__ (`total_docs==0`) — verdict "Vault rỗng — chưa có gì để đánh giá" + "Bắt đầu với `/urd <feature>` hoặc `/brainstorm`." KHÔNG bịa đèn/số.
* __Many docs (>200)__ — chi tiết (kanban/quality list) cap ~30 dòng + "…+N more". Verdict/đèn/việc-gấp KHÔNG cap (đó là điểm nhấn).
* __Feature filter__ — `<feature>` render coverage/pipeline chỉ feature đó; verdict/đèn tính trên scope đó.
* __Frontmatter parse fail__ — engine skip doc lỗi (không crash); dashboard chỉ render những gì JSON trả.

## Inputs

```
/dashboard              # project-wide dashboard
/dashboard <feature>    # scope 1 feature (vd /dashboard authentication)
```

Feature không tồn tại / vault rỗng → theo `feature-bootstrap.md` Nhóm C: friendly empty-message, KHÔNG bịa data.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Project name: !`basename $(pwd)`
Total docs: !`find docs -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' '`
Feature folders: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -vE '^(_|meetings|inbox|cr|exports|reports|guides|userguide)' | head -12`

## Approach

1) __Resolve scope + output path.__ No-arg → project, `docs/_shared/dashboard.html`. `<feature>` → filter, `docs/_shared/dashboard-{feature}.html`.

2) __Lấy metric cấu trúc từ KG trước__, rồi ghép vào data model dashboard hiện tại để **không đổi format `dashboard.html`**:
   ```bash
   node .claude/skills/kg/engine/kg-query.mjs counts [--feature <slug>] --all
   node .claude/skills/kg/engine/kg-query.mjs coverage <feature> --all
   node .claude/skills/kg/engine/kg-query.mjs orphans [--feature <slug>] --all
   ```
   * No-arg: chạy `counts` + `orphans` toàn workspace, rồi `coverage <feature>` cho từng feature trong scope. Có `<feature>`: truyền cùng scope vào `counts`/`orphans` và chỉ chạy coverage của feature đó.
   * `counts` là nguồn chính cho node/count; riêng stale lấy dòng **`Doc status=stale (stale_docs)`** (engine tách stale-DOC khỏi stale-node-artifact — dashboard/health đo theo đơn vị doc, KHÔNG dùng dòng "Node status=stale mọi loại"); `coverage` là nguồn chính cho FR/US/UC coverage và danh sách mã gap; `orphans` là nguồn chính cho node/doc mồ côi. Chuẩn hóa các output này vào các field dashboard đang dùng, không đổi section, path hay HTML format.
   * `workspace-status.py` chỉ cung cấp các khối KG chưa có (`pipeline`, `freshness`, `quality`, `action_items`, raw card data và phần health cần metric ngoài KG); không được ghi đè counts/coverage/orphans/stale lấy từ KG. Nếu query KG bất kỳ trả `KG-ERROR` hoặc exit ≠ 0, bỏ data KG và chạy lại flow cũ nguyên vẹn:
     ```bash
     python3 _scripts/workspace-status.py [--feature <slug>]
     ```
   * Nếu output có `⚠ còn N mục — chạy với --all` thì bắt buộc chạy lại đúng query với `--all` trước khi tổng hợp. Nếu output có mục `Phải Read tay (ngoài graph)`, phải Read các file đó trước khi dùng metadata liên quan. `KG-ERROR` hoặc exit ≠ 0 thì fallback flow cũ bằng Read/grep và `workspace-status.py`, không suy diễn từ kết quả KG một phần.
   * Graph chỉ cấp cấu trúc/đếm; mọi title, stale-chain hoặc nhận định cần nội dung vẫn lấy từ prose đã Read, không lấy từ facts.

3) __Đọc bổ sung tối thiểu__ (chỉ những gì KG/data model không tính vì cần đọc sâu body):
   * Doc title: H1 đầu tiên mỗi file (cho card kanban + drill-down).
   * Stale chain tree: parse `docs/_shared/staleness.md` (nếu có) → cây upstream→downstream cho section Stale.
   * KHÔNG nhân đôi counts/coverage/orphans/stale đã lấy từ KG.

3) __Đọc bổ sung tối thiểu__ (chỉ những gì engine KHÔNG tính vì cần đọc sâu body):
   * Doc title: H1 đầu tiên mỗi file (cho card kanban + drill-down). Engine chỉ có path.
   * Stale chain tree: parse `docs/_shared/staleness.md` (nếu có) → cây upstream→downstream cho section Stale.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   * KHÔNG nhân đôi coverage/pipeline/health — đã có từ JSON.

4) __Compose HTML__ — sections theo thứ tự QUAN TRỌNG GIẢM DẦN (kết luận trên, bằng chứng dưới):
   1) __Header__ mỏng — project · docs/feature/US/AC · timestamp · dark-mode toggle. KHÔNG nhồi stat bar dày ở đây (verdict lo việc "khỏe không").
   2) __Verdict banner__ — icon lớn 🔴/🟡/🟢 + `health.verdict.title` + `summary`. Border trái màu theo level. Đây là dòng đầu user đọc.
   3) __4 đèn sức khỏe__ — grid 4 thẻ từ `health.lights`: nhãn + `metric` to (màu theo `light`) + `detail`. Liếc phát biết mảng nào đỏ.
   4) __⚡ Việc gấp nhất__ — top 5-6 `action_items` (đã sort P0→): pill ưu tiên + mô tả + `code` lệnh chạy. Dư thì "… và N việc khác".
   5) __🚦 Tiến độ từng feature__ — mỗi feature 1 hàng: tên + 8 ô giai đoạn (đậm=có artifact, nhạt=chưa) + % (màu theo ngưỡng). __Sort % tăng dần — feature yếu lên trước.__ Đọc thẳng, KHÔNG cần chart.
   6) __🎯 Lỗ hổng truy vết__ — mỗi feature 1 card: coverage% + thanh bar + liệt kê FR chưa phủ / US mồ côi / UC chưa test (mã thật). __Feature coverage thấp lên trước.__
   7) __⚠️ Chất lượng & rủi ro (chi tiết)__ — grid: review quá hạn · OQ tồn đọng/feature · doc mục <40đ · doc thiếu links. Phần để BA đào.
   8) __📋 Kanban — tài liệu theo trạng thái__ — 5 cột (Draft/In Review/Revisions/Approved/Shipped) từ `docs[].kanban_col`; card = type + feature + tuổi + badge stale. Cột dùng `kanban_col` (engine đã map status lạ về cột chuẩn), KHÔNG dùng `status` thô. Chỉ doc feature-level (bỏ inbox/meeting project-level). Cap ~12 card/cột + "… +N nữa".
   9) __Open CRs + Stale chain__ — bảng/collapse cuối trang (chi tiết vận hành).
   10) __Footer__ — regen instruction + last run.

   > __Charts là tùy chọn, KHÔNG bắt buộc & KHÔNG đứng đầu.__ Thanh bar CSS thuần (pipeline row, coverage bar) đọc dễ hơn heatmap 1-cột. Dùng ECharts CHỈ khi thêm giá trị thật (vd donut status distribution, hoặc funnel khi >8 feature) — và luôn đặt SAU verdict + việc gấp. Ưu tiên self-contained: nếu chỉ cần bar/card thì bỏ luôn CDN (demo tham chiếu `scratchpad/dashboard-demo.html` không dùng CDN nào).

5) __L1 approval__ preview:
   ```
   📊 Dashboard sẽ tạo: docs/_shared/dashboard{-feature}.html
     Scope: {project | feature}
     Bao gồm: {N} docs · {F} feature · coverage TB {X}% · {K} FR chưa phủ · {M} action items · {C} CRs
     Re-gen overwrite file cũ (~{size} KB)
   Apply? (Y / sửa)
   ```

6) __Write HTML__ file. KHÔNG modify source docs.

7) __Output report__ — path + "double-click mở browser" + 3 điểm nổi bật (vd "coverage TB 68% · premium-payment 5 FR chưa phủ · 15 doc freshness <40"). Scope feature → nhắc "Xem global: `/dashboard`".

## Output

| Scope | File |
|---|---|
| Toàn dự án | `docs/_shared/dashboard.html` |
| 1 feature | `docs/_shared/dashboard-{feature}.html` (path RIÊNG, KHÔNG đè bản project-wide) |

HTML double-click mở browser. __Data inline trong file__; riêng ECharts (charts) + List.js (filter/sort) nạp qua __CDN__ — cần mạng lần đầu.

Số liệu lấy từ KG (`docs/_shared/kg/graph.json`) + `_scripts/workspace-status.py` — skill KHÔNG tự tính tay.

## Metric definitions (để render đúng, không bịa)

| Metric | Nguồn JSON | Ý nghĩa hiển thị |
|--------|-----------|------------------|
| Coverage % | `coverage[].coverage_pct` | % FR có ≥1 US trỏ tới. `null` = feature chưa có FR (chưa /srs) → hiện "—", KHÔNG hiện 0%. |
| FR uncovered | `coverage[].fr_uncovered` | FR không US nào phủ → gap thật, badge đỏ. |
| US orphan | `coverage[].us_orphan` | US không trỏ FR nào → mồ côi ngược, badge cam. |
| UC untested | `coverage[].uc_untested` | UC không có checklist/testcase → test gap. |
| Pipeline % | `pipeline[].pct` | Số giai đoạn có artifact / 8. |
| Furthest stage | `pipeline[].furthest_stage` | Giai đoạn xa nhất đạt được — dùng cho funnel & "bottleneck". |
| Freshness | `freshness.docs[].score` | 100 = mới; -1/ngày sau 7 ngày ân hạn; stale ép trần 20. `null` = không có `updated`. |
| Review overdue | `quality.review_overdue` | Doc `in-review` > 7 ngày. |
| Open questions | `quality.open_questions` | OQ chưa resolve, group theo feature. |

__Màu ngưỡng__ (dùng chung verdict/đèn/bar): coverage 100% xanh · ≥60% vàng · <60% đỏ. Pipeline ≥75% xanh · ≥40% vàng · <40% đỏ. `coverage_pct=null` (chưa có FR) render "—" xám, KHÔNG 0% đỏ.

## HTML — template tham chiếu (build từ JSON theo bố cục 9 mục ở Approach)

> __Đã có 1 bản mẫu hoàn chỉnh chạy được:__ `scratchpad/dashboard-demo.html` (generator `scratchpad/build_dashboard_demo.py`). Nó render đúng bố cục verdict → 4 đèn → việc gấp → pipeline → coverage → chất lượng, self-contained KHÔNG CDN, có dark mode. Khi chạy skill thật, LLM compose HTML cùng cấu trúc đó với data JSON hiện tại. Dưới là khung tối giản để không lệch:

```html
<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>BA Dashboard — {{project}}</title>
<style>
:root{ --bg:#f6f8fa;--panel:#fff;--text:#24292e;--muted:#6a737d;--border:#e1e4e8;
       --red:#d73a49;--amber:#dbab09;--green:#28a745;--track:#eaecef; }
[data-theme="dark"]{ --bg:#0d1117;--panel:#161b22;--text:#c9d1d9;--muted:#8b949e;--border:#30363d;--track:#21262d; }
body{font-family:-apple-system,system-ui,sans-serif;margin:0;background:var(--bg);color:var(--text)}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}
/* verdict banner · hgrid 4 đèn · urgent list · prow pipeline · covcard · qgrid — xem demo cho full CSS */
</style></head><body>
<header>…project · docs/feature/US/AC · timestamp · <button onclick="toggleTheme()">🌓</button></header>
<div class="wrap">
  <!-- 1. VERDICT: icon lớn + health.verdict.title + summary, border trái màu level -->
  <div class="verdict" style="border-left:6px solid var(--{{level}})">{{icon}} {{verdict_title}} — {{summary}}</div>
  <!-- 2. 4 ĐÈN từ health.lights: nhãn + metric to (màu light) + detail -->
  <div class="hgrid">{{light_cards}}</div>
  <!-- 3. VIỆC GẤP: top 5-6 action_items, pill P0/P1 + text + code lệnh -->
  <h2>⚡ Việc gấp nhất</h2><ul class="urgent">{{urgent_rows}}</ul>
  <!-- 4. PIPELINE: mỗi feature 1 hàng, 8 ô on/off + %, sort % TĂNG dần -->
  <h2>🚦 Tiến độ từng feature</h2>{{pipeline_bars}}
  <!-- 5. COVERAGE: card/feature, bar + FR chưa phủ/US mồ côi/UC chưa test, sort coverage TĂNG -->
  <h2>🎯 Lỗ hổng truy vết</h2><div class="covgrid">{{coverage_cards}}</div>
  <!-- 6. CHI TIẾT: review overdue · OQ · doc mục · thiếu links -->
  <h2>⚠️ Chất lượng & rủi ro</h2>{{quality_lists}}
  <!-- 7. KANBAN: 5 cột từ docs[].kanban_col, card type+feature+tuổi+badge stale -->
  <h2>📋 Kanban — tài liệu theo trạng thái</h2><div class="kanban">{{kanban_cols}}</div>
</div>
<footer>Regen: <code>/dashboard{{scope_arg}}</code> · {{datetime}}</footer>
<script>
(function(){const s=localStorage.getItem('ba-theme');
document.documentElement.setAttribute('data-theme',s||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));})();
function toggleTheme(){const n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
document.documentElement.setAttribute('data-theme',n);localStorage.setItem('ba-theme',n);}
</script></body></html>
```

__Render note:__
* __Verdict + đèn__: đọc thẳng `health.verdict` + `health.lights` — KHÔNG tự tính lại màu/verdict (engine đã chấm deterministic).
* __Việc gấp__: `action_items` đã sort P0→; lấy 6 đầu, phần dư ghi "… và N việc khác".
* __Pipeline bar__: 8 ô = 8 giai đoạn `stages_present`; ô on = đậm xanh, off = xám. Sort feature theo `pct` tăng dần (yếu lên trước).
* __Coverage card__: sort theo `coverage_pct` tăng dần. Liệt kê mã thật từ `fr_uncovered`/`us_orphan`/`uc_untested` (cắt ~5 mã đầu + "…").
* __Kanban__: gom `docs[]` (chỉ `has_lifecycle && feature`) theo `kanban_col` vào 5 cột; card sort stale-trước rồi cũ-trước. Dùng `kanban_col` KHÔNG dùng `status` thô (status demo lạ như `captured`/`done`/`active` đã map sẵn về cột chuẩn trong engine).
* __Chart chỉ thêm khi có giá trị__ (donut status, funnel khi >8 feature) — đặt SAU, KHÔNG thay thanh bar CSS. Nếu dùng ECharts thì thêm CDN + guard `if(window.echarts)`.

## References

* @../../rules/kg-usage.md (KG: nguồn số liệu counts/coverage/orphans — fallback workspace-status.py)
* @../../rules/naming-conventions.md
* @../../rules/status-lifecycle.md
* @../../rules/delivery-readiness.md
* @../../rules/approval-gate.md
* @../../rules/feature-bootstrap.md
* @../../kg/SKILL.md (KG là nguồn chính cho counts/coverage/orphans/stale; graph chỉ chọn/đếm cấu trúc, không thay prose)
* @../../../_scripts/workspace-status.py (nguồn bổ sung pipeline/freshness/quality/action_items và fallback flow cũ khi `KG-ERROR`/exit ≠ 0)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
