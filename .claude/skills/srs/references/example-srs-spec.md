---
type: srs
feature: payment
status: in-review
updated: 2026-05-12
links:
  - docs/payment/payment-prd.md
  - docs/payment/payment-urd.md
---

# payment — Software Requirements Specification‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Scope‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

SRS này cover luồng thanh toán đơn hàng cho khách vãng lai và khách quay lại, qua 3 cổng thanh toán (Momo, VNPay, thẻ quốc tế), luồng hoàn tiền của admin, và xác nhận qua email/SMS. KHÔNG cover: ATM nội địa (napas), trả góp (BNPL), thuê bao định kỳ, hoàn tiền một phần.

## 2. Actors & Stakeholders‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Actor | Loại (người/hệ thống/ngoài) | Mục tiêu | Trong scope? |
|-------|-----------------------------|----------|--------------|
| Khách vãng lai | người | Thanh toán đơn hàng nhanh, không cần đăng nhập/lưu thẻ | Có |
| Khách quay lại | người | Thanh toán 1 chạm bằng thẻ đã lưu | Có |
| Admin vận hành | người | Xem giao dịch, xử lý hoàn tiền | Có |
| Cổng thanh toán (Momo / VNPay / đối tác thẻ) | hệ thống ngoài | Nhận yêu cầu thanh toán, xử lý giao dịch, trả kết quả về hệ thống | Có (dùng theo hợp đồng/SLA, không đặc tả tích hợp kỹ thuật) |
| Dịch vụ email/SMS | hệ thống ngoài | Gửi email hóa đơn + SMS xác nhận cho khách | Có (dùng theo SLA nhà cung cấp) |
| Bộ phận bảo mật/pháp lý | người | Xác nhận chuẩn bảo mật thẻ + yêu cầu lưu vết | Không (nguồn ràng buộc, không thao tác trong luồng) |

## 3. Functional Requirements (FR)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Title | Description | Priority | Verify by | Source |
|----|-------|-------------|----------|-----------|--------|
| FR-payment-001 | Bắt đầu thanh toán | Khách bấm "Thanh toán" → hệ thống tạo yêu cầu thanh toán với số tiền + đơn hàng tương ứng | P0 | demo | PRD Mục 4.1 CAP-payment-01 |
| FR-payment-002 | Chọn phương thức | Hiển thị 3 phương thức (Momo, VNPay, thẻ) + COD dự phòng. Màn xác nhận hiện tổng tiền (mức chi tiết phân tách phí — xem OQ Mục 12) | P0 | demo | PRD Mục 4.1 CAP-payment-03 |
| FR-payment-003 | Thanh toán qua Momo | Chuyển khách sang Momo, nhận kết quả trả về, xử lý thành công/thất bại | P0 | test | PRD Mục 4.1 CAP-payment-01 |
| FR-payment-004 | Thanh toán qua VNPay | Chuyển khách sang VNPay, nhận kết quả trả về, xử lý thành công/thất bại | P0 | test | PRD Mục 4.1 CAP-payment-01 |
| FR-payment-005 | Thanh toán bằng thẻ | Khách nhập thông tin thẻ trên form an toàn của đối tác thẻ → hệ thống ghi nhận thanh toán | P0 | test | PRD Mục 4.1 CAP-payment-01, CAP-payment-07 |
| FR-payment-006 | Nhận xác nhận từ cổng | Hệ thống nhận thông báo kết quả từ cổng thanh toán, xử lý 1 lần duy nhất cho mỗi đơn (không tính trùng) | P0 | test | PRD Mục 4.1 CAP-payment-01 |
| FR-payment-007 | Email xác nhận | Sau khi thành công, gửi email kèm hóa đơn cho khách | P0 | test | PRD Mục 4.1 CAP-payment-02 |
| FR-payment-008 | Admin hoàn tiền | Admin bấm "Hoàn tiền" → bắt buộc ghi lý do → hệ thống gửi yêu cầu hoàn tới cổng → email báo khách | P0 | demo | PRD Mục 4.1 CAP-payment-06 |
| FR-payment-009 | Bảng giao dịch | Admin xem danh sách giao dịch trong ngày, lọc theo trạng thái (thành công/thất bại/đã hoàn) | P0 | demo | PRD Mục 4.1 CAP-payment-05 |
| FR-payment-010 | Lưu thẻ | Khách quay lại chọn lưu thẻ cho lần sau (không lưu mã CVV). Mặc định KHÔNG lưu | P1 | test | PRD Mục 4.2 CAP-payment-08 |
| FR-payment-011 | Thanh toán 1 chạm | Khách quay lại thấy thẻ đã lưu chọn sẵn, chỉ cần nhập CVV + xác nhận | P1 | demo | PRD Mục 4.2 CAP-payment-09 |
| FR-payment-012 | SMS xác nhận | Gửi SMS sau khi thành công (song song với email) | P1 | test | PRD Mục 4.2 CAP-payment-10 |

## 4. Non-Functional Requirements (NFR)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Category | Requirement | Priority | Acceptance |
|----|----------|-------------|----------|------------|
| NFR-payment-001 | performance | Khách thấy kết quả sau khi bấm thanh toán | P0 | 95% trường hợp hiển thị kết quả trong 3 giây |
| NFR-payment-002 | performance | Thời gian hoàn tất thanh toán (bấm → màn thành công) | P1 | 75% khách xong trong 90 giây |
| NFR-payment-003 | security | Thông tin thẻ là dữ liệu nhạy cảm | P0 | KHÔNG lưu số thẻ đầy đủ; tuân chuẩn bảo mật thẻ do bộ phận bảo mật/pháp lý xác nhận (xem Mục 11) |
| NFR-payment-004 | availability | Dịch vụ thanh toán khả dụng | P0 | 99.95% mỗi tháng trong giờ vận hành (tối đa ~22 phút gián đoạn/tháng) |
| NFR-payment-005 | compliance | Lưu vết mọi thao tác thanh toán phục vụ đối soát/thuế | P0 | Bản ghi không sửa được, giữ 7 năm (yêu cầu pháp lý — xem Mục 11) |

## 5. Business Rules

| ID | Rule | Trigger | Implements FR | Source |
|----|------|---------|---------------|--------|
| BR-payment-001 | Đơn > 50 triệu VND phải xác thực bổ sung (3DS) | Khi khách bắt đầu thanh toán đơn > 50 triệu | FR-payment-001 | BRD Mục 7 rủi ro gian lận |
| BR-payment-002 | Chỉ hoàn tiền trong 30 ngày kể từ ngày thanh toán | Admin bấm "Hoàn tiền" | FR-payment-008 | PRD Mục 4.1 + chính sách vận hành |
| BR-payment-003 | Hoàn tiền thất bại > 2 lần → chuyển vận hành xử lý tay | Cổng báo lỗi hoàn lần thứ 2 | FR-payment-008 | Playbook vận hành |
| BR-payment-004 | Thẻ đã lưu không dùng > 6 tháng phải xác nhận lại OTP | Khách thanh toán 1 chạm sau thời gian dài không dùng | FR-payment-011 | OQ-payment-02 (BRD) — chốt Có |

## 6. Error Matrix

| Error ID | Title | Trigger | Severity | Related FR | Screen state | Recovery |
|----------|-------|---------|----------|------------|--------------|----------|
| E-payment-001 | Cổng thanh toán quá hạn phản hồi | Cổng không phản hồi trong thời gian chờ | major | FR-payment-003, FR-payment-004, FR-payment-005 | Hiện "Đang xử lý", sau đó chuyển màn "Thử lại?" | Khách thử lại; thất bại 2 lần → gợi ý phương thức khác |
| E-payment-002 | Thẻ bị từ chối (không đủ số dư) | Cổng báo không đủ số dư | minor | FR-payment-005 | Hiện "Không đủ số dư" + danh sách phương thức khác | Khách chọn phương thức khác |
| E-payment-003 | Thẻ bị từ chối (lý do khác) | Cổng báo thẻ bị từ chối (không phải thiếu số dư) | minor | FR-payment-005 | Hiện "Thẻ bị từ chối" + gợi ý liên hệ ngân hàng | Khách thử lại hoặc phương thức khác |
| E-payment-004 | Xác nhận từ cổng không hợp lệ | Hệ thống phát hiện thông báo kết quả không đáng tin | critical | FR-payment-006 | (nội bộ — ghi log + cảnh báo vận hành) | Vận hành rà soát, không cập nhật trạng thái giao dịch |
| E-payment-005 | Trùng thanh toán 1 đơn | Cùng 1 đơn bị ghi nhận thanh toán 2 lần | critical | FR-payment-006 | (nội bộ) | Từ chối lần 2, giữ giao dịch hợp lệ đã có |
| E-payment-006 | Hoàn tiền thất bại | Cổng báo lỗi khi hoàn | major | FR-payment-008 | Bảng admin hiện "Hoàn thất bại: {lý do}" + nút thử lại | Admin thử lại (BR-payment-003 chuyển vận hành sau 2 lần) |
| E-payment-007 | Xác thực bổ sung (3DS) quá hạn | Khách không hoàn tất 3DS trong 5 phút | minor | FR-payment-001 | Hiện "Hết hạn xác thực" + "Thử lại" | Khách thanh toán lại |
| E-payment-008 | Số tiền không khớp | Số tiền khách gửi khác số tiền đơn hàng | major | FR-payment-001 | (hệ thống từ chối + ghi vết) | Tải lại đơn, hiện "Giá đã cập nhật, vui lòng xác nhận lại" |

## 7. Success Criteria‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Outcome nghiệp vụ | Đo bằng | Mốc đạt |
|----|-------------------|---------|---------|
| SC-payment-01 | Khách hoàn tất thanh toán không bỏ giữa chừng | Tỷ lệ đơn bắt đầu → thanh toán thành công | ≥ 92% |
| SC-payment-02 | Giảm khiếu nại "trừ tiền nhưng đơn không lên" | Số khiếu nại trùng thu / tháng | ≤ 3 vụ/tháng |
| SC-payment-03 | Hoàn tiền xử lý nhanh, không tồn đọng | Tỷ lệ yêu cầu hoàn xong trong 24 giờ | ≥ 95% |

## 8. Data Entities (tóm tắt — chi tiết ở erd.md)

- __Đơn hàng__ — mã đơn, khách (có thể trống với khách vãng lai), số tiền, loại tiền, trạng thái, ngày tạo.
- __Giao dịch__ — mã giao dịch, đơn hàng, cổng, số tiền, trạng thái (chờ/thành công/thất bại/đã hoàn), ngày tạo.
- __Phương thức thanh toán__ — khách sở hữu, loại (momo/vnpay/thẻ), 4 số cuối, tháng/năm hết hạn, có phải mặc định.
- __Yêu cầu hoàn tiền__ — giao dịch gốc, số tiền, lý do, admin xử lý, trạng thái, ngày tạo.

Chi tiết quan hệ + thuộc tính ở `srs/payment-erd.md` (chạy `/erd --feature payment`).

## 9. Flows (tóm tắt — chi tiết ở flows.md)

- __Flow 1:__ Khách vãng lai thanh toán thành công (Momo).
- __Flow 2:__ Khách quay lại thanh toán 1 chạm (thẻ đã lưu + CVV).
- __Flow 3:__ Admin hoàn tiền.
- __Flow 4:__ Nhận xác nhận kết quả từ cổng (xử lý 1 lần).
- __Flow 5:__ Khôi phục lỗi (cổng quá hạn → thử lại).

Sequence diagram ở `srs/payment-flows.md` (chạy `/sequence --feature payment`).

## 10. Screens (tóm tắt — chi tiết ở ascii-wireframe/)

- __payment-method-select__ — Khách chọn 1 trong 3 phương thức.
- __payment-card-form__ — Nhập thông tin thẻ.
- __payment-confirm__ — Xác nhận tổng tiền (mức phân tách phí chờ chốt — xem OQ Mục 12).
- __payment-processing__ — Trạng thái đang xử lý, có nút hủy.
- __payment-success__ — Màn thành công + ghi chú email xác nhận.
- __payment-error__ — Các trạng thái lỗi (E-payment-001 → 007).
- __admin-transaction-list__ — Bảng giao dịch trong ngày.
- __admin-refund-form__ — Cửa sổ hoàn tiền với lý do.

Chi tiết mỗi màn ở `ascii-wireframe/{flow-slug}.md` (chạy `/wireframe-ascii`, gộp theo flow).

## 11. Constraints, Dependencies & Assumptions

__Constraints (ràng buộc áp đặt — có source/owner):__

| Ràng buộc | Source / Owner |
|-----------|----------------|
| Tuân chuẩn bảo mật thẻ (PCI-DSS) — KHÔNG do SRS này tự đề xuất | Bộ phận bảo mật/pháp lý |
| Lưu vết thanh toán giữ 7 năm | Yêu cầu pháp lý/thuế |
| Chỉ hỗ trợ giao dịch bằng VND ở giai đoạn này | Quyết định vận hành |

__Dependencies (deliverable do bên khác sở hữu):__

| Phụ thuộc | Owner | Blocks nếu chưa sẵn |
|-----------|-------|---------------------|
| Đơn hàng được tạo trước khi vào luồng thanh toán | Feature checkout | Không vào được luồng thanh toán nếu chưa có đơn hợp lệ |
| Cổng thanh toán Momo, VNPay, đối tác thẻ quốc tế (theo hợp đồng/SLA) | Đối tác cổng | Không thanh toán được nếu cổng chưa cấp sandbox/production |
| Dịch vụ gửi email/SMS | Nhà cung cấp email/SMS | Không gửi được hóa đơn/xác nhận nếu dịch vụ chưa sẵn |

> SRS chỉ nêu tên đối tác + mục đích + ràng buộc hợp đồng, KHÔNG đặc tả cách tích hợp kỹ thuật (thuộc tài liệu Integration Spec riêng).

__Assumptions (tin là đúng — nêu hệ quả nếu sai):__

| Giả định | Invalidate nếu sai |
|----------|--------------------|
| Tỷ giá/phí cổng hệ thống hiển thị là số đã chốt tại thời điểm xác nhận | Nếu phí đổi sau xác nhận → số tiền thu lệch, phải bổ sung luồng đối soát/điều chỉnh |

> Quyết định kỹ thuật (nền tảng, thuật toán, endpoint, cấu trúc dữ liệu vật lý) KHÔNG thuộc SRS của BA — để cho dev/architect ở tài liệu Architecture/Integration riêng.

## 12. Open Questions

- [ ] Có cần công cụ phát hiện gian lận của bên thứ ba, hay tự dựng quy tắc cơ bản (per BRD OQ)?
- [ ] Màn xác nhận hiện phân tách phí (cổng + thuế) hay chỉ tổng tiền (per PRD OQ)?
- [ ] Hoàn tiền tự động khi đơn bị hủy trong X giờ, hay luôn thủ công (per PRD OQ)?
- [ ] Chuẩn bảo mật thẻ áp dụng ở mức nào — chờ bộ phận bảo mật/pháp lý xác nhận.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
