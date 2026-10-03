# Kết quả thử nghiệm trên cùng một input

Run: `20261003T133943066146Z`; SHA256: `2df0591662b22157f904dc480f1bce0adcf6f1e5a442b10f5fae7e63a212452b`.
Ngân sách 30s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 4 đơn, 5 lô QC, 42 lượt chạy (29 bắt buộc, 13 thuộc 3 phương án làm trước), 5 công đoạn, 8 máy, 4 khuôn, horizon 3 ngày; giả định ở dataset/wheel-factory-small/SOURCE.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 160,017,938 | 160,017,938–160,017,938 | 0 | 28.0% | 0.01 |
| edd | 1/1 | 200,017,904 | 200,017,904–200,017,904 | 0 | 28.0% | 0.00 |
| spt | 1/1 | 200,017,904 | 200,017,904–200,017,904 | 0 | 28.0% | 0.00 |
| simulated_annealing | 3/3 | 40,015,717 | 40,014,343–40,017,101 | 0 | 38.2% | 26.20 |
| genetic_algorithm | 3/3 | 40,017,321 | 40,014,505–40,018,524 | 0 | 35.7% | 26.15 |
| cp_sat | 2/3 | 59,875,025,876 | 29,665,025,994–90,085,025,759 | 3.5 | 26.5% | 30.03 |
| cp_sat_hint | 3/3 | 120,014,309 | 120,013,016–120,015,604 | 0 | 36.6% | 30.02 |
| cp_lns | 3/3 | 40,011,686 | 40,010,564–40,017,692 | 0 | 51.7% | 30.01 |
| cp_rolling | 3/3 | 120,018,317 | 80,016,631–160,017,981 | 0 | 32.9% | 16.29 |

Lịch có objective nhỏ nhất quan sát được: **cp_lns / seed 29 / 40,010,564**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../cp_lns/results/20261003T133943066146Z/seed_29/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 160017938 | [JSON](../../fifo/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../fifo/results/20261003T133943066146Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 200017904 | [JSON](../../edd/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../edd/results/20261003T133943066146Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 200017904 | [JSON](../../spt/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../spt/results/20261003T133943066146Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 40015717 | [JSON](../../simulated_annealing/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20261003T133943066146Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 40014343 | [JSON](../../simulated_annealing/results/20261003T133943066146Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20261003T133943066146Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 40017101 | [JSON](../../simulated_annealing/results/20261003T133943066146Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20261003T133943066146Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 40014505 | [JSON](../../genetic_algorithm/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20261003T133943066146Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 40018524 | [JSON](../../genetic_algorithm/results/20261003T133943066146Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20261003T133943066146Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 40017321 | [JSON](../../genetic_algorithm/results/20261003T133943066146Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20261003T133943066146Z/seed_47/gantt.html) |
| cp_sat / 11 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T133943066146Z/seed_11/result.json) | — |
| cp_sat / 29 | FEASIBLE | 29665025994 | [JSON](../../cp_sat/results/20261003T133943066146Z/seed_29/result.json) | [Gantt](../../cp_sat/results/20261003T133943066146Z/seed_29/gantt.html) |
| cp_sat / 47 | FEASIBLE | 90085025759 | [JSON](../../cp_sat/results/20261003T133943066146Z/seed_47/result.json) | [Gantt](../../cp_sat/results/20261003T133943066146Z/seed_47/gantt.html) |
| cp_sat_hint / 11 | FEASIBLE | 120014309 | [JSON](../../cp_sat_hint/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20261003T133943066146Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | FEASIBLE | 120013016 | [JSON](../../cp_sat_hint/results/20261003T133943066146Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20261003T133943066146Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | FEASIBLE | 120015604 | [JSON](../../cp_sat_hint/results/20261003T133943066146Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20261003T133943066146Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 40017692 | [JSON](../../cp_lns/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20261003T133943066146Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 40010564 | [JSON](../../cp_lns/results/20261003T133943066146Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20261003T133943066146Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 40011686 | [JSON](../../cp_lns/results/20261003T133943066146Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20261003T133943066146Z/seed_47/gantt.html) |
| cp_rolling / 11 | HEURISTIC_FEASIBLE | 80016631 | [JSON](../../cp_rolling/results/20261003T133943066146Z/seed_11/result.json) | [Gantt](../../cp_rolling/results/20261003T133943066146Z/seed_11/gantt.html) |
| cp_rolling / 29 | HEURISTIC_FEASIBLE | 160017981 | [JSON](../../cp_rolling/results/20261003T133943066146Z/seed_29/result.json) | [Gantt](../../cp_rolling/results/20261003T133943066146Z/seed_29/gantt.html) |
| cp_rolling / 47 | HEURISTIC_FEASIBLE | 120018317 | [JSON](../../cp_rolling/results/20261003T133943066146Z/seed_47/result.json) | [Gantt](../../cp_rolling/results/20261003T133943066146Z/seed_47/gantt.html) |
