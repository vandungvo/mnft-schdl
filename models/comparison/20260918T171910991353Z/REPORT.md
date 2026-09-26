# Kết quả thử nghiệm trên cùng một input

Run: `20260918T171910991353Z`; SHA256: `66e736ed320d9dcb33d09b2dee9e12fd1493af79e4f538b3f8e0f51725ba8d4c`.
Ngân sách 5s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 36 đơn, 48 lô, 192 công đoạn, 7 máy, 4 SKU, horizon 14 ngày / 10 ngày làm việc; các giả định chi tiết ở input/README.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 51,739 | 51,739–51,739 | 1 | 47.4% | 0.04 |
| edd | 1/1 | 40,589 | 40,589–40,589 | 0 | 46.1% | 0.04 |
| spt | 0/1 | — | — | — | — | 0.08 |

Lịch có objective nhỏ nhất quan sát được: **edd / seed 11 / 40,589**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../edd/results/20260918T171910991353Z/seed_11/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 51739 | [JSON](../../fifo/results/20260918T171910991353Z/seed_11/result.json) | [Gantt](../../fifo/results/20260918T171910991353Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 40589 | [JSON](../../edd/results/20260918T171910991353Z/seed_11/result.json) | [Gantt](../../edd/results/20260918T171910991353Z/seed_11/gantt.html) |
| spt / 11 | NO_SOLUTION_FOUND | None | [JSON](../../spt/results/20260918T171910991353Z/seed_11/result.json) | — |
