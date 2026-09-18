---
type: urd
feature: payment
status: in-review
updated: 2026-07-12
links:
  - docs/payment/brainstorms/checkout-flow.md
---

# payment — User Requirements Document‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Purpose‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Tài liệu ghi nhận nhu cầu thanh toán của khách hàng B2C trên ứng dụng thương mại điện tử, ưu tiên trải nghiệm checkout rõ ràng, nhanh và đáng tin cậy trên thiết bị di động. Phạm vi người dùng liên quan gồm khách mua hàng và nhân viên hỗ trợ giao dịch sau thanh toán.

### User Problem & Current Experience‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| User | Current Situation | Problem | User Consequence | Evidence |
|------|-------------------|---------|------------------|----------|
| Khách mới | Thanh toán lần đầu, thường dùng điện thoại và chưa có thông tin lưu sẵn | Form dài, phí chỉ xuất hiện cuối luồng và yêu cầu đăng ký làm gián đoạn quyết định mua | Bỏ giỏ hàng hoặc lo ngại bị tính sai tiền | Observed: brainstorm checkout-flow |
| Khách quay lại | Phải nhập lại thông tin thanh toán cho mỗi lần mua | Checkout lặp lại nhiều thao tác dù đã từng giao dịch | Tốn thời gian, giảm động lực mua lại | Assumption |
| Nhân viên hỗ trợ | Tra cứu giao dịch khi khách báo chưa nhận xác nhận hoặc yêu cầu hoàn tiền | Thông tin giao dịch và trạng thái xử lý khó theo dõi tập trung | Phản hồi khách chậm và phải đối chiếu thủ công | Confirmed: stakeholder interview |

## 2. User Types‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Tier | User Type | Context | Primary Goal | Pain Points |
|------|-----------|---------|--------------|-------------|
| primary | Khách mua hàng | Đã chọn sản phẩm và sẵn sàng hoàn tất đơn | Thanh toán đúng số tiền bằng phương thức phù hợp và nhận xác nhận | Form dài, phí không rõ, lo giao dịch thất bại nhưng vẫn bị trừ tiền |
| secondary | Khách quay lại | Đã từng thanh toán thành công | Hoàn tất lần mua tiếp theo với ít thao tác lặp lại | Phải nhập lại thông tin và khó tra cứu giao dịch cũ |
| secondary | Nhân viên hỗ trợ | Tiếp nhận thắc mắc sau thanh toán | Xác định nhanh trạng thái giao dịch và hướng dẫn khách bước tiếp theo | Thiếu thông tin tập trung, khó phân biệt giao dịch đang xử lý và thất bại |

## 3. Scope Boundaries‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### In Scope

- Khách xem đầy đủ số tiền và phí trước khi xác nhận thanh toán.
- Khách chọn phương thức thanh toán phù hợp trong các phương thức được hỗ trợ.
- Khách biết kết quả giao dịch và bước tiếp theo khi thành công, đang xử lý hoặc không thành công.
- Khách nhận và tra cứu được xác nhận thanh toán.
- Nhân viên hỗ trợ tra cứu trạng thái giao dịch và tiếp nhận yêu cầu hoàn tiền đủ điều kiện.

### Out of Scope

- Thanh toán bằng tiền mã hóa.
- Mua trước trả sau.
- Thanh toán nhiều loại tiền tệ; giai đoạn này chỉ phục vụ VND.
- Thuê bao định kỳ và tự động gia hạn.
- Quyết định kỹ thuật về lưu thông tin thẻ hoặc tích hợp cổng thanh toán.

## 4. User Needs

| ID | User | Context / Trigger | User Need | Expected Outcome | Importance | Evidence |
|----|------|-------------------|-----------|------------------|------------|----------|
| UN-001 | Khách mua hàng | Trước khi xác nhận thanh toán | Thấy tổng tiền, phí và số tiền cuối cùng rõ ràng | Hiểu chính xác số tiền sẽ trả trước khi cam kết | Critical | Confirmed: brainstorm checkout-flow |
| UN-002 | Khách mua hàng | Khi chọn cách thanh toán | Chọn được phương thức quen thuộc và phù hợp | Có thể tiếp tục checkout mà không phải đổi kênh mua hàng | Critical | Confirmed: brainstorm checkout-flow |
| UN-003 | Khách mới | Khi chưa có tài khoản | Hoàn tất mua hàng mà không bị buộc tạo tài khoản | Thanh toán thành công với số bước cần thiết tối thiểu | High | Confirmed: stakeholder interview |
| UN-004 | Khách mua hàng | Ngay sau khi xác nhận | Biết giao dịch thành công, đang xử lý hay không thành công | Không thanh toán lặp lại vì hiểu sai trạng thái | Critical | Observed: support cases |
| UN-005 | Khách mua hàng | Sau giao dịch thành công | Nhận bằng chứng thanh toán có thể tra cứu | Có thông tin để kiểm tra đơn hoặc yêu cầu hỗ trợ | High | Confirmed: stakeholder interview |
| UN-006 | Khách quay lại | Khi thực hiện lần mua tiếp theo | Giảm thao tác nhập lại thông tin đã cung cấp | Hoàn thành checkout nhanh hơn lần đầu | Medium | Assumption |
| UN-007 | Nhân viên hỗ trợ | Khi khách liên hệ về giao dịch | Tra cứu trạng thái và hướng dẫn bước tiếp theo | Trả lời nhất quán mà không cần đối chiếu nhiều nơi | High | Confirmed: stakeholder interview |

## 5. Prioritized User Journeys

### Journey 1: Khách hoàn tất thanh toán và nhận xác nhận

- __User:__ Khách mua hàng
- __Importance:__ Critical
- __Trigger:__ Khách đã kiểm tra giỏ hàng và chọn thanh toán
- __Expected outcome:__ Đơn được thanh toán đúng số tiền và khách có xác nhận để tra cứu
- __Related needs:__ UN-001, UN-002, UN-003, UN-004, UN-005

1. Khách xem tổng tiền, phí và các phương thức có thể chọn.
2. Khách chọn phương thức phù hợp, cung cấp thông tin cần thiết và xác nhận.
3. Khách thấy kết quả giao dịch rõ ràng.
4. Khi thành công, khách nhận xác nhận và tiếp tục theo dõi đơn hàng.

__Independent verification:__ Một khách đủ điều kiện có thể đi từ bước thanh toán đến trạng thái thành công, thấy đúng số tiền và tra cứu được xác nhận mà không cần thực hiện Journey 2 hoặc Journey 3.

### Journey 2: Khách hiểu và phục hồi sau giao dịch chưa thành công

- __User:__ Khách mua hàng‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- __Importance:__ Critical
- __Trigger:__ Giao dịch không hoàn tất hoặc chưa có kết quả cuối cùng
- __Expected outcome:__ Khách hiểu trạng thái hiện tại và biết hành động an toàn tiếp theo
- __Related needs:__ UN-004, UN-005

1. Khách nhận thông báo phân biệt rõ giao dịch không thành công với giao dịch đang xử lý.
2. Khách xem hướng dẫn phù hợp: thử lại, chọn phương thức khác hoặc chờ kết quả.
3. Khách tiếp tục thanh toán mà không lo bị tính tiền trùng.

__Independent verification:__ Với một giao dịch chưa thành công hoặc đang xử lý, khách xác định đúng trạng thái và chọn được bước tiếp theo mà không cần liên hệ hỗ trợ.

### Journey 3: Nhân viên hỗ trợ tra cứu giao dịch

- __User:__ Nhân viên hỗ trợ
- __Importance:__ High
- __Trigger:__ Khách báo chưa nhận xác nhận, không rõ trạng thái hoặc muốn yêu cầu hoàn tiền
- __Expected outcome:__ Nhân viên xác định trạng thái và đưa hướng dẫn nhất quán cho khách
- __Related needs:__ UN-005, UN-007

1. Nhân viên tìm giao dịch bằng thông tin khách cung cấp.
2. Nhân viên xem số tiền, thời điểm và trạng thái hiện tại.
3. Nhân viên giải thích kết quả hoặc tiếp nhận bước xử lý phù hợp.

__Independent verification:__ Nhân viên có thể xác định trạng thái của một giao dịch mẫu và hướng dẫn đúng bước tiếp theo chỉ từ thông tin tra cứu được.

## 6. User Exceptions & Edge Conditions

| Situation | User Impact | Expected User-facing Outcome | Related Journey / Need |
|-----------|-------------|------------------------------|------------------------|
| Không có phương thức thanh toán nào khả dụng | Khách không thể hoàn tất đơn theo dự định | Biết lý do chung, có thể quay lại giỏ hàng và thử sau mà không mất đơn | Journey 1 / UN-002 |
| Số tiền thay đổi trước lúc xác nhận | Khách có nguy cơ trả số tiền khác với số đã xem | Được xem lại số tiền mới và chủ động xác nhận lại | Journey 1 / UN-001 |
| Kết nối bị gián đoạn sau khi khách xác nhận | Khách không biết giao dịch đã được ghi nhận hay chưa | Thấy trạng thái có thể kiểm tra, không bị khuyến khích thanh toán lặp ngay | Journey 2 / UN-004 |
| Giao dịch đang xử lý lâu hơn bình thường | Khách lo bị trừ tiền nhưng đơn chưa xác nhận | Biết giao dịch chưa có kết quả cuối và cách theo dõi tiếp | Journey 2 / UN-004 |
| Khách không nhận được xác nhận | Khách thiếu bằng chứng để đối chiếu | Có thể tra cứu lại xác nhận hoặc biết kênh hỗ trợ phù hợp | Journey 2 / UN-005 |
| Nhân viên không tìm thấy giao dịch | Khách có nguy cơ phải cung cấp thông tin nhiều lần | Nhân viên biết thông tin nào còn thiếu và hướng dẫn khách bổ sung | Journey 3 / UN-007 |

## 7. User-side Constraints

- Trải nghiệm chính phục vụ màn hình điện thoại và vẫn phải dễ hoàn tất trên kết nối di động không ổn định.
- Nội dung chính bằng tiếng Việt; thông tin bắt buộc do đối tác thanh toán cung cấp có thể hiển thị tiếng Anh khi chưa có bản dịch phù hợp.
- Khách phải xem được số tiền cuối cùng trước mọi hành động xác nhận có hiệu lực.
- Khách mới không bị buộc tạo tài khoản chỉ để hoàn tất đơn hiện tại.
- Thông tin nhạy cảm chỉ được yêu cầu khi thực sự cần cho phương thức khách đã chọn.

## 8. Assumptions & Validation

| Assumption | Impact if Wrong | Validation Status | Next Action |
|------------|-----------------|-------------------|-------------|
| Khách quay lại coi việc giảm thao tác nhập lại là nhu cầu đáng ưu tiên | UN-006 có thể được đánh giá cao hơn nhu cầu thực tế | Chưa xác nhận | Phỏng vấn 5–8 khách đã mua từ hai lần trở lên |
| Phần lớn giao dịch bắt đầu trên điện thoại | Ràng buộc mobile-first có thể chưa phản ánh đúng cơ cấu người dùng | Có dữ liệu sơ bộ, chưa chốt baseline | Xác nhận tỷ lệ theo thiết bị trong báo cáo 30 ngày gần nhất |
| Khách hiểu ba trạng thái “thành công / đang xử lý / không thành công” khi wording rõ ràng | Journey 2 có thể vẫn phát sinh nhiều liên hệ hỗ trợ | Chưa xác nhận | Kiểm tra khả năng hiểu với prototype trước khi chốt nội dung |

## 9. User Success Criteria

| ID | User Outcome | Baseline | Target | Measurement | Review Period |
|----|--------------|----------|--------|-------------|---------------|
| USC-001 | Khách bắt đầu thanh toán và hoàn tất giao dịch thành công | Chưa có — xác lập trước khi phát hành | Assumption: ít nhất 85% phiên đủ điều kiện hoàn tất | Tỷ lệ từ mở bước thanh toán đến xác nhận thành công | 30 ngày đầu |
| USC-002 | Khách hoàn thành checkout trong thời gian hợp lý | Chưa có — đo trong usability test | Assumption: ít nhất 75% khách hoàn tất trong 90 giây, không tính thời gian chờ xác nhận bên ngoài | Quan sát usability test và thời gian hoàn tất thực tế | Trước phát hành và 30 ngày đầu |
| USC-003 | Khách hiểu đúng trạng thái khi giao dịch chưa hoàn tất | Chưa có — xác lập qua usability test | Assumption: ít nhất 90% người tham gia chọn đúng bước tiếp theo | Bài kiểm tra tình huống thành công/đang xử lý/không thành công | Trước phát hành |
| USC-004 | Khách không cần liên hệ hỗ trợ chỉ để hỏi trạng thái | Chưa có — phân loại ticket 30 ngày trước phát hành | Assumption: giảm ít nhất 50% ticket thuộc nhóm “không rõ trạng thái thanh toán” | Báo cáo ticket hỗ trợ theo lý do | 30 ngày sau phát hành |
| USC-005 | Khách nhận hoặc tra cứu được xác nhận thanh toán | Chưa có — xác lập trước khi phát hành | Assumption: ít nhất 98% giao dịch thành công có xác nhận khách truy cập được | Đối chiếu giao dịch thành công với xác nhận được cung cấp | Hàng tuần trong tháng đầu |

## 10. Open Questions

- [ ] OQ-1: Phương thức thanh toán nội địa nào bắt buộc có ngay để đáp ứng phần lớn khách hàng mục tiêu?
- [ ] OQ-2: Khách quay lại có đồng ý lưu thông tin hỗ trợ checkout nhanh hơn hay chỉ muốn nhập lại nhưng quy trình ngắn hơn?
- [ ] OQ-3: Kênh nào được xem là nguồn xác nhận chính khi khách không nhận được thông báo chủ động?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
