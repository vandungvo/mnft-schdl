# Các đợt chạy đã lưu

Mỗi thư mục timestamp UTC (giờ Việt Nam = UTC+7) là một đợt chạy độc lập, không bị ghi đè. Đợt chạy được xếp theo phiên bản mô hình; `run_all` và `<method>.run` tự ghi vào `v1/` hoặc `v2/` theo `schema_version` của input.

```
runs/
  v1/                      đợt chính của mô hình v1 (lô đi qua 4 công đoạn)
  v2/                      đợt chính của mô hình v2 (lượt theo công đoạn, 5 công đoạn)
  archive/v1, archive/v2   chạy thử và đợt bỏ dở, không dùng để so sánh
```

Bên trong mỗi nhánh:

- `comparison/<run>/`: bảng tổng hợp của đợt (`REPORT.md`, `index.html`, `results.csv`, `results.json`, `config.json`, `input.json`).
- `comparison/latest.json`: đợt hoàn tất gần nhất của phiên bản đó.
- `<method>/results/<run>/seed_<seed>/`: kết quả từng lần chạy (`result.json`, `schedule.json`, `schedule.csv`, `gantt.html`, giao hàng, tồn kho, số liệu ca, `solver.log`, snapshot input và mã nguồn).

## v1 — đợt chính

Input `wheel_factory_48_lots_2weeks` ở **schema 1** (trước khi có tồn bán thành phẩm). Engine v1 hiện tại đọc schema 4 nên cho số khác: chạy lại EDD ngày 30/09/2026 ra 75.876 thay vì 68.017. Chưa có đợt so sánh đầy đủ nào được lưu cho engine v1 hiện tại.

| Run | Ngân sách | Lần chạy hợp lệ | Ghi chú |
|---|---|---|---|
| `20260918T172523480257Z` | 30 giây × seed 11/29/47 | 15/18 | Đợt chính đầu tiên, có `audit.json`. CP-SAT không hint trả UNKNOWN cả 3 seed. Tốt nhất: SA 43.545 (EDD 68.017) |
| `20260919T015246251063Z` | 900 giây × seed 11/29/47 | 15/18 | Cùng input, ngân sách dài. Tốt nhất: CP-LNS 37.802. Log chạy: `run.log` trong thư mục đợt |

## v2 — đợt chính

Input `dataset/wheel-factory-small/model_input.json` (schema 5).

| Run | Ngân sách | Lần chạy hợp lệ | Ghi chú |
|---|---|---|---|
| `20260930T084648619393Z` | 30 giây × seed 11/29/47 | 18/18 | Công thức mục tiêu **một tầng** (cũ). Giữ để đối chiếu trước/sau khi đổi công thức; không so điểm trực tiếp với đợt dưới |
| `20260930T094223177417Z` | 30 giây × seed 11/29/47 | 18/18 | Công thức **hai tầng** hiện hành. Tốt nhất: CP-LNS 40 · 10.564. Đây là đợt được trích trong `dataset/wheel-factory-small/SOURCE.md` |

## Lưu trữ (`archive/`)

| Run | Phiên bản | Vì sao không dùng |
|---|---|---|
| `20260918T171910991353Z` | v1 | Chạy thử 5 giây, 3 phương pháp |
| `20260918T171928620010Z` | v1 | Chạy thử 6 giây, 5 phương pháp |
| `20260918T171945266300Z` | v1 | Chạy thử 6 giây, 3 phương pháp |
| `20260918T172004660393Z` | v1 | Chạy thử 30 giây, 2 phương pháp CP |
| `20260918T172507328498Z` | v1 | Chạy thử 3 giây, 3 phương pháp |
| `20260919T015058933143Z` | v1 | Đợt 60 giây bỏ dở sau 4/18 lần chạy, không có `REPORT.md` |
| `20260930T093606624761Z` | v2 | Đợt 30 giây bỏ dở sau 10/18 lần chạy (chưa tới CP-SAT có hint và CP-LNS), không có `REPORT.md` |

Các đợt chạy thử của v1 có thay đổi decoder hoặc độ chặt hạn giao giữa chừng; không gộp thứ hạng với đợt chính.

## Khi so sánh

- Đối chiếu `input_sha256` và `code_sha256` trước khi so hai đợt. Khác một trong hai thì điểm không so trực tiếp được.
- Báo cáo giữ cả lần chạy không có nghiệm; không loại thất bại rồi chỉ lấy trung bình trên những lịch thuận lợi.
- Thời gian gồm dựng mô hình và khởi tạo, có thể vượt ngân sách chút ít do điểm dừng, import hoặc một lượt decode đang chạy.
- Thử nghiệm sản xuất dự trữ `optional_stock/` lưu kết quả riêng ở `models/optional_stock/results/`, không nằm trong cây này.
