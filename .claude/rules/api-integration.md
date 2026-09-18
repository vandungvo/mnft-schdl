# API Integration — rule chung cho họ skill tích hợp API‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Rule chung cho **7 skill** họ tích hợp API: `/api-assess`, `/api-doc`, `/api-design`, `/api-map`, `/api-checklist`, `/api-test`, `/api-readiness`. Mỗi skill MUST reference file này trong Constraints + References. Nó trả lời: **thứ tự pipeline, ranh giới own/3rd/mixed, chiều outbound/inbound, source-of-truth nào là gốc, và đâu là việc BA đâu là việc dev.**
>
> Nền tảng: report `docs/reports/2026-07-14-api-integration-flow-review.md` (2 nguồn AI độc lập, kết quả hội tụ). Vai người dùng: **IT Business Analyst / Product Owner**, KHÔNG phải dev — xem `ba-conventions.md` Mục 3 (IT-BA framing) + memory `feedback_api_in_ba_scope`.

## 1. Mục tiêu thật của pipeline‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **Không phải "đọc và test API".** Là "đưa một năng lực PHỤ-THUỘC-ĐỐI-TÁC vào sản phẩm và vận hành nó an toàn."

Đọc contract + sinh test chỉ là khúc giữa. Một tích hợp thành công cần 2 đầu nữa: **quyết định có nên tích hợp không** (đầu vào) và **đưa lên production + vận hành khi đối tác đổi/lỗi** (đầu ra). Pipeline dưới đây có đủ 3 đoạn.

## 2. Thứ tự pipeline (7 skill)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
[0] /api-assess    Đánh giá đối tác (CÓ ĐIỀU KIỆN — chỉ khi chưa chốt provider / build-vs-buy)
         ↓
[1] /api-doc       Hiểu contract + năng lực API 3rd-party (read-only, KHÔNG gọi API)
         ↓         (own API: bỏ qua [0]+[1]; nguồn kỳ vọng = SRS/OpenAPI nội bộ)
[2] /api-design    ⭐ Integration Blueprint — thiết kế tích hợp nghiệp vụ
         ├── /api-map   field mapping (đưa vào đây, gate hội tụ trước [3])
         └── state-map + source-of-truth + flow/error/retry/idempotency/reconciliation + degraded-UX
         ↓
[3] /api-checklist Discovery → outline test. Khai báo test_layer (partner|own|mixed) + direction (outbound|inbound)
         ↓
[4] /api-test      Expand checklist → Bruno chạy được (traceability n–n, KHÔNG thêm scenario mới)
         ↓
[5] /api-readiness Go-live / Operational Readiness gate (cutover, flag, monitoring, rollback, SLA/deprecation, go/no-go)
```

**Gate hội tụ:** trong sơ đồ trên `/api-map` vẽ dưới `[2] /api-design` (├──) nhưng **thực thi độc lập** — chạy song song được, CHỈ cần hội tụ vào blueprint TRƯỚC khi chốt checklist (`[3]`). KHÔNG để `/api-map` là nhánh mồ côi không điểm gặp — `/api-map` Output report luôn nhắc bước `/api-design` để BA đóng vòng.

**Điều kiện chạy `[0]`:** chỉ khi chưa chốt provider / nhiều provider cạnh tranh / cân nhắc build-vs-buy / API quyết định phạm vi sản phẩm / cost-SLA-compliance-lock-in là yếu tố lớn. **Bỏ qua** khi: đối tác đã ký hợp đồng / hệ sinh thái áp đặt / thay đổi nhỏ trên tích hợp cũ / không có quyền chọn.

## 3. Ba lane test (own / 3rd / mixed) — KHÔNG chỉ khác "provider"‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Own, 3rd, mixed kiểm chứng **loại rủi ro khác nhau** → khai báo `test_layer` tường minh ở `/api-checklist` + `/api-test`:

| Lane | Kiểm chứng gì | Nguồn kỳ vọng | Auth |
|---|---|---|---|
| **partner-contract** (3rd) | Đối tác có hoạt động đúng tài liệu không? Sandbox phản ánh đúng behavior? Auth/rate-limit/error/webhook dùng được? | `api-summary.md` + OpenAPI partner gốc | bearer provider key |
| **own-api** | Backend MÌNH thực hiện đúng requirement + contract? Trả đúng business outcome/validation/status/error abstraction? | SRS/AC/OpenAPI nội bộ + blueprint | session-chain (login seed → cookie/JWT) |
| **mixed / E2E** | Own gọi partner, nhận callback, chuyển trạng thái, cập nhật UI, xử lý exception đúng? Retry/duplicate/timeout/delayed-webhook/reconciliation? | blueprint (`api-design.md`) | own-auth cho tầng own; provider-key cho tầng partner (KHÔNG trộn 1 `.bru`) |

> **KHÔNG tách own thành pipeline biệt lập hoàn toàn.** Tách **test-lane + nguồn kỳ vọng**, KHÔNG tách khỏi workflow. Nếu own pass riêng + 3rd pass riêng mà orchestration giữa 2 bên vẫn fail thì vô nghĩa — mixed/E2E lane mới là nơi xác nhận "tích hợp thành công". Cấu trúc đúng: **1 integration initiative = 3 lane trong 1 flow.**

## 4. Hai CHIỀU API — outbound vs inbound (webhook)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

`/api-checklist` + `/api-test` phân biệt 2 chiều (cột `direction`):

| Chiều | Là gì | Cách test khác nhau |
|---|---|---|
| **outbound** | App MÌNH gọi RA đối tác (`POST /v1/charges`) | request-assert thường (đã có) |
| **inbound** | Đối tác gọi VÀO app mình (webhook "charge succeeded") | signature verify (HMAC) · idempotency (event trùng) · retry/backoff · out-of-order event |

> Payment thường CÓ webhook. Pipeline chỉ test outbound = **mù chiều inbound** = rủi ro thật (mất event → trạng thái lệch). `/api-design` blueprint phải mô tả webhook flow; `/api-checklist` phải có dimension inbound nếu đối tác có webhook.

## 5. Source of truth — tách bạch 4 tầng, KHÔNG để 2 cái cạnh tranh

Mỗi artifact sở hữu ĐÚNG một loại sự thật:

| Artifact | Là source of truth cho | KHÔNG phải |
|---|---|---|
| `api-design.md` (blueprint) | **Cách hệ thống phối hợp** (orchestration, state-map, source-of-truth nghiệp vụ) | test spec |
| `api-checklist.md` | **Coverage + test intent** (kiểm GÌ) | executable spec |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
| `api-tests.md` | **Test-case specification** (kiểm THẾ NÀO) | coverage authority |
| `.bru` | Executable derivative (sinh từ bảng) | source (sửa bảng, KHÔNG sửa .bru tay) |
| Kết quả run | **Evidence theo TỪNG lần chạy** (env + thời điểm) | specification / trạng thái hiện tại |

> **Khi hiển thị kết quả PASS/FAIL luôn kèm env + ngày** — đọc mỗi cột "Kết quả" mới nhất mà bỏ env/thời điểm dễ hiểu nhầm kết quả cũ là trạng thái hiện tại.

## 6. Traceability n–n (KHÔNG ép 1:1 cứng)

1 checklist item ≠ luôn luôn 1 test case:
* "validation số tiền" → nhiều TC (null / âm / zero / vượt-limit / precision).
* 1 test E2E → cover nhiều item cùng lúc (mapping + state + UI outcome).
* rate-limit / reconciliation → kịch bản nhiều bước, không phải 1 request.

**Quy tắc:** checklist item → 1..n test case; test case → 1..n requirement/risk. **Mỗi TC phái sinh giữ `TC-NN` unique liên tục** (runner match report↔bảng theo TC-id; tái dùng id = ghi đè kết quả). **Liên kết ngược về ACL item ghi ở cột phụ `Ref`** (vd `ACL#3`) trong bảng `api-tests.md`, KHÔNG nhét vào TC-id. Runner an toàn với cột phụ (index theo tên cột).

> **Vẫn chống bịa:** KHÔNG thêm scenario MỚI ngoài scope checklist đã duyệt. 1 item được **nở** thành nhiều TC cùng ý-định là OK; **đẻ ý-định mới** không có trong checklist là KHÔNG. Đây là nới "1:1 tuyệt đối" thành "n–n cùng intent", giữ nguyên tinh thần chống-bịa.

> **API-test n–n vs UI-test atomic 1:1 — khác BẢN CHẤT, cố ý (không bất nhất):** `/test-checklist`+`/test-cases` (UI) ép **1 item = 1 TC atomic** vì mỗi UI-behavior có 1 oracle rõ, và nguồn cho Playwright codegen 1:1. API-test giữ **n–n-qua-Ref** vì 1 API-intent (validation số tiền, rate-limit, reconciliation) bản chất nở thành nhiều request/nhiều bước không ép 1 TC được. Cả 2 CÙNG chống-bịa (không đẻ intent ngoài checklist); chỉ khác cardinality do bản chất UI-behavior vs API-contract. BA chốt 2026-07-15.

## 7. Ranh giới BA ↔ Dev trong họ skill này

BA test API kiểu Postman (đọc/gọi/test) là **đúng vai** (memory `feedback_api_in_ba_scope`). Cái VƯỢT biên:

| BA/PO SỞ HỮU | Dev/Architect quyết |
|---|---|
| Trigger nghiệp vụ · kết quả mong muốn · ý nghĩa trạng thái | Queue/topic cụ thể · thuật toán retry chi tiết |
| Trải nghiệm khi partner lỗi/chậm (degraded UX) | Storage/locking/transaction |
| Quy tắc retry/idempotency ở **cấp nghiệp vụ** ("không thu tiền 2 lần") | Framework/SDK/infrastructure |
| Reconciliation rule · manual recovery · SLA/business-impact · go-no-go | Logging/monitoring **implementation** |
| Input có ý nghĩa nghiệp vụ + expected business outcome | Assertion kỹ thuật sâu (schema đầy đủ, header/protocol) |

> **Runner (`bruno-runner.mjs`) + md→.bru + cookie/JWT plumbing + debug npx = dev-enablement, KHÔNG phải việc BA hằng ngày.** BA *dùng* Bruno + đọc kết quả; KHÔNG là owner mặc định của toolchain. Skill mô tả runner như hạ tầng dùng-sẵn, không bắt BA maintain.

## 8. Cái gì KHÔNG bắt chước (tránh over-engineer, giữ vai BA)

* **Pact Broker / Consumer-Driven Contract Testing đầy đủ** — cần 2 phía tự động publish vào Broker, không khả thi với đối tác ngoài. Chỉ học KHÁI NIỆM "hợp đồng phiên-bản-hóa + gate trước release" ở dạng nhẹ (đối chiếu api-summary/api-map khi đối tác đổi API).
* **API gateway + CI/CD config, feature-flag/canary engineering** — việc dev/DevOps. BA chỉ BIẾT + ghi kế hoạch, KHÔNG tự cấu hình.
* **Security testing OWASP sâu** — vượt biên "test kiểu Postman".
* **Spectral tự-động lint spec ĐỐI TÁC** — không sở hữu spec của họ nên không lint được; chỉ áp governance lên tài liệu CỦA MÌNH.

## Tóm tắt 1 dòng

> **7 skill = assess → doc → design(blueprint) → map → checklist → test → readiness. 3 lane (own/3rd/mixed), 2 chiều (outbound/inbound), source-of-truth tách 4 tầng, traceability n–n cùng-intent, BA sở hữu nghiệp-vụ-tích-hợp còn runner/plumbing là dev.**‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
