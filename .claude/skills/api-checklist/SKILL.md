---
name: api-checklist
description: Dùng khi cần dựng checklist test API (nội bộ hoặc đối tác) qua phỏng vấn discovery nhiều vòng để hiểu rõ API trước. Khác `/test-checklist` (checklist hành vi UI) và `/api-test` (bảng test case chạy được, đọc checklist này để expand).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
user-invocable: true
disable-model-invocation: true
argument-hint: "<nói tính năng / mô tả tự nhiên — kèm hình tài liệu API hoặc dán nội dung API nếu có>"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /api-checklist — Hiểu API rồi mới viết Checklist Test (outline trước /api-test)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Sinh __API test checklist__ ở dạng outline có cấu trúc (scenario per endpoint × dimension) để QC/BA duyệt "đã đủ chưa, miss case nào" — NHƯNG khâu quan trọng nhất là __hiểu rõ API qua vòng discovery nhiều round__ trước khi viết. Đủ context ở bước này → `/api-test` chỉ còn ráp request cơ học → TC chất lượng, không bịa.

Skill phục vụ __3 lane test__ — đây KHÔNG chỉ khác "provider", mà kiểm chứng __loại rủi ro khác nhau__ (xem `api-integration.md` Mục 3):

| Lane (`test_layer`) | Là gì | Test để |
|------|-------|---------|
| __own__ | API backend của chính dự án (`POST /auth/login`, `/auth/signup`...) | backend mình implement __đúng SRS / Error Matrix / Business Rules__ không |
| __3rd__ (partner-contract) | API đối tác (PayGate, MailGate) | đối tác gọi đúng + hoạt động đúng tài liệu để tích hợp an toàn |
| __mixed__ (E2E) | endpoint own gọi sang 3rd-party (`/payment/charge` → PayGate) | __cả luồng orchestration__: own gọi partner → nhận callback → chuyển trạng thái → cập nhật UI → xử lý exception. Đây mới là nơi xác nhận "tích hợp thành công" |

__Hai CHIỀU API__ (cột `direction`) — cách test khác hẳn nhau (xem `api-integration.md` Mục 4):

| Chiều | Là gì | Dimension đặc thù |
|------|-------|---------|
| __outbound__ | App mình gọi RA đối tác (`POST /v1/charges`) | request-assert thường |
| __inbound__ | Đối tác gọi VÀO app mình (webhook "charge succeeded") | signature verify (HMAC) · idempotency (event trùng) · retry/backoff · out-of-order event |

> Đối tác có webhook (payment thường có) mà chỉ test outbound = __mù chiều inbound__ = rủi ro trạng thái lệch. Nếu blueprint (`api-design.md`) mô tả webhook → checklist PHẢI có dimension inbound.

Workflow QC chuẩn 2 bước skill này hỗ trợ:
1. `/api-checklist` → discovery → outline → review → chốt scope test.
2. `/api-test` → expand từng item thành request Bruno chạy được (đọc checklist này, KHÔNG tự sinh scenario).

## Vị trí pipeline‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
/api-assess     → integration/api-assess.md       (đk) đánh giá đối tác build-vs-buy
/api-doc        → integration/api-summary.md     hiểu nghiệp vụ API 3rd-party + error catalog
/api-design     → integration/api-design.md       ⭐ Integration Blueprint (orchestration/state/webhook)
/api-checklist  → test/api/api-checklist.md       ★ DISCOVERY loop → outline + fixtures + trigger  (skill này)
/api-test       → test/api/api-tests.md + bruno/  expand checklist → executable (n–n, cùng intent)
/api-map        → integration/api-map.md          field ↔ entity ↔ UI (hội tụ dưới api-design trước checklist)
/api-readiness  → integration/api-readiness.md    go-live gate (sau test)
```

> Full pipeline + 3 lane + 2 chiều + ranh giới BA↔dev: `.claude/rules/api-integration.md`.

> `integration/` giữ doc __HIỂU/MAP__ API 3rd-party (api-summary, api-map). `test/api/` giữ mọi __artifact TEST__ API (own + 3rd). `api-tests.md` cũ ở `integration/` sẽ migrate sang `test/api/` (việc của `/api-test`, không phải skill này).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Discovery-first__ — KHÔNG viết checklist ngay. Phải auto-extract context + chạy vòng round hiểu API trước. Đây là lý do skill tồn tại.
- __Adaptive loop__ — auto-extract tối đa từ doc → chấm 🟢/🟡/🔴 → CHỈ hỏi cụm 🔴/🟡 → loop từng round tới khi hết 🔴 hoặc user nói "đủ". Tuân no-re-ask: KHÔNG hỏi cái doc đã trả lời.
- __Một round = một chủ đề__ — câu hỏi đánh số, __chờ trả lời__ rồi mới round sau. KHÔNG dồn batch nhiều round vào 1 prompt (mirror `/brainstorm` deep-interview).
- __Push exact values__ — trả lời mơ hồ ("để sau", "chắc vậy") → hỏi lại 1 lần cụ thể hơn. Vẫn mơ hồ → giữ 🔴 thành OQ, KHÔNG bịa.
- __Thiếu 🔴 → ghi OQ, KHÔNG tạo item__ — mọi lỗ hổng thành Câu hỏi mở tường minh. Checklist trung thực: user biết chính xác chỗ nào CHƯA cover, không bị đánh lừa là đã đủ.
- __Survey test hiện có__ — đọc `test/checklist/*`, `test/testcases/*` (UI) + `test/api/api-tests.md` (canonical; legacy `integration/api-tests.md` nếu chưa migrate) để bổ sung tầng API còn thiếu, KHÔNG lặp lại cái đã cover ở tầng khác.
- __Đọc contract gốc__ — với own dùng `srs/{feature}-spec.md` + OpenAPI nội bộ (nếu có); với 3rd dùng `api-summary.md` + __OpenAPI partner gốc__ (re-parse field required/enum/min-max — summary đã lược phần kỹ thuật theo rule `/api-doc`).
- __Format CỐ ĐỊNH__ (parser-friendly cho `/api-test` + QA tool): bảng giữa marker `<!-- ACL:START -->`/`<!-- ACL:END -->`, cột cố định (xem dưới), `#` numbered __liên tục xuyên suốt__. Fixtures giữa `<!-- FIX:START -->`/`<!-- FIX:END -->`.
- __Confidence column__ — mỗi row 🟢 (doc đủ) hoặc 🟡 (suy đoán, cần xác nhận). 🔴 KHÔNG thành row.
- __Index/MD là source of truth → preview HTML__ — `api-checklist.md` là gốc; `preview.html` copy literal từ template (lần đầu); `data.js` regen mỗi lần chạy (parse cả FIX + ACL table). Mirror cơ chế `/test-checklist`.
- __Secret KHÔNG vào checklist__ — key/token thật chỉ tham chiếu bằng TÊN biến (`PAYGATE_KEY` ở `bruno/.env`). Fixtures ghi magic value test (vd `tok_chargeable`) nhưng KHÔNG ghi production secret.
- __IT-BA framing__ — checklist viết góc nhìn hành vi API observable (request gì → HTTP/error gì), KHÔNG bàn implementation (DB, framework, code). Vietnamese-first; GIỮ NGUYÊN method/path/field/error-code/token.
- __L1 plan preview__ trước Write. __L3 iterate__ max 3 vòng cho nội dung checklist (render bảng trong chat). __L2 diff__ khi update file đã tồn tại.
- __BA conventions__ — Owner từ memory `user-identity`, no-re-ask, IT-BA framing. Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong

- __Discovery KHÔNG optional__ — bỏ qua = quay lại đúng bệnh "input mơ hồ" mà skill sinh ra để chữa. Auto-extract rồi MỚI hỏi gap.
- __Đừng hỏi cái doc đã có__ — auto-extract trước, chấm 🟢 thì im. Hỏi thừa = vi phạm no-re-ask, user khó chịu.
- __🔴 KHÔNG biến thành item bịa__ — đây là khác biệt với mọi skill khác. Thà ít item thật còn hơn nhiều item đoán. 🔴 → OQ.
- __own vs 3rd đảo nguồn 🟢/🟡/🔴__ — own: business-anchor 🟢 sẵn (full SRS), gap ở contract-shape/env/seed. 3rd: contract 🟢 (partner doc), gap ở trigger/business-map. Đừng dùng nhầm round nặng.
- __Survey test cũ để bổ sung, không lặp__ — UI đã test login form validation thì checklist API `/auth/login` tập trung backend reject sai password / lockout BR / token issuance — KHÔNG lặp UI validation.
- __Trigger phải truy về Fixtures__ — row 🟢 mà Trigger không có trong Fixtures = lỗ hổng; hoặc bổ sung Fixtures hoặc hạ xuống 🟡 + OQ.
- __Secret không vào file__ — magic value test OK (tok_chargeable), production key chỉ tên biến.
- __Auto No cho:__ rate-limit (cần spam), concurrency (cần song song), webhook (cần chờ async), chained cần state nhiều bước. Nghi ngờ → No.
- **`#` liên tục là HARD** — `/api-test` + QA tool parse theo số. Add giữa = renumber phía sau.
- **Body có `|`** trong Trigger/Assert → vỡ bảng md. Reformulate.
- __mixed cẩn thận 2 tầng__ — own endpoint thành công nhưng partner downstream lỗi → item riêng (vd "PayGate trả 402 thì /payment/charge của mình trả gì cho client?").
- __Endpoint own chưa build__ — vẫn viết checklist từ SRS (test sẽ chạy khi backend xong); đánh 🟡 + note "chờ backend", KHÔNG block.

## Inputs — nói tự nhiên, KHÔNG flag

User chỉ cần __gọi skill + đưa context kiểu BA__, skill phân tích rồi bắt đầu hỏi làm rõ:

- __Nói tính năng / scope__: "tạo checklist test API cho login", "test endpoint charge của PayGate", "API thanh toán".
- __Đính kèm hình ảnh tài liệu API__ (screenshot Swagger/Postman/trang doc) — skill đọc hình.
- __Dán nội dung API__ trực tiếp: OpenAPI/YAML, response mẫu, ví dụ curl, bảng error code.
- __Đưa link__ trang doc API (skill WebFetch).

Skill __tự suy mọi thứ từ context__, KHÔNG bắt user khai báo:
- __Loại API__ (own/3rd/mixed) — từ nghiệp vụ + nguồn doc (Approach bước 1).
- __New hay update__ — file `api-checklist.md` đã tồn tại + user nói "thêm/cập nhật/bổ sung" → update; "tạo mới/làm lại" → new; user nói "review/check coverage" → review-only. __Không rõ → hỏi 1 câu__ rồi đi tiếp.
- __Feature__ — từ tên tính năng user nói; mơ hồ → hỏi/pick từ danh sách.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có folder: !`for d in docs/*/; do [ -d "$d" ] && basename "$d"; done | grep -v '^_' | head -20`
api-summary (3rd-party) có sẵn: !`for d in docs/*/integration/api-summary*.md; do [ -f "$d" ] && echo "$d"; done | head -10`
SRS spec (own API contract) có sẵn: !`for d in docs/*/srs/*-spec.md; do [ -f "$d" ] && echo "$d"; done | head -10`
API checklist đã có: !`for d in docs/*/test/api/api-checklist.md; do [ -f "$d" ] && echo "$d"; done | head -10`
Test đã build (để tránh trùng): !`for d in docs/*/test/checklist/*-checklist-index.md docs/*/test/api/api-tests.md docs/*/integration/api-tests.md; do [ -f "$d" ] && echo "$d"; done | head -10`

## Output

```
docs/{feature}/test/api/
  api-checklist.md       # ← MD source of truth: Fixtures + bảng + coverage + OQ
  preview.html           # viewer cột API (copy literal từ template lần đầu, sau skip)
  data.js                # regen mỗi lần chạy (window.API_CHECKLIST)
```

Folder `test/api/` tạo mới nếu chưa có (cùng level `test/checklist/`, `test/testcases/`). `preview.html` copy 1 lần từ `_templates/api-checklist-preview.html` (skip nếu đã có). `data.js` luôn regen.

## api-checklist.md — cấu trúc file

Frontmatter v2 đầy đủ (review-unit file):

```yaml
---
type: api-checklist
feature: {feature}
api_type: own | 3rd | mixed     # loại API chính của checklist này
status: draft
updated: {date}
links: [<sources đã đọc: srs/{feature}-spec.md hoặc api-summary*.md, openapi path, test artifacts surveyed>]
---

(Env note cho changelog.md: `[{api_type}] discovery {R} round → {N} items, {G} OQ ({K} endpoint)`)
```

__Mục 1 — Hiểu API (Discovery summary):__ 3-6 dòng prose tóm tắt API làm gì, base URL/env, auth, độ phủ doc. Liệt kê endpoint in-scope.

__Mục 2 — Fixtures (test data + env):__

```markdown
<!-- FIX:START -->
| Loại | Tên | Value | Ghi chú |
|------|-----|-------|---------|
| env | mock base | http://localhost:4242 | committed |
| magic token | tok_chargeable | — | charge thành công |
| magic token | tok_insufficient | — | → 402 insufficient_funds |
| known id | customer | cus_demo_123 | cho GET / chained case |
| rate limit | charges | 30 req / 10s | → 429 rate_limited |
| auth key | PAYGATE_KEY | (bruno/.env) | KHÔNG ghi value thật |
<!-- FIX:END -->
```

__Mục 3 — Checklist:__ bảng cột cố định, `#` liên tục:

```markdown
<!-- ACL:START -->
| # | API | Dir | Endpoint | Dimension | Scenario | Trigger | HTTP | Expected Result | Ref | P | Auto | Conf |
|---|-----|-----|----------|-----------|----------|---------|------|--------------|-----|---|------|------|
| 1 | 3rd:paygate | out | POST /v1/charges | Happy | amount+currency+source hợp lệ | tok_chargeable | 201 | status=succeeded | FR-pp-002 | 1 | Yes | 🟢 |
| 2 | 3rd:paygate | out | POST /v1/charges | Validation | thiếu source | bỏ field source | 400 | missing_field | E-pp-001 | 1 | Yes | 🟢 |
| 3 | 3rd:paygate | out | POST /v1/charges | Business error | thẻ thiếu số dư | tok_insufficient | 402 | insufficient_funds | E-pp-002 | 1 | Yes | 🟢 |
| 4 | 3rd:paygate | out | POST /v1/charges | Auth | thiếu/sai key | key rỗng | 401 | unauthorized | — | 2 | Yes | 🟡 |
| 5 | 3rd:paygate | out | POST /v1/charges | Idempotency | lặp Idempotency-Key cùng body | gọi 2 lần cùng key | 201 | không charge trùng | NFR-pp-003 | 2 | No | 🟡 |
| 6 | 3rd:paygate | in | POST /webhooks/paygate | Inbound-webhook | event "charge.succeeded" chữ ký hợp lệ | payload ký HMAC đúng | 200 | Premium kích hoạt; event ghi 1 lần | FR-pp-004 | 1 | No | 🟡 |
<!-- ACL:END -->
```

Quy ước cột:
- __API__ (`test_layer`) — `own` / `3rd:{provider}` / `mixed:{provider}`. Xác định lane test (own/partner/E2E, `api-integration.md` Mục 3).
- __Dir__ (`direction`) — `out` (outbound, app gọi ra) / `in` (inbound, đối tác gọi vào = webhook). Quyết định dimension đặc thù (`api-integration.md` Mục 4).
- __Endpoint__ — `METHOD /path` nguyên gốc.
- __Dimension__ — nhóm test (xem catalog Approach bước 4): Happy / Validation / Enum-boundary / Business error / Auth / Not-found / Idempotency / Rate-limit / Pagination / Concurrency / Contract / Env-smoke / Webhook-polling / __Inbound-webhook__ (signature/idempotency/retry cho chiều `in`).
- __Scenario__ — 1 câu mô tả hành vi test (Vietnamese, giữ identifier gốc).
- __Trigger__ — input/state/giá trị nào provoke kết quả này (link tới Fixtures). Đây là thứ `/api-test` dùng ráp body. KHÔNG để trống ở row 🟢.
- __HTTP__ — mã status mong đợi.
- __Expected Result__ — kết quả quan sát được kỳ vọng, LUÔN điền đủ cho cả happy lẫn error (không chỉ error path): assertion body (error-code / dotpath=value) __+ side-effect / state-change__ (vd "account→verified", "tất cả session revoked", "no half-account created", "audit log entry"). Status code đã ở cột HTTP nên KHÔNG lặp lại. Mức chi tiết = status + assertion chính + side-effect; liệt kê từng field response để dành `/api-test` (assert) + `/api-map` (field mapping). `—` = chỉ check HTTP (hiếm).
- __Ref__ — `FR-/NFR-/BR-/E-{feature}-NNN` neo nghiệp vụ (own: từ SRS; 3rd: map ngược FR nếu có).
- __P__ — priority 1(Critical)/2(High)/3(Medium)/4(Low).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- __Auto__ — `Yes` (call/assert tự động được) / `No` (cần state/manual: rate-limit spam, concurrency, webhook chờ).
- __Conf__ — 🟢 doc đủ / 🟡 suy đoán cần xác nhận.

__Mục 4 — Coverage matrix:__ bảng endpoint × dimension, ô = số item (hoặc `—`). Để thấy ngay endpoint nào thiếu auth-case / list nào chưa test pagination.

__Mục 5 — Câu hỏi mở:__ mọi 🔴 chưa giải + gap nghiệp vụ. Format `- [ ] OQ: {câu hỏi cụ thể}`.

## Approach

### 0. Phân tích input user đưa (trước mọi thứ)
Gom mọi context user cung cấp thành nguồn hiểu:
- __Tên tính năng / mô tả__ → resolve feature folder. Mơ hồ → hỏi/pick từ danh sách.
- __Hình ảnh tài liệu API__ (screenshot Swagger/Postman/trang doc) → Read ảnh, trích endpoint/field/error.
- __Nội dung API dán trực tiếp__ (OpenAPI/YAML, response mẫu, curl, bảng error) → parse luôn.
- __URL doc__ → WebFetch.
- __Detect new vs update__: file `docs/{feature}/test/api/api-checklist.md` tồn tại + user nói "thêm/cập nhật/bổ sung" → update (L2 diff); "tạo mới/làm lại" → overwrite; "review/check coverage" → review-only. File tồn tại nhưng intent không rõ → __hỏi 1 câu__ ("Checklist này đã có rồi — cập nhật, làm mới, hay chỉ review coverage?") rồi đi tiếp.

### 1. Tự hiểu loại API (own/3rd/mixed) — KHÔNG flag
Skill __suy ra từ nghiệp vụ + nguồn doc__, không bắt user khai báo:
- Có `integration/api-summary*.md` / partner OpenAPI (PayGate, MailGate, vendor ngoài) → __3rd__.
- Có `srs/{feature}-spec.md` với FR mô tả endpoint của chính dự án / OpenAPI nội bộ, KHÔNG có partner doc → __own__.
- Endpoint own mà flow/SRS cho thấy gọi sang partner (vd `/payment/charge` → PayGate) → __mixed__.
- __Hiểu rõ rồi thì đi tiếp, KHÔNG hỏi lại__ (no-re-ask). Chỉ khi THẬT SỰ mơ hồ — nguồn không đủ phân biệt, hoặc cả own-doc lẫn partner-doc cùng mạnh — mới hỏi 1 câu confirm: "Checklist này test API của dự án mình, API đối tác, hay endpoint mình gọi đối tác?" → nhận trả lời → đi tiếp.
- Ghi kết quả vào frontmatter `api_type`. (Vẫn cho user override tự nhiên nếu họ nói rõ "đây là API đối tác".)

### 2. Auto-extract context (TRƯỚC khi hỏi)
- __KG chọn nguồn trước (rẻ hơn scan):__ chạy `node .claude/skills/kg/engine/kg-query.mjs coverage {feature}` (anti-join FR↔US/AC, E↔UC/AC — KHÔNG có map trực tiếp requirement→checklist) + `trace {feature} --all` (mọi edge VERIFIES/TESTED_BY tới checklist item nếu docs đã dùng CHK-ID format mới) để chọn doc/FR/E liên quan, rồi VẪN Read đầy đủ prose file đã chọn — map cuối cùng requirement→checklist dựng từ prose. Tuân `.claude/rules/kg-usage.md` (3 nghĩa vụ: `--all` khi bị cap · đọc mục "Phải Read tay" · `KG-ERROR` → scan trực tiếp như cũ).

Đọc theo loại — **own KHÔNG dùng `api-summary`** (đó là doc cho API đối tác; API mình đã có SRS):
- __own__: `srs/{feature}-spec.md` (FR + behavior + Error Matrix `E-` + BR), `srs/{feature}-erd.md` (shape payload), `srs/{feature}-flows.md`, `usecases/*`, `userstories/*` (US/AC) + __OpenAPI nội bộ nếu team có__ + nội dung user đính/dán (bước 0). SRS mô tả *behavior* chứ không mô tả REST shape (method/path/JSON) → phần đó lấy từ OpenAPI nội bộ hoặc discovery (round R2 Contract nặng). KHÔNG tạo/đọc api-summary cho own.
- __3rd__: `integration/api-summary*.md` (operations + error catalog) + __OpenAPI partner gốc__ (path từ `api-summary` frontmatter `links:`) → re-parse field required/enum/min-max. Chưa có api-summary → gợi ý `/api-doc` trước (hoặc dùng nội dung user dán/đính ở bước 0).
- __mixed__: own (SRS) cho tầng endpoint mình + 3rd (api-summary) cho tầng partner downstream.
- __Survey test hiện có__: `test/checklist/*`, `test/testcases/*`, `test/api/api-tests.md` (legacy `integration/api-tests.md` nếu chưa migrate) → map coverage đã có.

### 3. Dựng bản đồ hiểu biết + chấm 🟢/🟡/🔴
Cho __mỗi endpoint in-scope × mỗi dimension áp dụng__, chấm:
- 🟢 = doc đủ viết item testable (có trigger + expected rõ).
- 🟡 = suy đoán được nhưng chưa chắc (vd enum đoán từ tên field).
- 🔴 = thiếu hẳn (không biết cách trigger error / không có magic value / không có known ID / không rõ rate limit).

In bản đồ ngắn cho user thấy độ phủ + sắp hỏi gì.

### 4. Discovery loop (Phase D — TRÁI TIM skill)
Chỉ mở round cho cụm 🔴/🟡 (adaptive). Catalog round (chạy cái nào tuỳ gap; bỏ round đã 🟢 hết):

| Round | Probe | Nặng cho loại |
|-------|-------|---------------|
| R1 — Scope | endpoint nào in-scope (đừng test thừa); tầng nào UI/integration đã cover | cả hai |
| R2 — Contract | field required/optional, enum, min/max, shape lồng nhau còn mờ | own (SRS mô tả behavior không phải REST shape) |
| R3 — Auth & Env | key nào, env test (mock/sandbox/prod/local/staging), base URL, gọi được không | cả hai |
| R4 — Error triggers ★ | cách provoke từng error/HTTP code doc không nói | 3rd (partner error) |
| R5 — Fixtures | magic value, sample hợp lệ, known good IDs, boundary values | cả hai |
| R6 — State/limits | chained deps (refund cần charge_id), idempotency semantics, rate limit số cụ thể | cả hai |
| R7 — Business anchor | map FR/BR/E-code, error nào critical (set P1) | own giàu sẵn 🟢; 3rd phải map ngược |

__Quy tắc loop:__ một round một chủ đề → chờ trả lời → ghi vào bản đồ/Fixtures → re-assess → round kế. Push exact values. No-re-ask. Sau mỗi round in lại bản đồ (`🟢 N 🟡 M 🔴 K · còn thiếu: ...`). Hết 🔴 → đủ. User gõ `đủ rồi` giữa chừng → còn 🔴 thành OQ, qua draft.

### 5. Sinh checklist theo confidence
Auto-build dimension mỗi endpoint (bỏ cái không áp dụng — vd GET không có Idempotency body):
- 🟢 → item đầy đủ Trigger + Assert + Ref.
- 🟡 → item + Conf 🟡 (đánh dấu cần xác nhận).
- 🔴 còn lại → __KHÔNG tạo item__; ghi OQ Mục 5.
Numbered liên tục. Set P/Auto theo rule (core flow + security + data-integrity = P1; rate-limit/concurrency/webhook = Auto No).

### 6. L3 iterate — render bảng checklist trong chat
```
[/api-checklist] Phiên bản 1:  (api_type=3rd:paygate · 5 endpoint · 🟢24 🟡6 🔴3→OQ)

POST /v1/charges
  Happy        | tok_chargeable      → 201 status=succeeded         [P1][Yes][🟢] FR-pp-002
  Validation   | bỏ field source     → 400 missing_field            [P1][Yes][🟢] E-pp-001
  Business err | tok_insufficient    → 402 insufficient_funds       [P1][Yes][🟢] E-pp-002
  ...
Câu hỏi mở (3): trigger rate_limited? · known sub_id cancel? · ...

Đồng ý / Sửa: <thêm/bớt scenario> / Hủy:
```
User `Sửa: ...` → regen v2, renumber. Max 3 vòng.

### 7. L1 plan preview (sau Đồng ý)
Prose BA-facing: sẽ tạo `docs/{feature}/test/api/api-checklist.md` với {N} item / {K} endpoint, {G} câu hỏi mở; Fixtures {F} dòng; coverage {dimension list}. Apply? (Y/sửa).

### 8. Write + regen preview
- Write `api-checklist.md` (frontmatter v2 + 5 mục, FIX + ACL markers).
- `preview.html`: copy literal từ `_templates/api-checklist-preview.html` nếu chưa có.
- `data.js`: regen — parse FIX + ACL table → `window.API_CHECKLIST = {feature, updated, api_type, fixtures:[...], items:[...]}`. Write đè.
- Changelog vào chính `api-checklist.md`.

### 9. Final report
```
✅ API Checklist created
   MD:      docs/{feature}/test/api/api-checklist.md
   Preview: docs/{feature}/test/api/preview.html  (double-click mở browser)
   Loại: {api_type} · {K} endpoint · {N} items · OQ còn: {G}
   Độ hiểu: 🟢{a} 🟡{b} (🔴{c}→OQ) · P1={p1} · Auto Yes/No={x}/{y}

Recommended next:
  - /api-test {feature}     — expand checklist → request Bruno chạy được (đọc checklist này)
  - Giải {G} OQ trước nếu muốn cover nốt phần 🔴
  - /api-map --feature {feature}   — nếu cần mapping field ra UI
```

## MD → preview (preview.html + data.js)

Double-click `preview.html` mở browser file:// (KHÔNG cần server). Load `data.js` qua `<script src="data.js">`.

`data.js` regen mỗi lần: đọc `api-checklist.md`, parse FIX table + ACL table → 
```js
window.API_CHECKLIST = {
  feature: "premium-payment", updated: "2026-05-29", api_type: "3rd",
  fixtures: [ { type:"env", name:"mock base", value:"http://localhost:4242", note:"committed" }, ... ],
  items: [ { num:1, api:"3rd:paygate", endpoint:"POST /v1/charges", dimension:"Happy",
             scenario:"...", trigger:"tok_chargeable", http:"201", expected:"status=succeeded; Premium kích hoạt",
             ref:"FR-pp-002", priority:1, auto:"Yes", conf:"🟢" }, ... ]
};
```
Preview có filter theo API-type / endpoint / dimension / HTTP / priority / confidence + search + export Excel + panel Fixtures. Sửa MD trực tiếp → chạy lại `/api-checklist <feature>` để refresh `data.js`.

## Chain xuống /api-test

`/api-test` được rewire (soft gate): ưu tiên đọc `test/api/api-checklist.md` → expand __1:1__ mỗi row ACL thành 1 TC row (Endpoint→Method+Path; Trigger+Fixtures→Body; HTTP→assert status; __Expected Result→assert body__ — Bruno biến prose kỳ vọng thành assert chạy được `res.body.x: eq y`; side-effect cần state thì note Auto No). KHÔNG tự thêm/bớt scenario. Chưa có checklist → warn "chưa duyệt scope, đề xuất /api-checklist trước" + fallback đọc summary như cũ.

## Review mode (khi user nói "review giùm" / "check coverage")
Analysis-only, KHÔNG edit. Đọc checklist + sources → findings theo @../../rules/review-format.md:
- BLOCKING — endpoint in-scope thiếu hẳn dimension bắt buộc (Happy/Auth/Validation); item 🟡/🔴 mà /api-test đã chạy (false coverage).
- WARNING — priority sai (auth marked P3), Auto flag sai (rate-limit marked Yes), Trigger trống ở row 🟢.
- SUGGESTION — gộp item; missing edge phổ biến (idempotency, pagination cursor, concurrent).

## Update mode (khi context cho thấy update — file đã có + user nói "update/thêm/bổ sung")
L2 diff per endpoint group. Re-run discovery chỉ cho phần mới/đổi (no-re-ask phần đã chốt). Default renumber liên tục. Changelog: `[{api_type}] updated {N} items, resolved {R} OQ`.

## References
- @../../rules/api-integration.md
- @../../rules/feature-bootstrap.md
- @../../rules/ba-conventions.md
- @../../rules/approval-gate.md
- @../../rules/kg-usage.md
- @../../rules/naming-conventions.md
- @../../rules/delivery-readiness.md
- @../../rules/changelog.md
- @../../rules/review-format.md
- @../../rules/resolve-oqs.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
