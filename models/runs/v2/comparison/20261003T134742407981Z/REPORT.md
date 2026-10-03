# Kết quả thử nghiệm trên cùng một input

Run: `20261003T134742407981Z`; SHA256: `ff97168ecb584636c3b40cb31047b7e5c84dc5e91a754ce3b430052a8adc6a6a`.
Ngân sách 120s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 24 đơn, 49 lô QC, 269 lượt chạy (240 bắt buộc, 29 thuộc 5 phương án làm trước), 5 công đoạn, 8 máy, 4 khuôn, horizon 14 ngày; giả định ở dataset/wheel-factory-small/SOURCE.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 365,305,105,032 | 365,305,105,032–365,305,105,032 | 5 | 35.8% | 0.16 |
| edd | 1/1 | 323,465,104,894 | 323,465,104,894–323,465,104,894 | 5 | 35.9% | 0.16 |
| spt | 1/1 | 389,245,104,822 | 389,245,104,822–389,245,104,822 | 5 | 35.9% | 0.15 |
| simulated_annealing | 3/3 | 8,095,097,589 | 2,545,104,890–118,190,103,963 | 1 | 37.3% | 120.17 |
| genetic_algorithm | 3/3 | 41,275,103,130 | 7,965,106,386–45,745,106,462 | 1 | 35.9% | 120.60 |
| cp_sat | 0/3 | — | — | — | — | 120.19 |
| cp_sat_hint | 3/3 | 323,465,103,544 | 323,465,103,544–323,465,103,544 | 5 | 36.3% | 120.26 |
| cp_lns | 3/3 | 323,465,103,544 | 323,465,103,256–323,465,103,544 | 5 | 36.3% | 119.72 |
| cp_rolling | 3/3 | 92,145,102,906 | 92,145,097,826–92,670,094,638 | 3 | 38.1% | 103.92 |

Lịch có objective nhỏ nhất quan sát được: **simulated_annealing / seed 47 / 2,545,104,890**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../simulated_annealing/results/20261003T134742407981Z/seed_47/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 365305105032 | [JSON](../../fifo/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../fifo/results/20261003T134742407981Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 323465104894 | [JSON](../../edd/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../edd/results/20261003T134742407981Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 389245104822 | [JSON](../../spt/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../spt/results/20261003T134742407981Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 118190103963 | [JSON](../../simulated_annealing/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20261003T134742407981Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 8095097589 | [JSON](../../simulated_annealing/results/20261003T134742407981Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20261003T134742407981Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 2545104890 | [JSON](../../simulated_annealing/results/20261003T134742407981Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20261003T134742407981Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 7965106386 | [JSON](../../genetic_algorithm/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20261003T134742407981Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 45745106462 | [JSON](../../genetic_algorithm/results/20261003T134742407981Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20261003T134742407981Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 41275103130 | [JSON](../../genetic_algorithm/results/20261003T134742407981Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20261003T134742407981Z/seed_47/gantt.html) |
| cp_sat / 11 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T134742407981Z/seed_11/result.json) | — |
| cp_sat / 29 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T134742407981Z/seed_29/result.json) | — |
| cp_sat / 47 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T134742407981Z/seed_47/result.json) | — |
| cp_sat_hint / 11 | FEASIBLE | 323465103544 | [JSON](../../cp_sat_hint/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20261003T134742407981Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | FEASIBLE | 323465103544 | [JSON](../../cp_sat_hint/results/20261003T134742407981Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20261003T134742407981Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | FEASIBLE | 323465103544 | [JSON](../../cp_sat_hint/results/20261003T134742407981Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20261003T134742407981Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 323465103256 | [JSON](../../cp_lns/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20261003T134742407981Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 323465103544 | [JSON](../../cp_lns/results/20261003T134742407981Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20261003T134742407981Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 323465103544 | [JSON](../../cp_lns/results/20261003T134742407981Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20261003T134742407981Z/seed_47/gantt.html) |
| cp_rolling / 11 | HEURISTIC_FEASIBLE | 92145097826 | [JSON](../../cp_rolling/results/20261003T134742407981Z/seed_11/result.json) | [Gantt](../../cp_rolling/results/20261003T134742407981Z/seed_11/gantt.html) |
| cp_rolling / 29 | HEURISTIC_FEASIBLE | 92145102906 | [JSON](../../cp_rolling/results/20261003T134742407981Z/seed_29/result.json) | [Gantt](../../cp_rolling/results/20261003T134742407981Z/seed_29/gantt.html) |
| cp_rolling / 47 | HEURISTIC_FEASIBLE | 92670094638 | [JSON](../../cp_rolling/results/20261003T134742407981Z/seed_47/result.json) | [Gantt](../../cp_rolling/results/20261003T134742407981Z/seed_47/gantt.html) |
