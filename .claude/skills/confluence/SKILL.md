---
name: confluence
description: Đồng bộ 2 chiều tài liệu BA vault ↔ Confluence Cloud. `/confluence <feature>` xem drift/conflict (an toàn); `--push` đẩy lên, `--pull` kéo về, `--reconcile` xử lý conflict, `import <page>` kéo page tree lạ về.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "<feature> [--push|--pull|--reconcile] | import <page-url|id>"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /confluence — Đồng bộ 2 chiều Vault ↔ Confluence‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Dùng Atlassian MCP để __đồng bộ 2 chiều__ narrative docs (URD/BRD/PRD/SRS/UC/screens/US) giữa vault local và Confluence Cloud. Mọi cơ chế sync (3-way compare, remote preflight, conflict, sync-state gộp, field-ownership) sống ở `.claude/rules/atlassian-sync.md` — skill này là __adapter Confluence__ (page body có `version.number` + optimistic lock + page tree). Adapter Jira là `/jira`; hai skill chia mapping CHUNG ở `.claude/state/atlassian/sync-state.yaml`.

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đưa tài liệu BA lên Confluence cho stakeholder non-technical đọc/comment, __và kéo ngược thay đổi remote về__ (page ai đó sửa, comment, page bị move/xóa). Default = inspect (read-only). Mọi ghi (local hoặc remote) qua approval + remote preflight (__content-hash__).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Default inspect (read-only).__ Không mode nào ghi đè bên nào chỉ vì có cờ. Xem `atlassian-sync.md` Mục 2.
* __Remote preflight BẮT BUỘC trước mọi push update__ — fetch page __đầy đủ hiện tại__ + so __content-hash__ vs base (KHÔNG dựa `version.number` làm thẩm quyền — MCP có thể không expose version param; version chỉ là hint). Content-hash lệch base → KHÔNG push, chuyển reconcile. Kể cả khi đã có page_id. Nếu tool MCP CÓ nhận version-guard thì dùng như lớp bảo vệ thứ 2 (không thay content-hash). Xem `atlassian-sync.md` Mục 5.
* __3-way compare bằng content-hash chuẩn hóa__ (base/local/remote body), KHÔNG chỉ timestamp/version — `version.number` là gợi ý "có thể đổi", hash quyết định "thực sự đổi". Xem `atlassian-sync.md` Mục 4.
* __HARD GATE on stale__ — REFUSE push nếu target doc `status: stale`. Xác định __tập page đích trước__, chỉ gate những artifact đó + upstream bắt buộc (không để 1 doc stale không liên quan chặn cả cây). List + suggest `/cr`. NO override.
* __Field ownership__ — page body/title local đổi = conflict candidate; comment remote → feedback inbox, KHÔNG tự sửa doc nguồn; page move/deletion → tombstone + BA quyết. Xem `atlassian-sync.md` Mục 6, 10.
* __Idempotency (page_id GỘP ở sync-state)__ — mapping Confluence sống ở `sync-state.yaml` (entry theo `vault_path`, key `mappings.confluence.remote_id`). Nhiều page zero-frontmatter (UC/US/ASCII) → **KHÔNG dựa frontmatter `confluence:`**; page_id lưu ở sync-state.
* __L1 approval__ trước mọi ghi; __L2 diff__ khi áp remote về local.
* __Mermaid__ — Cloud KHÔNG render code block trần. Detect app → `app-macro` (ADF) / `png-prerendered` / hỏi L1. Chi tiết kỹ thuật (UUID, extensionKey, ADF node) ở `references/mermaid-adf.md` — mặt tiền chỉ: detect → preview → fallback an toàn.
* __Auth/capability discovery__ — kiểm tool MCP support trước khi hứa (upload attachment, walk page tree, đọc version). Auth missing → export `docs/exports/confluence-import-{feature}-{date}.html`. No invented page IDs/URLs.
* **Feature/doc chưa tồn tại (push/pull mapped) → REFUSE + route `/srs`** (nhóm B). `import <page>` là ngoại lệ có kiểm soát (xem Mục Import).
* __KG chỉ để định tuyến/chọn file__ — kết luận nội dung (page/doc nói gì, diff thật) LUÔN từ prose đã Read, KHÔNG từ facts. 3 nghĩa vụ khi gọi kg-query: `--all` khi output báo cap; Read TẤT CẢ mục "Phải Read tay"; `KG-ERROR` → quay về flow đọc-trực-tiếp cũ. Per @../../rules/kg-usage.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Remote preflight = chốt chặn mất-dữ-liệu__ — page_id chỉ chống tạo trùng, KHÔNG chống ghi đè. Luôn __fetch page đầy đủ + so content-hash__ trước update (xem Hard rules). `version.number` chỉ là *hint* để quyết có cần fetch-full không — KHÔNG phải khóa an toàn, vì MCP có thể không expose version param. Hash lệch base → reconcile, không force.
* __Nhiều page zero-frontmatter__ (UC/US/ASCII) → không thể dựa `confluence:` frontmatter cho mọi page. page_id sống ở sync-state, không ở doc.
* __Comment không phải requirement__ → feedback inbox có tác giả/ngày/link, không tự sửa doc nguồn.
* __Page move/deleted__ → tombstone + BA quyết, KHÔNG tự xóa local.
* __Nội dung Confluence-native không map sạch__ (macro, attachment, panel, inline comment, page restriction) → placeholder có cấu trúc + surface ở plan; BA quyết bên nào authoritative.
* __Hard gate stale theo tập đích__ — chỉ gate page thực sự push + upstream bắt buộc, đừng để 1 doc stale không liên quan chặn cả cây.
* __Mermaid__ — chi tiết ở `references/mermaid-adf.md`. Mặt tiền: detect app → preview kết quả → fallback. Đừng nhồi UUID/ADF vào workflow BA.
* __Missing space key__ — đọc sync-state context; chưa có → hỏi L1; inspect cho phép `TBD`.
* __Partial fail__ — ghi state per-page ngay sau mỗi ghi (resumable); list failed/skipped/conflicted; KHÔNG auto-retry; lock feature khi reconcile.
* __PRD/SRS thiếu file__ — skip với "⚠ skip (file không tồn tại)" trong preview, không crash.
* __BLOCKING gap__ + push → warn + confirm. Chỉ stale là hard gate.
* **`/confluence` không edit body doc nguồn khi push** — chỉ ghi sync-state (env note → changelog.md). Khi __pull__ thì CÓ sửa body local, nhưng qua L2 diff.

## Inputs

```
/confluence <feature>              # inspect: drift/conflict preview (mặc định, an toàn)
/confluence <feature> --push       # đẩy page chỉ-local-đổi lên (sau L1 + preflight)
/confluence <feature> --pull       # kéo page chỉ-remote-đổi về local (sau L2 diff)
/confluence <feature> --reconcile  # xử lý page cả-2-đổi (conflict): BA chọn từng cái
/confluence import <page-url|id>   # kéo page/page-tree CHƯA MAP về làm nháp có kiểm soát
```

**Inline config hỏi trong L1 (KHÔNG flag), cache vào `sync-state.yaml` context:**
* Space key (vd `BA`, `PROD`) — lần đầu hỏi, cache, reuse.
* Parent page: tạo mới (default) hay link page có sẵn (`page_id`/URL).
* Mermaid app: detect + cache `mermaid_app`+`macro_key` (xem `references/mermaid-adf.md`).

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có docs: !`for d in docs/*/*urd.md docs/*/srs/*spec.md; do [ -f "$d" ] && echo "$d" | cut -d/ -f2; done 2>/dev/null | sort -u | head -10`
Sync-state: !`test -f .claude/state/atlassian/sync-state.yaml && echo "EXISTS (mapping gộp)" || echo "NEW"`
Map cũ cần migrate: !`ls docs/_shared/jira-map.md docs/_shared/confluence-map.md 2>/dev/null | tr '\n' ' '`

## Approach

1) __Parse args.__ Mode: inspect (default) / push / pull / reconcile / import. `import <page>` → Mục Import.
2) __Migrate map cũ (1 lần).__ `docs/_shared/confluence-map.md` (hoặc jira-map.md) còn tồn tại & `sync-state.yaml` chưa có → seed mapping+config (space, root_parent_id, mermaid_app, macro_key) vào sync-state, L1, user Y → __xóa file cũ__ (per `atlassian-sync.md` migration).
3) __Resolve feature (nhóm B).__ Validate ≥1 doc `.md` trong `docs/{feature}/`.
   * Không khớp / không có doc → **REFUSE + liệt kê feature hợp lệ + route `/srs`|`/urd`**:
     ```
     Chưa thể chạy /confluence cho `{feature}` — chưa có tài liệu nào trong docs/{feature}/.
     Feature có tài liệu: {list}.
     → Chạy /srs {feature} (hoặc /urd) trước, rồi quay lại /confluence {feature}.
     ```
   * Picker no-arg rỗng → friendly route `/srs`.
   * __KG định tuyến page-plan candidate (trước khi build page plan).__ Chạy `node .claude/skills/kg/engine/kg-query.mjs facts {feature}`, rồi `node .claude/skills/kg/engine/kg-query.mjs neighbors <doc-path>` cho từng doc candidate để dựng tập page/doc đích; vẫn __Read đầy đủ prose mọi doc sẽ push/pull__. Nếu output báo `⚠ còn N mục — chạy với --all` thì chạy lại query với `--all`; Read toàn bộ mục `### Phải Read tay (ngoài graph)`; `KG-ERROR` hoặc lỗi bất kỳ → quay về flow scan cây feature/đọc-trực-tiếp cũ. Content-hash preflight giữ nguyên.
3b. __Capability discovery (TRƯỚC L1)__ — kiểm tool Atlassian MCP thực tế: định dạng macro (html `data-extension-key` vs ADF), có tool upload attachment không, đọc được version/parent không (per `atlassian-sync.md` Mục 12). Chốt mode mermaid + fallback NGAY, để plan BA duyệt là plan chạy được.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
4) __mkdir + migrate + load sync-state.__ `mkdir -p .claude/state/atlassian/{base,locks}`. Nếu còn map cũ → migrate (bước 2). Load entries có `mappings.confluence`. Chưa map/base thiếu → `unmapped` (per Mục 4c: KHÔNG so hash với null).
5) __Remote fetch + 3-way compare 2 KÊNH__ (per `atlassian-sync.md` Mục 4a/4b). Mỗi page đã map:
   * Fetch page đầy đủ (body + parent + labels + title + comment ids). `version.number` chỉ là __hint__ ở bước *inspect* (quét nhanh xem page nào đáng fetch-full), KHÔNG phải thẩm quyền. __Trước MỌI push thì luôn fetch-full + hash, không có ngoại lệ__ (Hard rules).
   * Kênh content: `content_local_changed`/`content_remote_changed` (hash body chuẩn hóa vs base). converged (cả 2 đổi, hash bằng) → tự `synced`.
   * Kênh phụ: `meta_remote_changed` (comment/inline-comment mới) → __luôn pull-thẳng__ vào feedback inbox, kể cả khi content `synced`.
   * Gán state: `synced | local-changed | remote-changed | conflict | remote-missing | local-missing | restricted | unmapped`.
   * Page đổi parent nhưng còn `page_id` → cập nhật `parent_id`, KHÔNG tombstone. Chỉ mất `page_id` = `remote-missing`. Permission chặn = `restricted`.
6) __HARD GATE stale check__ (chỉ push): tập page đích → doc nào `status: stale` (đọc frontmatter doc có frontmatter; zero-frontmatter lấy status từ index tương ứng). Có stale → refuse item đó + suggest `/cr`. Inspect vẫn cho phép.
7) __Build page plan + drift table (inspect — mặc định dừng):__
   ```
   Confluence đối chiếu — feature: authentication · space BA
   | Page (doc)   | page_id | Base | Local     | Remote      | Đề xuất       |
   | URD          | 67891   | v3   | không đổi | v3          | —             |
   | PRD          | 67893   | v18  | không đổi | v19 đã đổi  | Pull          |
   | SRS          | 67895   | v5   | đã đổi    | v6 đã đổi   | Conflict      |
   | Use Cases    | —       | —    | mới       | —           | Push (create) |
   | (Old page X) | 67899   | v2   | —         | đã xóa      | Tombstone     |
   ```
   Cây page (parent → narrative → index → children) như cũ nhưng mỗi node kèm cột drift. `/confluence <feature>` (không cờ) → stop + gợi ý mode kế.
8) **`--push`** (chỉ `local-changed`/`unmapped`):
   * __Remote preflight__ mỗi page có id: fetch page đầy đủ + so __content-hash__ vs base; lệch → tách khỏi push, báo "cần --reconcile". KHÔNG force. (`version.number` chỉ là hint, không phải thẩm quyền.)
   * L1 plan (chỉ page push được) → user Y.
   * Ensure access (MCP; auth missing → export import-HTML).
   * Build body theo ĐÚNG 1 định dạng tool nhận (đã chốt ở capability discovery — KHÔNG trộn markdown + ADF trong 1 request): __page KHÔNG mermaid__ → `contentFormat: markdown` (prose/table convert chuẩn); __page CÓ mermaid__ → toàn bộ body theo định dạng macro-capable của tool (`contentFormat: html` với `data-extension-key`, hoặc ADF nếu tool nhận — xem `references/mermaid-adf.md`), prose cũng nằm trong định dạng đó. ASCII screen mỗi block wrap `<pre>` riêng; wikilink → Confluence page link nếu target đã map, fallback GitHub. Vùng opaque (macro/panel/attachment giữ từ remote) ghép lại từ base snapshot khi update.
   * Create/update theo thứ tự parent → narrative → index → children. Update qua tool MCP (nếu tool nhận version-guard thì kèm; nếu không, content-hash preflight ở trên là lớp bảo vệ). Create dùng crash-safe (pending-op + label, Mục 11).
   * Sau mỗi ghi thành công: cập nhật sync-state entry (`remote_id`, `version.number` mới, hashes, base_snapshot, `state: synced`).
   * Cross-link Jira: index page "User Stories" cột Jira đọc `mappings.jira` từ sync-state (đã map → link; chưa → `TBD — chạy /jira`).
9) **`--pull`** (`remote-changed` content, HOẶC chỉ có comment kênh phụ):
   * Body/title remote → __L2 diff__ vào doc local, user Y mới ghi. Vùng opaque (macro/panel/attachment/inline-comment không map sạch) → __giữ nguyên bản remote trong base snapshot__ + placeholder có cấu trúc trong doc, `has_opaque: true`. **KHÔNG mark `synced` nếu còn opaque chưa được BA chọn authoritative** → chặn push tới khi xử lý (per `atlassian-sync.md` Mục 6).
   * Comment mới (kênh phụ) → feedback inbox `docs/inbox/{date}-confluence-feedback-{slug}.md` (Mục 10). Pull comment KHÔNG cần L2 diff trên doc (không sửa doc nguồn).
   * Cập nhật base snapshot + hashes (cả `base_meta_hash`); set `synced` chỉ khi không còn opaque treo.
10) **`--reconcile`** (page `conflict`): mỗi page in diff section gọn + AskUserQuestion 5 lựa chọn (giữ local / giữ remote / merge / tạo CR / skip) per `atlassian-sync.md` Mục 8. Áp quyết định.
11) __Page move/deletion__ (`remote-missing`): giữ nội dung local, ghi tombstone/move ở sync-state, hỏi BA quyết (re-link / archive / bỏ mapping). KHÔNG tự xóa doc local.
12) __Activity.log__ mỗi ghi: env `CLAUDE_SKILL_NAME=/confluence` + `CLAUDE_CHANGELOG_AUTHOR` + `CLAUDE_CHANGELOG_NOTE` (≤80, vd `[prd] pulled from page 67893 v19`). Ghi `sync-state.yaml` KHÔNG kích hoạt stale-propagation.
13) __Output report__ — page tree + URLs + drift kết quả, sync-state path, feedback inbox nếu có, hint mở browser.

## Output

__Ghi ra Confluence Cloud__ (qua Atlassian MCP) + `.claude/state/atlassian/sync-state.yaml` (mapping + base hash).

Snapshot 3-way: `.claude/state/atlassian/base/confluence-{id}.json` (gồm cả vùng opaque macro/attachment nguyên bản).

Comment/inline-comment kéo về → `docs/inbox/{date}-confluence-feedback-{slug}.md`.

__Mặc định inspect (read-only)__ — không ghi gì. Các mode CÓ ghi: `--push` (ra remote) · `--pull` / `--reconcile` (về local + sync-state) · `import` (ghi bản nháp vào `docs/inbox/` + sync-state).

## Import (page/page-tree chưa map — bootstrap có kiểm soát)

`/confluence import <page-url|id>` (per `atlassian-sync.md` Mục 9):
1) Fetch page (+ descendants nếu là tree qua ancestor/descendant) → preview cây.
2) Hỏi BA: map vào feature nào, hay tạo feature mới (`feature-bootstrap.md`).
3) Landing __mặc định__ `docs/inbox/{date}-confluence-import-{slug}.md` (KHÔNG ghi thẳng `docs/_reverse/{feature}/` — folder đó do `/reverse-doc` sở hữu, ghi đè sẽ đụng nhau; chỉ hand-off sang `/reverse-doc` nếu BA muốn). Kèm source URL, tác giả, ngày. **KHÔNG gắn `approved`.** Macro/attachment không map sạch → placeholder + reference.
4) Ghi mapping vào sync-state (`state: synced`, base = bản fetch). __Tree N page → N phần tử mapping__ (list, mỗi phần tử `remote_id` + `sub_ref`), KHÔNG gộp 1 mapping mù (per Mục 3 quan hệ 1-nhiều).
5) Gợi ý chuyển thành URD/PRD/SRS qua skill spec (import KHÔNG tự sinh doc hoàn chỉnh).

## References

* @../../rules/atlassian-sync.md
* @../../rules/kg-usage.md
* @../../rules/approval-gate.md
* @../../rules/delivery-readiness.md
* @../../rules/feature-bootstrap.md
* @../../rules/changelog.md
* @../../rules/jira-mapping.md
* @references/mermaid-adf.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
