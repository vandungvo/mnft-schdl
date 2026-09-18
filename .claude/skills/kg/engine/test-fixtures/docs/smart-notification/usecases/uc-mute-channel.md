# Use Case: Tắt (mute) một kênh thông báo‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Scope: Smart Notification Center · Level: sea

## Primary Actor‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Learner

## Trigger‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Learner bấm icon cài đặt trên màn danh sách thông báo để vào màn Cài đặt thông báo, rồi bấm "Mute" trên 1 kênh (in-app hoặc email).

## Preconditions‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* Learner đã đăng nhập.
* Learner đang ở màn Cài đặt thông báo (notification-settings), kênh muốn tắt hiện đang bật.

## Guarantees‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Minimal Guarantee:__ Nếu lưu mute thất bại, cấu hình kênh giữ nguyên trạng thái trước đó (không rơi vào trạng thái nửa-lưu, không hiển thị sai là đã mute).
* __Success Guarantee:__ Kênh được đánh dấu mute tối đa 30 ngày kể từ thời điểm xác nhận và tự động bật lại sau thời hạn; Learner không còn nhận thông báo qua kênh đó trong thời gian mute.

## Main Success Scenario‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1) Learner bấm icon cài đặt từ màn danh sách thông báo để mở màn Cài đặt thông báo.
2) Learner bấm "Mute" trên kênh muốn tắt.
3) System hiển thị màn xác nhận mute kèm thời hạn áp dụng (tối đa 30 ngày, tự bật lại).
4) Learner xác nhận.
5) System lưu cấu hình mute cho kênh đó và cập nhật màn Cài đặt thông báo phản ánh trạng thái đã mute.

## Extensions

__4a. Lưu cấu hình mute thất bại (lỗi mạng hoặc lỗi hệ thống):__
* 4a1. System hiển thị thông báo lỗi lưu mute thất bại (E-smart-notification-002) kèm tùy chọn thử lại.
* 4a2. Use case kết thúc, giữ Minimal Guarantee — kênh vẫn ở trạng thái bật như trước khi Learner bấm Mute.

## Related Requirements

* FR-smart-notification-003 — mute kênh
* BR-smart-notification-001 — mute tối đa 30 ngày, tự động bật lại sau thời hạn‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
