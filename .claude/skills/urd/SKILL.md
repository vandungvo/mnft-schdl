---
name: urd
description: Dùng khi cần ghi hoặc sửa User Requirements (persona, nhu cầu, journey, success criteria) cho 1 feature. `/urd <feature>` hoặc `/urd` (chọn feature).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[<feature>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /urd — Per-feature User Requirements Document‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Produce `docs/{feature}/{feature}-urd.md` mô tả đầy đủ chuỗi nhu cầu người dùng của 1 feature: vấn đề và trải nghiệm hiện tại → user types → phạm vi → user needs → prioritized journeys → edge conditions → constraints/assumptions → measurable outcomes → open questions. Doc dành cho stakeholders (UX, PM, BA), tập trung vào __người dùng cần gì, trong bối cảnh nào và kết quả nào có giá trị__ — không chứa business case, release planning hay technical spec.

## Constraints (must follow)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Approval gate L1__ trước mọi Write (per @../../rules/approval-gate.md). Show BA-friendly prose preview, wait Y/n/select.
- __L2 diff khi file đã tồn tại__ — update mode tự động (không cần flag), preserve user edits, chỉ apply diff cho sections có info mới.
- __Auto-detect upstream + confirm__ — KHÔNG auto-pick im lặng. List candidates, user pick (number/skip/path). User muốn dùng nguồn khác thì tag `@file` hoặc dán nội dung trong câu chat.
- __Read-before-ask bắt buộc__ — đọc đầy đủ URD hiện có + mọi nguồn user đã chọn, lập coverage nội bộ theo từng section/field rồi __chỉ hỏi phần còn thiếu__. Tuân no-re-ask cho cả session và file.
- __Thông tin cấp dự án đọc + ghi vào profile__ — thuật ngữ gọi người dùng cuối, nhóm người dùng chung của sản phẩm, compliance: đọc `docs/_shared/project-profile.md` trước (persona per-feature vẫn hỏi bình thường); thiếu thì hỏi rồi đề xuất ghi vào profile. Per @../../rules/project-profile.md.
- __Soft gate__ — thiếu brainstorm/seed → warn + hỏi đúng dữ kiện URD còn thiếu, không buộc chạy skill khác trước.
- __Đúng tầng URD__ — chỉ user problem / user type / scope / need / journey / edge condition / user-side constraint / assumption / user outcome. KHÔNG lấn sang:
  - BRD: ROI, cost-benefit, business objective, business timeline.
  - PRD: capability P0/P1/P2, release plan, product decomposition.
  - SRS/AC: API, DB, service, SDK, error code, retry kỹ thuật, EARS, Given/When/Then, implementation logic.
- __User importance ≠ release priority__ — User Needs/Journeys dùng `Critical / High / Medium / Low` theo ảnh hưởng với user; KHÔNG dùng P0/P1/P2.
- __Assumption transparency__ — suy luận có cơ sở được phép dùng nhưng phải gắn `Assumption` trong Evidence hoặc Mục Assumptions & Validation để user nhận biết và sửa. Fact quan trọng không đủ cơ sở → Open Question; KHÔNG bịa và KHÔNG rải `<!-- TBD -->` khắp doc.
- __Journey quality__ — journey xếp từ quan trọng nhất xuống; mỗi journey có user, trigger, expected outcome, related need IDs và checkpoint kiểm chứng độc lập bằng kết quả quan sát được. High-level user steps only.
- __Edge coverage__ — luôn có user-facing exceptions/edge conditions ngoài happy path. Chỉ mô tả tình huống, tác động tới user và kết quả user cần thấy; không viết Error Matrix kỹ thuật.
- __Success criteria quality__ — outcome-based, measurable, technology-agnostic; mỗi criterion có baseline, target, measurement và review period. Thiếu baseline → ghi rõ `Chưa có` + cách/kỳ xác lập, không tự tạo số.
- __Vietnamese-first__ — default `vi`, auto-detect từ seed. Muốn tiếng Anh thì nói "viết bằng tiếng Anh".
- __Frontmatter__ — `type`, `feature`, `status`, `updated`, flat `links` (tối giản 2026-07-12); KHÔNG body changelog table — lịch sử ở `docs/_shared/changelog.md`.
- __File đã tồn tại__ → tự động chuyển sang update mode (L2 diff), không refuse.
- __BA conventions__ (must follow) — Owner resolution từ memory `user-identity`, no-re-ask rule, IT-BA framing, Vietnamese typography, L1 prose preview. Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Multi brainstorm trong feature__ — list cả, cho phép pick `1,2`; đọc hết nguồn đã chọn trước khi hỏi.
- __Existing URD có cấu trúc cũ__ — update theo nội dung user yêu cầu, preserve facts; không tự migrate hàng loạt docs khác.
- __Nguồn mâu thuẫn__ — hỏi đúng điểm conflict, không chọn im lặng; nếu conflict không cản trở draft, ghi Open Question.
- __User không biết baseline__ — ghi `Chưa có — xác lập bằng {measurement} trong {period}`; không ép họ bịa số.
- __Target chưa được user chốt nhưng có thể suy luận__ — chọn target thận trọng, ghi `Assumption` và liệt kê `🔶` sau auto-review.
- __Need và journey trùng wording__ — need nói kết quả cần đạt; journey nói bối cảnh/trình tự user tiến tới kết quả.
- __Edge condition technical hóa__ — viết “user biết tiền chưa hoàn và bước tiếp theo” thay vì “retry webhook 3 lần”.
- __Importance drift__ — `Critical/High/Medium/Low` là user impact, không quyết định release scope.
- **User tag `@file` không tồn tại** — list nguồn khả dụng thay vì error cụt.
- __Hook stale-propagation__ tự fire sau Write/Edit; skill không tự quản lý stale.
- __@author__ (cho activity log) — resolve qua memory `user-identity`; không kế thừa từ upstream. KHÔNG có field owner trong frontmatter (đã diet 2026-07-12).

## Inputs

```
/urd                            # interactive: list features, pick một
/urd <feature>                  # target feature trực tiếp — có sẵn urd.md thì tự vào update mode
```

Muốn đổi hành vi mặc định, nói bằng lời trong câu lệnh hoặc câu trả lời tiếp theo:
- Dùng nguồn khác thay vì brainstorm mặc định → tag `@file` hoặc dán nội dung.
- Viết bằng tiếng Anh → nói "viết bằng tiếng Anh".
- Bỏ auto-review → nói "khỏi review".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có sẵn: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | head -20`

## Approach (high-level — Claude tự pick details)

1. __Resolve feature.__ Interactive picker nếu no-arg. Feature chưa tồn tại xử lý theo `feature-bootstrap.md`: prose → derive slug; slug lạ → hỏi feature mới hay gõ nhầm; chỉ tạo folder sau L1.
2. __Read existing first.__ Nếu `docs/{feature}/{feature}-urd.md` tồn tại, đọc __toàn bộ file__ trước khi lên câu hỏi và báo user đang update. Không chỉ đọc section dự kiến sửa.
3. __Auto-detect upstream.__ Scan `docs/{feature}/brainstorms/*.md` và nguồn liên quan đã tồn tại; list để user chọn number/skip/path. Đọc đầy đủ mọi nguồn được chọn.
   - __KG chọn nguồn trước (rẻ hơn scan):__ chạy `node .claude/skills/kg/engine/kg-query.mjs facts {feature}` và `node .claude/skills/kg/engine/kg-query.mjs neighbors <doc-path>` khi có doc mốc để lấy danh sách candidate/coverage, rồi VẪN Read đầy đủ prose file đã chọn. Tuân `.claude/rules/kg-usage.md` (3 nghĩa vụ: `--all` khi bị cap · đọc mục "Phải Read tay" · `KG-ERROR` → scan trực tiếp như cũ).
4. __Build coverage map nội bộ__ theo output contract:
   - user problem/current experience;
   - user types;
   - in-scope/out-of-scope;
   - needs: context, expected outcome, importance, evidence;
   - journeys: priority, trigger, outcome, independent checkpoint;
   - edge conditions;
   - user-side constraints;
   - assumptions/validation;
   - success baseline/target/measurement/review period;
   - open questions.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   Đánh dấu mỗi item `known / inferable / missing / conflicting`; không in bảng này vào doc.
5. __Detect language__ từ seed, default `vi`; user yêu cầu ngôn ngữ khác thì override.
6. __Ask only missing information.__ Hỏi 3-8 câu numbered trong 1 batch, chỉ cho `missing/conflicting` quan trọng. Không hỏi lại `known`; với `inferable`, tự chọn phương án hợp lý và đánh dấu Assumption. Follow-up chỉ hỏi phần câu trả lời còn thiếu.
7. **Synthesize theo `_templates/urd.md`:**
   - __Purpose + User Problem & Current Experience:__ mục tiêu user, cách làm hiện tại, pain và hậu quả.
   - __User Types:__ đúng 1 primary; secondary theo vai trò thực sự liên quan.
   - __Scope Boundaries:__ explicit In Scope + Out of Scope bằng outcome/capability nhìn từ user.
   - __User Needs:__ ID `UN-001...`; mỗi row có user, context/trigger, need, expected outcome, importance, evidence (`Confirmed`, `Observed: {source}`, hoặc `Assumption`).
   - __Prioritized User Journeys:__ xếp importance giảm dần; mỗi journey reference `UN-*`, có trigger, expected outcome, high-level user steps và __Independent verification__. Một journey độc lập khi reviewer có thể xác nhận user đã đạt một kết quả có giá trị mà không cần dựa vào journey ưu tiên thấp hơn.
   - __User Exceptions & Edge Conditions:__ phủ unavailable/invalid/interrupted/delayed/empty/eligibility scenarios phù hợp; user impact + expected user-facing outcome.
   - __User-side Constraints:__ language, channel/device, accessibility, eligibility, environment; chuyển mọi solution wording sang user-observable wording.
   - __Assumptions & Validation:__ assumption, impact if wrong, status, next action. Không trình bày inference như fact.
   - __User Success Criteria:__ ID `USC-001...`; outcome + baseline + numeric/observable target + measurement + review period; độc lập công nghệ.
   - __Open Questions:__ chỉ quyết định còn thiếu có ảnh hưởng tới scope/need/outcome. Không tạo OQ cho dữ kiện đã suy luận hợp lý và đã đánh dấu Assumption.
8. __Quality boundary pass trước L1.__ Tự loại:
   - EARS/Given-When-Then/error code/retry/API/DB/service/SDK;
   - ROI/cost/business timeline;
   - release P0/P1/P2 và screen inventory;
   - journey lặp nguyên văn User Needs;
   - success criterion mô tả implementation hoặc không thể đo;
   - ASCII flow (chi tiết flow thuộc `/user-flow`).
9. __Approval L1.__ In BA-friendly prose preview theo `ba-conventions.md`: số user types, needs, journeys, edge conditions, assumptions, success criteria và OQs; nêu rõ số inference sẽ mang nhãn Assumption. Y proceed; n abort.
10. __Write / Update.__ Tạo mới với frontmatter chuẩn; trước Write set đủ env `CLAUDE_SKILL_NAME=/urd` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE` (≤80 ký tự, vd `initial draft từ {seed-or-conversation}`) — hook ghép cả dòng vào changelog.md. Update mode merge thoughtfully, preserve user edits, show L2 diff trước Edit.
11. __Phase E — Resolve Open Questions (PRIORITY gate trước downstream).__ Per @../../rules/resolve-oqs.md. Collect own OQs + inherited từ brainstorm còn `[ ]`/`[~]`; prompt Y/skip/ids; resolve one-by-one; cascade scan + L2 diff cho mọi doc liên quan; mỗi doc edit tự có dòng changelog.md qua hook.
12. __Phase F — Auto-review + auto-fix (mặc định, không hỏi trước).__ Sau Phase E, spawn song song `@senior-ba` + `@po-reviewer` với target doc, nguồn đã chọn và rules. Aggregate/dedupe findings per @../../rules/review-format.md. TỰ APPLY toàn bộ findings hợp lý:
   - Editorial/consistency/facts đã có → fix trực tiếp.
   - Quyết định nghiệp vụ chưa được user chốt → chọn phương án nhất quán nhất với facts, user value và mức rủi ro thấp; nếu là suy luận, cập nhật Evidence/Assumptions tương ứng.
   Không dừng hỏi giữa review. Ghi các quyết định thay user trong final report dưới `🔶 Quyết định thay user — review lại`. Trước fixes set đủ env `CLAUDE_SKILL_NAME=/urd` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE` (≤80 ký tự, vd `reviewed by @senior-ba, @po-reviewer: {N} auto-fixed ({M} auto-decided)`); hook tự ghép cả dòng vào changelog.md. User nói "khỏi review" → skip phase.
13. __Output report.__ File path; counts user types/needs/journeys/edge conditions/success criteria; OQ resolved/hold; assumptions cần validation; review summary + `🔶` decisions; next suggestions `/brd`, `/prd-epic`.

## Output

`docs/{feature}/{feature}-urd.md` — User Requirements (`type: urd`). FULL frontmatter (`type`/`feature`/`status`/`updated`/`links`).

ID: `UN-*` (user need), `USC-*` (success criteria). Folder `docs/{feature}/` tạo mới nếu feature chưa tồn tại.

Hook tự ghi 1 dòng vào `docs/_shared/changelog.md`.

## Quality checklist

URD hoàn chỉnh phải cho reviewer lần theo được:

`User problem → UN need → prioritized journey → edge condition → USC outcome`

Checklist bắt buộc:

- Có đúng 1 primary user và pain/current experience có bằng chứng hoặc assumption.
- Mọi `UN-*` có context, expected outcome, importance, evidence.
- Mọi journey liên kết ít nhất 1 `UN-*`, có checkpoint kiểm chứng độc lập và được xếp importance.
- Có edge conditions phù hợp ngoài happy path; không biến thành Error Matrix.
- In Scope và Out of Scope không chồng lấn.
- Mọi assumption đều nhìn thấy được và có validation action/status.
- Mọi `USC-*` đo được, độc lập công nghệ, mô tả user outcome; baseline thiếu được ghi rõ.
- Không có chi tiết thuộc BRD/PRD/SRS/AC.

## References

- @../../rules/feature-bootstrap.md
- @../../rules/ba-conventions.md
- @../../rules/project-profile.md
- @../../rules/approval-gate.md
- @../../rules/kg-usage.md
- @../../rules/naming-conventions.md
- @../../rules/changelog.md
- @../../rules/resolve-oqs.md
- @../../rules/review-format.md
- @../../agents/senior-ba.md
- @../../agents/po-reviewer.md
- @../../../_templates/urd.md
- @./references/example-urd.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
