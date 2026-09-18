# KG History — Schema Contract v2‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> `kg-history.mjs` đọc `docs/_shared/changelog.md`, các CR record đã apply trong `docs/cr/CR-*.md`, git history của file chứa requirement, và node key trong `graph.json`. Sau đó ghi history graph riêng tại `docs/_shared/kg/graph-history.json`. **File này KHÔNG thay đổi hoặc nhập dữ liệu temporal vào `graph.json`** — luồng nghiệp vụ current-state không đọc thêm dữ liệu quá khứ (opt-in temporal).

## graph-history.json schema‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```jsonc
{
  "meta": {
    "schema_version": 2,
    "generated_at": "<ISO datetime | 1970-01-01T00:00:00.000Z khi --no-timestamp>",
    "root": "docs",
    "node_count": 0,
    "edge_count": 0,
    "coverage": { /* xem Mục Coverage */ }
  },
  "nodes": [ /* change_event | change_request | revision */ ],
  "edges": [ /* CHANGED | AMENDS | REVISION_OF | SUPERSEDES */ ]
}
```

## Nguồn activity‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

`changelog.md` là **bảng Markdown 5 cột** (xem `.claude/rules/changelog.md`):

```markdown
| Ngày | Skill | Người | File | Ghi chú |
|---|---|---|---|---|
| 2026-07-12 | /srs | @ba | `docs/payment/srs/payment-spec.md` | initial spec 12 FR |
```

- Reader bỏ tiêu đề (`#`), blockquote (`>`), dòng trống, header bảng và separator (`|---|`); chỉ dòng bắt đầu bằng `|` mới là dữ liệu. Pipe biên được gỡ trước khi tách cột.
- `sequence` là **số thứ tự SỰ KIỆN** (dòng dữ liệu thứ n), bắt đầu từ 1 — KHÔNG phải số dòng vật lý (file có 5 dòng header phía trên). Key có thể không liên tục khi một số dòng bị skip. Số dòng vật lý chỉ dùng khi báo `coverage.skipped_lines` để trỏ đúng chỗ trong file.
- Dòng dữ liệu bị bỏ qua + ghi vào `coverage.skipped_lines` khi: ít hơn 5 cột (`fewer-than-5-fields`) hoặc cột đầu không phải ngày ISO (`invalid-date` — chặn header viết tay khác chuẩn lọt thành event ma).
- Cột **File** bọc backtick trong bảng → reader gỡ backtick để ra path thuần.
- Ký tự `|` trong **Ghi chú** được hook escape thành `\|` khi ghi; reader khôi phục về `|`. Nếu vẫn còn `|` chưa escape, các cột từ vị trí thứ 5 trở đi được nối NGUYÊN bằng `|` (giữ đúng nội dung note).
- `file` được chuẩn hóa bằng `path.posix.normalize` + `toPosix` (đổi `\`→`/`).

## Nguồn CR record‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Script đọc các file trực tiếp trong `docs/cr/` có tên `CR-YYYYMMDD-NNN.md`. Chỉ section bắt đầu bằng heading `## Applied Changes` (kèm date tùy chọn) được parse:

```markdown
## Applied Changes (2026-06-27)
```

Section kết thúc tại heading `## ` kế tiếp hoặc cuối file. CR không có section `Applied Changes` không tạo node/edge và ghi vào `coverage.skipped_cr`.

Mỗi change block bắt đầu bằng heading cấp ba:

```markdown
### docs/{feature}/srs/spec.md (vị trí)
**Before:**
> {nội dung cũ}
**After:**
> {nội dung mới}
```

Feature xác định theo thứ tự: (1) segment sau `docs/` trong heading; (2) feature trong full-form ID ở nội dung block; (3) không xác định → bỏ block + `coverage.notes`.

ID trích trong toàn bộ heading + nội dung block. Prefix: `FR|NFR|BR|E|BO|CAP|CHK`. Short-form (`E-002`) canonical hóa theo feature block → `E-authentication-002`. List/range (`FR-001, 002`, `FR-001..004`) được mở rộng.

## Node `change_event` (T1)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- `key`: `event:{sequence}` · `type`: `change_event`.
- `date`, `skill`, `author`, `note`, `file`: từ activity line (4 field đầu trim, note giữ nguyên).
- `sequence`: số dòng vật lý.

## Node `change_request` (T2)

- `key`: CR ID từ tên file (`CR-20260627-001`) · `type`: `change_request`.
- `date`: ngày trong heading `Applied Changes`, fallback frontmatter `updated`.
- `title`: title trong `# CR-... — {title}` / `: {title}`, fallback frontmatter `title` → CR ID.
- `file`: path CR record chuẩn hóa.

## Node `revision` (T3 — git-blob-ref)

Mỗi bản của 1 requirement qua thời gian. Nguồn mốc: git commit history của file chứa requirement (xương sống), + AMENDS edited (T2) để gắn `source_cr`. **Không lưu full nội dung** — chỉ con trỏ git.

- `key`: `rev:{requirement-id}@{seq}` (seq 1-indexed, cũ→mới) · `type`: `revision`.
- `requirement`: requirement-id (cross-ref graph.json).
- `valid_from`: ISO date bản này bắt đầu hiệu lực.
- `valid_to`: ISO date bản KẾ bắt đầu (`null` = bản hiện hành).
- `git_commit`: full commit hash chứa bản này (`null` khi no-git).
- `git_file`: path file để `git show {commit}:{file}`.
- `source_cr`: CR gây ra mốc này (gắn theo date-match với AMENDS edited), `null` nếu chỉ từ git.
- `content_hash`: `sha256:...` của DÒNG requirement tại commit (best-effort), `null` nếu không trích được / no-git.
- `previous_revision`: key revision trước (`null` cho bản đầu).

Mốc trùng nội dung liền kề (cùng `content_hash`) bị gộp — `source_cr` carry-forward sang bản được giữ.

## Edge `CHANGED` (T1)

`change_event --CHANGED--> {doc-key}`. `provenance`: `activity-log`. `source{file,line}`: vị trí trong changelog.md. Giữ edge cả khi `to` không có trong graph.json (→ `coverage.dangling_targets`: doc đã xóa/exclude/chưa parse).

## Edge `AMENDS` (T2)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mỗi cặp duy nhất `(CR-id, requirement-id)`:

- `from`: change_request key · `to`: requirement-id (graph.json).
- `amend_kind`: `"edited"` (ID trong Before/After = requirement THẬT bị sửa) hoặc `"mentioned"` (chỉ nhắc trong bullet/prose, vd traceability).
- `before_preview` / `after_preview`: trích Before/After (chỉ khi `edited`); `mentioned` → rỗng.
- `is_preview`: luôn `true` (trích đoạn, không full diff).
- `provenance`: `cr-record` · `source.files`: array CR record (1 CR sửa 1 req ở nhiều block → nhiều file).

Giữ edge cả khi requirement không có trong graph.json (→ `coverage.dangling_amends`).

## Edge `REVISION_OF` + `SUPERSEDES` (T3)

- `revision --REVISION_OF--> requirement`: mỗi revision node 1 edge.
- `revision(mới) --SUPERSEDES--> revision(cũ)`: chuỗi nối tiếp bản.
- `provenance`: `git-history` · `source.file`: file chứa requirement.

## Coverage

| Field | Ý nghĩa |
|---|---|
| `activity_lines_total` | Tổng dòng activity nguồn (không tính trailing newline) |
| `activity_lines_parsed` | Số dòng thành `change_event` |
| `skipped_lines` | Activity line <5 field |
| `dangling_targets` | Edge `CHANGED` trỏ doc không có trong graph.json |
| `cr_records_total` | Số file khớp `CR-YYYYMMDD-NNN.md` |
| `cr_records_parsed` | Số CR có `Applied Changes` → `change_request` |
| `dangling_amends` | Edge `AMENDS` trỏ requirement không có trong graph.json |
| `skipped_cr` | CR không có `Applied Changes` (proposed/rejected/chưa apply) |
| `revisions_total` | Số revision node (T3) |
| `requirements_with_history` | Số requirement có ≥1 revision |
| `git_available` | `true`/`false` — git có dùng được không (false → revision chỉ từ AMENDS edited) |
| `notes` | Ghi chú nguồn optional (nguồn vắng, feature không xác định, git note) |

Thiếu `changelog.md` / thư mục `docs/cr` / git là HỢP LỆ (nguồn optional → skip + note). Thiếu `graph.json`, JSON lỗi, hoặc graph không có `nodes` hợp lệ là **fatal, exit 2**.

## Determinism

- Nodes sort theo `type`; `change_event` cùng type sort theo `sequence`, còn lại theo `key`.
- Edges sort theo `(from, type, to)`. Revision/AMENDS/dangling sort theo ID/key ổn định.
- git log trên cùng repo state → cùng output → build byte-identical.
- JSON indent 2 spaces + trailing newline. Ghi qua temp file + atomic rename.
- `--no-timestamp` cố định `generated_at` = `1970-01-01T00:00:00.000Z`.

## CLI contract

```text
node kg-history.mjs [--dir docs] [--graph docs/_shared/kg/graph.json] [--out docs/_shared/kg/graph-history.json] [--no-timestamp] [--quiet]
```

- `--out` KHÔNG được trùng `--graph` (chống ghi đè graph.json chính) → exit 2.
- Exit `0`: build OK (kể cả thiếu changelog.md / CR dir / git / có dangling).
- Exit `2`: lỗi argument, IO, JSON, graph bắt buộc không dùng được.

## Query (kg-query.mjs — opt-in temporal)

```text
kg-query history <doc-path|requirement-id>     # change_event (CHANGED) + CR đã sửa (AMENDS)
kg-query asof <requirement-id> <YYYY-MM-DD> [--show]   # bản requirement hiệu lực lúc {date}; --show lấy nội dung git
```

Cả 2 lệnh: lazy-rebuild graph-history nếu cũ hơn graph.json (chỉ khi dùng path mặc định), fail-loud exit 2 nếu graph-history không dùng được.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
