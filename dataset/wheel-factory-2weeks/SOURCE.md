# Wheel factory — 2-week synthetic instance (self-authored, not external)

**Tạo ngày:** 2026-10-03 (schema 5, cùng engine `models/common/stage_runs/` với bộ nhỏ) | **Mục đích:** đánh giá **tốc độ chạy** và **chất lượng lịch** của 8 phương pháp khi bài toán có quy mô gần thực tế (kế hoạch 2 tuần), bổ sung cho bộ 3 ngày `../wheel-factory-small/`.

Dữ liệu tổng hợp **tự sinh cho đồ án**, không phải dữ liệu nhà máy thật.

## Cách sinh

```
build_raw.py ──► raw_input.json ──► ../wheel-factory-small/prepare.py ──► model_input.json
(seed cố định)   (tầng 1)            (dùng chung, không sửa)                (tầng 2)
```

```powershell
python dataset/wheel-factory-2weeks/build_raw.py
python dataset/wheel-factory-small/prepare.py dataset/wheel-factory-2weeks/raw_input.json dataset/wheel-factory-2weeks/model_input.json
```

`build_raw.py` đọc `../wheel-factory-small/raw_input.json` và **chỉ đổi** horizon, lịch máy, đơn hàng, tồn kho, đơn dài hạn và chính sách làm trước. Máy, thời gian gia công, khuôn, ma trận setup, cỡ lượt, độ trễ chuyển công đoạn, trọng số và cách chia tầng mục tiêu **giữ nguyên**, nên khác biệt kết quả giữa hai bộ chỉ đến từ quy mô và lịch. Nguồn của các thông số giữ nguyên xem `../wheel-factory-small/SOURCE.md`.

## Những gì khác bộ nhỏ

| Mục | Bộ nhỏ | Bộ 2 tuần | Ghi chú |
|---|---|---|---|
| Horizon | 3 ngày | **14 ngày** (T2 05/10 → CN 18/10/2026) | Kỳ lập lịch chi tiết 2 tuần của pipeline 2 tầng |
| Mốc đo tồn an toàn | 3 | 14 (cuối mỗi ngày) | |
| Lịch máy | 3 ca/ngày mọi ngày | **Cả nhà máy nghỉ Chủ nhật** (N7, N14), kể cả lò nhiệt luyện; ngày thường lò chạy 24/7 | Theo phản hồi người dùng 2026-10-03 |
| Dừng máy | CNC_2 30' ngày 1 | CNC_2 bảo trì 08–12h N4; **HT_2 bảo trì 08–16h N9** | Ước tính |
| Đơn | 4 đơn, 108 vành | **24 đơn, 980 vành** | Khách nhận hàng T3/T5/T7 lúc 16:00, mỗi lần đủ 4 mã; số lượng = cơ cấu gốc 64/32/48/28 × U(0,75; 1,25), làm tròn theo thùng 4 vành, seed `20261005` |
| Đơn gấp | O001 | O001 (F bạc, N2) và O015 (R bạc, N9): ưu tiên 4, hạn 12:00 | Mỗi tuần 1 đơn |
| Ưu tiên thường | — | F bạc 3, F đen 2, R bạc 2, R đen 1 | |
| Tồn thành phẩm đầu / an toàn / trần | 10/8/40 … | F bạc **18**/24/160, F đen 20/12/90, R bạc 30/18/120, R đen **8**/12/80 | Tồn an toàn ≈ 1/3 một đợt nhận hàng. F bạc và R đen mở kỳ **dưới** tồn an toàn (sau một tuần giao nhiều), nên kế hoạch phải tự bù; nếu không, thành phần thiếu tồn an toàn không bao giờ khác 0 |
| Thời điểm giao | `release = 0`: giao ngay khi QC xong | **`release = due`**: khách chỉ lấy hàng đúng giờ hẹn | Hàng làm xong sớm nằm trong kho, tính vào trần kho và dư tồn |
| Tồn BTP đầu kỳ | xem bộ nhỏ | F: phôi 16, đã nhiệt luyện 48, đã gia công 12; R: 12 / 40 / 10; đã sơn 6/4/5/3 | WIP đầu tuần, dòng R theo tỉ lệ nhu cầu (R ≈ 80% F) |
| Đơn dài hạn | LT001–LT003 | LT001–LT004 (tuần 3–4): 160 / 60 / 100 / 40 | |
| Làm trước | RL001, RL002, RB001 | **RL001–RL003** (2 lô F bạc, 1 lô F đen), **RB001–RB002** (1 lượt đúc R bạc, 1 lượt đúc R đen) | 5 phương án, `prepare.py` kiểm đủ hàng cho cả 32 tổ hợp |

## Kết quả bước chuẩn bị (`prepare.py`)

- **269 lượt chạy** (240 bắt buộc + 29 thuộc phương án làm trước), 49 lô QC; gấp khoảng 6 lần bộ nhỏ (42 lượt).
- **Tải tối thiểu** (phút gia công ÷ phút máy có trong 14 ngày, chưa tính setup):

| | cast | heat | machining | paint | qc |
|---|---|---|---|---|---|
| Chỉ bắt buộc | 13% | **56%** | 22% | 10% | 10% |
| Bật mọi phương án làm trước | 15% | **65%** | 25% | 10% | 11% |

- Tồn BTP dư cuối kỳ do cỡ lượt lệch nhau (chỉ việc bắt buộc): 120 vành.

## Thay đổi engine đi kèm

Với `release = due`, luật điều độ làm mọi việc ngay khi có hàng nên thành phẩm dồn kho tới 342 vành F bạc (trần 160): lịch không hợp lệ. Bộ dựng lịch dùng chung (`models/common/stage_runs/decoder.py`, cho FIFO/EDD/SPT, SA, GA và lịch khởi đầu của CP-SAT + gợi ý, CP-LNS) nay có luật **kho đầy thì chờ**: một lô QC chỉ bắt đầu khi thành phẩm sau lô đó không vượt trần ở các mốc kiểm (giao hàng tính ở giờ hẹn). CP-SAT đã có ràng buộc trần kho từ trước. Bộ nhỏ (`release = 0`) không bị ảnh hưởng: luật điều độ ra đúng điểm cũ, 20 test `test_stage_runs` vẫn qua.

## Đánh giá

Chạy cả 8 phương pháp, 3 seed × 120 giây, 1 worker CP-SAT, tuần tự:

```powershell
python -m models.run_all --input dataset/wheel-factory-2weeks/model_input.json --seconds 120 --seeds 11 29 47
python experiment/plan_page_data.py models/runs/v2/comparison/<run_id> <out.json>   # dữ liệu cho trang lịch
```

Kết quả lưu ở `models/runs/v2/comparison/20261003T122013902225Z/` (dữ liệu đã sửa: giao đúng giờ hẹn, 2 mã mở kỳ dưới tồn an toàn, WIP dòng R theo tỉ lệ; bộ dựng lịch có luật kho đầy thì chờ). Các thư mục cũ cùng ngày `20261003T103727176988Z`, `20261003T112807725978Z`, `20261003T113935114013Z` dùng dữ liệu trước khi sửa — không dùng.
