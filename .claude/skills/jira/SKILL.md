---
name: jira
description: Đồng bộ 2 chiều backlog vault ↔ Jira Cloud qua Atlassian MCP. `/jira <feature>` xem drift/conflict (an toàn); `--push` đẩy lên, `--pull` kéo về, `--reconcile` xử lý conflict, `import <KEY>` kéo epic/story lạ về.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "<feature> [--push|--pull|--reconcile] | import <KEY>"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /jira — Đồng bộ 2 chiều Vault ↔ Jira (MCP)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Dùng Atlassian MCP (`mcp__atlassian__*`) để **đồng bộ 2 chiều** backlog giữa vault local và Jira Cloud (`*.atlassian.net`). Mọi cơ chế sync (3-way compare, remote preflight, conflict, sync-state gộp, field-ownership) sống ở `.claude/rules/atlassian-sync.md` — skill này là **adapter Jira** (field cấu trúc + changelog). Adapter Confluence là `/confluence`; hai skill chia mapping CHUNG ở `.claude/state/atlassian/sync-state.yaml`.

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đưa delivery artifacts vault (SRS→Epic, US→Story, AC→Sub-task) lên Jira **và kéo ngược thay đổi remote về** (status, AC do PO sửa, epic re-scope, story split). Default = inspect (read-only). Mọi ghi (local hoặc remote) qua approval + remote preflight.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Default inspect (read-only).** Không mode nào ghi đè bên nào chỉ vì có cờ. Xem `atlassian-sync.md` Mục 2.
- **Remote preflight BẮT BUỘC trước mọi push update** — fetch Jira hiện tại, so watermark (`fields.updated` + changelog nếu cần field-level). Remote đã đổi → KHÔNG push, chuyển reconcile. Kể cả khi đã có issue-key. Xem `atlassian-sync.md` Mục 5.
- **3-way compare bằng content-hash chuẩn hóa** (base/local/remote), KHÔNG chỉ timestamp. Xem `atlassian-sync.md` Mục 4.
- **HARD GATE on stale** — REFUSE push nếu target US có `status: stale` (đọc cột Status trong `userstories/{feature}-story-index.md`). List stale, suggest `/cr`. NO override.
- **Field ownership** — Jira status/assignee/sprint = delivery metadata, pull về story-index/sync-state, **KHÔNG** đổi `status` lifecycle của doc. Comment → feedback inbox, không trộn vào requirement. Xem `atlassian-sync.md` Mục 6, 10.
- **Idempotency (key GỘP ở sync-state)** — mapping Jira sống ở `.claude/state/atlassian/sync-state.yaml` (entry theo `vault_path`, key `mappings.jira.remote_id`). Cột Jira trong `{feature}-story-index.md` là **bản chiếu để người đọc** (đồng bộ theo sync-state). us-file zero-frontmatter — KHÔNG có `jira:` object trên từng file.
- **L1 approval** trước mọi ghi; **L2 diff** khi áp remote về local.
- **Auth/capability discovery** — kiểm tool MCP thật sự support trước khi hứa (changelog, JQL, transition). Auth missing → export import-file thay vì push. Xem `atlassian-sync.md` Mục 12.
- **Không tự đoán mapping** — story split/moved → hỏi BA map từng cái.
- **Feature/US chưa tồn tại (push/pull mapped) → REFUSE + route `/userstory`** (per `feature-bootstrap.md` nhóm B). Nhưng `import <KEY>` là ngoại lệ có kiểm soát (xem Mục Import).
- **KG chỉ để định tuyến/chọn file** — kết luận nội dung (US nói gì, diff thật) LUÔN từ prose đã Read, KHÔNG từ facts. 3 nghĩa vụ khi gọi kg-query: `--all` khi output báo cap; Read TẤT CẢ mục "Phải Read tay"; `KG-ERROR` → quay về flow đọc-trực-tiếp cũ. Per @../../rules/kg-usage.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Remote preflight là chốt chặn mất-dữ-liệu** — issue-key chỉ chống tạo trùng, KHÔNG chống ghi đè. Luôn fetch-so-watermark trước update. Không có "force update" thường ngày (chỉ là thao tác ngoại lệ có lý do + confirm riêng).
- **Jira status ≠ doc `status`.** `Done`/`In Progress` là tiến độ thực thi → delivery metadata. `draft`/`approved`/`stale` là vòng đời tài liệu. Đừng ghi đè lẫn nhau.
- **AC mapping đổi dạng gây conflict giả** — đã chốt `subtasks` thì đừng đổi sang `description` giữa chừng; hash sẽ lệch, sinh conflict/duplicate/mất AC. Đổi dạng = thao tác migration có chủ đích, ghi rõ ở sync-state.
- **Story split/moved** — KHÔNG tự map issue mới về local. Hỏi BA từng cái; đề xuất CR + stale propagation cho SRS/PRD liên quan.
- **Comment không phải requirement** — vào feedback inbox có tác giả/ngày/link, không trộn vào us-file.
- **Missing project key** — đọc `sync-state.yaml` context; chưa có → hỏi L1; inspect cho phép `TBD`.
- **Partial fail** — ghi state per-item ngay sau mỗi ghi thành công (resumable); list failed/skipped/conflicted; KHÔNG auto-retry lỗi validation/permission/conflict; rate-limit → kế hoạch retry hiện rõ. Lock feature khi reconcile.
- **Cột Jira trong story-index là bản chiếu** — nguồn thật là sync-state. Lệch → skill đồng bộ lại từ sync-state, không ngược. Story-index có sẵn cột `Jira` (issue key) + `Status` — ghi delivery status Jira vào các cột này KHÔNG cần thêm cột `Status-Jira` mới; nếu cần phân biệt Jira-status với lifecycle-status thì để Jira-status ở `delivery_metadata` (sync-state), chỉ chiếu tóm tắt lên story-index.
- **First-run base thiếu** — `sync-state.yaml` NEW → mọi artifact `unmapped`, KHÔNG so hash null (per Mục 4c). Đã tồn tại issue remote (link/import) → baseline-capture 1 lần, KHÔNG hỏi conflict.
- **Crash giữa create** — pending-op + label bảo vệ, resume adopt theo fingerprint thay vì tạo trùng (Mục 11).
- **BLOCKING gap** (từ `/gap`) + push → warn + confirm. Chỉ stale là hard gate.

## Inputs

```
/jira <feature>              # inspect: drift/conflict preview (mặc định, an toàn)
/jira <feature> --push       # đẩy artifact chỉ-local-đổi lên Jira (sau L1 + preflight)
/jira <feature> --pull       # kéo artifact chỉ-remote-đổi về local (sau L2 diff)
/jira <feature> --reconcile  # xử lý artifact cả-2-đổi (conflict): BA chọn từng cái
/jira import <KEY>           # kéo epic/story CHƯA MAP về làm nháp có kiểm soát
```

**Inline config hỏi trong L1 (KHÔNG flag), cache vào `sync-state.yaml` context:**
- Project key (vd `PAY`) — lần đầu hỏi, cache, lần sau reuse.
- AC mapping: `subtasks` (default) / `description` / `checklist`. **Chốt 1 lần, ghi vào sync-state** — đổi dạng sau này gây conflict giả (xem Pitfalls).
- Epic: tạo mới (default) hay link epic có sẵn (`link <KEY>`).

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có US: !`for d in docs/*/userstories/us-*.md; do [ -f "$d" ] && echo "$d" | cut -d/ -f2; done | sort -u | head -10`
Sync-state: !`test -f .claude/state/atlassian/sync-state.yaml && echo "EXISTS (mapping gộp)" || echo "NEW"`
Map cũ cần migrate: !`ls docs/_shared/jira-map.md docs/_shared/confluence-map.md 2>/dev/null | tr '\n' ' '`

## Approach

1) **Parse args.** Xác định mode: inspect (default) / push / pull / reconcile / import. `import <KEY>` → nhảy Mục Import.
2) **Migrate map cũ (1 lần).** Nếu `docs/_shared/jira-map.md` (hoặc confluence-map.md) còn tồn tại và `sync-state.yaml` chưa có → đọc seed mapping+config vào `sync-state.yaml`, show L1, user Y → **xóa file cũ** (per `atlassian-sync.md` migration).
3) **Resolve feature (nhóm B).** Validate `docs/{feature}/userstories/us-*.md` ≥1.
   - Không khớp folder / không có `us-*.md` → **REFUSE + liệt kê feature hợp lệ + route `/userstory`** (KHÔNG tự tạo):
     ```
     Chưa thể chạy /jira cho `{feature}` — thiếu user story (userstories/us-*.md).
     Feature có story: {list}.
     → Chạy /userstory {feature} trước, rồi quay lại /jira {feature}.
     ```
   - Picker no-arg rỗng → friendly message route `/userstory`.
   - **KG định tuyến US/mapping candidate (trước khi lập drift table).** Chạy `node .claude/skills/kg/engine/kg-query.mjs facts {feature}` và `node .claude/skills/kg/engine/kg-query.mjs trace {feature} --all`, lọc US cùng edge `SYNCS_TO` để lập danh sách US/mapping candidate trước; sau đó vẫn **Read nguyên prose từng story được chọn** khi so drift. Nếu output báo `⚠ còn N mục — chạy với --all` thì chạy lại query với `--all`; Read toàn bộ mục `### Phải Read tay (ngoài graph)`; `KG-ERROR` hoặc lỗi bất kỳ → quay về flow glob/đọc-trực-tiếp cũ. Canonical mapping vẫn là `sync-state.yaml`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
3b. **Capability discovery (TRƯỚC L1)** — kiểm tool Atlassian MCP: đọc được changelog không, có tool transition (`transitionJiraIssue`) không, JQL `parentEpic` chạy được không (per `atlassian-sync.md` Mục 12). Chốt fallback NGAY.
4) **mkdir + migrate + load sync-state.** `mkdir -p .claude/state/atlassian/{base,locks}`. Còn map cũ → migrate (bước 2). Load entries có `mappings.jira`. Chưa map/base thiếu → `unmapped` (per Mục 4c: KHÔNG so hash null).
5) **Remote fetch + 3-way compare 2 KÊNH** (per `atlassian-sync.md` Mục 4a/4b). Mỗi US/epic:
   - Fetch Jira đầy đủ (fields scope + status/assignee/sprint + comment ids; changelog khi cần field-level). `fields.updated` chỉ là **hint**.
   - Kênh content: `content_local_changed`/`content_remote_changed` (summary/description/AC/priority/epic-parent/labels/links). converged → tự `synced`.
   - Kênh phụ: `meta_remote_changed` (status/assignee/sprint/comment) → **luôn pull-thẳng**: status/assignee → `delivery_metadata` (sync-state) + cột Jira/Status của story-index; comment → feedback inbox. Kể cả khi content `synced` (đây là fix: story chỉ đổi `Done` vẫn được xử lý, không kẹt `synced`).
   - Gán state: `synced | local-changed | remote-changed | conflict | remote-missing | local-missing | unmapped`.
6) **HARD GATE stale check** (chỉ khi push): đọc cột Status bảng Stories `{feature}-story-index.md`. Row `stale` → refuse push item đó, list + suggest `/cr`. Dry-run/inspect vẫn cho phép.
7) **Build drift table (inspect — mặc định dừng ở đây):**
   ```
   Jira đối chiếu — feature: payment · project PAY
   | Artifact | Jira key | Base    | Local     | Remote        | Đề xuất       |
   | US-001   | PAY-45   | sync    | không đổi | không đổi     | —             |
   | US-003   | PAY-47   | 12/07   | AC đổi    | AC đổi (PO)   | Conflict      |
   | US-005   | —        | —       | mới       | —             | Push (create) |
   | US-002   | PAY-46   | sync    | không đổi | status→Done   | Pull metadata |
   ```
   `/jira <feature>` (không cờ) → stop sau bảng này + gợi ý mode kế (`--push`/`--pull`/`--reconcile`).
8) **`--push`** (artifact `local-changed` hoặc `unmapped`):
   - **Remote preflight** (per Mục 5): mỗi item có key fetch-full + so hash content vs base; `content_remote_changed` → tách khỏi push, báo "cần --reconcile". KHÔNG force. Item `unmapped` (create) → dùng **crash-safe create** (ghi pending-op + label `ba-vault:{vault_path}` trước, per Mục 11) để resume không tạo trùng.
   - L1 plan (chỉ item push được) → user Y.
   - Ensure Jira access (MCP authenticate; auth missing → export `docs/exports/jira-import-{feature}-{date}.md`, không invent URLs).
   - Create/update qua MCP. Epic từ `srs/{feature}-spec.md`; Story từ `us-*.md`; AC theo dạng đã chốt (`ac_mapping` trong sync-state). **Push KHÔNG tự transition status** (per Mục 6 — no-op có chủ đích, nêu rõ với BA; muốn đẩy tiến độ = opt-in riêng qua tool transition).
   - Sau mỗi ghi thành công: cập nhật entry sync-state (`remote_id`, 3 hash mới, `base_snapshot`, `state: synced`, xóa pending-op); cập nhật cột Jira bảng `{feature}-story-index.md` (bản chiếu — chỉ ghi cột `Jira`/`Status`, KHÔNG đụng semantic body, tránh kích stale hook).
9) **`--pull`** (`remote-changed` content, HOẶC chỉ kênh phụ meta/comment):
   - Kênh content (summary/description/AC remote) → **L2 diff** vào us-file, user Y mới ghi.
   - Kênh phụ: status/assignee/sprint → ghi `delivery_metadata` (sync-state) + cột story-index, **KHÔNG** L2 diff trên doc, **KHÔNG** đổi lifecycle `status`. Comment → feedback inbox `docs/inbox/{date}-jira-feedback-{slug}.md` (Mục 10).
   - Cập nhật base snapshot + 3 hash + `state: synced`.
10) **`--reconcile`** (artifact `conflict`): với mỗi cái, in diff gọn theo field + AskUserQuestion 5 lựa chọn (giữ local / giữ remote / merge / tạo CR / skip) per `atlassian-sync.md` Mục 8. Áp quyết định (push / L2-apply-remote / merge-đề-xuất-L2 / gọi `/cr` / skip+block).
11) **Epic re-scope / story split / moved** (phát hiện ở bước 5 qua changelog/parent-link đổi): KHÔNG tự xử. Nêu ở drift table với đề xuất "Tạo CR" + hỏi BA map issue mới → local story nào.
12) **Activity.log** mỗi ghi: set env `CLAUDE_SKILL_NAME=/jira` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE` (≤80 ký tự, vd `[us-003] pulled AC from PAY-47`). Hook ghép dòng. **Lưu ý:** ghi `sync-state.yaml` KHÔNG được kích hoạt stale-propagation (state ngoài doc body).
13) **Auto-chain `/confluence` prompt** (chỉ sau push thành công, giữ như cũ) — hỏi có push docs lên Confluence không; Y → invoke `/confluence {feature} --push`.
14) **Output report** — bảng kết quả (created/updated/pulled/conflict), sync-state path, feedback inbox nếu có, next steps.

## Output

**Ghi ra Jira Cloud** (qua Atlassian MCP) + `.claude/state/atlassian/sync-state.yaml` (mapping + base hash + watermark).

Snapshot 3-way: `.claude/state/atlassian/base/jira-{KEY}.json`. Lock khi ghi: `locks/{feature}.lock`.

Comment kéo về → `docs/inbox/{date}-jira-feedback-{slug}.md`. Import epic/story lạ → bản nháp, KHÔNG gắn `approved`.

**Mặc định inspect (read-only)** — không ghi gì. Các mode CÓ ghi: `--push` (ra remote) · `--pull` / `--reconcile` (về local + sync-state) · `import` (ghi bản nháp vào `docs/inbox/` + sync-state).

## Import (epic/story chưa map — bootstrap có kiểm soát)

`/jira import <KEY>` (per `atlassian-sync.md` Mục 9):
1) Fetch epic/story + children (JQL `parentEpic = <KEY>` nếu là epic) → preview.
2) Hỏi BA: map vào feature có sẵn nào, hay tạo feature mới (theo `feature-bootstrap.md`).
3) Landing **mặc định** `docs/inbox/{date}-jira-import-{KEY}.md` (KHÔNG ghi thẳng `docs/_reverse/{feature}/` — folder đó do `/reverse-doc` sở hữu; chỉ hand-off nếu BA muốn). Kèm source URL, tác giả, ngày. **KHÔNG gắn nhãn `approved`.**
4) Ghi mapping vào sync-state (`state: synced`, base = bản fetch). **Epic + N children → N phần tử mapping** (list, mỗi child `remote_id` + `sub_ref`), KHÔNG gộp 1 mapping mù (per Mục 3 quan hệ 1-nhiều).
5) Gợi ý: muốn biến thành URD/PRD/SRS/story thì chạy skill spec tương ứng (import KHÔNG tự sinh doc BA hoàn chỉnh).

## References

- @../../rules/atlassian-sync.md
- @../../rules/kg-usage.md
- @../../rules/approval-gate.md
- @../../rules/delivery-readiness.md
- @../../rules/feature-bootstrap.md
- @../../rules/jira-mapping.md
- @../../rules/changelog.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
