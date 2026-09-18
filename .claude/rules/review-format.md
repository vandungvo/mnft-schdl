---
paths:
  - ".claude/agents/**"
  - ".claude/skills/urd/**"
  - ".claude/skills/brd/**"
  - ".claude/skills/prd-epic/**"
  - ".claude/skills/srs/**"
---

# Review Finding Format‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Structure cho tất cả agent review outputs. các phase review tự-động trong `/urd`/`/brd`/`/prd-epic`/`/srs` parse format này để aggregate findings across agents.

## Severity levels‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Severity | Meaning | Effect on doc status |
|----------|---------|----------------------|
| `BLOCKING` | Must fix trước approve. Doc không proceed được. | Status → `revisions` |
| `WARNING` | Should fix. Approval khả thi với explicit ack. | Status stays `in-review`, ack note |
| `SUGGESTION` | Nice-to-have. Approval not blocked. | Status unchanged |

## Verdict semantics‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Verdict | When |
|---------|------|
| `approve` | Zero BLOCKING + zero WARNING (hoặc tất cả WARNING explicitly acknowledged) |
| `revise` | ≥1 WARNING, no BLOCKING |
| `block` | ≥1 BLOCKING |

## Finding anatomy‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mỗi finding có:

- __Title__ — 5-10 word descriptor
- __Description__ — what's wrong, why matters (1-3 sentences)
- __Location__ — section reference nếu specific (`Mục 4 Pre-conditions`, `screens/login.md Mục 2.3`)
- __Suggested fix__ — concrete next action (1-2 sentences)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Aggregation rules (used by phase review trong /urd /brd /prd-epic /srs)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Khi multiple agents review cùng 1 doc:

1) __Deduplicate__ — same finding từ different agents counts once. Keep most detailed version.
2) __Severity escalation__ — 2+ agents flag same issue at WARNING → promote BLOCKING (consensus signals real problem).
3) __Severity ceiling__ — final verdict = highest severity from any agent.
4) __Conflict__ — Agent A approve, Agent B block → surface as conflict, user decides; không auto-resolve.

## Example output (1 agent)

```markdown
## Review by senior-ba

**Verdict:** revise

**Summary:** Spec solid overall nhưng thiếu rate-limiting consideration và 1 ambiguous actor responsibility.

### [BLOCKING]
- **Missing actor: rate limiter**: Mục 2 lists User, Backend, DB nhưng FR-payment-001 says "limit 10 attempts/hour" — ai enforce? Suggested fix: Thêm Rate Limiter là system actor trong Mục 2 hoặc clarify Mục 6 rằng Backend handles.

### [WARNING]
- **Ambiguous error E-payment-002**: Description nói "user gets error" nhưng không specify screen nào show. Suggested fix: Link error tới specific screen state trong Mục 5 Error Matrix.

### [SUGGESTION]
- **Open question stale**: OQ-2 added 2 tuần trước, chưa update. Suggested fix: ping owner hoặc escalate.
```

## Output location

Phase review aggregate findings rồi __tự fix__ (safe áp thẳng, business decision đánh 🔶 cho user review sau — theo memory `feedback_review_auto_run`). Sự kiện review ghi vào `docs/_shared/changelog.md` (KHÔNG ghi gì vào doc — set env note trước edit, hook lo):

```
2026-05-12 | /srs | @ba | docs/payment/srs/payment-spec.md | reviewed by @senior-ba, @qa-reviewer: 1 blocking applied, 2 warnings ack
```

## Tools agent CAN'T use directly

Agents read target doc + reference rules/templates. Agents KHÔNG:

- Edit files (orchestrator (phase review của skill sinh doc) làm — tự fix, không chờ user accept từng cái).
- Spawn other agents (tránh recursive loops).
- Run bash commands cho system state (rely on context).

Giữ agents fast + deterministic.

## Extensions (Phase 6 agents)

`@change-tracker` thêm 2 sections optional:

```markdown
### Impacted artifacts
| Path | Impact type | Severity | Recommended action |

### Non-impacted artifacts (extension)
- {path}: {why not impacted}

### Apply order (extension)
1. {first doc/action}
2. {second doc/action}
```

`/cr` analyze phase parses cả 3 sections (severity findings + impacted artifacts + apply order) để build impact report.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
