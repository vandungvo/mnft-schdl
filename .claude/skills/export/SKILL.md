---
name: export
description: Dùng khi cần xuất gói tài liệu BA của 1 feature cho stakeholder — định dạng PDF (in/email), DOCX (Word editable), hoặc HTML (self-contained xem browser). `/export <feature>` rồi nói định dạng, hoặc `/export <feature> pdf|docx|html`.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
disable-model-invocation: true
argument-hint: "<feature> [pdf | docx | html]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /export — Stakeholder Export Package (PDF / DOCX / HTML)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Gom toàn bộ tài liệu BA của 1 feature (URD/BRD/PRD/spec/erd/flows/states/UCs/screens/API test evidence/BPMN/D2 diagrams/UI test checklist+cases/user guide link) thành __1 gói tài liệu__ cho stakeholder, theo định dạng user chọn:

| Định dạng | Dùng khi | Mermaid | Tool cần |
|---|---|---|---|
| __PDF__ | In giấy, email attachment, archive offline | pre-render PNG scale ×3 (nét cao) embed inline | `mmdc` + `pandoc` + Chrome |
| __DOCX__ | Stakeholder edit/comment/track-changes trong Word/Google Docs | pre-render PNG scale ×3 embed inline | `mmdc` + `pandoc` |
| __HTML__ | Xem nhanh trên browser (double-click), share qua email/Slack | __SVG inline render sẵn lúc build — self-contained THẬT, mở offline được__ + sidebar TOC + zoom modal | `mmdc` + `markdown-it-py` |

__Trang bìa (cover page):__ cả 3 định dạng mở đầu bằng trang bìa (tên feature, ngày xuất, phạm vi) — PDF/HTML căn giữa sang trang riêng, DOCX giữ nội dung bìa ở đầu.

> Cả 3 định dạng chạy chung 1 helper `_scripts/build-export.py --format {fmt}` — skill này chỉ chọn format + tool-check + report. KHÔNG LLM-compose file.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Chọn định dạng bằng lời__ (flag-diet) — user nói "xuất PDF cho payment" / "xuất Word" / "bản HTML"; hoặc positional `/export payment pdf`. Không rõ định dạng → hỏi 1 câu ("PDF, Word hay HTML?"), KHÔNG mặc định im lặng.
* __L1 approval__ trước Write — show output path + định dạng + size estimate.
* **Feature/SRS chưa tồn tại → REFUSE + route `/srs`** (per `feature-bootstrap.md` nhóm B). Feature không khớp folder nào HOẶC không có `srs/{feature}-spec.md` → refuse tường minh + liệt kê feature hợp lệ + route. KHÔNG tự tạo feature (export cần SRS thật làm nguồn).
* __Hard-gate tools theo định dạng đã chọn__ — thiếu tool → in lệnh install + abort, KHÔNG silent fallback:
  * PDF: `mmdc` + `pandoc` + Chrome (auto từ `~/.puppeteer-cache` do mmdc install). KHÔNG cần LaTeX/xelatex.
  * DOCX: `mmdc` + `pandoc`.
  * HTML: `mmdc` (render mermaid → SVG inline) + `markdown-it-py` (render MD → HTML lúc build). KHÔNG dùng CDN → file mở offline được.
* __Helper script driven__ — gọi `_scripts/build-export.py --format {fmt}`, KHÔNG compose tay.
* __Output__ cố định:
  * PDF: `docs/exports/{date}-feature-{slug}-package.pdf` + `docs/exports/assets/{date}-feature-{slug}/diagram-NNN.png`
  * DOCX: `docs/exports/{date}-feature-{slug}-package.docx` + assets PNG như trên
  * HTML: `docs/exports/{date}-feature-{slug}-package.html` (__self-contained THẬT — mermaid SVG + markdown render sẵn inline lúc build, KHÔNG CDN, mở offline được__)
* __Export safety__ (per `delivery-readiness.md`) — ghi file local không cần confirm; __upload/gửi ra ngoài__ phải hỏi trước. Skill chỉ ghi local.
* __Vietnamese-first__ — PDF font `DejaVu Sans`/`DejaVu Sans Mono`; DOCX pandoc Unicode OK; HTML `lang="vi"`.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __mmdc render fail 1 diagram__ — script giữ code block fallback + CONTINUE. Warn count trong report.
* __Verify HTML không phân biệt console.log/warn/error__ — Chrome `--enable-logging` ghi mọi console message cùng marker `INFO:CONSOLE` qua stderr (giới hạn thật, cần CDP/Playwright mới tách level được, không có trên máy này). Verify coi MỌI console message là đáng nghi — export HTML là văn bản tĩnh, không nên chạy JS log gì cả, nên báo cả `console.log` bình thường cũng hợp lý.
* **Verify PDF đếm trang qua `/Count` field** (không dùng `pdfinfo`/poppler — không cài trên máy này) — đây là field chuẩn PDF, Chrome print-to-pdf luôn ghi đúng.
* __Verify chỉ tối thiểu__ — không phát hiện lỗi trình bày tinh vi (layout lệch, chữ tràn bảng, màu sai). Chỉ bắt file rỗng/hỏng/vỡ rõ ràng.
* __Vietnamese font (PDF)__ — thiếu font Việt → box chars. Cần font DejaVu (mmdc/pandoc default OK).
* __HTML export offline THẬT__ — mermaid render → SVG inline + markdown render → HTML tĩnh NGAY LÚC BUILD bằng Python (`markdown-it-py` + `mmdc -e svg`). File không nạp CDN nào → stakeholder mở qua email/không mạng vẫn đủ nội dung. Zoom modal degrade nhẹ offline (không svg-pan-zoom lib → click vẫn phóng to full diagram, chỉ mất pan/zoom mượt). Khác `/preview` (vẫn online CDN, regen tại chỗ khi dev).
* **`build_viewer_html` dùng CHUNG `/preview`** — tham số `offline=True` chỉ `/export html` truyền. Sửa hàm này phải test CẢ 2: `/export html` (offline, SVG inline) + `/preview` (online CDN). Đã verify: preview giữ `OFFLINE=false` + 3 CDN như cũ.
* __Mermaid PNG scale ×3 cho PDF/DOCX__ (`mmdc -s 3`) — nét cao khi in giấy/zoom Word, đổi lại file lớn hơn (PDF ~6MB/11 diagram). Chấp nhận được cho email.
* __Header/footer động số-trang PDF: KHÔNG có__ — Chrome CLI `--print-to-pdf` không nhận custom header/footer template (chỉ Puppeteer/paged.js làm được, đã quyết KHÔNG thêm — over-engineering cho 1 BA). Danh tính tài liệu nằm ở TRANG BÌA thay thế. Giữ `--no-pdf-header-footer` (tránh URL `file://` xấu).
* __Large package__ — feature 10+ diagram + full UC → PDF/DOCX 5-20MB. OK cho email.
* __Mermaid syntax invalid__ — diagram đó fail; debug paste vào mermaid.live.
* __Existing file__ — overwrite không hỏi (timestamp trong filename mỗi ngày mới).
* __Đổi định dạng__ — chạy lại `/export {feature} {fmt-khác}`; mỗi định dạng ra file riêng, không đè nhau.
* __D2 diagrams dùng PNG có sẵn__ (`docs/{feature}/d2*/**.png`, sinh bởi `render.sh` — xem `d2-activity/SKILL.md`) — export KHÔNG tự re-render D2. Nếu `.d2` sửa mà `.png` chưa regen, package sẽ nhúng ảnh cũ; chạy lại `render.sh {file}.d2 --png` trước khi export nếu cần cập nhật.
* __User guide chỉ link, không nhúng full nội dung__ — cẩm nang vận hành (`docs/userguide/*.md`) có thể dài (nhiều trang), nhúng hết sẽ làm package phình to; package chỉ liệt kê link tới file gốc.
* __BPMN chỉ link .bpmn, không nhúng XML__ — file `.bpmn` là XML chuẩn OMG, không có ý nghĩa đọc trực tiếp trong PDF/DOCX; package hướng dẫn import Camunda/Bizagi/draw.io hoặc mở `{feature}-bpmn-editor.html`.

## Inputs

```
/export <feature>              # hỏi định dạng nếu chưa rõ
/export <feature> pdf          # PDF luôn
/export <feature> docx         # DOCX
/export <feature> html         # HTML
```

Nói bằng lời cũng được: "xuất PDF cho payment", "bản Word của user-login", "xuất HTML feature checkout".‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có SRS: !`for d in docs/*/srs/*-spec.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done | head -20`
Tool check:
  mmdc:    !`which mmdc 2>/dev/null || echo "MISSING — npm i -g @mermaid-js/mermaid-cli"`
  pandoc:  !`which pandoc 2>/dev/null || echo "MISSING — brew install pandoc (hoặc ~/bin)"`
  Chrome:  !`ls ~/.puppeteer-cache 2>/dev/null >/dev/null && echo "OK (từ mmdc)" || echo "cần cho PDF — mmdc tự cài lần đầu"`

## Approach

### Phase A — Resolve feature + format

1) __Resolve feature (nhóm B — refuse+route trước tool-check).__ No-arg → interactive picker (CHỈ list feature có `srs/{feature}-spec.md`).
   * **Feature không khớp folder nào HOẶC không có `srs/{feature}-spec.md`** → __REFUSE tường minh + liệt kê feature hợp lệ + route__:
     ```
     Chưa thể chạy /export cho `{feature}` — thiếu srs/{feature}-spec.md.
     Feature có SRS: {list features có srs/{feature}-spec.md}.
     → Chạy /srs {feature} trước để tạo SRS, rồi quay lại /export {feature}.
     ```
   * __Picker RỖNG__ (chưa feature nào có SRS) → friendly: "Chưa có feature nào sẵn sàng để export (chưa có srs/{feature}-spec.md). Chạy /srs <feature> trước."
2) __Resolve định dạng__ — từ positional arg (`pdf`/`docx`/`html`) hoặc lời user. Không rõ → hỏi "Xuất định dạng nào — PDF (in/email), Word (edit), hay HTML (xem browser)?". Wait.

### Phase B — Tool check (theo định dạng)

3) __Hard-gate tools__ cho định dạng đã chọn:
   * PDF → [mmdc, pandoc, Chrome], DOCX → [mmdc, pandoc], HTML → [python3].
   * Bất kỳ tool nào missing → in install command + abort. KHÔNG silent fallback.

### Phase C — L1 approval

4) __L1 preview:__
   ```
   [/export] Sẽ tạo {ĐỊNH DẠNG} package:
     Path:    docs/exports/{date}-feature-{feature}-package.{ext}
     Assets:  docs/exports/assets/{date}-feature-{feature}/   (chỉ PDF/DOCX — mermaid PNG)
     Engine:  {pandoc+Chrome | pandoc | _viewer_wrapper}
     Mermaid: {pre-render PNG | client-side CDN}
   Apply? (Y/n)
   ```

### Phase D — Run script

5) __Chạy:__
   ```bash
   python3 _scripts/build-export.py {feature} --format {pdf|docx|html}
   ```
   Script tự lo: compose 13-section MD (URD/BRD/PRD/SRS spec/US+AC/UC/diagrams+wireframes/OQ/traceability/__API test evidence/BPMN/D2 diagrams/UI test checklist+cases/user guide link__, mỗi mục chỉ xuất hiện nếu feature có artifact đó — không có thì ghi rõ "chưa chạy `/skill-tương-ứng`") → (PDF/DOCX) extract mermaid → `mmdc -w 1400 -b white` → PNG (D2 dùng PNG có sẵn từ `render.sh`, không render lại) → pandoc convert; (HTML) wrap `_viewer_wrapper` mermaid CDN. Cleanup intermediate.
6) __Render-verify (BẮT BUỘC, tự động, không cần skill gọi riêng)__ — script tự chạy verify tối thiểu ngay sau khi tạo file, in cảnh báo nếu có:
   * __PDF__: đếm trang qua `/Count` trong Pages tree + check tỉ lệ KB/trang bất thường (nghi ngờ nhiều trang trắng).
   * __DOCX__: validate ZIP hợp lệ + `word/document.xml` có nội dung thật (đếm text run).
   * __HTML__: mở qua Chrome headless (`--dump-dom`), check DOM không rỗng + không có console message nào (page tĩnh không nên chạy JS log/warn/error).
   * Đây là mức tối thiểu (không phải visual-regression đầy đủ) — bắt file rỗng/hỏng/vỡ rõ ràng, không phát hiện lỗi trình bày tinh vi (layout lệch, màu sai...).
7) __DỪNG.__

### Phase E — Report

8) __Output:__
   ```
   ✅ {ĐỊNH DẠNG} package: docs/exports/{date}-feature-{feature}-package.{ext} ({X} KB)
      Assets:   docs/exports/assets/{date}-feature-{feature}/ ({N} mermaid PNG)   [PDF/DOCX]
      Mermaid:  {OK} renders OK, {FAIL} failed (fallback code block)
      Verify:   {✓ OK | ⚠ N cảnh báo — liệt kê}

   Share: {gửi 1 file, PNG đã embed | mở browser double-click}.
   ```

## Output

| Format | File |
|---|---|
| PDF | `docs/exports/{date}-feature-{slug}-package.pdf` + `docs/exports/assets/{date}-feature-{slug}/diagram-NNN.png` |
| DOCX | `docs/exports/{date}-feature-{slug}-package.docx` + assets PNG như trên |
| HTML | `docs/exports/{date}-feature-{slug}-package.html` — self-contained THẬT (mermaid SVG inline, 0 CDN), không cần assets rời |

Mermaid + ảnh __pre-render thành PNG__ trước khi nhúng PDF/DOCX (2 định dạng này không render mermaid).

Chỉ ghi file local — KHÔNG tự upload đi đâu.

## References

* @../../rules/approval-gate.md
* @../../rules/naming-conventions.md
* @../../rules/feature-bootstrap.md
* @../../rules/delivery-readiness.md
* @../../../_scripts/build-export.py
* @../preview/SKILL.md (viewer nội bộ regen tại chỗ — KHÁC /export: preview không đóng dấu ngày, không cho stakeholder)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
