# Kết quả thử nghiệm trên cùng một input

Run: `20260930T084648619393Z`; SHA256: `3dbbcade341488a765d53181de5321dce61f1aed1f8fab00791b9bfd9e76b884`.
Ngân sách 30s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 4 đơn, 5 lô QC, 42 lượt chạy (29 bắt buộc, 13 thuộc 3 phương án làm trước), 5 công đoạn, 8 máy, 4 khuôn, horizon 3 ngày; giả định ở dataset/wheel-factory-small/SOURCE.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 17,556 | 17,556–17,556 | 0 | 28.0% | 0.01 |
| edd | 1/1 | 17,574 | 17,574–17,574 | 0 | 28.0% | 0.00 |
| spt | 1/1 | 17,574 | 17,574–17,574 | 0 | 28.0% | 0.00 |
| simulated_annealing | 3/3 | 13,100 | 11,549–13,100 | 0 | 34.8% | 30.00 |
| genetic_algorithm | 3/3 | 14,340 | 11,549–14,340 | 0 | 33.3% | 30.00 |
| cp_sat | 3/3 | 44,498 | 13,097–101,746 | 1 | 39.2% | 30.01 |
| cp_sat_hint | 3/3 | 8,664 | 7,008–8,710 | 0 | 49.4% | 30.01 |
| cp_lns | 3/3 | 11,551 | 11,406–14,341 | 0 | 39.8% | 29.00 |

Lịch có objective nhỏ nhất quan sát được: **cp_sat_hint / seed 47 / 7,008**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../cp_sat_hint/results/20260930T084648619393Z/seed_47/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 17556 | [JSON](../../fifo/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../fifo/results/20260930T084648619393Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 17574 | [JSON](../../edd/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../edd/results/20260930T084648619393Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 17574 | [JSON](../../spt/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../spt/results/20260930T084648619393Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 13100 | [JSON](../../simulated_annealing/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20260930T084648619393Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 11549 | [JSON](../../simulated_annealing/results/20260930T084648619393Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20260930T084648619393Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 13100 | [JSON](../../simulated_annealing/results/20260930T084648619393Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20260930T084648619393Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 11549 | [JSON](../../genetic_algorithm/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20260930T084648619393Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 14340 | [JSON](../../genetic_algorithm/results/20260930T084648619393Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20260930T084648619393Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 14340 | [JSON](../../genetic_algorithm/results/20260930T084648619393Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20260930T084648619393Z/seed_47/gantt.html) |
| cp_sat / 11 | FEASIBLE | 101746 | [JSON](../../cp_sat/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../cp_sat/results/20260930T084648619393Z/seed_11/gantt.html) |
| cp_sat / 29 | FEASIBLE | 44498 | [JSON](../../cp_sat/results/20260930T084648619393Z/seed_29/result.json) | [Gantt](../../cp_sat/results/20260930T084648619393Z/seed_29/gantt.html) |
| cp_sat / 47 | FEASIBLE | 13097 | [JSON](../../cp_sat/results/20260930T084648619393Z/seed_47/result.json) | [Gantt](../../cp_sat/results/20260930T084648619393Z/seed_47/gantt.html) |
| cp_sat_hint / 11 | FEASIBLE | 8710 | [JSON](../../cp_sat_hint/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20260930T084648619393Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | FEASIBLE | 8664 | [JSON](../../cp_sat_hint/results/20260930T084648619393Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20260930T084648619393Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | FEASIBLE | 7008 | [JSON](../../cp_sat_hint/results/20260930T084648619393Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20260930T084648619393Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 11551 | [JSON](../../cp_lns/results/20260930T084648619393Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20260930T084648619393Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 14341 | [JSON](../../cp_lns/results/20260930T084648619393Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20260930T084648619393Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 11406 | [JSON](../../cp_lns/results/20260930T084648619393Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20260930T084648619393Z/seed_47/gantt.html) |
