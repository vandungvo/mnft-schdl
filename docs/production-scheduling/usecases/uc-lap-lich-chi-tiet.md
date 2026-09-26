# Use Case: Lập lịch chi tiết 2 tuần

> Scope: System · Level: User goal

## Primary Actor

Quản đốc / Ban lãnh đạo

## Trigger

Quản đốc chọn 1 kỳ 2 tuần (dựa trên 1 aggregate run đã hoàn tất) và bấm "Lập lịch chi tiết".

## Preconditions

* Aggregate run (feature `production-planning`) đã hoàn tất cho kỳ tương ứng.
* Master data đầy đủ: machine, machine_eligibility, changeover_matrix, mold, shift cho mọi loại sản phẩm liên quan (feature `master-data`).

## Guarantees

* **Minimal Guarantee:** Nếu solve thất bại (infeasible/thiếu dữ liệu), hệ thống không ghi lịch sai, báo lỗi rõ ràng, dữ liệu hệ thống không bị thay đổi.
* **Success Guarantee:** Lịch chi tiết hợp lệ được sinh ra, lưu vào `schedule_runs` + `schedule_run_results`, sẵn sàng cho feature `explanation` đọc lại không cần giải lại.

## Main Success Scenario

1) Quản đốc chọn kỳ 2 tuần (từ 1 aggregate run đã có) và bấm "Lập lịch chi tiết".
2) Hệ thống nạp master data liên quan (machine, eligibility, changeover, mold, shift) và dữ liệu đơn hàng trong kỳ.
3) Hệ thống giải bài toán CP-SAT (FJSP) với các ràng buộc dòng nguyên liệu qua tồn bán thành phẩm giữa các công đoạn, machine eligibility, changeover, lô tối thiểu, chu kỳ bảo trì khuôn, hiệu suất sử dụng máy.
4) Hệ thống lưu kết quả vào `schedule_runs` (audit trail) + `schedule_run_results` (chi tiết Gantt).
5) Hệ thống trả về Gantt chi tiết cho Quản đốc xem.

## Extensions

**1a. Chưa có aggregate run hoàn tất cho kỳ tương ứng:**
* 1a1. Hệ thống chặn hành động, báo rõ thiếu input.
* 1a2. Hệ thống hướng dẫn chạy Production Planning trước (E-production-scheduling-002).

**2a. `changeover_matrix` thiếu cặp loại sản phẩm cần dùng trong kỳ:**
* 2a1. Hệ thống chặn solve, báo thiếu dữ liệu.
* 2a2. Hệ thống hướng dẫn bổ sung qua Master Data (E-production-scheduling-003).

**3a. Solver không tìm được lời giải OPTIMAL trong 900 giây nhưng có ≥1 lời giải FEASIBLE:**
* 3a1. Hệ thống trả lời giải FEASIBLE tốt nhất tìm được, đánh dấu `solve_status=FEASIBLE`.
* 3a2. Hệ thống cảnh báo rõ trên UI (E-production-scheduling-001).

**3c. Solver kết luận bài toán INFEASIBLE thật sự (không có lời giải nào thoả mọi ràng buộc cứng):**
* 3c1. Hệ thống đánh dấu `solve_status=INFEASIBLE`, không ghi Gantt.
* 3c2. Hệ thống báo lỗi rõ, chỉ ra ràng buộc cứng đang xung đột qua feature `explanation` (sensitivity); không tự nới ràng buộc (E-production-scheduling-005).

**3b. Khuôn đạt `max_cycles`/`maintenance_cycle_days` trong kỳ đang lập lịch:**
* 3b1. Hệ thống tự chèn buổi bảo trì vào lịch tại thời điểm đạt ngưỡng (E-production-scheduling-004).

## Related Requirements

FR-production-scheduling-001..013, NFR-production-scheduling-001, NFR-production-scheduling-002, E-production-scheduling-001..004
