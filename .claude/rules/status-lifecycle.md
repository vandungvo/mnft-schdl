---
paths:
  - "docs/**/*.md"
  - ".claude/hooks/**"
---

# Status Lifecycle‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Doc statuses‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
draft → in-review → revisions → approved → shipped
                       ↑           ↓
                       └───────────┘
```

| Status | Meaning |
|--------|---------|
| `draft` | Initial creation, work in progress, not yet shared |
| `in-review` | Sent for review (stakeholders or `@reviewer-agents`) |
| `revisions` | Reviewer flagged issues, doc needs rework |
| `approved` | Reviewer accepted, frozen for development |
| `shipped` | Feature delivered to production |
| `stale` | **Cross-cutting** (ngoài luồng tuyến tính): upstream đổi làm doc này có thể lỗi thời. **Set bởi hook `post-edit-stale.sh`** (reverse-graph scan `links:`). Không phải bước tiến; **thoát bằng `/cr`** (review + apply/dismiss) rồi doc quay lại status trước đó. `/jira --push` HARD GATE khi gặp `stale`. |

Loops:
- `in-review → revisions → in-review` is a normal review cycle
- After enough cycles, `revisions → approved`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- `stale` phủ lên bất kỳ status nào (draft/approved/shipped) khi upstream đổi — không thay thế status gốc, chỉ đánh dấu cần review lại.

## Transitions trigger automation‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Transition | Action |
|------------|--------|
| `* → in-review` | (future) Notify reviewer agent specified in frontmatter `reviewers:` |
| `* → approved` | Xem trạng thái tổng hợp qua `/dashboard` (KHÔNG có file `docs/feature-list.md` — đã bỏ) |
| `* → shipped` | (future) Trigger `@gap-analyst` for cross-doc consistency check |

## Other doc types‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Meeting‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
```
captured → processed
```
- `captured` = raw notes
- `processed` = decisions/blockers/action items structured into tables within the meeting note itself (no separate files — see `feedback_meet_consolidated`)

## Frontmatter format‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```yaml
---
status: draft               # required
status_reason: "Awaiting input from client on payment provider"   # optional, free text
status_changed: 2026-05-09  # optional, set by skill on transition
---
```


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
