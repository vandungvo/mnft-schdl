---
name: brainstorm
description: Dùng khi cần ghi lại 1 ý tưởng thô rồi phỏng vấn làm rõ trước khi viết URD/PRD. `/brainstorm <mô tả ý tưởng>` hoặc `/brainstorm @<file>`.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "<idea text> | @<file-path> | (empty for interactive)"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /brainstorm — Deep Interview + Clarify‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Expand raw idea thành structured brainstorm board qua interview __độ sâu thích ứng__ (adaptive depth): skill tự chấm độ lớn ý × độ đủ dữ kiện đã có → chọn chế độ từ Micro (viết thẳng) đến Deep (7-section one-at-a-time), xác nhận với user 1 dòng. Ý nhỏ + đã đủ ý → KHÔNG phỏng vấn dài. Output 12 sections theo `_templates/brainstorm.md`: user types, capabilities P0/P1/P2, __Core Flows (Happy Path)__ với numbered steps + ASCII diagram per flow, __System Behavior Deep Dive__ (decision points, scenario matrix, state transitions, interrupted transaction handling, other edge cases), __Validation/Limits/Wording__ (validation rules, exact limits, wording samples: error/success/info messages), assumptions, risks (IT-BA framing), success metrics, open questions. Dependencies tách sang `/prd-epic` hoặc `/srs` — không capture ở brainstorm. Checkpoint BẮT BUỘC trước URD/PRD cho idea raw.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __L1 approval__ trước Write — bao gồm confirm feature slug + idea slug do skill auto-derive.
- __L3 iterate__ cho ASCII flow diagram + mermaid diagrams (max 3 vòng per `_rules/approval-gate.md`).
- __Per-feature path__ — `docs/{feature}/brainstorms/{idea-slug}.md`.
- __Auto-derive feature slug từ idea content__ — KHÔNG bắt user nhập. Đề xuất trong L1, user override được.
- __Auto-derive idea slug__ — semantic slug từ idea topic. Fallback `idea-{NNN}`. Collision → suffix `-v2`.
- __Idea input free-form__ — text trực tiếp HOẶC `@<file-path>` tag.
- __Thông tin cấp dự án đọc + ghi vào profile__ — domain sản phẩm, thuật ngữ gọi người dùng cuối, compliance (hay chạm ở phần user + rủi ro): đọc `docs/_shared/project-profile.md` trước khi hỏi; thiếu thì hỏi rồi đề xuất ghi vào profile để skill sau khỏi hỏi lại. Per @../../rules/project-profile.md.
- __Interview hỏi từng section một__ — KHÔNG dồn batch 10 câu. Wait reply giữa các section. User có thể skip section bất kỳ → fill `<!-- TBD: ... -->`.
- __Mandatory artifacts theo complexity__ (auto-detect):
  - __ASCII flow diagram__ — bắt buộc nếu detect: external API/redirect (OAuth, payment, webhook), branching ≥2 paths, async/background job.
  - __Interrupted transaction matrix__ — bắt buộc nếu detect external redirect/webhook (browser close mid-flow, link expired, callback fail).
  - __Scenario matrix__ — bắt buộc nếu ≥2 input states / role combinations.
  - __State transitions table__ — bắt buộc nếu có entity status (account, order, subscription, request).
- __Push for exact values__ — KHÔNG chấp nhận "có rate limit" mà phải hỏi "bao nhiêu lần/phút". KHÔNG chấp nhận "show error" mà phải hỏi "exact wording". Vague answer → re-ask 1 lần. Vẫn vague → ghi TBD + flag open question.
- __No-re-ask rule — KHÔNG hỏi lại câu user đã trả lời__. Trước mỗi section, scan toàn bộ context (idea seed + previous answers + existing brainstorm doc nếu là continuation) → loại bỏ câu hỏi đã có answer. Nếu answer partial → hỏi follow-up cụ thể chỉ phần thiếu, KHÔNG hỏi lại từ đầu. Vd: user đã nói "default off remember-me" → KHÔNG hỏi lại "remember-me default ON hay OFF". Continuation mode (file brainstorm đã có) → đọc kỹ doc trước khi phỏng vấn, chỉ hỏi gap.
- __IT-BA framing — KHÔNG hỏi câu coding/architect-level__. Skill này phục vụ IT Business Analyst, KHÔNG phải developer. __CẤM hỏi__: tên column DB, schema table, function/service name, API endpoint cụ thể, JWT vs session, framework choice, refresh-token rotation, hashing algorithm, payload structure, SDK name. __ĐƯỢC hỏi (business language)__: "system làm gì" (validate, lưu thông tin, gửi email, gọi dịch vụ ngoài), "cần lưu loại thông tin nghiệp vụ gì" (vd email, status, ngày tạo — KHÔNG hỏi column type), "có gọi dịch vụ bên ngoài nào" (Google, SendGrid, Stripe — chỉ tên dịch vụ + mục đích, KHÔNG hỏi endpoint/SDK), "ai trigger action", "khi nào trigger", "kết quả nghiệp vụ user thấy". Quyết định kỹ thuật (DB schema, auth strategy, framework) là việc của `/srs` + dev/architect.
- __Quality checklist gate__ trước L1 — nếu fail check → đề xuất hỏi thêm trước khi write.
- __Vietnamese-first__ default, auto-detect từ idea content. Muốn tiếng Anh thì nói "viết bằng tiếng Anh".
- __KHÔNG nhảy thẳng URD/PRD__ — brainstorm là checkpoint riêng.
- __Doc sạch — KHÔNG chèn meta-text vào doc sinh ra__ (per ba-conventions Mục 0). CẤM cụ thể: câu nguồn seed ("*Seed lấy từ mini-brief...*"), vị trí roadmap/điểm RICE ("Feature này ở horizon Now..."), chỉ dẫn quy trình cho người viết ("*KHÔNG nhảy thẳng SRS — qua PRD trước*"). Mục 1/2 chỉ chứa nội dung nghiệp vụ thật; Mục 12 chỉ list lệnh next. Provenance sống ở frontmatter `links:`.
- __Adaptive depth — skill TỰ chọn độ sâu, KHÔNG mặc định deep.__ Đầu Phase A skill chấm 2 chiều: __scope__ (trivial/small/complex — từ complexity signals) × __completeness__ (% câu hỏi đã có answer trong seed + chat session) → chọn chế độ theo bảng (xem Phase A.6) → in __1 dòng đề xuất__ để user xác nhận nhanh (`ok`/Enter = làm vậy · "hỏi kỹ" = ép deep · "viết luôn" = Micro không hỏi). Nguyên tắc: __độ sâu phỏng vấn = độ lớn ý × độ thiếu dữ kiện__. 5 chế độ: __Micro__ (viết thẳng, không phỏng vấn) / __Confirm-only__ (0-2 câu vá lỗ hổng) / __Shallow__ (1 batch câu còn thiếu) / __Targeted deep__ (chỉ section còn hở) / __Deep__ (7 section đầy đủ).
- __Shallow / Micro qua lời nói (override)__ — user nói "brainstorm nhanh gọn" / "làm nhanh thôi" → ép Shallow; "viết luôn" / "khỏi hỏi" → ép Micro. Không cần gõ flag. Ngược lại "hỏi kỹ" / "brainstorm sâu" → ép Deep dù skill chấm là nhỏ.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Auto-derived feature slug có thể sai__ — LUÔN show L1, user override được.
- __Idea content generic__ (vd `/brainstorm thêm feature mới`) — không suy được slug → ask hint trước Phase A.
- __User trả lời vague__ ("show error", "có rate limit") — re-ask 1 lần với câu hỏi cụ thể hơn. Vẫn vague → TBD + open question.
- __User bỏ giữa Phase B__ (skip section 5+) — proceed quality gate, in checklist gap, để user quyết "write minimal" hay "tiếp tục interview".
- **`@<image-file>` experimental** — warn user.
- __Idea quá dài (>2k tokens)__ — extract key signals, link source file.
- __Idea slug collision__ — auto suffix `-v2`, show L1.
- __Workflow rule__ — brainstorm là checkpoint, KHÔNG auto-trigger downstream.
- __ASCII diagram render trong markdown__ — dùng box-drawing `┌ ─ ┐ │ ▼` và code block; KHÔNG dùng mermaid (mermaid để dành `/sequence`).
- __Complexity detection có thể miss__ — user override được qua follow-up "skip ASCII flow" / "force deep".
- __Hook stale-propagation__ — edit brainstorm hiếm propagate.
- __Sync PRD sản phẩm (Phase E2)__ — nếu dự án có `docs/_product/prd.md`, brainstorm tự đề xuất mark feature `✅ đã chi tiết` ngược lên Feature Map (L2 diff, user duyệt). Không có brief → skip, không lỗi.
- __Section 4 chỉ chạy nếu có complexity signal__ — đừng force user trả lời 6 sub-questions cho dark-mode-toggle.
- __Adaptive depth có thể chấm sai scope/completeness__ — luôn cho user override 1 dòng: "hỏi kỹ" (ép Deep) / "viết luôn" (ép Micro) / "nhanh gọn" (ép Shallow). Khi phân vân giữa 2 mức → chọn mức GỌN HƠN + nói rõ trong dòng đề xuất (user thấy thiếu thì gõ "hỏi kỹ"). Mục tiêu của anh: ý nhỏ + đã đủ ý thì KHÔNG bị phỏng vấn dài.
- __Đừng hỏi lại đồ user đã chat__ — Phase A.7 (trừ known-facts) là BẮT BUỘC trước mọi vòng hỏi, kể cả khi vô tình load skill giữa 1 cuộc chat đã có nhiều dữ kiện. Re-ask đồ đã nói = red flag.
- __Push exact values KHÔNG là grilling__ — chỉ re-ask 1 lần, tôn trọng user; vague-vẫn-vague → TBD chứ KHÔNG block.
- __@author resolution (cho activity log, KHÔNG vào frontmatter)__ — resolve từ memory `user-identity` (file `current_user`). Nếu memory chưa có → đọc `git config user.name` + `user.email`, ask user confirm @handle, save vào memory `user-identity.md`. KHÔNG kế thừa từ upstream brainstorm/doc khác — upstream có thể là người khác. Frontmatter KHÔNG chứa field owner (đã diet 2026-07-12); "ai làm" ghi per-event ở cột @author của `docs/_shared/changelog.md`.
- __Vietnamese-friendly typography__ — KHÔNG dùng ký hiệu ngoại lai khó đọc trong prose tiếng Việt: `Mục ` (section sign) → dùng "Mục N", `¶` → "đoạn N". `→` chỉ dùng trong flow/diagram/table cell, narration tiếng Việt nên dùng "sang/đến/dẫn tới". Bold (`**...**`) __vẫn dùng bình thường__ — phục vụ emphasis (số liệu, key term, câu chốt). Quy ước này tránh làm doc trông như legal/spec Tây.
- __L1 cho BA, không cho dev__ — L1 plan preview dùng prose tự nhiên với từ nghiệp vụ ("luồng", "bảng", "hình minh họa"). KHÔNG dùng bảng `# | path | action`, KHÔNG dùng flag tag, KHÔNG dùng technical jargon. User là IT-BA — họ cần biết "doc sẽ có gì mới về nghiệp vụ" chứ không phải "structural metadata".
- __Re-asking là red flag__ — user đã trả lời mà skill hỏi lại = mất uy tín + lãng phí thời gian. Continuation mode (existing brainstorm file): MUST Read full file trước khi hỏi, mark câu nào đã có answer trong doc, chỉ hỏi gap. Trong cùng session: track answers theo section, đừng quên.
- __Skill phục vụ IT-BA, không phải dev__ — nếu user feedback "câu hỏi quá technical" / "đây là BA chứ không phải code", re-frame ngay sang business language. Câu hỏi có chữ "DB column", "function name", "JWT", "endpoint", "schema", "SDK" là red flag — refactor về "lưu thông tin gì?", "system làm gì?", "login session bao lâu?", "dịch vụ nào?". Quyết định kỹ thuật để dành `/srs` + dev/architect.

## Inputs

```
/brainstorm                                      # interactive: ask idea
/brainstorm <idea text>                          # idea text inline
/brainstorm @<file-path>                         # idea from tagged file
```

Examples:
```
/brainstorm thêm spaced repetition cho vocabulary trainer
/brainstorm @notes/idea-2026-05-13.md
/brainstorm đăng nhập email + Google OAuth      # complex → deep mode auto
/brainstorm dark mode toggle, brainstorm nhanh gọn thôi   # trivial → nói "nhanh gọn" là đủ, không cần flag
```

Muốn đổi hành vi mặc định, nói bằng lời:
- Viết bằng tiếng Anh → nói "viết bằng tiếng Anh".
- Chạy nhanh gọn, bỏ qua deep interview → nói "brainstorm nhanh gọn" / "shallow thôi".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Existing features: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | tr '\n' ' '`

## Approach

### Phase A — Resolve & Auto-derive (silent)

1. __Resolve idea source:__
   - No arg → nếu có `docs/_product/roadmap.md`, đọc horizon __Now__ (Mục 3) → gợi ý slug đầu Now làm điểm khởi đầu: "Roadmap đang ưu tiên `{slug đầu Now}` ở horizon Now — brainstorm cái này? (Y / gõ feature khác / paste ý tưởng)". Không có roadmap → ask "Bạn brainstorm gì? (paste text hoặc tag file `@path`)". Wait.
   - Arg start `@` → Read file (image → vision, warn quality).
   - Otherwise → arg as text.
2. __Auto-derive feature slug__ — extract main domain noun phrase, kebab-case ASCII, max 30 chars. Check `docs/<slug>/` exist → reuse hoặc propose new.
3. __Auto-derive idea slug__ — semantic from topic delta. Fallback `idea-{NNN}`. Collision → `-v2`.
4. __Detect language__ từ idea content.
5. __Detect complexity signals__ từ idea content + keyword scan:
   - External redirect/OAuth/payment/webhook keywords → `has_external_redirect = true`
   - "signup", "checkout", "subscribe", "verify", "callback" → `has_async_flow = true`
   - "admin/user/guest", "P0/P1/free/paid", "≥2 roles" → `has_multi_role = true`
   - "pending → active", "draft → published", entity status → `has_state_machine = true`
   - "rate limit", "quota", "captcha", "lockout" → `has_throttle_rules = true`
   - Flag từng để mandate corresponding artifact.

6. __Score scope × completeness → chọn chế độ (adaptive depth):__

   __Scope__ (độ lớn ý):
   - `trivial` — 0 complexity signal, 1 hành động đơn (toggle, đổi label, thêm 1 field, sort, filter).
   - `small` — 1 luồng đơn, ≤1 signal.
   - `complex` — ≥2 signal (external redirect / async / multi-role / state machine / throttle).

   __Completeness__ — quét seed + TOÀN BỘ chat trong session, map vào các câu hỏi 7 section, đếm % câu chính đã có answer:
   - `đủ` ≥70% · `thiếu` 40-70% · `thô` <40%.

   __Bảng chọn chế độ:__

   | Scope × Completeness | Chế độ |
   |---|---|
   | trivial (mọi mức) | __Micro__ — viết thẳng, không phỏng vấn; chỉ hỏi nếu thiếu điểm CHẶN (vd chưa rõ feature thuộc đâu) |
   | small + đủ | __Confirm-only__ — hỏi 0-2 câu vá lỗ hổng thật sự |
   | small + thiếu/thô | __Shallow__ — 1 batch gom đúng câu CÒN THIẾU |
   | complex + đủ | __Targeted deep__ — chỉ chạy section còn hở, bỏ section đã đủ |
   | complex + thiếu/thô | __Deep__ — 7 section (Phase B đầy đủ) |

   __In dòng đề xuất xác nhận (HITL — luôn hiện, TRỪ khi trivial+đủ thì đi thẳng L1):__
   ```
   Ý này em thấy {nhỏ/vừa/lớn} và anh đã cho {khá đủ / một phần / mới sơ bộ} thông tin.
   → Em đề xuất chạy {tên chế độ}: {mô tả 1 câu, vd "tổng hợp luôn, chỉ hỏi 2 điểm còn thiếu: X, Y"}.
     (Enter/ok = làm vậy · "hỏi kỹ" = phỏng vấn đầy đủ · "viết luôn" = viết thẳng không hỏi)
   ```
   - `trivial + đủ` → BỎ dòng này, đi thẳng tổng hợp + L1 (L1 chính là điểm chốt).
   - `ok`/Enter → chạy chế độ đề xuất. "hỏi kỹ" → ép Deep. "viết luôn" → ép Micro (thiếu → TBD + OQ).
   - User override lời nói ở Phase A (Constraint "Shallow/Micro qua lời nói") thắng kết quả chấm.

7. __Trừ known-facts khỏi câu hỏi (siết no-re-ask) — BẮT BUỘC trước MỌI vòng hỏi:__
   - Gom `known_facts` = seed + mọi câu user đã nói trong session (+ existing brainstorm nếu continuation).
   - Map từng câu định hỏi ↔ known_facts. __Xóa__ câu đã có answer; câu thiếu 1 phần → rút thành follow-up đúng phần thiếu.
   - Trước khi hỏi, in ngắn "Em đã nắm: {…} · Còn thiếu: {…}" để user thấy skill KHÔNG hỏi lại đồ đã nói.

### Phase B — Interview (chế độ theo A.6; Deep = 7 sections one-at-a-time)

> Mỗi section: in 1 message, 2-5 câu hỏi tối đa, wait reply. Push for exact values. User `skip` → TBD placeholder + open question.

__Section 1 — Overview__
1. Feature này làm gì (1-2 câu từ góc user)?
2. Vấn đề/pain cụ thể đang giải? Ai bị?
3. Why now? (request từ ai, deadline, signal market)

__Section 2 — Users & Access__
1. Roles nào dùng (admin, free, paid, guest, ...)?
2. Gating: cần subscription/verified/role gì để truy cập?
3. Entry point: user vào feature qua đâu (menu, button, deep link, notification)?
4. Số lượng user dự kiến (giúp size capacity + cost)?

__Section 3 — Core Flow (Happy Path)__
1. Walk-through từng bước: user làm gì → system làm gì → user thấy gì (success state)?
2. Có sub-flow khác không (signup vs login, new vs returning, upgrade vs downgrade)?
3. Output cuối user thấy gì? Có notification/email gửi đi không?

__Section 4 — Detailed Flow Deep Dive__ (chỉ chạy nếu complexity signal trigger từ Phase A)

4a. __System actions (business level)__ — mỗi bước nghiệp vụ system làm gì? Mô tả bằng action verb nghiệp vụ: "validate email format", "check email tồn tại", "tạo user record", "gửi verification email", "gọi Google OAuth", "ghi audit log". KHÔNG hỏi function name / service class / API endpoint. Loại thông tin nghiệp vụ nào cần lưu (liệt kê field nghiệp vụ vd email, status, created_at — KHÔNG hỏi column type / schema). Có gọi dịch vụ ngoài nào (chỉ tên dịch vụ + mục đích nghiệp vụ, vd "Google OAuth để xác thực", "SendGrid để gửi email" — KHÔNG hỏi endpoint/SDK).

4b. __Decision points__ — if/else nghiệp vụ nào trong flow? Condition + path YES/NO? Có calculation/business rule gì?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

4c. __State transitions__ — entity nào có status? Liệt kê: `entity: stateA → stateB → stateC`. Trigger từng transition? Reversible không?

4d. __Interrupted transactions__ (MANDATORY nếu `has_external_redirect || has_async_flow`):
   - User đóng browser/app giữa flow → state gì còn lại, resume kiểu gì?
   - External service fail/timeout → retry? State?
   - User start flow mới trong khi cái cũ pending → behavior?
   - Link/token expired → flow?
   - Concurrent → 2 device cùng action → ai win?

4e. __ASCII flow diagram (L3 iterate)__ (MANDATORY nếu `has_external_redirect || has_async_flow || branching ≥2`):
   - Skill draw v1 từ section 3+4a+4b answers.
   - Show user: "Diagram này đúng không? Sửa gì?"
   - Iterate max 3 vòng.
   - Diagram phải show: user vs system action, decision với condition, external call, data change, error path.

4f. __Scenario matrix__ (MANDATORY nếu `has_multi_role || ≥2 input states`):
   - Liệt kê combo (from_state × to_state × rule) → action + result.
   - Skill draft từ flow + ask confirm/correct.

### Section 5 — Validation, Limits & Wording
1. Required fields + format + min/max?
2. Limits/quotas (EXACT numbers): rate limit X/min, max Y items, retry Z, lockout sau N fail?
3. Business rules: conditions, calculations, state-transition rules?
4. __Exact error messages__ cho từng error case (string đúng wording, tiếng Việt natural)?
5. __Exact success messages__ cho từng confirmation state?
6. __Exact info/neutral messages__ (vd "Đã gửi email xác nhận tới {email}…")?

> Push: "Rate limit bao nhiêu/phút?" → "Lockout sau bao nhiêu fail?" → "Câu error chính xác là gì?". Vague vẫn vague → TBD + flag OQ.
> Wording chia 3 nhóm khi synthesize: error / success / info — KHÔNG dồn 1 bảng chung.

### Section 6 — System Context (business-level only, KHÔNG technical)
1. Cần lưu thêm loại thông tin nghiệp vụ nào (vd "device list", "login history", "subscription status") — chỉ liệt kê __thông tin gì__, KHÔNG hỏi DB schema / table name?
2. Có cần dịch vụ bên ngoài nào (email service, OAuth provider, payment, SMS, captcha) — __tên dịch vụ + mục đích nghiệp vụ__, KHÔNG hỏi SDK/endpoint?
3. Notification gửi cho user qua kênh nào (email / push / in-app / SMS) + khi nào trigger (sau action gì)?
4. Có xử lý nền / scheduled không (vd cleanup token expired hằng ngày, send digest tuần) — chỉ __business need__, KHÔNG hỏi cron syntax / queue system?
5. Có cần real-time không (vd thông báo ngay khi event xảy ra) — chỉ __business need__, KHÔNG hỏi websocket/SSE/polling?

### Section 7 — Edge Cases, Risks, Open Questions
1. Lost connection mid-flow?
2. External service down?
3. Concurrent usage (2 user cùng action lên cùng resource)?
4. Pending/abandoned transactions — TTL, cleanup, resume path?
5. Top 3 rủi ro nghiệp vụ (adoption / vendor / compliance / process / timeline / data) — khả năng (thường/thỉnh thoảng/hiếm), hậu quả nghiệp vụ, cách phòng?
6. Đang chưa rõ gì → liệt kê thành open questions?

### Phase C — Synthesize + Quality Gate

6. __Synthesize__ tất cả answers → build content sections.
7. __Auto-fill sections__ theo `_templates/brainstorm.md` (13 sections):
   - Mục 5 Core Flows — numbered steps + ASCII diagram embedded per flow.
   - Mục 6.1 Decision Points — table `ID | Flow | Khi nào | YES | NO`.
   - Mục 6.2 Scenario matrix (nếu trigger) — table `From | To | Rule | Action | Result`.
   - Mục 6.3 State transitions (nếu trigger) — table `Entity | Từ | Sang | Trigger | Quay lại?`.
   - Mục 6.4 Interrupted-tx matrix (nếu trigger) — table 4 cột.
   - Mục 6.5 Other edge cases — gom chung, KHÔNG tách section riêng.
   - Mục 7.3 Wording samples — 3 nhóm tables: error / success / info.
   - Mục 9 Risks — IT-BA format (Khả năng / Hậu quả nghiệp vụ / Cách phòng).
8. __Quality checklist__ — skill self-check trước L1:
   - [ ] Mỗi flow ở Mục 5 có numbered steps user + system actions.
   - [ ] Flow phức tạp có ASCII diagram đi kèm trong Mục 5.
   - [ ] Mục 6.1 Decision Points có tối thiểu các nhánh chính của flow.
   - [ ] Interrupted flow handling documented (nếu external redirect).
   - [ ] Scenario matrix cover all combo (nếu multi-state).
   - [ ] State transitions mapped (nếu có entity status).
   - [ ] Mục 7.2 limits/quotas có exact numbers (không "phù hợp").
   - [ ] Mục 7.3 error/success/info messages là exact strings.
   - [ ] Risks dùng IT-BA framing (adoption/vendor/compliance/process/timeline/data), không phải bug/infra.
   - [ ] Open questions có ID `OQ-1, OQ-2, ...`.
   - Fail check → in checklist gap + đề xuất "hỏi thêm Q-X" trước proceed. User pick "proceed anyway with TBD" được.
   - __Chế độ Micro / Shallow / Confirm-only__: quality gate KHÔNG cảnh báo nặng — TBD là CỐ Ý (đã làm gọn). Chỉ liệt kê gọn "còn TBD: {…}" trong L1 và đẩy vào Open Questions, KHÔNG chặn/không giục hỏi thêm. Gate đầy đủ chỉ áp cho Deep / Targeted deep.

### Phase D — Approval + Write

9. __L1 plan preview__ — viết bằng __ngôn ngữ tự nhiên cho BA__, KHÔNG bảng dày tag/flag/checklist. Format:

   > Em sẽ {tạo mới | viết lại} file `docs/{feature}/brainstorms/{slug}.md` với:
   >
   > __Thêm/cập nhật nội dung:__
   > - {liệt kê 4-8 bullet bằng từ nghiệp vụ: "luồng / bảng / diagram/ hình minh họa / số liệu cụ thể / wording mẫu" — KHÔNG dùng "matrix / flag"}
   > - {các số liệu nghiệp vụ cụ thể nếu có: lockout sau X lần, link expire Y giờ, ...}
   >
   > __Câu hỏi mở:__ {N resolved} đã chốt trong session này; còn {M} câu để dành cho `/urd` hoặc `/prd-epic`: {liệt kê ngắn}.
   >
   > __Ghi nhận:__ activity log "{note}".
   >
   > Apply? (Y / sửa / override-feature `<slug>` / override-idea `<slug>`)

   __CẤM__ trong L1 BA-facing:
   - Bảng `# | path | action | summary` (kiểu log dev)
   - Tag flag: `has_external_redirect=Y`, `Quality checklist: 9/11`, `Mandatory artifacts ✓`
   - Từ technical: matrix, diagram, flag, scaffold, schema

   __GIỮ:__ số liệu nghiệp vụ cụ thể (lockout 5 lần, link 24h) — đó là content nghiệp vụ, không phải metadata.
10. __Write__ `docs/{feature}/brainstorms/{idea-slug}.md` từ `_templates/brainstorm.md`.
11. __Set env trước Write__ (hook ghi changelog.md): `CLAUDE_SKILL_NAME=/brainstorm` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE` (≤80 ký tự, vd `initial brainstorm scaffold cho {title}, deep mode, {N} OQs`). Hook ghép cả dòng — skill KHÔNG tự viết `{date} | ... | {note}`.
12. __Output report (initial)__:
    ```
    ✅ Brainstorm captured: docs/{feature}/brainstorms/{slug}.md
       Mode: deep | Sections: 13 | OQs: {N} | Quality gate: {pass|partial}
    ```

13. __Phase E — Resolve Open Questions (PRIORITY gate trước downstream)__ — per @../../rules/resolve-oqs.md. Brainstorm là gốc → chỉ có own OQs (Mục 12), không inherit. Collect → prompt Y/skip/ids → loop 1-by-1 → side-effect L2 diff cho Assumptions/Risks/Capabilities nếu OQ tác động → activity log (hook).

13b. __Phase E2 — Mark "đã chi tiết hóa" ngược lên PRD sản phẩm__ — sau khi brainstorm write xong:
    - Check `docs/_product/prd.md` tồn tại. Không có → skip phase này (không phải dự án nào cũng có PRD cấp sản phẩm).
    - Read brief, tìm row trong Mục 7 Feature Map có slug khớp `{feature}` của brainstorm vừa tạo.
    - __Không tìm thấy row__ → in gợi ý "Feature `{feature}` chưa có trong PRD sản phẩm — chạy `/prd` (tự vào update mode) để thêm?" (KHÔNG tự thêm row). Skip update.
    - __Tìm thấy row__ + cột Chi tiết hóa chưa phải `✅` → đếm `docs/{feature}/brainstorms/*.md` (N file) → __propose L2 diff__ đổi cột Chi tiết hóa của row đó sang `✅ đã chi tiết (N brainstorm)`. User Y → Edit brief + set env `CLAUDE_CHANGELOG_NOTE=mark {feature} đã chi tiết hóa ({N} brainstorm)` (+ SKILL_NAME/AUTHOR) trước Edit; hook ghi changelog.md.
    - **Đã là `✅`** (thêm brainstorm thứ 2+) → cập nhật số N trong ngoặc qua L2 diff (silent-ish, vẫn show diff).
    - KHÔNG block nếu user từ chối diff — chỉ là sync metadata.

14. __Output report (final, sau Phase E)__:
    ```
    ✅ Brainstorm finalized: docs/{feature}/brainstorms/{slug}.md
       Resolved OQs trong session: {R}/{N}
       Còn hold: {M} (sẽ inherit downstream)
    
    BA approval gate: review trước khi proceed downstream.
    
    Recommended next:
      - /urd {feature}    — capture user perspective (inherit {M} OQ còn hold)
      - /brd {feature}    — business case
      - /prd-epic {feature}    — product scope
      
    Hoặc:
      - /brainstorm <another idea>  — capture idea khác
    ```

## Output

`docs/{feature}/brainstorms/{idea-slug}.md` — capture ý tưởng + kết quả phỏng vấn làm rõ.

Folder `docs/{feature}/` tạo mới nếu feature chưa tồn tại (điểm-vào, `feature-bootstrap.md` nhóm A).

Có thể __Edit ngược__ `docs/_product/prd.md` để đánh dấu cột "Chi tiết hóa" ✅ cho feature vừa đào sâu — qua L2 diff, không silent.

## Các chế độ chạy (adaptive depth — chọn ở Phase A.6)

Skill KHÔNG mặc định Deep. Sau khi chấm scope × completeness (Phase A.6) + xác nhận 1 dòng, chạy 1 trong 5 chế độ:

- __Micro__ (trivial, hoặc user nói "viết luôn" / "khỏi hỏi") — KHÔNG phỏng vấn. Tổng hợp thẳng từ chat → điền các section áp dụng → L1. Chỉ hỏi nếu thiếu điểm CHẶN (feature chưa rõ thuộc đâu, slug không suy được). Bỏ mandatory artifacts. Thiếu chỗ nào → TBD + OQ, không grilling.
- __Confirm-only__ (small + đủ) — hỏi tối đa 0-2 câu vá đúng lỗ hổng còn lại (đã trừ known-facts). Không chạy 7 section.
- __Shallow__ (small + thiếu/thô, hoặc user nói "nhanh gọn") — 1 batch gom câu CÒN THIẾU (sau khi trừ known-facts). Skip mandatory artifacts trừ khi complexity signal ép. Recommend trong report: "chạy lại deep nếu feature go beyond prototype".
- __Targeted deep__ (complex + đủ) — chạy Phase B nhưng CHỈ các section còn hở (bỏ section đã đủ answer). Section 4 vẫn theo complexity signal.
- __Deep__ (complex + thiếu/thô, hoặc user nói "hỏi kỹ") — Phase B đầy đủ 7 section, one-at-a-time (như mô tả gốc).

## References

- @../../rules/feature-bootstrap.md
- @../../rules/ba-conventions.md
- @../../rules/project-profile.md
- @../../rules/approval-gate.md
- @../../rules/naming-conventions.md
- @../../rules/keyword-detection.md
- @../../rules/resolve-oqs.md
- @../../rules/changelog.md
- @../../../_templates/brainstorm.md
- @./references/example-brainstorm.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
