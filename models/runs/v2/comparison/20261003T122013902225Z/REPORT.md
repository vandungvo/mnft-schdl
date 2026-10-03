# Kết quả thử nghiệm trên cùng một input

Run: `20261003T122013902225Z`; SHA256: `ff97168ecb584636c3b40cb31047b7e5c84dc5e91a754ce3b430052a8adc6a6a`.
Ngân sách 120s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 24 đơn, 49 lô QC, 269 lượt chạy (240 bắt buộc, 29 thuộc 5 phương án làm trước), 5 công đoạn, 8 máy, 4 khuôn, horizon 14 ngày; giả định ở dataset/wheel-factory-small/SOURCE.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 365,305,105,032 | 365,305,105,032–365,305,105,032 | 5 | 35.8% | 0.22 |
| edd | 1/1 | 323,465,104,894 | 323,465,104,894–323,465,104,894 | 5 | 35.9% | 0.22 |
| spt | 1/1 | 389,245,104,822 | 389,245,104,822–389,245,104,822 | 5 | 35.9% | 0.22 |
| simulated_annealing | 3/3 | 57,110,102,960 | 24,845,105,987–148,455,103,629 | 2 | 36.6% | 114.91 |
| genetic_algorithm | 3/3 | 97,530,103,647 | 61,430,100,892–125,490,109,056 | 2 | 37.2% | 120.38 |
| cp_sat | 0/3 | — | — | — | — | 120.15 |
| cp_sat_hint | 3/3 | 323,465,104,894 | 323,465,104,894–323,465,104,894 | 5 | 35.9% | 120.23 |
| cp_lns | 3/3 | 323,465,104,894 | 323,465,104,894–323,465,104,894 | 5 | 35.9% | 121.27 |

Lịch có objective nhỏ nhất quan sát được: **simulated_annealing / seed 29 / 24,845,105,987**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../simulated_annealing/results/20261003T122013902225Z/seed_29/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 365305105032 | [JSON](../../fifo/results/20261003T122013902225Z/seed_11/result.json) | [Gantt](../../fifo/results/20261003T122013902225Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 323465104894 | [JSON](../../edd/results/20261003T122013902225Z/seed_11/result.json) | [Gantt](../../edd/results/20261003T122013902225Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 389245104822 | [JSON](../../spt/results/20261003T122013902225Z/seed_11/result.json) | [Gantt](../../spt/results/20261003T122013902225Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 148455103629 | [JSON](../../simulated_annealing/results/20261003T122013902225Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20261003T122013902225Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 24845105987 | [JSON](../../simulated_annealing/results/20261003T122013902225Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20261003T122013902225Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 57110102960 | [JSON](../../simulated_annealing/results/20261003T122013902225Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20261003T122013902225Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 61430100892 | [JSON](../../genetic_algorithm/results/20261003T122013902225Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20261003T122013902225Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 97530103647 | [JSON](../../genetic_algorithm/results/20261003T122013902225Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20261003T122013902225Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 125490109056 | [JSON](../../genetic_algorithm/results/20261003T122013902225Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20261003T122013902225Z/seed_47/gantt.html) |
| cp_sat / 11 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T122013902225Z/seed_11/result.json) | — |
| cp_sat / 29 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T122013902225Z/seed_29/result.json) | — |
| cp_sat / 47 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T122013902225Z/seed_47/result.json) | — |
| cp_sat_hint / 11 | FEASIBLE | 323465104894 | [JSON](../../cp_sat_hint/results/20261003T122013902225Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20261003T122013902225Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | HEURISTIC_FALLBACK | 323465104894 | [JSON](../../cp_sat_hint/results/20261003T122013902225Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20261003T122013902225Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | HEURISTIC_FALLBACK | 323465104894 | [JSON](../../cp_sat_hint/results/20261003T122013902225Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20261003T122013902225Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 323465104894 | [JSON](../../cp_lns/results/20261003T122013902225Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20261003T122013902225Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 323465104894 | [JSON](../../cp_lns/results/20261003T122013902225Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20261003T122013902225Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 323465104894 | [JSON](../../cp_lns/results/20261003T122013902225Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20261003T122013902225Z/seed_47/gantt.html) |
