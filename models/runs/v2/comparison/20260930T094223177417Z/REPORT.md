# Kết quả thử nghiệm trên cùng một input

Run: `20260930T094223177417Z`; SHA256: `2df0591662b22157f904dc480f1bce0adcf6f1e5a442b10f5fae7e63a212452b`.
Ngân sách 30s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 4 đơn, 5 lô QC, 42 lượt chạy (29 bắt buộc, 13 thuộc 3 phương án làm trước), 5 công đoạn, 8 máy, 4 khuôn, horizon 3 ngày; giả định ở dataset/wheel-factory-small/SOURCE.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 160,017,938 | 160,017,938–160,017,938 | 0 | 28.0% | 0.01 |
| edd | 1/1 | 200,017,904 | 200,017,904–200,017,904 | 0 | 28.0% | 0.00 |
| spt | 1/1 | 200,017,904 | 200,017,904–200,017,904 | 0 | 28.0% | 0.00 |
| simulated_annealing | 3/3 | 40,015,970 | 40,014,397–40,016,023 | 0 | 40.5% | 25.81 |
| genetic_algorithm | 3/3 | 40,017,321 | 40,015,843–40,018,465 | 0 | 35.7% | 25.74 |
| cp_sat | 3/3 | 28,325,024,207 | 8,410,024,067–58,450,018,917 | 2 | 28.8% | 30.02 |
| cp_sat_hint | 3/3 | 120,012,599 | 120,011,440–120,012,780 | 0 | 40.9% | 30.01 |
| cp_lns | 3/3 | 40,011,686 | 40,010,564–40,014,902 | 0 | 51.7% | 28.10 |

Lịch có objective nhỏ nhất quan sát được: **cp_lns / seed 29 / 40,010,564**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../cp_lns/results/20260930T094223177417Z/seed_29/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 160017938 | [JSON](../../fifo/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../fifo/results/20260930T094223177417Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 200017904 | [JSON](../../edd/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../edd/results/20260930T094223177417Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 200017904 | [JSON](../../spt/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../spt/results/20260930T094223177417Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 40015970 | [JSON](../../simulated_annealing/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20260930T094223177417Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 40016023 | [JSON](../../simulated_annealing/results/20260930T094223177417Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20260930T094223177417Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 40014397 | [JSON](../../simulated_annealing/results/20260930T094223177417Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20260930T094223177417Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 40015843 | [JSON](../../genetic_algorithm/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20260930T094223177417Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 40018465 | [JSON](../../genetic_algorithm/results/20260930T094223177417Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20260930T094223177417Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 40017321 | [JSON](../../genetic_algorithm/results/20260930T094223177417Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20260930T094223177417Z/seed_47/gantt.html) |
| cp_sat / 11 | FEASIBLE | 58450018917 | [JSON](../../cp_sat/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../cp_sat/results/20260930T094223177417Z/seed_11/gantt.html) |
| cp_sat / 29 | FEASIBLE | 8410024067 | [JSON](../../cp_sat/results/20260930T094223177417Z/seed_29/result.json) | [Gantt](../../cp_sat/results/20260930T094223177417Z/seed_29/gantt.html) |
| cp_sat / 47 | FEASIBLE | 28325024207 | [JSON](../../cp_sat/results/20260930T094223177417Z/seed_47/result.json) | [Gantt](../../cp_sat/results/20260930T094223177417Z/seed_47/gantt.html) |
| cp_sat_hint / 11 | FEASIBLE | 120012599 | [JSON](../../cp_sat_hint/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20260930T094223177417Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | FEASIBLE | 120012780 | [JSON](../../cp_sat_hint/results/20260930T094223177417Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20260930T094223177417Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | FEASIBLE | 120011440 | [JSON](../../cp_sat_hint/results/20260930T094223177417Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20260930T094223177417Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 40014902 | [JSON](../../cp_lns/results/20260930T094223177417Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20260930T094223177417Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 40010564 | [JSON](../../cp_lns/results/20260930T094223177417Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20260930T094223177417Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 40011686 | [JSON](../../cp_lns/results/20260930T094223177417Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20260930T094223177417Z/seed_47/gantt.html) |
