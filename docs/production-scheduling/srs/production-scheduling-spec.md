---
type: srs
feature: production-scheduling
status: draft
updated: 2026-09-21
links: []
---

# production-scheduling — Software Requirements Specification

## 1. Scope

Tầng 2 của pipeline lập lịch: **Detailed Scheduling**, horizon 2 tuần. Nhận đầu vào là 1 lần chạy Production Planning (Tầng 1, aggregate theo tháng/quý) đã hoàn tất, sinh lịch chi tiết theo ngày/ca cho từng công đoạn đúc→CNC→sơn→kiểm tra chất lượng của mọi đơn hàng trong kỳ, đảm bảo lịch hợp lệ về mặt vật lý (dòng nguyên liệu giữa các công đoạn qua tồn bán thành phẩm, công suất máy, machine eligibility, changeover, lô tối thiểu, chu kỳ bảo trì khuôn) và tối ưu hoá đa mục tiêu (makespan, tardiness, changeover time, idle time, thiếu hụt tồn kho an toàn). Không bao gồm: chạy lại lịch cho kịch bản what-if/đơn gấp/máy hỏng (thuộc feature `explanation` — counterfactual), giải thích kết quả (thuộc feature `explanation`), CRUD dữ liệu chủ (thuộc feature `master-data`), lập kế hoạch tháng/quý (thuộc feature `production-planning`).

## 2. Actors & Stakeholders

| Actor | Loại | Mục tiêu | Trong scope? |
|-------|------|----------|--------------|
| Quản đốc / Ban lãnh đạo | người | Bấm "Lập lịch chi tiết" cho 1 kỳ 2 tuần, xem lại Gantt kết quả | Có |
| Detailed Scheduling Engine (CP-SAT) | hệ thống | Giải bài toán FJSP, trả lịch hợp lệ + tối ưu | Có |
| Production Planning (Tầng 1) | hệ thống | Cung cấp aggregate run làm input | Có (dependency, không sở hữu logic) |
| Master Data | hệ thống | Cung cấp machine/eligibility/changeover/mold/shift (đọc-only) | Có (dependency, không sở hữu logic) |
| Explanation | hệ thống | Đọc `schedule_run_results` để giải thích, có thể yêu cầu giải lại (counterfactual) | Không (downstream consumer, xem feature riêng) |

## 3. Functional Requirements (FR)

| ID | Title | Description | Priority | Verify by | Source |
|----|-------|-------------|----------|-----------|--------|
| FR-production-scheduling-001 | Sinh lịch chi tiết 2 tuần | Khi Quản đốc bấm "Lập lịch chi tiết" cho 1 kỳ 2 tuần (chọn từ 1 aggregate run đã có), hệ thống phải sinh lịch theo ngày/ca cho đúc→CNC→sơn→QC của mọi đơn hàng trong kỳ | P0 | demo | TECHNICAL_SPEC §1 |
| FR-production-scheduling-002 | Trình tự công đoạn | Công đoạn sau chỉ được bắt đầu khi tồn bán thành phẩm của công đoạn trước (theo mã sản phẩm) đủ lượng cho lượt chạy; không phải chờ toàn lô ở công đoạn trước hoàn thành | P0 | kiểm tra | TECHNICAL_SPEC §2; report/problem-requirements A09–A10, R12 |
| FR-production-scheduling-003 | Không chồng lấn máy | Mỗi máy chỉ xử lý 1 công đoạn tại 1 thời điểm | P0 | kiểm tra | TECHNICAL_SPEC §2 |
| FR-production-scheduling-004 | Machine eligibility | Chỉ gán công đoạn cho máy nằm trong `machine_eligibility` của loại sản phẩm đó | P0 | kiểm tra | TECHNICAL_SPEC §2, §6 |
| FR-production-scheduling-005 | Changeover time | Khi 2 công đoạn liên tiếp trên cùng máy thuộc 2 loại sản phẩm khác nhau, cộng thêm thời gian chuyển đổi theo `changeover_matrix` | P0 | kiểm tra | TECHNICAL_SPEC §2, §6 |
| FR-production-scheduling-006 | Quy mô lô tối thiểu | Gộp/hoãn công việc nhỏ lẻ để đạt ngưỡng lô tối thiểu theo công đoạn/sản phẩm, trừ khi vi phạm hạn giao hàng | P1 | kiểm tra | TECHNICAL_SPEC §2, §2.2 |
| FR-production-scheduling-007 | Chu kỳ bảo trì khuôn | Theo dõi `used_cycles` mỗi khuôn, tự chèn buổi bảo trì vào lịch khi đạt `maintenance_cycle_days`/`max_cycles` | P0 | kiểm tra | TECHNICAL_SPEC §2, §6 |
| FR-production-scheduling-008 | Phạt trễ hạn | Tính điểm phạt tardiness cho đơn hàng hoàn thành sau `due_day` trong hàm mục tiêu (ràng buộc mềm, không cấm cứng) | P0 | kiểm tra | TECHNICAL_SPEC §2 |
| FR-production-scheduling-009 | Quyết định bật máy theo ca | Quyết định máy nào được bật (mở ca) mỗi ca dựa trên khối lượng công việc; phạt trong hàm mục tiêu nếu bật mà không đạt hiệu suất mục tiêu (NFR-002) | P0 | kiểm tra | TECHNICAL_SPEC §2.2 |
| FR-production-scheduling-010 | Lưu kết quả cho Explanation | Trả Gantt kết quả (ngày, máy, job, start, end, shift) và lưu vào `schedule_run_results` để feature `explanation` đọc lại không cần giải lại | P0 | test | TECHNICAL_SPEC §6 |
| FR-production-scheduling-011 | Audit trail | Ghi 1 bản ghi `schedule_runs` (run_type=detailed, input_hash, created_at) mỗi lần chạy | P1 | test | TECHNICAL_SPEC §6 |
| FR-production-scheduling-012 | Xử lý timeout và infeasible | Khi solver không tìm được lời giải OPTIMAL trong NFR-001 (900s) nhưng có lời giải FEASIBLE, trả lời giải tốt nhất kèm cảnh báo rõ (E-001); khi solver kết luận INFEASIBLE thật sự, báo lỗi rõ chỉ ra ràng buộc cứng xung đột, không tự nới ràng buộc (E-005) | P0 | test | TECHNICAL_SPEC §2.1, §11 |
| FR-production-scheduling-013 | Kết quả tái lập được | Cùng input phải cho cùng output giữa các lần chạy dùng cho demo/báo cáo (`random_seed` cố định, `num_search_workers=1`) | P1 | test | TECHNICAL_SPEC §11 |

## 4. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Priority | Acceptance |
|----|----------|-------------|----------|------------|
| NFR-production-scheduling-001 | performance | Thời gian giải Detailed Scheduling (horizon 2 tuần) tối đa 900 giây (15 phút); hết hạn mà chưa OPTIMAL → trả FEASIBLE tốt nhất + cảnh báo (FR-012) | P0 | Đo thời gian solve mọi run trong bộ test; 100% ≤900s |
| NFR-production-scheduling-002 | business-outcome | Hiệu suất sử dụng máy trong ca đã bật đạt ≥90% | P0 | (thời gian máy có việc thực / thời gian máy bật) trung bình ≥90% trên bộ test tổng hợp |

## 5. Business Rules

| ID | Rule | Trigger | Implements FR | Source |
|----|------|---------|----------------|--------|
| BR-production-scheduling-001 | Trình tự công đoạn cố định đúc→CNC→sơn→QC cho mọi sản phẩm; nguyên liệu của công đoạn sau lấy từ tồn bán thành phẩm theo mã sản phẩm và công đoạn | Luôn áp dụng | FR-production-scheduling-002 | TECHNICAL_SPEC §1 |
| BR-production-scheduling-002 | Ràng buộc hiệu suất máy là MỀM — nếu không đủ việc, solver được phép không bật máy | Khi khối lượng công việc trong ca thấp | FR-production-scheduling-009 | TECHNICAL_SPEC §2.2 |
| BR-production-scheduling-003 | Chỉ dùng dữ liệu tổng hợp (synthetic) tham số hoá theo hiểu biết nghiệp vụ, đối chiếu Mota et al. (2020) — không có dữ liệu nhà máy thật | Luôn áp dụng | FR-production-scheduling-001 | TECHNICAL_SPEC §9 |

## 6. Error Matrix

| Error ID | Title | Trigger | Severity | Related FR | Recovery |
|----------|-------|---------|----------|------------|----------|
| E-production-scheduling-001 | Solver timeout | Không tìm được lời giải OPTIMAL trong 900s nhưng có ≥1 lời giải FEASIBLE | major | FR-production-scheduling-012 | Trả FEASIBLE tốt nhất tìm được + cảnh báo rõ trên UI |
| E-production-scheduling-002 | Thiếu aggregate plan nguồn | Bấm "Lập lịch chi tiết" khi chưa có aggregate run hoàn tất cho kỳ tương ứng | critical | FR-production-scheduling-001 | Chặn hành động, báo rõ thiếu input, hướng dẫn chạy Production Planning trước |
| E-production-scheduling-003 | Thiếu cặp changeover | `changeover_matrix` thiếu cặp loại sản phẩm A↔B cần dùng trong kỳ | critical | FR-production-scheduling-005 | Chặn solve, báo thiếu dữ liệu, yêu cầu bổ sung qua Master Data |
| E-production-scheduling-004 | Khuôn vượt chu kỳ giữa lịch | Khuôn đạt `max_cycles`/`maintenance_cycle_days` trong khoảng thời gian của kỳ đang lập lịch | major | FR-production-scheduling-007 | Solver tự chèn buổi bảo trì vào lịch tại thời điểm đạt ngưỡng |
| E-production-scheduling-005 | Bài toán INFEASIBLE thật sự | CP-SAT kết luận không có lời giải nào thoả mọi ràng buộc cứng (vd tổng công suất máy khả dụng trong kỳ nhỏ hơn nhu cầu đơn hàng) | critical | FR-production-scheduling-012 | Báo lỗi rõ, chỉ ra ràng buộc cứng đang xung đột (qua sensitivity của feature `explanation`); KHÔNG tự nới ràng buộc |

## 7. Success Criteria

| ID | Outcome nghiệp vụ | Đo bằng | Mốc đạt |
|----|--------------------|---------|---------|
| SC-production-scheduling-01 | Lịch hợp lệ vật lý (không vi phạm tồn kho thành phẩm và bán thành phẩm, công suất máy, dòng nguyên liệu giữa các công đoạn) | Số vi phạm ràng buộc cứng khi chạy bộ kịch bản test tổng hợp | 0 vi phạm trên 100% kịch bản |
| SC-production-scheduling-02 | Hiệu suất sử dụng máy ca đã bật | (thời gian máy có việc / thời gian máy bật) trung bình mỗi run | ≥90% (NFR-002) |
| SC-production-scheduling-03 | Kết quả đủ để feature `explanation` giải thích không cần giải lại | `schedule_run_results` lưu đầy đủ mọi run; tỉ lệ run có dữ liệu explain-ready | 100% run |
| SC-production-scheduling-04 | Thời gian giải trong ngưỡng chấp nhận được | Thời gian solve + `solve_status` log mỗi run | 100% run ≤900s, cảnh báo rõ khi FEASIBLE thay vì OPTIMAL |
| SC-production-scheduling-05 | Chất lượng lời giải không thua kém đáng kể kết quả tốt nhất đã công bố trên benchmark công khai | So sánh objective (makespan) với published best-known trên cùng instance Taillard/Lawrence/Deliktaş | TBD — chốt ngưỡng % sau khi có kết quả thực nghiệm đầu tiên (tuần 10 theo roadmap `report/TECHNICAL_SPEC.md` §8) |

## 8. Data Entities (tóm tắt — chi tiết ở erd.md)

**Sở hữu bởi feature này (ghi):**
- `ScheduleRun` — id, run_type (='detailed'), input_hash, created_at. **Đề xuất bổ sung so với data model gốc:** trường `solve_status` (OPTIMAL/FEASIBLE/INFEASIBLE) — cần thiết để FR-012/NFR-001 có nơi lưu kết quả, hiện `TECHNICAL_SPEC.md` §6 chưa liệt kê trường này.
- `ScheduleRunResult` — run_id, day, machine_id, job_name, start, end, shift_id.

**Đọc-only (sở hữu bởi feature khác):**
- `Order` (master-data) — id, type, qty, due_day.
- `Machine`, `MachineEligibility` (master-data).
- `ChangeoverMatrix` (master-data) — type_a, type_b, setup_time.
- `Mold` (master-data) — id, machine_id, product_type, max_cycles, used_cycles, maintenance_cycle_days.
- `Shift` (master-data) — id, start_time, end_time, labor_cost.

**Đã chốt (2026-09-18):** `production-scheduling` KHÔNG tự ghi `molds.used_cycles`. Quản đốc phải bấm "Xác nhận lịch này" (thao tác riêng, thuộc feature `master-data`) sau khi xem Gantt — lúc đó `used_cycles` mới cộng dồn. Tránh cộng nhầm khi Quản đốc chạy thử nhiều lần với input khác nhau trước khi chốt. → cần ghi thành 1 FR mới khi viết `master-data-spec.md`.

## 9. Flows (tóm tắt — chi tiết ở flows.md)

- **Lập lịch chi tiết**: Quản đốc chọn kỳ 2 tuần từ 1 aggregate run → hệ thống nạp master data liên quan → CP-SAT solve → lưu `schedule_runs` + `schedule_run_results` → trả Gantt. Nhánh lỗi: E-001..E-004.
- **Xem lại kết quả 1 lần chạy** (`GET /scheduling/detailed/{run_id}`): đọc trực tiếp `schedule_run_results` đã lưu, không giải lại.

## 10. Screens (tóm tắt — chi tiết ở ascii-wireframe/, chưa chạy Tier 3)

- Gantt tầng 2 (đúc→CNC→sơn→QC theo ngày/ca) — theo `TECHNICAL_SPEC.md` §1.1, roadmap tuần 7.

## 11. Constraints, Dependencies & Assumptions

**Constraints:**

| Ràng buộc | Source / Owner |
|-----------|-----------------|
| Thời gian giải tối đa 900s/run | Dũng (NFR-001, kinh nghiệm dự án cũ) |
| Chỉ dùng OR-Tools CP-SAT, không viết lại thuật toán từ đầu | `TECHNICAL_SPEC.md` §4 |

**Dependencies:**

| Phụ thuộc | Owner | Blocks nếu chưa sẵn |
|-----------|-------|------------------------|
| Aggregate run hoàn tất cho kỳ tương ứng | feature `production-planning` | Chặn hoàn toàn (E-002) |
| Master data đầy đủ (machine/eligibility/changeover/mold/shift) | feature `master-data` | Chặn 1 phần (E-003) hoặc sai lệch kết quả nếu thiếu âm thầm |

**Assumptions:**

| Giả định | Invalidate gì nếu sai |
|----------|------------------------|
| Dữ liệu tổng hợp (synthetic) phản ánh đúng đặc điểm ngành sản xuất bánh xe | SC-05 (so sánh benchmark) vẫn hợp lệ nhưng SC-01/02 trên dữ liệu tổng hợp riêng không còn đại diện cho nhà máy thật |

## 12. Open Questions

(none — điểm mơ hồ duy nhất đang ở dạng marker inline tại Mục 8, sẽ xử lý ở vòng OQ cuối của `/srs`)
