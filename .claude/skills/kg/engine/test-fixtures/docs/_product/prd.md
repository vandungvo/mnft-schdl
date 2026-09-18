---
type: prd-product
status: draft
updated: 2026-07-16
links: []
---

# App học tiếng Anh — Product Requirements Document (project-level)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. One-line Pitch‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

App học tiếng Anh giúp người học duy trì thói quen học mỗi ngày bằng trung tâm thông báo nhắc nhở đúng lúc và bảng xếp hạng tạo động lực cạnh tranh nhẹ nhàng với bạn học.

## 7. Feature Map‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Bảng Feature Map‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | Tính năng | Slug | Theme | Persona | Ưu tiên (MoSCoW) | Phụ thuộc | Chi tiết hóa |
|---|---|---|---|---|---|---|---|
| 1 | Trung tâm thông báo | `smart-notification` | Engagement | Learner | Must | — | ✅ đã chi tiết |
| 2 | Bảng xếp hạng | `leaderboard` | Engagement | Learner | Should | `smart-notification` | ⬜ chưa |

### 7.1 Trung tâm thông báo — `smart-notification`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Người học nhận thông báo in-app nhắc học bài, kèm badge số chưa đọc để dễ theo dõi. Người học tự chọn mute từng kênh thông báo khi thấy phiền, tối đa 30 ngày rồi tự bật lại. Đây là feature nền giữ người học quay lại app đều đặn.

__Phạm vi v1:__ danh sách thông báo + badge chưa đọc · cài đặt mute theo kênh · xác nhận trước khi mute.
__Chưa làm:__ thông báo đẩy (push) ngoài app · tùy chỉnh khung giờ nhắc.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

__Luồng chính:__
1. Người học mở trung tâm thông báo, xem danh sách mới nhất trước.
2. Bấm cài đặt kênh, chọn kênh muốn mute.
3. Xác nhận mute, hệ thống tắt thông báo kênh đó tối đa 30 ngày.

### 7.2 Bảng xếp hạng — `leaderboard`

Người học xem thứ hạng học tập so với bạn cùng lớp/nhóm để tạo động lực học tiếp. Cần trung tâm thông báo chạy trước để nhắc người học khi thứ hạng thay đổi.

__Phạm vi v1:__ bảng xếp hạng theo tuần · thông báo khi tụt hạng.
__Chưa làm:__ xếp hạng theo tháng · phần thưởng vật lý.

__Luồng chính:__
1. Người học mở bảng xếp hạng, xem vị trí hiện tại.
2. Hệ thống thông báo khi có thay đổi thứ hạng đáng kể.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
