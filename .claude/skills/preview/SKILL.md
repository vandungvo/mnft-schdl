---
name: preview
description: Dùng khi cần tạo trang HTML viewer tổng hợp mọi tài liệu MD của 1 feature (mở trực tiếp bằng trình duyệt, không cần server).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
disable-model-invocation: true
context: fork
argument-hint: "[<feature>] [--out <path>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /preview — Active Work HTML Viewer cho 1 Feature‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Skill chỉ gọi `_scripts/build-preview.py`. Helper script compose MD content + pass qua shared `_scripts/_viewer_wrapper.py` → same HTML chrome như `/export` (nested TOC + zoom modal).

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Generate `docs/{feature}/{feature}-preview.html` self-contained cho __active work__ (đang làm spec/UC/screens, cần xem nhanh):
- Overview (URD / BRD / PRD)
- SRS Spec — **mục "Flows (tóm tắt...)" trong spec được thay bằng full sequence diagram của `flows.md` ngay tại chỗ** (bỏ phần tóm tắt). File MD nguồn giữ nguyên.
- ERD
- State Diagrams (nếu có)
- Functions với __inline screens__ (wireframes group + tables group dưới mỗi UC Mục f). __Ưu tiên HTML wireframe__ (`html-wireframe/{flow-slug}.html` — render device thật, đẹp hơn); không có/không trích được screen đó → __fallback ASCII__ (`ascii-wireframe/{flow-slug}.md`). Mỗi screen gắn tag `HTML`/`ASCII` cho biết nguồn.
- Screens catalog (slim — content đã embed trong UCs)
- Designs table (Figma + HTML prototype links từ `{feature}-wireframe-index.md`)

Double-click HTML → browser file:// → render. KHÔNG cần server.

**Khác `/export`**: preview KHÔNG có Executive Summary / Stories+AC / OQs / Traceability sections — focus cái cần xem khi đang làm việc.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Helper script driven__ — KHÔNG LLM-compose HTML. Toàn bộ logic trong `_scripts/build-preview.py` + `_scripts/_viewer_wrapper.py` (shared với `/export`).
- __L1 approval__ trước Write — preview path + file count + size estimate.
- __Mermaid + svg-pan-zoom CDN__ vẫn cần Internet lần đầu để load library. Sau đó browser cache.
- **Feature/SRS chưa tồn tại → REFUSE + route `/srs`** (per `feature-bootstrap.md` nhóm B). Feature không khớp folder nào HOẶC không có `srs/{feature}-spec.md` → refuse tường minh + liệt kê feature hợp lệ + route. KHÔNG tự tạo feature (preview cần SRS thật làm nguồn).
- __Vietnamese-first__; HTML `lang="vi"`.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Build scripts missing__ — `_scripts/build-preview.py` hoặc `_scripts/_viewer_wrapper.py` không tồn tại → skill refuse. User cần restore từ repo.
- __CDN offline__ — markdown-it + mermaid + svg-pan-zoom CDN không load → page hiển thị markdown thô. Cần Internet lần đầu.
- __File size lớn__ — feature 6 UC + 8 screens + spec/erd/flows/states full ≈ 150-300KB. Browser handle OK.
- __Content stale__ — user edit MD quên regen → preview hiện cũ. Footer nhắc workflow.
- __Python3 required__ — dùng để compose + JSON-escape content. Hầu hết hệ điều hành sẵn có.
- __Cross-feature wikilinks__ — render grey text (target không nằm trong bundle).
- __Hook stale-propagation__ — `.html` không match `.md$`, hook skip.

## Inputs

```
/preview                              # interactive picker — list features có SRS
/preview <feature>                    # generate cho feature
/preview <feature> --out <path>       # override output path
```

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có SRS: !`for d in docs/*/srs/*-spec.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done | head -20`
Existing previews: !`ls docs/*/*-preview.html 2>/dev/null | head -10`
Build script: !`test -f _scripts/build-preview.py && test -f _scripts/_viewer_wrapper.py && echo "OK" || echo "MISSING — báo user"`

## Approach

### Phase A — Setup

1. __Verify__ `_scripts/build-preview.py` + `_scripts/_viewer_wrapper.py` tồn tại. Missing → refuse + suggest restore.
2. __Resolve feature (nhóm B — refuse+route).__ No-arg → interactive picker (CHỈ list feature có `srs/{feature}-spec.md`).
   - **Feature không khớp folder nào HOẶC không có `srs/{feature}-spec.md`** → __REFUSE tường minh + liệt kê feature hợp lệ + route__ (KHÔNG tự tạo, KHÔNG proceed):
     ```
     Chưa thể chạy /preview cho `{feature}` — thiếu srs/{feature}-spec.md.
     Feature có SRS: {list features có srs/{feature}-spec.md}.
     → Chạy /srs {feature} trước để tạo SRS, rồi quay lại /preview {feature}.
     ```
   - __No-arg picker RỖNG__ (chưa feature nào có SRS) → friendly message:
     ```
     Chưa có feature nào sẵn sàng để preview (chưa feature nào có srs/{feature}-spec.md).
     → Chạy /srs <feature> trước, rồi quay lại /preview.
     ```

### Phase B — L1 approval‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

3. __L1 preview:__
   ```
   [/preview] Sẽ tạo HTML viewer:
     Path:    docs/{feature}/{feature}-preview.html
     Sources: overview + spec/erd/flows?/states? + {N} UCs với inline screens + catalog + designs
     Chrome:  Nested TOC sidebar (H2 + H3 collapsible) + mermaid zoom modal (svg-pan-zoom)
     Mở:      Double-click trong Finder/Explorer
   Apply? (Y/n)
   ```

### Phase C — Run helper script

4. __CHỈ chạy lệnh duy nhất:__
   ```bash
   python3 _scripts/build-preview.py {feature} [--out {path}]
   ```

   Script tự lo:
   - Read sources (URD/BRD/PRD/spec/erd/flows/states/UCs/screens via `{feature}-wireframe-index.md`)
   - Compose 1 large MD content (8 sections active-work focus)
   - Inline screens grouped vào UC Mục f (wireframes block + tables block)
   - Pass qua `_viewer_wrapper.build_viewer_html()` → wrap với nested TOC + zoom modal
   - Write `docs/{feature}/{feature}-preview.html`
   - Print summary

5. __DỪNG. KHÔNG tự compose HTML, KHÔNG sed/awk__ — helper script đã handle escape an toàn.

### Phase D — Report

6. __Output report:__
   ```
   ✅ Preview generated: docs/{feature}/{feature}-preview.html
      Sections: overview · spec · erd · flows? · states? · {N} functions · catalog · designs
      Size: ~{X} KB

   Mở browser: double-click trong Finder/Explorer.

   Update workflow:
     - Edit MD source → save → chạy /preview {feature} lại → refresh browser.
   ```

## Output

`docs/{feature}/{feature}-preview.html` — viewer self-contained, double-click mở browser (`file://`, KHÔNG cần server).

Bundle mọi file `.md` của feature vào 1 HTML: nested TOC + mermaid render + zoom. Read-only với nguồn — KHÔNG sửa file `.md` nào.

## Implementation notes

### Files involved

| File | Vai trò |
|---|---|
| `_scripts/build-preview.py` | Compose MD content theo active-work focus, gọi shared wrapper. Skill chỉ gọi. Nhúng full `flows.md` (sequence) vào mục "Flows" của spec, thay phần tóm tắt; bỏ section "System Flows" riêng để tránh trùng. Fallback: spec không có heading Flows → vẫn render section "System Flows" riêng như cũ. |
| `_scripts/_viewer_wrapper.py` | Shared HTML chrome (nested TOC + zoom modal + design tokens) + MD utilities. Dùng chung với `/export`. |

### Why shared wrapper?

`/preview` + `/export` cần cùng UX chrome (sidebar TOC, zoom modal, design tokens, inline screens) — chỉ khác __content focus__. Tách wrapper ra shared module tránh drift giữa 2 codebases. Cập nhật UX 1 lần → cả 2 hưởng.

### Chrome features (từ shared wrapper)

- __Nested sidebar TOC__ — H2 (collapsible toggle ▾) + H3 nested. Click toggle để collapse/expand. Active section auto-highlight on scroll via IntersectionObserver (Binance Yellow background cho H2 active, grey background cho H3 active).
- __Mermaid zoom modal__ — click bất kỳ mermaid SVG → fullscreen modal với toolbar (＋ －  ⟲ ✕). `svgPanZoom` cho pan/zoom mouse + pinch. ESC close.
- __Ảnh diagram nhúng (.svg/.png) tự inline__ — `build-preview.py` phát hiện `![alt](rel.svg)` local trong flows/states/erd (vd swimlane PlantUML của `/activity-swimlane`, D2 của `/d2-*`) → đọc file, embed thẳng vào HTML (SVG bọc `<div class="mermaid">` để dùng chung zoom modal; PNG → data URI). Lý do: preview.html ở feature root nhưng ảnh ở `srs/` — path tương đối sẽ vỡ nếu chỉ để `<img src>`. Inline làm preview self-contained, path-proof, offline OK. SVG PlantUML có PI `<?plantuml?>` giữa file → builder strip mọi `<?...?>` trước khi inline.
- __Inline screens grouped (ưu tiên HTML)__ — UC Mục f wikilinks `[[../ascii-wireframe/{slug}|...]]` auto-expand thành 2 nhóm tuần tự: 🖼 Wireframes (visual sequence) → 📋 Element specifications (tables). Script tra cột "Thuộc flow" trong `{feature}-wireframe-index.md` để biết flow-slug, rồi **ưu tiên `html-wireframe/{flow-slug}.html`**: `split_html_screen_sections()` trích đúng block `<div class="wf-screen">` (frame device) + các `<tr>` desc 5 cột của screen đó, nhúng thẳng HTML (CSS `.wf-*` đã có trong viewer chrome). __Không có HTML / không trích được__ → fallback `ascii-wireframe/{flow-slug}.md` block `## Screen: {slug}` (ASCII trong ` ```text `). Mỗi screen gắn tag `HTML`/`ASCII`. Logic ở `_viewer_wrapper.inject_inline_screens()`.
  - __BẮT BUỘC làm phẳng HTML fragment__ (`_flatten_html()`) trước khi nhúng — markdown-it coi dòng thụt ≥4 space là __indented code block__, mà HTML wireframe gốc thụt sâu 12-16 space → nếu không làm phẳng sẽ hiển thị dưới dạng __code text__ thay vì render UI. `_flatten_html` bỏ newline + indent, ghép về 1 dòng phẳng → markdown-it render như HTML block.
  - **CSS lấy TỪ `<style>` GỐC của file wireframe** (`extract_scoped_wireframe_css()`), scope mọi selector dưới `.wf-embed` (bỏ reset `*`/`body`), chèn 1 lần/flow. Frame + desc bọc `<div class="wf-embed">`. → font-size/spacing **giống 100% bản `/wireframe-html`**, KHÔNG viết lại CSS tay (viết tay luôn drift + bị body preview đè → "font-size bị đổi").
- __Screen descriptions__ từ `{feature}-wireframe-index.md` section `## Descriptions ### {slug}`.
- __Designs table__ parse từ `{feature}-wireframe-index.md` `## Screens` table (cột Figma + HTML prototype).
- __Responsive__ < 768px → sidebar collapse thành topbar.

## References

- @../../rules/approval-gate.md
- @../../rules/naming-conventions.md
- @../../rules/feature-bootstrap.md
- @../../../_scripts/build-preview.py
- @../../../_scripts/_viewer_wrapper.py
- @../export/SKILL.md (cùng shared wrapper, content khác — stakeholder package)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
