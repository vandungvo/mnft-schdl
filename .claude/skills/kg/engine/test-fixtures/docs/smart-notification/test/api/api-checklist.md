---
type: api-checklist
feature: smart-notification
api_type: own
status: draft
updated: 2026-07-16
links:
  - docs/smart-notification/srs/smart-notification-spec.md
---

# API Checklist — Smart Notification‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Hiểu API‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

API own gửi email digest hằng ngày (FR-smart-notification-004): job nội bộ tổng hợp thông báo chưa đọc, gọi service gửi email lúc 07:00 theo múi giờ địa phương user, chỉ gửi khi có ≥1 thông báo chưa đọc (BR-smart-notification-002). Gửi lỗi (SMTP/service lỗi) thì tự động retry 3 lần cách nhau 15 phút, thất bại cả 3 lần thì bỏ qua ngày đó và ghi log (E-smart-notification-003).

## 2. Checklist‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | API | Dir | Endpoint | Dimension | Scenario | Trigger | HTTP | Expected Result | Ref | P | Auto | Conf |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | own | out | POST /v1/digest/send | Happy | Gửi digest hằng ngày khi có thông báo chưa đọc | job 07:00 chạy, user có ≥1 thông báo chưa đọc | 201 | Email digest được tạo và gửi; job không gửi trùng trong cùng ngày | FR-smart-notification-004 | 1 | Yes | 🟢 |
| 2 | own | out | POST /v1/digest/send | Business error | Gửi digest lỗi service/SMTP, cần retry | service gửi trả lỗi tạm thời | 500 | Job tự động retry, tối đa 3 lần cách nhau 15 phút; hết 3 lần vẫn lỗi thì bỏ qua ngày đó và ghi log vận hành | E-smart-notification-003 | 1 | Yes | 🟢 |
| 3 | own | out | GET /v1/digest/status | Happy | Tra trạng thái lần gửi digest gần nhất | gọi tra cứu sau khi job chạy | 200 | Trả trạng thái gửi (thành công/retry/bỏ qua) của lần chạy gần nhất, dùng cho vận hành theo dõi | — | 3 | No | 🟡 |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
