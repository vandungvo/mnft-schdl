# Kết quả thử nghiệm trên cùng một input

Run: `20261003T113935114013Z`; SHA256: `6f7debc1146b9b126f658aedce7a70fb23d0007ad33eebbd808d15a1c2fdfd08`.
Ngân sách 120s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 24 đơn, 48 lô QC, 260 lượt chạy (239 bắt buộc, 21 thuộc 5 phương án làm trước), 5 công đoạn, 8 máy, 4 khuôn, horizon 14 ngày; giả định ở dataset/wheel-factory-small/SOURCE.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 399,675,107,117 | 399,675,107,117–399,675,107,117 | 5 | 34.0% | 0.17 |
| edd | 1/1 | 455,475,108,523 | 455,475,108,523–455,475,108,523 | 6 | 33.7% | 0.17 |
| spt | 1/1 | 428,445,108,347 | 428,445,108,347–428,445,108,347 | 5 | 33.7% | 0.17 |
| simulated_annealing | 3/3 | 62,625,100,854 | 2,985,105,866–109,125,107,946 | 2 | 36.6% | 116.10 |
| genetic_algorithm | 3/3 | 65,655,103,108 | 44,775,103,873–75,585,110,836 | 2 | 35.8% | 113.36 |
| cp_sat | 0/3 | — | — | — | — | 120.11 |
| cp_sat_hint | 3/3 | 399,675,107,117 | 399,675,107,117–399,675,107,117 | 5 | 34.0% | 120.27 |
| cp_lns | 3/3 | 399,675,105,429 | 399,675,105,389–399,675,106,788 | 5 | 34.7% | 120.08 |

Lịch có objective nhỏ nhất quan sát được: **simulated_annealing / seed 11 / 2,985,105,866**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../simulated_annealing/results/20261003T113935114013Z/seed_11/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 399675107117 | [JSON](../../fifo/results/20261003T113935114013Z/seed_11/result.json) | [Gantt](../../fifo/results/20261003T113935114013Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 455475108523 | [JSON](../../edd/results/20261003T113935114013Z/seed_11/result.json) | [Gantt](../../edd/results/20261003T113935114013Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 428445108347 | [JSON](../../spt/results/20261003T113935114013Z/seed_11/result.json) | [Gantt](../../spt/results/20261003T113935114013Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 2985105866 | [JSON](../../simulated_annealing/results/20261003T113935114013Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20261003T113935114013Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 62625100854 | [JSON](../../simulated_annealing/results/20261003T113935114013Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20261003T113935114013Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 109125107946 | [JSON](../../simulated_annealing/results/20261003T113935114013Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20261003T113935114013Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 44775103873 | [JSON](../../genetic_algorithm/results/20261003T113935114013Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20261003T113935114013Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 75585110836 | [JSON](../../genetic_algorithm/results/20261003T113935114013Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20261003T113935114013Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 65655103108 | [JSON](../../genetic_algorithm/results/20261003T113935114013Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20261003T113935114013Z/seed_47/gantt.html) |
| cp_sat / 11 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T113935114013Z/seed_11/result.json) | — |
| cp_sat / 29 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T113935114013Z/seed_29/result.json) | — |
| cp_sat / 47 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T113935114013Z/seed_47/result.json) | — |
| cp_sat_hint / 11 | FEASIBLE | 399675107117 | [JSON](../../cp_sat_hint/results/20261003T113935114013Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20261003T113935114013Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | FEASIBLE | 399675107117 | [JSON](../../cp_sat_hint/results/20261003T113935114013Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20261003T113935114013Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | FEASIBLE | 399675107117 | [JSON](../../cp_sat_hint/results/20261003T113935114013Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20261003T113935114013Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 399675106788 | [JSON](../../cp_lns/results/20261003T113935114013Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20261003T113935114013Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 399675105389 | [JSON](../../cp_lns/results/20261003T113935114013Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20261003T113935114013Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 399675105429 | [JSON](../../cp_lns/results/20261003T113935114013Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20261003T113935114013Z/seed_47/gantt.html) |
