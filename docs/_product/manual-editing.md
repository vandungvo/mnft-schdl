# Chỉnh lịch bằng tay và tối ưu phần còn lại

Người lập lịch không chỉ chọn giữa các phương án solver sinh ra: họ sửa trực tiếp một phương án theo hiểu biết thực tế (máy sắp bảo trì, khách gọi đổi ưu tiên, tổ sản xuất muốn gom ca), còn hệ thống lo phần tính toán. Tính năng áp dụng cho mô hình 5 công đoạn (schema 5) — kỳ lập lịch và kịch bản JSON schema 5.

## Luồng sử dụng

1. **Mở trình sửa** — tab *Xem lịch & so sánh* → *Sửa lịch này bằng tay* (hoặc nút *Sửa tay* trong bảng xem nhanh của một phương án). Kỳ đã đóng không có nút này.
2. **Sửa** (mỗi thao tác hoàn tác được — `Ctrl Z` / `Ctrl Shift Z`):
   - kéo một thanh Gantt sang máy khác cùng công đoạn hoặc sang giờ khác (bước 15 phút); máy không làm được lượt đó thì bóng thanh chuyển đỏ và không thả được;
   - hoặc chọn lượt (bấm / `Enter`) rồi đổi máy, *Làm trước* / *Làm sau*, đặt *Không bắt đầu trước*;
   - *Khoá* lượt phải giữ nguyên (nút trong bảng lượt hoặc phím `L`) — dùng cho bước tối ưu.
3. **Xem tác động ngay** — sau mỗi thao tác, backend dựng lại giờ, chạy bộ kiểm độc lập và chấm điểm: dải KPI (đúng hạn, tổng trễ, thiếu tồn an toàn, chi phí vận hành, ca-máy) hiện chênh lệch so với bản gốc; lỗi hiện bằng lời (ví dụ "Kho bán thành phẩm F_CAST vượt sức chứa lúc …"); viền nét đứt đánh dấu lượt bị ảnh hưởng.
4. **Lưu thành phương án mới** (tên, lý do) — hoặc **Tối ưu phần còn lại…**: chọn giữ các lượt đã sửa, vùng giữ nguyên (24 h / 48 h đầu / tới một mốc) và thời gian (30 s / 2 / 5 phút); có thể lưu cả bản tay để so sánh. Tối ưu chạy nền như mọi lần chạy solver; xong thì có thông báo.
5. Bản sửa và bản tối ưu nằm cạnh các phương án solver: được xếp hạng theo cùng chính sách, so sánh, chốt như bình thường. Nếu không lọt vào đề xuất, chúng vẫn hiện ở mục *Bản của bạn ngoài đề xuất* kèm lý do.

## Quy tắc tính toán

- **Người quyết định máy và thứ tự, máy tính lo giờ.** `models/common/stage_runs/manual.py::rebuild` xếp mỗi máy đúng thứ tự người sửa đặt, mỗi lượt vào ô sớm nhất hợp lệ theo đúng quy tắc của decoder: cửa sổ ca, setup theo lượt trước, chu kỳ và bảo trì khuôn, tồn bán thành phẩm, sức chứa kho thành phẩm.
- **Ít xáo trộn nhất** (`apply_edits`): lượt không bị sửa giữ giờ cũ làm mốc sớm nhất — chỉ lượt bị đẩy mới dời muộn hơn. Không sửa gì thì dựng lại trùng khớp lịch gốc (kể cả lịch CP-SAT). Chế độ *Dồn sớm nhất* bỏ các mốc này.
- **Bộ kiểm độc lập có tiếng nói cuối**: bản sửa chỉ lưu được khi `evaluate.validate` hợp lệ.
- **Tối ưu phần còn lại** (`repair`): xuất phát từ bản sửa; trước hết dồn ca các lượt không khoá (`compact`), sau đó CP-SAT xếp lại từng vùng lân cận (khung giờ, hai máy, một công đoạn, ngẫu nhiên) chỉ trong các lượt không khoá. Lượt khoá giữ nguyên máy, khuôn, giờ. Kết quả không bao giờ tệ hơn bản sửa. Nếu còn công suất trống, CP-SAT có thể thêm lượt làm trước cho đơn dài hạn.
- **Phương án gốc không bao giờ bị sửa** — mỗi lần chạy là bằng chứng tái lập.

## API

| Endpoint | Ý nghĩa |
|---|---|
| `POST /api/v1/schedule-runs/{id}/edits/preview` | Dựng lại, kiểm tra, chấm điểm; không ghi gì. Trả `valid`, `issues`, `metrics`, `base_metrics`, `changes`, `operations`. |
| `POST /api/v1/schedule-runs/{id}/edits` | Lưu bản sửa hợp lệ thành lần chạy mới `algorithm = "manual"`, `status = SUCCEEDED`, cùng `input_hash`. Hỗ trợ `Idempotency-Key`. |
| `POST /api/v1/schedule-runs/{id}/edits/optimize` | Đưa vào hàng đợi lần chạy `algorithm = "cp_repair"` (202). Hỗ trợ `Idempotency-Key`. |

Thân yêu cầu: `sequence` (thứ tự lượt trên từng máy — đủ mọi lượt của lịch gốc), `moved`, `not_before` (phút trong horizon), `compact`, `label`, `note`; với *optimize* thêm `pinned`, `keep_edited`, `freeze_until`, `time_budget_seconds`, `seed`.

Mã lỗi ổn định: `EDIT_INVALID`, `EDIT_EMPTY`, `EDIT_NOT_SUPPORTED` (schema 4), `RUN_NOT_EDITABLE`, `PERIOD_CLOSED`, `NOT_BEFORE_OUTSIDE_HORIZON`, `NOTHING_TO_OPTIMIZE`, `UNKNOWN_RUN`, `TIME_BUDGET_EXCEEDED`. Trong `issues` của bản xem trước: `NO_FEASIBLE_SLOT`, `NOT_ELIGIBLE`, `DUPLICATE_RUN`, `RUN_SET_CHANGED`, `UNKNOWN_MACHINE`, `STOCK_CAP`, `BTP_SHORT`, `BTP_CAPACITY`, `FINISHED_SHORT`, `HORIZON`, `OTHER`.

## Dữ liệu và vận hành

- Không có bảng mới: bản sửa và bản tối ưu là `schedule_runs` bình thường. Nguồn gốc nằm trong `solver_metadata` (`edited_from`, `label`, `note`, `moved`, `not_before`, `fixed`, `changed_runs`…).
- `cp_repair` mang dữ liệu đầu vào (lịch đã sửa và danh sách lượt giữ) trong `solver_metadata.repair` từ lúc tạo tới lúc xong, nên vẫn chạy lại được sau khi server khởi động lại; khi xong chỉ giữ phần nguồn gốc, không lưu lại lịch đầu vào.
- `manual` và `cp_repair` không thể *retry* bằng solver (422) và không xuất hiện trong hộp thoại *Sinh phương án*.
- Mọi lần lưu / đưa vào hàng đợi được ghi audit: `schedule_run.manual_edit`, `schedule_run.repair_queued` (worker ghi `schedule_run.succeeded` / `failed` như mọi lần chạy).
- Ghi (lưu, tối ưu) cần quyền operator như mọi thao tác ghi; kỳ đã đóng từ chối với `PERIOD_CLOSED`.

## Kiểm thử

- `models/tests/test_manual_edits.py` — dựng lại đúng lịch gốc, chỉ đẩy lượt cần đẩy, `not_before`, *dồn sớm*, lỗi kế hoạch, tối ưu giữ lượt khoá và không tệ hơn.
- `backend/tests/test_api.py`, `backend/tests/test_factories.py` — xem trước, lưu, idempotency, xếp hạng cùng phương án, từ chối có mã, tối ưu bất đồng bộ, kỳ đã đóng.
