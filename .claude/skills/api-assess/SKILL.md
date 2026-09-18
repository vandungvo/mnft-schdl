---
name: api-assess
description: Dùng khi cần đánh giá đối tác/API hoặc cân nhắc build-vs-buy trước khi chọn provider cho 1 feature.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
argument-hint: "[--feature <slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /api-assess — Đánh giá đối tác API‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đánh giá **đối tác/API theo góc nhìn nghiệp vụ** để quyết định chọn/không chọn provider hoặc build-vs-buy **trước khi** tốn công đọc kỹ contract và kiểm tra tích hợp. **Output duy nhất**: `docs/{feature}/integration/api-assess.md`.

Đây là bước `[0]` có điều kiện trong pipeline tích hợp API: `assess → api-doc → api-design → api-map → api-checklist → api-test → api-readiness`. Dựa trên BABOK 10.49 Vendor Assessment và tư duy Thoughtworks build-vs-buy: BA/PO đánh giá mức phù hợp, năng lực, ràng buộc thương mại và rủi ro phụ thuộc đối tác — **không phải việc thiết kế hay phát triển kỹ thuật**.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Chỉ chạy khi có lý do lựa chọn**: chưa chốt provider; có nhiều provider cạnh tranh; đang cân nhắc build-vs-buy; API quyết định phạm vi sản phẩm; hoặc chi phí, SLA, tuân thủ, lock-in là yếu tố lớn.
* **Bỏ qua khi không còn quyền lựa chọn**: đối tác đã ký hợp đồng, hệ sinh thái áp đặt provider, hoặc thay đổi nhỏ trên tích hợp cũ. Nếu ngữ cảnh cho thấy provider đã chốt, hỏi đúng **1 câu xác nhận**: “Provider đã chốt; anh/chị vẫn cần đánh giá để lưu quyết định/rủi ro, hay bỏ qua `/api-assess` và sang `/api-doc`?”
* **1 output cố định** — `docs/{feature}/integration/api-assess.md`. File đã tồn tại → tự động chuyển sang update mode (L2 diff), không refuse.
* **Feature chưa có** → áp dụng feature-bootstrap nhóm A: xác nhận điểm vào, derive slug, rồi mới tạo cấu trúc feature cần thiết.
* **Scorecard nhẹ, có evidence** — mỗi tiêu chí phải có nhãn/điểm, ghi chú và nguồn bằng chứng; không biến tài liệu thành hồ sơ thầu khổng lồ.
* **So sánh nhiều provider** → dùng bảng cạnh nhau trên cùng một tiêu chí để người đọc thấy trade-off rõ ràng.
* **Verdict phải đứng cuối** — trình bày evidence, assumption và câu hỏi mở trước; không kết luận trước khi có căn cứ.
* **IT-BA framing** — mô tả năng lực nghiệp vụ, ảnh hưởng vận hành, trải nghiệm khi dịch vụ lỗi, chi phí và rủi ro phụ thuộc. Không yêu cầu hay suy diễn endpoint, SDK, framework, cấu trúc payload hoặc cách triển khai.
* **Nguồn có phân biệt mức tin cậy** — thông tin từ tài liệu/hợp đồng chính thức khác với lời chào hàng, review công khai hoặc giả định nội bộ; ghi rõ khi chưa xác minh.
* **L1 approval** trước Write. **L2 diff** khi file đã tồn tại (update mode tự động).
* **Cross-link** — frontmatter `links:` trỏ tới các tài liệu nguồn thực sự đã dùng: URD/BRD/PRD/SRS, proposal/hợp đồng, tài liệu provider hoặc quyết định liên quan.
* Tuân thủ `@../../rules/api-integration.md`, đặc biệt điều kiện chạy bước `[0]`, ranh giới BA ↔ dev và thứ tự pipeline.
* **Vietnamese-first**.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Provider đã chốt** — không tự tạo assessment chỉ vì pipeline có bước `[0]`; hỏi xác nhận một lần rồi tôn trọng quyết định bỏ qua.
* **Version/deprecation + SLA ở đây là tiêu chí CHỌN (đánh giá một lần để quyết), KHÔNG phải kế hoạch theo dõi vận hành** — việc theo dõi version đối tác đổi/deprecate + SLA khi chạy thật là của `/api-readiness` (bước [5]). Đừng ghi trùng kế hoạch monitoring vào đây.
* **Không có đủ evidence** — không ép ra điểm số giả. Dùng `Cần làm rõ`, nêu evidence còn thiếu và tác động tới quyết định.
* **Giá “từ” hoặc review công khai** — chỉ là tín hiệu tham khảo, không thay cho báo giá/hợp đồng hoặc cam kết SLA.
* **Capability coverage không phải danh sách endpoint** — đánh giá provider có đáp ứng outcome nghiệp vụ cần thiết hay không; chi tiết contract để `/api-doc`.
* **Integration effort là tương đối** — diễn đạt theo mức ảnh hưởng đến thời gian, phối hợp, vận hành và thay đổi quy trình; không suy đoán giải pháp kỹ thuật.
* **Compliance không chỉ là logo chứng nhận** — ghi rõ chứng nhận/ràng buộc áp dụng ở thị trường hoặc dữ liệu nào; thiếu bằng chứng thì để câu hỏi mở.
* **Lock-in phải có đường ra** — tối thiểu nêu quyền sở hữu dữ liệu, khả năng xuất/chuyển dữ liệu, thời hạn thông báo deprecation và phương án chuyển đổi ở mức nghiệp vụ.
* **Verdict không được đảo vị trí** — evidence và trade-off phải có trước khuyến nghị; nếu chưa đủ dữ liệu thì verdict là “chưa quyết định”.
* **Update mode giữ dấu vết quyết định** — không xóa assumption/evidence cũ; ghi rõ điều gì đã thay đổi và vì sao, trình L2 diff trước khi sửa.

## Inputs

```text
/api-assess                           # interactive: pick feature nếu mơ hồ
/api-assess --feature premium-payment
```

`--feature` không bắt buộc — auto-detect từ ngữ cảnh (feature đang làm dở), mơ hồ mới hỏi picker. Có thể cung cấp tên các provider, proposal, link tài liệu, mức ngân sách, ràng buộc tuân thủ hoặc quyết định cần đưa ra.

`api-assess.md` đã tồn tại → tự động vào update mode; đọc đầy đủ file cũ, chỉ hỏi phần chưa có hoặc đã thay đổi, sau đó trình L2 diff.

## Context (dynamic)

Today: !`date +%Y-%m-%d`  
Feature candidates: !`for d in docs/*; do [ -d "$d" ] && [ "$(basename "$d")" != "_shared" ] && echo "$(basename "$d")"; done | head -20`  
Existing assessments: !`for d in docs/*/integration/api-assess.md; do [ -f "$d" ] && echo "$d"; done | head -10`  
Upstream feature docs: !`for d in docs/*/*-{urd,brd,prd}.md docs/*/srs/*-spec.md; do [ -f "$d" ] && echo "$d"; done | head -20`

## Approach

1) **Parse args và kiểm tra điều kiện chạy** — xác định feature, provider/giải pháp đang cân nhắc và quyết định cần hỗ trợ. Nếu feature chưa có, chạy feature-bootstrap nhóm A. Nếu có dấu hiệu provider đã ký/chốt hoặc không có quyền chọn, hỏi một câu xác nhận có tiếp tục đánh giá hay chuyển sang `/api-doc`.

2) **Đọc bối cảnh nghiệp vụ**:
   * `docs/{feature}/{feature}-urd.md`, `{feature}-brd.md`, `{feature}-prd.md`, `srs/{feature}-spec.md` (nếu có) — hiểu outcome, phạm vi, ưu tiên và ràng buộc của feature.
   * Quyết định, meeting note, proposal, báo giá, hợp đồng hoặc tài liệu provider mà user cung cấp — lấy evidence về giá, SLA, chứng nhận, chính sách phiên bản và điều khoản dữ liệu.
   * File `api-assess.md` hiện có (update mode) — giữ evidence, assumption và quyết định cũ còn hiệu lực; không hỏi lại điều đã trả lời.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

3) **Làm rõ tối thiểu bằng ngôn ngữ nghiệp vụ** — chỉ hỏi các điểm còn thiếu có thể đổi kết luận: năng lực cần mua/xây, provider đang cân nhắc, thị trường/tuân thủ bắt buộc, khung chi phí, mốc ra mắt, mức chấp nhận gián đoạn và ai có quyền quyết định. User không có đủ dữ liệu → tiếp tục với assumption được gắn nhãn rõ.

4) **Thu thập evidence theo nhu cầu**:
   * Ưu tiên tài liệu chính thức, hợp đồng/proposal, trang SLA, bảng giá, chứng nhận và chính sách vòng đời API.
   * Nếu user muốn, có thể gợi ý dùng web search qua sub-agent để tra SLA, pricing và review đối tác; đây là lựa chọn hỗ trợ, **không bắt buộc**.
   * Không biến kết quả web thành sự thật đã xác minh: ghi nguồn, ngày tra cứu và mức độ tin cậy.

5) **Dựng scorecard** — đánh giá gọn theo các tiêu chí:
   | Tiêu chí | Điểm/nhãn | Ghi chú nghiệp vụ | Evidence |
   |---|---|---|---|
   | Business fit |  |  |  |
   | Capability coverage |  |  |  |
   | Integration effort tương đối |  |  |  |
   | Maturity/reliability (uptime lịch sử, số khách, incident công khai) |  |  |  |
   | SLA/support cam kết |  |  |  |
   | Sandbox/dev-experience (có thử được trước khi cam kết không) |  |  |  |
   | Security/compliance cert |  |  |  |
   | Cost/commercial constraint |  |  |  |
   | Data ownership/portability |  |  |  |
   | Versioning/deprecation policy |  |  |  |
   | Vendor lock-in + exit plan |  |  |  |

   * Một provider: dùng một scorecard, nhãn gợi ý `Phù hợp / Cần làm rõ / Rủi ro cao`.
   * Nhiều provider: dựng bảng so sánh cạnh nhau theo từng tiêu chí; chỉ chấm điểm khi tiêu chí và căn cứ đủ rõ, còn lại dùng nhãn kèm ghi chú.
   * Build-vs-buy: thay provider bằng các phương án `Tự xây` và `Mua/tích hợp`, so sánh trên cùng tiêu chí.

6) **Tổng hợp trade-off và rủi ro** — nêu năng lực nào được đáp ứng, khoảng trống nào làm thay đổi phạm vi, ràng buộc thương mại/vận hành nào cần xử lý, phương án giảm lock-in và điều kiện cần có để rời provider. Không đề xuất cơ chế kỹ thuật triển khai.

7) **L1 plan preview** (prose BA-facing) — nêu sẽ tạo mới/cập nhật `docs/{feature}/integration/api-assess.md`, các phương án được so sánh, số evidence đã có, assumption còn treo và câu hỏi cần chốt. Apply? (Y / sửa).

8) **Write `api-assess.md`** với frontmatter chuẩn (`type: api-assess`, `feature`, `status: draft`, `updated`, `links`) — KHÔNG `created`/`owner`/`changelog` (frontmatter diet). Body:
   * **Mục 1 — Bối cảnh và quyết định cần hỗ trợ**
   * **Mục 2 — Phương án đánh giá**
   * **Mục 3 — Scorecard và evidence**
   * **Mục 4 — Trade-off, rủi ro và phương án thoát**
   * **Mục 5 — Assumption và câu hỏi mở**
   * **Mục 6 — Khuyến nghị**: chọn/không chọn/build-vs-buy, điều kiện đi kèm, owner quyết định và bước tiếp theo.

9) **Activity log** — trước Write/Edit set env `CLAUDE_SKILL_NAME=/api-assess` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=assess {N} phương án, verdict {nhãn}` (≤80 ký tự); hook ghép cả dòng vào `docs/_shared/changelog.md` — không nhét lịch sử vào chính `api-assess.md`.

10) **Output report:**

   ```text
   ✅ Đánh giá đối tác: docs/{feature}/integration/api-assess.md
      Phương án: {N} | Khuyến nghị: {chọn/không chọn/build-vs-buy}

   Next:
     - Chốt {M} câu hỏi mở ở Mục 5
     - /api-doc --feature {feature} — đọc contract của provider được chọn
     - /api-design --feature {feature} — thiết kế tích hợp nghiệp vụ sau khi quyết định được phê duyệt
   ```

## Output

`docs/{feature}/integration/api-assess.md` — scorecard đánh giá đối tác (`type: api-assess`). Bare name trong `integration/` (nhất quán họ api-summary/api-map).

Hook tự ghi 1 dòng vào `docs/_shared/changelog.md`.

## References

* @../../rules/api-integration.md
* @../../rules/approval-gate.md
* @../../rules/feature-bootstrap.md
* @../../rules/ba-conventions.md
* @../../rules/naming-conventions.md
* @../../rules/resolve-oqs.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
