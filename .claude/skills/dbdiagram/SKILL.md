---
name: dbdiagram
description: Dùng khi cần sinh schema database dạng DBML (.dbml, import dbdiagram.io / dbdocs.io, export SQL) cho data model 1 feature — tầng gần dev nhất trong họ ERD. Khác `/erd` (Mermaid nhúng inline, type gọn cho BA đọc) và `/d2-erd` (D2 hình đẹp standalone).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[--feature <slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /dbdiagram — Database schema (DBML, import dbdiagram.io)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Họ 3 skill ERD: `/erd` (Mermaid, nhúng inline GitHub/Obsidian, type gọn) · `/d2-erd` (D2 `sql_table`, hình đẹp standalone) · `/dbdiagram` (DBML này — __tầng gần dev nhất__: file `.dbml` import dbdiagram.io/dbdocs.io, export ra SQL thật).

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Sinh __schema database__ 1 feature dưới dạng [DBML](https://dbml.dbdiagram.io) (Database Markup Language) — file `.dbml` chuẩn mà [dbdiagram.io](https://dbdiagram.io) và [dbdocs.io](https://dbdocs.io) import trực tiếp để vẽ sơ đồ + export SQL (Postgres/MySQL/…). Output trong `docs/{feature}/dbdiagram/`:

1) `{feature}.dbml` — source DBML (text, version git). Sửa khi gọi lại skill (tự vào update mode).
2) `{feature}.sql` — SQL sinh từ `.dbml` qua `dbml2sql` (bằng chứng schema hợp lệ + dev import DB được ngay).

Plus `dbdiagram/{feature}-dbdiagram-index.md` (metadata + bảng table).

## Tại sao DBML bên cạnh /erd + /d2-erd?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| | `/erd` (Mermaid) | `/d2-erd` (D2) | `/dbdiagram` (DBML) |
|---|---|---|---|
| Định vị | BA đọc, nhúng inline | Hình đẹp standalone | __Bàn giao dev, gần schema thật__ |
| Type | gọn (`string`/`date`) | gọn nghiệp vụ | __kiểu DB thật__ (`uuid`/`varchar`/`timestamp`) |
| Xem hình | IDE/Obsidian tự render | mở `.svg` | dbdiagram.io / dbdocs.io (web) |
| Export SQL | ✗ | ✗ | __✓ (Postgres/MySQL/MSSQL)__ |
| Index / enum / default | ✗ | ✗ | __✓ (DBML hỗ trợ đủ)__ |

> __DBML là artifact kỹ thuật gần dev nhất__ — đây là chỗ ĐƯỢC PHÉP chi tiết DB thật (kiểu `uuid`/`varchar`, index, enum, default, note) vì `.dbml` sinh ra để dev import DB. Vẫn KHÔNG hỏi user bằng ngôn ngữ DB (per `ba-conventions.md` Mục 3) — skill TỰ suy kiểu DB hợp lý từ nghĩa nghiệp vụ. Xem [[feedback_erd_technical_ok]].

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Output cố định__ `docs/{feature}/dbdiagram/{feature}.dbml` + `.sql`. KHÔNG ghi vào `srs/`.
- **`--feature` optional** — auto-detect từ ngữ cảnh; file đã tồn tại → tự vào update mode (L2 diff), không cần flag. __Feature chưa có + mô tả data model → tự derive slug + tạo feature__ (điểm-vào, `feature-bootstrap.md` nhóm A).
- __AI viết source DBML, KHÔNG viết SQL tay__ — `dbml2sql` sinh SQL. Sửa `.dbml` → regen `.sql`.
- __Validate BẮT BUỘC__: `dbml2sql {feature}.dbml --postgres` phải chạy thành công (exit 0) trước khi báo xong. Fail = DBML sai cú pháp → sửa, tối đa 2 lần.
- __L1 approval__ trước Write — prose BA-friendly (các bảng + quan hệ bằng từ nghiệp vụ), KHÔNG dump source DBML.
- __KHÔNG L3 iterate__ — DBML không render trong chat; user review qua dbdiagram.io hoặc `.sql`.
- __KHÔNG hỏi user kiểu DB__ ("varchar hay text?") — skill tự suy kiểu DB từ nghĩa nghiệp vụ user mô tả. User chỉ nói "email là địa chỉ liên hệ", skill tự gán `varchar`.
- __Vietnamese-first__ trong Note/comment nghiệp vụ; tên table/column giữ theo `srs/{feature}-erd.md` nếu đã có (thường English snake_case).
- **Per `diagram-selection.md`** — `/dbdiagram` khi cần bàn giao schema dev / export SQL / dbdocs. Nhúng inline BA → `/erd`; hình đẹp standalone → `/d2-erd`.
- __Idempotent__ — 1 feature = 1 file `{feature}.dbml`; chạy lại → tự vào update mode (L2 diff), không refuse.

### Pitfalls — easy to get wrong

- __dbml2sql chưa cài__ → dừng, in 1 dòng: `npm install -g @dbml/cli` (cài 1 lần, như mmdc/d2). KHÔNG ghi file rồi bỏ mặc không validate.
- __DBML KHÔNG có đuôi .dbdiagram__ — dbdiagram.io là tên *công cụ*, ngôn ngữ là DBML đuôi `.dbml`. Lệnh skill là `/dbdiagram` (gợi nhớ công cụ) nhưng file sinh ra là `.dbml` (import được). Đừng đặt đuôi `.dbdiagram` — toolchain không nhận.
- __Đây là tầng ĐƯỢC chi tiết DB thật__ — khác `/erd`/`/d2-erd` (type gọn). DBML dùng `uuid`/`varchar`/`timestamp`, index, enum, default. Vì `.dbml` sinh ra để dev import DB. Nhưng VẪN không hỏi user kiểu DB — skill tự suy (xem [[feedback_erd_technical_ok]]).
- __Ref direction__ — `[ref: > users.id]` trên cột `user_id` của bảng `decks` nghĩa "nhiều decks trỏ 1 user" (nhiều-một). Nhầm chiều `<`/`>` → sơ đồ vẽ ngược cardinality. Nhớ: `>` là "về phía một".
- __Enum phải khai TRƯỚC khi dùng__ — cột `status order_status` mà chưa có `Enum order_status {...}` → dbml2sql fail. Khai enum ở đầu hoặc cuối file đều được, miễn có.
- __Nguồn tốt nhất là srs/{feature}-erd.md__ — nếu có, chuyển 1-1 (mỗi entity Mermaid → 1 Table DBML). Kiểu DB: nâng từ type gọn của Mermaid lên kiểu DB thật (`string id PK` → `id uuid [pk]`). Đừng bịa table ngoài spec.
- __Index đừng bịa__ — chỉ thêm index có căn cứ nghiệp vụ (unique để chống trùng, cột hay lọc/sắp xếp). Không rải index bừa "cho có".
- __Update mode (feature đã có .dbml)__ → Read source cũ, L2 diff, re-validate + regen .sql sau khi user Y.
- __Đừng over-dùng__ — feature nhỏ 2-3 bảng chỉ cần xem quan hệ → `/erd` đủ. `/dbdiagram` phát huy khi cần bàn giao dev, export SQL, hoặc schema nhiều enum/index.

## Inputs

```
/dbdiagram --feature <slug>          # tạo mới (đọc srs/{feature}-erd.md hoặc srs/{feature}-spec.md làm nguồn)
/dbdiagram "<mô tả data model>"      # feature chưa có → derive slug + phỏng vấn entity/quan hệ + tạo (điểm-vào)
```

Feature đã có `.dbml` → skill tự nhận ra và vào update mode (L2 diff), không cần gõ thêm gì.

## Context (dynamic)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Today: !`date +%Y-%m-%d`
Features có sẵn: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} 2>/dev/null | grep -vE '^_' | head -20`
Feature có srs/{feature}-erd.md (nguồn tốt): !`for d in docs/*/srs/*-erd.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done 2>/dev/null | head -10`
dbml2sql cài chưa: !`command -v dbml2sql >/dev/null && echo "✅ $(dbml2sql --version 2>/dev/null || echo installed)" || echo "❌ chưa cài — npm install -g @dbml/cli"`

## Flow runtime

```
User gọi /dbdiagram --feature X   (hoặc /dbdiagram "<mô tả data model>")
   │  dbml2sql chưa cài? → dừng, hướng dẫn: npm install -g @dbml/cli
   │  ┌─ Feature chưa khớp docs/{feature}/ nào (điểm-vào, feature-bootstrap.md nhóm A):
   │  │  arg là mô tả data model → derive feature slug (kebab-case, ASCII, ≤50 ký tự),
   │  │  confirm slug ở L1 (user override được), tạo docs/{feature}/dbdiagram/ khi Write.
   │  │  arg là slug-lạ 1 từ → hỏi "feature mới hay gõ nhầm?" (liệt kê feature hiện có).
   │  └─ KHÔNG bắt user chạy /brainstorm trước.
   ▼
1. Đọc nguồn data model theo thứ tự ưu tiên:
   docs/X/srs/{feature}-erd.md (Mermaid erDiagram — chuyển thẳng sang DBML) → nếu không có:
   docs/X/srs/{feature}-spec.md (Data Entities + Business Rules) → nếu không có:
   phỏng vấn ĐÚNG PHẠM VI schema cần (feature-bootstrap.md nhóm A bước 3), gom 1 batch
   business-language (KHÔNG hỏi kiểu DB): các entity · attribute nghiệp vụ mỗi entity
   (tên + nghĩa) · quan hệ (cardinality 1:1 / 1:N / N:N). No-re-ask cái nguồn đã có.
   Mô tả mơ hồ dù có nguồn → PHẢI hỏi clarifying, KHÔNG tự bịa attribute/cardinality.
   ▼
2. Trích: table → column (tên + kiểu DB skill tự suy + pk/unique/not null/ref), quan hệ (Ref)
   ▼
3. Viết source .dbml (công thức bên dưới)
   ▼
4. L1 plan preview (prose: N table, M quan hệ). User Y → tiếp
   ▼
5. Write {feature}.dbml → dbml2sql regen {feature}.sql (validate fail → sửa, tối đa 2 lần)
5.5. **Đối chiếu canonical (BẮT BUỘC)** — `node .claude/scripts/erd-consistency.mjs --feature {slug}`.
   So table + quan hệ (Ref) của bản DBML vừa sinh với **canonical `srs/{feature}-erd.md`** (nguồn
   khai ở bước 1). `dbml2sql` PASS chỉ nghĩa là DBML đúng cú pháp, KHÔNG nghĩa là cùng data model
   với bản Mermaid/D2 — 3 file mỗi cái tự hợp lệ vẫn có thể mô tả 3 model khác nhau.
   - Lệch vì DBML sinh thiếu/thừa → sửa `.dbml` cho khớp canonical (nhớ regen `.sql`).
   - Lệch vì **canonical sai** → báo user, sửa `srs/{feature}-erd.md` trước rồi sinh lại.
   - DBML cố ý thêm bảng kỹ thuật (junction, audit) → giải thích trong report, đây là cảnh báo
     không phải lỗi cứng.
   ▼
6. Update dbdiagram/{feature}-dbdiagram-index.md — set env note trước Write,
   │  hook append changelog.md.
   ▼ Báo user (mở dbdiagram.io, paste .dbml — hoặc dùng .sql).
```

## Cách xây (build step-by-step)

### Bước 1 — Skeleton dbdiagram/ nếu chưa có

`docs/{feature}/dbdiagram/{feature}-dbdiagram-index.md` (type `dbdiagram-index`): frontmatter chuẩn + bảng table (tên / số cột / PK / FK ra). Lifecycle inherit `srs/{feature}-spec.md`.

### Bước 2 — Công thức viết source .dbml

```dbml
// Schema {feature} — nguồn: srs/{feature}-erd.md (nếu có)

Table users {
  id uuid [pk]
  email varchar [unique, not null, note: 'địa chỉ liên hệ']
  display_name varchar [note: 'tên hiển thị']
  created_at timestamp [default: `now()`]
}

Table decks {
  id uuid [pk]
  user_id uuid [ref: > users.id, note: 'bộ thẻ của học viên nào']
  name varchar [not null]
  created_at timestamp
}

Enum card_recall {
  forgot
  fuzzy
  remembered
}

Table review_logs {
  id uuid [pk]
  card_id uuid [ref: > cards.id]
  recall card_recall
  reviewed_at timestamp

  Indexes {
    (card_id, reviewed_at) [name: 'idx_review_card_time']
  }
}
```

__Quy tắc:__
- **1 entity = 1 `Table` snake_case số nhiều** (`users`, `decks`, `review_logs`) — convention DB.
- __Kiểu DB skill TỰ suy__ từ nghĩa nghiệp vụ: `uuid` (khoá), `varchar` (text ngắn), `text` (dài), `int`/`bigint`, `decimal` (tiền), `boolean`, `timestamp` (ngày giờ), `date`. KHÔNG hỏi user.
- __PK__: `[pk]`. __FK/quan hệ__: `[ref: > other_table.id]` (`>` = nhiều-một, `<` = một-nhiều, `-` = một-một). Có thể tách dòng `Ref:` riêng cuối file cũng được.
- __Constraint__: `[unique]`, `[not null]`, `[default: ...]` (backtick cho biểu thức `\`now()\``).
- __Enum__: khai `Enum name { val1 val2 }` rồi cột `status card_recall`. Đây là chỗ DBML hơn Mermaid — enum là first-class.
- __Index__: block `Indexes { (col_a, col_b) [name: '...'] }` trong Table. CHỈ thêm index khi nghiệp vụ rõ (unique idempotency, truy vấn thường) — đừng bịa index vô căn cứ.
- __Note nghiệp vụ__: `[note: 'tiếng Việt']` trên column, hoặc `Note: 'tiếng Việt'` trong Table — đây là chỗ ghi nghĩa nghiệp vụ, render lên dbdocs.io.

### Bước 3 — Validate + regen SQL

```bash
dbml2sql docs/{feature}/dbdiagram/{feature}.dbml --postgres -o docs/{feature}/dbdiagram/{feature}.sql
# fail (exit≠0) → đọc lỗi cú pháp DBML (thường ref sai tên table, enum chưa khai, thiếu dấu), sửa .dbml, chạy lại.
```

## L1 plan preview (mẫu BA-friendly)

> Em sẽ tạo schema database (DBML) feature __{feature}__ tại `docs/{feature}/dbdiagram/{feature}.dbml` (+ SQL `.sql`):
>
> __Các bảng ({N}):__ {liệt kê: users, decks, cards, review_logs...}
> __Quan hệ chính ({M}):__ {vd "users có nhiều decks", "decks chứa nhiều cards", "cards có nhiều review_logs"}
> {__Enum/Index__ nếu có: "trạng thái ôn (quên/mơ hồ/nhớ)", "index (card_id, reviewed_at)"}
>
> Nguồn: {srs/{feature}-erd.md | srs/{feature}-spec.md | bạn cung cấp}.
> Import: paste vào dbdiagram.io để xem sơ đồ, hoặc dùng `.sql` để tạo DB.
>
> __Ghi nhận:__ activity log "{note}".
>
> Apply? (Y / sửa)

## Output report

```
✅ DBML schema: docs/{feature}/dbdiagram/{feature}.dbml (+ {feature}.sql)
   Bảng: {N} | Quan hệ: {M} | Enum: {E} | dbml2sql: OK

Xem sơ đồ: mở dbdiagram.io → paste nội dung {feature}.dbml (hoặc import lên dbdocs.io).
Tạo DB:    dùng {feature}.sql (PostgreSQL).
Cần sửa?   /dbdiagram --feature {feature} (skill tự vào update mode)
```

## References

- @../../rules/ba-conventions.md
- @../../rules/approval-gate.md
- @../../rules/naming-conventions.md
- @../../rules/changelog.md
- @../../rules/diagram-selection.md
- @../../rules/diagram-correctness.md
- @../../rules/feature-bootstrap.md
- @./references/example-dbdiagram.dbml (mẫu chuẩn đã validate qua dbml2sql)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
