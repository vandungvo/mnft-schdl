---
name: gap
description: Dùng khi cần kiểm 1 tính năng CÒN THIẾU LUỒNG NGHIỆP VỤ GÌ (vào được trạng thái mà không ra được, có hành động mà thiếu chiều ngược, nhánh error/edge chưa phủ) — kèm ma trận truy vết. `/gap <feature>` hoặc `/gap` (chọn feature) hoặc `/gap --product` (đối chiếu Feature Map ↔ Roadmap).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
user-invocable: true
argument-hint: "[<feature>] | --product"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /gap — Tính năng này còn thiếu luồng gì?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Trả lời **đúng một câu hỏi**: *"trong tính năng này, AI/BA đã bỏ sót luồng nghiệp vụ nào?"* — vd "có luồng khóa tài khoản sau 5 lần sai, nhưng **không có luồng mở khóa**", "có happy path thanh toán, **thiếu nhánh thẻ bị từ chối giữa chừng**".

Đây là **gap nghiệp vụ**, KHÔNG phải kế toán ID. "FR-003 chưa có user story" là thông tin phụ, xếp sau — không phải thứ BA hỏi khi gõ `/gap`.

Thứ tự report phản ánh đúng thứ tự đó:

```
## 1. Thiếu luồng nghiệp vụ   ← CHÍNH  (engine thuật toán + @flow-reviewer đọc prose)
## 2. Nhánh/case chưa phủ     ← CHÍNH  (@flow-reviewer: happy/error/edge, màn dead-end)
## 3. Thiếu liên kết ID/file  ← PHỤ    (kg coverage anti-join)
## 4. Ma trận truy vết        → ghi docs/_shared/traceability.md
```

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Hai nguồn, hai vai — KHÔNG trộn:**
  * **Engine `flowgap.mjs`** = thuật toán xác định trên graph → chắc ở phần topology (dead-end/reachability), nhưng phần khớp-chữ (reverse-pair/CRUD) vẫn có false-positive nên chỉ là *ứng viên* (xem Chống bịa mục 5). Chỉ thấy cái đã vẽ thành state machine.
  * **`@flow-reviewer`** = đọc prose (UC/userflow/screen) → thấy nhánh nghiệp vụ ngoài state machine, nhưng phải trích được câu gốc làm bằng chứng.
* **Quy tắc vàng KG** — graph để CHỌN file + đếm cấu trúc; mọi kết luận nội dung LUÔN dựa trên prose đã Read (`@../../rules/kg-usage.md`).
* **CHỐNG BỊA (quan trọng nhất)** — xem Mục "Chống bịa" dưới. Mọi finding phải kèm evidence `file:line`. Không có evidence → không được in.
* **Lifecycle-aware** — phân biệt *chưa tới bước* (im lặng) / *thiếu thật* (blocking) / *mâu thuẫn* (blocking). Xem Mục "Ba nhãn".
* **L1 approval** trước Write.
* **Read-only với doc feature** — `/gap` chỉ báo cáo, KHÔNG tự sửa doc. Muốn sửa → `/cr`.
* **Singleton output** — `docs/_shared/traceability.md`, append/replace section per-feature.
* **Override** — `<!-- gap-ignore: rule-name -->` trong body hoặc frontmatter `gap_ignore: [rule-name]`.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Engine im lặng ≠ không có gap.** `flowgap` chỉ thấy state machine. Feature không có `states.md` → engine trả rỗng, nhưng luồng vẫn có thể thiếu → phải dựa `@flow-reviewer` đọc prose. Đừng báo "sạch" khi mới chạy engine.
* **`dead-end-likely-terminal` là nhiễu có ích, không phải lỗi.** `used`/`expired`/`revoked` không có đường ra thường là đúng nghiệp vụ — tài liệu chỉ thiếu `X --> [*]`. In ở mức yếu + gợi ý bổ sung `--> [*]`, đừng bắt BA giải trình.
* **`unreachable` phần lớn là initial state.** Engine đã tôn trọng cờ `is_initial` (từ `[*] --> X`). Còn báo unreachable = state thật sự không ai vào được → đáng xem.
* **Vault demo:** `docs/` hiện là demo skill cũ (memory `project_vault_demo_rebuild`) — nhiều doc thiếu `traces_to`, sinh gap giả. Đây là **lỗi dữ liệu demo, không phải lỗi feature**. Đừng đề xuất migrate demo.
* **Empty `docs/`** → "chưa có feature nào, bắt đầu với `/brainstorm` hoặc `/urd`".
* **Feature folder rỗng** → friendly message, abort.
* **ID format cũ** (`FR-001` không prefix feature) → normalize on-the-fly + flag warning.
* **Regen marker** — `traceability.md` là artifact auto-gen trong `_shared/`: chỉ cập nhật `updated:`, KHÔNG ghi changelog.md.
* **KHÔNG còn rule "Owner conflict"** (bỏ 2026-07-16) — field `owner:` đã bị bỏ khỏi frontmatter từ 2026-07-12; 0 template/skill nào còn sinh ⇒ rule không thể fire cho doc mới. "Ai làm" sống ở cột `@author` của `changelog.md`.

## Inputs

```
/gap <feature>     # kiểm 1 feature
/gap               # picker chọn feature
/gap --product     # đối chiếu Feature Map ↔ Roadmap (project-level, tách biệt)
```

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | head -20`

## Ba nhãn — đừng biến cảnh báo thành nhiễu

Feature đang discovery mà bị in blocking "CAP P0 chưa có FR" → BA học cách phớt lờ output. Đó là cách giết công cụ nhanh nhất. Mỗi finding phải gắn đúng 1 nhãn:

| Nhãn | Khi nào | Cách in |
|---|---|---|
| **Chưa tới bước** | Artifact downstream chưa đến phase (feature mới có brainstorm/URD, chưa có US là bình thường) | **IM LẶNG** — không in |
| **Thiếu thật** | Artifact upstream ĐÃ có, downstream đáng lẽ phải có mà không có (SRS approved mà 0 US) | blocking |
| **Mâu thuẫn** | 2 doc nói ngược nhau (đã Read prose cả 2) | blocking |

Suy phase từ artifact có thật trong feature, KHÔNG so mọi feature với ma trận đầy đủ.

## Chống bịa (bắt buộc)

1. **Không có nguồn → không đoán.** Feature chưa có `states.md` → in rõ *"chưa có state machine nên không soi được luồng trạng thái"* + route `/state`. Chưa có userflow → route `/user-flow`. **TUYỆT ĐỐI không** suy diễn "luồng thiếu" từ con số không.
2. **Chứng minh CẢ vế "có A" LẪN vế "không có B".** Đây là chỗ dễ bịa nhất: trích được "có khóa" (`file:line`) KHÔNG đủ để kết luận "thiếu mở khóa" — "mở khóa" có thể nằm ở file chưa Read, hoặc parser bỏ sót. Mỗi finding "thiếu B" phải kèm **chứng cứ đã tìm mà không thấy**:‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   * vế có A: `file:line` + câu trích;
   * vế thiếu B: **đã grep biến thể nào** (vd `unlock`, `mở khóa`, `gỡ khóa`) trên **tập file nào** — và tập đó có đóng không (đã đọc hết UC/SRS/screen của feature chưa, hay còn file parser bỏ sót ở mục "Phải Read tay").
   * Chưa grep đủ biến thể / tập file chưa đóng → **KHÔNG được báo "thiếu"**, chỉ được note "cần kiểm thêm {X}".
3. **Ngôn ngữ nghi vấn, không khẳng định.** In *"Có {A} (file:line), grep {biến thể} trên {N file} không thấy {B} — xác nhận có chủ đích bỏ qua hay bổ sung?"*, KHÔNG in *"THIẾU luồng X"*. BA là người chốt.
4. **Không có gap → nói thẳng "không phát hiện".** Không bịa cho có.
5. **Engine KHÔNG "không bao giờ bịa" — nó không đoán ngữ nghĩa, nhưng vẫn có false-positive từ vựng** (reverse-pair match nhầm chữ). Vì vậy `yếu`/`cần xác nhận` luôn là *ứng viên*, không phải kết luận. Chỉ `mạnh` (thuần topology: dead-end, kẹt-không-tới-terminal) mới đáng tin cao.

## Approach — mode per-feature (mặc định)

1. **Resolve feature.** Có arg → dùng luôn. No-arg → list `docs/*/` (loại `_*`), ask pick (`1` / `cancel`).

2. **Đảm bảo graph tươi RỒI chạy engine** (nguồn không-bịa, chạy trước để định hướng):
   ```bash
   # graph.json thiếu HOẶC docs/_shared/kg/.dirty tồn tại → build lại trước.
   # KHÔNG chạy engine trên graph cũ: tài liệu vừa thêm luồng mở khóa mà graph
   # chưa cập nhật → báo gap giả, hoặc im lặng giả (đã có mà graph chưa thấy).
   [ -f docs/_shared/kg/graph.json ] && [ ! -f docs/_shared/kg/.dirty ] || node .claude/skills/kg/engine/kg-build.mjs
   node .claude/skills/gap/engine/flowgap.mjs {feature}
   ```
   * Engine trả 3 nhóm kèm **cột `Mức`** (đã render sẵn trong markdown, KHÔNG cần `--json`): **A. STATE-GAP** (dead-end · unreachable · no-exit-path), **B. REVERSE-PAIR-GAP**, **C. CRUD-GAP**.
   * **Cột `Mức` quyết định cách trình bày:** `mạnh` (dead-end thật, kẹt-không-tới-terminal) → đầu Mục 1. `yếu` (tên gợi ý kết thúc tự nhiên) → cuối, ghi "nhiều khả năng đúng". Engine đã tự sắp mạnh→yếu.
   * `KG-ERROR`/exit≠0 → bỏ kết quả, báo BA + chuyển sang bước 3 với nguồn prose thuần.

3. **Read prose** — engine chỉ thấy cái đã vẽ thành state machine. Nhánh nghiệp vụ nằm trong prose:
   * `kg-query.mjs facts {feature}` + `coverage {feature}` → chọn shortlist file (`⚠ còn N mục` → chạy lại `--all`; đọc hết mục `### Phải Read tay`).
   * Read **đầy đủ** UC (`usecases/uc-*.md`) + SRS spec (`srs/{feature}-spec.md` **hoặc** `srs/spec.md` — demo cũ dùng tên trần; đọc file nào tồn tại) + userflow + screen. **In rõ danh sách file đã Read** để BA thấy độ phủ.

4. **Spawn `@flow-reviewer`** qua Task tool trên **toàn feature** (không chỉ userflow.md):
   * Input: prose đã Read ở bước 3 + output engine bước 2 (để nó không lặp lại cái đã có).
   * Hỏi đúng việc: *nhánh error/edge nào có trong Error Matrix mà không màn nào hiển thị? UC nào có extension không ai xử lý? Màn nào vào được mà không có đường ra? Cặp hành động nào thiếu chiều về mà state machine không mô tả?*
   * Bắt buộc: mỗi finding **trích câu gốc + file:line**. Không trích được → loại.
   * Feature phức tạp (≥8 UC) → spawn thêm `@senior-ba` (góc edge case) song song.

5. **Anti-join ID (PHỤ)** — `kg coverage {feature}` cho Mục 3: FR chưa có US Covers, FR chưa có AC Verifies, UC chưa có screen DISPLAYS. Áp **Ba nhãn** trước khi in — phần lớn "chưa tới bước" phải im lặng.

6. **Ma trận truy vết (Mục 4)** — `kg-query.mjs trace {feature} --all` (**BẮT BUỘC `--all`**, thiếu nó bị cap 40 dòng) + `coverage`. Dựng bảng BO/CAP/FR/NFR/BR/E/US/AC/UC + cross-feature deps.

7. **Conflict — LUÔN dựa prose đã Read**, không dựa absence trong graph: definition drift (`_shared/definitions.md`), status enum drift, priority drift (PRD vs SRS), date conflict (BRD vs PRD), stale chain, link asymmetry. Mỗi kết luận phải cite prose.

8. **L1 approval** → **Write** `docs/_shared/traceability.md` (append/replace section `## Feature: {feature}`, giữ nguyên feature khác).

9. **Output summary** — *"{N} luồng nghi thiếu ({M} mức mạnh), {K} nhánh chưa phủ, {L} liên kết ID thiếu"*. Gợi ý `/cr "<mô tả>"` để sửa cái BA xác nhận là gap thật.

## Approach — mode `--product` (tách biệt hoàn toàn)

1. Read `docs/_product/prd.md` (thiếu → route `/prd`, abort). Read `docs/_product/roadmap.md` (thiếu → route `/roadmap`, abort). **KHÔNG rơi xuống per-feature picker.**
2. Parse Feature Map (Mục 7 prd.md) + Prioritization/Now-Next-Later (roadmap.md).
3. **Đối chiếu 2 chiều:** Feature Map→Roadmap thiếu horizon (warning; blocking nếu feature `✅ đã chi tiết`) · Roadmap→Feature Map orphan (blocking) · `TBD [NEEDS CLARIFICATION]` còn mở (suggestion).
4. L1 → Write section `## Product Coverage (_product/)` vào `traceability.md`.
5. **Chỉ báo cáo, KHÔNG tự sửa** `roadmap.md`/`prd.md` → route `/roadmap`.

## Output

`docs/_shared/traceability.md` — ma trận truy vết (`type: traceability`). Đây là output **phụ**.

Output **chính** là báo cáo luồng-nghiệp-vụ-còn-thiếu trả **trong chat**: vào-được-trạng-thái-không-ra-được, hành động thiếu chiều ngược, nhánh error/edge chưa phủ.

`/gap --product` ghi section `## Product Coverage (_product/)` vào **cùng file** `traceability.md` (thay vì section `## Feature: {feature}`). **Chỉ báo cáo, KHÔNG tự sửa** `prd.md`/`roadmap.md` → route `/roadmap`.

## References

* @engine/flowgap.mjs (3 thuật toán xác định: state-gap · reverse-pair · CRUD)
* @../../agents/flow-reviewer.md (đọc prose bắt nhánh/case thiếu)
* @../../rules/kg-usage.md (graph chọn file, prose kết luận)
* @../../rules/approval-gate.md
* @../../rules/naming-conventions.md (ID conventions)
* @../../rules/changelog.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
