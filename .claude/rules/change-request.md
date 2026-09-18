---
paths:
  - ".claude/skills/cr/**"
  - "docs/cr/**"
---

# Change Request Rules‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Formal workflow cho requested changes sau khi docs đi vào review/approval/delivery.

## When to create a CR‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Create CR khi requested change affect:

* Approved PRD/SRS/use case/user story/AC.
* Jira-pushed story hoặc epic.
* Business scope, priority, timeline, owner, AC.
* Error matrix, screen logic, data model, external integration.
* Decision đã recorded (trong meeting note `docs/meetings/` — bảng Decisions).
* Doc đang `status: stale` cần reconcile.
* Stale chain depth >2 (cascade rebuild).

KHÔNG require CR cho:

* Typo-only edits trong draft docs.
* Formatting cleanup không change meaning.
* Filling placeholder trong draft doc.

## CR lifecycle‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
proposed → impact-assessed → applied → closed
                │      │        │
                │      └── rejected ──┘   (rejected: CHỈ pre-apply)
                └── partially-applied ──► applied
```

| Status | Meaning |
|--------|---------|
| `proposed` | Change captured, **chưa** viết report. Trạng thái thoáng qua — CR chỉ ở đây trong lúc `/cr` đang phân tích |
| `impact-assessed` | Report đã ghi (Impact Matrix + Impacted Docs + Rollback), **đang chờ user gõ `apply`**. Mọi verdict đều đạt state này khi report xong — kể cả `direct-edit-ok` |
| `partially-applied` | Apply loop bị ngắt giữa chừng (user cancel / lỗi tool). Apply Checklist trong CR record ghi rõ file nào `✅ done`, file nào còn `⬜ pending` |
| `applied` | Docs đã sửa xong + Apply Checklist sạch `⬜ pending` + `/gap` đã chạy |
| `rejected` | Change sẽ không apply. **Chỉ hợp lệ khi CR chưa apply** (`proposed`/`impact-assessed`) |
| `closed` | CR xong, không còn open action (gồm artifacts đã rebuild hoặc `waived` có lý do) |

**Vì sao KHÔNG có `approved` và `verified`** (bỏ 2026-07-16 — đừng thêm lại):

* **`approved`** — approval **chính là lệnh `apply` của user** sau HARD STOP. HARD STOP là *điểm chờ*, không phải approval. Một field frontmatter mà không skill nào set thì chỉ làm rule nói dối về hành vi thật.
* **`verified`** — định nghĩa cũ đòi `/gap` **và** review người-duyệt. Nhưng `/cr` không tự chạy review được, nên state này không bao giờ đạt được. `/gap` giờ là điều kiện của chính `applied`.

## Severity‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Severity | Criteria |
|----------|----------|
| `critical` | Legal/compliance/security/money/data loss, production blocker |
| `high` | Changes approved scope, P0 story, launch timeline, external dependency |
| `medium` | Changes P1/P2 behavior, AC detail, screen state, wording với delivery impact |
| `low` | Clarification hoặc non-blocking improvement |

## Required CR content‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mỗi CR là **1 file self-contained** (`docs/cr/CR-{id}.md`) — impact assessment gộp trong record, KHÔNG tách `docs/impacts/` riêng. Phải capture:‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* Request summary
* Source / requester
* Reason
* Proposed change
* **Impact Matrix 6 chiều** (scope / stakeholder / effort / timeline / risk / dependency) — bảng đọc-nhanh, mọi verdict điền
* Impacted docs (frontmatter `links:` flat list) + explicit non-impacts
* Detailed impact (requirement/story-AC/Jira/traceability) — chỉ verdict `cr-needed`
* Impacted Jira issues (`jira_keys:` field, semantic data)
* **Rollback plan** — cách hoàn tác nếu apply sai. Dựa vào `## Applied Changes` before/after. **KHÔNG hướng dẫn `git checkout -- <file>`** (xem "Rollback" bên dưới)
* Decision log
* Verification checklist
* **Open Questions** — bắt buộc có mục; rỗng thì ghi thẳng "Không có", KHÔNG để placeholder `{{...}}`

## Applying changes (`/cr`)

Must:

1) Show CR record (gồm Impact Matrix + detailed impact) trước — HARD STOP đợi user gõ `apply`. **Chính lệnh `apply` là approval.**
2) Ask user which impacted docs to edit.
3) Apply edits one file at a time.
4) **Approval L2 diff** trước mỗi Edit. Áp cho **mọi** Edit, gồm cả các thao tác hậu-apply: đổi `stale → revisions`, cập nhật CR record, `close`/`reject`. Không thao tác nào được ghi im lặng vì "chỉ là metadata".
5) Set env `CLAUDE_CHANGELOG_NOTE="applied {cr-id}: {tóm tắt}"` trước edit — hook ghi sự kiện vào changelog.md (KHÔNG ghi changelog vào doc).
6) Hook `post-edit-stale.sh` tự propagate stale → log staleness.md. *(Hook loại trừ `docs/cr/` cả 2 vế — CR không phải downstream của doc nó sửa.)*
7) **Auto-resolve stale**: docs vừa edited (đã reconcile via CR) set `status: revisions` (hết stale).
8) **Persist Apply Checklist sau MỖI quyết định L2** (không đợi hết loop) — nguồn resume duy nhất khi bị ngắt. Ngắt giữa chừng → `status: partially-applied`, KHÔNG để `impact-assessed` (sẽ apply đúp khi resume).
9) Re-run `/gap <feature>` after applies — phần analysis chạy được tự động; phần ghi `traceability.md` do `/gap` tự show L1 (không bypass gate của nó).
10) Recommend reviewer người duyệt cho materially changed docs. *(Khuyến nghị — không phải điều kiện của `applied`.)*
11) Recommend `/jira --update --dry-run` nếu CR impact Jira-pushed (check `jira_keys`).

## Rollback

**KHÔNG dùng `git checkout -- <file>`.** Lệnh này trả file về HEAD, không phải về trạng thái ngay trước khi apply → nuốt mọi thay đổi chưa commit của user. Cùng lý do `approval-gate.md` đã cấm mô hình "Write-rồi-rollback".

Cách đúng, theo thứ tự ưu tiên:

1) **Reverse patch qua L2** — đọc `## Applied Changes` (before/after per file), sinh diff ngược, user confirm từng file như apply thường.
2) **Git chỉ khi user xác nhận working tree sạch** trước apply — khi đó `git diff` per file mới phản ánh đúng phạm vi CR.

Rollback xong: CR **không** trở về `rejected` (nó đã từng apply thật). Ghi Decision Log dòng rollback + lý do, giữ `applied` hoặc mở CR mới nếu cần đổi hướng.

## Rejected changes

Rejected CRs remain as records. KHÔNG delete. Set `status: rejected` + record rationale trong Decision Log.

**`rejected` chỉ hợp lệ pre-apply** (`proposed` / `impact-assessed`). CR đã `applied`/`partially-applied` mà muốn hủy → phải đi **Rollback** ở trên rồi ghi Decision Log; KHÔNG được set `rejected` (làm vậy là viết lại lịch sử: docs đã đổi thật mà record nói "sẽ không apply").‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
