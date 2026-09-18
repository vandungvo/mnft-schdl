---
paths:
  - ".claude/skills/jira/**"
  - "docs/**/userstories/**"
---

# Jira Mapping Rules‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Standard mapping từ BA vault docs sang Jira issues (issue hierarchy + field mapping).
>
> **Sync-state / idempotency / conflict / mapping store** đã chuyển sang `.claude/rules/atlassian-sync.md` (gộp chung Jira+Confluence ở `.claude/state/atlassian/sync-state.yaml`). File này chỉ còn giữ **quy ước map cấu trúc** (loại issue, field nào lấy từ đâu). Mọi chỗ dưới nhắc `docs/_shared/jira-map.md` là **di sản** — nguồn thật giờ là `sync-state.yaml`.

## Issue hierarchy‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Vault artifact | Jira issue type | Parent | Path note |
|----------------|-----------------|--------|--------------|
| SRS feature | Epic | none or initiative | `docs/{feature}/srs/{feature}-spec.md` |
| User story | Story | Epic | `docs/{feature}/userstories/us-{NNN}.md` |
| AC item | Sub-task or checklist | Story | inline trong us-{NNN}.md |
| Use case | Linked doc only | Epic or Story | `docs/{feature}/usecases/uc-*.md` |

## Field mapping‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Jira field | Source |
|------------|--------|
| Summary | Story title (body H1) hoặc feature name |
| Description | Generated markdown summary với links back to vault paths (Jira Markdown format) |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
| Acceptance Criteria | `## Acceptance Criteria` section của US |
| Priority | frontmatter `priority` hoặc linked FR priority |
| Labels | `ba-vault`, feature slug, doc type |
| Components | optional user-provided mapping |
| Epic Link / Parent | generated từ SRS feature mapping |

Note: Description links dùng absolute repo path từ vault root, vd `[docs/payment/userstories/us-001.md](../../docs/payment/userstories/us-001.md)`.

## Idempotency (key ở index, không ở us frontmatter)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

US files là **zero frontmatter**. Idempotency/mapping/sync-state canonical sống ở **`.claude/state/atlassian/sync-state.yaml`** (`mappings.jira.remote_id` + hashes + state) — xem `atlassian-sync.md`. `docs/_shared/jira-map.md` đã **bỏ** (migrate + xóa).

- **Issue key (bản chiếu để đọc)** — cột `Jira` trong bảng Stories của `docs/{feature}/userstories/{feature}-story-index.md` (vd `PROJ-123`, `—` nếu chưa push). Đây là **bản chiếu** đồng bộ TỪ sync-state cho người đọc/Obsidian, KHÔNG phải nguồn thật.
- **url + pushed_at + hashes + state** — ở `sync-state.yaml` (nguồn duy nhất).

Idempotency THẬT không chỉ dựa key: key đã tồn tại → **update qua remote preflight** (Mục 5 `atlassian-sync.md`), KHÔNG ghi đè mù. `--force-create` là thao tác ngoại lệ có lý do + confirm riêng, KHÔNG phải đường tắt thường ngày.

## Mapping file‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mapping GỘP ở `.claude/state/atlassian/sync-state.yaml` (Jira + Confluence chung, xem `atlassian-sync.md` Mục 3). KHÔNG còn `docs/_shared/jira-map.md` / `confluence-map.md` rời.

## HARD GATE refuse on stale

`/jira --push` REFUSE nếu bất kỳ target US `status: stale`. No override flag. Dry-run vẫn cho phép với stale (read-only OK).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
