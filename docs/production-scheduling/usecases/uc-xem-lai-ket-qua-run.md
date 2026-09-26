# Use Case: Xem lại kết quả 1 lần chạy đã có

> Scope: System · Level: User goal

## Primary Actor

Quản đốc / Ban lãnh đạo

## Trigger

Quản đốc mở lại 1 lần chạy detailed scheduling đã có, từ danh sách lịch sử hoặc link trực tiếp `run_id`.

## Preconditions

* `run_id` tồn tại trong `schedule_runs` với `run_type=detailed`.

## Guarantees

* **Minimal Guarantee:** Nếu `run_id` không tồn tại, hệ thống báo lỗi rõ, không trả dữ liệu sai.
* **Success Guarantee:** Hệ thống trả đúng Gantt đã lưu của lần chạy đó, không giải lại.

## Main Success Scenario

1) Quản đốc chọn 1 `run_id` từ lịch sử các lần chạy.
2) Hệ thống đọc `schedule_run_results` theo `run_id`.
3) Hệ thống trả về Gantt chi tiết y hệt lần chạy gốc.

## Extensions

**1a. `run_id` không tồn tại hoặc không phải `run_type=detailed`:**
* 1a1. Hệ thống báo lỗi "không tìm thấy lần chạy".

## Related Requirements

FR-production-scheduling-010
