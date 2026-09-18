---
name: userstory
description: Dùng khi cần sinh user story sẵn sàng đưa vào backlog từ FR/use case/screen của SRS. `/userstory <feature>` hoặc `/userstory` (chọn feature).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[<feature>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /userstory — SRS → User Stories‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Generate __backlog-draft user stories cần refinement__ (KHÔNG tự nhận "dev-ready" — story chưa có AC chốt + rule + dependency thì chưa đạt Definition of Ready) cho sprint backlog. Mỗi US = 1 vertical business slice (persona + capability + benefit thật) + linked FR + UI ref + (placeholder) AC. Numbering scope per-feature folder (us-001, us-002, ...).

> __Nguyên tắc chia story (quan trọng):__ trục chia CHÍNH là __smallest end-to-end business outcome__ (vertical slice tạo giá trị quan sát được) — screen/actor/FR chỉ là __tín hiệu phụ__ gợi ý chỗ cắt, KHÔNG phải trục chính. Screen là thiết kế (presentation), không phải business slice; chia theo screen dễ tạo story không có giá trị độc lập + dependency tuần tự. Xem `## Story split strategy` + mục Pitfalls.

## File model (index pattern, giống `/usecase` + `/ascii-wireframe`)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mọi metadata không lặp lại per-file. 2 loại file:

| File | Vai trò | Frontmatter |
|------|---------|-------------|
| `userstories/{feature}-story-index.md` | __Master__: frontmatter đầy đủ + bảng Stories (ID/title/persona/FR/screens/priority/__status__/__jira key__/updated) cho toàn bộ stories | FULL (`type: userstory-index`) |
| `userstories/us-{NNN}.md` | __Content__: prose sections (User Story / Context / Linked Requirements / AC inline / UI refs / Error refs / Dependencies / OQs) | __ZERO__ frontmatter |

Per-story `status`, `priority`, `jira key` sống ở __bảng index__, KHÔNG ở file us. Url + pushed_at của Jira sống ở `.claude/state/atlassian/sync-state.yaml` (canonical — thay `docs/_shared/jira-map.md` cũ đã migrate/xóa). Changelog của mọi story route về `{feature}-story-index.md` với prefix `[us-NNN]`.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __L1 approval__ trước batch Write.
* __L2 diff khi file đã tồn tại__ — update mode tự động (cả `{feature}-story-index.md` + us files).
* **Feature/SRS chưa tồn tại → REFUSE + route `/srs`** (per `feature-bootstrap.md` nhóm B) — không có FR thật thì không split được story, tự bịa sẽ sai; __SRS tồn tại nhưng chưa approved → soft gate warn + proceed__.
* **Story ID `US-{NNN}`** (path scope feature, ID không cần prefix).
* __Continuous numbering__ — scan existing max + 1 từ bảng `{feature}-story-index.md` + glob files, never reuse deleted.
* __Auto-detect__ UC + screens cho story split strategy.
* __Vietnamese-first__.
* __Index frontmatter đầy đủ__ (`type: userstory-index`); us files __zero frontmatter__.
* __Jira key idempotency__ đọc từ cột Jira của bảng `{feature}-story-index.md` (KHÔNG còn `jira:` object trên file us). Update mode KHÔNG đụng cột Jira (do `/jira` quản lý).
* __BA conventions__ (must follow) — Owner resolution từ memory `user-identity`, no-re-ask rule, IT-BA framing, Vietnamese typography, L1 prose preview. Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong

* __No FR table__ trong SRS — ask user derive from prose, hoặc stop với warn.
* __FR mơ hồ ≠ FR to.__ FR quá rộng nhưng rõ nghiệp vụ → split thành nhiều outcome. FR __mơ hồ__ (thiếu actor/threshold/rule) → KHÔNG cứ split (dễ tạo story tưởng đúng mà không có quyết định nghiệp vụ) → sinh nháp + đánh OQ trả refinement.
* __Multiple actors trong 1 FR__ — chỉ split by actor khi các actor có __mục tiêu/rule thật sự khác__; nếu hành vi giống chỉ tên role khác thì KHÔNG split (per split-strategy: actor là tín hiệu phụ).
* __NFR / cross-cutting requirement__ — KHÔNG ép mỗi NFR = 1 story. Attach NFR vào story liên quan (as constraint/AC), HOẶC tạo enabler story, HOẶC ghi thành AC cấp release. Nêu rõ ở OQ nếu chưa quyết được attach vào đâu.
* __Existing story đã push Jira__ (cột Jira trong `{feature}-story-index.md` ≠ `—`) — update mode KHÔNG đụng cột Jira/Status, chỉ sửa content us file + các cột mô tả. Jira là việc của `/jira`.
* __Index drift__ — nếu glob us-*.md có file không có trong bảng `{feature}-story-index.md` (tạo tay) → warn + đề xuất thêm row. Ngược lại row trỏ tới us file không tồn tại → warn broken link.
* __Screen references missing__ — generate story + add OQ "Screen ref TBD" + warning.
* __Numbering gap__ (vd us-001, us-003 tồn tại — us-002 deleted) — KHÔNG reuse us-002, continue from us-004.
* __Story numbering scope per-feature__, KHÔNG global — `docs/payment/userstories/us-001.md` và `docs/auth/userstories/us-001.md` cùng tồn tại OK.
* __Feature/SRS hoàn toàn không tồn tại__ — refuse + route `/srs {feature}` (không tự tạo feature, không bịa FR). __SRS tồn tại nhưng draft/in-review__ — soft gate proceed, flag mỗi story `<!-- built from draft SRS, may need refinement -->`. Đừng gộp 2 case.
* __Hook stale-propagation__ sẽ fire khi edit US → mark downstream AC stale (Phase 6).
* **Auto-chain `/ac`** chỉ áp dụng cho stories __vừa tạo trong session này__. Stories cũ (update mode) KHÔNG auto-chain — user gọi `/ac` explicit và nói "sửa lại AC" nếu cần repair.
* __Sửa content story đã push Jira → cảnh báo drift.__ Update mode giữ nguyên cột Jira, nhưng __sửa nội dung us file__ của story đã có Jira key tạo lệch local ↔ Jira. Khi diff đụng story đã push → warn "story này đã ở Jira {key}, nội dung sẽ lệch cho tới khi re-sync — cân nhắc `/cr` hoặc `/jira` update" trước khi apply.
* __Guardrail chống bịa (bắt buộc):__ (1) mỗi story/AC __preserve ID + trích nguồn__ (`spec.md#FR-...`); (2) phân biệt rõ __fact từ spec / suy luận hợp lý / open question__ — KHÔNG tự quyết business rule còn thiếu, cần draft thì đánh dấu OQ; (3) sau generate tự soi __duplicate__ (2 story cùng outcome từ 2 FR liên hệ → dedupe) + __contradiction__ (terminology/state/threshold lệch SRS); (4) đánh giá story theo __giá trị hành vi + traceability__, KHÔNG theo "đủ template / đủ câu As-a-user"; (5) người chịu trách nhiệm nghiệp vụ phải review __outcome cuối__.

## Inputs

```
/userstory                  # interactive: pick feature từ menu
/userstory <feature>        # create stories (auto-detect UC + screens, auto-pick split strategy)
```

Có sẵn stories rồi → tự động vào update mode (L2 diff), không cần flag. Muốn tạo cho 1 UC/FR cụ thể — nói bằng lời (vd "chỉ tạo story cho use case login").

__Customization inline__ trong L1 prompt (KHÔNG cần flag):
* Scope hẹp 1 FR / 1 UC → user reply trong L1 vd "chỉ FR-payment-002" hoặc "chỉ UC-checkout".
* Override split strategy → user reply "split by screen" / "split by actor". Default skill tự pick.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có SRS: !`for d in docs/*/srs/*-spec.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done | head -20`
Features có US: !`for d in docs/*/userstories/; do [ -d "$d" ] && dirname "$d" | xargs basename; done | head -10`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Approach

1) __Resolve feature.__ No-arg → interactive picker. Phân biệt 2 case (per `feature-bootstrap.md` nhóm B):
   * **Feature/`srs/{feature}-spec.md` KHÔNG tồn tại** (feature chưa có, hoặc arg gõ sai) → __REFUSE tường minh + route__: "Chưa thể chạy `/userstory` cho `{feature}` — thiếu `srs/{feature}-spec.md` (cần FR để split story). Feature hiện có: {list}. Chạy `/srs {feature}` trước để tạo FR, rồi quay lại." KHÔNG tự tạo feature.
   * **`srs/{feature}-spec.md` tồn tại** nhưng `status: draft/in-review` → soft gate warn + proceed (có FR thật để làm, chỉ chưa approved — flag mỗi story "built from draft SRS").
2) __Read__ SRS spec + flows + screens + UCs nếu present.
   * __KG chọn nguồn trước (rẻ hơn scan):__ chạy `node .claude/skills/kg/engine/kg-query.mjs coverage {feature}` và `node .claude/skills/kg/engine/kg-query.mjs facts {feature}` để lấy danh sách candidate/coverage, rồi VẪN Read đầy đủ prose file đã chọn. Tuân `.claude/rules/kg-usage.md` (3 nghĩa vụ: `--all` khi bị cap · đọc mục "Phải Read tay" · `KG-ERROR` → scan trực tiếp như cũ).
3) __Story split strategy (default = vertical slice):__
   * **Default `outcome`:** 1 story = 1 smallest end-to-end business outcome (user hoàn thành 1 việc có giá trị quan sát được). Ưu tiên patterns SPIDR/workflow-step/rule-variation — chia theo __hành vi nghiệp vụ__, KHÔNG theo tầng UI/API/DB.
   * Tín hiệu phụ (chỉ gợi ý chỗ cắt, KHÔNG phải trục chính, user có thể override inline ở L1):
     * `fr`: FR/FR-cluster gợi ý ranh giới capability.
     * `actor`: nhiều actor có mục tiêu/rule __thật sự khác__ → cắt theo actor (KHÔNG cắt chỉ vì tên role khác mà hành vi giống).
     * `screen`: screen = thiết kế, chỉ dùng khi 1 screen đúng bằng 1 outcome độc lập — mặc định KHÔNG chia theo screen.
   * Mỗi story phải tự đứng vững (independently valuable + testable). Story chỉ là "tạo table / xây endpoint / vẽ UI" = technical task trá hình → gộp vào outcome hoặc đánh dấu enabler.
4) __DoR + INVEST self-check (trước preview).__ Với mỗi story nháp, tự soi:
   * __INVEST__: Independent (dependency nhận diện rõ, không chuỗi tuần tự cứng) · Negotiable (không chép nguyên SRS/khóa cứng giải pháp) · __Valuable__ (vertical slice có giá trị, không phải technical task) · Estimable (đủ rõ actor/rule/error để ước lượng) · Small (1 iteration, 1 outcome) · Testable (kết quả pass/fail quan sát được). KHÔNG chấm theo từ khóa ("As a…" ≠ có value).
   * __DoR nhẹ__: actor + outcome rõ · business value/lý do ưu tiên rõ · scope + ngoài-scope rõ · dependency/assumption/risk nhận diện.
   * __FR mơ hồ / thiếu value / dependency chưa rõ / không estimate được → KHÔNG cứ thế split.__ Sinh story nháp + đánh dấu __Open Question__ (trả về refinement), gắn note nguồn "cần làm rõ trước dev". Đừng bịa actor/threshold/permission để lấp khoảng trống — đánh OQ.
   * Phân biệt 3 loại nội dung khi viết: __fact từ spec / suy luận hợp lý / open question__ (per Pitfalls guardrail).
5) __Numbering__ — scan bảng `{feature}-story-index.md` + glob `docs/{feature}/userstories/us-*.md`, find max NNN, continue.
6) __Preview table__ (thêm cột Nguồn để lộ fact vs suy-luận):
   ```
   Planned stories:
   | # | Title | Persona | Covers FRs | Screens | Priority | Nguồn/OQ |
   |---|-------|---------|------------|---------|----------|----------|
   | 001 | Submit login credentials | User | FR-{feature}-001 | login | P0 | fact FR-001 |
   ```
7) __L1 approval__ preview file list + counts (gồm `{feature}-story-index.md` create/update + N us files). Nếu có story đánh OQ (FR mơ hồ) → nêu rõ ở L1 "N story cần refinement trước dev".
8) __Index file__ — tạo `userstories/{feature}-story-index.md` từ `_templates/user-story-index.md` nếu chưa có (frontmatter đầy đủ, `type: userstory-index`, owner từ memory). Nếu đã có → append rows vào bảng Stories (giữ rows cũ + cột Jira/Status nguyên trạng). Mỗi story 1 row: ID/title/persona/FR/screens/priority/status=`draft`/jira=`—`/updated.
9) __Generate us files__ từ `_templates/user-story.md` (__zero frontmatter__). Body Mục AC: giữ placeholder DRAFT của template (`<!-- DRAFT — run /ac ... -->`). Mục Open Questions: đánh dấu nguồn 🟢 fact / 🔵 suy-luận / 🔴 cần refinement.
10) __Update mode (file đã tồn tại)__ — __semantic diff theo từng story__ (KHÔNG regenerate toàn file — giữ decision/estimate/comment/Jira key user đã sửa tay): L2 diff per us file + L2 diff bảng `{feature}-story-index.md`. KHÔNG đụng cột Jira (do `/jira` sở hữu). Status trong bảng giữ nguyên trừ khi user đổi explicit.
11) __Activity.log (hook tự ghi)__ (KHÔNG vào us file — us zero-frontmatter). Mỗi story: set env `CLAUDE_SKILL_NAME=/userstory` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=[us-NNN] created from FR-{feature}-{NNN}` (≤80 ký tự) trước edit; hook ghép cả dòng.
12) __Auto-chain /ac (default)__ — sau khi write thành công, hỏi:
    ```
    ✅ Đã tạo {N} user stories. Generate Acceptance Criteria luôn không?
      Y       → chain /ac {feature} cho stories vừa tạo (recommended)
      n       → skip, để chạy /ac sau (AC placeholder TODO sẽ giữ nguyên)
      <ids>   → chỉ generate AC cho stories cụ thể (vd "us-001,us-003")
    ```
    Y → invoke `/ac` skill inline với scope stories vừa tạo (KHÔNG re-pick feature, KHÔNG re-read SRS — pass context), mode generate mặc định. Vẫn tuân L1+L2 của `/ac`. __AC sinh ở bước này = draft__, cần PO/QA chốt example + rule trước khi coi là AC final.
13) __Coverage check__ — gợi ý chạy `/gap {feature}` để dựng ma trận FR/BR/NFR/error → US → AC + phát hiện FR chưa được story nào phủ / US thiếu AC / story trùng outcome. (KHÔNG nhồi ma trận vào skill này — `/gap` là nơi làm traceability cross-doc.)
14) __Output__ + next: `/gap {feature}` (check coverage), `/jira {feature} --dry-run` (flag giữ nguyên — cổng an toàn trước khi đẩy Jira thật). (Nếu skip step 12: gợi ý `/ac {feature}`.)

## Output

| File | Nội dung |
|---|---|
| `docs/{feature}/userstories/us-{NNN}.md` | Nội dung story — __zero frontmatter__, prose sections (AC inline) |
| `docs/{feature}/userstories/{feature}-story-index.md` | Master metadata + bảng Stories (ID/persona/FR/screens/priority/status/jira-key) |

Status + priority + jira key sống ở __index__, KHÔNG ở file us. Hook tự ghi `docs/_shared/changelog.md`.

## References

* @../../rules/ba-conventions.md
* @../../rules/approval-gate.md
* @../../rules/kg-usage.md
* @../../rules/naming-conventions.md
* @../../rules/feature-bootstrap.md
* @../../rules/delivery-readiness.md
* @../../rules/changelog.md
* @../../../_templates/user-story-index.md
* @../../../_templates/user-story.md
* @../../../_templates/ac-block.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
