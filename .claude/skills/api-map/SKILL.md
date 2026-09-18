---
name: api-map
description: Dùng khi cần lập bảng mapping field 3 tầng (API field ↔ system entity ↔ UI field) cho 1 feature tích hợp API.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[--feature <slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /api-map — Mapping API ↔ System ↔ UI‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Dựng __bảng truy vết field 3 tầng__ cho 1 feature tích hợp: mỗi field API trả về → thông tin gì trong hệ thống → hiển thị ở đâu trên màn hình → biến đổi/validation gì. __Output duy nhất__: `docs/{feature}/integration/api-map.md`.

Là tư duy traceability (họ hàng `/gap`) nhưng trace __field__ thay vì FR↔US↔AC. Giá trị: (1) làm `/wireframe-ascii` dựng được màn hình từ cột "UI field"; (2) cho QC nguồn viết test case "API trả X thì UI hiện Y"; (3) phát hiện gap sớm.

> **Vị trí trong pipeline (Mục 2 `api-integration.md`):** `/api-map` là __field-mapping — 1 THÀNH PHẦN của Integration Blueprint__ (`/api-design`), KHÔNG phải nhánh mồ côi. Nó lo tầng *field* (data A vào thuộc tính nào, hiện ở đâu); blueprint lo tầng *orchestration* (hệ thống phối hợp thế nào — state/webhook/retry/reconciliation). Có thể chạy song song về thực thi, NHƯNG phải **hội tụ vào blueprint TRƯỚC khi chốt `/api-checklist`** (field mapping ảnh hưởng trực tiếp validation/enum/transformation test). Chưa có `api-design.md` → vẫn chạy được, nhưng gợi ý `/api-design` để gắn field-map vào bức tranh tích hợp tổng.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __1 output cố định__ — `docs/{feature}/integration/api-map.md`. File đã tồn tại → tự động chuyển sang update mode (L2 diff), không refuse.
* __Đọc nguồn, không bịa field__ — mọi row phải truy về `api-summary.md` (API) + `srs/{feature}-erd.md` (system) + screen specs (UI) nếu có.
* __Gap detection bắt buộc__ — flag field API chưa có chỗ hiển thị + UI cần field API không cung cấp.
* __IT-BA framing__ — cột "biến đổi" mô tả nghiệp vụ ("chia 100 → định dạng tiền", "map `succeeded` → 'Đã kích hoạt'"), KHÔNG bàn kiểu dữ liệu DB.
* __L1 approval__ trước Write. __L2 diff__ khi file đã tồn tại (update mode tự động).
* __Cross-link__ — frontmatter `links:` trỏ tới `api-summary.md` + `srs/{feature}-erd.md` + screens liên quan.
* __Vietnamese-first__.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Chưa có ERD/screens__ — vẫn map được 2 tầng (API ↔ UI đề xuất), cột system ghi `—` + note. Không block.
* __Field lồng nhau__ (object trong object) — flatten bằng dot path (`error.code`), không vẽ cây.
* __Enum field__ (status) — liệt kê từng giá trị → nhãn UI tương ứng trong cột biến đổi (đây là phần quan trọng nhất cho UI).
* __Đừng im lặng bỏ gap__ — gap là giá trị chính của skill; luôn nêu ở Mục 3 kể cả khi user không hỏi.
* __Update mode giữ row cũ__ — file đã tồn tại chỉ thêm/sửa row liên quan, L2 diff cho phần thay đổi.

## Inputs

```
/api-map                          # interactive: pick feature nếu mơ hồ
/api-map --feature premium-payment
```

`--feature` không bắt buộc — auto-detect từ ngữ cảnh (feature đang làm dở), mơ hồ mới hỏi picker. `api-map.md` đã tồn tại → tự động vào update mode, muốn sửa thì gọi lại skill và nói cần đổi gì.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
api-summary có sẵn: !`for d in docs/*/integration/api-summary.md; do [ -f "$d" ] && echo "$d"; done | head -10`
ERD/screens của features: !`for d in docs/*/srs/*-erd.md; do [ -f "$d" ] && echo "$d"; done | head -10`

## Approach

1) __Parse args__ — `--feature` optional, auto-detect từ ngữ cảnh; mơ hồ → prompt picker.
2) __Đọc nguồn:__
   * __Nguồn field theo lane__ (như các skill khác trong họ, `api-integration.md` Mục 3):
     * __3rd-party__: `docs/{feature}/integration/api-summary.md` — lấy field từ bảng thao tác + output. Thiếu → soft gate warn, suggest `/api-doc` trước.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
     * __own API__: `docs/{feature}/srs/{feature}-spec.md` + `srs/{feature}-erd.md` — field từ FR/entity nội bộ (KHÔNG cần api-summary; đó là doc cho API đối tác). Đây là nhánh own, KHÔNG warn thiếu api-summary.
   * `docs/{feature}/srs/{feature}-erd.md` (nếu có) — system entity.attr để map tầng giữa.
   * `docs/{feature}/ascii-wireframe/*.md` (gộp theo flow) + `{feature}-wireframe-index.md` (nếu có) — UI field hiện có, mỗi file chứa nhiều screen (đọc từng screen-section bên trong).
3) __Dựng bảng mapping__ — mỗi field API 1 row:
   | API field | Kiểu/nguồn | System entity.attr | UI field (màn hình) | Biến đổi/validation | Ghi chú nghiệp vụ |
   * System chưa có entity → ghi `—` + note "cần bổ sung ERD".
   * UI chưa có chỗ hiện → ghi `(chưa có)` → đây là gap.
4) __Phát hiện gap__ — quét 2 chiều:
   * API field không map được sang UI nào → liệt kê "field thừa / chưa dùng".
   * UI field cần dữ liệu mà API không trả → liệt kê "thiếu nguồn".
   * Error code (từ api-summary Mục 4) chưa có UI xử lý → flag.
5) __L1 plan preview__ (prose BA-facing) — path + N field map + K gap phát hiện. Apply? (Y/sửa).
6) **Write `api-map.md`** frontmatter chuẩn (`type: api-map`, `feature`, `status`, `updated`, `links: [api-summary, erd, screens...]`). Body:
   * __Mục 1 — Bảng mapping__ (per thao tác/endpoint, mỗi cái 1 bảng con).
   * __Mục 2 — Mapping lỗi__: error code → UI xử lý (badge/toast/màn riêng).
   * __Mục 3 — Gap phát hiện__: danh sách + đề xuất xử lý.
   * __Mục 4 — Câu hỏi mở__.
7) __Activity log__ — trước Write set env `CLAUDE_SKILL_NAME=/api-map` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=mapping {N} field, {K} gap` (≤80 ký tự); hook ghép cả dòng vào `docs/_shared/changelog.md` — KHÔNG nhét lịch sử vào chính `api-map.md`.
8) __Output report:__
   ```
   ✅ Mapping: docs/{feature}/integration/api-map.md
      Field map: {N} | Gap: {K}

   Next:
     - /api-design --feature {feature}   — HỘI TỤ field-map vào Integration Blueprint TRƯỚC /api-checklist (nếu api-design.md đã có → cập nhật lại; chưa có → chạy để gắn field-map vào bức tranh tích hợp tổng)
     - /wireframe-ascii {feature}   — dựng màn hình từ cột UI field
     - /sequence "<flow>" --feature {feature}     — vẽ luồng tích hợp
     - Xử lý {K} gap ở Mục 3 (nếu có)
   ```

> **Gate hội tụ (`api-integration.md` Mục 2):** `/api-map` KHÔNG phải nhánh mồ côi — field-map ảnh hưởng validation/enum/transformation test, nên phải **hội tụ vào `api-design.md` TRƯỚC khi chốt `/api-checklist`**. Luôn nhắc bước `/api-design` ở Output để BA đóng vòng này.

## Output

`docs/{feature}/integration/api-map.md` — bảng mapping field 3 tầng API ↔ entity ↔ UI (`type: api-map`).

Hội tụ dưới `api-design.md` trước khi chốt `/api-checklist`. Hook tự ghi `docs/_shared/changelog.md`.

## References

* @../../rules/api-integration.md
* @../../rules/approval-gate.md
* @../../rules/feature-bootstrap.md
* @../../rules/ba-conventions.md
* @../../rules/naming-conventions.md
* @../../rules/resolve-oqs.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
