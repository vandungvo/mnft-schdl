# KG Engine — Schema Contract v1 (hợp đồng chung cho kg-build.mjs + kg-query.mjs)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> 2 module giao tiếp DUY NHẤT qua `docs/_shared/kg/graph.json` theo schema này. Zero-dependency (chỉ node built-ins: fs/path/process/child_process/url — KHÔNG npm). Node ≥18, ESM `.mjs`. kg-query bình thường CHỈ đọc graph.json; khi graph dirty/vắng nó tự spawn kg-build (lazy rebuild) rồi mới trả lời.

## graph.json schema‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```jsonc
{
  "meta": {
    "schema_version": 1,
    "extractor_version": "1.0.0",
    "generated_at": "<ISO datetime>",
    "root": "docs",
    "node_count": 0, "edge_count": 0,
    "coverage": {                       // BẮT BUỘC — kg-query dùng để khai báo độ phủ
      "docs_total": 0,
      "docs_parsed": 0,
      "unparsed_docs": [ {"path":"...","reason":"no-frontmatter-and-no-known-shape | parse-error: ..."} ],
      "unresolved_refs": [ {"ref":"FR-authentication-999","source":{"file":"...","line":12}} ],
      "uncataloged_content": [ {"path":"..."} ],  // content-file (uc-*/us-*/flow .md) không index nào catalog
      "partial_parse_docs": [ {"path":"...","reason":"bảng thiếu cột X; parser Y trích 0 item"} ],
      // ^ doc parse THIẾU MỘT PHẦN (bảng thiếu cột kỳ vọng / shape-parser trích 0 item) —
      //   kg-query BẮT BUỘC đưa các file này vào "Phải Read tay" (bổ sung review 2026-07-15)
      "notes": [ "chuỗi ghi chú độ phủ — kg-query in vào footer" ]
    }
  },
  "nodes": [
    {
      "key": "FR-authentication-001",   // xem quy tắc key dưới
      "type": "requirement",            // enum node types dưới
      "subtype": "FR",                  // FR|NFR|BR khi type=requirement; null nếu không áp
      "feature": "authentication",      // null cho project-level
      "title": "…",                     // ngắn, từ cột Title/heading
      "status": "draft",                // null nếu không có
      "updated": "2026-07-11",          // null nếu không có
      "source": {"file":"docs/authentication/srs/spec.md","line":40},
      "props": {}                       // tùy type (vd priority, screens, jira_key…) — phẳng, string/array
    }
  ],
  "edges": [
    {
      "from": "docs/authentication/userstories/us-003.md#AC-001",
      "to": "FR-authentication-001",
      "type": "VERIFIES",
      "provenance": "table",            // declared (frontmatter links:/cột chính chủ) | table (bảng index) | heuristic (regex bare-ID trong prose)
      "source": {"file":"...","line":25}
    }
  ]
}
```

**Deterministic:** nodes sort theo `key`, edges sort theo `(from,type,to)`, JSON 2-space indent. Chạy 2 lần trên cùng vault → file BYTE-IDENTICAL (trừ `generated_at` — cho phép flag `--no-timestamp` để diff/test).

## Quy tắc node key‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Loại | Key | Ví dụ |
|---|---|---|
| ID toàn cục duy nhất (FR/NFR/BR/E/BO/CAP/CR/CHK) | chính ID full-form | `FR-authentication-001`, `E-authentication-003`, `CHK-premium-payment-001`, `CR-20260612-001` |
| doc | path từ repo root | `docs/authentication/srs/spec.md` |
| use_case / user_story / research | path file | `docs/authentication/usecases/uc-login-email.md` |
| test_case file | path file | `docs/authentication/test/testcases/testcases-uc-login.md` |
| test_case block | `{testcases-file}#CHK-{feature}-NNN` | `docs/.../testcases-uc-login.md#CHK-authentication-001` |
| API test_case | `{api-tests-file}#TC-NN` | `docs/.../test/api/api-tests.md#TC-01` |
| api_checklist_item | `{api-checklist-file}#ACL-{n}` | `docs/.../test/api/api-checklist.md#ACL-1` |
| e2e_spec | path `.spec.ts` từ repo root | `docs/authentication/test/e2e/specs/uc-login.spec.ts` |
| acceptance_criterion | `{us-path}#AC-NNN` | `docs/.../us-003.md#AC-001` |
| open_question | `{doc-path}#OQ-N` (checkbox không mang ID trong section "Open Questions" → auto `#OQ-a{n}` theo thứ tự file) | `docs/.../userflow.md#OQ-1`, `docs/.../uc-login-email.md#OQ-a1` |
| decision | `{meeting-file}#D-{n}` | `docs/meetings/2026-07-16-kickoff.md#D-1` |
| raid_item | `{meeting-file}#RAID-{row-order}` | `docs/meetings/2026-07-16-kickoff.md#RAID-1` |
| action_item | `{meeting-file}#A-{row-order}` | `docs/meetings/2026-07-16-kickoff.md#A-1` |
| term | `term:{slugify(primary-term)}` | `term:spaced-repetition` |
| screen | `screen:{feature}/{slug}` | `screen:authentication/login` |
| render_artifact | `render:{feature}/{screen-slug}/{kind}`, với `kind ∈ figma \| prototype \| wireframe-html` | `render:authentication/login/prototype` |
| flow | `flow:{feature}/{slug}` | `flow:authentication/google-oauth` |
| entity | `entity:{feature}/{CanonicalName}` (CamelCase; alias UPPER_SNAKE map về cùng node) | `entity:authentication/Account` |
| state machine / state | `state:{entity-key}#…` | `state:authentication/Account#locked` |
| actor | `actor:{canonical-lowercase}` | `actor:learner` |
| feature | `feature:{slug}` | `feature:authentication` |
| jira_issue | `jira:{KEY-NN}` | `jira:KAN-127` |
| confluence_page | `confluence:{page_id}` | `confluence:67901` |
| bpmn_process | path `.ir.json`; file `.src.json` cùng basename chỉ enrich node này | `docs/authentication/bpmn/login-email.ir.json` |
| db_schema | `{feature}/db` | `authentication/db` |
| api_field | `api:{feature}/{field}` | `api:premium-payment/amount` |
| external_service | `svc:{canonical}` | `svc:paygate` |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Node types (enum)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

`feature | doc | requirement | error | bo | cap | use_case | user_story | acceptance_criterion | screen | render_artifact | flow | entity | state_machine | state | bpmn_process | db_schema | open_question | decision | raid_item | action_item | term | change_request | jira_issue | confluence_page | research | test_checklist_item | api_checklist_item | test_case | e2e_spec | api_field | actor | external_service`

## Edge types (enum) — nguồn xem spec parse dưới‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

`ELABORATES | DERIVES | DEPENDS_ON | SATISFIES | COVERS | VERIFIES | RAISES | DISPLAYS | CONTAINS | CATALOGS | CONTAINS_STATE | CONTAINS_TRANSITION | DESCRIBES_STATE_OF | OPERATES_ON | NAVIGATES_TO | SAME_AS | RENDERS | IMPACTS | SUPERSEDES | INCLUDES | EXTENDS | GENERALIZES | CLOSES | SYNCS_TO | TESTED_BY | AUTOMATES | INHERITS_STATUS_FROM | REFERENCES | RELATES_TO | STALE_IMPACTS | INFORMS`

* `INCLUDES | EXTENDS | GENERALIZES`: UC nguồn→UC đích từ bảng `## Relationships` trong use-case index; target UC chưa có node vẫn giữ edge để dangling-ref được báo.
* `SUPERSEDES`: decision mới→decision cũ, resolve từ cột `Supersedes`. Cell chứa `{path}.md#D-k` → trỏ decision meeting KHÁC (path không tồn tại → edge dangling, `--verify` báo); bare `D-k`/`Dk`/`#k` → cùng meeting file.
* `CATALOGS`: ngoài index→content còn dùng cho definitions-doc→term từ các heading `###` dưới `## Glossary`.
* `CONTAINS` feature→userguide-index: từ frontmatter `scope: feature:{slug}` của `docs/userguide/*/index.md`. `scope: product` (cẩm nang toàn sản phẩm) HỢP LỆ nhưng không sinh edge — không tính là format lệch.
* `RAISES` từ `bpmn_process`→error: đường chính là `errors[]` của `.src.json` chứa **E-code** (canonical /bpmn SKILL bước 3, cả dạng đầy đủ lẫn `E-NNN` rút gọn theo feature) → provenance `declared`. Phần tử không phải E-code → fallback match error title cùng feature (so sánh GIỮ dấu: NFC + lowercase + gộp whitespace) → provenance `heuristic`. Không match / match nhiều → coverage note + partial-parse (file vào "Phải Read tay").
* `AUTOMATES`: e2e_spec→CHK khi bảng Test cases trong e2e-index map CHK-ID tới file `.spec.ts`; target luôn là CHK key toàn cục, không suy đoán path testcase.
* `DEPENDS_ON`: feature→feature từ cột `Phụ thuộc` trong Product PRD Feature Map hoặc bảng ưu tiên Roadmap. Dependency không match slug/tên trong cùng bảng vẫn tạo feature node `planned=true`, slugify từ cell và ghi coverage note.
* `RENDERS`: render_artifact→screen từ các cột `Figma` / `HTML prototype` / `HTML wireframe` trong screen index; render_artifact→screen và, khi resolve được, →flow từ bảng `Flows` trong `*-wireframe-html-index.md`. Provenance luôn `table`.
* `RELATES_TO`: entity↔entity từ mermaid erDiagram (props.cardinality giữ nguyên ký hiệu `||--o{`, props.label).
* `OPERATES_ON`: UC→entity, props.ops = "CRUD" subset (từ CRUD matrix — chỉ có ở docs format mới).
* `SAME_AS`: db_schema→entity cho mỗi DBML table sau khi chuẩn hóa tên qua `entityCanonical`; target entity có thể chưa resolve.
* `INFORMS`: research→feature khi body research nhắc nguyên feature slug; provenance `heuristic`.
* Mỗi edge BẮT BUỘC có `provenance` + `source{file,line}`.

## Normalization (SỐNG CÒN — kg-build)

1. **Short-form expand:** `FR-001`/`E-003`/`BR-008` trong file thuộc `docs/{feature}/...` → `FR-{feature}-001`… (feature lấy từ path segment sau `docs/`). ID đã full-form giữ nguyên.
2. **List rút gọn:** `FR-authentication-001, 002, 003` → 3 ref. `E-001..006` (range) → 6 ref. `FR-002/004` → 2 ref.
3. **Annotation strip:** `login [chung với flow X]` → screen `login`.
4. **Entity alias:** `ACCOUNT` ↔ `Account` (UPPER_SNAKE ↔ CamelCase) → cùng node, key dùng CamelCase.
5. **Actor alias:** đọc `## Actor Registry` trong `docs/_shared/definitions.md` nếu có (bảng canonical|aliases); không có → lowercase-trim làm canonical.
6. **Glossary term:** heading `### A / B (Tên Việt)` dùng `A` làm primary key; `B` và nội dung trong ngoặc vào `props.aliases`; dòng prose đầu tiên vào `props.description`.
7. **Meeting scope:** meeting doc và các node decision/RAID/action luôn có `feature: null`; frontmatter `feature` chỉ được dùng làm context expand short-form global ID trong decision.
8. Ref không resolve được sau normalization → ghi `meta.coverage.unresolved_refs`, KHÔNG chết build.

## An toàn context (kg-query — 3 quy tắc BẮT BUỘC, từ plan Mục 3.4/3.4bis)

1. **CẤM silent-truncate:** mọi danh sách file/ID trong output — nếu vượt cap hiển thị (mặc định 40 dòng/section) phải in `⚠ còn N mục — chạy với --all` VÀ khi có `--all` in đủ 100%. TUYỆT ĐỐI không cắt lặng.
2. **Fail-loud:** graph.json không tồn tại / JSON lỗi / `schema_version` ≠ 1 → in `KG-ERROR: graph không dùng được (<lý do>) — quay về đọc trực tiếp (Read/grep)` ra stderr, exit code 2. KHÔNG trả kết quả một phần.
3. **Doc-không-parse vào shortlist:** mọi lệnh trả shortlist file (`impact`, `coverage`, `facts`, `neighbors`) PHẢI kèm section cuối `### Phải Read tay (ngoài graph)` liệt kê `meta.coverage.unparsed_docs` + `uncataloged_content` thuộc scope query (cùng feature), kèm dòng tổng `Độ phủ: X/Y doc parse được, N ref chưa resolve`.

## CLI contract

```
node kg-build.mjs [--dir docs] [--out docs/_shared/kg/graph.json] [--verify] [--strict] [--quiet] [--no-timestamp]
  exit 0 = build OK; --verify và có finding ✗ → exit 1 (in bảng finding); lỗi IO/parse chết người → exit 2
  Finding ✗: dangling-ref (ID refer không định nghĩa) · uncataloged-content · dangling-doc-ref (edge→path .md không tồn tại trên disk)
  Finding ⚠ (chỉ fail với --strict): unparsed-doc · error-double-book (E dùng chung nhiều UC là HỢP LỆ — chỉ nhắc kiểm) · dangling-doc-ref ngoài-scope
node kg-query.mjs <explore|impact|tour|coverage|facts|trace|neighbors|orphans|counts|crud|suspect|cypher> [arg] [--graph <path>] [--depth N] [--feature X] [--all] [--staged] [--unstaged] [--since <ref>]
  exit 0 = OK; 1 = usage/argument/feature-hoặc-key-không-tìm-thấy; 2 = graph không dùng được (fail-loud)
  tour <feature>: lộ trình đọc tài liệu theo rank TẦNG vòng đời (brainstorm→srs→uc→us→wireframe→test) + topo cục bộ trong tầng (dep-in-degree, DERIVES/COVERS/ELABORATES weight 2). Cột "Vì sao" = nhãn cạnh 2 chiều (←được phụ thuộc / →phụ thuộc, dạng "N×EDGE"), KHÔNG tóm tắt nội dung. Doc-type NGOÀI tầng vòng đời (screen_content/checklist_content...) → mục "Tài liệu phụ" (KHÔNG hàm ý connectivity — chỉ là ngoài ladder tầng). AC không phải bước riêng (inline trong us-*.md).
  impact --staged | --unstaged | --since <ref>: seed reverse-closure từ git diff thay vì 1 ID gõ tay. Phạm vi: staged=index (diff --cached); unstaged=working-tree (diff) + untracked (ls-files --others); --staged --unstaged=UNION cả 2; --since=<ref>..HEAD. Chạy từ repo-root (-C root, độc lập cwd); --name-status -z (path thô không C-quote, lấy cả old+new khi rename). Chỉ file KG ingest như NGUỒN — MIRROR walk-scope kg-build: .md (bất kỳ); .dbml chỉ {feature}/dbdiagram/{feature}.dbml; .ir/.src.json chỉ trong dir bpmn; bỏ exports/inbox/reports/_regen-sample/guides (KHÔNG lọc theo dir ẩn — builder không lọc). .spec.ts KHÔNG tính (auto-gen, không phải nguồn). docs/ ingest được nhưng không map node → "Read tay" (fold vào footer cuối); còn lại → outOfScope. Seed doc-node = LÁ (không nở), artifact-node nở; explicit `impact <doc-path>` thì doc-root VẪN nở. --since loại trừ --staged/--unstaged; mọi mode loại trừ ID positional. KHÔNG phải git repo / <ref> sai → KG-ERROR exit 2. Giới hạn có-chủ-đích: file bị XÓA (status D) khi graph đã rebuild-không-còn-node của nó → vào "Read tay" (không nở downstream — node/edge đã biến mất khỏi graph current-state; truy vết lịch sử là việc của temporal `history`, KHÔNG fail-loud vì xóa hợp lệ không được làm hỏng cả query).
```

Walk scope: `docs/**/*.md` + `docs/{feature}/dbdiagram/{feature}.dbml` + `docs/**/bpmn/*.ir.json` + `docs/**/bpmn/*.src.json` + `.claude/state/atlassian/sync-state.yaml` (VẮNG → skip + note coverage). `.src.json` cùng basename enrich `bpmn_process`: `branches[]` → `props.branches`; `actors[]` → actor node + edge `REFERENCES` (KHÔNG lưu vào props); `errors[]` → edge `RAISES` (E-code declared / title-match heuristic — xem mục Edge types). **Exclude dirs:** `docs/exports`, `docs/inbox`, `docs/reports`, `docs/_regen-sample` (bản copy sample → ID trùng), `docs/guides`. Ingest thêm event stream: `docs/_shared/changelog.md` (enrich doc props: authors, last_activity) + `docs/_shared/staleness.md` (edge STALE_IMPACTS).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
