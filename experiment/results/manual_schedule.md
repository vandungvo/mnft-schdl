# Lịch lập tay cho ca chuẩn

**Cách lập:** lập tay theo kinh nghiệm điều độ, **không dùng solver hay thuật toán tối ưu**. Đây là một lịch hợp lệ, chưa chứng minh là tốt nhất.

- Dữ liệu: [standard_case.json](../data/standard_case.json). Lịch dạng máy đọc được: [manual_schedule.json](manual_schedule.json).
- Kiểm tra độc lập: `python experiment/check_schedule.py` (không giải bài toán, chỉ kiểm ràng buộc và tính KPI).
- Thời gian ghi kèm số phút từ t = 0 (T2 06:00). T2 = thứ Hai, T3 = thứ Ba.

## Các quy tắc kinh nghiệm đã dùng

1. **Đơn gấp trước:** O001 (hạn phút 720, ưu tiên 3) chạy đầu tiên; lô L01 dùng ngay tồn bán thành phẩm đầu kỳ sau đúc nên bỏ qua công đoạn đúc.
2. **Chuyên máy theo sản phẩm:** đúc bánh trước trên CAST_1, bánh sau trên CAST_2; CNC_1 làm bánh trước, CNC_2 làm bánh sau. Nhờ vậy gần như không phải đổi sản phẩm ở đúc và CNC.
3. **Sơn (máy duy nhất) chạy hết bánh trước rồi mới sang bánh sau:** đổi màu chỉ một lần (bạc→đen 12 phút), tránh đổi ngược đen→bạc tốn 24 phút.
4. **Chỉ dùng ca bắt buộc (S1):** không mở S2, S3 vì không tiết kiệm được hạn giao nào và mỗi lần mở tốn chi phí.
5. **Không để việc nào cắt giờ nghỉ hoặc downtime:** khi một lượt dài hơn phần còn lại của cửa sổ thì dời sang cửa sổ sau (ví dụ CNC L04, QC L03).
6. **Dùng công suất đúc còn trống để làm 2 lô dự trữ** (L10 bánh trước, L12 bánh sau) đi hết bốn công đoạn, để tồn thành phẩm cuối ngày không thấp hơn ngưỡng an toàn 20.
7. **Khuôn bánh sau:** đúc một lô (50 → 57 chu kỳ), bảo trì ngay (45 phút), rồi đúc tiếp; bảo trì làm ở ngày 1 khi máy đúc còn rảnh.
8. **Giao ngay khi đủ hàng.**

## Kết quả

| Chỉ số | Giá trị |
|---|---|
| Số lượt chạy / bảo trì | 41 / 1 |
| Makespan lô bắt buộc | **1.672 phút** (T3 09:52) |
| Độ trễ giao hàng | **0** ở cả 4 đơn |
| Tổng setup | 62 phút (đúc 16, CNC 10, sơn 36) |
| Thiếu safety stock (3 mốc cuối ngày) | **0** |
| Ca tùy chọn đã mở | 0 |
| Dư thành phẩm | 65 (bằng đúng giới hạn 65: 15 bắt buộc + 2 lô dự trữ) |
| Tồn bán thành phẩm cuối kỳ | 0 |
| Chi phí lượt tùy chọn / chi phí lưu | 150 / 107,5 |
| Idle trong ca bật (tổng 6 máy) | 6.548 phút |
| Hiệu suất sản xuất (gia công / khả dụng) | 17,2% |
| **Mục tiêu F** (trọng số trong dữ liệu) | **8.663,5** |

Phân rã F: makespan 1.672 + setup 3 × 62 = 186 + idle 6.548 + lượt tùy chọn 150 + lưu kho 107,5 + trễ 0 + thiếu safety 0 + mở ca 0.

### Đơn hàng

| Đơn | Hạn | Giao lúc | Trễ |
|---|---|---|---|
| O001 (trước bạc) | 720 | 126 (T2 08:06) | 0 |
| O002 (trước bạc) | 2.400 | 372 (T2 12:12) | 0 |
| O003 (sau đen) | 2.400 | 1.456 (T3 06:16) | 0 |
| O004 (sau đen) | 3.840 | 1.672 (T3 09:52) | 0 |

### Tồn thành phẩm tại các mốc cuối ngày

| Mốc | Trước bạc | Sau đen |
|---|---|---|
| 1.440 (cuối ngày 1) | 25 | 60 |
| 2.880 | 25 | 40 |
| 4.320 | 25 | 40 |

### Khuôn

- MOLD_F: 30 → 37 → 44 → 51 → 58 chu kỳ (ngưỡng 60), không cần bảo trì.
- MOLD_R: 50 → 57, bảo trì (T2 06:33–07:18), reset 0 → 7 → 14 → 21 → 28.

## Lịch theo máy


### CAST_1

| Từ | Đến | Việc | Setup | Mã lượt |
|---|---|---|---|---|
| T2 06:00 (0) | T2 06:32 (32) | Đúc L10 (trước bạc) [dự trữ] | - | R02 |
| T2 06:32 (32) | T2 07:04 (64) | Đúc L02 (trước bạc) | - | R04 |
| T2 07:04 (64) | T2 07:36 (96) | Đúc L03 (trước bạc) | - | R06 |
| T2 07:36 (96) | T2 08:08 (128) | Đúc L04 (trước bạc) | - | R08 |

### CAST_2

| Từ | Đến | Việc | Setup | Mã lượt |
|---|---|---|---|---|
| T2 06:00 (0) | T2 06:33 (33) | Đúc L12 (sau đen) [dự trữ] | - | R20 |
| T2 06:33 (33) | T2 07:18 (78) | bảo trì MOLD_R | - | - |
| T2 07:18 (78) | T2 08:07 (127) | Đúc L06 (sau đen) | setup 16 | R21 |
| T3 06:00 (1440) | T3 06:33 (1473) | Đúc L07 (sau đen) | - | R30 |
| T3 06:33 (1473) | T3 07:06 (1506) | Đúc L08 (sau đen) | - | R31 |
| T3 07:06 (1506) | T3 07:39 (1539) | Đúc L09 (sau đen) | - | R32 |

### CNC_1

| Từ | Đến | Việc | Setup | Mã lượt |
|---|---|---|---|---|
| T2 06:00 (0) | T2 06:50 (50) | CNC L01 (trước bạc) | - | R01 |
| T2 06:50 (50) | T2 07:40 (100) | CNC L10 (trước bạc) [dự trữ] | - | R03 |
| T2 07:40 (100) | T2 08:30 (150) | CNC L02 (trước bạc) | - | R05 |
| T2 08:30 (150) | T2 09:20 (200) | CNC L03 (trước bạc) | - | R07 |
| T2 10:30 (270) | T2 11:20 (320) | CNC L04 (trước bạc) | - | R09 |
| T3 08:00 (1560) | T3 09:00 (1620) | CNC L09 (sau đen) | setup 10 | R35 |

### CNC_2

| Từ | Đến | Việc | Setup | Mã lượt |
|---|---|---|---|---|
| T2 06:33 (33) | T2 07:28 (88) | CNC L12 (sau đen) [dự trữ] | - | R22 |
| T2 08:07 (127) | T2 09:02 (182) | CNC L06 (sau đen) | - | R23 |
| T3 06:33 (1473) | T3 07:28 (1528) | CNC L07 (sau đen) | - | R33 |
| T3 07:28 (1528) | T3 08:23 (1583) | CNC L08 (sau đen) | - | R34 |

### PAINT_1

| Từ | Đến | Việc | Setup | Mã lượt |
|---|---|---|---|---|
| T2 06:50 (50) | T2 07:50 (110) | Sơn L01 (trước bạc) | setup 24 | R10 |
| T2 07:50 (110) | T2 08:26 (146) | Sơn L10 (trước bạc) [dự trữ] | - | R11 |
| T2 08:30 (150) | T2 09:06 (186) | Sơn L02 (trước bạc) | - | R12 |
| T2 09:20 (200) | T2 09:56 (236) | Sơn L03 (trước bạc) | - | R13 |
| T2 11:20 (320) | T2 11:56 (356) | Sơn L04 (trước bạc) | - | R14 |
| T2 11:56 (356) | T2 12:44 (404) | Sơn L05 (sau đen) | setup 12 | R24 |
| T2 12:44 (404) | T2 13:20 (440) | Sơn L12 (sau đen) [dự trữ] | - | R25 |
| T2 13:20 (440) | T2 13:56 (476) | Sơn L06 (sau đen) | - | R26 |
| T3 07:28 (1528) | T3 08:04 (1564) | Sơn L07 (sau đen) | - | R36 |
| T3 08:23 (1583) | T3 08:59 (1619) | Sơn L08 (sau đen) | - | R37 |
| T3 09:00 (1620) | T3 09:36 (1656) | Sơn L09 (sau đen) | - | R38 |

### QC_1

| Từ | Đến | Việc | Setup | Mã lượt |
|---|---|---|---|---|
| T2 07:50 (110) | T2 08:06 (126) | QC L01 (trước bạc) | - | R15 |
| T2 08:26 (146) | T2 08:42 (162) | QC L10 (trước bạc) [dự trữ] | - | R16 |
| T2 09:06 (186) | T2 09:22 (202) | QC L02 (trước bạc) | - | R17 |
| T2 10:30 (270) | T2 10:46 (286) | QC L03 (trước bạc) | - | R18 |
| T2 11:56 (356) | T2 12:12 (372) | QC L04 (trước bạc) | - | R19 |
| T2 12:44 (404) | T2 13:00 (420) | QC L05 (sau đen) | - | R27 |
| T2 13:20 (440) | T2 13:36 (456) | QC L12 (sau đen) [dự trữ] | - | R28 |
| T3 06:00 (1440) | T3 06:16 (1456) | QC L06 (sau đen) | - | R29 |
| T3 08:04 (1564) | T3 08:20 (1580) | QC L07 (sau đen) | - | R39 |
| T3 08:59 (1619) | T3 09:15 (1635) | QC L08 (sau đen) | - | R40 |
| T3 09:36 (1656) | T3 09:52 (1672) | QC L09 (sau đen) | - | R41 |

## Các điểm cần lưu ý

- **Hiệu suất chỉ 17,2% và idle rất lớn là do dữ liệu, không do cách xếp lịch.** Tải của ca chuẩn nhẹ (máy sơn bận 432 trên 1.350 phút khả dụng) và ca S1 bắt buộc bật cả ba ngày ở mọi máy, kể cả ngày 3 hoàn toàn trống. Idle chỉ giảm được khi thêm việc, không phải bằng cách xếp lại.
- **Lô L06 hoàn tất sơn lúc phút 476 (sát cuối ca 480) nên phải chờ đến sáng hôm sau mới QC** (1.440). 25 bánh đã sơn nằm chờ qua đêm. Mở ca S2 chỉ để QC sẽ tốn chi phí mở ca nhưng không giảm trễ hay makespan, nên tôi không mở.
- **Lô L03 chờ QC 34 phút** (sơn xong 236, QC sau giờ nghỉ lúc 270) vì QC 236–252 sẽ cắt giờ nghỉ 240–270.
- **Nhiều đơn giao sớm hơn hạn rất xa** (O002 sớm ~2.000 phút) do chính sách giao ngay khi đủ hàng. Nếu chọn giao đúng hạn thì tồn thành phẩm cuối ngày sẽ khác và cần tính lại thiếu safety stock.
- **Chưa biết lịch này tốt đến đâu so với tối ưu.** Số F = 8.663,5 là mốc để đối chiếu khi có lịch từ solver hoặc baseline khác.
- **Chưa dùng dự trữ bán thành phẩm.** Với tải nhẹ, không có nút thắt nào để dự trữ bán thành phẩm giải quyết; dự trữ chỉ đưa lô đi hết tuyến để giữ tồn thành phẩm.
