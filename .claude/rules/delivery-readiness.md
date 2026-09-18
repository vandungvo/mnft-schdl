---
paths:
  - ".claude/skills/usecase/**"
  - ".claude/skills/userstory/**"
  - ".claude/skills/ac/**"
  - ".claude/skills/jira/**"
  - ".claude/skills/export/**"
  - "docs/**/userstories/**"
---

# Delivery Readiness Rules‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Rules để convert BA specs sang delivery artifacts: use cases (downstream mode), user stories, AC, Jira issues, exports.
>
> **Ngoại lệ `/usecase` discovery mode:** use case là kỹ thuật elicitation, có thể chạy **TRƯỚC SRS** (khám phá nghiệp vụ → dựng FR). Khi đó nó KHÔNG thuộc delivery chain (không có FR để trích) và KHÔNG áp readiness gate dưới đây — xem `feature-bootstrap.md` ghi chú 2-mode. Chỉ **downstream mode** (`srs/{feature}-spec.md` đã có) của `/usecase` mới là delivery artifact. `/userstory` + `/ac` vẫn luôn cần SRS.

## Required upstream artifacts (per-feature paths)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Artifact | Required? | Why |
|----------|-----------|-----|
| `docs/{feature}/srs/{feature}-spec.md` | required | Source FR/NFR/Error Matrix |
| `docs/{feature}/srs/{feature}-flows.md` | required for use cases (downstream mode) | Source main/alternate flows. Discovery mode: không cần (use case tự mô tả flow từ elicitation). |
| `docs/{feature}/ascii-wireframe/*.md` | required for UI AC | Fields/states/logic |
| `docs/{feature}/{feature}-prd.md` | optional (soft gate) | Scope/priority context khi SRS chưa approved |
| `docs/_shared/traceability.md` | recommended | Detect gaps trước push backlog |

## Readiness gates (soft default trừ `/jira` push)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Feature delivery-ready khi:

* SRS `status: approved` → đầy đủ delivery-ready.
* SRS `status: in-review` → **soft gate** warn + proceed mặc định.
* SRS `status: draft` → **soft gate** warn + proceed; flag stories với note "built from draft SRS".
* **SRS/feature hoàn toàn KHÔNG tồn tại** (folder chưa có, hoặc chưa có `srs/{feature}-spec.md`) → **`/userstory` + `/ac` REFUSE + route `/srs {feature}`** (per `feature-bootstrap.md` nhóm B). KHÔNG tự tạo feature rồi sinh US/AC từ con số không — không có FR thật thì sẽ bịa. **Ngoại lệ `/usecase`:** chạy discovery mode (nhóm A) — viết use case elicitation trước, KHÔNG refuse (xem ghi chú đầu file). Đây là điểm KHÁC với 3 case trên (những case đó SRS đã tồn tại, chỉ khác status).

Other:
* No unresolved BLOCKING gaps trong `docs/_shared/traceability.md` cho **`/jira` push** (hard gate). Còn `/usecase /userstory /ac` vẫn proceed với warn.
* FR có stable IDs `FR-{feature}-NNN`.
* Error matrix có stable IDs `E-{feature}-NNN` cho error-path ACs.
* Screens referenced trong flows tồn tại as screen specs hoặc explicit placeholders.

## User story quality bar (index pattern)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Metadata + status + priority + jira key sống ở `docs/{feature}/userstories/{feature}-story-index.md` (master, frontmatter chuẩn). File `us-{NNN}.md` là content **zero frontmatter**. Mỗi user story phải có:

**Trong `{feature}-story-index.md` bảng Stories:**
* Stable ID `US-{NNN}` (folder scope đã chứa feature, không cần feature prefix in ID).
* 1 row đầy đủ: persona, Covers FR (≥1 FR-{feature}-NNN), screens, priority, status, jira key (`—` nếu chưa push).
* Priority match hoặc lower than linked FR priority.

**Trong `us-{NNN}.md` content:**‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
* One persona/actor, one user goal, one business value statement (Mục User Story).
* Mục Linked Requirements có ≥1 FR reference (table) hoặc inline body.
* `## Acceptance Criteria` section (placeholder `<!-- TODO: run /ac -->` OK initially).

## AC quality bar‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mỗi acceptance criterion phải:

* Testable as pass/fail.
* Split theo behavior CÓ ĐIỀU KIỆN, KHÔNG mù: tách khi outcome khác giao dịch/điều kiện; GIỮ 1 AC khi cùng một kết quả nghiệp vụ. (Không ép "1 behavior/AC" cứng — xem doctrine `/ac`.)
* Written `Given / When / Then` unless table format clearer.
* Linked tới FR ID + (when applicable) screen/error code.
* Negative/error path phủ theo RỦI RO, KHÔNG theo quota "≥1 negative mỗi category".
* Stable ID `AC-{NNN}` per-story scope (file).
* Cross-doc reference syntax: `docs/{feature}/userstories/us-{NNN}.md#AC-{NNN}`.

## Jira push safety (HARD GATE on stale)

`/jira` must NEVER push by default. Must:

1) Build preview table trước.
2) Ask user confirm project key, issue types, labels, parent/child mapping.
3) Push only sau explicit user approval.
4) **HARD GATE**: refuse push nếu bất kỳ target story có `status: stale`. List stale items, suggest `/cr`. **NO override flag.**
5) Save mapping file sau successful push.

## Export safety

`/export` may generate local files without confirmation, but must ask trước upload to third-party services or send externally. Phase 5 export local-file only.

## Status transitions trigger automation (Phase 6+)

| Transition | Hook |
|------------|------|
| `* → in-review` | `status-transition.sh` suggest chờ reviewer duyệt |
| `* → approved` | suggest `/gap {feature}` |
| `* → shipped` | suggest `/gap {feature}` (re-check sau khi ship) |
| `* → stale` | suggest `/cr "<change>" --feature <slug>` |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
