---
name: kg
description: Dùng khi cần build/query/verify Knowledge Graph của vault — chọn shortlist file phải đọc (impact/coverage/neighbors), thống kê cấu trúc (facts/counts), hoặc kiểm tra chất lượng liên kết (--verify). `/kg build`, `/kg verify`, `/kg <command> <arg>`.
allowed-tools: Read, Bash, Glob, Grep
user-invocable: true
argument-hint: "build [--verify] | verify | viewer | explore <ID> | impact <ID> [--depth N] | impact --staged [--unstaged] | impact --since <ref> | tour <feature> | coverage <feature> | facts <feature> | trace <feature> | neighbors <path> | orphans | counts [--feature X] | crud <entity> | suspect [--feature X] | history <doc|ID> | asof <ID> <date> [--show] | cypher"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /kg — Knowledge Graph build + query (hạ tầng)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Engine deterministic biên dịch toàn vault → `docs/_shared/kg/graph.json` (nodes + typed edges + provenance + coverage), kèm CLI query trả markdown gọn cho agent/skill dùng. Vai trò trong pipeline: **graph THU HẸP tập file phải Read — KHÔNG THAY việc đọc prose** (contract Mục 3.4bis, `docs/reports/2026-07-13-knowledge-graph-plan.md`).

Engine ở `.claude/skills/kg/engine/` (zero-dep, Node 18+): `kg-build.mjs` + `kg-query.mjs` + `kg-viewer.mjs` + `SCHEMA.md` (contract graph.json) + **`kg-history.mjs` + `SCHEMA-history.md`** (temporal — xem dưới) + **`kg-selftest.mjs` + `test-fixtures/`** — bộ regression test trên feature giả `smart-notification` viết 100% format canonical (137 golden assertions: node/edge từng loại, gap cố ý coverage phải bắt, dangling cố ý verify phải báo, temporal T1/T2/T3 gồm nhánh git thật). Sửa engine/template xong PHẢI chạy: `node .claude/skills/kg/engine/kg-selftest.mjs`.

**Temporal (lịch sử tài liệu nghiệp vụ) — TÁCH file riêng, opt-in.** `kg-history.mjs` ghi `docs/_shared/kg/graph-history.json` RIÊNG (KHÔNG nhập vào graph.json chính) để luồng current-state (`/gap`/`/cr`/`/srs`...) không đọc thêm dữ liệu quá khứ. 3 tầng: T1 `change_event`+`CHANGED` (từ changelog.md — ai/khi/skill/note đổi doc), T2 `change_request`+`AMENDS` (CR nào sửa requirement nào + before/after preview), T3 `revision`+`REVISION_OF`/`SUPERSEDES` (chuỗi bản requirement theo thời gian, git-blob-ref — as-of query). Query `history`/`asof` chỉ đọc file này, lazy-rebuild khi cũ hơn graph.json. Contract: `SCHEMA-history.md`.

## Commands‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```bash
# Build (ghi docs/_shared/kg/graph.json — file DERIVED, không sửa tay)
node .claude/skills/kg/engine/kg-build.mjs [--verify] [--strict] [--quiet] [--no-timestamp]

# Query (bình thường chỉ đọc graph.json; graph dirty/vắng → tự lazy-rebuild từ docs rồi trả lời)
node .claude/skills/kg/engine/kg-query.mjs explore FR-authentication-011
node .claude/skills/kg/engine/kg-query.mjs impact FR-authentication-011 --depth 3   # → Shortlist file cần Read (cho /cr)
node .claude/skills/kg/engine/kg-query.mjs impact --staged                          # → seed từ git diff --cached (BA vừa Edit → lan tới đâu, trước /cr)
node .claude/skills/kg/engine/kg-query.mjs impact --since main                      # → so nhánh gốc: mọi file docs/ đổi → impact union
node .claude/skills/kg/engine/kg-query.mjs tour authentication                      # → lộ trình đọc tài liệu theo phụ thuộc (onboarding feature)
node .claude/skills/kg/engine/kg-query.mjs coverage authentication                  # anti-join FR/UC/E/screen (cho /gap)
node .claude/skills/kg/engine/kg-query.mjs facts authentication                     # cấu trúc cô đọng (định tuyến)
node .claude/skills/kg/engine/kg-query.mjs trace authentication                     # dump TOÀN BỘ edge + broken refs (ma trận /gap)
node .claude/skills/kg/engine/kg-query.mjs neighbors docs/{feature}/srs/{feature}-spec.md  # 1-hop (cho phase review)
node .claude/skills/kg/engine/kg-query.mjs orphans | counts [--feature X]           # /dashboard, banner
node .claude/skills/kg/engine/kg-query.mjs crud <entity>|--feature X               # ma trận UC×entity (nguồn: CRUD matrix format mới)
node .claude/skills/kg/engine/kg-query.mjs suspect [--feature X]                    # edge trace có dependency đổi SAU dependent (theo updated)
node .claude/skills/kg/engine/kg-query.mjs history docs/authentication/srs/spec.md  # → TEMPORAL: doc/requirement này đổi mấy lần (event) + CR nào sửa (AMENDS)
node .claude/skills/kg/engine/kg-query.mjs asof BR-authentication-002 2026-06-15 --show  # → TEMPORAL: bản requirement hiệu lực lúc {date}; --show lấy nội dung nguyên văn qua git
node .claude/skills/kg/engine/kg-query.mjs cypher > kg.cypher                       # export Neo4j visualization (derived, 1 chiều)

# Temporal build (ghi graph-history.json RIÊNG — opt-in, KHÔNG đụng graph.json chính)
node .claude/skills/kg/engine/kg-history.mjs [--no-timestamp] [--quiet]             # history/asof tự lazy-rebuild khi cũ hơn graph.json
node .claude/skills/kg/engine/kg-viewer.mjs                                         # sinh docs/_shared/kg/kg-viewer.html — XEM GRAPH DẠNG HÌNH (tự chứa, double-click mở)
```

## Approach‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1) `/kg build` (hoặc query khi graph chưa có/cũ) → chạy `kg-build.mjs`. Build là thao tác derived-artifact: **L1 rút gọn 1 dòng** ("Build lại graph.json từ N docs — Y/n") khi user gọi tường minh; skill khác gọi nội bộ thì không cần hỏi lại.
2) `/kg verify` → `kg-build.mjs --verify`, in bảng findings (dangling-ref / content-file mồ côi / E double-book / doc không parse). Exit 1 = có lỗi thật trong docs — đề xuất skill sửa tương ứng, KHÔNG tự sửa doc.
3) `/kg <query>` → chạy `kg-query.mjs`, trả output markdown nguyên văn cho user/agent.

## Output‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

**Derived artifact** — sinh bằng Bash engine (không qua Write tool), xoá đi build lại được. KHÔNG phải deliverable BA.

| File | Sinh bởi | Ghi chú |
|---|---|---|
| `docs/_shared/kg/graph.json` | `kg-build.mjs` | Nodes + typed edges + provenance + coverage |
| `docs/_shared/kg/graph-history.json` | `kg-history.mjs` | Temporal (opt-in) — TÁCH riêng, luồng current-state không đọc |
| `kg-viewer.html` | `kg-viewer.mjs` | Viewer tự chứa, xem graph dạng hình |
| `kg.cypher` | `kg-query.mjs cypher` | Export Neo4j (chỉ khi user yêu cầu) |

Skill **KHÔNG sửa file `.md` nào trong vault** — chỉ đọc để build graph.

## Constraints — QUY TẮC VÀNG cho mọi consumer (3.4bis)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate

* **Graph để CHỌN file + đếm cấu trúc; mọi kết luận nội dung/conflict/CR-diff LUÔN dựa trên prose đã Read, KHÔNG dựa facts.**
* Output query luôn có `### Phải Read tay (ngoài graph)` + dòng `Độ phủ:` — consumer PHẢI đọc cả các file đó, không tin mù graph. (Ngoại lệ DUY NHẤT: `cypher` là data-export machine-readable — không footer, không dành cho agent đọc.)
* `⚠ còn N mục — chạy với --all` xuất hiện → consumer BẮT BUỘC chạy lại với `--all` lấy đủ danh sách trước khi Read.
* `KG-ERROR` (exit 2) → graph không dùng được: quay về đọc trực tiếp (Read/grep), KHÔNG suy diễn từ kết quả một phần.
* `graph.json` là DERIVED — không sửa tay, không review nội dung nó như doc; xóa là build lại được.
* Engine KHÔNG ghi/đổi bất kỳ doc nào trong `docs/` ngoài `docs/_shared/kg/graph.json`.

### Pitfalls — easy to get wrong

* Fixtures demo là format cũ (tên trần `spec.md`, cột bảng cũ) — engine parse cả cũ + mới qua header-map; docs rebuild bằng skill hiện hành sẽ cho edge đầy đủ hơn (NAVIGATES_TO/OPERATES_ON/DERIVES cần bảng transitions/CRUD-matrix/cột UC format mới).
* `docs/_regen-sample/` bị exclude khỏi walk (bản copy sample → ID trùng). `sync-state.yaml` vắng → SYNCS_TO lấy từ cột Jira của story-index (provenance table, không canonical).
* Đừng cache output query qua nhiều lượt edit docs — build <1s, cứ build lại.

References:
* `docs/reports/2026-07-13-knowledge-graph-plan.md` (Mục 3 thiết kế + 3.4bis contract giữ-context)
* `.claude/skills/kg/engine/SCHEMA.md` (contract graph.json)
* @.claude/rules/approval-gate.md

## Semantics của `impact` (đã chốt qua review 3 vòng)

* BFS reverse-closure nở qua **node artifact** (FR/UC/US/AC/screen/flow/entity/state/test) với edge **table/declared**.
* **Edge heuristic** (bare-ID nhắc trong prose) = **lá**: doc nhắc tới node vẫn vào shortlist (tương đương value-sweep) nhưng không nở transitive qua mention.
* **Node `doc`** (spec/index/flows...) = **lá**: file vào shortlist, không nở tiếp — tránh index-hub kéo mọi us/uc anh em vào closure (đo thật: thiếu 2 quy tắc này shortlist = cả feature, saving âm).
* Saving thực đo trên fixture authentication: impact 26-35 file thay vì 57; `/gap` coverage ~91% khi docs parse đủ (fixtures legacy nhiều file không parse → engine TRUNG THỰC bắt Read tay, saving tụt còn ~22% — đó là trả giá đúng cho context, không phải lỗi).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
