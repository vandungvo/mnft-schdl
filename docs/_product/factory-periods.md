# Nhà máy · Sổ đơn hàng · Kỳ lập lịch

Thiết kế lại luồng dữ liệu (10/2026) để **mỗi kỳ chỉ phải nhập đơn hàng và tồn đầu kỳ**, thay vì nhập lại cả file JSON chứa toàn bộ dữ liệu nhà máy. Áp dụng cho mô hình 5 công đoạn (schema 5). Mô hình 4 công đoạn (schema 4) và kịch bản JSON vẫn giữ nguyên, nằm ở mục *Nâng cao*.

## 1. Dữ liệu tách theo tần suất thay đổi

| Lớp | Đổi khi nào | Ở đâu trong hệ thống | Ai sửa |
|---|---|---|---|
| **Cấu hình nhà máy**: công đoạn, cỡ lượt, thời gian chuyển công đoạn, sản phẩm và quy trình (mã bán thành phẩm), máy (định mức, thời gian cố định, ma trận chuyển đổi, lịch theo ca / 24/7), khuôn, mẫu ca, ngày nghỉ hằng tuần, ngày lễ, bảo trì định kỳ hằng tuần, chính sách mục tiêu | Vài lần/năm | `factories` + `factory_versions` (mỗi lần lưu = 1 phiên bản bất biến, có thể kèm ngày hiệu lực) — trang **Nhà máy** | Kỹ sư sản xuất |
| **Sổ đơn hàng** | Liên tục | `order_book` — trang **Sổ đơn hàng** (nhập Excel/CSV/dán từ Excel, thêm tay) | Kinh doanh / planner |
| **Đầu vào kỳ**: đơn của kỳ (lấy từ sổ), tồn thành phẩm/bán thành phẩm đầu kỳ, chu kỳ khuôn, ngoại lệ lịch máy (hỏng, bảo trì đột xuất, nghỉ), chính sách, làm trước | Mỗi kỳ (2 tuần) | `planning_periods.inputs` — trang **Kỳ lập lịch → Chuẩn bị** | Planner |
| **Suy ra, không nhập**: lô QC, phân bổ lô–đơn, các lượt từng công đoạn, phương án làm trước, mốc kiểm tồn, phút tương đối, downtime từ lịch | — | `compile_period()` → `models/common/stage_runs/prepare.py` | Hệ thống |

Kỳ được **biên dịch** thành kịch bản schema 5 (một `master_datasets` có `owner_period_id`), nên engine, validator, KPI, bàn điều độ và nhật ký chốt lịch được dùng lại nguyên vẹn. Biên dịch tách–ghép đã kiểm chứng: `dataset/wheel-factory-2weeks` tách thành nhà máy + kỳ rồi biên dịch lại cho đúng `model_input.json` gốc (`backend/tests/test_factories.py`).

## 2. Vòng đời một kỳ

```
Sổ đơn hàng ──► Tạo kỳ (chọn ngày) ──► Chuẩn bị ──► Sinh & so sánh ──► Chốt ──► Thực hiện ──► Đóng kỳ & tạo kỳ sau
                 · lấy cấu hình nhà     · đơn         (bàn điều độ        (lý do     · lệnh sản xuất    · đơn đã giao rời sổ
                   máy đang hiệu lực    · đầu kỳ       dùng chung với      chốt)     · sự cố → lập lại  · tồn cuối kỳ dự kiến
                 · lấy đơn còn mở       · lịch máy     kịch bản)                       lịch               = đầu kỳ sau
                 · đầu kỳ = tồn cuối    · chính sách
                   kỳ trước (dự kiến)
```

- **Tạo kỳ**: chỉ chọn ngày bắt đầu và số ngày. Phiên bản cấu hình = phiên bản mới nhất có ngày hiệu lực ≤ ngày bắt đầu. Đơn còn mở có hạn tới hết kỳ (kể cả đơn quá hạn) thành đơn trong kỳ; đơn có hạn trong `lookahead_days` sau kỳ thành đơn dài hạn (chỉ dùng cho làm trước).
- **Tồn đầu kỳ** được dự kiến từ lịch đã chốt của kỳ trước (`schedule_state` tại cuối kỳ). Giao diện giữ số dự kiến để tô sáng ô người lập lịch sửa theo số đếm thực tế.
- **Lấy từ kho** của từng đơn: để trống thì hệ thống tự phân bổ phần tồn *trên mức an toàn* cho đơn có hạn sớm nhất. Đơn mang sang từ kỳ trước giữ số đã làm cho nó.
- **Lưu đầu vào** = biên dịch lại. Nếu lỗi, kỳ chuyển sang *Cần sửa*, kịch bản cũ được giữ nguyên, và lỗi được báo bằng câu song ngữ dễ hiểu (vd. "Công đoạn heat quá tải: cần ít nhất … phút máy…").
- **Biến thể what-if**: bản sao đầu vào của kỳ để thử thay đổi (thêm đơn gấp, nghỉ máy, đổi chính sách). Biến thể nào được chốt thì đó là lịch thực hiện.
- **Lập lại lịch sau sự cố**: chọn thời điểm cắt (và máy hỏng tới khi nào). Phần đã chạy trước thời điểm cắt được giữ nguyên (`frozen_until`). Lượt đang chạy dở được coi là hoàn tất và máy bận tới khi lượt đó kết thúc (`busy_until`). Tồn, khuôn và đơn đã giao lấy theo trạng thái tại thời điểm cắt. Làm trước bị tắt để không làm trước hai lần.
- **Đóng kỳ**: lịch đang thực hiện (bản lập lại lịch được chốt gần nhất, nếu không thì lịch chốt của kỳ hoặc biến thể) được coi là đã chạy. Các đơn nó giao (gộp cả phần giao trước mỗi thời điểm cắt) được đánh dấu *đã giao* trong sổ đơn hàng.

## 3. Quy ước

- Thời gian người dùng thấy là giờ địa phương của nhà máy dạng `YYYY-MM-DDTHH:MM`; engine dùng phút tính từ 00:00 ngày đầu kỳ.
- Tồn đầu kỳ vượt trần kho (ví dụ khi cắt giữa ngày, vì trần chỉ kiểm ở mốc cuối ngày) thì trần của kỳ đó tạm nâng lên bằng tồn đầu kỳ, kèm cảnh báo; không chặn việc lập lịch.
- Trạng thái máy đầu kỳ vẫn là `machine_initial_state` chung (engine chưa hỗ trợ trạng thái riêng từng máy). Đây là cách tính bảo thủ: luôn cộng một lần chuyển đổi đầu kỳ.
- Kịch bản do kỳ biên dịch không sửa hay xoá trực tiếp được (API trả `409 SCENARIO_OWNED_BY_PERIOD`). Link tới `/scenarios/{id}` tự chuyển về trang kỳ tương ứng.

## 4. API

| Nhóm | Endpoint |
|---|---|
| Nhà máy | `GET/POST /factories`, `POST /factories/import` (tài liệu schema 5 → nhà máy + sổ đơn + kỳ đầu), `GET/PATCH /factories/{id}`, `PUT /factories/{id}/config` (phiên bản mới, `expected_version`, `effective_from`), `GET /factories/{id}/versions/{v}`, `GET /factories/{id}/outlook` (tải từng tuần) |
| Sổ đơn | `GET/POST /factories/{id}/orders`, `PUT/DELETE /factories/{id}/orders/{code}`, `POST /factories/{id}/orders/import` (`format` csv/tsv/xlsx, `commit=false` để xem trước) |
| Kỳ | `GET/POST /periods`, `GET/PATCH/DELETE /periods/{id}`, `PUT /periods/{id}/inputs`, `POST /periods/{id}/recompile`, `/upgrade-factory`, `/book-sync`, `/variants`, `/reschedule`, `/close`, `/rollover`, `GET /periods/{id}/state?at=` |

## 5. Mã nguồn

- `backend/app/factory_model.py`: mô hình miền thuần (cấu hình, đầu vào kỳ, `compile_period`, `schedule_state`, `split_document`).
- `backend/app/factories.py`, `backend/app/periods.py`, `backend/app/order_import.py`, `backend/app/api/factory_routes.py`, migration `20261027_0012`.
- `models/common/stage_runs/prepare.py`: bước suy ra lô/lượt, dùng chung với `dataset/wheel-factory-small/prepare.py`.
- Frontend: `app/{page,periods,orders,factory}`, `components/{period,orders,factory}`, `components/scenario/workspace.tsx` (bàn điều độ dùng chung cho kịch bản và kỳ).
