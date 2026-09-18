---
type: prd
feature: payment
status: in-review
updated: 2026-07-12
links:
  - docs/payment/payment-urd.md
  - docs/payment/payment-brd.md
---

# payment — Product Requirements Document‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Product Overview‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Feature payment cho phép user thanh toán đơn hàng e-commerce qua 3 phương thức online (Momo, VNPay, thẻ Visa/Master) và COD fallback. Trải nghiệm mobile-first, guest checkout không bắt đăng ký, returning customer có 1-tap với saved card. Refund flow cho admin shop.

**Gap neo:** Hiện tại khách bỏ giỏ 35% ở bước thanh toán do phải đăng ký + không thấy phí rõ → sau feature khách guest thanh toán < 90s, thấy tổng tiền + phí trước khi xác nhận.

## 2. Goals‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### 2.1 Goals‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- Giảm checkout abandon từ 35% xuống <15% (trace BO-payment-01).
- Time-to-success p75 <= 90s.
- PCI-DSS Level 2 compliance (điều kiện pháp lý nhận thẻ).
- 1-tap checkout cho returning với saved card.

### 2.2 Non-goals‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- KHÔNG build crypto payment.
- KHÔNG support multi-currency v1.
- KHÔNG subscription billing.
- KHÔNG partial refund v1 (full refund only).
- KHÔNG BNPL (Buy now pay later).

## 3. Personas

| Persona | Mô tả (1 dòng) | Nhu cầu chính | Nguồn |
|---------|----------------|---------------|-------|
| Khách mới | Guest, one-time buyer, mobile-first | Checkout nhanh không đăng ký, thấy phí rõ | UN-001, UN-002 |
| Khách thân thiết | Returning, có account | Saved card, 1-tap, history | UN-003 |
| Admin shop | Backend operator | Refund + dashboard transactions | UN-004 |

## 4. Capabilities

| ID | Capability | Priority | Rationale (vì sao tier này) | Traces to | Bóc ~N story | Done when (product outcome) | Sẵn sàng |
|----|------------|----------|-----------------------------|-----------|--------------|-----------------------------|----------|
| CAP-payment-01 | Guest checkout Momo/VNPay/Visa/Master | P0 | Lõi giá trị feature — không có thì không giảm abandon | UN-001, BO-payment-01 | ~6 | Khách guest hoàn tất thanh toán không cần đăng ký | ✅ |
| CAP-payment-02 | Email confirmation sau success | P0 | Khách cần bằng chứng giao dịch; chặn ticket CS | UN-002 | ~2 | Khách nhận email xác nhận trong 1 phút sau success | ✅ |
| CAP-payment-03 | Pre-confirm screen show tổng tiền + phí | P0 | Trực tiếp trị pain "không thấy phí rõ" ở gap neo | UN-002, BO-payment-01 | ~3 | Khách thấy tổng + phí trước khi bấm xác nhận | ✅ |
| CAP-payment-04 | Error handling payment fail | P0 | Fail path (timeout/declined) là phần lớn abandon còn lại | UN-001 | ~5 | Khách biết vì sao fail + bước tiếp theo | ✅ |
| CAP-payment-05 | Admin dashboard list transactions | P0 | Admin cần theo dõi giao dịch ngày để vận hành | UN-004 | ~4 | Admin xem được danh sách giao dịch trong ngày | ✅ |
| CAP-payment-06 | Full refund flow cho admin | P0 | Nghĩa vụ hoàn tiền; thiếu thì không go-live được | UN-004, BO-payment-03 | ~5 | Admin hoàn tiền đơn + khách nhận thông báo | 🔒 blocked by OQ-3 |
| CAP-payment-07 | Lưu thông tin thẻ an toàn theo chuẩn thanh toán | P0 | Điều kiện pháp lý bắt buộc để nhận thẻ | BO-payment-02 | ~4 | Nhận thẻ hợp chuẩn, không lưu thông tin thẻ nhạy cảm ngoài quy định | ✅ |
| CAP-payment-08 | Saved card cho returning | P1 | Tăng tốc returning nhưng không chặn launch v1 | UN-003 | ~5 | Returning chọn được thẻ đã lưu | ✅ |
| CAP-payment-09 | 1-tap checkout saved card + CVV | P1 | Phụ thuộc CAP-08 xong trước | UN-003 | ~4 | Returning thanh toán 1-tap + CVV | ✅ |
| CAP-payment-10 | SMS confirmation | P1 | Bổ sung email, không thiết yếu v1 | UN-002 | ~2 | Khách nhận SMS xác nhận | ✅ |
| CAP-payment-11 | Admin filter/search transactions | P1 | Cải thiện vận hành khi lượng giao dịch tăng | UN-004 | ~3 | Admin lọc/tìm giao dịch theo tiêu chí | ✅ |
| CAP-payment-12 | ATM napas integration | P2 | Mở rộng phương thức, chờ nhu cầu xác thực | — | ~5 | Khách thanh toán qua napas | ⬜ |
| CAP-payment-13 | Partial refund | P2 | Nâng cấp refund sau khi full refund ổn định | BO-payment-03 | ~4 | Admin hoàn 1 phần đơn | ⬜ |

## 5. Upstream Traceability

| Capability | Traces to | Product outcome | Success metric |
|------------|-----------|-----------------|----------------|
| CAP-payment-01, 03 | UN-001, UN-002, BO-payment-01 | Giảm bỏ giỏ ở bước thanh toán | Checkout conversion (M1) |
| CAP-payment-07 | BO-payment-02 | Nhận thẻ hợp chuẩn, tránh phạt | 0 incident PCI (M5) |
| CAP-payment-06 | BO-payment-03 | Hoàn tiền đúng nghĩa vụ | Refund SLA (M4) |
| CAP-payment-08, 09 | UN-003 | Returning thanh toán nhanh hơn | Time-to-success returning (M2) |

## 6. Key Capability Interactions

- **Guest checkout:** CAP-01 gọi CAP-03 (pre-confirm) trước khi xử lý; fail → CAP-04; success → CAP-02.
- **Returning 1-tap:** CAP-08 (saved card) là tiền đề của CAP-09; vẫn qua CAP-03 + CAP-02.
- **Refund:** CAP-06 chạy độc lập từ CAP-05 (admin mở giao dịch → refund).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 7. Success Metrics

| Metric | Baseline | Target | Measurement Method | Timeframe |
|--------|----------|--------|--------------------|-----------|
| M1 Checkout conversion | 65% (Q1 analytics) | >=85% p75 | Funnel step rate cổng thanh toán | 90 ngày sau launch |
| M2 Time-to-success | Chưa có — xác lập bằng log giao dịch tuần đầu | <=90s p75 | Thời gian từ mở checkout tới success | 90 ngày sau launch |
| M3 Cost per transaction | ~2.3% revenue | <=2% revenue | Phí cổng / giá trị giao dịch | Hàng quý |
| M4 Refund SLA | Chưa có | 95% refund xử lý < 24h | Thời gian từ yêu cầu tới hoàn tất | 90 ngày sau launch |
| M5 PCI incident | 0 | 0 / 12 tháng | Audit + incident log | Hàng năm |

## 8. Dependencies

| Dependency | Owner | Status | Needed-by | Impact if Late |
|------------|-------|--------|-----------|----------------|
| Momo merchant account + sandbox | Payments team | At Risk | 2026-08-15 | Chặn CAP-01 launch |
| VNPay merchant account | Payments team | On Track | 2026-08-15 | Giảm phương thức khả dụng |
| Đối tác lưu thẻ an toàn (thanh toán thẻ) | Payments team | On Track | 2026-08-01 | Chặn CAP-07 → không nhận thẻ |
| PCI-DSS Level 2 audit | Compliance | On Track | 2026-09-01 | Chặn go-live nhận thẻ |
| Quy trình trạng thái đơn hàng | Order team | On Track | 2026-08-20 | Refund/confirm không nhất quán |

## 9. Assumptions & Validation

| Assumption | Impact if Wrong | Validation | Status |
|------------|-----------------|------------|--------|
| Guest checkout không cần KYC dưới ngưỡng 5M VND | Rework compliance flow, chậm launch | Hỏi Compliance xác nhận ngưỡng | Open (OQ-4) |
| Khách tin tưởng lưu thẻ nếu có onboarding tooltip | Adoption CAP-08 thấp, ít đạt outcome "returning nhanh hơn" | A/B test tooltip sau launch | Pending |
| Baseline abandon 35% từ Q1 còn đại diện | Target conversion sai chuẩn | Đối chiếu analytics tháng gần nhất | Pending |

## 10. Product Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Đối tác Momo thay đổi cách tích hợp | Medium | High | Có phương án dự phòng VNPay/COD; theo dõi thông báo thay đổi từ đối tác | Payments team |
| User trust card-saving thấp | Medium | Medium | UX onboarding tooltip; làm CAP-08 P1 không chặn launch | PO |
| Refund spike post-launch (lỗi flow) | Medium | High | Playbook CS + SLA support; giới hạn pilot 1 tuần | CS Lead |

## 11. Release & Launch Readiness

### 11.1 Release Horizon

| Horizon | Capabilities | Target | Status |
|---------|--------------|--------|--------|
| Now | CAP-payment-01 → 07 (P0) | 2026-09-30 | planned |
| Next | CAP-payment-08 → 11 (P1) | 2026-12-15 | planned |
| Later | CAP-payment-12 → 13 (P2) | 2027 H1 | tentative |

### 11.2 Launch Readiness

| Workstream | Must-pass criteria | Status | Guardrail metric (threshold → decision) |
|------------|--------------------|--------|-----------------------------------------|
| Product | CAP-01..07 pass UAT; refund flow demo được | 🔄 | Checkout conversion < 70% sau 48h → pause rollout |
| Support | Playbook refund + CS training xong | 🔄 | Refund ticket backlog > 50 → tăng nhân lực CS |
| GTM | Thông báo phương thức mới trên trang thanh toán | ⬜ | — |
| Monitoring | Dashboard payment success rate live | 🔄 | Success rate < 95% → pause rollout |

## 12. Open Questions

- [ ] OQ-1: Pre-confirm screen show breakdown phí (gateway + tax) hay chỉ total?
- [ ] OQ-2: Saved card có cần OTP confirm mỗi lần dùng không?
- [ ] OQ-3: Refund auto-trigger nếu order cancelled trong X giờ, hay luôn manual admin? (chặn CAP-06)
- [ ] OQ-4: Guest checkout > 5M VND có cần KYC light không?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
