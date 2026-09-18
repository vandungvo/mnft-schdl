---
type: srs
feature: smart-notification
status: draft
updated: 2026-07-16
links:
  - docs/smart-notification/brainstorms/notification-idea.md
---

# smart-notification — Software Requirements Specification‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Scope‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

SRS này đặc tả trung tâm thông báo (notification center) cho app học tiếng Anh, gồm kênh in-app và kênh email. User xem danh sách thông báo, đánh dấu đã đọc, mute từng kênh riêng lẻ, và nhận email digest tổng hợp hằng ngày. Trọng tâm nghiệp vụ: đảm bảo user không bị làm phiền quá mức (mute chủ động, digest gộp thay vì gửi rời rạc) trong khi vẫn không bỏ lỡ thông báo quan trọng.

Rủi ro cần theo dõi qua các quy tắc cụ thể: mute kênh chỉ tạm thời (BR-smart-notification-001) để tránh user quên bật lại và mất thông báo vĩnh viễn; digest chỉ gửi khi có nội dung thật (BR-smart-notification-002) để tránh spam hộp thư trống. Nhánh lỗi đáng chú ý gồm tải danh sách thất bại (FR-smart-notification-003 liên quan, xem E-smart-notification-001) và gửi email thất bại có retry (E-smart-notification-002 — lưu ý mã lỗi đúng là email gửi lỗi ở Mục 5, không nhầm với lỗi lưu cấu hình mute).

__Boundary (out of scope):__ push notification (mobile OS-level), SMS, notification preferences theo từng loại nội dung (chỉ mute theo kênh, chưa mute theo topic), lịch sử thông báo quá 90 ngày.

## 2. Functional Requirements (FR)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Title | Description | Priority | Source |
|----|-------|-------------|----------|--------|
| FR-smart-notification-001 | Hiển thị danh sách thông báo | User xem danh sách thông báo in-app theo thứ tự mới nhất trước, tối đa 50 item/trang; mỗi item hiển thị tiêu đề, tóm tắt, thời gian, trạng thái đã đọc/chưa đọc. | P0 | CAP-smart-notification-01 |
| FR-smart-notification-002 | Đánh dấu đã đọc | User đánh dấu 1 thông báo hoặc toàn bộ danh sách là đã đọc; badge số chưa đọc (FR-smart-notification-005) giảm tương ứng ngay lập tức. | P0 | CAP-smart-notification-01 |
| FR-smart-notification-003 | Mute kênh thông báo | User tắt (mute) riêng kênh in-app hoặc kênh email trong tối đa 30 ngày (BR-smart-notification-001); hệ thống tự bật lại khi hết hạn mute, không cần thao tác thủ công. | P1 | brainstorm Mục 4 |
| FR-smart-notification-004 | Gửi email digest hằng ngày | Hệ thống gửi 1 email tổng hợp các thông báo chưa đọc mỗi ngày lúc 07:00 theo múi giờ địa phương của user (NFR-smart-notification-002); chỉ gửi khi có ≥1 thông báo chưa đọc (BR-smart-notification-002). | P1 | brainstorm Mục 5 |
| FR-smart-notification-005 | Badge số chưa đọc | Hiển thị badge đếm số thông báo chưa đọc trên icon chuông; hiển thị tối đa "99+" khi vượt 99, không hiển thị số chính xác quá lớn gây rối giao diện. | P0 | brainstorm Mục 3 |

## 3. Non-Functional Requirements (NFR)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Category | Requirement | Acceptance |
|----|----------|-------------|------------|
| NFR-smart-notification-001 | performance | Danh sách thông báo tải xong trong dưới 1 giây cho 50 item đầu tiên. | Đo thời gian từ lúc mở màn tới lúc render đủ 50 item, ≤1s ở điều kiện mạng bình thường. |
| NFR-smart-notification-002 | reliability | Email digest hằng ngày phải gửi đúng 07:00 theo múi giờ địa phương đã lưu của user, sai lệch không quá 15 phút. | Kiểm log gửi email: thời điểm gửi thực tế nằm trong khung 06:45-07:15 giờ địa phương user. |

## 4. Business Rules‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Rule | Trigger | Implements FR | Source |
|----|------|---------|---------------|--------|
| BR-smart-notification-001 | Mute 1 kênh tối đa 30 ngày liên tục; hết hạn thì hệ thống tự bật lại kênh đó, không cần user thao tác. | User bật mute kênh | FR-smart-notification-003 | brainstorm Mục 4 |
| BR-smart-notification-002 | Digest hằng ngày chỉ gửi khi user có ít nhất 1 thông báo chưa đọc tại thời điểm gửi; không có thông báo chưa đọc thì bỏ qua ngày đó, không gửi email rỗng. | Job gửi digest 07:00 hằng ngày | FR-smart-notification-004 | brainstorm Mục 5 |

## 5. Error Matrix

| Error ID | Title | Trigger | Screen state | Recovery |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
|----------|-------|---------|--------------|----------|
| E-smart-notification-001 | Tải danh sách thông báo thất bại | Lỗi mạng hoặc lỗi hệ thống khi load danh sách tại màn `notification-list` | notification-list, banner lỗi thay khu vực danh sách | "Không tải được thông báo. [Thử lại]" |
| E-smart-notification-002 | Lưu cấu hình mute thất bại | Lỗi khi lưu thao tác mute/unmute kênh tại màn `notification-settings` | notification-settings, inline dưới toggle kênh | "Không lưu được thay đổi. Vui lòng thử lại." (giữ nguyên trạng thái toggle trước đó) |
| E-smart-notification-003 | Gửi email digest lỗi | Lỗi khi gửi email digest hằng ngày (SMTP/service lỗi) | Không có màn hình (background job) | Hệ thống tự động retry 3 lần, cách nhau 15 phút; retry thất bại cả 3 lần thì bỏ qua ngày đó và ghi log để vận hành theo dõi. |

## 6. Data Entities (tóm tắt — chi tiết ở erd.md)

* __Notification__ — 1 thông báo gửi tới user. Attributes nghiệp vụ: tiêu đề, tóm tắt nội dung, loại thông báo, trạng thái đã đọc/chưa đọc, thời gian tạo.
* __ChannelPreference__ — cấu hình mute theo từng kênh của user. Attributes nghiệp vụ: kênh (in-app/email), trạng thái mute, thời điểm bắt đầu mute, thời điểm hết hạn mute (tối đa 30 ngày sau bắt đầu).
* __DigestJob__ — 1 lần chạy gửi email digest hằng ngày cho 1 user. Attributes nghiệp vụ: ngày chạy, trạng thái (thành công/bỏ qua-không-có-nội-dung/thất bại), số lần retry đã thực hiện.

## 7. Flows (tóm tắt — chi tiết ở flows.md)

* __Xem danh sách thông báo__ — mở màn notification-list → tải danh sách (lỗi thì hiện E-smart-notification-001) → user đọc/đánh dấu đã đọc → badge cập nhật.
* __Mute kênh__ — mở notification-settings → chọn kênh → bật mute → xác nhận ở mute-confirm → lưu cấu hình (lỗi thì hiện E-smart-notification-002) → tự bật lại sau tối đa 30 ngày.
* __Gửi digest hằng ngày__ — job chạy 07:00 giờ địa phương → kiểm tra có thông báo chưa đọc → có thì gửi email, không thì bỏ qua → lỗi gửi thì retry theo E-smart-notification-003.

## 8. Screens (tóm tắt — chi tiết ở ascii-wireframe/)

* __notification-list__ — danh sách thông báo, badge số chưa đọc, nút đánh dấu đã đọc từng item hoặc toàn bộ, icon vào cài đặt kênh.
* __notification-settings__ — danh sách kênh (in-app/email) với toggle mute từng kênh, hiển thị thời hạn mute còn lại nếu đang mute.
* __mute-confirm__ — xác nhận trước khi kích hoạt mute 1 kênh, nêu rõ thời hạn 30 ngày và hành vi tự bật lại.

## 9. Constraints & Assumptions

* Email digest phụ thuộc service gửi email transactional đã có sẵn (dùng chung hạ tầng với các email khác của hệ thống).
* Múi giờ địa phương của user lấy từ hồ sơ tài khoản đã lưu; user chưa có múi giờ thì digest tạm hoãn tới khi có.
* Không giới hạn số lượng thông báo lưu trữ trong 90 ngày gần nhất (đã nêu ở Mục 1 Boundary).

## 10. Open Questions

* [ ] OQ-1: User mute cả 2 kênh (in-app và email) cùng lúc — có cần cảnh báo riêng để tránh mất hoàn toàn thông báo trong 30 ngày không, hay giữ nguyên hành vi cho phép tự do?
* [ ] OQ-2: Digest hằng ngày hiện gộp mọi loại thông báo chưa đọc — có cần tách theo mức độ ưu tiên (quan trọng lên đầu email) ở phiên bản sau không?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
