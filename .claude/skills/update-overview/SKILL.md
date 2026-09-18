---
name: update-overview
description: Dùng khi cần tạo/cập nhật tài liệu dùng chung cấp dự án trong `docs/_shared/` (definitions, conventions, system-overview, project-profile...). `/update-overview` hoặc `/update-overview <target>`.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "[definitions|env|conventions|system|patterns|profile] [--extract]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /update-overview — Project Shared Docs Manager‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Quản lý 6 file shared ở `docs/_shared/`:

| Target | File | Nội dung |
|--------|------|---------|
| `definitions` | `definitions.md` | Thuật ngữ nghiệp vụ dùng chung của dự án (danh từ domain lặp nhiều feature) |
| `env` | `operating-environment.md` | Platform, devices, browser, region, languages, compliance scope |
| `conventions` | `conventions.md` | Tone of voice, format, naming, currency/date/error message style |
| `system` | `system-overview.md` | High-level architecture, feature map, integrations, data flow |
| `patterns` | `screen-patterns.md` | Screen pattern dùng chung (header, empty state, loading, error toast, form layout) |
| `profile` | `project-profile.md` | Bối cảnh dự án tích lũy: domain, thuật ngữ gọi người dùng, đối thủ, thị trường, compliance — kho hỏi-1-lần-dùng-mọi-skill (per `@.claude/rules/project-profile.md`; đường chính là skill tự hỏi lazy, target này để xem/sửa chủ động) |

Auto-scaffold file mới với frontmatter v2; add/edit entries thủ công (nói bằng lời entry muốn thêm) hoặc auto-extract từ feature docs; set env note (hook ghi changelog.md) đúng convention.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Project-level scope** — file output KHÔNG có `feature:` frontmatter.
* **KHÔNG có upstream chain** → bỏ Phase E (resolve OQs).
* **Approval gate L1/L2 bắt buộc** — per `@.claude/rules/approval-gate.md`.
* **KG usage** — per `@.claude/rules/kg-usage.md` (graph chọn file, prose kết luận).
* **@author resolution (cho activity log)** — resolve @handle từ memory `user_identity.md` (per `@.claude/rules/ba-conventions.md`). KHÔNG set field owner vào frontmatter (đã diet 2026-07-12).
* **IT-BA framing** — KHÔNG hỏi tech detail (DB schema, SDK, endpoint); chỉ business language.
* **Section Architecture (target `system`) = quyết định thiết kế** — hỏi user mermaid inline HAY D2 `.svg` đứng riêng (Step 5.1), KHÔNG tự chọn. Nhánh D2 skill **tự viết source `.d2`** (không gọi `/d2-architect` — tránh vòng phụ thuộc vì skill đó đọc ngược `system-overview.md`).
* **No-re-ask** — scan file hiện tại trước khi hỏi; KHÔNG hỏi lại entry đã có. Section Architecture đã có mermaid/D2 + user không yêu cầu đổi → giữ nguyên engine cũ, không hỏi lại.
* **Activity log** — trước Write/Edit set đủ env `CLAUDE_SKILL_NAME=/update-overview` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE` (≤80 ký tự, mô tả `[{target}] {action}`); hook ghép cả dòng vào `docs/_shared/changelog.md` (per `@.claude/rules/changelog.md`).
* **Dedupe** — `extract` mode loại candidate đã có trong file hiện tại.
* **KG trong `--extract` chỉ chọn file, KHÔNG thay scan** — dùng `kg counts`/`kg facts <feature>` để thu hẹp danh sách file đáng scan trước; thuật ngữ, wording và candidate cuối cùng LUÔN rút từ prose đã Read theo Step 4. Nếu output có `⚠ còn N mục — chạy với --all` thì chạy lại query đó với `--all`; nếu có `Phải Read tay (ngoài graph)` thì Read các file đó. `KG-ERROR` hoặc exit ≠ 0 → bỏ shortlist KG và chạy nguyên flow prose-scan cũ trên toàn bộ nguồn trong bảng Step 4.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Vòng phụ thuộc D2 ↔ system-overview** — `/d2-architect` khai báo `system-overview.md` là **nguồn tốt nhất** để vẽ. Nếu `/update-overview` gọi `/d2-architect` để sinh sơ đồ cho chính `system-overview.md` → nguồn = sản phẩm, luẩn quẩn. Vì vậy nhánh D2 ở Step 5.1 **tự viết source `.d2`** từ feature map/integration đã build (Step 5 bước 1-2), KHÔNG ủy thác cho `/d2-architect`. Chiều đúng: BA chạy `/d2-architect` khi cần bản kiến trúc đẹp riêng, và nó đọc `system-overview.md` (dù section đó là mermaid hay D2) làm input.
* **Mermaid vs D2 — chọn theo nhu cầu đọc, không theo "đẹp"** — mermaid inline mạnh ở "mở-là-thấy" ngay trong file nguồn (hợp tham chiếu nhanh); D2 mạnh ở nested-container dàn gọn + bản `.svg` đứng riêng (hợp trưng bày). Section Architecture của `_shared` thường ưu tiên mermaid (mặc định) vì hay được liếc nhanh; D2 cho kiến trúc lồng sâu.

## Inputs

```
/update-overview                                # interactive: pick target + action
/update-overview definitions                    # default action: add (hỏi term)
/update-overview definitions --extract          # scan feature docs, đề xuất terms
/update-overview env                            # update operating-environment.md
/update-overview conventions                    # update conventions.md
/update-overview system                         # regen system-overview.md từ feature list
/update-overview patterns --extract             # extract pattern từ existing wireframes
```

Ví dụ thêm 1 term trực tiếp — nói bằng lời thay vì `--add "<entry>"`:
```
/update-overview definitions, thêm term "{Term}"
```

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Existing shared files: !`ls docs/_shared/ 2>/dev/null | grep -v -E '(traceability|jira-map|staleness)' | tr '\n' ' '`
Total features: !`ls -d docs/*/ 2>/dev/null | grep -v -E '(_shared|_research|meetings|decisions|blockers|inbox|changes|impacts|exports)' | wc -l | tr -d ' '`

## Approach

### Step 1 — Parse args + pick target

* No-arg → interactive picker: list 6 targets với status (file tồn tại / chưa), hỏi user chọn.
* Có target → validate (must be `definitions|env|conventions|system|patterns|profile`).
* Có `--extract` → mode auto-scan.
* User nói entry cụ thể ngay trong câu lệnh (vd "thêm term X") → mode straight add, dùng luôn nội dung đó thay vì hỏi lại.
* Default action mỗi target = `add` (interactive entry input nếu user chưa nói sẵn entry).

### Step 2 — Check file tồn tại + scaffold nếu cần

```
TARGET_FILE = "docs/_shared/{filename}"
```

Nếu file chưa tồn tại:

1. L1 plan preview: "Em sẽ scaffold file mới `{path}` với frontmatter v2 + skeleton section."
2. Write file với template:

```yaml
---
type: shared-{target-type}
status: draft
updated: {today}
---

# {Title}

{Short purpose statement — 1-2 câu giải thích file này chứa gì, ai dùng}

## {Main section per target — see Template per target}
```

Frontmatter `type:` values:
* `definitions` → `type: shared-definitions`
* `env` → `type: shared-environment`
* `conventions` → `type: shared-conventions`
* `system` → `type: shared-system-overview`
* `patterns` → `type: shared-screen-patterns`
* `profile` → `type: project-profile` (scaffold theo `_templates/project-profile.md`)

### Step 3 — Mode add (manual)

1. Read file hiện tại, parse existing entries (terms/items/patterns).
2. Hỏi user content theo template (xem Template per target dưới).
3. Validate dedup (term đã có → warn, hỏi replace/skip/append-as-variant).
4. L2 diff → user Y → Write.
5. set env note (hook ghi changelog.md).

### Step 4 — Mode extract (auto-scan)

1. **Chọn shortlist bằng KG trước, không extract term từ KG:**
   ```bash
   node .claude/skills/kg/engine/kg-query.mjs counts --all
   node .claude/skills/kg/engine/kg-query.mjs facts <feature> --all
   ```
   * Dùng `counts` để kiểm tra scope cấu trúc; chạy `facts <feature>` cho từng feature trong scope hiện có để lấy union của `Shortlist file cần Read` và `Phải Read tay (ngoài graph)`.
   * KG chỉ quyết định **file nào ưu tiên scan trước**; không dùng title/ID/facts để suy ra term, definition, convention hay pattern.
   * Nếu output có `⚠ còn N mục — chạy với --all` thì bắt buộc chạy lại với `--all`. Nếu có mục `Phải Read tay (ngoài graph)`, phải Read các file đó. Nếu `KG-ERROR` hoặc exit ≠ 0, fallback nguyên flow prose-scan cũ dưới đây trên toàn bộ source glob; không dùng kết quả KG một phần.

2. **Giữ nguyên prose-scan theo target** trên shortlist KG đã chọn; Read file và scan wording/context thật theo đúng source/pattern sau. Đây là bước tạo candidate, KG không thay thế bước này:

| Target | Scan source | Pattern |
|--------|-------------|---------|
| `definitions` | `docs/*/*-urd.md`, `docs/*/*-brd.md`, `docs/*/prd.md`, `docs/*/srs/*-spec.md` | Capitalized noun lặp ≥2 feature (danh từ domain của dự án); bold term trong định nghĩa context |
| `env` | `docs/*/*-brd.md`, `docs/*/prd.md` mục Constraints/Assumptions | Mention platform, region, compliance, language |
| `conventions` | Bất kỳ `.md`, đặc biệt `docs/*/ascii-wireframe/*.md` | Pattern: date format, currency display, error message phrasing |
| `system` | `docs/*/srs/*-spec.md` (Mục FR + integrations), `docs/*/prd.md` | Feature list + external integrations mention |
| `patterns` | `docs/*/ascii-wireframe/*.md` | Repeated layout block (header, footer, empty state, toast) |
| `profile` | `docs/_product/prd.md`, `docs/*/*-brd.md`, `docs/*/*-urd.md` | Mention domain/target user/đối thủ/compliance chưa có trong profile |

3. Build candidate table:
   ```
   Candidate              | Appears in            | Suggested entry preview
   {Term 1}               | {feature-a, feature-b}| "{định nghĩa rút từ prose...}"
   {Term 2}               | {feature-c}           | "{...}"
   ```
4. User pick subset (vd "1,3,5" hoặc "all"/"none").
5. For each picked candidate → show extracted context, ask confirm/edit definition.
6. L2 diff aggregate (1 diff cho tất cả picked entries).
7. set env note (hook ghi changelog.md): `[{target}] extracted N entries: {term list}`.

### Step 5 — Mode regen (cho `system` only)

`/update-overview system` (không nói entry cụ thể, không `--extract`) → regen mode:

1. Auto-build feature map từ folder scan + frontmatter parse.
2. Auto-build integration list từ grep "external integration" / "third-party" mention.
3. **Chọn cách vẽ section Architecture** (xem Step 5.1) — hỏi user mermaid inline hay D2 `.svg` đứng riêng.
4. Show preview → user confirm sections, edit prose.
5. L2 diff toàn file (regen overwrite).

### Step 5.1 — Section Architecture: mermaid inline HAY D2 đứng riêng

Section `## Architecture` là **sơ đồ kiến trúc nested-container** (Client/Backend/External lồng thành phần con). Có 2 cách vẽ, đánh đổi khác nhau — **hỏi user chọn**, KHÔNG tự quyết (per `approval-gate.md`: quyết định thiết kế không auto-pick):

Hỏi gọn (AskUserQuestion 2 lựa chọn, đặt mermaid lên đầu làm mặc định đề xuất):

> Section Architecture vẽ kiểu nào?
> - **Mermaid inline (đề xuất)** — nhúng thẳng ` ```mermaid `, mở file `.md` là thấy hình ngay trên GitHub/Obsidian. Nhẹ, không cần công cụ ngoài. Hợp làm nguồn tham chiếu nhanh.
> - **D2 `.svg` đứng riêng** — hình nested-container dàn đẹp hơn (đường vuông góc, không đè), nhúng ảnh `![...](system-overview.svg)` vào file. Cần D2 cài sẵn. Hợp khi kiến trúc nhiều khối lồng sâu / cần bản đẹp trưng bày.

**Nhánh A — mermaid inline (mặc định):**
* Sinh ` ```mermaid graph TB ` với `subgraph` cho từng khối lớn, tuân **mermaid syntax safety** (`diagram-selection.md`): nhãn Vietnamese trần không quote, KHÔNG `&`/`<`/`>` trong label, newline `<br/>`.
* Ghi thẳng vào `system-overview.md` section Architecture. Không tạo file phụ.

**Nhánh B — D2 `.svg` đứng riêng:**‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
* **KHÔNG gọi `/d2-architect`** để tránh vòng phụ thuộc (`/d2-architect` đọc chính `system-overview.md` làm nguồn — xem Pitfalls "vòng phụ thuộc"). Thay vào đó `/update-overview` **tự viết source `.d2`** (công thức nested-container: `direction: down`, actor `shape: person`, DB `shape: cylinder`, cụm ngoài `style.stroke-dash: 3`, QUOTE nhãn có ký tự `/ | ( ) :`) rồi render qua `.claude/skills/d2-activity/render.sh`.
* Đích: `docs/_shared/system-overview.d2` + `.svg` (cùng folder `_shared/`, KHÔNG per-feature).
* D2 chưa cài → báo user 1 dòng install, **fallback về nhánh A** (mermaid) để không chặn regen.
* Render fail → sửa (thường thiếu quote nhãn), tối đa 2 lần; vẫn fail → fallback mermaid + báo user.
* Section Architecture trong `.md` nhúng ảnh: `![Kiến trúc hệ thống](system-overview.svg)` + 1 dòng "Nguồn D2: `system-overview.d2` — sửa rồi chạy lại `/update-overview system`".

### Step 6 — Update activity log + status

Set env `CLAUDE_CHANGELOG_NOTE` trước Write (hook ghi changelog.md). Update `updated:` field. Nếu status đang `draft` + nội dung đã dày (≥3 lần cập nhật trong changelog.md) → suggest user transition `in-review`.

### Step 7 — Final report

```
✅ Updated docs/_shared/{file}
   Entries added: {N}
   Total entries now: {total}

Suggested next:
  - Reference từ feature docs: [[docs/_shared/{file}#{anchor}]]
  - /update-overview {other-target} nếu cần
```

## Output

Ghi vào `docs/_shared/` — **project-level, dùng chung mọi feature**. Mỗi lần chạy chỉ đụng **1 target** user chọn:

| Target | File |
|---|---|
| `definitions` | `docs/_shared/definitions.md` |
| `env` | `docs/_shared/operating-environment.md` |
| `conventions` | `docs/_shared/conventions.md` |
| `system` | `docs/_shared/system-overview.md` |
| `patterns` | `docs/_shared/screen-patterns.md` |
| `profile` | `docs/_shared/project-profile.md` |

Target `system` có thể kèm sơ đồ kiến trúc — **hỏi user chọn** (Step 5.1), KHÔNG tự quyết:
* **mermaid inline** → nhúng thẳng vào `system-overview.md`, không sinh file rời.
* **D2** → sinh thêm `docs/_shared/system-overview.d2` (source) + `.svg` (render), nhúng ảnh vào `system-overview.md` (cùng thư mục nên link ảnh tương đối).

Hook stale-propagation KHÔNG áp cho `docs/_shared/` (underscore filtered).

## Template per target

> **Khối dưới là KHUNG cấu trúc (heading + placeholder `{...}`), KHÔNG phải nội dung mẫu.** Điền
> bằng nội dung THẬT của dự án (hỏi user theo IT-BA framing / extract từ feature docs) — không có
> nội dung thật cho section nào thì BỎ section đó (per anti-pattern "write rot"), không điền đại.
> Muốn xem 1 bộ đã điền đầy đủ trông thế nào: `references/example-shared-docs-edtech.md` (ví dụ
> domain EdTech — chỉ tham khảo format, KHÔNG copy thuật ngữ sang dự án khác).

### definitions.md

```markdown
## Glossary

### {Term}
{Định nghĩa 1-2 câu bằng ngôn ngữ nghiệp vụ. Phân biệt với term dễ nhầm nếu có.}
**Appears in:** {feature-a, feature-b}
**Aliases:** {các cách gọi khác — ghi rõ cách nào tránh dùng để thống nhất wording}

## Actor Registry

> Tên actor CHUẨN HÓA dùng chung toàn vault + mọi alias (cùng 1 vai nhưng UC/lane/diagram gọi khác tên). Nguồn duy nhất để KG gộp actor node — tránh 1 actor bị đếm thành 3 vì 3 wording. `/usecase`, `/bpmn`, `/activity-swimlane` khi ghi actor nên dùng tên canonical cột đầu.

| Canonical | Loại | Aliases (tránh dùng) | Mô tả ngắn |
|---|---|---|---|
| {Actor 1} | primary | {alias 1, alias 2} | {vai trò 1 câu} |
| {Actor 2} | primary/secondary | {aliases} | {vai trò} |
| Backend | system | Hệ thống, Server, BE | Hệ thống xử lý nghiệp vụ phía sau |
```

### operating-environment.md

```markdown
## Target Platforms
- {Mobile: OS + version tối thiểu / Web: browsers / Desktop... — chỉ platform dự án thật sự nhắm}

## Target Users
- Primary: {nhóm người dùng chính + đặc điểm}
- Secondary: {nhóm phụ + phase nếu defer}

## Network Assumptions
- {online-first / offline-first + hành vi khi mất mạng}

## Regions & Languages
- Launch: {thị trường}
- UI languages: {ngôn ngữ default + phụ}

## Compliance Scope
- {luật/chuẩn áp dụng theo domain + thị trường — PDPA/GDPR/COPPA/PCI/HIPAA... — đồng bộ với project-profile.md}
```

### conventions.md

```markdown
## Naming
- User-facing terms: {quy tắc viết hoa/thường}
- Internal IDs: see [[.claude/rules/naming-conventions.md]]

## Tone of Voice
- {giọng điệu + cách xưng hô với người dùng, per ngôn ngữ}

## Date / Number / Currency
- Date display: {format per ngôn ngữ}
- Currency: {đơn vị + quy tắc thập phân}
- Large numbers: {separator}

## Error Messages
- Format: `{What happened}. {What user can do.}`
- Example: {1 ví dụ wording thật của dự án}
- KHÔNG: error code raw, technical jargon
```

### project-profile.md

Scaffold theo `_templates/project-profile.md` (Domain / Người dùng & thuật ngữ / Đối thủ / Ghi chú
khác — mỗi mục kèm ngày). Nội dung do user trả lời tích lũy — target này chủ yếu để xem/sửa/bổ sung
chủ động; đường chính là các skill tự hỏi lazy per `@.claude/rules/project-profile.md`.

### system-overview.md

> Section `## Architecture` vẽ theo engine user chọn ở Step 5.1 — **một trong hai**:
>
> **Nhánh A (mermaid inline):**
> ```markdown
> ## Architecture
>
> ```mermaid
> graph TB
>   subgraph Client
>     Web[Web App]
>     Mobile[Mobile App]
>   end
>   subgraph Backend
>     API[API Gateway]
>     Auth[Auth Service]
>     DB[(Database)]
>   end
>   subgraph External
>     Google[Google OAuth]
>     Email[Email Service]
>   end
>   Web --> API
>   API --> Auth
>   Auth --> DB
>   Auth --> Google
> ```
> ```
>
> **Nhánh B (D2 đứng riêng):**
> ```markdown
> ## Architecture
>
> ![Kiến trúc hệ thống](system-overview.svg)
>
> > Nguồn D2: `system-overview.d2` — sửa rồi chạy lại `/update-overview system`.
> ```

Các section còn lại (giống nhau ở cả 2 nhánh):

```markdown
## Actors
- {Actor 1} — {vai trò 1 câu}
- {Actor 2} — {vai trò + phase nếu defer}

## Subsystems
- {Subsystem 1 — cụm năng lực nghiệp vụ, KHÔNG phải tech component}
- {Subsystem 2}

## Feature Map
| Feature | Status | Subsystem |
|---------|--------|-----------|
| {feature-slug} | {status} | {subsystem} |

## External Integrations
- {Dịch vụ ngoài 1} — {mục đích nghiệp vụ}
- {Dịch vụ ngoài 2} — {mục đích + phase nếu defer}
```

### screen-patterns.md

```markdown
## Header Pattern
- {cấu trúc header chung: trái / giữa / phải}

## Empty State Pattern
- {cấu trúc empty state: hình / headline / subtext / CTA}

## Loading State Pattern
- {skeleton vs spinner dùng khi nào + timeout → error state}

## Error Toast Pattern
- {vị trí / auto-dismiss / màu theo mức}
```

## Anti-patterns

* ❌ Tạo file shared empty/TBD-only khi chưa có content thật → write rot.
* ❌ Copy nội dung từ `references/example-shared-docs-edtech.md` vào dự án thật — đó là ví dụ minh họa 1 domain, KHÔNG phải khuôn bắt buộc; nội dung phải từ user/feature docs của dự án.
* ❌ Hỏi user re-input term đã có trong file (no-re-ask vi phạm).
* ❌ Extract mode dump 50 candidates không filter → user paralysis.
* ❌ Set `feature:` frontmatter (file shared là project-level).
* ❌ Quên set env `CLAUDE_CHANGELOG_NOTE` trước Write/Edit (sự kiện vào changelog.md thành "manual edit").
* ❌ Hỏi tech detail (vd "dùng PostgreSQL hay MySQL?") — đó là `/srs` việc.
* ❌ **Tự chọn mermaid/D2 cho section Architecture** — là quyết định thiết kế, phải hỏi user (Step 5.1).
* ❌ **Gọi `/d2-architect` từ nhánh D2** — tạo vòng phụ thuộc (skill đó đọc ngược `system-overview.md` làm nguồn). Tự viết `.d2` + render.sh.
* ❌ Nhánh D2 mà D2 chưa cài → chặn regen. Phải fallback mermaid + báo user.

## References

* @.claude/rules/project-profile.md (target `profile` + cơ chế hỏi-khi-thiếu)
* @.claude/rules/approval-gate.md
* @.claude/rules/changelog.md
* @.claude/rules/ba-conventions.md
* @.claude/rules/naming-conventions.md
* @.claude/rules/status-lifecycle.md
* @.claude/rules/diagram-selection.md (mermaid syntax safety cho nhánh A; định vị architecture diagram)
* @.claude/skills/d2-activity/render.sh (render source `.d2` cho nhánh B)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
