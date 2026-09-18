# Flow: Xem danh sách thông báo‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Màn hình thuộc flow này: notification-list. Flow tổng xem `../srs/smart-notification-userflow.md` Mục 1.

***

## Screen: notification-list — Danh sách thông báo‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Wireframe (ASCII)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```text
┌────────────────────────────────────┐
│ < Quay lai     Thong bao    [(!)]  │
├────────────────────────────────────┤
│ (5 chua doc)         < Cai dat >   │
├────────────────────────────────────┤
│ [1] * Chuoi hoc 7 ngay!            │
│     Ban da hoc lien tuc 7 ngay     │
│     2 gio truoc                    │
├────────────────────────────────────┤
│ [2]   Bai hoc moi: Present Perfect │
│       Da them vao lo trinh cua ban │
│       Hom qua                      │
├────────────────────────────────────┤
│ [3] * Nhac on tap tu vung          │
│     12 tu sap den han on tap       │
│     Hom qua                        │
├────────────────────────────────────┤
│        [ Danh dau tat ca da doc ]  │
└────────────────────────────────────┘
```

### Screen description‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | Items | Control type | Data type | Description |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
|---|-------|--------------|-----------|--------------|
| 1 | Badge chưa đọc | Label | ReadOnly | • Đếm số thông báo chưa đọc (FR-smart-notification-005), hiển thị dạng "(N chưa đọc)".<br>• Vượt 99 thì hiển thị "99+", không hiện số chính xác quá lớn.<br>• Cập nhật ngay khi user đánh dấu đã đọc (item hoặc toàn bộ). |
| 2 | Danh sách thông báo | List | ReadOnly | • Tối đa 50 item/trang, sắp xếp mới nhất trước (FR-smart-notification-001); mỗi item gồm tiêu đề, tóm tắt, thời gian, dấu `*` cho item chưa đọc.<br>• Tải thất bại (lỗi mạng/hệ thống) → banner lỗi thay khu vực danh sách: "Không tải được thông báo. [Thử lại]" (E-smart-notification-001).<br>• States: loading (skeleton) / loaded / error (E-smart-notification-001) / empty ("Chưa có thông báo nào"). |
| 3 | Item thông báo (click) | Link | Click | • Bấm 1 item → đánh dấu đã đọc item đó (FR-smart-notification-002), badge giảm 1 ngay lập tức.<br>• Điều hướng tới nội dung liên quan (bài học/chuỗi học) nếu có; không có đích cụ thể thì chỉ đổi trạng thái đã đọc, ở lại màn. |
| 4 | Đánh dấu tất cả đã đọc | Button | Click | • Đánh dấu toàn bộ danh sách hiện tại là đã đọc (FR-smart-notification-002); badge về "(0 chưa đọc)".<br>• Disabled khi không còn item chưa đọc. |
| 5 | Icon cài đặt kênh | Link | Click | • Điều hướng sang màn `notification-settings` (flow mute-channel) để quản lý mute từng kênh. |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
