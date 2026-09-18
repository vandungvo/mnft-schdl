---
type: userstory-index
feature: {{feature_slug}}
status: draft
updated: {{date}}
links:
  - docs/{{feature_slug}}/srs/{{feature}}-spec.md
  - docs/{{feature_slug}}/usecases/{{feature_slug}}-usecase-index.md
---

# {{feature_name}} — User Stories Index‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## User Stories‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | ID | Title | Persona | Covers FR | UC | Screens | Priority | Status | Jira | Updated |
|---|----|-------|---------|-----------|----|---------|----------|--------|------|---------|
| 1 | [US-001](us-001.md) | {{title}} | {{persona}} | FR-{{feature}}-001 | {{uc_slug}} | {{screen}} | P0 | draft | — | {{date}} |

__Status values:__ `draft` / `in-review` / `revisions` / `approved` / `shipped` / `stale`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

__UC column:__ use case slug mà story này bóc ra (vd `checkout` → `[[uc-checkout]]`). Nguồn edge US→UC (traceability). `—` nếu story không map UC nào.

__Jira column:__ issue key sau khi `/jira --push` (vd `AUTH-12`). `—` nếu chưa push. __Bản chiếu để người đọc__ — mapping canonical ở `.claude/state/atlassian/sync-state.yaml` (entry theo `vault_path`, gộp cả Jira+Confluence). KHÔNG còn `docs/_shared/jira-map.md`.

## Links upstream‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* [[docs/{{feature_slug}}/srs/{{feature}}-spec.md|SRS spec]]
* [[docs/{{feature_slug}}/usecases/{{feature_slug}}-usecase-index.md|Use cases index]]‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
