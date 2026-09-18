---
name: meet
description: Dùng khi cần xử lý transcript/ghi chú họp thành 1 meeting note có cấu trúc (decisions, RAID, action items, confirmation) + đề xuất route.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
disable-model-invocation: true
argument-hint: "<type> <slug> [--feature <slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /meet — Process Meeting Transcript‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Capture meeting raw → **1 meeting note duy nhất** (consolidated): decisions log + RAID log + action items + open questions + confirmation table + "Tác động & Route" + email recap. KHÔNG tạo per-decision/per-blocker file.

**Nguyên tắc lõi:** meeting note là **bằng chứng từ buổi họp, CHƯA phải requirement đã chốt** — chỉ trở thành requirement khi stakeholder xác nhận (thường qua reply email recap). Vì vậy `/meet` **KHÔNG tự apply/cascade** nội dung meeting vào URD/BRD/PRD/SRS/roadmap. Nó chỉ sinh meeting note + **đề xuất bước tiếp (route)** để user tự quyết chạy `/brainstorm`, `/cr`, `/urd`... khi đã confirm.

**Grounding (chống bịa):** mỗi decision/action/RAID item PHẢI trích được **câu gốc trong transcript** (cột "Nguồn"). Không trích được nguồn → KHÔNG tạo item. Lỗi phổ biến nhất của công cụ meeting-AI là *đẻ action item cho output trông đầy đủ* — skill này chỉ giữ cái họp **thật sự** chốt/giao.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **1 file output duy nhất** — `docs/meetings/{date}-{type}-{slug}.md`. KHÔNG có file riêng cho decision/blocker — mọi item sống dưới dạng table trong meeting note. Lý do: meeting note đã đủ context, split file rời rạc gây navigation overhead + duplicate maintenance. (Per `feedback_meet_consolidated.md`.)
* **Grounding bắt buộc** — mọi decision/action/RAID item phải có cột/phần **Nguồn = câu gốc trong transcript** (+ speaker nếu có nhãn). Không trích được nguồn → KHÔNG tạo item (chống bịa).
* **Decisions = table** trong `## Decisions` (cột: # | Quyết định | Người chốt | Lý do | Phương án khác | Tác động | Status | Supersedes | Nguồn). Status: `proposed / accepted / rejected / deprecated / superseded`. KHÔNG xóa decision cũ khi supersede — ghi vào cột `Supersedes`.
* **RAID = table** trong `## RAID` (cột: Loại | Nội dung | Mức | Owner | Ứng phó/mốc | Nguồn). Loại = **R**isk (chưa xảy ra) / **A**ssumption (đang coi là đúng, cần kiểm) / **I**ssue (đã xảy ra — gồm blocker) / **D**ependency (phụ thuộc nhóm/hệ thống/mốc). Thay bảng Blockers cũ (blocker = Issue).
* **Action items = list** — chỉ tạo khi có **cam kết tường minh** (`{người} + {việc} + {mốc/động từ cam kết}`). Format `- [ ] **@owner** — action (kết quả mong đợi: ...). Due **YYYY-MM-DD**.` 1 owner duy nhất; "team xử lý" → flag hỏi ai chịu.
* **Open Questions = list** trong `## Open Questions` (`- [ ] **OQ-N**: question (nguồn: ai nêu)`). Câu **ngụ ý** ("nên/chắc/cần xem lại") → OQ, **KHÔNG** thành action có owner.
* **Xác nhận = table** trong `## Xác nhận` — đánh dấu decision/item quan trọng nào **chưa** được stakeholder confirm (⏳ chờ recap reply / ❌ chưa chốt / ✅ confirmed).
* **Tác động & Route = table** trong `## Tác động & Bước tiếp (đề xuất — KHÔNG tự áp)` — thay Phase E cascade cũ. Chỉ liệt kê `item → doc bị đụng → skill đề xuất → confirm?`; KHÔNG tự Write vào doc feature nào.
* **Views nhanh** — 3 tóm tắt ngắn BA / PO / PM (mỗi vai 1 dòng).
* **L1 batch approval** trước Write — prose BA-friendly (per @../../rules/ba-conventions.md Mục 5), KHÔNG bảng `# | path | action`.
* **Confidence-based preview** — show extracted items với confidence levels, user accept/reject từng batch.
* **Auto language detection** từ transcript (vi/en/mixed). **Nguồn ghi-chú-tay thô** (câu cụt, không nhãn speaker, VN/EN lẫn) → bóc ít hơn, hỏi bù nhiều hơn, KHÔNG bịa cho đầy.
* **Vietnamese-first** template; mixed lang preserve original quotes.
* **Project-level path** — `docs/meetings/` (KHÔNG per-feature, vì meeting có thể discuss nhiều features). Tag feature qua frontmatter `feature:` field nếu single-feature scope.
* **BA conventions** (must follow) — Owner resolution từ memory `user-identity` (KHÔNG kế thừa từ attendee), IT-BA framing (extractor không capture câu kỹ thuật DB/SDK/endpoint thành decision/RAID), VN typography ("Mục N" thay vì §), prose-style L1. Per @../../rules/ba-conventions.md.
* **KG chỉ để định tuyến/chọn file** — kết luận nội dung (decision cũ nói gì, có conflict không) LUÔN từ prose meeting note đã Read, KHÔNG từ facts. 3 nghĩa vụ khi gọi kg-query: `--all` khi output báo cap; Read TẤT CẢ mục "Phải Read tay"; `KG-ERROR` → quay về scan trực tiếp `docs/meetings/*.md`. Per @../../rules/kg-usage.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **KHÔNG bịa cho đủ đẹp** — lỗi phổ biến nhất của công cụ meeting-AI là đẻ action/decision cho output trông đầy đủ. Chỉ giữ item trích được câu gốc. Thà bảng ngắn còn hơn bảng đầy đồ bịa.
* **Cam kết tường minh vs ngụ ý** — "@Nam sẽ setup sandbox trước T6" = action (có người + việc + mốc). "chắc nên xem lại refund" = ngụ ý → Open Question, KHÔNG action có owner. Auto-assign chỉ tin được khi có câu cam kết rõ.
* **Meeting note ≠ requirement đã chốt** — mọi decision là bằng chứng từ buổi họp cho tới khi stakeholder reply xác nhận. Đánh dấu ⏳/❌ trong `## Xác nhận`. KHÔNG tự cascade vào doc feature — chỉ route.
* **Attribution khi cross-talk / ≥3 speaker** — diarization hay sai (nhiều vendor thừa nhận). Giữ nhãn speaker + trích câu gốc; nếu không chắc ai nói → ghi "(không rõ speaker)" thay vì đoán bừa gán owner.
* **Ghi-chú-tay thô** (câu cụt, không nhãn speaker, VN/EN lẫn) — bóc được ít hơn transcript đầy đủ. Bóc cái chắc, phần còn lại hỏi bù user theo no-re-ask, KHÔNG suy diễn thành decision/action.
* **RAID phân loại** — "Q3 tight chấp nhận risk" = Risk (chưa xảy ra), "OAuth thiếu" = Issue (đã xảy ra), "giả định user có tài khoản Momo" = Assumption, "chờ legal/Stripe VN" = Dependency. Đừng nhét hết vào 1 rổ Blocker.
* **Multi-feature transcript** — meeting discuss nhiều features → meeting note project-level OK, nhưng item nên tag `feature:` nếu xác định được. Ask user pick feature scope per-item nếu ambiguous.
* **Vietnamese names diacritic** — owner extraction: preserve diacritic trong content, ASCII slug cho filename.
* **Confidence low items** — KHÔNG auto-create. Show trong preview, user explicit pick.
* **Decision conflict** với existing — vd "Decided to use Momo" nhưng meeting cũ chốt "Use Stripe" → flag trong preview + 1 dòng route trong `## Tác động` ("supersedes ... → cân nhắc /cr"), KHÔNG tự sửa decision cũ.
* **Action item without explicit owner** — default `@TBD`, flag warning, suggest user assign. "team xử lý" → hỏi ai chịu (1 owner duy nhất).
* **Date parsing** — "thứ X tuần sau" / "tomorrow" → ISO date. Edge: "trước Tết" / "Q3" → leave as text + flag.
* **Transcript dài (>10k tokens)** — split extract per paragraph, merge findings, dedupe.
* **Email recap = công cụ confirm** — recap nên nhắc stakeholder reply xác nhận ("mình ghi vậy đúng chưa?"). type=client default EN unless transcript all VN. type=internal default VN.

## Inputs

```
/meet <type> <slug>                                    # paste transcript interactive
/meet <type> <slug> --feature <slug>                   # tag với feature scope (optional)
```

Muốn đổi hành vi mặc định, nói bằng lời:
* Transcript từ file có sẵn → tag `@file` hoặc dán nội dung, thay vì `--from-file <path>`.
* Viết bằng tiếng Anh → nói "viết bằng tiếng Anh" (mặc định auto-detect từ transcript).

> **Brainstorm là skill riêng.** `/meet` không còn tự chạy brainstorm. Sau khi có meeting note, muốn làm rõ yêu cầu tính năng thì gọi `/brainstorm @docs/meetings/{date}-{type}-{slug}.md --feature <slug>` — output report của `/meet` gợi ý sẵn câu này.

**Meeting types:** `client`, `internal`, `kickoff`, `review`, `standup`, `retro`, `vendor`.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Existing meetings: !`ls docs/meetings/ 2>/dev/null | tail -5`
Inbox: !`ls docs/inbox/*.md 2>/dev/null | wc -l | tr -d ' '`

## Approach

1) **Parse args** — type + slug + optional `--feature`.
2) **Resolve source:**
   * User tag `@file` hoặc dán nội dung → Read/parse nội dung đó làm transcript.
   * Không có nguồn nào → ask user paste transcript (large block, end with `EOF` line).
3) **Detect language** từ content (per `_rules/keyword-detection.md` patterns).
4) **Extract structured info** qua keyword-detection patterns — mỗi item **giữ câu gốc + speaker** làm Nguồn (grounding):‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   * Attendees (lines starting `{Name}:`, bullets trong "Tham dự"/"Attendees").
   * Decisions (trigger phrases "Chốt là...", "Decided to...", etc.) → gán Status (`proposed` nếu còn OQ mở, `accepted` nếu rõ), phương án đã cân nhắc nếu có.
   * RAID: Risk ("chấp nhận risk...", "sợ trượt..."), Assumption ("giả định...", "coi như...", "assume..."), Issue/blocker ("vướng...", "blocked...", "thiếu..."), Dependency ("phụ thuộc...", "chờ...", "cần {bên khác}...").
   * Action items — **chỉ khi cam kết tường minh** (`{Name} sẽ làm {việc} trước {mốc}`). Câu ngụ ý ("nên/chắc/cần xem") → Open Question, KHÔNG action.
   * Open questions (sentences ending `?`, "Chưa rõ...", "Unclear...", + mọi commitment ngụ ý).
5) **Confidence scoring** mỗi extraction (high/medium/low). Item không trích được câu gốc → bỏ (không đưa vào preview).
6) **Show extraction preview:**
   ```
   [/meet] Extracted từ transcript (mỗi item có câu gốc):
     Decisions (2 accepted, 1 proposed):
       ✓ Dùng Stripe card (accepted) — "mình dùng Stripe cho card..." @nam
       ✓ Launch Q3 (accepted) — "Q3 nhé, tôi chấp nhận" Anh Tâm
       ? Refund 30 ngày (proposed — scope v1/v1.1 còn mở) — "cho refund 30 ngày" Chị Mai
     
     RAID (1 Risk, 1 Issue, 1 Assumption, 1 Dependency):
       ✓ Risk: Q3 tight — "tight cũng được, chấp nhận risk" Anh Tâm
       ✓ Issue: Momo OAuth thiếu — "OAuth creds Momo chưa có" @nam
       ? Assumption: user có sẵn tài khoản Momo (ngụ ý, chưa ai xác nhận)
     
     Action items (2 tường minh):
       - @nam: setup Momo sandbox by 2026-05-15
     
     Open Questions (từ câu ngụ ý — KHÔNG thành action):
       - "chắc nên xem KYC guest > 5M" → OQ-3
     
   Accept all? (Y/n/select):
   ```
6.5. **Decision conflict detection** — trước L1, dùng graph để định tuyến rồi đối chiếu meeting note nguyên văn tìm decision cũ cùng topic.
   * **KG định tuyến trước.** Tìm decision theo chủ đề: grep kết quả `node .claude/skills/kg/engine/kg-query.mjs trace {feature} --all` (edge có node `{file}#D-n`) để shortlist meeting note candidate; `explore` CHỈ dùng khi đã có key/ID cụ thể (vd `docs/meetings/{file}.md#D-2`), KHÔNG nhận chủ đề tự do. Vẫn **Read các meeting note match** để đối chiếu nguyên văn. Nếu output báo `⚠ còn N mục — chạy với --all` thì chạy lại query với `--all`; Read toàn bộ mục `### Phải Read tay (ngoài graph)`; `KG-ERROR` hoặc lỗi bất kỳ → quay về scan trực tiếp `docs/meetings/*.md` như flow cũ. Graph chưa có decision của docs cũ → scan trực tiếp như hiện tại.
   * Nếu phát hiện conflict:
   * Flag rõ trong preview: `⚠️ Conflict: decision "{old-title}" trong {old-meeting-path} có thể bị supersede`.
   * Đề xuất 1 trong 3: (a) `/cr "<change>" --feature` để track change, (b) ghi note "supersedes: {old-meeting-decision-N}" trong row decision mới, (c) skip decision mới.
   * User pick → tiếp tục flow.
7) **Owner resolution** — `owner` field trong frontmatter meeting note lấy từ memory `user-identity` (current_user). Attendee names giữ trong content body + `attendees:` frontmatter list (preserve diacritic), KHÔNG dùng làm `owner`.
8) **L1 plan preview (BA-friendly prose)** — KHÔNG list per-decision/per-blocker file (vì chỉ 1 file output):

   > Em sẽ tạo **1 meeting note duy nhất** cho meeting **{type} — {slug}** ({date}):
   >
   > `docs/meetings/{date}-{type}-{slug}.md` — gồm {attendee_count} người dự, {decision_count} quyết định (có {unconfirmed_count} chưa confirm), {raid_count} mục RAID, {action_count} action item, {oq_count} open question, bảng Tác động & Route, email recap.
   >
   > **Conflict warning** (nếu có): {liệt kê — supersedes "{old}" trong {old-meeting}}.
   >
   > Apply? (Y / sửa)
9) **Write meeting note** từ `_templates/meeting.md` — 1 file duy nhất, structure:
   * Frontmatter: `type: meeting`, `meeting_type`, `date`, `attendees:` list, `feature:` (nếu `--feature`), `source:` (file/paste), `links:`.
   * `## Attendees` — bullet list với role + bên nội/ngoại.
   * `## Agenda / Context` — 1-2 đoạn mục tiêu meeting.
   * `## Discussion summary` — bullet 5-8 dòng (KHÔNG chép nguyên transcript).
   * `## Decisions` — **TABLE** 9 cột: `# | Quyết định | Người chốt | Lý do | Phương án khác | Tác động | Status | Supersedes | Nguồn (câu gốc)`.
   * `## RAID` — **TABLE** 6 cột: `Loại | Nội dung | Mức | Owner | Ứng phó/mốc | Nguồn`. Loại ∈ {Risk, Assumption, Issue, Dependency}.
   * `## Action Items` — **LIST** `- [ ] **@owner** — action (kết quả mong đợi: ...). Due **YYYY-MM-DD**.`.
   * `## Open Questions` — **LIST** `- [ ] **OQ-N**: question (nguồn: ...)`.
   * `## Xác nhận` — **TABLE** 4 cột: `Item | Confirm status | Confirmed by | Ngày`. Item quan trọng chưa confirm = ⏳/❌.
   * `## Tác động & Bước tiếp (đề xuất — KHÔNG tự áp)` — **TABLE** 5 cột: `Item | Loại | Doc bị đụng | Bước đề xuất | Confirm?`.
   * `## Views nhanh` — 3 bullet BA / PO / PM.
   * `## Email Draft (recap)` — code block; recap CHÍNH là công cụ để stakeholder xác nhận (nhắc họ reply confirm). VN cho internal, EN cho client.
   * `## Notes` — side notes BA capture sau meeting.
10) **Set env trước Write** (hook ghi changelog.md): `CLAUDE_SKILL_NAME=/meet` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=captured from transcript {meeting-slug}` (≤80 ký tự). Hook ghép cả dòng.
11) **(Removed — per `feedback_meet_consolidated.md`)** KHÔNG tạo per-decision file hay per-blocker file riêng — mọi item luôn sống dưới dạng table trong meeting note. Muốn track change thì user tự dùng `/cr`, không tạo file decision/blocker riêng.
13) **Tác động & Route (thay Phase E cascade cũ)** — sinh bảng `## Tác động & Bước tiếp` NGAY TRONG meeting note: mỗi decision/OQ có ngữ cảnh feature → 1 dòng `item | loại | doc bị đụng | skill đề xuất | confirm?`. **KHÔNG tự Write/cascade vào URD/BRD/PRD/SRS** — meeting note là bằng chứng từ buổi họp chưa confirm. Chỉ in câu lệnh gợi ý (`/brainstorm @<meeting> --feature`, `/cr "..." --feature`) để user tự chạy khi đã confirm. Decision conflict với meeting cũ → 1 dòng route ("supersedes ... → cân nhắc /cr"), KHÔNG tự sửa decision cũ.

14) **Output report** — 1 file created + counts + next suggestions + **in inline email draft để copy**:
    ```
    ✅ Đã capture meeting: docs/meetings/{date}-{type}-{slug}.md  (1 file)
       Decisions: {N} | RAID: {M} | Actions: {K} | OQs: {Q} | Chưa confirm: {C}
    
    📧 Email recap (anh copy gửi stakeholder — nhắc họ reply xác nhận):
    
    ─────────────────────────────────────
    {full email body inline — greeting + summary + decisions + actions + đề nghị reply xác nhận + sign-off}
    ─────────────────────────────────────
    
    Bước tiếp (đề xuất — anh tự chạy khi đã confirm, /meet KHÔNG tự áp):
      - /brainstorm @docs/meetings/{date}-{type}-{slug}.md --feature {feature}  — làm rõ yêu cầu từ nội dung meeting
      - /cr "<decision change>" --feature {feature}  — formal change nếu decision đụng scope đã duyệt
      - /urd <feature> hoặc /prd-epic <feature>   — nếu meeting tagged feature + item đã confirm
    ```

## Output

`docs/meetings/{YYYY-MM-DD}-{type}-{slug}.md` — **1 file DUY NHẤT** (`type: meeting`), project-level.

Decisions / blockers / action items là **bảng TRONG file này** — KHÔNG tách file riêng cho từng loại.

Skill **route** (gợi ý skill tiếp theo), KHÔNG tự cascade sửa doc nghiệp vụ — meeting note là bằng chứng, chưa phải yêu cầu đã duyệt.

## References

* @../../rules/ba-conventions.md
* @../../rules/kg-usage.md
* @../../rules/approval-gate.md
* @../../rules/naming-conventions.md
* @../../rules/keyword-detection.md
* @../../rules/changelog.md
* @../../../_templates/meeting.md
* @./references/example-meeting.md

*Note: `_templates/decision.md` và `_templates/blocker.md` giữ lại trong vault cho trường hợp promote thủ công sang file riêng (qua `/cr`), nhưng `/meet` KHÔNG dùng tự động.*

*Brainstorm continuation đã tách khỏi `/meet` — gọi `/brainstorm @<meeting-note> --feature <slug>` như một bước riêng khi cần làm rõ yêu cầu.*‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
