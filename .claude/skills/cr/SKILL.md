---
name: cr
description: Dùng khi cần sửa 1 thay đổi vào tài liệu đã có sẵn — phân tích tác động, viết báo cáo, rồi đợi user gõ `apply` mới thực sự sửa file.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "\"<change-desc>\" [--feature <slug>]  |  list  |  close <cr-id>  |  reject <cr-id>  |  show <cr-id>"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /cr — Unified Change Request Workflow‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1 lệnh = full change workflow, NHƯNG chia 2 chặng có HARD STOP ở giữa:

1. __Chặng phân tích + report__ — skill phân tích impact, xác định verdict, rồi __viết CR record (1 file self-contained, gồm cả impact assessment) ra file__ và __DỪNG LẠI__. KHÔNG đụng vào docs feature.
2. __Chặng apply__ — chỉ chạy SAU khi user đọc kỹ report + gõ `apply` (hoặc `/cr apply <cr-id>`). Mới đó mới pre-compose + loop L2 diff apply + verify.

Mục đích: user phải đọc thật kỹ tác động trước khi 1 ký tự nào trong docs feature bị đổi. Skill KHÔNG tự đoán rồi apply.

Replaces former `/impact` (merged into default flow).

> **KHÔNG dùng `context: fork`.** Skill PHẢI chạy ở main conversation để HITL (L1/L2/AskUserQuestion) là thật. Fork = không có user trả lời prompt → mọi gate bị auto-skip → đó là bug từng xảy ra (skill tự apply hết docs mà không hỏi). Việc phân tích nặng đã delegate cho `@change-tracker`/`@gap-analyst` qua Task tool nên không cần fork toàn skill.

## State machine (tổng quan trước khi đọc chi tiết)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
Phase 1  Auto-detect feature        (bước 1-4 + 4.5 intake gate)
                                     ──► thiếu thông tin tối thiểu → hỏi 1 lượt rồi mới đi tiếp
Phase 2  Analyze impact              (bước 5-7)
Phase 3  Verdict + write report      (bước 8-9)   → status: impact-assessed
                                                  ──► HARD STOP, đợi user gõ "apply"
Phase 4  Apply (L2 diff loop)        (bước 9.5 resolve CR + 9.6 baseline check + 10-14,
                                      gồm 12.5 đối chiếu checklist)
                                     → partially-applied ──► applied
                                     ──► chỉ chạy sau khi qua HARD STOP
Phase 5  Verify + recommend          (bước 15-21)
```

Bước được đánh số liên tục 1→21 xuyên suốt 5 phase (không lặp số giữa các phase) để dễ trỏ lại khi debug hoặc khi user hỏi "đang ở bước nào".

__Lifecycle CR__ (đầy đủ ở `rules/change-request.md`): `proposed → impact-assessed → [partially-applied] → applied → closed`, nhánh `rejected` __chỉ__ pre-apply. KHÔNG có `approved` (lệnh `apply` của user chính là approval) và KHÔNG có `verified` (`/gap` là điều kiện của `applied`).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __REPORT-FIRST HARD STOP (BẮT BUỘC, mọi verdict).__ Skill PHẢI viết CR record (1 file self-contained, gồm Impact Matrix + detailed impact + rollback) ra file TRƯỚC, rồi DỪNG và đợi user đọc kỹ + xác nhận. __TUYỆT ĐỐI KHÔNG__ Edit/Write bất kỳ doc feature nào (urd/brd/prd/srs/usecases/ascii-wireframe/userstories...) trong cùng turn viết report. Chặng apply là turn riêng, sau khi user gõ `apply`. Áp dụng cả `direct-edit-ok` — không có ngoại lệ "change nhỏ nên apply luôn".
- __Clarify-first ở intake, không chỉ ở lúc phân tích (bước 4.5).__ Mô tả change thiếu thông tin tối thiểu (đổi cái gì / từ gì sang gì / vì sao / ranh giới) → __hỏi TRƯỚC__ khi tốn trọn vòng KG + Read prose + spawn `@change-tracker`/`@gap-analyst`. Gate bước 8 là __lưới thứ hai__ cho cái chỉ lộ ra sau khi đọc docs, KHÔNG phải nơi bắt lỗi input.
- __HITL chốt phương án khi mơ hồ (dùng AskUserQuestion).__ Bất cứ khi nào trong luồng CR gặp quyết định mà skill phải ĐOÁN (nhiều phương án thiết kế, coherence conflict giữa file, scope ambiguous, wording/giá trị nghiệp vụ chưa rõ, có nên mở rộng cross-feature không) → DỪNG, dùng AskUserQuestion đặt câu hỏi cho user chốt, RỒI mới đi tiếp. KHÔNG tự chọn rồi apply.
- **Không bao giờ chạy `context: fork`** (xem Goal). Skill ở main conversation để gate là thật.
- __Quy tắc vàng KG__ — Graph để CHỌN file + đếm cấu trúc; mọi kết luận nội dung/conflict/CR-diff LUÔN dựa trên prose đã Read, KHÔNG dựa facts.
- __L1 approval__ trước Write CR file (1 file duy nhất).
- __L2 diff per doc__ trong apply loop. KHÔNG skip L2 dù change nhỏ.
- __Gate áp cho MỌI Edit, gồm cả thao tác hậu-apply.__ `approval-gate.md` bắt L2 trước mọi Edit file đã tồn tại — không có ngoại lệ "chỉ là metadata": đổi `stale → revisions` (gộp vào L2 của chính doc đó, bước 13), cập nhật CR record (gom 1 lượt L1+L2, bước 14/17), `close`/`reject` (L2). Skill KHÔNG được tự cho mình quyền ghi lén những thứ này.
- **`status` phản ánh đúng thực tế, không dùng sai nghĩa.** Report đã ghi → `impact-assessed` với MỌI verdict (`proposed` nghĩa là *chưa* assess — giữ nó cho direct-edit-ok khiến `/dashboard` báo P0 "chưa assess" oan). Apply loop bắt đầu → `partially-applied`. Chỉ `applied` khi checklist sạch `⬜`.
- __Apply Checklist đối chiếu bắt buộc (bước 12.5).__ N file trong "Impacted docs" phải khớp 1:1 với N dòng checklist `✅ done`/`⏭ skipped`. Còn `⬜ pending` → CHƯA được set `status: applied`, phải xử lý nốt trước. Đây là chặn lỗi "bỏ sót file giữa loop" (tool lỗi, timeout, quên) — không dựa vào trí nhớ của session, dựa vào đối chiếu tường minh.
- __LUÔN tạo CR record__ trong `docs/cr/CR-{id}.md` cho mọi `/cr` invocation (audit trail bắt buộc). **1 file self-contained — KHÔNG tách `docs/impacts/` ra file riêng.__ Impact assessment (matrix 6 chiều + detailed impact + rollback plan) gộp thành section ngay trong CR record. Verdict chỉ ảnh hưởng __độ chi tiết** các section, KHÔNG skip file và KHÔNG đổi `status` (cả 2 verdict đều kết thúc report ở `impact-assessed`):
  - __direct-edit-ok__ (all draft, no Jira): CR record với Impact Matrix (6 chiều) tóm tắt + Impacted Docs + Rollback Plan. Section 7 "Detailed Impact" để trống.
  - __cr-needed__ (có in-review/approved/shipped/Jira/severity high+): CR record điền ĐẦY ĐỦ — Impact Matrix + Impacted Docs + Section 7 "Detailed Impact" (requirement/story-AC/Jira/traceability, output từ `@change-tracker` + `@gap-analyst`) + Rollback Plan.
  - __Lý do gộp:__ 1 CR = 1 file self-contained (như MADR/ADR practice), tránh navigation overhead + sync burden của 2 file phải khớp nhau — đúng bài học từ `/meet` consolidated.
- __Auto-resolve stale__ sau apply (docs reconciled set `status: revisions`, hết stale).
- __CR ID__ format `CR-{YYYYMMDD}-{NNN}` 3-digit, sequential, race-mitigated via mktemp lock.
- __Cross-feature awareness__ — scan ID references (`FR-{other}-NNN`, shared entity) trong proposed change + impacted docs body. Nếu đụng ≥2 features → prompt expand scope, apply loop bao trùm cả 2.
- **Activity log per `rules/changelog.md`** — mỗi file edit = 1 dòng trong `docs/_shared/changelog.md` (hook ghi khi đã set env note; note nêu rõ thay đổi gì, vd "sửa field email screen login"). LƯU Ý cascade: sửa `srs/{feature}-userflow.md` có thể cascade sang cả `ascii-wireframe/` và `html-wireframe/` (2 hệ đọc chung nguồn chia flow), scan cả 2 khi assess impact. __BẮT BUỘC in Activity Log Summary cuối session (bước 19)__ để user verify sự kiện đã thực sự ghi (visibility check).
- __Before/after capture__ — sau apply, __thay nội dung placeholder__ section `## Applied Changes ({date})` trong CR record (template đã có sẵn heading — append = trùng heading) với per-file before/after snippet (5-10 dòng context). Đủ audit "trước/sau" không cần git blame.
- __Downstream artifacts log__ — điền section `## Artifacts to rebuild` (cũng thay placeholder) liệt kê Figma/preview/export cần regen (KHÔNG auto-run, chỉ log + prompt user).
- **Rollback KHÔNG dùng `git checkout -- <file>`** — lệnh này trả về HEAD chứ không phải trạng thái trước apply → nuốt thay đổi chưa commit của user (cùng lý do `approval-gate.md` cấm mô hình Write-rồi-rollback). Dùng reverse patch qua L2 diff từ `## Applied Changes`. Xem `rules/change-request.md` § Rollback.
- __Reverse-graph recommendation__ — sau apply chạy `/gap <feature>` phần analysis (phần ghi `traceability.md` để `/gap` tự show L1 — không bypass gate của skill khác); recommend `/jira --update --dry-run` (nếu `jira_keys` non-empty).
- __Parallel pre-compose__ (bước 10) — spawn N Task tool subagents song song compose proposed change cho N impacted files cùng lúc. Coherence check post-spawn để catch cross-file inconsistency trước L2 diff loop. Single-file CR (N=1) skip parallel.

### Pitfalls — easy to get wrong

- __"apply" trơn không kèm ID mà có ≥2 CR đang chờ = phải hỏi, không đoán.__ Đừng suy luận "CR gần nhất" hay "CR mình vừa nói tới trong hội thoại" — conversation memory không đáng tin (có thể đã bị compact, hoặc đây là session hoàn toàn mới). Luôn resolve bằng cách đọc file `docs/cr/CR-*.md` thật (bước 9.5), không phải trí nhớ.
- __Bỏ sót file giữa apply loop = lỗi thường gặp của AI khi xử lý danh sách dài (CR-20260627-001 có 18 file).__ Bước 12.5 tồn tại chính vì rủi ro này — đừng tin vào "chắc đã Edit hết rồi" chỉ vì loop chạy xong hết turn; luôn đối chiếu checklist tường minh trước khi set `applied`. Đây là lỗi khác với "artifacts to rebuild chưa chạy" (Phase 5) — bước 12.5 bắt lỗi ở apply chính (sửa `.md` nguồn), Phase 5 bắt lỗi ở đồng bộ derived files.
- __KHÔNG auto-apply sau khi viết report — DÙ chạy trong subagent/non-interactive.__ Nếu skill thấy mình không thể nhận reply của user (vd bị gọi như subagent), nó vẫn DỪNG ở HARD STOP và báo "report đã viết, cần user gõ `apply`". TUYỆT ĐỐI không lấy cớ "non-interactive nên em apply luôn" — đó chính là bug đã xảy ra với CR-20260612-001.
- __Đoán mò = phải hỏi.__ Gặp ngã ba phương án → AskUserQuestion, không tự chọn. Thà hỏi 1 câu còn hơn apply sai rồi rollback.
- __Mơ hồ có 2 loại, bắt ở 2 chỗ khác nhau.__ *Input mơ hồ* (user chưa nói đủ: "fix auth", thiếu giá trị cũ, không rõ ranh giới) → __bước 4.5__, hỏi trước khi phân tích. *Nguồn mơ hồ* (docs không trả lời được: 2 file nói khác nhau, đa phương án thực thi) → __bước 8__, hỏi trước khi viết report. Đẩy loại 1 xuống bước 8 = lãng phí trọn vòng KG + Read + 2 agent cho câu lẽ ra hỏi được ngay từ đầu.
- __Optional artifacts__ — `usecases/{feature}-usecase-diagram.md`, `html-design/{feature}-prototype.html`, `preview.html`, exports đều __không bắt buộc tồn tại__. Skill check `[ -f ... ]` trước khi reference. Thiếu = skip (KHÔNG báo lỗi, KHÔNG đề xuất rebuild artifact chưa tạo bao giờ).
- __Verdict edge cases:__
  - Tất cả draft NHƯNG severity = critical (vd legal/compliance) → force cr-needed.
  - Tất cả draft NHƯNG cascade depth >2 → force cr-needed (track propagation).
- __CR ID not found__ (subcommand) — list nearest CRs.
- **Apply mà CR đang status `closed`** — refuse, suggest tạo CR mới.
- __Impact assessment stale__ (docs feature đổi sau khi viết report) — __detect bằng baseline hash ở bước 9.6__, không phải bằng cảm tính. Lệch → HARD STOP hỏi `re-assess`/`apply-anyway`/`cancel`. CR cũ không có cột Baseline → nói thẳng "không kiểm được" + hỏi user, KHÔNG im lặng apply.
- **KHÔNG bao giờ set `rejected` cho CR đã apply.** Docs đã đổi thật → `rejected` là viết lại lịch sử, xoá mất dấu vết cần hoàn tác. Đường đúng: rollback (reverse patch qua L2) rồi Decision Log; đổi hướng thì mở CR mới.
- **`stale` KHÔNG phải state của CR.** Nếu thấy CR mang `status: stale` → đó là dấu hiệu hook `post-edit-stale.sh` lại quét nhầm `docs/cr/` (đã fix 2026-07-16 bằng exclude cả 2 vế). CR mang `stale` sẽ kẹt cứng: `apply` refuse (không thuộc `impact-assessed|partially-applied`), `close` refuse (không phải `applied`), mà `/dashboard` vẫn đếm là open. Sửa hook, đừng sửa từng CR.
- __Jira-pushed story impacted__ — luôn warn + recommend `/jira --update --dry-run` sau apply.
- __User cancel mid-loop__ — giữ partial edits đã apply; set CR `status: partially-applied`; Apply Checklist __trong CR record__ (không phải "Implementation Plan" — section đó KHÔNG tồn tại trong template) ghi rõ file nào `✅ done`, file nào còn `⬜ pending`. Resume bằng `/cr apply CR-{id}` chỉ xử lý dòng `⬜`. Checklist phải đã được persist sau từng quyết định L2 (bước 12) — nếu chỉ giữ trong hội thoại thì resume sẽ apply đúp.
- __Change affects approved doc__ → set doc `status: revisions` unless user explicit keep approved (rare).
- __Change affects stale doc__ — auto-resolve sau apply.
- **Concurrent `/cr` create** — mktemp lock mitigate, vẫn có small race window. Acceptable cho single-user vault.
- __User nói "chỉ phân tích thôi"__ — viết CR record (self-contained) như bình thường rồi dừng hẳn, KHÔNG kèm gợi ý `apply` trong phiên (user chủ động `/cr apply <cr-id>` sau nếu muốn).
- __Artifacts to rebuild bỏ quên__ — CR `status: applied` nhưng derived files (data.js, preview.html, prototype.html...) không regenerate → vault inconsistent (source .md đúng, viewer/export vẫn cũ). `/cr close` là checkpoint bắt buộc chặn việc này (xem subcommand `close`); `/dashboard` cũng flag CR `applied` >7 ngày còn pending artifacts (action item `artifact_sync` từ `workspace-status.py`). Nếu user `skip` ở bước 18, artifact table vẫn giữ `⏳ pending` — KHÔNG tự ý coi là done. Lúc `close`, pending phải hoặc `rebuild` hoặc `waive` (có lý do) — **không có đường giữ nguyên `⏳ pending` mà vẫn close**, vì closed làm `/dashboard` ngừng cảnh báo → việc dở dang biến mất khỏi radar.

## Inputs

```
/cr "<mô tả change>"                          # default: auto-detect feature + smart analyze + apply
/cr "<mô tả change>" --feature <slug>         # optional override khi auto-detect ambiguous

/cr apply <cr-id>                             # resume apply 1 CR cụ thể đã viết report
/cr apply                                     # resume apply — không kèm ID, skill tự resolve (xem bước dưới)
/cr list [--status open|closed|all] [--severity <level>]
/cr show <cr-id>
/cr close <cr-id> [--reason <text>]
/cr reject <cr-id> [--reason <text>]
```

Muốn override severity hoặc chỉ phân tích (không gợi ý apply) — nói bằng lời trong mô tả change, vd "cái này critical đó" hoặc "chỉ phân tích thôi, đừng gợi ý apply".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | head -10`
Open CRs: !`ls docs/cr/CR-*.md 2>/dev/null | while read f; do grep -q "^status: proposed\|^status: impact-assessed\|^status: partially-applied\|^status: applied" "$f" && basename "$f" .md; done | head -10`

## Phase 1 — Auto-detect feature (bước 1-4)

1. **Nếu user gõ `--feature <slug>`** → skip detect, dùng luôn.
2. __Vault chỉ có 1 feature__ (vd `docs/authentication/` là duy nhất) → auto-pick + log "Em hiểu đang sửa `authentication` (feature duy nhất trong vault)." Skip confirm.
3. __Vault có nhiều features__ — match change description với feature folders bằng heuristic:
   - __Direct mention__: description chứa feature slug literally (vd "trong authentication", "feature payment") → match cao nhất.
   - __Doc/section mention__: description nhắc tên file/screen/section đã tồn tại (vd "screen login" → tra `authentication/ascii-wireframe/{feature}-wireframe-index.md` bảng Screens để biết `login` thuộc flow-slug nào, vd `authentication/ascii-wireframe/login-flow.md`).
   - __Keyword overlap__: tokenize description + match với title/headings của brainstorm/urd/srs trong mỗi feature. Score = số keyword unique match.
4. __Kết quả:__
   - __1 feature match score cao rõ rệt__ → confirm 1 dòng (mẫu: xem `references/output-templates.md` § "Feature match — 1 kết quả rõ rệt").
   - __Nhiều feature match score gần nhau__ (vd 2 feature cùng có "payment") → list + hỏi chọn (mẫu: xem `references/output-templates.md` § "Feature match — nhiều kết quả gần nhau").
   - __0 match__ → list all features + ask pick.
   - __Vague change description__ ("update auth", "fix bug") → ask 1-2 clarifying questions trước khi detect (tránh garbage match). Áp __kể cả khi feature đã rõ__ (user gõ `--feature`, hoặc vault chỉ 1 feature): feature rõ ≠ change rõ — đó là 2 loại mơ hồ khác nhau, loại thứ hai do bước 1.5 xử lý.

4.5. __Intake gate — đủ thông tin mới cho vào phân tích (BẮT BUỘC, trước mọi KG query/Read/spawn agent).__ Đối chiếu mô tả change với __4 câu tối thiểu của 1 CR__:

   1. __Đổi cái gì__ — giá trị/rule/wording/trạng thái cụ thể nào bị đụng (không phải "sửa auth").
   2. __Từ gì sang gì__ — giá trị cũ → giá trị mới. Thiếu vế "cũ" thì skill không đối chiếu được với docs.
   3. __Vì sao__ — nguồn yêu cầu (họp / khách / compliance / bug). Đây là căn cứ chấm severity ở bước 8.
   4. __Ranh giới__ — ràng buộc/ngoại lệ: áp cho ai, từ khi nào, có case miễn trừ không.

   - Thiếu ≥1 câu __và__ không suy chắc được từ nguồn đã có → gom __1 lượt AskUserQuestion__ (tối đa 4 câu, đúng sức chứa 1 lần hỏi). Theo __no-re-ask__ (`ba-conventions.md` Mục 2): bỏ câu mà mô tả/session đã trả lời.
   - __Chỉ hỏi cái CHẶN phân tích.__ Chi tiết không chặn (sắc thái wording, cách trình bày) → bỏ qua, KHÔNG hỏi. `/cr` không phải phỏng vấn.
   - __User không trả lời được → ghi thẳng vào Open Questions của CR record + hạ mức tự tin ở Impact Matrix.__ KHÔNG bịa để lấp.
   - __OQ là fallback, KHÔNG phải đường tắt__ — cấm bỏ qua bước hỏi rồi nhét hết chỗ thiếu vào OQ để đi tiếp (cùng luật với `/ac` clarify-first).

## Phase 2 — Analyze impact (bước 5-7)

5. __Dùng Knowledge Graph chọn shortlist, sau đó Read prose + value-sweep bắt buộc:__
   - Resolve một hoặc nhiều ID/node seed từ change description hoặc doc/section đã xác định ở Phase 1. KHÔNG đoán ID; nếu không resolve chắc chắn được seed → dùng fallback đọc-trực-tiếp CŨ bên dưới.
   - Nếu `docs/_shared/kg/graph.json` chưa tồn tại → build đúng 1 lần bằng:
     `node .claude/skills/kg/engine/kg-build.mjs`
   - Với MỖI seed, chạy:
     `node .claude/skills/kg/engine/kg-query.mjs impact <ID> --depth 3`
   - Kiểm tra exit code + output của từng lệnh. Output có `⚠ còn N mục` → BẮT BUỘC chạy lại đúng query đó với `--all`, rồi mới union kết quả.
   - Union mọi path trong shortlist của tất cả query + mọi path ở mục `### Phải Read tay (ngoài graph)` + traceability + jira-map (nếu có).
   - Read đầy đủ prose MỌI file trong tập union. Facts/edge/status từ graph chỉ dùng chọn file và đếm cấu trúc; KHÔNG dùng làm căn cứ cho impact conclusion, wording hoặc proposed CR diff.
   - **Fallback đọc-trực-tiếp CŨ — bắt buộc nếu build/query có `KG-ERROR`, exit≠0, hoặc không resolve được seed:** bỏ toàn bộ kết quả KG một phần, rồi thực hiện nguyên flow cũ:
     __Read scoped docs:__ `docs/{feature}/**/*.md` + traceability + jira-map (nếu có).
   - __Value-sweep BẮT BUỘC trong cả flow KG lẫn fallback:__ trích các giá trị/keyword mang nghĩa của proposed change (vd `"5 lần"`, `"24h"`, tên field, trạng thái, error wording và biến thể viết hợp lý), rồi Grep toàn bộ `docs/{feature}/` — không giới hạn ở shortlist. Mọi file `.md` match ngoài tập Read hiện tại phải được thêm vào tập và Read đầy đủ prose trước khi kết luận impact. Không được skip sweep chỉ vì graph trả coverage đầy đủ.
6. __Cross-feature scan__ — grep proposed change + toàn bộ prose đã Read ở bước 5 cho ID patterns `FR-{X}-NNN`, `BO-{X}-NN`, `CAP-{X}-NN`, `BR-{X}-NNN`, `E-{X}-NNN` với X ≠ feature đang xử lý. Cũng grep shared entity names (từ `docs/_shared/definitions.md` nếu có; khi dùng definition để kết luận thì phải Read đầy đủ file này). Nếu match ≥1 → cảnh báo + hỏi mở rộng scope (mẫu: xem `references/output-templates.md` § "Cross-feature scan phát hiện đụng feature khác"). Y → chạy lại toàn bộ bước 5 cho từng other-feature/ID vừa phát hiện: `kg impact` lấy shortlist, Read đầy đủ shortlist + `Phải Read tay`, rồi value-sweep toàn `docs/{other-feature}/`. Nếu không resolve được ID hoặc KG lỗi → dùng fallback đọc-trực-tiếp CŨ của bước 5 cho feature đó. Union các file đã Read thành scoped docs cho bước 7.
7. **Spawn `@change-tracker` + `@gap-analyst` parallel** via Task tool (input: full multi-feature scope gồm nội dung prose đầy đủ của mọi file đã Read từ shortlist + `Phải Read tay` + value-sweep, hoặc toàn bộ docs từ fallback CŨ). Có thể kèm facts/edges làm metadata định tuyến, nhưng agent KHÔNG được dùng chúng thay prose cho impact conclusion hoặc CR diff. __Aggregate findings__ per `review-format.md` v1 + extensions (impacted artifacts table, apply order, non-impacts).

## Phase 3 — Verdict + write report + HARD STOP (bước 8-9)

8. __Determine verdict:__
   - __direct-edit-ok__: tất cả impacted docs `status: draft` + no Jira-pushed US in scope + severity ≤ medium.
   - __cr-needed__: bất kỳ điều kiện sau → ≥1 doc `status: in-review/approved/shipped`, OR severity high/critical, OR ≥1 US đã push Jira, OR cascade depth >2.

   __HITL chốt mơ hồ TRƯỚC khi viết report__ — nếu trong lúc phân tích có điểm phải đoán (đa phương án thực thi change, coherence conflict giữa file, có nên mở rộng cross-feature, giá trị/wording nghiệp vụ chưa rõ) → DỪNG, dùng __AskUserQuestion__ cho user chốt từng điểm. KHÔNG ghi report dựa trên phỏng đoán. Report phải phản ánh phương án user đã chốt.

9. __Viết report ra file — 1 CR record self-contained (KHÔNG tách file impact):__
   - Generate CR ID race-safe bằng lock __atomic__: `mkdir docs/cr/.lock` (path CỐ ĐỊNH — `mkdir` fail nếu đã tồn tại = lock thật) → `trap 'rmdir docs/cr/.lock' EXIT` → scan max NNN → +1 → 3-digit pad → tạo file → nhả lock.
     - **KHÔNG dùng `mktemp -d docs/cr/.lock-XXXXXX`** — nó tạo cho mỗi process một thư mục *khác nhau*, nên không process nào chặn process nào; hai `/cr` song song vẫn scan cùng max NNN và sinh trùng ID. Đó là lock giả.
     - Lock tồn đọng do crash (>10 phút) → cảnh báo + cho user xác nhận xoá, KHÔNG tự cướp im lặng.
   - __L1 approval__ preview đường dẫn CR file (chỉ 1 file). User Y → write.
   - **Write `docs/cr/CR-{id}.md` từ `_templates/change-request.md`__, kết thúc ở __`status: impact-assessed`** với MỌI verdict (report đã ghi = đã assess):‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
     - __Mọi verdict điền:__ Frontmatter + Request Summary / Source / Reason / Proposed Change / __Impact Matrix (6 chiều: scope/stakeholder/effort/timeline/risk/dependency)__ / Impacted Docs (table) + explicit non-impacts / __Rollback Plan__ / Decision Log / Verification Checklist / __Open Questions__ (rỗng → ghi thẳng "Không có"; KHÔNG để lại placeholder `{{open_question_1}}`).
     - __Baseline hash__ — với mỗi file trong Impacted Docs, ghi `git hash-object <file>` (hoặc SHA-256 nếu chưa track) vào cột `Baseline` của bảng Impacted Docs. Đây là nguồn DUY NHẤT để bước 9.5 biết docs có đổi sau khi viết report không.
     - __direct-edit-ok__ → Section 7 "Detailed Impact" để trống (Impact Matrix đã đủ).
     - __cr-needed__ → điền ĐẦY ĐỦ Section 7 "Detailed Impact" (requirement/story-AC/Jira/traceability từ `@change-tracker` + `@gap-analyst` output).
     - **KHÔNG để CR ở `status: proposed` sau khi report đã ghi** — `proposed` nghĩa là "chưa assess", và `workspace-status.py` biến mọi `proposed` thành __action item P0 "CR proposed chưa assess"__. Giữ `proposed` cho direct-edit-ok = mọi CR nhỏ đều bị dashboard báo blocker oan. Phân biệt độ sâu bằng field `verdict`, KHÔNG bằng `status`.
     - Sections "Applied Changes" + "Artifacts to rebuild" __đã có sẵn placeholder trong template__ → Phase 4-5 __thay nội dung placeholder__, KHÔNG append heading mới (append = heading trùng).
   - **KHÔNG tạo `docs/impacts/CR-{id}-impact.md`** — mọi thứ trong CR record.
   - __KHÔNG Edit/Write bất kỳ doc feature nào ở phase này.__

   __HARD STOP — in report + đợi user đọc kỹ + confirm.__ Sau khi write report, DỪNG hẳn turn (mẫu output đầy đủ: xem `references/output-templates.md` § "HARD STOP sau khi viết report"). Skill KẾT THÚC turn ở đây. __TUYỆT ĐỐI không tự đi tiếp sang apply.__ Đợi user reply `apply`/`cancel`/câu hỏi. Nếu user đã nói "chỉ phân tích thôi" ngay từ đầu → in report path rồi dừng, KHÔNG kèm gợi ý `apply` trong phiên.

## Phase 4 — Apply, chỉ chạy khi user gõ `apply` hoặc `/cr apply <cr-id>` (bước 10-14)

> Đây là turn RIÊNG, sau HARD STOP.

9.5. **Resolve CR record trước khi làm bất cứ điều gì — BẮT BUỘC, dù có hay không kèm `<cr-id>`.** KHÔNG dựa vào memory hội thoại để đoán "CR nào vừa nói tới" (turn có thể đứt do compact context, session mới, hoặc user quay lại sau nhiều ngày).
    - **Có kèm `<cr-id>`** → Read thẳng `docs/cr/CR-{id}.md`. Not found → báo lỗi + gợi ý `/cr list`.
    - __Không kèm ID (chỉ gõ "apply")__ → scan toàn bộ `docs/cr/CR-*.md`, lọc những CR đang chờ apply hoặc dở dang (`status: impact-assessed` hoặc `status: partially-applied`):
      - __Đúng 1 CR đang chờ__ → tự dùng CR đó, không hỏi lại (không có gì để đoán, chỉ 1 lựa chọn hợp lệ).
      - __≥2 CR đang chờ__ → __KHÔNG tự chọn "gần nhất" hay bất kỳ suy luận nào.__ In danh sách cho user chọn tường minh (mẫu: xem `references/output-templates.md` § "Nhiều CR đang chờ apply — hỏi chọn"). Đợi user chọn. KHÔNG tiến hành cho tới khi có lựa chọn rõ ràng.
      - __0 CR đang chờ__ → báo rõ "Không có CR nào đang chờ apply — dùng `/cr list` xem toàn bộ record cũ, hoặc mở 1 CR mới bằng `/cr \"<mô tả thay đổi>\"`." KHÔNG tự suy đoán ý user muốn gì tiếp theo.
    - Sau khi resolve đúng 1 CR: Read lại CR record (self-contained, gồm impact assessment) để khôi phục scope/verdict/proposed change.
    - __Verify CR status hợp lệ để apply:__ `impact-assessed` (chờ apply) hoặc `partially-applied` (resume — xem bước 12 để biết file nào còn `⬜ pending`). Gặp `applied`/`closed`/`rejected` → refuse + báo trạng thái.

9.6. __Baseline check — phát hiện docs đã đổi sau khi viết report (BẮT BUỘC, trước pre-compose).__ So `git hash-object <file>` hiện tại với cột `Baseline` trong bảng Impacted Docs của CR record:
    - __Mọi hash khớp__ → đi tiếp bình thường.
    - __Bất kỳ file nào lệch__ → __HARD STOP__. In danh sách file đã đổi + hỏi user: `re-assess` (chạy lại Phase 2-3 cho CR này) / `apply-anyway` (chấp nhận rủi ro, ghi rõ vào Decision Log) / `cancel`. KHÔNG tự chọn — impact assessment dựa trên nội dung cũ có thể sai hoàn toàn.
    - File trong Impacted Docs __không còn tồn tại__ → cũng là lệch, xử lý như trên.
    - CR record __không có cột Baseline__ (record cũ, viết trước 2026-07-16) → KHÔNG thể verify → warn rõ "record này không có baseline hash, em không kiểm được docs có đổi từ lúc viết report không" + hỏi user `apply-anyway`/`re-assess`/`cancel`. KHÔNG im lặng bỏ qua.

10. __Pre-compose parallel__ — spawn N Task subagent song song, 1 task / impacted file:
    - Input: `{file_path, file_content, change_description (theo phương án đã chốt), related_context}`. Output: `{before_snippet, proposed_diff, after_preview, summary_1line}`.
    - Wait all N. __Coherence check__ cross-file: same term/field/ID wording khác nhau? 2 file related conflict (vd urd.md "Apple SSO P0" vs prd.md "P1")?
      - __Conflict found → DỪNG, dùng AskUserQuestion cho user chốt phương án.__ KHÔNG tự chọn 1 bên rồi apply.
    - Single-file CR (N=1) → skip parallel, compose direct.
    - __Khởi tạo Apply Checklist — GHI VÀO CR RECORD ngay, không chỉ giữ trong hội thoại.__ Danh sách N file lấy từ "Impacted docs" trong CR record, mỗi dòng `⬜ pending`, ghi vào section `## Applied Changes` (thay placeholder). Đồng thời set CR `status: impact-assessed → partially-applied` — đánh dấu "đã bắt đầu đụng docs".
      - Lý do phải persist: checklist chỉ sống trong hội thoại thì user cancel giữa loop / context bị compact / session đứt → __resume không biết file nào đã sửa → apply đúp__. CR record là nơi duy nhất sống sót qua các sự cố đó.

11. __L1 preview tổng__ trước loop (mẫu: xem `references/output-templates.md` § "L1 preview tổng trước L2 loop").

12. __L2 diff loop__ — dùng output đã pre-composed ở bước 10:
    - Track per-file `{before_snippet, after_snippet}` để dùng ở bước 14 (before đã capture từ bước 10).
    - Mỗi impacted doc (theo apply order từ `@change-tracker`):
      - Show `before_snippet` + `proposed_diff` đã compose sẵn.
      - __L2 diff__ trước Edit (mẫu prompt: xem `references/output-templates.md` § "L2 diff mỗi file trong apply loop").
      - `Y` → Edit + **lưu `after_snippet`**. Trước MỖI Edit: set env `CLAUDE_CHANGELOG_NOTE="applied {cr-id}: {note}"` — hook ghi 1 dòng changelog.md per file (format: `{date} | /cr | {@author} | {file-path} | applied {cr-id}: {note}`; path là routing, không còn bảng routing).
        - **Mark Apply Checklist dòng này → `✅ done` + GHI NGAY vào CR record** (không đợi hết loop).
      - `n` → skip, ghi vào CR Decision Log. **Mark `⏭ skipped ({lý do})` + ghi ngay vào CR record** — KHÔNG để `⬜ pending`.
      - `edit-prompt:` → regenerate fix với feedback, show diff lại (max 3 vòng). Checklist giữ `⬜ pending` tới khi có kết quả cuối (Y hoặc n).
    - __Persist sau MỖI quyết định__ (Y hoặc n), không gom cuối loop: đây là điều kiện để resume đúng sau khi ngắt. Cập nhật checklist trong CR record là thao tác đã được approve ở HARD STOP (không phải quyết định mới) → ghi thẳng, không hỏi lại từng dòng.
    - __User cancel giữa loop__ → giữ `status: partially-applied` + checklist phản ánh đúng thực tế (`✅` cho file đã Edit, `⬜` cho phần còn lại). Báo user: resume bằng `/cr apply CR-{id}` — skill sẽ chỉ xử lý các dòng `⬜`, KHÔNG apply lại dòng `✅`.
    - Hook `post-edit-stale.sh` fire after each Edit.

12.5. __Đối chiếu Apply Checklist — BẮT BUỘC trước khi qua bước 13.__ So N dòng trong checklist (khởi tạo ở bước 10) với thực tế đã xử lý:
    - Còn dòng `⬜ pending` (vd bị bỏ sót giữa loop do lỗi tool, timeout, quên) → __KHÔNG được coi CR là applied.__ Quay lại xử lý nốt dòng đó (Edit hoặc hỏi user muốn skip với lý do gì) — lặp tới khi checklist không còn `⬜ pending`.
    - Tất cả dòng đã `✅ done` hoặc `⏭ skipped` → mới được đi tiếp bước 13.
    - In tóm tắt checklist trước khi qua bước 13 (mẫu: xem `references/output-templates.md` § "Apply Checklist — đối chiếu trước khi applied").

13. __Auto-resolve stale__ — docs vừa edited có `status: stale` → set `status: revisions`.
    - __Đây là Edit doc nghiệp vụ → PHẢI qua L2 diff__ như mọi Edit khác (`approval-gate.md`: L2 cho mọi file đã tồn tại). __Gộp thẳng vào L2 diff của chính file đó ở bước 12__ (1 diff gồm cả nội dung + `status:`), KHÔNG ghi lén thành lượt Edit thứ 2 không hỏi.

14. __Update CR record__ (chỉ sau khi bước 12.5 xác nhận checklist sạch `⬜ pending`): `partially-applied → applied`.
    - Gom TẤT CẢ thay đổi lên CR record thành __1 lượt L1 + L2 diff duy nhất__ (không phải nhiều Edit lén): `status` + `## Applied Changes` + Decision Log.
    - __Thay nội dung placeholder__ của section `## Applied Changes` (template đã có sẵn heading) — __KHÔNG append heading mới__, sẽ trùng heading.
    - Nội dung: Apply Checklist đã đối chiếu (done/skipped per file) + per-file 5-10 dòng before/after context (mẫu: `references/output-templates.md` § "Applied Changes section"). Truncate diff dài (>20 dòng) với "... (N lines elided, see git for full diff)".
    - Set env note trước Edit (hook ghi changelog.md).

## Phase 5 — Verify + recommend (bước 15-21)

15. **Chạy `/gap <feature>`** (cho mỗi feature trong scope nếu cross-feature). Output gap deltas.
    - __Auto CHỈ phần analysis (read-only)__ — dựng ma trận + tìm gap/orphan, in kết quả cho user.
    - **Phần ghi `docs/_shared/traceability.md` KHÔNG được bypass gate của `/gap`** — `/gap` có L1 approval trước Write; `/cr` không có quyền bỏ qua nó hộ. Để `/gap` tự show L1 như bình thường.

16. __Detect downstream artifacts cần rebuild__ — scan list file đã edit ở Phase 4, map theo bảng (xem `references/output-templates.md` § "Artifacts to rebuild — bảng detect").

17. **Điền section `## Artifacts to rebuild` trong CR record** — __thay nội dung placeholder__ có sẵn trong template, KHÔNG append heading mới (mẫu: `references/output-templates.md` § "Artifacts to rebuild — section append vào CR record"). Qua L2 diff như mọi Edit. Khi user chạy regen sau này, update cột "Trạng thái" → `✅ done {date}`.

18. __Prompt user run regen luôn không__ (mẫu: xem `references/output-templates.md` § "Prompt chạy artifact rebuild ngay").

19. __Print Activity Log Summary — BẮT BUỘC (visibility check cho user).__ Skill PHẢI in tổng kết cuối session: mọi file đã edit + xác nhận từng file có dòng changelog.md tương ứng (mẫu: xem `references/output-templates.md` Mục "Activity Log Summary cuối session"). KHÔNG được skip bước này.

20. __Recommend (in cuối output):__
    - chạy lại skill sinh doc (/urd|/brd|/prd-epic|/srs) cho material changes để re-review — hoặc để reviewer người duyệt.
    - `/jira <feature> --update --dry-run` nếu impacted US có `jira_keys`.
    - `/cr close CR-{id}` sau khi verify pass + artifacts rebuilt.

21. __Stale chain check__ — nếu hook propagated stale >3 downstream, prompt "Stale chain lớn, có muốn tạo follow-up CR cho từng cluster?".

## Subcommands — quản lý CR records cũ

### `/cr list`

Scan `docs/cr/CR-*.md`. Output table (cột: CR ID, Status, Severity, Feature, Updated, Impacted docs, Stale chain — xem `references/output-templates.md` § "/cr list — bảng output"). Default `--status open` = `proposed | impact-assessed | partially-applied | applied`. `--status all` xem cả closed/rejected.

### `/cr apply [<cr-id>]`

Resume apply 1 CR đã viết report ở phiên trước (user đã đọc kỹ + quay lại). ID là optional — xem bước 9.5 (Phase 4) cho logic resolve khi không kèm ID.

- Verify CR status ∈ `impact-assessed` (chờ apply) | `partially-applied` (resume dở dang). Nếu `applied`/`closed`/`rejected` → refuse + báo trạng thái.
- Read lại `docs/cr/CR-{id}.md` (self-contained, gồm impact assessment) để khôi phục feature/scope/verdict/proposed change.
- **`partially-applied` → resume: CHỈ xử lý các dòng `⬜ pending` trong Apply Checklist**, KHÔNG apply lại dòng `✅ done` (apply đúp).
- __Baseline check bước 9.6 BẮT BUỘC__ — docs đổi sau khi viết report → HARD STOP, hỏi `re-assess`/`apply-anyway`/`cancel`. Đây là cơ chế thật thay cho lời hứa "warn nếu impact assessment stale" trước đây (không có gì để so).
- Nhảy vào __Phase 4__ (pre-compose → L1 → L2 loop → verify). KHÔNG phân tích lại từ đầu.

### `/cr show <cr-id>`

Render CR record content (read-only, gồm cả impact assessment vì self-contained). Hữu ích trước khi `apply`, `close` hoặc audit.

### `/cr close <cr-id>`

- Verify CR status = `applied`. (`partially-applied` → refuse: apply nốt hoặc rollback trước.)
- __Check "Artifacts to rebuild" table trong CR record__ — nếu còn ≥1 row `⏳ pending` → REFUSE close mặc định. Show danh sách pending + hỏi:
  - `rebuild` → chạy các lệnh regen còn pending ngay (giống bước 18), update table → `✅ done {date}`, rồi mới close.
  - `waive` → close, nhưng __mỗi__ artifact pending phải chuyển thành `⚠ waived ({lý do})` — KHÔNG để nguyên `⏳ pending`. Ghi Decision Log: "Closed với N artifact(s) waived: {lý do}."
  - `cancel` → giữ nguyên status `applied`, không close.
- **KHÔNG có lựa chọn `force` giữ nguyên `⏳ pending`.** Rule định nghĩa `closed` = "không còn open action"; close mà vẫn để pending là __tự mâu thuẫn__, lại còn giấu luôn cảnh báo của `/dashboard` (`workspace-status.py` chỉ flag artifacts pending khi status còn `applied` — closed thì hết cảnh báo, việc dở dang biến mất khỏi radar). Muốn bỏ qua thì phải nói rõ *bỏ qua vì sao* → đó chính là `waive`.
- Update status → `closed`. Append Decision Log row + reason. Qua L2 diff.
- Verification checklist visible nếu chưa run `/gap`.

### `/cr reject <cr-id>`

- **Verify CR status ∈ `proposed | impact-assessed` (CHƯA đụng docs).** Reason required.
- **CR đã `applied`/`partially-applied` → REFUSE reject.** Docs đã đổi thật rồi; set `rejected` = record nói dối "change sẽ không được apply" trong khi vault đã mang thay đổi đó → mất dấu vết, không ai biết phải hoàn tác gì. Route đúng: __rollback__ (`rules/change-request.md` § Rollback — reverse patch qua L2 diff, KHÔNG `git checkout`), rồi ghi Decision Log; muốn đổi hướng thì mở CR mới.
- Update status → `rejected`. Decision Log row. Qua L2 diff.
- KHÔNG delete file (record permanent).

## Output

`docs/cr/CR-{YYYYMMDD}-{NNN}.md` — change record __self-contained__ (`type: change-request`): Impact Matrix 6 chiều + detailed impact + rollback plan gộp trong 1 file. KHÔNG tách folder `impacts/`.

__Khi nào ghi:__ file CR luôn được ghi. Các doc bị ảnh hưởng CHỈ sửa sau khi user gõ `apply` (report-first + HARD STOP).

## References

- @references/output-templates.md (mẫu output/message đầy đủ cho từng bước — tách ra để phần trên dễ đọc)
- @../../rules/change-request.md
- @../../rules/approval-gate.md
- @../../rules/ba-conventions.md (Mục 2 no-re-ask — áp cho intake gate bước 4.5; Mục 3 IT-BA framing cho câu hỏi clarify)
- @../../rules/kg-usage.md (quy tắc dùng Knowledge Graph — graph chọn file, prose kết luận)
- @../../rules/delivery-readiness.md
- @../../rules/review-format.md
- @../../rules/naming-conventions.md
- @../../rules/changelog.md
- @../../agents/change-tracker.md
- @../../agents/gap-analyst.md
- @../../../_templates/change-request.md  *(self-contained: gồm Impact Matrix 6 chiều + Detailed Impact + Rollback Plan — không còn tách impact-report.md riêng)*‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
