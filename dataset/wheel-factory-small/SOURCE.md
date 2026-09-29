# Wheel factory — small synthetic instance (self-authored, not external)

**Tạo ngày:** 2026-09-30 | **Trạng thái:** đã sinh + đã kiểm chứng end-to-end (check_input, CP-SAT solve, FIFO/EDD/SPT decode, validator độc lập)

## Nguồn

Không phải benchmark bên ngoài — đây là dữ liệu tổng hợp **tự sinh cho đồ án**, cùng schema (`schema_version: 3`) với `models/input/wheel_factory.json`, sinh bởi `build_small.py` trong chính folder này (tái lập bằng `python dataset/wheel-factory-small/build_small.py`). Mục đích: trả lời câu hỏi "bộ dataset nào thoả `report/problem-requirements/problem_requirements.md` mà vẫn đủ nhỏ để đọc tay" — không bộ benchmark công khai nào trong `dataset/` thoả được (xem lịch sử hội thoại/chat log liên quan), nên đề tài cần bộ nhỏ riêng.

## Quy mô

5 lô (`L001`–`L005`), 4 đơn hàng (`O001`–`O004`), 6 máy (`CAST_1`, `CAST_2`, `CNC_1`, `CNC_2`, `PAINT_1`, `QC_1`), horizon 2 ngày (2880 phút), 4 sản phẩm (`F_SILVER`, `F_BLACK`, `R_SILVER`, `R_BLACK`). File JSON ~860 dòng — đọc tay được trong một buổi, khác hẳn `wheel_factory.json` gốc (48 lô/2 tuần/3951 dòng).

## Ánh xạ business rule → chỗ thể hiện trong dữ liệu

| Mã | Thể hiện ở đâu trong instance |
|---|---|
| A01 (lô, tách đơn thành nhiều lô) | `O001` tách thành `L001`+`L002`; mọi lô đều là **lô bắt buộc** (schema hiện tại chưa có field lô dự trữ — xem mục "Chưa mô hình" bên dưới) |
| A02 (lượng dư kỹ thuật, initial_allocated) | `L002`, `L005` có `quantity` (24) > lượng phân bổ cho đơn (20) → dư kỹ thuật; `O001`, `O004` dùng `initial_allocated>0` từ tồn đầu kỳ |
| A03 (3 ca/ngày, ca bật theo máy) | `SHIFT_TEMPLATE` khai 3 ca (S1/S2/S3, 8h/ca, S2 có nghỉ 30'); `CAST_1/CAST_2/CNC_1/CNC_2` chỉ bật S1+S2, `PAINT_1/QC_1` chỉ bật S2+S3 — đúng "không bắt buộc mọi máy bật cả 3 ca" |
| A04 (setup sát trước gia công, từ trạng thái đầu kỳ) | mọi máy bắt đầu ở trạng thái `INITIAL` (`initial_product` = `INITIAL`, không gán sẵn sản phẩm): lô đầu tiên trên mỗi máy chịu **10 phút setup ban đầu** cho bất kỳ sản phẩm nào; từ lô thứ hai, `setup_matrix()` tính setup có hướng (silver→black ≠ black→silver ở paint) |
| A05 (khuôn, chu kỳ bảo trì) | `MOLD_1` (limit 12, initial 8) **bắt buộc bảo trì trước lô #1 và #3**; `MOLD_2` (limit 10, initial 2) **bắt buộc bảo trì chỉ trước lô #2** — đã xác nhận bằng solve thật (3 lần bảo trì, đúng dự đoán) |
| A06 (đơn vị thời gian, làm tròn) | mọi thời lượng dùng `ceil(...)` giống `models/common/instance.py:duration()` |
| A07 (sự cố, giữ phần đã làm) | **CHƯA mô hình** — xem mục "Chưa mô hình" |
| A08 (lô dự trữ tận dụng resource) | **CHƯA mô hình** — schema hiện tại (schema_version 3) không có field lô/lượt tuỳ chọn, `cp_engine.py` không có biến quyết định chọn/không-chọn lô |
| A09–A10 (BTP, độ trễ chuyển tiếp 10') | `btp_routing`: mã BTP **dùng chung giữa 2 màu** ở cast/cnc (`F_CAST`, `F_CNC`, `R_CAST`, `R_CNC`) vì màu chỉ cố định sau sơn — đúng ví dụ "BTP dùng chung cho nhiều màu sơn" A09 nêu; `transfer_minutes: 10` |
| R01–R02 (đủ việc, đúng trình tự, tài nguyên) | Kiểm bằng `models.common.evaluate.validate()` → `valid: True`, 0 lỗi |
| R03 (setup có hướng) | ma trận paint: `SILVER→BLACK=12`, `BLACK→SILVER=24` |
| R04 (giới hạn lô, dư không vượt) | `minimum_lot: 20` (mọi lô ≥20), `max_surplus: 10` ≥ tổng dư thật (4+4=8) |
| R05 (bảo trì khuôn) | xem A05 |
| R06 (ca khả dụng, downtime) | `CNC_2` có `downtime: [[900,930]]` — khoảng dừng khai báo trước, tách biệt với giờ nghỉ ca |
| R07 (bảo toàn tồn kho) | `evaluate()` báo `end_inventory` khớp `initial_inventory` + QC hoàn tất − giao hàng |
| R08 (hạn giao) | `O001` due=960 (urgent, priority 4); 3 đơn còn lại due rải ở ngày 2 |
| R09 (tồn kho an toàn) | `safety_stock` khai cho cả 4 sản phẩm |
| R11 (bảo toàn lịch đã chạy) | **CHƯA mô hình** — đây là bài toán tĩnh 1 lần chạy, không có định dạng input cho sự kiện tái lập lịch |
| R12 (tồn BTP, không âm/không vượt cap) | `inventory_btp` có tồn đầu kỳ ở cả 3 công đoạn — đúc: F_CAST=8, R_CAST=4; CNC: F_CNC=6, R_CNC=4; sơn: F_SILVER_PAINT=4, F_BLACK_PAINT=3, R_SILVER_PAINT=3, R_BLACK_PAINT=2 (tổng 34 = `max_surplus_btp`). `btp_capacity` (F_CNC=70, R_CNC=48 — bằng tổng lượng tối đa có thể cùng lúc + tồn đầu kỳ, để không phụ thuộc thời điểm chính xác của 1 lời giải cụ thể) |

## Đã kiểm chứng thật (không chỉ đúng schema)

Chạy qua đúng pipeline của đồ án (`models/common/`), không chỉ validate tĩnh:

| Phương pháp | Kết quả |
|---|---|
| `check_input()` | PASS |
| CP-SAT (`cp_engine.solve`, 20s) | `OPTIMAL`, makespan=696, objective=2655, 3 lần bảo trì (đúng dự đoán tay: CAST_1 ở lô #1+#3, CAST_2 ở lô #2), 0 trễ hạn |
| FIFO / EDD / SPT (`decoder.decode`) | cả 3 đều ra lịch khả thi, makespan=774, 0 trễ hạn |
| `evaluate.validate()` (validator độc lập) | `valid: True`, 0 lỗi cho **cả 4 lịch** (CP-SAT + 3 baseline) |

## Chưa mô hình (giới hạn của engine hiện tại, KHÔNG phải thiếu sót nghiệp vụ)

Đã rà `models/common/cp_engine.py` + `instance.py` (schema_version 3): 2 phần của `problem_requirements.md` **chưa có chỗ đứng trong schema/engine hiện tại**, nên bộ dữ liệu này (dù đúng schema) không thể "thoả" chúng — cần mở rộng code trước, không phải mở rộng dữ liệu:

1. **A08 / mục 4.3.2 — lô/lượt dự trữ tuỳ chọn để tận dụng resource.** Không có field lô tuỳ chọn trong schema, không có biến chọn/không-chọn trong `cp_engine.py`.
2. **A07 / R11 — sự cố + tái lập lịch.** Đây là bài toán tĩnh 1 lần chạy; chưa có định dạng input cho "trạng thái tại thời điểm sự kiện" (máy hỏng, đơn gấp) để tái lập phần tương lai.

Khi engine được mở rộng để hỗ trợ 2 phần này, dataset này cần bổ sung thêm field tương ứng (ví dụ đánh dấu `L00x` là lô dự trữ, hoặc thêm 1 file sự kiện tái lập lịch riêng) — chưa làm ở đây để tránh dữ liệu có field vô nghĩa mà engine không đọc.
