# Naming Conventions‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Slugs (folder & file names)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- All lowercase, kebab-case
- ASCII only (avoid Vietnamese diacritics — use English/transliteration)
- No spaces, no underscores, no special chars
- Strip leading/trailing dashes
- Max 50 chars

| Input | Slug |
|-------|------|
| "User Login" | `user-login` |
| "Forgot Password (v2)" | `forgot-password-v2` |
| "Thanh toán đơn hàng" | `payment-checkout` (preferred) |
| "2FA / OTP" | `two-factor-auth` |

## File path patterns‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **Nguyên tắc prefix (2026-07-12):** MỌI file per-feature có **tên cố định** (không phải slug nghiệp vụ) mang prefix `{feature}-` — lý do: tên trần (`spec.md`, `flows.md`, `preview.html`...) trùng basename giữa các feature (đo thật: `preview.html` ×8, `spec.md` ×4), không phân biệt được khi search/mở tab Obsidian/IDE. Đây là mở rộng của quyết định đã làm cho index files (`_index.md` ×18 → `{feature}-{domain}-index.md`). File có **slug nghiệp vụ tự khác nhau** (uc-{slug}.md, us-{NNN}.md, {flow-slug}.md, checklist-{slug}.md, brainstorms/{idea}.md, {process}.bpmn) KHÔNG prefix — slug đã đủ phân biệt, thêm prefix chỉ làm dài tên.

| Doc type | Path |
|----------|------|
| Product PRD (project-level) | `docs/_product/prd.md` (singleton, KHÔNG prefix feature — dưới `_product/` như `_shared/`). Output của `/prd`. |
| Roadmap (project-level) | `docs/_product/roadmap.md` (singleton). Output của `/roadmap`. |
| URD | `docs/{feature}/{feature}-urd.md` |
| BRD | `docs/{feature}/{feature}-brd.md` |
| PRD | `docs/{feature}/{feature}-prd.md` |
| SRS spec | `docs/{feature}/srs/{feature}-spec.md` |
| SRS flows (sequence + activity, 1 file gộp) | `docs/{feature}/srs/{feature}-flows.md` — mỗi flow 1 `## Flow: {title}` section với mermaid sequence/flowchart inline. Output cố định của `/sequence` và `/activity`. |
| SRS states (state diagrams, 1 file gộp) | `docs/{feature}/srs/{feature}-states.md` — mỗi entity 1 `## State: {Entity}` section với mermaid `stateDiagram-v2`. Output cố định của `/state`. |
| SRS ERD | `docs/{feature}/srs/{feature}-erd.md` |
| DBML schema (source) | `docs/{feature}/dbdiagram/{feature}.dbml` — DBML native (không frontmatter). Import dbdiagram.io/dbdocs.io. Output của `/dbdiagram`. |
| DBML SQL export | `docs/{feature}/dbdiagram/{feature}.sql` — SQL sinh qua `dbml2sql` (PostgreSQL). |
| DBML index (master metadata) | `docs/{feature}/dbdiagram/{feature}-dbdiagram-index.md` — type `dbdiagram-index`, bảng table. |
| Activity swimlane (PlantUML) | `docs/{feature}/srs/{feature}-{slug}-swimlane.puml` (source, git được) + `.svg` (render sẵn); ảnh nhúng section trong `srs/{feature}-flows.md`. File có slug nghiệp vụ tự phân biệt → KHÔNG cần index riêng. Output của `/activity-swimlane`. |
| D2 activity (đẹp standalone) | `docs/{feature}/d2/{slug}.d2` + `.svg` + index `docs/{feature}/d2/{feature}-d2-index.md` (type `d2-index`). Output của `/d2-activity`. |
| D2 ERD | `docs/{feature}/d2-erd/{feature}.d2` + `.svg` + index `{feature}-d2-erd-index.md` (type `d2-erd-index`). Output của `/d2-erd`. |
| D2 architect (kiến trúc) | `docs/{feature}/d2-architect/{slug}.d2` + `.svg` + index `{feature-or-shared}-d2-architect-index.md` (type `d2-architect-index`); cross-feature → `docs/_shared/d2-architect/`. Output của `/d2-architect`. |
| Research / discovery (project-level) | `docs/_research/{YYYY-MM-DD}-{keyword-slug}.md` (folder project-level như `_shared`/`_product`/`_reverse`; slug kebab-case ASCII ≤40). Output của `/discover`. |
| Market scan (project-level) | `docs/_research/{YYYY-MM-DD}-market-{slug}.md` — cùng folder `_research/` với `/discover` nhưng **có prefix `market-`** để phân biệt tầng: quét cơ hội cấp SẢN PHẨM (nên build gì) vs điều tra 1 tính năng. Slug kebab-case ASCII ≤40. Output của `/market`. |
| SRS user flow (nguồn chia flow DUY NHẤT) | `docs/{feature}/srs/{feature}-userflow.md` — mermaid `flowchart`/mindmap phủ happy/error/edge case, đánh số `[n]` mỗi màn. Chia sẵn feature thành các **flow** (flow-slug + danh sách screens/use-case mỗi flow) — `ascii-wireframe/` và `html-wireframe/` đều đọc file này để biết flow nào gồm những màn nào. Output cố định của `/user-flow`, chạy TRƯỚC wireframe (ASCII hoặc HTML). |
| Screen index (master metadata) | `docs/{feature}/ascii-wireframe/{feature}-wireframe-index.md` — frontmatter chuẩn + table Screens (status/thuộc flow/used-by/designs Figma+HTML/updated) + section `## Descriptions` (H3 per screen, 1-2 câu purpose). **Single source of metadata + descriptions** cho mọi screens của feature. Tên file có prefix `{feature}` để phân biệt khi search/mở nhiều tab (Obsidian quick-switcher không còn ra 1 danh sách toàn `_index.md` trùng tên). |
| Screen content (minimal, gộp theo flow) | `docs/{feature}/ascii-wireframe/{flow-slug}.md` — **zero frontmatter**, 1 file/flow chứa N screens (mỗi screen 1 block `## Screen: {screen-slug} — {tên}` với 2 sub-section: Wireframe ASCII / Screen description table **5 cột** `# / Items / Control type / Data type / Description`, format `• `+`<br>`). KHÔNG emoji trong khung ASCII (lệch viền). Chia flow theo `srs/{feature}-userflow.md`. Output của `/wireframe-ascii`. |
| HTML mockup | `docs/{feature}/html-design/{screen-slug}.html` (folder riêng) — path lưu trong `{feature}-wireframe-index.md` cột `HTML`. |
| Figma frame URL | URL lưu trong `{feature}-wireframe-index.md` cột `Figma` (output của `/figma`). KHÔNG file local. |
| HTML prototype | `docs/{feature}/html-design/{feature}-prototype.html` (output của `/prototype-html`, multi-screen clickable, self-contained). Reference trong `{feature}-wireframe-index.md` cột `HTML prototype` dạng `{feature}-prototype.html#{slug}`. |
| Next.js prototype (code chạy được) | `prototype/` — **KHÔNG nằm dưới `docs/`**. App Next.js dùng chung cho MỌI feature (cộng dồn, không per-feature). Code demo per-feature ở `prototype/src/app/(auth|app)/...` + `src/lib/demo/` (types/seed/store/rules/errors/simulate) + `src/components/demo/` (hydration-gate/auth-guard/demo-toolbar). Output của `/prototype-next`. Skill này **chỉ ghi trong `prototype/`**, không sinh file nào trong `docs/`. |
| HTML wireframe — index điều hướng | `docs/{feature}/html-wireframe/{feature}-wireframe.html` — **cửa vào** (double-click mở browser): sidebar TOC (flow → screen) + tab Tổng quan là flow map click được + iframe load từng flow. Self-contained, B&W. Output của `/wireframe-html` Phase G.5. Dùng để điều hướng feature nhiều flow. |
| HTML wireframe index (metadata) | `docs/{feature}/html-wireframe/{feature}-wireframe-html-index.md` (master metadata: type `wireframe-html-index`, bảng Flows — cho git/Obsidian, KHÔNG phải cửa vào chính). Output của `/wireframe-html`. |
| HTML wireframe per flow | `docs/{feature}/html-wireframe/{flow-slug}.html` (B&W static, frame rộng đúng device — mobile 375/tablet 768/desktop 1024, screens tự wrap, không JS/màu). Mỗi screen có `id="s{n}"` để index deep-link. 1 file = 1 luồng, chia theo `srs/{feature}-userflow.md`. Renderer ngang hàng với `/wireframe-ascii`. |
| BPMN index (master metadata) | `docs/{feature}/bpmn/{feature}-bpmn-index.md` — type `bpmn-index`, frontmatter chuẩn + bảng process (file/lanes/gateways/viewer). Output của `/bpmn`. |
| BPMN process (XML đầy đủ) | `docs/{feature}/bpmn/{process-slug}.bpmn` — XML BPMN 2.0 chuẩn OMG **gồm cả `<bpmndi:BPMNDiagram>`** (toạ độ + waypoint do **engine chung** sinh từ IR, KHÔNG do AI). Import Camunda/Bizagi/draw.io. |
| BPMN editor | `docs/{feature}/bpmn/{feature}-bpmn-editor.html` (bpmn-js **modeler** — kéo-thả sửa như bpmn.io + nút Tải/Lưu; đa-process dropdown). Regen bằng engine chung. Theo pattern `{feature}-{domain}-...` tránh trùng tab Obsidian. |
| BPMN engine (dùng chung, KHÔNG per-feature) | `.claude/skills/bpmn/engine/` — `bpmn-build.mjs` + `bpmn-layout-{auto,elk}.mjs` + `bpmn-layout.mjs` + `bpmn-semcheck.mjs` + `_viewer_template.html` + `node_modules` (cài 1 lần). Chạy: `node .claude/skills/bpmn/engine/bpmn-build.mjs --dir docs/{feature}/bpmn`. |
| API assessment (đánh giá đối tác) | `docs/{feature}/integration/api-assess.md` — type `api-assess`, scorecard build-vs-buy/chọn provider. Output của `/api-assess` (bước [0] có điều kiện). Bare name trong `integration/` (nhất quán họ api-summary/api-map). |
| API summary (hiểu contract 3rd) | `docs/{feature}/integration/api-summary.md` (hoặc `api-summary-{provider}.md` khi nhiều đối tác) — type `api-summary`. Output của `/api-doc`. |
| API design (Integration Blueprint) | `docs/{feature}/integration/api-design.md` — type `api-design`, orchestration/state-map/source-of-truth/webhook/retry/reconciliation/degraded-UX. Output của `/api-design` (bước [2]). `/api-map` là 1 phần dưới nó. |
| API map (field 3 tầng) | `docs/{feature}/integration/api-map.md` — type `api-map`. Output của `/api-map`, hội tụ dưới `api-design` trước `/api-checklist`. |
| API checklist (test outline) | `docs/{feature}/test/api/api-checklist.md` — type `api-checklist`, cột `test_layer`(own/3rd/mixed) + `direction`(out/in). Output của `/api-checklist`. |
| API tests (Bruno) | `docs/{feature}/test/api/api-tests.md` + `bruno/` — type `api-tests`. Output của `/api-test`. Legacy 3rd còn ở `integration/` sẽ migrate sang `test/api/` khi chạy lại. |
| API readiness (go-live gate) | `docs/{feature}/integration/api-readiness.md` — type `api-readiness`, checklist cutover/flag/monitoring/rollback/SLA-deprecation + bảng go/no-go. Output của `/api-readiness` (bước [5]). |

> **Họ integration (7 skill):** `/api-assess → /api-doc → /api-design → /api-map → /api-checklist → /api-test → /api-readiness`. Rule chung: `.claude/rules/api-integration.md`. File tên-cố-định trong `integration/` + `test/api/` dùng **bare name** (không prefix `{feature}-`) — nhất quán với họ đã có (api-summary/api-map/api-tests), và folder `integration/`+`test/api/` đã phân biệt đủ qua path feature.

| Brainstorm | `docs/{feature}/brainstorms/{idea-slug}.md` |
| Reverse-doc (tái lập BỘ SRS đầy đủ đa-tầng từ nguồn) | `docs/_reverse/{feature}/` — **bộ SRS đa-tầng**: `{feature}-reverse-spec.md` (SRS 12 Mục chi tiết + cột Nguồn/Nhãn + Mục 0) + `reverse-sources.md` (danh mục nguồn) + `reverse-gaps.md` (OQ/Gap/Conflict) + `srs/{feature}-reverse-{flows,states,erd}.md` (mermaid) + `usecases/{feature}-reverse-usecase-index.md` + `usecases/uc-{slug}.md`. Ghi **tách** doc chính thức trong `docs/_reverse/` (folder project-level như `_shared`/`_product`), KHÔNG đè `docs/{feature}/`. Output của `/reverse-doc`. Manifest: `docs/_reverse/reverse-plan.json`; convert tạm: `docs/_reverse/.convert/`. |
| Code-to-SRS (tái lập BỘ SRS đầy đủ đa-tầng từ SOURCE CODE) | `docs/_reverse/{feature}/` — **DÙNG CHUNG path + template + type với `/reverse-doc`** (cùng bộ file reverse-spec/sources/gaps/flows/states/erd/usecases). Khác DUY NHẤT ở nguồn: đọc **source code** thay vì tài liệu. `reverse-sources.md` cột nguồn là **source path + `file:line`** (thay file docx). Nhãn bất đối xứng: fact code = ✅ + `file:line`; ý định nghiệp vụ = 🟡 + OQ. Nguồn code đặc thù: **test** (boundary/edge, active ✅/skip 🟡), **i18n catalog** (wording lỗi thật), **dead-code/flag** (🟡 + negative-search). **KHÔNG sinh** api-reference.md/data-models.md kỹ thuật (endpoint/entity chỉ làm provenance; entity vào ERD nghiệp vụ). Output của `/code-to-srs`. Manifest chung `docs/_reverse/reverse-plan.json`. |
| Code-to-SRS evidence (truy vết code→luồng) | `docs/_reverse/{feature}/_evidence.md` — **zero-frontmatter**, template `_templates/reverse-evidence.md`. §Endpoints/Validation/Errors/Business Rules/Entities/**Cross-repo hops**/Gaps, mỗi dòng cite `full-repo-path:line`. §Cross-repo hops = "một điểm nghiệp vụ sinh từ code này liên quan luồng/repo nào". Scratch provenance kỹ thuật — spec vẫn business language. CHỈ output của `/code-to-srs` (reverse-doc KHÔNG sinh). |
| Reverse preview (HTML viewer bộ reverse) | `docs/_reverse/{feature}/{feature}-reverse-preview.html` — self-contained HTML viewer cho bộ SRS tái lập (giữ cột Nhãn ✅/🔵/🟡 + banner confidence + Gaps/OQ + nhúng `_evidence.md` nếu có). Dùng chung cho `/code-to-srs` + `/reverse-doc`. Engine `_scripts/build-reverse-preview.py` (tái dùng `_viewer_wrapper.py`). Output của `/reverse-preview`. Khác `docs/{feature}/{feature}-preview.html` của `/preview` (feature chính, strip nhãn). |
| User story index (master metadata) | `docs/{feature}/userstories/{feature}-story-index.md` — frontmatter chuẩn + table Stories (ID/title/persona/FR/screens/priority/status/jira-key/updated). **Single source of metadata + status + jira key** cho mọi stories của feature. |
| User story content (minimal) | `docs/{feature}/userstories/us-{NNN}.md` — **zero frontmatter**, chỉ prose sections (User Story / Context / Linked Requirements / Acceptance Criteria inline / UI refs / Error refs / Dependencies / OQs). Metadata + status + jira **sống ở `{feature}-story-index.md`**. |
| Use case (fully-dressed Cockburn) | `docs/{feature}/usecases/uc-{slug}.md` — zero frontmatter: Scope · Level · Primary Actor · (Stakeholders optional) · Trigger · Preconditions · Minimal+Success Guarantee · Main Success Scenario (numbered) · Extensions (`{step}{letter}`) · Related Requirements (links FR/BR). Ma trận liên hệ UC↔FR↔Screen↔Error↔OQ ở bảng `## Use cases` của `{feature}-usecase-index.md` (không còn file traceability riêng); OQ canonical ở `srs/{feature}-spec.md`. Diagram KHÔNG embed UC — thuộc `srs/{feature}-flows.md` / `srs/{feature}-states.md`. |
| Use case index (master metadata) | `docs/{feature}/usecases/{feature}-usecase-index.md` — frontmatter chuẩn + table Use cases (slug/status/actor/FR/screens/priority/updated). |
| Use case traceability (ma trận liên hệ) | **KHÔNG còn file riêng** (bỏ 2026-07-13) — ma trận UC↔FR↔Screen↔Error↔OQ là bảng `## Use cases` trong `{feature}-usecase-index.md`. Đọc-nhanh per-feature; khác `/gap` (cross-doc `docs/_shared/traceability.md`). |
| Use Case diagram (visual scope) | `docs/{feature}/usecases/{feature}-usecase-diagram.puml` (source PlantUML native) + `{feature}-usecase-diagram.svg` (render qua `plantuml.com`). **KHÔNG còn file `.md` wrapper** (bỏ 2026-07-13) — ảnh `<img>` + bảng Actors/Relationships nhúng thẳng vào `{feature}-usecase-index.md` (section `## Diagram/Actors/Relationships`). Output của `/usecase-diagram`. |
| Test strategy | `docs/{feature}/test/test-strategy.md` — chiến lược test (durable: môi trường/data/device/ngôn ngữ; per-run: mục đích/baseline/profile). Dùng CHUNG `/test-checklist` + `/test-cases` (intake no-re-ask). Bare name trong `test/` (nhất quán). |
| Test checklist index | `docs/{feature}/test/checklist/{feature}-checklist-index.md` — master metadata + `## Coverage` (per-obligation, nguồn edge VERIFIES) + `## Retired CHK-IDs` + frontmatter `next_chk_id`. Output của `/test-checklist`. |
| Test cases index | `docs/{feature}/test/testcases/{feature}-testcase-index.md` — master metadata cho toàn bộ test case. Output của `/test-cases`. |
| E2E Playwright | `docs/{feature}/test/e2e/{feature}-e2e-index.md` (master) + `specs/{scope}.spec.ts` (auto-gen, KHÔNG sửa tay) + `playwright.config.ts` + `.env.example`. Codegen từ testcases qua engine `.claude/scripts/playwright-gen.mjs`. Output của `/playwright-gen`. |
| Traceability | `docs/_shared/traceability.md` (auto from /gap) |
| Doc-drift report (per-feature) | `docs/reports/doc-drift/{YYYY-MM-DD}-{feature}-code-drift.md` — type `doc-drift-report`, so code dev ↔ docs chính thức `docs/{feature}/` → Pass/Missing/Mismatch/Extra/Unverifiable + integration liên feature, cite `file:line`. Read-only report (KHÔNG sửa docs/code). Output của `/doc-drift`. Snapshot theo `{repo}@{ref}` — dưới `docs/reports/` (KG loại khỏi walk-scope, không thành evidence nghiệp vụ). |
| Doc-drift report (toàn hệ) | `docs/reports/doc-drift/{YYYY-MM-DD}-product-code-drift.md` — cùng type, output của `/doc-drift --all` (mọi feature + toàn mạng integration + sơ đồ phụ thuộc). |
| Atlassian sync-state (mapping GỘP Jira+Confluence) | `.claude/state/atlassian/sync-state.yaml` (config + mapping + watermark/hash, 1 entry/artifact, key `mappings.jira`/`mappings.confluence`) + `base/*.json` (snapshot 3-way) + `locks/`. **Thay hẳn** `docs/_shared/jira-map.md` + `confluence-map.md` cũ (đã migrate + xóa). Output của `/jira` + `/confluence`. Xem `.claude/rules/atlassian-sync.md`. |
| Meeting | `docs/meetings/YYYY-MM-DD-{type}-{slug}.md` (project-level). Decisions/blockers/action items sống dưới dạng table TRONG file này — KHÔNG có file riêng cho decision/blocker. |
| Inbox capture | `docs/inbox/YYYY-MM-DD-{slug}.md` (project-level) |
| Change Request | `docs/cr/CR-{YYYYMMDD}-{NNN}.md` (project-level) |
| Impact assessment | **Section trong CR record** (`docs/cr/CR-*.md` — Impact Matrix + Detailed Impact + Rollback Plan). KHÔNG còn file `docs/impacts/` riêng — 1 CR = 1 file self-contained. |
| Export package | `docs/exports/{date}-{scope}{-feature}-package.{md|html|pdf|docx}` |
| User guide — file mở (cửa vào DUY NHẤT lộ ra ngoài) | `docs/userguide/userguide.html` (toàn sản phẩm) hoặc `docs/userguide/{feature}-userguide.html` (lọc 1 feature) — self-contained, no CDN, **một chế độ sáng** (docs-style trắng/đen + xanh dương highlight, KHÔNG dark mode). Đây là file duy nhất user double-click; mọi thứ khác nằm trong folder bundle cùng tên. |
| User guide — bundle (mọi file phụ gom 1 folder) | `docs/userguide/userguide/` (toàn SP) hoặc `docs/userguide/{feature}-userguide/` (feature) chứa: `index.md` (master metadata) · `data.js` (nội dung nhúng cho file mở) · `pages/*.md` (các trang, **zero frontmatter**) · `images/*.png` (ảnh chụp). Giữ top-level `docs/userguide/` gọn — chỉ thấy các file `*.html`. |

> **Cấu trúc gọn (cửa-vào + bundle):** mỗi lần chạy `/userguide` sinh **1 file `.html` lộ ra** + **1 folder bundle cùng tên** ôm data/pages/images. User chỉ mở file `.html`. `docs/userguide/` là 1 folder project-level DUY NHẤT cho cả sản phẩm (như `_shared`/`_product`): chạy **toàn sản phẩm** → `userguide.html` + `userguide/`; chạy **lọc 1 feature** → `{feature}-userguide.html` + `{feature}-userguide/`. KHÔNG dùng tên trần `preview.html`/`index.md` ở top-level.

> **Quy ước đặt tên file index:** mọi file "master metadata" trong 1 folder domain (usecases, userstories, ascii-wireframe, html-wireframe, bpmn, test/checklist, test/testcases) dùng pattern `{feature}-{domain}-index.md` thay vì `_index.md` trơn. Từ 2026-07-12 nguyên tắc prefix áp dụng cho **mọi file tên-cố-định** (xem đầu bảng) — gồm cả `{feature}-usecase-diagram.*`, `{feature}-prototype.html`, `{feature}-preview.html`.
>
> **Ngoại lệ có chủ đích — họ API dùng BARE NAME**, không prefix: `integration/api-assess.md`, `api-summary.md`, `api-design.md`, `api-map.md`, `api-readiness.md` và `test/api/api-checklist.md`, `api-tests.md`. Lý do: folder `integration/` + `test/api/` đã nằm dưới `docs/{feature}/` nên path đã phân biệt đủ; thêm prefix chỉ làm dài tên. Xem bảng path ở trên + `.claude/rules/api-integration.md`.

## Wikilinks‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Format: `[[docs/payment/srs/payment-spec.md|Payment SRS]]`

- Use full path from project root (Obsidian + GitHub render correctly)
- Optional display text after `|`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- Don't use `[[Login Feature]]` (Obsidian-only style) — breaks on GitHub

## Frontmatter requirements‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Every doc-type file MUST have YAML frontmatter at the top:

```yaml
---
type: srs                   # see types below
feature: payment            # feature slug = folder name
status: draft               # see status-lifecycle.md
updated: 2026-05-09         # ISO date
links:                      # flat list full path (nguồn reverse-graph stale hook)
  - docs/payment/brainstorms/checkout-idea.md
---
```

Recommended optional fields:
- `priority`: P0 / P1 / P2
- `version`: semver (e.g. `0.1.0`)

**Các field ĐÃ BỎ (không thêm lại):** `lang`/`tags`/`stale_reason` (diet đợt 1, 2026-07-11); `created` (git biết), `owner` (người thực hiện ghi per-event trong `docs/_shared/changelog.md`), `changelog` (lịch sử sống ở `changelog.md` — xem `.claude/rules/changelog.md`) — diet đợt 2, 2026-07-12.

## Doc type values

| Type | Use for |
|------|---------|
| `srs` | `docs/{feature}/srs/{feature}-spec.md` (FULL frontmatter: status/links/...) |
| `srs-flows` | `docs/{feature}/srs/{feature}-flows.md` (sequence + activity diagrams, 1 file gộp). **Slim frontmatter**: chỉ `type`/`feature`/`updated`. Lifecycle inherit từ {feature}-spec.md. |
| `srs-states` | `docs/{feature}/srs/{feature}-states.md` (state diagrams, 1 file gộp per entity). **Slim frontmatter**: chỉ `type`/`feature`/`updated`. |
| `srs-erd` | `docs/{feature}/srs/{feature}-erd.md` (Mermaid `erDiagram`). **Slim frontmatter**: chỉ `type`/`feature`/`updated`. |
| `dbdiagram-index` | `docs/{feature}/dbdiagram/{feature}-dbdiagram-index.md` (master metadata + bảng table). File `.dbml` là DBML native (không frontmatter riêng), `.sql` là SQL export. Output của `/dbdiagram`. |
| `d2-index` | `docs/{feature}/d2/{feature}-d2-index.md` (master metadata + bảng process). File `.d2` là D2 native (không frontmatter), `.svg` render sẵn. Output của `/d2-activity`. |
| `d2-erd-index` | `docs/{feature}/d2-erd/{feature}-d2-erd-index.md` (master metadata + bảng entity). Lifecycle inherit `srs/{feature}-spec.md`. Output của `/d2-erd`. |
| `d2-architect-index` | `docs/{feature}/d2-architect/{feature-or-shared}-d2-architect-index.md` (master metadata + bảng khối). Cross-feature → `docs/_shared/d2-architect/`. Output của `/d2-architect`. |
| `research` | `docs/_research/{YYYY-MM-DD}-{keyword-slug}.md` (điều tra ý tưởng/đối thủ trước brainstorm — opportunity/JTBD/RICE-lite + verdict build/skip/adjust). Output của `/discover`. |
| `market-scan` | `docs/_research/{YYYY-MM-DD}-market-{slug}.md` (quét cơ hội thị trường trước PRD — tín hiệu nhu cầu có nguồn + danh sách cơ hội + người chơi + xếp thô 6 tiêu chí + khuyến nghị nên build gì + lát cắt v1 + giả định cần kiểm). Frontmatter `type`/`status`/`scope`/`updated`/`links` (có `scope` = lát cắt thị trường, KHÔNG có `feature` — project-level). Output của `/market`. |
| `srs-userflow` | `docs/{feature}/srs/{feature}-userflow.md` (mermaid flowchart/mindmap, nguồn chia flow chung). **Slim frontmatter**: `type`/`feature`/`updated` + state fields `stage`/`flow_approved_at`/`flow_hash`. Output của `/user-flow`. |
| `screen-index` | `docs/{feature}/ascii-wireframe/{feature}-wireframe-index.md` (master metadata + designs map cho toàn bộ screens) |
| `screen` | `docs/{feature}/ascii-wireframe/{flow-slug}.md` (minimal content file, **zero frontmatter**, gộp N screens/flow theo `srs/{feature}-userflow.md` — không có `type:` field trong file; type này chỉ dùng để classify khi cần grep) |
| `urd` / `brd` / `prd` | per-feature requirements docs (`docs/{feature}/{feature}-{urd,brd,prd}.md`) |
| `prd-product` | `docs/_product/prd.md` (project-level PRD singleton: pitch/problem/users/value/goals/themes/Feature Map/metrics/constraints/risks/OQ). Frontmatter tối giản `type`/`status`/`updated`/`links` (không `feature` — project-level). Output của `/prd`. |
| `roadmap` | `docs/_product/roadmap.md` (project-level singleton: Prioritization RICE-lite + Now/Next/Later hoặc theo quý + Dependency Map). Frontmatter `type`/`status`/`updated`/`format`/`links`. Output của `/roadmap`. |
| `brainstorm` | `docs/{feature}/brainstorms/*.md` |
| `reverse-srs` | `docs/_reverse/{feature}/{feature}-reverse-spec.md` (SRS tái lập từ nguồn — khung 12 Mục ĐẦY ĐỦ giống `srs` + Mục 0 provenance + cột Nguồn/Nhãn mỗi bảng). FULL frontmatter + `confidence_summary`. **status: draft cứng** (reverse KHÔNG bao giờ approved). Output của `/reverse-doc`. Kèm `reverse-sources.md` + `reverse-gaps.md` (zero-frontmatter) cùng folder. |
| `reverse-srs-flows` | `docs/_reverse/{feature}/srs/{feature}-reverse-flows.md` (Sequence + Activity mermaid mỗi flow + nhãn nguồn/flow). Slim frontmatter (type/feature/updated). Output của `/reverse-doc`. |
| `reverse-srs-states` | `docs/_reverse/{feature}/srs/{feature}-reverse-states.md` (State diagram mỗi entity multi-state + nhãn). Slim frontmatter. |
| `reverse-srs-erd` | `docs/_reverse/{feature}/srs/{feature}-reverse-erd.md` (Mermaid erDiagram + Entity Reference + Notes, type gọn nghiệp vụ + nhãn). Slim frontmatter. |
| `reverse-usecase-index` | `docs/_reverse/{feature}/usecases/{feature}-reverse-usecase-index.md` (master + ma trận UC↔FR↔Screen↔Error↔OQ). FULL frontmatter. UC files `uc-{slug}.md` cùng folder zero-frontmatter (fully-dressed a–h + nhãn nguồn). Output của `/reverse-doc`. |
| `reverse-plan` | `docs/_reverse/reverse-plan.json` (manifest máy-đọc-được của `/reverse-doc` — list feature + sources[] + status pending/done, resumable). JSON, không frontmatter. |
| `userstory-index` | `docs/{feature}/userstories/{feature}-story-index.md` (master metadata + status/priority/jira-key cho toàn bộ stories) |
| `user-story` | `docs/{feature}/userstories/us-{NNN}.md` (minimal content file, **zero frontmatter** — type này chỉ dùng để classify khi cần grep) |
| `use-case` | `docs/{feature}/usecases/uc-*.md` (minimal content file, **zero frontmatter**, 4 sections a–d) |
| `usecase-index` | `docs/{feature}/usecases/{feature}-usecase-index.md` (master metadata + bảng `## Use cases` = **ma trận truy vết** UC↔FR↔Screen↔Error↔OQ + section `## Actors/Diagram/Relationships` nhúng ảnh use-case diagram). Gộp cả vai trò traceability cũ. Output của `/usecase` + `/usecase-diagram`. |
| ~~`usecase-traceability`~~ | **Bỏ 2026-07-13** — ma trận UC↔FR↔Screen↔Error↔OQ gộp vào bảng `## Use cases` của `{feature}-usecase-index.md` (trùng 6/8 cột, gây drift). Không còn file `{feature}-traceability.md` riêng. |
| ~~`diagram-usecase`~~ | **Bỏ 2026-07-13** — không còn file `.md` wrapper riêng. Nguồn thật `{feature}-usecase-diagram.puml` + render `.svg`; ảnh + bảng nhúng trong `{feature}-usecase-index.md`. |

> **Lưu ý:** `diagram-sequence` / `diagram-activity` / `diagram-state` / `diagram-erd` type cũ bị bỏ — file container dùng `srs-flows` / `srs-states` / `srs-erd` type. Mỗi diagram là 1 section trong file gộp, KHÔNG có frontmatter riêng.
| `wireframe-html-index` | `docs/{feature}/html-wireframe/{feature}-wireframe-html-index.md` (master metadata + flows table) |
| `bpmn-index` | `docs/{feature}/bpmn/{feature}-bpmn-index.md` (master metadata + process table). File `.bpmn` là XML chuẩn OMG đầy đủ (semantic + BPMNDiagram swimlane), không có frontmatter riêng. |
| `test-strategy` | `docs/{feature}/test/test-strategy.md` (chiến lược test durable+per-run, dùng chung test-checklist/test-cases). Frontmatter `type/feature/status/updated/links`. |
| `test-checklist-index` | `docs/{feature}/test/checklist/{feature}-checklist-index.md` (master metadata + `## Coverage` per-obligation + `## Retired CHK-IDs` + frontmatter `next_chk_id`) |
| `test-cases-index` | `docs/{feature}/test/testcases/{feature}-testcase-index.md` (master metadata cho toàn bộ test case) |
| `e2e-index` | `docs/{feature}/test/e2e/{feature}-e2e-index.md` (master metadata specs Playwright + Skipped). `.spec.ts` auto-gen không frontmatter. Output của `/playwright-gen`. |
| `change-request` | `docs/cr/CR-*.md` |
| `impact-report` | *(deprecated as standalone)* — impact assessment giờ là section trong `docs/cr/CR-*.md`. Type value giữ để classify content cũ nếu còn file legacy. |
| `traceability` | `docs/_shared/traceability.md` |
| `doc-drift-report` | `docs/reports/doc-drift/{YYYY-MM-DD}-{feature-or-product}-code-drift.md` (report so code dev ↔ docs BA, read-only, Pass/Missing/Mismatch/Extra/Unverifiable + integration). Frontmatter `type/feature/baseline/code_ref/updated`. Output của `/doc-drift`. |
| ~~`jira-map`~~ / ~~`confluence-map`~~ | **Bỏ** — mapping GỘP vào `.claude/state/atlassian/sync-state.yaml` (YAML, không frontmatter). Không còn 2 file `.md` rời ở `docs/_shared/`. |
| `export-package` | `docs/exports/*.md` |
| `userguide-index` | `docs/userguide/{userguide|{feature}-userguide}/index.md` (master metadata cẩm nang + bảng Sections). Frontmatter `type/scope/audience/lang/status/updated/links`. Output của `/userguide`. |
| `userguide-section` | `docs/userguide/{userguide|{feature}-userguide}/pages/{slug}.md` (trang cẩm nang, **zero frontmatter** — type này chỉ dùng để classify khi cần grep). |
| `api-assess` | `docs/{feature}/integration/api-assess.md` (scorecard đánh giá đối tác). Output của `/api-assess`. |
| `api-summary` | `docs/{feature}/integration/api-summary.md` (hiểu contract 3rd-party). Output của `/api-doc`. |
| `api-design` | `docs/{feature}/integration/api-design.md` (Integration Blueprint: orchestration/state/webhook). Output của `/api-design`. |
| `api-map` | `docs/{feature}/integration/api-map.md` (field mapping 3 tầng). Output của `/api-map`. |
| `api-checklist` | `docs/{feature}/test/api/api-checklist.md` (test outline + test_layer + direction). Output của `/api-checklist`. |
| `api-tests` | `docs/{feature}/test/api/api-tests.md` (bảng TC Bruno). Output của `/api-test`. |
| `api-readiness` | `docs/{feature}/integration/api-readiness.md` (go-live gate + go/no-go). Output của `/api-readiness`. |
| `meeting` | `docs/meetings/*.md` |
| `inbox` | `docs/inbox/*.md` |

## ID conventions (cross-doc references)

Mọi ID trong frontmatter `links:` hoặc body phải tuân format dưới. Format này đảm bảo `/gap` traceability matrix không collision khi cross-aggregate cross-feature.

### Format chung

| Loại | Format | Ví dụ | Scope |
|------|--------|-------|-------|
| Business Objective | `BO-{feature}-{NNN}` | `BO-payment-01` | Per-feature, trong `{feature}-brd.md` Mục Business Objectives & Success Measures |
| PRD Capability | `CAP-{feature}-{NNN}` | `CAP-payment-01` | Per-feature, trong `{feature}-prd.md` Mục Capabilities |
| Functional Requirement | `FR-{feature}-{NNN}` | `FR-payment-001` | Per-feature, trong `srs/{feature}-spec.md` Mục 2 |
| Non-Functional Requirement | `NFR-{feature}-{NNN}` | `NFR-payment-001` | Per-feature, trong `srs/{feature}-spec.md` Mục 3 |
| Business Rule | `BR-{feature}-{NNN}` | `BR-payment-001` | Per-feature, trong `srs/{feature}-spec.md` Mục 4 |
| Error Code | `E-{feature}-{NNN}` | `E-payment-001` | Per-feature, trong `srs/{feature}-spec.md` Mục 5 |
| User Story | `US-{NNN}` | `US-001` | Per-feature folder (`docs/payment/userstories/us-001.md`) — feature ngầm hiểu qua path |
| Use Case | `UC-{slug}` | `UC-checkout` | Per-feature folder, slug human-readable |
| Acceptance Criterion | `AC-{NNN}` | `AC-001` | Per-user-story (scope trong file `us-{NNN}.md`) |
| Change Request | `CR-{YYYYMMDD}-{NNN}` | `CR-20260512-001` | Project-wide (`docs/cr/`) |

### Rules

- **Feature prefix bắt buộc** cho BO/CAP/FR/NFR/BR/E. Mục đích: tránh collision khi `/gap` cross-feature aggregate (vd `FR-001` ambiguous khi 2 features).
- **US/AC/UC scope qua path** (không cần feature prefix trong ID) vì luôn nằm trong folder feature.
- **NNN = 3 digit zero-pad** cho BO/CAP/FR/NFR/BR/E (vd `001`, `042`). NN cũng OK cho BO/CAP (`01`, `02`) vì thường ít hơn.
- **CR/D/B prefix date** vì là sự kiện theo thời gian, ordering theo date.
- ID không reuse khi delete — luôn increment max + 1.
- Slug trong ID kebab-case, max 30 chars.

### Cross-references

Khi 1 doc reference ID của doc khác:
- Frontmatter `links:` flat list với full path: `links: [docs/payment/srs/payment-spec.md, docs/payment/userstories/us-001.md]`
- Body inline reference: `[[docs/payment/srs/payment-spec.md#FR-payment-001|FR-payment-001]]` (Obsidian-compatible anchor).
- `/gap` parse cả 2 dạng để build relationship graph.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
