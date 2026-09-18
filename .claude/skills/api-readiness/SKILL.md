---
name: api-readiness
description: Dùng khi cần kiểm tra Go-live / Operational Readiness trước production cho 1 feature tích hợp API.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[--feature <slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /api-readiness — Go-live / Operational Readiness Gate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Dựng **gate sẵn sàng vận hành trước production** cho 1 feature tích hợp API. **Test PASS không đồng nghĩa đã sẵn sàng production**: cần có kế hoạch cutover, người chịu trách nhiệm khi có sự cố, phương án giảm thiểu ảnh hưởng khách hàng và quyết định go/no-go rõ ràng.

**Output duy nhất**: `docs/{feature}/integration/api-readiness.md`.

BA/PO chỉ cần **biết và ghi lại kế hoạch vận hành theo góc nhìn nghiệp vụ**; không tự cấu hình hạ tầng, monitoring hay feature flag.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **1 output cố định** — `docs/{feature}/integration/api-readiness.md`. File đã tồn tại → tự động chuyển sang update mode (L2 diff), không refuse.
* **Đây là bước [5] cuối pipeline** theo `@../../rules/api-integration.md`, chạy sau `/api-test`.
* **Đọc nguồn, không suy đoán trạng thái** — mọi kết luận readiness phải dựa trên `api-design.md` (blueprint), `api-tests.md` (evidence test) và `api-summary.md` (SLA/deprecation đối tác, nếu có).
* **Soft gate cho việc SOẠN, hard cap cho VERDICT** — chưa có feature/blueprint/test → warn rõ phần thiếu, đề xuất `/api-test` trước; vẫn cho phép *lập kế hoạch* readiness ở trạng thái `⚠️ thiếu`/`❓ cần xác nhận`. NHƯNG **thiếu `api-tests.md` → verdict tối đa `GO CÓ ĐIỀU KIỆN`, KHÔNG bao giờ `GO` tuyệt đối** (nếu không, "gate" mất nghĩa).
* **IT-BA framing** — BA ghi kế hoạch rollout theo giai đoạn, owner nhận cảnh báo, tiêu chí rollback theo ảnh hưởng nghiệp vụ, lịch đối soát và runbook phục hồi thủ công. Dev/DevOps triển khai cấu hình flag, monitoring, alerting và hạ tầng.
* **Checklist bắt buộc** — mỗi mục có đủ `Trạng thái | Owner | Ghi chú`, dùng đúng nhãn: `✅ sẵn sàng`, `⚠️ thiếu`, `❓ cần xác nhận`.
* **L1 approval** trước Write. **L2 diff** khi file đã tồn tại (update mode tự động).
* **Cross-link** — frontmatter `links:` trỏ tới blueprint, kết quả test, API summary và tài liệu liên quan thực tế.
* **Vietnamese-first**.
* Tuân `@../../rules/api-integration.md`, `@../../rules/approval-gate.md`, `@../../rules/feature-bootstrap.md`, `@../../rules/ba-conventions.md` và `@../../rules/naming-conventions.md`.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **PASS sandbox không phải PASS production** — credential, endpoint, allowlist, certificate, dữ liệu và cách vận hành có thể khác. Luôn tách rõ bằng chứng theo environment + ngày chạy.
* **Version/deprecation + SLA ở đây là THEO DÕI VẬN HÀNH liên tục** (đối tác đang pin version nào, khi nào deprecate, SLA thực tế khi chạy) — KHÁC `/api-assess` (đánh giá một lần để CHỌN). Đừng đánh giá lại lựa chọn provider ở đây; chỉ theo dõi để cảnh báo sớm.
* **Monitoring phải nói được outcome nghiệp vụ** — ví dụ “giao dịch tạo thành công”, “trạng thái học viên được đồng bộ”, không chỉ “API trả 200”.
* **Owner không được là tên đội chung chung** nếu cần phản ứng sự cố; phải xác định người/vai trò nhận alert và đường escalation.
* **Rollback không chỉ là tắt kỹ thuật** — mô tả khách hàng sẽ thấy gì, dữ liệu nào cần đối soát và đội vận hành xử lý các case dang dở thế nào.
* **Version/deprecation là rủi ro vận hành liên tục** — ghi rõ version đối tác đang dùng, mốc deprecate đã biết và impact nghiệp vụ nếu contract đổi.
* **Không bắt BA tự triển khai** feature flag, canary, alert, gateway, certificate hay monitoring. BA ghi kế hoạch và người chịu trách nhiệm; dev/DevOps thực hiện.
* **Không bắt chước Pact Broker/consumer-driven contract testing đầy đủ**, gateway/CI-CD config hay security testing OWASP sâu — các phần này vượt phạm vi BA/PO.
* **Update mode giữ evidence cũ có ngữ cảnh** — chỉ thay kết luận khi có evidence mới; luôn giữ hoặc nêu lại environment và thời điểm để tránh hiểu nhầm PASS cũ là trạng thái hiện tại.

## Inputs

```text
/api-readiness                          # interactive: pick feature nếu mơ hồ
/api-readiness --feature premium-payment
```

`--feature` không bắt buộc — auto-detect từ ngữ cảnh (feature đang làm dở), mơ hồ mới hỏi picker. `api-readiness.md` đã tồn tại → tự động vào update mode, muốn sửa thì gọi lại skill và nói phần kế hoạch cần đổi.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Blueprint có sẵn: !`for d in docs/*/integration/api-design.md; do [ -f "$d" ] && echo "$d"; done | head -10`
Kết quả test có sẵn: !`for d in docs/*/test/api/api-tests.md docs/*/integration/api-tests.md; do [ -f "$d" ] && echo "$d"; done | head -10`
API summary có sẵn: !`for d in docs/*/integration/api-summary.md; do [ -f "$d" ] && echo "$d"; done | head -10`

## Approach

1. **Parse args** — `--feature` optional, auto-detect từ ngữ cảnh; mơ hồ → prompt picker.

2. **Đọc nguồn:**
   * `docs/{feature}/integration/api-design.md` (ưu tiên) — lấy luồng nghiệp vụ, source of truth, degraded mode, reconciliation và các phụ thuộc đối tác.
   * `docs/{feature}/test/api/api-tests.md` (canonical; fallback legacy `integration/api-tests.md` nếu chưa migrate) — lấy kết quả PASS/FAIL kèm môi trường và thời điểm chạy; không đọc PASS cũ như trạng thái production hiện tại.
   * `docs/{feature}/integration/api-summary.md` (nếu có) — lấy SLA, đầu mối đối tác, version API và lịch deprecation.
   * Tài liệu SRS/PRD liên quan (nếu có) — đối chiếu business outcome, mức ảnh hưởng và người phê duyệt.

3. **Xác định các điểm chưa đủ bằng ngôn ngữ nghiệp vụ** — không tự điền `✅` khi chưa có evidence hoặc owner. Với mỗi điểm thiếu, ghi rõ cần ai xác nhận và trước thời điểm nào.

4. **Dựng checklist readiness** — mỗi mục là một row với cấu trúc:
   | Hạng mục | Trạng thái | Owner | Ghi chú |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   
   Bao gồm tối thiểu:
   * **Kết quả test critical-path**: toàn bộ test scope quan trọng PASS (env prod-like + ngày chạy) — đây là tiền đề của cả gate, đọc từ `api-tests.md`. Có FAIL/skip chưa xử lý → điều kiện go/no-go hạng nhất.
   * Sandbox → production cutover.
   * Ownership và lịch rotation production credential.
   * Khác biệt endpoint, allowlist, certificate giữa các môi trường.
   * **Rate-limit/quota production** đã xác nhận (sandbox thường nới, prod bóp — tích hợp có thể chết vì 429 dù test đậu).
   * **Ước lượng volume ngày go-live vs SLA/năng lực đối tác** (đối tác chịu được tải thật không).
   * Feature flag và chiến lược rollout (canary/phased).
   * Monitoring theo **business outcome**.
   * Alert owner và escalation path.
   * Đầu mối incident phía đối tác.
   * Kill-switch, fallback hoặc degraded mode.
   * Lịch reconciliation/đối soát.
   * Manual recovery runbook.
   * Production smoke test.
   * Tiêu chí rollback + **cửa sổ cutover an toàn** (tránh giờ cao điểm; kế hoạch giờ thấp điểm).
   * Theo dõi version/deprecation: đối tác đang pin version nào, khi nào họ deprecate.
   * Impact khi contract thay đổi.
   * Go/no-go sign-off.

5. **Dựng quyết định go/no-go** — cuối tài liệu có bảng:
   | Điều kiện quyết định | Bằng chứng / ghi chú | Người xác nhận | Trạng thái |
   
   Kết luận chỉ là một trong ba trạng thái: `GO`, `GO CÓ ĐIỀU KIỆN`, hoặc `NO-GO`. Nếu còn mục `⚠️ thiếu` ảnh hưởng tiền, dữ liệu, quyền lợi khách hàng hoặc không có owner xử lý sự cố → mặc định đề xuất `NO-GO` hoặc `GO CÓ ĐIỀU KIỆN`, không ghi GO tuyệt đối.
   * **Chưa có `api-tests.md` hoặc test critical còn FAIL/skip → verdict tối đa là `GO CÓ ĐIỀU KIỆN`, KHÔNG bao giờ `GO` tuyệt đối.** Gate mất nghĩa nếu cho GO khi thiếu bằng chứng test.

6. **L1 plan preview** (prose BA-facing) — nêu file sẽ tạo/cập nhật, các kế hoạch cutover–rollout–xử lý sự cố sẽ được ghi nhận, số mục đã sẵn sàng/còn thiếu/cần xác nhận và các sign-off cần có. Apply? (Y/sửa).

7. **Write `api-readiness.md`** với frontmatter chuẩn (`type: api-readiness`, `feature`, `status`, `updated`, `links: [api-design, api-tests, api-summary...]`). Body:
   * **Mục 1 — Phạm vi go-live**.
   * **Mục 2 — Checklist sẵn sàng vận hành**.
   * **Mục 3 — Kế hoạch rollout và giảm thiểu ảnh hưởng**.
   * **Mục 4 — Xử lý sự cố, đối soát và phục hồi**.
   * **Mục 5 — Theo dõi version và thay đổi contract**.
   * **Mục 6 — Quyết định go/no-go**.
   * **Mục 7 — Câu hỏi mở / điều kiện còn thiếu**.

8. **Activity log** — trước Write set env `CLAUDE_SKILL_NAME=/api-readiness` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=readiness {ready} ready, {missing} missing` (≤80 ký tự); hook ghép cả dòng vào `docs/_shared/changelog.md` — KHÔNG nhét lịch sử vào chính `api-readiness.md`.

9. **Output report:**
   ```text
   ✅ Readiness gate: docs/{feature}/integration/api-readiness.md
      Sẵn sàng: {N} | Thiếu: {K} | Cần xác nhận: {M}
      Quyết định đề xuất: {GO | GO CÓ ĐIỀU KIỆN | NO-GO}

   Next:
     - Hoàn tất {K + M} điều kiện trước ngày cutover
     - Lấy sign-off từ các owner trong Mục 6
     - Cập nhật lại /api-readiness khi có evidence mới
   ```

## Output

`docs/{feature}/integration/api-readiness.md` — go-live gate (`type: api-readiness`): cutover, feature-flag, monitoring, rollback, SLA/deprecation + bảng go/no-go.

Hook tự ghi 1 dòng vào `docs/_shared/changelog.md`.

## References

* @../../rules/api-integration.md
* @../../rules/approval-gate.md
* @../../rules/feature-bootstrap.md
* @../../rules/ba-conventions.md
* @../../rules/naming-conventions.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
