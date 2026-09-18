# Use Case: Xem danh sách thông báo‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Scope: Smart Notification Center · Level: sea

## Primary Actor‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Learner

## Trigger‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Learner mở màn hình Thông báo (từ icon chuông trên thanh điều hướng chính, có badge số chưa đọc).

## Preconditions‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- Learner đã đăng nhập.
- App đã đồng bộ dữ liệu thông báo gần nhất của Learner.

## Guarantees‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Minimal Guarantee:** Nếu tải danh sách thất bại, không hiển thị dữ liệu sai lệch/thiếu ngữ cảnh; badge số chưa đọc giữ nguyên giá trị lần tải thành công gần nhất.
- **Success Guarantee:** Danh sách thông báo hiển thị đầy đủ, đúng thứ tự mới nhất trước; mọi thông báo Learner đã xem được đánh dấu đã đọc và badge số chưa đọc giảm tương ứng.

## Main Success Scenario

1. Learner mở màn hình Thông báo.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
2. System tải danh sách thông báo (in-app) của Learner, sắp xếp mới nhất trước.
3. System hiển thị danh sách kèm badge số lượng chưa đọc trên từng mục chưa xem.
4. Learner chạm vào 1 thông báo để xem chi tiết.
5. System đánh dấu thông báo đó là đã đọc và giảm badge số chưa đọc tương ứng.

## Extensions

**3a. Tải danh sách thất bại (lỗi mạng hoặc lỗi hệ thống):**
- 3a1. System hiển thị thông báo lỗi tải danh sách (E-smart-notification-001) kèm tùy chọn thử lại.
- 3a2. Use case kết thúc, giữ Minimal Guarantee — badge vẫn giữ giá trị lần tải thành công gần nhất, không hiển thị danh sách rỗng giả.

## Related Requirements

- FR-smart-notification-001 — hiển thị danh sách thông báo
- FR-smart-notification-002 — đánh dấu đã đọc
- FR-smart-notification-005 — badge số chưa đọc
- NFR-smart-notification-001 — danh sách tải dưới 1 giây cho 50 items‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
