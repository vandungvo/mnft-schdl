# Kết quả thử nghiệm trên cùng một input

Run: `20260918T172004660393Z`; SHA256: `66e736ed320d9dcb33d09b2dee9e12fd1493af79e4f538b3f8e0f51725ba8d4c`.
Ngân sách 30s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 36 đơn, 48 lô, 192 công đoạn, 7 máy, 4 SKU, horizon 14 ngày / 10 ngày làm việc; các giả định chi tiết ở input/README.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| cp_sat_hint | 1/1 | 36,948 | 36,948–36,948 | 0 | 47.8% | 30.10 |
| cp_sat | 0/1 | — | — | — | — | 30.04 |

Lịch có objective nhỏ nhất quan sát được: **cp_sat_hint / seed 11 / 36,948**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../cp_sat_hint/results/20260918T172004660393Z/seed_11/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| cp_sat_hint / 11 | FEASIBLE | 36948 | [JSON](../../cp_sat_hint/results/20260918T172004660393Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20260918T172004660393Z/seed_11/gantt.html) |
| cp_sat / 11 | UNKNOWN | None | [JSON](../../cp_sat/results/20260918T172004660393Z/seed_11/result.json) | — |
