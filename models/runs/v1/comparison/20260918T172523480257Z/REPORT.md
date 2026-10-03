# Kết quả thử nghiệm trên cùng một input

Run: `20260918T172523480257Z`; SHA256: `d1101b0c79be63b7293e7aeac0c4c6aff53ea6fbae130bf105ef375e282fa7d3`.
Ngân sách 30s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 36 đơn, 48 lô, 192 công đoạn, 7 máy, 4 SKU, horizon 14 ngày / 10 ngày làm việc; các giả định chi tiết ở input/README.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 276,999 | 276,999–276,999 | 4 | 50.9% | 0.04 |
| edd | 1/1 | 68,017 | 68,017–68,017 | 3 | 48.9% | 0.04 |
| spt | 1/1 | 167,625 | 167,625–167,625 | 4 | 47.4% | 0.04 |
| simulated_annealing | 3/3 | 48,110 | 43,545–56,003 | 2 | 52.1% | 30.02 |
| genetic_algorithm | 3/3 | 52,188 | 50,447–55,572 | 2 | 52.9% | 30.03 |
| cp_sat | 0/3 | — | — | — | — | 30.07 |
| cp_sat_hint | 3/3 | 68,017 | 68,017–68,017 | 3 | 48.9% | 30.11 |
| cp_lns | 3/3 | 63,149 | 59,971–63,934 | 3 | 54.4% | 29.94 |

Lịch có objective nhỏ nhất quan sát được: **simulated_annealing / seed 47 / 43,545**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../simulated_annealing/results/20260918T172523480257Z/seed_47/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 276999 | [JSON](../../fifo/results/20260918T172523480257Z/seed_11/result.json) | [Gantt](../../fifo/results/20260918T172523480257Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 68017 | [JSON](../../edd/results/20260918T172523480257Z/seed_11/result.json) | [Gantt](../../edd/results/20260918T172523480257Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 167625 | [JSON](../../spt/results/20260918T172523480257Z/seed_11/result.json) | [Gantt](../../spt/results/20260918T172523480257Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 56003 | [JSON](../../simulated_annealing/results/20260918T172523480257Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20260918T172523480257Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 48110 | [JSON](../../simulated_annealing/results/20260918T172523480257Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20260918T172523480257Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 43545 | [JSON](../../simulated_annealing/results/20260918T172523480257Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20260918T172523480257Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 50447 | [JSON](../../genetic_algorithm/results/20260918T172523480257Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20260918T172523480257Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 52188 | [JSON](../../genetic_algorithm/results/20260918T172523480257Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20260918T172523480257Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 55572 | [JSON](../../genetic_algorithm/results/20260918T172523480257Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20260918T172523480257Z/seed_47/gantt.html) |
| cp_sat / 11 | UNKNOWN | None | [JSON](../../cp_sat/results/20260918T172523480257Z/seed_11/result.json) | — |
| cp_sat / 29 | UNKNOWN | None | [JSON](../../cp_sat/results/20260918T172523480257Z/seed_29/result.json) | — |
| cp_sat / 47 | UNKNOWN | None | [JSON](../../cp_sat/results/20260918T172523480257Z/seed_47/result.json) | — |
| cp_sat_hint / 11 | FEASIBLE | 68017 | [JSON](../../cp_sat_hint/results/20260918T172523480257Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20260918T172523480257Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | FEASIBLE | 68017 | [JSON](../../cp_sat_hint/results/20260918T172523480257Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20260918T172523480257Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | FEASIBLE | 68017 | [JSON](../../cp_sat_hint/results/20260918T172523480257Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20260918T172523480257Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 63934 | [JSON](../../cp_lns/results/20260918T172523480257Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20260918T172523480257Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 63149 | [JSON](../../cp_lns/results/20260918T172523480257Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20260918T172523480257Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 59971 | [JSON](../../cp_lns/results/20260918T172523480257Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20260918T172523480257Z/seed_47/gantt.html) |
