---
type: change-request
cr_id: CR-{{date_compact}}-{{number}}
feature: {{feature}}
status: proposed
severity: {{severity}}
source: {{source}}
requester: {{requester}}
updated: {{date}}
links: {{links}}
jira_keys: []
---

# CR-{{date_compact}}-{{number}}: {{title}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Request Summary‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{summary}}

## 2. Source / Context‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Field | Value |
|-------|-------|
| Requester | {{requester}} |
| Source | {{source}} |
| Received | {{date}} |
| Feature | {{feature}} |
| Severity | {{severity}} |
| Verdict | {{verdict}}  *(direct-edit-ok / cr-needed)* |

## 3. Reason‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{reason}}

## 4. Proposed Change‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{proposed_change}}

## 5. Impact Matrix (6 chiều)

| Chiều | Mức | Ghi chú |
|-------|-----|---------|
| Scope (phạm vi feature/screen/FR) | None / Low / Med / High | {{scope_note}} |
| Stakeholder (ai bị ảnh hưởng) | None / Low / Med / High | {{stakeholder_note}} |
| Effort (công sức sửa docs + downstream) | None / Low / Med / High | {{effort_note}} |
| Timeline (ảnh hưởng lịch giao) | None / Low / Med / High | {{timeline_note}} |
| Risk (rủi ro nghiệp vụ nếu apply / nếu KHÔNG apply) | None / Low / Med / High | {{risk_note}} |
| Dependency (đụng feature/entity/ID khác) | None / Low / Med / High | {{dependency_note}} |

## 6. Impacted Docs

| Artifact | Path | Impact Type | Severity | Recommended Action | Baseline |
|----------|------|-------------|----------|--------------------|----------|
| {{artifact}} | {{path}} | {{impact_type}} | BLOCKING/WARNING/SUGGESTION | {{action}} | {{git_hash}} |

Impact type enum: `content-update | priority-change | scope-expansion | contradiction | traceability-update | downstream-sync`.

> __Baseline__ = `git hash-object <path>` lúc viết report. Bước 9.6 của `/cr apply` so lại hash này để biết doc có bị đổi sau khi report được viết không (impact assessment có còn đúng không). Lệch → HARD STOP hỏi re-assess.

__Explicit non-impacts__ (docs xác nhận KHÔNG đổi — tránh over-edit): {{non_impacts}}

## 7. Detailed Impact — *(chỉ điền khi verdict `cr-needed`)*

__Requirement impact__ — {{requirement_impact}}
*Affected FR/NFR/BR/Error: list ID + change summary.*

__User story / AC impact__ — {{story_ac_impact}}
*Stories/ACs cần update; new ones; orphans.*

__Jira impact__ — {{jira_impact}}
*Issues cần update; new ones. Bỏ trống nếu `jira_keys` empty.*

__Traceability impact__ — {{traceability_impact}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
*Links break/added; edges mới trong relationship graph.*

## 8. Rollback Plan

| Bước | Cách hoàn tác |
|------|---------------|
| 1 | Đọc `## Applied Changes` section (before snippet mỗi file) |
| 2 | Sinh __reverse patch__ từ before snippet → apply qua __L2 diff__ từng file (user confirm như apply thường) |
| 3 | Chạy `/gap {{feature}}` xác nhận traceability về trạng thái trước |
| 4 | Ghi Decision Log dòng rollback + lý do. **Giữ `status: applied`** — KHÔNG set `rejected` (CR đã apply thật; `rejected` = viết lại lịch sử). Đổi hướng thì mở CR mới |

> **KHÔNG dùng `git checkout -- <file>`**: lệnh này trả file về HEAD chứ không phải trạng thái ngay trước apply → __nuốt mọi thay đổi chưa commit__ của user. Chỉ dùng git khi đã xác nhận working tree sạch TRƯỚC lúc apply. Xem `.claude/rules/change-request.md` § Rollback.

Rủi ro rollback đặc biệt (nếu có): {{rollback_risk}}

## 9. Decision Log

| Date | Decision | By | Notes |
|------|----------|----|-------|
| {{date}} | Proposed | {{requester}} | Initial request captured |

## 10. Verification Checklist

* [ ] Impact Matrix reviewed
* [ ] Impacted docs updated hoặc explicitly skipped
* [ ] User stories / AC updated nếu cần
* [ ] Jira mapping reviewed nếu `jira_keys` non-empty
* [ ] `/gap` re-run cho affected scope
* [ ] Relevant docs re-reviewed
* [ ] Stakeholder notified nếu cần

## 11. Open Questions

* [ ] {{open_question_1}}

<!-- Không có câu hỏi mở → ghi thẳng "Không có". KHÔNG để lại literal {{open_question_1}}. -->

## 12. Apply Checklist

<!-- Khởi tạo ở bước 10 (khi bắt đầu apply loop), 1 dòng / file trong Impacted Docs.
     Cập nhật NGAY sau mỗi quyết định L2 — đây là nguồn resume duy nhất nếu loop bị ngắt.
     ⬜ pending → ✅ done | ⏭ skipped ({lý do}) -->

| # | File | Trạng thái |
|---|------|------------|

***

*2 section dưới đây __đã có sẵn heading__ — Phase 4-5 (sau khi user gõ `apply`) __THAY nội dung placeholder__, KHÔNG append heading mới (append = heading trùng). Để trống khi mới viết report.*

## Applied Changes ({{date}})

<!-- per-file before/after snippet 5-10 dòng, kèm Apply Checklist (Mục 12) đã đối chiếu -->

## Artifacts to rebuild

<!-- Figma/preview/export/prototype cần regen sau apply.
     ⏳ pending → ✅ done {date} | ⚠ waived ({lý do}).
     /cr close KHÔNG cho close khi còn ⏳ pending — phải rebuild hoặc waive có lý do. -->‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
