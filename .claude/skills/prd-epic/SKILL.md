---
name: prd-epic
description: Dùng khi cần định nghĩa scope 1 feature/epic (goals, personas, capability P0/P1/P2, release plan). `/prd-epic <feature>` hoặc `/prd-epic` (chọn feature). Đây là đặc tả **1 feature**; khác `/prd` (PRD toàn sản phẩm, project-level).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[<feature>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /prd-epic — Per-feature/Epic Requirements Document‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Produce `docs/{feature}/{feature}-prd.md` đóng gói "feature sẽ *làm gì*": overview + gap-neo AS-IS→TO-BE, goals/non-goals, personas, capabilities (priority + rationale + trace + bóc-story + done-when), upstream traceability, capability interactions, success metrics (baseline/target/measurement/timeframe), dependencies (owner/status/needed-by), assumptions, risks (probability/impact/mitigation/owner), release horizon + launch readiness. Là bridge giữa business case (BRD) và technical spec (SRS) cho __1 feature/epic__.

> **Phân biệt với `/prd`:** `/prd-epic` (skill này) = đặc tả __1 feature__, output `docs/{feature}/{feature}-prd.md`, list capabilities P0/P1/P2 trong feature. `/prd` = PRD __toàn sản phẩm__ (project-level), output `docs/_product/prd.md`, bóc tách nhiều feature. Hai tầng khác nhau, đừng nhầm.

> **Vai trò IT-BA + PO (khung chủ đạo, per `feedback_it_ba_po_role`):** PRD-epic là __bản lề 2 handoff__, không phải sản phẩm cuối:
> - __Xuống dev/SRS (vai IT-BA):__ capability đủ rõ để `/srs` derive FR, có scope boundary, KHÔNG lấn kỹ thuật (không endpoint/SDK/schema/infra ở PRD — đó là SRS/NFR).
> - __Sang backlog (vai PO):__ capability là __vertical-slice bóc được ~3-15 story INVEST-able__, có priority + business value + "done when" tầng sản phẩm.
> Mọi section phục vụ đúng 2 handoff này. Không lệch dev (DB/API) cũng không lệch business-case/finance (NPV/options/investment gate — đó là BRD/sponsor).

## Quality checklist‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

PRD hoàn chỉnh phải cho reviewer lần theo được:

`URD UN-* / BRD BO-* → product outcome → CAP-* (priority + rationale) → done-when → success metric (baseline→target) → SRS FR handoff`

Checklist bắt buộc (self-verify TRƯỚC L1, fail material → hỏi thêm / mark Assumption):

* Mọi `CAP-*` trace tới ≥1 `UN-*` hoặc `BO-*`; mọi `BO-*` liên quan feature scope được phủ bởi ≥1 capability hoặc ghi rõ non-goal.
* Mọi capability có: priority, rationale không rỗng, "bóc ~N story" (N trong [~3,15] — ngoài khoảng → flag altitude), "done when" là product outcome quan sát được.
* Tập P0 đủ để launch v1 (P0-sufficient).
* Mọi metric có baseline (hoặc `Chưa có — xác lập bằng {method}`), target, measurement, timeframe.
* Mọi dependency là __business dependency__ có owner + status; dependency kỹ thuật (endpoint/infra/SDK) đã đẩy sang SRS/NFR, KHÔNG nằm ở PRD.
* Mọi risk có probability + impact + mitigation + owner (dùng `Probability`, KHÔNG dùng cột "Trigger").
* Mọi assumption/inference của AI hiện diện ở bảng Assumptions hoặc inline `[NEEDS CLARIFICATION: …]`, không trình như fact.
* Launch readiness chỉ dùng business guardrail (conversion, success rate), KHÔNG infra metric (CPU/latency).
* Không có detail thuộc URD (user research chi tiết) / BRD (ROI/cost model) / SRS (FR/API/error code) / AC (Given-When-Then).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Approval L1__ trước Write.
* __L2 diff khi file đã tồn tại__ — update mode tự động (không cần flag), preserve user edits, chỉ apply diff cho sections có info mới.
* __Auto-detect upstream + confirm__ — list URD + BRD + brainstorms; cho phép multi-pick để combine. User muốn dùng nguồn khác thì tag `@file` hoặc dán nội dung trong câu chat.
* __Read-before-ask bắt buộc__ — đọc __toàn bộ__ PRD hiện có (nếu update mode) + mọi nguồn upstream đã chọn (`{feature}-urd.md`, `{feature}-brd.md`, brainstorms) TRƯỚC khi hỏi; dựng coverage map nội bộ rồi chỉ hỏi phần `missing/conflicting`. Tuân no-re-ask cho cả session và file.
* __Soft gate__ thiếu URD/BRD/brainstorm.
* __Đúng tầng PRD-epic__ — capabilities P0/P1/P2 là __scope decision trong 1 feature__, KHÔNG phải feature breakdown (feature đã là 1 đơn vị độc lập); không lấn kỹ thuật (SRS) hay business case (BRD). ID `CAP-{feature}-NN` per naming-conventions.
* __Capability = đơn vị handoff-được + groom-được__ — mỗi capability phải (a) đủ rõ để `/srs` derive FR (vai IT-BA), (b) bóc được ~3-15 story INVEST-able + có "done when" product outcome (vai PO). Capability cỡ story (~<3 story, đơn hành vi) → gộp hoặc note là AC; cỡ epic (~>15 story, cần nhiều flow rời) → đề xuất tách feature.
* __Dependency ở PRD chỉ là business dependency__ — team/vendor/regulatory với owner + status + needed-by. Dependency kỹ thuật (webhook endpoint, RDS/KMS, encryption at-rest, SDK, public HTTPS) KHÔNG viết ở PRD — đẩy sang SRS/NFR. Đây là cực (a) mà `feedback_it_ba_po_role` cấm; phát hiện infra trong nguồn → chuyển tầng, note trong report.
* __Assumption transparency__ — mọi inference của AI phải gắn ở bảng Assumptions & Validation hoặc inline `[NEEDS CLARIFICATION: …]`; fact quan trọng không đủ cơ sở → Open Question; KHÔNG bịa, KHÔNG rải TBD khắp doc.
* __KHÔNG tự sinh SRS__ — chỉ list capabilities, user chạy `/srs <feature>` riêng.
* __KHÔNG lấn AC/story mapping__ — PRD chỉ ước "bóc ~N story" để test altitude, KHÔNG tự bóc story, KHÔNG viết Given-When-Then, KHÔNG estimate effort/story point.
* __Vietnamese-first__ — auto-detect từ seed. Muốn tiếng Anh thì nói "viết bằng tiếng Anh".
* __Frontmatter tối giản__ (type/feature/status/updated/links).
* __File đã tồn tại__ → tự động chuyển sang update mode (L2 diff), không refuse.
* __BA conventions__ (must follow) — Author resolution cho activity log, no-re-ask rule, IT-BA framing, Vietnamese typography, L1 prose preview. Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong

* __Personas từ URD__ — nếu URD đã có Mục 2 User Types, tham chiếu + rút 1 dòng mô tả sang PRD Mục 3 (kèm `UN-*` ref), đừng paraphrase dài (risk drift). Text canonical ở URD.
* __Business outcomes từ BRD__ — đọc `BO-*` + Success Measures để PRD giữ nhất quán outcome/target + điền cột `Traces to`; chỉ inherit outcome liên quan feature scope. Nếu user reply khác BRD → flag conflict, ask which is canonical.
* __Capability split__ — P0 phải đủ launch v1, P1 "soon after", P2 "future". P0 >7 items → warn "consider split feature thành 2". Mỗi capability kiểm altitude qua cột "bóc ~N story": N < ~3 → cỡ story, gộp/hạ thành AC; N > ~15 → cỡ epic, đề xuất tách feature.
* __Rationale không được rỗng__ — mỗi capability phải trả lời "vì sao priority này" (vd "P0 vì là điều kiện pháp lý", "P1 vì phụ thuộc CAP khác xong trước"). PO cần rationale để bảo vệ thứ tự backlog; "P0 vì tôi nói P0" không đứng vững.
* __Done-when là product outcome, không phải AC__ — "done when {kết quả sản phẩm quan sát được}" (vd "khách guest hoàn tất thanh toán không cần đăng ký"), KHÔNG viết Given-When-Then (đó là `/ac`), KHÔNG FR.
* __Dependency kỹ thuật lọt vào PRD__ — nguồn demo/URD/BRD hay có "AWS RDS KMS", "webhook HTTPS endpoint", "encrypt at-rest": KHÔNG viết vào PRD Dependencies — chuyển sang SRS/NFR, note trong report "đã chuyển {n} dependency kỹ thuật sang SRS". PRD chỉ giữ business dependency (team/vendor/regulatory) với owner + status + needed-by.
* __Metric không có baseline__ — ghi `Chưa có — xác lập bằng {measurement} trong {timeframe}`, KHÔNG ép user bịa số, KHÔNG bỏ trống.
* __Risk dùng Probability, không Trigger__ — cột là `Probability | Impact | Mitigation | Owner`; không có nguồn chuẩn nào dùng cột "Trigger". Mitigation kỹ thuật ("retry/rate limit") → chuyển SRS; PRD dùng mitigation nghiệp vụ ("giới hạn pilot", "playbook CS").
* __Launch guardrail chỉ business metric__ — conversion/success rate/completion; KHÔNG infra metric (CPU/latency — đó là SRS/NFR). KHÔNG dùng shape SRE launch checklist.
* __Đây là feature-level, không phải project-level__ — KHÔNG list "P0/P1/P2 features" toàn dự án (đó là việc của `/prd`). Ở đây split là __capabilities__ trong 1 feature, không phải features riêng.
* __KHÔNG lệch business-case/finance__ — PRD không chứa NPV/ROI/cost model/options analysis/investment gate (đó là BRD/sponsor). Launch readiness ≠ business case.
* __Hook stale-propagation__ — edit PRD mark SRS downstream stale.
* __Author__ resolve qua memory `user-identity` (không đưa vào frontmatter — sống ở changelog.md).

## Inputs

```
/prd-epic                            # interactive feature picker
/prd-epic <feature>                  # target feature — có sẵn {feature}-prd.md thì tự vào update mode
```

Muốn đổi hành vi mặc định, nói bằng lời trong câu lệnh hoặc câu trả lời tiếp theo:
* Dùng nguồn khác thay vì URD/BRD/brainstorm mặc định → tag `@file` hoặc dán nội dung.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
* Viết bằng tiếng Anh → nói "viết bằng tiếng Anh".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có sẵn: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | head -20`

## Approach

1) Resolve feature. **Feature chưa tồn tại (điểm-vào nhóm A, per `feature-bootstrap.md`):** arg là mô tả sản phẩm thô mà chưa có `docs/{feature}/` → derive slug + confirm ở L1 + tạo folder khi Write. PRD tổng hợp URD+BRD nên nếu chưa có 2 cái đó → warn "PRD thường tổng hợp URD+BRD; chưa có thì em phỏng vấn scope từ đầu, hoặc anh chạy `/urd`+`/brd` trước cho đầy đủ" + vẫn proceed nếu user muốn (soft, không refuse cứng). Slug-lạ 1 từ → hỏi "feature mới hay gõ nhầm?".
2) Validate existing — `docs/{feature}/{feature}-prd.md` đã tồn tại → tự chuyển sang update mode (không cần flag), báo user biết đang update.
3) __Multi-source auto-detect__ — scan `docs/{feature}/{feature}-urd.md`, `docs/{feature}/{feature}-brd.md`, `docs/{feature}/brainstorms/*`. Show list, allow user pick combo (e.g. "1,2" = URD+BRD). User muốn dùng nguồn khác thì tag `@file` hoặc dán nội dung.
   * __KG chọn nguồn trước (rẻ hơn scan):__ chạy `node .claude/skills/kg/engine/kg-query.mjs facts {feature}` và `node .claude/skills/kg/engine/kg-query.mjs neighbors <doc-path>` khi có doc mốc để lấy danh sách candidate/coverage, rồi VẪN Read đầy đủ prose file đã chọn. Tuân `.claude/rules/kg-usage.md` (3 nghĩa vụ: `--all` khi bị cap · đọc mục "Phải Read tay" · `KG-ERROR` → scan trực tiếp như cũ).
4) Detect language từ seed (heuristic: Vietnamese diacritics), consistency với URD/BRD nếu có. User nói "viết bằng tiếng Anh" → override.
5) __Build coverage map nội bộ__ (KHÔNG in vào doc) theo output contract — đánh dấu mỗi field `known / inferable / missing / conflicting`, đọc từ upstream + existing PRD:
   * gap-neo AS-IS→TO-BE (thường có ở URD/BRD; PRD chỉ reference 1 dòng);
   * product goals + non-goals;
   * personas (từ URD Mục 2 User Types) + `UN-*` ref;
   * capabilities: title, priority, __rationale__, trace (`UN-*`/`BO-*`), __bóc ~N story__, __done-when__, readiness;
   * success metrics: baseline, target, measurement, timeframe (từ BRD Success Measures nếu có);
   * dependencies: owner, status, needed-by (chỉ business dependency);
   * assumptions + validation;
   * risks: probability, impact, mitigation, owner;
   * release horizon (Now/Next/Later) + launch readiness (workstream + guardrail);
   * open questions.
6) __Ask only missing/conflicting__ — hỏi 4-8 câu numbered trong 1 batch, chỉ cho `missing/conflicting` quan trọng. KHÔNG hỏi lại `known`; với `inferable` tự chọn phương án hợp lý + đánh dấu Assumption. Câu hỏi ưu tiên:
   * elevator pitch + gap AS-IS→TO-BE (nếu URD/BRD chưa có);
   * product goals + non-goals (enforce ask lại nếu user nói "không có non-goal");
   * với mỗi capability: __vì sao priority này__ (rationale) + __ước bóc mấy story__ + __done khi nào__ (product outcome);
   * success metric thiếu baseline/target/measurement/timeframe;
   * business dependency owner/status/needed-by;
   * business guardrail cho launch (metric + threshold + quyết định nếu vượt).
   Follow-up chỉ hỏi phần câu trả lời còn thiếu, KHÔNG hỏi lại từ đầu. Hỏi theo IT-BA framing (business language, không DB/API/SDK/endpoint).
7) Synthesize seed (URD personas + BRD business objectives/success measures + brainstorm capabilities) + answers → PRD content theo `_templates/prd.md`. Với mỗi inference: gắn Assumption hoặc `[NEEDS CLARIFICATION]`.
8) __Quality gate + boundary pass__ (self-verify theo Quality checklist) — TỰ loại/chuyển tầng: EARS/Given-When-Then/error code/API/DB/SDK (→ SRS/AC); ROI/cost model/investment gate (→ BRD); dependency kỹ thuật (→ SRS/NFR); user research chi tiết (→ URD); feature-list toàn dự án (→ `/prd`). Capability ngoài khoảng [~3,15] story → flag altitude. Metric thiếu baseline → `Chưa có — xác lập bằng {method}`. Fail material không tự suy được → thêm câu hỏi; inferable → mark Assumption.
9) Approval L1 (prose BA-friendly per ba-conventions Mục 5): số capabilities + priority split, số metric có/thiếu baseline, số dependency, số assumption/risk, số OQ; nêu rõ số inference mang nhãn Assumption + dependency kỹ thuật đã chuyển tầng.
10) Write. Trước Write set activity env với note `initial draft từ {URD+BRD+brainstorm}`; hook ghi `docs/_shared/changelog.md`.
11) Update mode (file đã tồn tại) — đọc file cũ, merge thoughtfully (preserve sections user đã fill), L2 diff trước ghi. Backward-compat: PRD demo cũ schema thưa (không có cột rationale/trace/done-when) → KHÔNG tự migrate hàng loạt; chỉ áp schema mới cho capability/section user đang sửa hoặc thêm mới, row cũ giữ nguyên trừ khi user yêu cầu chuyển.
12) __Phase E — Resolve Open Questions (PRIORITY gate trước downstream)__ — per @../../rules/resolve-oqs.md. Collect own OQs + inherited từ `docs/{feature}/{feature}-{urd,brd}.md` + `brainstorms/*.md`. Prompt Y/skip/ids → loop 1-by-1 → side-effect L2 diff → update upstream doc nếu inherited OQ resolved → mỗi doc tự có dòng changelog.md qua hook.
13) __Phase F — Auto-review + auto-fix (chạy mặc định, KHÔNG hỏi trước)__ — sau Phase E, TỰ ĐỘNG spawn agents song song (default `@senior-ba`, `@po-reviewer`, `@pm-reviewer`) với target doc + relevant rules, aggregate findings per @../../rules/review-format.md (dedupe, severity escalation 2+ agents WARNING→BLOCKING). Ngoài review-format chung, yêu cầu 3 agent soi: (i) trace completeness (`CAP-*`→`UN-*`/`BO-*`, `BO-*` được phủ), (ii) capability altitude + "bóc ~N story" hợp lý (`@po-reviewer`), (iii) metric measurability (baseline/target/measurement/timeframe), (iv) scope-layer leakage (dependency kỹ thuật / FR / ROI lọt vào PRD). Phân loại findings 2 nhóm rồi xử lý: __(a) safe fix__ — editorial, consistency nội bộ doc, bổ sung từ facts user đã chốt ở upstream/interview → TỰ APPLY hết, không hỏi; __(b) business decision__ — đổi con số/quyết định user đã chốt, thêm ràng buộc nghiệp vụ mới → TỰ CHỌN phương án hợp lý nhất (ưu tiên nhất quán với facts đã chốt + ít rủi ro nghiệp vụ nhất) và apply luôn, KHÔNG dừng hỏi giữa chừng; đánh dấu từng quyết định này trong output report mục "🔶 Quyết định thay user — review lại" để user kiểm và chỉnh nếu muốn. Trước fixes set env `CLAUDE_SKILL_NAME=/prd-epic` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=reviewed by @{agents}: {N} auto-fixed ({M} auto-decided)` (≤80 ký tự); hook ghép cả dòng vào changelog.md. Output report liệt kê rõ những gì đã tự sửa. User nói "khỏi review" trong câu lệnh → skip phase này.
14) Output report — file path + resolved/hold count + review summary (nếu chạy) + `🔶` decisions + next: `/srs {feature}` để kỹ thuật hoá.

## Output

`docs/{feature}/{feature}-prd.md` — Product Requirements cấp feature/epic (`type: prd`). FULL frontmatter.

ID `CAP-{feature}-NN` (capability, P0/P1/P2). Khác `/prd` — cái đó ghi `docs/_product/prd.md` cấp sản phẩm.

Hook tự ghi 1 dòng vào `docs/_shared/changelog.md`.

## References

* @../../rules/feature-bootstrap.md
* @../../rules/ba-conventions.md
* @../../rules/approval-gate.md
* @../../rules/kg-usage.md
* @../../rules/naming-conventions.md
* @../../rules/changelog.md
* @../../rules/resolve-oqs.md
* @../../rules/review-format.md
* @../../agents/senior-ba.md
* @../../agents/po-reviewer.md
* @../../agents/pm-reviewer.md
* @../../../_templates/prd.md
* @./references/example-prd.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
