---
type: brd
feature: payment
status: in-review
updated: 2026-07-12
links:
  - docs/payment/payment-urd.md
  - docs/payment/brainstorms/checkout-flow.md
---

# payment — Business Requirements Document‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Executive Summary‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Khách B2C mua hàng trên sàn hiện chỉ có COD, khiến 35% phiên checkout bị bỏ tại bước thanh toán và tạo tải đối soát tiền mặt cho vận hành. Feature payment bổ sung thanh toán online nội địa (VND) cho đơn mua một lần, mục tiêu giảm tỷ lệ bỏ checkout xuống ≤20% và giảm phụ thuộc COD. Phạm vi giai đoạn này giới hạn ở khách B2C, kênh web/mobile web, thanh toán và tra cứu giao dịch — không bao gồm subscription hay cross-border. Triển khai theo hướng pilot rồi mở rộng, dự kiến trong Q3 2026.

## 2. Business Problem & Context‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### 2.1 Problem Statement‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Business Condition | Baseline | Business Impact | Evidence |
|----|--------------------|----------|-----------------|----------|
| BP-payment-01 | Checkout bị bỏ tại bước thanh toán cao hơn mục tiêu | 35% (90 ngày gần nhất) | Nhiều đơn không hoàn tất; chưa quy hết được cho payment | Funnel analytics PAY-FUNNEL-90D |
| BP-payment-02 | Khách chỉ có COD | 100% đơn dùng COD | Phụ thuộc tiền mặt, từ chối nhận hàng, đối soát thủ công | Báo cáo vận hành Q1–Q2/2026 |
| BP-payment-03 | Support nhận nhiều câu hỏi về thanh toán/trạng thái đơn | 1.240 ticket/quý | Tăng tải support, kéo dài thời gian xử lý | Ticket taxonomy CS-Q2/2026 |

### 2.2 Opportunity & Why Now‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Giảm cart abandon nằm trong OKR Commerce 2026; đối tác thanh toán đang có chương trình phí ưu đãi đến hết Q3/2026. Chậm triển khai tiếp tục mất chuyển đổi và duy trì chi phí vận hành COD. Ước tính tác động vẫn là __Assumption__ cho tới khi Finance xác nhận phần abandon thực sự do thiếu online payment.

### 2.3 Strategic Alignment

Hỗ trợ trực tiếp OKR "Giảm cart abandon dưới 20%" và mục tiêu giảm chi phí vận hành COD. Là nền tảng cho các initiative commerce sau (mua lại, loyalty).

## 3. Current State, Future State & Gap

### 3.1 Current State (AS-IS)

Khách chọn hàng, tới bước thanh toán chỉ có COD; xác nhận đơn qua điện thoại/thao tác thủ công của vận hành. Không có xác nhận thanh toán online, không tra cứu trạng thái giao dịch tập trung; support trả lời thủ công từ nhiều nguồn.

> Quy trình chi tiết từng bước: xem `/bpmn` hoặc `/activity` khi cần sơ đồ AS-IS đầy đủ.

### 3.2 Future State (TO-BE)

Khách thấy rõ tổng tiền và chọn phương thức thanh toán online phù hợp; nhận kết quả giao dịch (thành công/đang xử lý/không thành công) và xác nhận tra cứu được. Vận hành và support tra cứu trạng thái giao dịch tập trung, giảm xử lý thủ công.

### 3.3 Gap

| Gap | Mô tả | Ưu tiên |
|-----|-------|---------|
| Thiếu phương thức thanh toán online | Chưa có kênh thanh toán ngoài COD | Cao |
| Thiếu minh bạch trạng thái giao dịch | Khách và support không tra cứu được trạng thái | Cao |
| Đối soát thủ công | Vận hành xử lý xác nhận đơn thủ công | Trung bình |

## 4. Stakeholders

| Stakeholder Role | Interest | Influence | Stakeholder Requirement / Expectation |
|------------------|----------|-----------|----------------------------------------|
| Business Sponsor | Tăng conversion, giảm chi phí vận hành | Cao | Feature đạt mục tiêu abandon trong ngân sách chấp thuận |
| Operations Lead | Giảm COD và xử lý thủ công | Cao | Quy trình vận hành sau thanh toán rõ ràng, giảm đối soát |
| Customer Support Lead | Giảm ticket, trả lời nhất quán | Trung bình | Tra cứu được trạng thái giao dịch để hỗ trợ khách |
| Legal & Compliance Lead | Tuân thủ nghĩa vụ thanh toán/dữ liệu | Trung bình | Đáp ứng compliance trước khi mở giao dịch thật |
| Finance Lead | Chi phí giao dịch và benefit thực | Trung bình | Chi phí giao dịch trong ngưỡng chấp nhận, benefit đo được |
| Product Lead | Chuyển business requirement thành scope sản phẩm | Trung bình | Nhận BRD đủ rõ để làm PRD |

## 5. Business Objectives & Success Measures

| ID | Objective | Baseline | Target | Timeframe | Success Measure |
|----|-----------|----------|--------|-----------|-----------------|
| BO-payment-01 | Giảm tỷ lệ bỏ checkout tại bước thanh toán | 35% | ≤20% | 6 tháng sau mở rộng | Tỷ lệ rời payment chưa tạo đơn / tổng phiên mở payment (funnel) |
| BO-payment-02 | Giảm phụ thuộc COD | 100% COD | ≤70% COD | 6 tháng sau mở rộng | Tỷ lệ đơn thanh toán online / tổng đơn |
| BO-payment-03 | Giảm câu hỏi support về thanh toán/trạng thái | 1.240 ticket/quý | Giảm ≥40% | Quý đầu sau mở rộng | Ticket taxonomy payment-status theo quý |

## 6. Business Scope

### 6.1 In Scope

- Thanh toán online nội địa (VND) cho khách B2C, đơn mua một lần, kênh web/mobile web.
- Khách xem tổng tiền và kết quả giao dịch; tra cứu xác nhận thanh toán.
- Vận hành/support tra cứu trạng thái giao dịch.
- Hoàn tiền toàn phần cho đơn đủ điều kiện (mức nghiệp vụ).

### 6.2 Out of Scope

- Subscription/thanh toán định kỳ.
- Cross-border và đa tiền tệ.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- Merchant B2B.
- Hoàn tiền một phần (giai đoạn sau).

### 6.3 Assumptions

- Phần đáng kể của abandon liên quan đến thiếu online payment (chờ Finance/Analytics xác nhận).
- Đội vận hành và support đủ năng lực xử lý pilot với quy trình mới.

### 6.4 Constraints

- Ngân sách và timeline pilot theo phê duyệt của sponsor.
- Phải đạt compliance trước khi mở giao dịch thật.
- Chỉ phục vụ thị trường Việt Nam, giao diện tiếng Việt.

### 6.5 Dependencies

- Đối tác thanh toán (thỏa thuận thương mại + khả năng tích hợp) — chỉ nêu tên + mục đích nghiệp vụ.
- Compliance sign-off từ Legal.
- Baseline và cách đo benefit từ Finance/Analytics.

## 7. High-level Business Requirements

| ID | Business Requirement | Business Objective | Priority |
|----|----------------------|--------------------|----------|
| BREQ-payment-01 | Khách phải chọn được phương thức thanh toán online phù hợp khi checkout | BO-payment-01, BO-payment-02 | Must |
| BREQ-payment-02 | Khách phải thấy rõ tổng tiền trước khi xác nhận thanh toán | BO-payment-01 | Must |
| BREQ-payment-03 | Khách và support phải tra cứu được trạng thái giao dịch | BO-payment-03 | Must |
| BREQ-payment-04 | Vận hành phải thực hiện được hoàn tiền toàn phần cho đơn đủ điều kiện | BO-payment-02 | Should |

## 8. Business Rules

| ID | Business Rule | Rationale |
|----|---------------|-----------|
| BR-payment-01 | Chỉ hỗ trợ thanh toán bằng VND cho khách B2C nội địa | Giới hạn phạm vi thị trường giai đoạn này |
| BR-payment-02 | Hoàn tiền chỉ áp dụng cho đơn đủ điều kiện và ở mức toàn phần | Kiểm soát rủi ro và độ phức tạp vận hành |
| BR-payment-03 | Giao dịch phải hiển thị trạng thái rõ ràng (thành công / đang xử lý / không thành công) | Tránh khách hiểu nhầm và thanh toán trùng |

## 9. Cost-Benefit (định tính)

### 9.1 Cost Drivers

- Chi phí tích hợp và vận hành đối tác thanh toán.
- Chi phí giao dịch trên mỗi đơn online.
- Công chuẩn bị quy trình và đào tạo vận hành/support.

### 9.2 Expected Benefits

- Tăng chuyển đổi checkout (giảm abandon).
- Giảm chi phí và rủi ro vận hành COD.
- Giảm tải support nhờ trạng thái minh bạch.

### 9.3 Priority / Rough ROI

Ưu tiên cao: giải quyết trực tiếp nguyên nhân bỏ checkout và giảm chi phí vận hành. Lợi ích kỳ vọng vượt chi phí tích hợp/giao dịch nếu phần abandon do thiếu online payment đúng như giả định. Phân tích đầu tư chi tiết (ROI/payback) thuộc business case riêng do Finance sở hữu — không nằm trong BRD này.

## 10. Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner Role |
|----|------|------------|--------|------------|------------|
| RISK-payment-01 | Benefit thấp hơn kỳ vọng nếu abandon chủ yếu do giá/phí giao hàng | Trung bình | Cao | Pilot đo uplift trước khi mở rộng; xác nhận attribution với Finance | Business Sponsor |
| RISK-payment-02 | Chi phí giao dịch vượt ngưỡng chấp nhận | Trung bình | Cao | Chốt điều khoản thương mại; theo dõi chi phí thực trong pilot | Finance Lead |
| RISK-payment-03 | Không đạt compliance kịp thời | Thấp–Trung bình | Cao | Bắt đầu compliance review sớm; không mở giao dịch thật khi chưa sign-off | Compliance Lead |
| RISK-payment-04 | Vận hành/support quá tải khi có kênh mới | Trung bình | Trung bình | Giới hạn quy mô pilot; đào tạo trước khi mở rộng | Operations Lead |

## 11. Open Questions

- [ ] OQ-1: Ngưỡng tỷ lệ COD mục tiêu sau 6 tháng có cần chốt cứng với sponsor không?
- [ ] OQ-2: Hoàn tiền một phần có cần đưa vào phạm vi sớm hơn không, hay giữ ở giai đoạn sau?
- [ ] OQ-3: Nhóm phương thức thanh toán online nào là bắt buộc cho pilot để đủ đại diện khách mục tiêu?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
