---
name: brd
description: Dùng khi cần ghi lý do kinh doanh, mục tiêu, phạm vi, stakeholder, business rule và rủi ro cấp nghiệp vụ cho 1 feature. `/brd <feature>` hoặc `/brd` (chọn feature).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[<feature>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /brd — Per-feature Business Requirements Document‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Produce `docs/{feature}/{feature}-brd.md` trả lời **vì sao doanh nghiệp cần thay đổi này, mục tiêu nghiệp vụ là gì, phạm vi tới đâu và ràng buộc nào phải tuân**. Đây là tài liệu ở tầng **business requirements** (theo BABOK/IIBA) mà IT-BA/PO tổng hợp — không phải business case đầu tư đầy đủ.

BRD giữ chuỗi truy vết nghiệp vụ:

`Business problem → Objective → Success measure → Scope → Business rule/constraint → Risk`

Doc tập trung business goal, current/future state, scope, stakeholder, business rule và ràng buộc nghiệp vụ. Không chứa user-needs detail (URD), product capabilities/release scope (PRD), system behavior (SRS) hay delivery plan. Không đi sâu financial modeling (NPV, ROI scenarios, options analysis nhiều phương án, investment decision gates) — cost-benefit chỉ ở mức định tính + rough ROI để justify; phân tích đầu tư chi tiết là business case riêng do sponsor/finance sở hữu.

## Constraints (must follow)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Approval L1** trước Write/Edit; preview BA-friendly theo `ba-conventions.md`.
* **L2 diff khi file đã tồn tại** — update mode tự động, preserve user edits, chỉ sửa phần có facts mới.
* **Auto-detect upstream + confirm** — list ưu tiên `{feature}-urd.md > brainstorms/* > docs/_product/prd.md`; user chọn number/skip/path. Không auto-pick.
* **Read-before-ask bắt buộc** — đọc full existing BRD và mọi nguồn đã chọn, lập coverage nội bộ rồi chỉ hỏi phần `missing/conflicting`. Không hỏi lại facts đã có.
* **Thông tin cấp dự án đọc + ghi vào profile** — domain, thị trường, mô hình kinh doanh, compliance áp dụng (hay xuất hiện ở Business Scope/Risks): đọc `docs/_shared/project-profile.md` trước; thiếu thì hỏi rồi đề xuất ghi vào profile. Per @../../rules/project-profile.md.
* **BRD chạy độc lập** — thiếu URD/brainstorm là soft gate; hỏi đúng business context còn thiếu, không bắt chạy skill upstream.
* **Đúng tầng BRD:**
  * Giữ: business problem/objective, current & future state, gap, business scope, stakeholders & stakeholder requirements, high-level business requirements, business rules, assumptions/constraints/dependencies, risks, success measures, cost-benefit định tính.
  * Chuyển URD: user needs, user journeys chi tiết, user-facing edge cases, persona detail.
  * Chuyển PRD: capabilities, P0/P1/P2, product flows, release feature scope.
  * Chuyển SRS: API/DB/service/SDK, error codes, retry, architecture, technical mitigation.
  * Chuyển project plan: sprint, build sequence, integration/testing task schedule.
  * Chuyển business case: NPV/DCF, options analysis đa phương án, investment decision gates, financial scenario modeling.
* **IT-BA framing** (per `ba-conventions.md` Mục 3) — mô tả nghiệp vụ, không hỏi/ghi chi tiết kỹ thuật. Dịch vụ ngoài chỉ nêu tên + mục đích nghiệp vụ.
* **Evidence transparency** — baseline, benefit, cost, target quan trọng phải có source/basis hoặc ghi `Assumption`. Không trình bày inference như fact.
* **Cost-benefit nhẹ, không bịa số** — trình bày định tính (cost driver + benefit + rough ROI/ưu tiên). Thiếu số liệu → ghi `Chưa có` + OQ; KHÔNG dựng NPV/payback/ROI scenario giả chính xác.
* **Objective ↔ Success measure trace** — mỗi `BO-{feature}-NN` có ≥1 success measure đo được (baseline nếu có, target, cách đo). Đây là business outcome, không phải KPI dashboard chi tiết.
* **Scope là business boundary** — process/segment/geography/channel/operating unit; không dùng scope để liệt kê feature/capability sản phẩm.
* **Business rule ≠ technical rule** — business rule là chính sách/ràng buộc nghiệp vụ (vd "khiếu nại tối đa 5 lần/đơn"), viết ngôn ngữ nghiệp vụ; rule kỹ thuật/validation chi tiết thuộc SRS.
* **Risk là business-facing** — impact/likelihood/mitigation ở mức nghiệp vụ-vận hành; không mô tả technical mitigation.
* **Vietnamese-first** — auto-detect từ source; user yêu cầu tiếng Anh thì override.
* **Frontmatter tối giản** — chỉ `type`, `feature`, `status`, `updated`, `links`.
* **Activity log tập trung** — resolve `@author` theo `ba-conventions.md`; trước mỗi Write/Edit set `CLAUDE_SKILL_NAME`, `CLAUDE_CHANGELOG_NOTE`, `CLAUDE_CHANGELOG_AUTHOR`; hook là writer duy nhất của `docs/_shared/changelog.md`. Skill không ghi history vào doc.
* **Auto-review + auto-fix mặc định** — user nói “khỏi review” mới skip.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Không có baseline** — ghi `Chưa có — xác lập bằng {source/method}`, không ép user bịa.
* **BRD ≠ business case** — nếu user hỏi NPV/ROI đa phương án/quyết định đầu tư → nói rõ đó là business case riêng do sponsor/finance sở hữu, BRD chỉ giữ cost-benefit định tính để justify.
* **Business rule vs technical rule** — "đơn > 50 triệu cần cấp quản lý duyệt" là business rule; "validate field amount kiểu number" là SRS.
* **Current/Future/Gap là lõi IT-BA** — đừng bỏ qua; đây là phần phân biệt BRD của BA với brief marketing.
* **Stakeholder requirement** — ghi kỳ vọng/nhu cầu của từng nhóm stakeholder, không chỉ tên + vai trò.
* **Technical mitigation** — chuyển SRS; BRD dùng ngôn ngữ nghiệp vụ ("giới hạn quyền duyệt", "cần compliance sign-off").
* **Stakeholder name chưa xác nhận** — dùng role, không bịa cá nhân.
* **Existing BRD legacy** — preserve facts, update section được yêu cầu; không migrate docs khác.
* **Hook stale propagation** tự xử lý downstream; skill không set stale thủ công.

## Inputs

```text
/brd                            # interactive feature picker
/brd <feature>                  # target feature; existing file → update mode
```

Natural-language controls:
* Nguồn khác → tag `@file` hoặc dán nội dung.
* Tiếng Anh → nói “viết bằng tiếng Anh”.
* Bỏ review → nói “khỏi review”.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | head -20`

## Approach

1) **Resolve feature.** No-arg → picker. Feature mới xử lý theo `feature-bootstrap.md`: prose → derive slug; slug lạ → hỏi mới hay gõ nhầm; tạo folder sau L1.
2) **Resolve author** cho activity log; không đưa author vào frontmatter.
3) **Read existing first.** Nếu `docs/{feature}/{feature}-brd.md` tồn tại, đọc toàn bộ và báo update mode.
4) **Detect sources.** Scan `docs/{feature}/{feature}-urd.md`, `docs/{feature}/brainstorms/*.md`, `docs/_product/prd.md` và user-tagged source; list để user chọn rồi đọc full selected sources.
   * **KG chọn nguồn trước (rẻ hơn scan):** chạy `node .claude/skills/kg/engine/kg-query.mjs facts {feature}` và `node .claude/skills/kg/engine/kg-query.mjs neighbors <doc-path>` khi có doc mốc để lấy danh sách candidate/coverage, rồi VẪN Read đầy đủ prose file đã chọn. Tuân `.claude/rules/kg-usage.md` (3 nghĩa vụ: `--all` khi bị cap · đọc mục "Phải Read tay" · `KG-ERROR` → scan trực tiếp như cũ).
5) **Build coverage map nội bộ** với trạng thái `known / inferable / missing / conflicting`:
   * business problem, baseline, business impact;
   * opportunity/why-now, strategic alignment;
   * current state (quy trình/cách làm hiện tại);
   * future state + gap;
   * business objectives + success measures;
   * business scope (in/out) + constraints + dependencies;
   * stakeholders + stakeholder requirements;
   * high-level business requirements;
   * business rules;
   * assumptions;‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   * risks;
   * cost-benefit định tính;
   * open questions.
6) **Ask only missing/conflicting.** Hỏi 3-8 câu numbered trong 1 batch, business language, ưu tiên dữ kiện ảnh hưởng mục tiêu/phạm vi. Không hỏi lại `known`; `inferable` → dùng phương án hợp lý và gắn Assumption. Follow-up chỉ phần chưa đủ.
7) **Synthesize theo `_templates/brd.md`:**
   * **Executive Summary:** problem, mục tiêu, phạm vi tóm tắt, giá trị nghiệp vụ, timeline cấp cao.
   * **Business Problem & Context:** `BP-*` business condition + baseline + impact + evidence; opportunity/why-now; strategic alignment (map OKR/chiến lược).
   * **Current State / Future State / Gap:** cách làm hiện tại → trạng thái mong muốn → gap chính cần giải (đặc thù IT-BA).
   * **Stakeholders:** role, interest, influence, stakeholder requirement/expectation; không bịa tên người.
   * **Business Objectives & Success Measures:** `BO-*` SMART + success measure đo được (baseline/target/cách đo).
   * **Business Scope:** in-scope/out-of-scope + assumptions + constraints + dependencies.
   * **High-level Business Requirements:** `BREQ-*` — điều nghiệp vụ cần đạt, ngôn ngữ nghiệp vụ, trace về BO. Không phải FR kỹ thuật.
   * **Business Rules:** `BR-*` — chính sách/ràng buộc nghiệp vụ (giới hạn, điều kiện, quyền duyệt). Ngôn ngữ nghiệp vụ.
   * **Cost-Benefit (định tính):** cost driver chính + benefit chính + rough ROI/mức ưu tiên. Không NPV/scenario.
   * **Risks:** `RISK-*` — likelihood, impact, mitigation nghiệp vụ, owner role.
   * **Open Questions:** quyết định nghiệp vụ còn treo.
8) **Cost-benefit handling:**
   * Trình bày định tính: cost driver, benefit nghiệp vụ, mức độ ưu tiên/rough ROI.
   * Có số thì ghi kèm basis; thiếu → `Chưa có` + OQ.
   * KHÔNG dựng NPV/payback/financial scenario. Nếu user thực sự cần đầu tư analysis → route "đó là business case riêng".
9) **Quality boundary pass:** chuyển/viết lại mọi user-needs detail, capability, API/DB/architecture, technical mitigation, delivery task hoặc financial modeling sai tầng.
10) **Quality gate trước L1:**
    * mọi `BO-*` có ≥1 success measure;
    * success measure có cách đo (baseline nếu có + target);
    * có current state, future state và gap;
    * scope có in/out + assumptions + constraints;
    * business rule viết ngôn ngữ nghiệp vụ, không phải validation kỹ thuật;
    * high-level requirement trace về BO;
    * risk có mitigation + owner role;
    * cost-benefit định tính, không có số bịa;
    * không có detail thuộc URD/PRD/SRS/project plan/business case.
    Fail material → hỏi thêm; inferable → mark Assumption.
11) **L1 preview.** Nêu problem/mục tiêu, số BO/success measure/business requirement/business rule/risk, phạm vi, cost-benefit định tính, assumptions/OQs và activity note. Wait Y/n/sửa.
12) **Write/Update.** Set activity env rồi Write/Edit `docs/{feature}/{feature}-brd.md`; L2 trước Edit.
13) **Phase E — Resolve Open Questions.** Theo `resolve-oqs.md`: own + inherited từ brainstorm và `{feature}-urd.md`; one-by-one; cascade scan + L2; hook log mỗi edit.
14) **Phase F — Auto-review + auto-fix.** Spawn `@senior-ba`, `@po-reviewer`, `@pm-reviewer` song song. Ngoài review-format chung, soi: objective ↔ success measure trace, gap coverage, scope-layer leakage, business-rule vs technical-rule, evidence quality. Tự apply findings hợp lý; auto-decision gắn Assumption và liệt kê dưới `🔶 Quyết định thay user — review lại`. Set activity env trước fixes.
15) **Final report.** Path; counts BO/success measure/business requirement/business rule/risk; OQ resolved/hold; assumptions pending; review fixes + `🔶`; next `/prd-epic {feature}`.

## Output

`docs/{feature}/{feature}-brd.md` — Business Requirements (`type: brd`). FULL frontmatter.

ID feature-prefixed: `BO-{feature}-NN` (objective), `BR-{feature}-NNN` (business rule).

Hook tự ghi 1 dòng vào `docs/_shared/changelog.md`.

## Quality checklist

Reviewer phải lần theo được:

`BP-* → BO-* → success measure → BREQ-* → BR-* / RISK-*`

* Mỗi objective có success measure đo được; không có objective mồ côi.
* Có current state → future state → gap rõ ràng.
* Business requirement ngôn ngữ nghiệp vụ, trace về objective.
* Business rule là chính sách nghiệp vụ, không phải validation kỹ thuật.
* Cost-benefit định tính, không có "con số bịa".
* Assumption không ẩn trong prose.
* Không có detail thuộc URD/PRD/SRS/project plan/business case.

## References

* @../../rules/feature-bootstrap.md
* @../../rules/ba-conventions.md
* @../../rules/project-profile.md
* @../../rules/approval-gate.md
* @../../rules/kg-usage.md
* @../../rules/naming-conventions.md
* @../../rules/changelog.md
* @../../rules/resolve-oqs.md
* @../../rules/review-format.md
* @../../agents/senior-ba.md
* @../../agents/po-reviewer.md
* @../../agents/pm-reviewer.md
* @../../../_templates/brd.md
* @./references/example-brd.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
