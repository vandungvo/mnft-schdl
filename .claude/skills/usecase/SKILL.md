---
name: usecase
description: Dùng khi cần viết use case (chuẩn Cockburn fully-dressed) cho 1 feature — mô tả actor, pre-condition, kết quả mong đợi dạng business black-box. Chạy được TRƯỚC SRS (discovery/elicitation — viết use case để khám phá nghiệp vụ) hoặc SAU SRS (downstream — trích FR, điền traceability).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "<feature> [--from-fr <fr-id>] [--all]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /usecase — Function-centric Use Case Generator‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Generate use-case docs **theo chuẩn Cockburn (fully-dressed)**: mỗi UC = **1 user goal ở sea-level** (kết quả nghiệp vụ có ý nghĩa actor đạt trong 1 phiên), viết đủ **Scope · Level · Primary Actor · (Stakeholders — optional) · Trigger · Preconditions · Minimal + Success Guarantee · Main Success Scenario (numbered) · Extensions (đánh số theo bước) · Related Requirements**. UC phải **testable** (guarantee = test oracle) và **review độc lập được** (Related Requirements ngay trong file).

> **Use case chạy được ở 2 thời điểm (đúng thực tế BA):** **discovery mode** — viết use case TRƯỚC khi có SRS, như kỹ thuật elicitation để khám phá nghiệp vụ, rồi từ đó dựng FR (`/srs`); **downstream mode** — có SRS rồi thì trích FR làm nguồn + điền traceability đầy đủ. Skill tự chọn mode theo `srs/{feature}-spec.md` có tồn tại hay không. Chi tiết ở Constraints + Approach bước 1.

> **UC KHÔNG embed diagram** — không phải vì "black-box vs white-box" (phát biểu sai — activity/sequence cũng mô tả business process được), mà vì **abstraction level khác nhau**: UC = actor-goal contract; sequence/state = internal interaction/lifecycle. Trộn 2 level làm stakeholder lạc. Sequence → `/sequence` → `srs/{feature}-flows.md`; state → `/state` → `srs/{feature}-states.md`; activity → `/activity`.

**Traceability = bảng trong `{feature}-usecase-index.md` (1 file, KHÔNG tách riêng).** Bảng `## Use cases` là ma trận đầy đủ UC↔FR↔Screen↔Error↔OQ đồng thời là metadata/lifecycle (slug/level/status/actor/covers-FR/screens/errors/OQ-ref/priority/updated). UC file GIỮ 1 mục ngắn **Related Requirements** (stable links FR/BR) để review độc lập. OQ canonical ở `srs/{feature}-spec.md`. (Trước 2026-07-13 tách `{feature}-traceability.md` riêng — đã gộp vào index vì trùng 6/8 cột, gây drift.)

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **L1 approval** trước Write.
* **L2 diff** khi file đã tồn tại — update mode tự động, không cần flag.
* **Auto-detect upstream + confirm** — scan SRS FR + screens (downstream mode).
* **2 mode theo nguồn có sẵn (per `feature-bootstrap.md` nhóm A — điểm vào, KHÔNG refuse):**
  * **Discovery mode** — `srs/{feature}-spec.md` CHƯA tồn tại. Use case là kỹ thuật **elicitation sớm**: viết use case TRƯỚC để khám phá nghiệp vụ, rồi từ đó ra SRS. Skill phỏng vấn actor/goal/main-flow/nhánh-lỗi (business language, IT-BA framing), viết use case fully-dressed, `Related Requirements` ghi "discovered — chưa có FR, sẽ liên kết khi chạy /srs". KHÔNG bịa mã `E-*`/`FR-*` (chưa có nguồn). Output gợi ý `/srs {feature}` để hình thức hóa FR + reconcile ngược. Feature chưa có folder → derive slug + tạo (per nhóm A).
  * **Downstream mode** — `srs/{feature}-spec.md` tồn tại. Giữ nguyên hành vi cũ: trích FR làm nguồn, đối chiếu Error Matrix, điền traceability đầy đủ. `status: draft/in-review` → soft gate warn + proceed.
  * **Auto-detect mode** — có `srs/{feature}-spec.md` → downstream; không → discovery. Ranh giới mơ hồ (vd feature có URD/brainstorm nhưng chưa SRS) vẫn là discovery (chưa có FR canonical để trích).
* **Goal-level gate (BẮT BUỘC) — chỉ sea-level vào catalog.** TRƯỚC khi tạo UC, classify candidate kite/sea/fish: **sea-level** = user goal 1 phiên có giá trị (Place order, Submit refund) → thành UC. **fish** = subfunction (Validate cart, Login, Send email) → KHÔNG thành UC riêng, là bước/extension trong UC khác. **kite** = summary quá rộng (Manage X) → split. **KHÔNG "1 FR = 1 UC"** (downstream mode) — 1 user goal thường phủ nhiều FR; 1 FR đôi khi chỉ là rule của UC. Discovery mode: goal đến từ phỏng vấn/upstream (brainstorm/URD), KHÔNG từ FR. Test cả 2 mode: "actor rời hệ thống với kết quả nghiệp vụ có ý nghĩa không?".
* **`--all`** generate cho mọi **sea-level user goal** (KHÔNG mọi FR).
* **UC fully-dressed** — Scope · Level · Primary Actor · (Stakeholders optional) · Trigger · Preconditions · Minimal Guarantee · Success Guarantee · Main Success Scenario (numbered steps) · Extensions (`{step}{letter}` gắn bước) · Related Requirements. KHÔNG mermaid trong UC.
* **Main Success Scenario tách khỏi Extensions** — main flow = đường chuẩn trigger→success guarantee (không `if/else` nhồi vào). Mỗi extension gắn bước (`2a`, `2a1`), có **condition + response + continuation** (quay lại main / chuyển bước / kết thúc với guarantee). KHÔNG gộp happy + error vào 1 prose block.
* **Guarantee = test oracle**: Success Guarantee = trạng thái nghiệp vụ quan sát được sau thành công; Minimal Guarantee = đảm bảo khi lỗi (không mất data, không thu tiền 2 lần, audit hợp lệ). Mỗi UC ≥1 assertion cho success + failure.
* **Related Requirements GIỮ trong UC** (1 mục ngắn: stable links FR/BR quyết định hành vi). Discovery mode (chưa có FR) → mục này ghi "discovered — chưa có FR; sẽ liên kết khi chạy /srs" + liệt kê nguồn thật đã có (brainstorm/URD nếu có). Ma trận đầy đủ (level/status/actor/covers-FR/screens/errors/OQ/priority) là **bảng `## Use cases` trong `{feature}-usecase-index.md`** — mỗi run cập nhật 1 row. Discovery mode: cột covers-FR + errors để `—`; cột OQ-ref ghi `discovery: {câu hỏi}` nếu có OQ, else `—`. KHÔNG còn file traceability riêng.
* **OQ — nơi canonical tùy mode.** Downstream (có SRS): OQ sống ở `srs/{feature}-spec.md` (per `resolve-oqs.md`); cột OQ-ref bảng index chỉ trỏ ref (`spec.md#OQ-N`); phát hiện OQ mới → đề xuất thêm vào SRS (L2 diff), không nhét vào UC. Discovery (chưa có SRS): chưa có SRS để làm nơi canonical → giữ OQ tạm ở cột OQ-ref bảng index dạng `discovery: {câu hỏi}`, chuyển sang SRS khi chạy `/srs`. Cả 2 mode: UC KHÔNG chép OQ vào body.
* **Screen references** — cột Screens trong bảng `## Use cases` link tới `ascii-wireframe/{flow-slug}.md#{screen-slug}` (single source, gộp theo flow); KHÔNG duplicate screen spec. Logic chi tiết per-button sống trong screen content file.
* **Vietnamese-first**.
* **Zero-frontmatter cho UC files** — `uc-*.md` KHÔNG có frontmatter. Metadata + status tập trung ở `usecases/{feature}-usecase-index.md`.
* **Auto-create `{feature}-usecase-index.md`** nếu chưa có (từ `_templates/usecase-index.md`). Mọi run update row trong bảng `## Use cases` + set env note (hook ghi changelog.md) với prefix `[uc-{slug}]`. KHÔNG còn file traceability riêng.
* **BA conventions** (must follow) — Owner resolution từ memory `user-identity`, no-re-ask rule, IT-BA framing, Vietnamese typography, L1 prose preview. Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **UC KHÔNG có diagram nào** — nếu user yêu cầu "vẽ sequence/activity/state vào UC", refuse + chuyển hướng skill tương ứng → `srs/{feature}-flows.md` hoặc `srs/{feature}-states.md`. Lý do: **abstraction level khác** (UC = actor-goal contract; diagram = internal interaction/lifecycle), KHÔNG phải "black-box vs white-box" (phát biểu đó sai).
* **Main Success Scenario tách khỏi Extensions — đừng gộp prose.** Ví dụ đúng:
  ```
  ## Main Success Scenario
  1. Customer gửi yêu cầu hoàn tiền.
  2. System kiểm tính hợp lệ của yêu cầu.
  3. System ghi nhận yêu cầu.
  4. System xác nhận đã tiếp nhận.

  ## Extensions
  2a. Yêu cầu ngoài thời hạn hoàn tiền:
    2a1. System từ chối + nêu thời hạn áp dụng (E-refund-002).
    2a2. Use case kết thúc, không tạo yêu cầu (giữ Minimal Guarantee: không ghi nhận sai).
  2b. Thiếu chứng từ bắt buộc:
    2b1. System chỉ ra chứng từ thiếu.
    2b2. Customer bổ sung → flow resume ở bước 2.
  ```
  Mỗi extension: **step gắn + condition + response + continuation** (resume N / end với guarantee). KHÔNG nhồi `if/else` vào main flow.
* **Cột Errors trong bảng `## Use cases`** — gom mọi mã `E-{feature}-NNN` mà Extensions của UC nhắc tới (đối chiếu Error Matrix `srs/{feature}-spec.md` Mục 5). Giúp QC/`/gap` thấy UC nào phủ error nào. Discovery mode: cột này `—` (chưa có Error Matrix), nhánh lỗi mô tả bằng lời trong UC.
* **Guarantee bắt buộc, đừng nhầm với UI output** — Success Guarantee = trạng thái nghiệp vụ (vd "yêu cầu ở trạng thái Đã tiếp nhận, audit log ghi"), KHÔNG phải "System hiển thị màn thành công". Minimal Guarantee cho lỗi (không tạo bản ghi bán phần).
* **OQ canonical ở SRS (downstream mode)** — KHÔNG copy OQ vào UC. Phát hiện OQ mới → propose thêm vào `srs/{feature}-spec.md` (L2 diff), cột OQ ref bảng index chỉ trỏ `spec.md#OQ-N`. Discovery mode (chưa có SRS): OQ giữ tạm ở cột OQ-ref index (`discovery: {câu hỏi}`), chuyển sang SRS khi chạy `/srs`. Cả 2 mode: tránh OQ debt rải khắp UC body.
* **2 mode — use case viết TRƯỚC hay SAU SRS đều được (đây là điểm KHÁC `/userstory`, `/usecase-diagram`).** Thực tế BA: use case thường là kỹ thuật **elicitation sớm** (viết trước để khám phá nghiệp vụ → ra SRS). Repo này hỗ trợ cả 2:
  * **Discovery** (chưa có SRS): elicitation-mode. Phỏng vấn/đọc brainstorm-URD, viết use case draft, cột FR/errors trống, đánh OQ cho số chưa rõ, route `/srs` để hình thức hóa. KHÔNG bịa `FR-*`/`E-*`/threshold. Feature mới → derive slug + tạo folder (nhóm A).
  * **Downstream** (có SRS): trích FR, đối chiếu Error Matrix, điền traceability đầy đủ. `status` chưa approved → soft gate warn.
  * **Vòng hoàn chỉnh:** discovery `/usecase` → `/srs` (dựng FR từ UC) → gọi lại `/usecase` (update mode tự điền covers-FR/errors). Đừng refuse ở discovery — đó là bỏ mất luồng BA chuẩn.
* **Guarantee discovery mode** — vẫn bắt buộc Success + Minimal Guarantee (mô tả trạng thái nghiệp vụ), KHÔNG cần chờ SRS. Số cụ thể còn thiếu (thời hạn, ngưỡng) → OQ, không bịa.
* **No clear sea-level goal** — ask user actor + goal interactive, generate 1 UC manual. KHÔNG bịa goal từ FR lẻ.
* **Duplicate target** (uc-{goal}.md exists) — tự chuyển update mode (L2 diff), báo user đang update.
* **Feature có 10+ user goals** — preview limit 10, ask user filter trước batch (thường 10+ là dấu hiệu trộn goal level — soát lại có fish-level lẫn vào không).
* **`--all` gặp candidate ambiguous → DỪNG mục đó + hỏi quyết định.** KHÔNG sinh `<!-- TBD -->` (tài liệu giả-hoàn-tất che khoảng trống nghiệp vụ). Các UC rõ vẫn tạo bình thường, chỉ pending cái ambiguous.
* **Slug collision** — `uc-checkout` trùng giữa 2 feature OK (feature folder scope). Trong 1 feature, slug phải unique → ask disambiguate.
* **Goal level lẫn lộn** — nếu candidate list có UC cạnh nhau ở khác level (vd "Quản lý đơn" kite + "Đặt đơn" sea + "Kiểm thẻ" fish) → cảnh báo, chỉ giữ sea-level, hạ fish thành bước, split kite.
* **Bảng `## Use cases` (trong index) vs `/gap`** — bảng index là ma trận per-feature `/usecase` tự maintain (đọc nhanh liên hệ UC↔FR↔Screen↔Error↔OQ). `/gap` mới là cơ chế soát orphan/link-lệch cross-doc (→ `docs/_shared/traceability.md` — file KHÁC, project-level). Đừng nhầm 2 cái; report luôn gợi ý chạy `/gap` để soát đầy đủ.

## Inputs

```
/usecase <feature>                              # interactive: list candidates, pick
/usecase <feature> --from-fr FR-payment-001     # target 1 FR cụ thể
/usecase <feature> --all                        # batch generate cho mọi major function
```

File `uc-{slug}.md` đã tồn tại → skill tự chuyển sang update mode (L2 diff), không cần flag. Muốn giới hạn scope, nói bằng lời cũng được (vd "chỉ làm UC cho FR-payment-001" tương đương `--from-fr`, "làm hết mọi function" tương đương `--all`).

> **`--from-fr` chỉ có nghĩa ở downstream mode** (cần FR tồn tại). Discovery mode (chưa có SRS) không có FR để trỏ — dùng `--all` (mọi goal elicit được) hoặc nói bằng lời "chỉ làm use case cho mục tiêu X". Gọi `--from-fr` khi chưa có SRS → skill báo "chưa có FR, đang ở discovery mode" + hỏi goal muốn làm.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có SRS (→ downstream mode): !`for d in docs/*/srs/*-spec.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done | head -20`
Mọi feature folder (feature không có SRS → discovery mode): !`ls -d docs/*/ 2>/dev/null | grep -vE '/_' | xargs -I{} basename {} | head -20`
Existing UCs: !`ls docs/*/usecases/uc-*.md 2>/dev/null | head -20`

## Approach

1) **Resolve feature + chọn mode** (per `feature-bootstrap.md` nhóm A — điểm vào, KHÔNG refuse):‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   * **`srs/{feature}-spec.md` tồn tại → DOWNSTREAM mode.** Trích FR làm nguồn. `status: draft/in-review` → soft gate warn + proceed (xem `delivery-readiness.md`).
   * **`srs/{feature}-spec.md` KHÔNG tồn tại → DISCOVERY mode** (use case = elicitation sớm, viết trước SRS). Feature folder chưa có (arg gõ sai / feature mới) → phân biệt: 1 từ kebab lạ → hỏi "feature mới hay gõ nhầm? {list}"; mô tả/prose → derive slug + tạo folder (per nhóm A). Feature có folder + upstream (brainstorm/URD) nhưng chưa SRS → discovery, dùng upstream làm seed.
2) **Read nguồn theo mode.** Downstream: SRS FR + flows + screens. Discovery: brainstorm/URD/PRD nếu có (seed), else phỏng vấn từ đầu.
   * **KG chọn nguồn trước (rẻ hơn scan):** chạy `node .claude/skills/kg/engine/kg-query.mjs facts {feature}` và `node .claude/skills/kg/engine/kg-query.mjs coverage {feature}` khi có SRS để lấy danh sách candidate/coverage, rồi VẪN Read đầy đủ prose file đã chọn. Tuân `.claude/rules/kg-usage.md` (3 nghĩa vụ: `--all` khi bị cap · đọc mục "Phải Read tay" · `KG-ERROR` → scan trực tiếp như cũ).
3) **Identify candidate user goals + classify goal level** (KHÔNG map máy móc FR→UC):
   * **Downstream:** đọc SRS FR + PRD capabilities + flows → tổng hợp thành **user goal** (actor muốn đạt gì, 1 phiên). 1 goal gom nhiều FR liên quan.
   * **Discovery:** phỏng vấn (hoặc đọc brainstorm/URD) để lấy actor + goal + main flow + nhánh lỗi. Hỏi business language (IT-BA framing) — ai làm, muốn đạt gì, các bước, khi lỗi thì sao. KHÔNG hỏi DB/API/SDK.
   * Classify mỗi candidate **kite/sea/fish** (per goal-level gate ở Constraints). Chỉ **sea-level** thành UC; fish → note "là bước/extension trong UC nào"; kite → split.
   * Screen KHÔNG phải trục suy UC (screen = presentation → dễ screen-driven decomposition). Dùng screen chỉ để xác nhận, không để định nghĩa goal.
4) **Readiness note.** Downstream + SRS `status: draft/in-review` → warn + ask proceed; **nguồn chưa approved → mark UC `draft`**. Discovery → UC luôn `draft` + `Related Requirements` ghi "discovered, chưa có FR" + đánh OQ cho số nghiệp vụ còn thiếu (không bịa threshold/timeout).
5) **Preview table** (kèm level + nguồn):
   ```
   Candidate user goals (sea-level):
   1. Submit refund claim — actor Customer — sea — covers FR-refund-001,-002 — source: SRS Mục 2
   2. Approve refund      — actor Agent    — sea — covers FR-refund-004    — source: SRS Mục 2
   (fish-level, KHÔNG tạo UC riêng: Validate attachment → bước trong UC-1)
   Create which? (1,2 / all / cancel)
   ```
6) **L1 approval** preview file list.
7) **Resolve index:** path `docs/{feature}/usecases/{feature}-usecase-index.md`. Missing → tạo từ `_templates/usecase-index.md` (bảng empty). Bảng `## Use cases` là ma trận truy vết duy nhất (không còn file traceability riêng).
8) **For each selected user goal**, fill `_templates/usecase.md` (zero frontmatter, **fully-dressed Cockburn**):
   * Slug `uc-{goal-slug}.md` (kebab-case verb-object, vd `uc-submit-refund-claim.md`).
   * **Scope + Level** — subsystem chịu trách nhiệm + `sea` (mặc định; fish không thành file).
   * **Primary Actor** — actor có goal (downstream: từ FR có **source citation**; discovery: từ phỏng vấn/upstream).
   * **Stakeholders & Interests** (optional) — chỉ điền khi có bên gián tiếp có interest thật (Finance/Compliance/Support). Không có → xóa section.
   * **Trigger** — sự kiện khởi động UC (KHÁC precondition).
   * **Preconditions** — điều đã đúng trước khi bắt đầu (KHÔNG phải bước đầu của main flow).
   * **Guarantees** — Minimal (đảm bảo khi lỗi) + Success (trạng thái nghiệp vụ sau thành công). Bắt buộc, testable.
   * **Main Success Scenario** — numbered steps trigger→success guarantee, mỗi bước = ý định nghiệp vụ quan sát được (không click/screen/API).
   * **Extensions** — `{step}{letter}` gắn bước, mỗi nhánh: condition + response + continuation (resume bước N / end với guarantee). Downstream: error nhắc mã `E-{feature}-NNN` (wording ở Error Matrix). Discovery: mô tả nhánh lỗi bằng lời (chưa có mã) + đánh OQ "cần định nghĩa error code khi chạy /srs" — KHÔNG bịa mã `E-*`.
   * **Related Requirements** — 1 mục ngắn. Downstream: stable links FR/BR quyết định hành vi UC (để review độc lập). Discovery: ghi "discovered — chưa có FR; sẽ liên kết khi chạy /srs" + liệt kê nguồn thật đã có (brainstorm/URD nếu có).
   * **Evidence-based**: mỗi fact = **sourced** (trích FR/BR) / **derived** (suy luận, ghi rõ) / **open question**. KHÔNG tự đặt số nghiệp vụ (timeout/threshold/retention) — thiếu thì OQ, không "best practice" lấp. Derived KHÔNG giả làm sourced.
9) **File đã tồn tại** → tự động vào update mode: **semantic diff** (L2 per file, merge info mới, preserve manual edit — KHÔNG regenerate toàn file). (Bỏ mâu thuẫn "skip nếu không xác nhận" cũ — update mode luôn show L2 diff, user Y/n mỗi file.)
10) **Update `{feature}-usecase-index.md`** (metadata + ma trận truy vết — 1 bảng duy nhất) — **core, luôn làm**:
    * Insert/update 1 row bảng `## Use cases` per UC với **đủ cột**: slug, **level**, status, actor, covers FR, screens (link `[[../ascii-wireframe/{flow-slug}#{screen-slug}]]`), **errors** (`E-{feature}-NNN` UC có thể kích hoạt — đối chiếu Extensions với Error Matrix `srs/{feature}-spec.md` Mục 5), **OQ ref** (`spec.md#OQ-N` nếu có, else `—`), priority, updated. **Discovery mode:** cột covers-FR + errors để `—` (chưa có SRS/Error Matrix), OQ-ref ghi `discovery: {câu hỏi}` nếu có OQ else `—`, status `draft`. Sau khi chạy `/srs` + reconcile, gọi lại `/usecase` (update mode) sẽ điền covers-FR/errors + chuyển OQ sang `spec.md#OQ-N`.
    * Set env trước mỗi UC Write (hook ghi changelog.md): `CLAUDE_SKILL_NAME=/usecase` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE={note}` (≤80 ký tự). Hook ghép cả dòng.
    * Update frontmatter `updated: {date}`. OQ ref chỉ trỏ OQ đang mở ở SRS, KHÔNG tạo OQ mới ở đây.
11) **Optional side-updates (best-effort, KHÔNG chặn việc viết UC)** — nếu screen source tồn tại: update cột "Used by functions" trong `ascii-wireframe/{feature}-wireframe-index.md` (reverse link `{uc-slug}`, L2 diff). OQ mới phát hiện khi viết UC → **downstream:** đề xuất thêm vào `srs/{feature}-spec.md` (L2 diff); **discovery:** giữ tạm ở cột OQ-ref index (chưa có SRS). Đây là side-effect thêm giá trị, KHÔNG phải điều kiện để UC hợp lệ — thiếu screen index thì skip + note, không refuse.
12) **Phase E — Resolve OQs** per @../../rules/resolve-oqs.md (downstream mode). OQ canonical ở `srs/{feature}-spec.md`; bảng index chỉ trỏ ref. KHÔNG ghi OQ vào UC file (Related Requirements chỉ là links FR/BR, không phải OQ). **Discovery mode (chưa có SRS):** OQ chưa có nơi canonical để ghi → giữ OQ dưới dạng note ở cột OQ-ref bảng index (`discovery: {câu hỏi}`) + nêu trong Output report để chuyển sang `/srs`. KHÔNG chạy cascade scan (chưa có downstream doc).
13) **Output report:**

    **Downstream mode (có SRS):**
    ```
    ✅ Use cases generated (fully-dressed, sea-level):
       - docs/{feature}/usecases/uc-{goal-1}.md
       - docs/{feature}/usecases/uc-{goal-2}.md
    📇 Metadata + ma trận truy vết (UC/FR/Screen/Error/OQ): usecases/{feature}-usecase-index.md

    Cần diagram?
       - Sequence flow: /sequence "<desc>" --feature {feature}  → srs/{feature}-flows.md
       - Activity/process: /activity "<desc>" --feature {feature} → srs/{feature}-flows.md
       - State machine:  /state <entity> --feature {feature}     → srs/{feature}-states.md

    Next:
       - /userstory {feature}                  → backlog stories (nói rõ muốn tạo story cho use case nào nếu chỉ muốn 1 UC cụ thể)
       - /ac {feature} --story us-NNN          → acceptance criteria
       - /gap {feature}                        → soát traceability + gap đầy đủ
    ```

    **Discovery mode (chưa có SRS — elicitation sớm):**
    ```
    ✅ Use cases (discovery draft — viết TRƯỚC SRS để khám phá nghiệp vụ):
       - docs/{feature}/usecases/uc-{goal-1}.md
       - docs/{feature}/usecases/uc-{goal-2}.md
    📇 Index: usecases/{feature}-usecase-index.md (cột FR/errors còn trống — chờ SRS)
    ❓ {N} câu hỏi mở ghi trong index (số nghiệp vụ chưa rõ) — sẽ chốt khi hình thức hóa.

    Bước hình thức hóa (khuyến nghị):
       - /srs {feature}   → dựng FR/NFR/Error Matrix TỪ các use case này; sau đó
                            gọi lại /usecase {feature} (update mode) để điền
                            covers-FR + errors + liên kết traceability.

    Hoặc vẽ toàn cảnh ngay:
       - /usecase-diagram --feature {feature}  → bức tranh actor + use case
    ```

## Output

| File | Nội dung |
|---|---|
| `docs/{feature}/usecases/uc-{slug}.md` | Use case fully-dressed Cockburn — **zero frontmatter** |
| `docs/{feature}/usecases/{feature}-usecase-index.md` | Master metadata + bảng `## Use cases` = ma trận truy vết UC↔FR↔Screen↔Error↔OQ |

Diagram KHÔNG embed trong UC — thuộc `srs/{feature}-flows.md` / `{feature}-states.md`. Hook tự ghi `docs/_shared/changelog.md`.

## References

* @../../rules/ba-conventions.md
* @../../rules/approval-gate.md
* @../../rules/kg-usage.md
* @../../rules/naming-conventions.md
* @../../rules/feature-bootstrap.md
* @../../rules/delivery-readiness.md
* @../../rules/changelog.md
* @../../rules/diagram-selection.md
* @../../rules/resolve-oqs.md
* @../sequence/SKILL.md
* @../activity/SKILL.md
* @../state/SKILL.md
* @../../../_templates/usecase.md
* @../../../_templates/usecase-index.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
