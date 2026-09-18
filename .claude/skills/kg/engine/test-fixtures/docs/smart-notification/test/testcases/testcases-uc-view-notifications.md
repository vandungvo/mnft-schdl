---
**STT:** 01
**Category:** Truy cập màn Thông báo
**Sub-Category:** Hiển thị danh sách
**Checklist:** CHK-smart-notification-001 — Verify danh sách thông báo hiển thị đúng thứ tự mới nhất trước, tối đa 50 item/trang
**Ref:** FR-smart-notification-001
**Priority:** 1
**Title:** Verify danh sách thông báo sắp xếp mới nhất trước, giới hạn 50 item/trang
**Description:** Kiểm tra màn notification-list tải danh sách thông báo in-app đúng thứ tự thời gian giảm dần và không vượt quá 50 item trên 1 trang.
**Auto:** Yes
**Preconditions:** Learner đã đăng nhập và có ít hơn 50 thông báo trong 90 ngày gần nhất

**Step:** 1
**Action:** Learner mở màn hình Thông báo từ icon chuông trên thanh điều hướng chính
**Expected:** Màn notification-list mở, hệ thống bắt đầu tải danh sách
**Test Data:** —

**Step:** 2
**Action:** Quan sát thứ tự và số lượng item trong danh sách vừa tải
**Expected:** Danh sách hiển thị các thông báo theo thứ tự mới nhất trước; số item hiển thị không vượt quá 50
**Test Data:** —
---
**STT:** 02
**Category:** Đánh dấu đã đọc + badge
**Sub-Category:** Cập nhật trạng thái đã đọc
**Checklist:** CHK-smart-notification-003 — Verify chạm vào 1 thông báo đánh dấu thông báo đó là đã đọc và badge số chưa đọc giảm tương ứng ngay lập tức
**Ref:** FR-smart-notification-002
**Priority:** 1
**Title:** Verify chạm vào thông báo chưa đọc chuyển trạng thái đã đọc và giảm badge ngay lập tức
**Description:** Kiểm tra hành động chạm vào 1 thông báo chưa đọc cập nhật trạng thái đã đọc/chưa đọc của đúng item đó và badge số chưa đọc giảm tương ứng (FR-smart-notification-005) mà không cần tải lại trang.
**Auto:** Yes
**Preconditions:** Learner đã đăng nhập, danh sách notification-list đang hiển thị ít nhất 1 thông báo ở trạng thái chưa đọc, badge hiện tại hiển thị 3

**Step:** 1
**Action:** Learner chạm vào 1 thông báo đang ở trạng thái chưa đọc trong danh sách
**Expected:** Thông báo được mở xem chi tiết và item đó chuyển sang trạng thái đã đọc trong danh sách
**Test Data:** badge trước đó: 3

**Step:** 2
**Action:** Quan sát badge số chưa đọc trên icon chuông ngay sau khi thông báo được đánh dấu đã đọc
**Expected:** Badge giảm còn "2" ngay lập tức, không cần tải lại màn hình
**Test Data:** badge sau: 2‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
---
**STT:** 03
**Category:** Đánh dấu đã đọc + badge
**Sub-Category:** Cập nhật trạng thái đã đọc
**Checklist:** CHK-smart-notification-005 — Verify badge hiển thị "99+" khi số thông báo chưa đọc vượt quá 99, không hiển thị số chính xác quá lớn
**Ref:** FR-smart-notification-005
**Priority:** 2
**Title:** Verify badge chuyển hiển thị "99+" khi số thông báo chưa đọc vượt quá 99
**Description:** Kiểm tra badge số chưa đọc trên icon chuông không hiển thị số chính xác gây rối giao diện khi vượt ngưỡng 99, mà chuyển sang dạng rút gọn "99+".
**Auto:** Yes
**Preconditions:** Learner đã đăng nhập, tài khoản có 100 thông báo chưa đọc

**Step:** 1
**Action:** Learner mở màn hình Thông báo khi có 100 thông báo chưa đọc
**Expected:** Badge trên icon chuông hiển thị "99+", không hiển thị "100"
**Test Data:** số thông báo chưa đọc: 100
---‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
