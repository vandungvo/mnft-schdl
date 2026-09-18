---
name: reverse-preview
description: Dùng khi cần xem bộ SRS tái lập trong docs/_reverse/{feature}/ (output của /code-to-srs hoặc /reverse-doc) dưới dạng trang HTML mở thẳng bằng trình duyệt, giữ nổi bật cột nhãn tin cậy và phần Gaps/OQ. Xem feature chính trong docs/{feature}/ thì dùng `/preview`.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
disable-model-invocation: true
context: fork
argument-hint: "[<feature>] [--out <path>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /reverse-preview — HTML Viewer cho BỘ SRS tái lập (họ reverse)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Skill chỉ gọi `_scripts/build-reverse-preview.py`. Helper compose MD content (giữ cột Nhãn) + pass qua shared
> `_scripts/_viewer_wrapper.py` → cùng HTML chrome như `/preview` + `/export` (nested TOC + mermaid zoom modal).

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Generate `docs/_reverse/{feature}/{feature}-reverse-preview.html` self-contained cho __bộ SRS tái lập__ (output
`/code-to-srs` hoặc `/reverse-doc`). Khác `/preview` ở chỗ NHẤN MẠNH những thứ đặc thù reverse:

- __Banner confidence__ đầu trang — chỉ số ✅/🔵/🟡 (parse `confidence_summary` frontmatter) + cảnh báo "CHƯA
  duyệt" + thang nhãn. Người đọc thấy ngay độ tin cậy.
- __GIỮ cột Nhãn ✅/🔵/🟡__ trong mọi bảng (KHÔNG strip — đây là giá trị cốt lõi của reverse).
- __Section Gaps & Open Questions__ nổi bật (từ `reverse-gaps.md`) — thứ BA cần chốt trước `/srs`. Mục 0
  provenance giữ trong spec.
- **Nhúng `_evidence.md`** (truy vết code→luồng: Endpoints/Errors/Cross-repo hops/cite `file:line`) — CHỈ khi
  file tồn tại (`/code-to-srs` có; `/reverse-doc` không sinh → tự bỏ qua, không lỗi).
- Nhúng flows/states/erd (mermaid) như preview thường.

Double-click HTML → browser file:// → render. KHÔNG cần server.

**Khác `/preview`:** `/preview` lo feature chính `docs/{feature}/` (SRS đang làm, có wireframe/designs).
`/reverse-preview` lo `docs/_reverse/{feature}/` (bản tái-lập-chưa-duyệt, có nhãn, KHÔNG wireframe).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Helper script driven__ — KHÔNG LLM-compose HTML. Toàn bộ logic trong `_scripts/build-reverse-preview.py` +
  `_scripts/_viewer_wrapper.py` (shared).
- __L1 approval__ trước Write — preview path + sections + size estimate.
- __Mermaid + svg-pan-zoom CDN__ cần Internet lần đầu để load library. Sau đó browser cache.
- **Nhóm B (`feature-bootstrap.md`) — refuse + route.** Feature không có trong `docs/_reverse/` HOẶC thiếu
  `{feature}-reverse-spec.md` → refuse tường minh + liệt kê feature reverse hợp lệ + route `/code-to-srs`
  (từ code) hoặc `/reverse-doc` (từ tài liệu). KHÔNG tự tạo (preview cần bộ reverse thật làm nguồn).
- __KHÔNG đụng doc nguồn__ — chỉ đọc `docs/_reverse/{feature}/` + ghi 1 file `.html`. Read-only với MD.
- __Vietnamese-first__; HTML `lang="vi"`.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Build scripts missing__ — `_scripts/build-reverse-preview.py` hoặc `_viewer_wrapper.py` không tồn tại →
  skill refuse. Restore từ repo.
- **`_evidence.md` optional** — `/reverse-doc` không sinh file này → engine tự bỏ qua section Evidence, KHÔNG
  lỗi. `/code-to-srs` có → hiện section.
- __Giữ cột Nhãn__ — đây là điểm khác `/preview` (strip nhãn). Engine KHÔNG strip cột Nhãn của reverse.
- __CDN offline__ — markdown-it + mermaid + svg-pan-zoom CDN không load → page hiện markdown thô. Cần Internet
  lần đầu.
- __Content stale__ — edit MD quên regen → preview cũ. Footer nhắc workflow.
- __Hook stale-propagation__ — `.html` không match `.md$`, hook skip.
- **KHÔNG chain sang `/srs`** — preview chỉ để XEM. Muốn hình thức hoá thì chạy `/srs {feature}` riêng.

## Inputs

```
/reverse-preview                        # interactive picker — list feature có bộ reverse
/reverse-preview <feature>              # generate cho feature reverse
/reverse-preview <feature> --out <path> # override output path
```

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Feature reverse có sẵn: !`ls docs/_reverse/*/*-reverse-spec.md 2>/dev/null | xargs -n1 dirname 2>/dev/null | xargs -n1 basename 2>/dev/null | tr '\n' ' ' || echo "(chưa có)"`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
Existing reverse previews: !`ls docs/_reverse/*/*-reverse-preview.html 2>/dev/null | tr '\n' ' ' || echo "(chưa có)"`
Build script: !`test -f _scripts/build-reverse-preview.py && test -f _scripts/_viewer_wrapper.py && echo "OK" || echo "MISSING — báo user"`

## Approach

### Phase A — Setup

1. __Verify__ `_scripts/build-reverse-preview.py` + `_scripts/_viewer_wrapper.py` tồn tại. Missing → refuse +
   suggest restore.
2. __Resolve feature (nhóm B — refuse+route).__ No-arg → interactive picker (CHỈ list feature có
   `docs/_reverse/{feature}/{feature}-reverse-spec.md`).
   - __Feature không có bộ reverse__ → __REFUSE tường minh + liệt kê + route:__
     ```
     Chưa thể chạy /reverse-preview cho `{feature}` — không có bộ reverse trong docs/_reverse/.
     Feature reverse hiện có: {list}.
     → Chạy /code-to-srs <repo> (tái lập từ code) hoặc /reverse-doc <nguồn> (từ tài liệu) trước.
     ```
   - __Picker RỖNG__ → friendly message: "Chưa có bộ reverse nào. Chạy /code-to-srs hoặc /reverse-doc trước."

### Phase B — L1 approval

3. __L1 preview:__
   ```
   [/reverse-preview] Sẽ tạo HTML viewer (bản TÁI LẬP — có nhãn ✅/🔵/🟡):
     Path:     docs/_reverse/{feature}/{feature}-reverse-preview.html
     Sections: banner confidence · spec(12 Mục, giữ Nhãn) · flows/states/erd · use cases · Gaps/OQ · evidence? · sources
     Chrome:   Nested TOC sidebar + mermaid zoom modal
     Mở:       Double-click trong Finder/Explorer
   Apply? (Y/n)
   ```

### Phase C — Run helper script

4. __CHỈ chạy lệnh duy nhất:__
   ```bash
   python3 _scripts/build-reverse-preview.py {feature} [--out {path}]
   ```
   Script tự lo: đọc `{feature}-reverse-spec.md` + gaps/sources/_evidence + srs/flows·states·erd + usecases →
   compose MD (giữ cột Nhãn, thêm banner confidence, section Gaps/Evidence) → wrap qua
   `_viewer_wrapper.build_viewer_html()` → Write `.html` → print summary.

5. __DỪNG. KHÔNG tự compose HTML, KHÔNG sed/awk__ — helper script đã handle escape an toàn.

### Phase D — Report

6. __Output report:__
   ```
   ✅ Reverse preview generated: docs/_reverse/{feature}/{feature}-reverse-preview.html
      Sections: {N} · Evidence: có/không · Size: ~{X} KB
   Mở browser: double-click trong Finder/Explorer.
   Update: edit MD trong docs/_reverse/{feature}/ → chạy /reverse-preview {feature} lại → refresh.
   ```

## Output

`docs/_reverse/{feature}/{feature}-reverse-preview.html` — viewer self-contained, mở bằng browser.

Giữ __cột Nhãn ✅/🔵/🟡__ (khác `/preview` strip nhãn) + banner confidence + section Gaps/OQ nổi bật + nhúng `_evidence.md` nếu có.

Read-only với nguồn: KHÔNG sửa file `.md` nào trong bộ reverse.

## Implementation notes

| File | Vai trò |
|---|---|
| `_scripts/build-reverse-preview.py` | Compose MD từ `docs/_reverse/{feature}/` (giữ Nhãn, banner confidence, Gaps/Evidence nổi bật), gọi shared wrapper. Skill chỉ gọi. |
| `_scripts/_viewer_wrapper.py` | Shared HTML chrome (nested TOC + mermaid zoom modal + inline svg/img). Dùng chung `/preview` + `/export` + skill này. KHÔNG sửa. |

### Vì sao skill riêng, không nhồi vào `/preview`?

Reverse có nhu cầu hiển thị KHÁC: cột Nhãn ✅/🔵/🟡 (preview thường strip), banner confidence, Gaps/OQ + Mục 0
provenance, `_evidence.md`, KHÔNG wireframe/designs. Nhồi `if reverse` vào `build-preview.py` làm engine đó rối
2 chế độ. Tách skill + engine song sinh (tái dùng `_viewer_wrapper.py`) → sạch, mỗi engine 1 vai. Dùng chung
cho CẢ `/code-to-srs` LẪN `/reverse-doc` (cùng khuôn `docs/_reverse/`).

## References

- @../../rules/approval-gate.md
- @../../rules/naming-conventions.md
- @../../rules/feature-bootstrap.md
- @../../../_scripts/build-reverse-preview.py
- @../../../_scripts/_viewer_wrapper.py
- @../preview/SKILL.md (anh em — feature chính, cùng shared wrapper)
- @../code-to-srs/SKILL.md (nguồn 1)
- @../reverse-doc/SKILL.md (nguồn 2)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
