# Kết quả thử nghiệm trên cùng một input

Run: `20261003T103727176988Z`; SHA256: `4db39f8b7eb07c10fa857bb34c2ab0a2ac4a75e4b3c5af4fec607bf45aa84112`.
Ngân sách 120s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.

Dữ liệu tổng hợp: 24 đơn, 48 lô QC, 260 lượt chạy (239 bắt buộc, 21 thuộc 5 phương án làm trước), 5 công đoạn, 8 máy, 4 khuôn, horizon 14 ngày; giả định ở dataset/wheel-factory-small/SOURCE.md.

| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |
|---|---:|---:|---:|---:|---:|---:|
| fifo | 1/1 | 384,975,099,151 | 384,975,099,151–384,975,099,151 | 5 | 35.8% | 0.17 |
| edd | 1/1 | 439,305,100,565 | 439,305,100,565–439,305,100,565 | 6 | 35.4% | 0.17 |
| spt | 1/1 | 413,745,100,381 | 413,745,100,381–413,745,100,381 | 5 | 35.4% | 0.17 |
| simulated_annealing | 3/3 | 36,900,100,539 | 5,850,095,555–50,250,092,692 | 1 | 37.7% | 111.47 |
| genetic_algorithm | 3/3 | 77,895,095,725 | 71,190,101,171–118,695,100,135 | 2 | 37.0% | 111.75 |
| cp_sat | 0/3 | — | — | — | — | 120.10 |
| cp_sat_hint | 3/3 | 384,975,099,151 | 384,975,099,151–384,975,099,151 | 5 | 35.8% | 120.27 |
| cp_lns | 3/3 | 384,975,098,783 | 384,975,095,981–384,975,098,803 | 5 | 36.2% | 120.17 |

Lịch có objective nhỏ nhất quan sát được: **simulated_annealing / seed 29 / 5,850,095,555**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.
[Xem Gantt lịch này](../../simulated_annealing/results/20261003T103727176988Z/seed_29/gantt.html).

## Cách đọc

- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.
- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.
- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.
- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.
- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.

## Từng lần chạy

| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |
|---|---|---:|---|---|
| fifo / 11 | HEURISTIC_FEASIBLE | 384975099151 | [JSON](../../fifo/results/20261003T103727176988Z/seed_11/result.json) | [Gantt](../../fifo/results/20261003T103727176988Z/seed_11/gantt.html) |
| edd / 11 | HEURISTIC_FEASIBLE | 439305100565 | [JSON](../../edd/results/20261003T103727176988Z/seed_11/result.json) | [Gantt](../../edd/results/20261003T103727176988Z/seed_11/gantt.html) |
| spt / 11 | HEURISTIC_FEASIBLE | 413745100381 | [JSON](../../spt/results/20261003T103727176988Z/seed_11/result.json) | [Gantt](../../spt/results/20261003T103727176988Z/seed_11/gantt.html) |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | 36900100539 | [JSON](../../simulated_annealing/results/20261003T103727176988Z/seed_11/result.json) | [Gantt](../../simulated_annealing/results/20261003T103727176988Z/seed_11/gantt.html) |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | 5850095555 | [JSON](../../simulated_annealing/results/20261003T103727176988Z/seed_29/result.json) | [Gantt](../../simulated_annealing/results/20261003T103727176988Z/seed_29/gantt.html) |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | 50250092692 | [JSON](../../simulated_annealing/results/20261003T103727176988Z/seed_47/result.json) | [Gantt](../../simulated_annealing/results/20261003T103727176988Z/seed_47/gantt.html) |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | 71190101171 | [JSON](../../genetic_algorithm/results/20261003T103727176988Z/seed_11/result.json) | [Gantt](../../genetic_algorithm/results/20261003T103727176988Z/seed_11/gantt.html) |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | 118695100135 | [JSON](../../genetic_algorithm/results/20261003T103727176988Z/seed_29/result.json) | [Gantt](../../genetic_algorithm/results/20261003T103727176988Z/seed_29/gantt.html) |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | 77895095725 | [JSON](../../genetic_algorithm/results/20261003T103727176988Z/seed_47/result.json) | [Gantt](../../genetic_algorithm/results/20261003T103727176988Z/seed_47/gantt.html) |
| cp_sat / 11 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T103727176988Z/seed_11/result.json) | — |
| cp_sat / 29 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T103727176988Z/seed_29/result.json) | — |
| cp_sat / 47 | UNKNOWN | None | [JSON](../../cp_sat/results/20261003T103727176988Z/seed_47/result.json) | — |
| cp_sat_hint / 11 | FEASIBLE | 384975099151 | [JSON](../../cp_sat_hint/results/20261003T103727176988Z/seed_11/result.json) | [Gantt](../../cp_sat_hint/results/20261003T103727176988Z/seed_11/gantt.html) |
| cp_sat_hint / 29 | FEASIBLE | 384975099151 | [JSON](../../cp_sat_hint/results/20261003T103727176988Z/seed_29/result.json) | [Gantt](../../cp_sat_hint/results/20261003T103727176988Z/seed_29/gantt.html) |
| cp_sat_hint / 47 | FEASIBLE | 384975099151 | [JSON](../../cp_sat_hint/results/20261003T103727176988Z/seed_47/result.json) | [Gantt](../../cp_sat_hint/results/20261003T103727176988Z/seed_47/gantt.html) |
| cp_lns / 11 | HEURISTIC_FEASIBLE | 384975098783 | [JSON](../../cp_lns/results/20261003T103727176988Z/seed_11/result.json) | [Gantt](../../cp_lns/results/20261003T103727176988Z/seed_11/gantt.html) |
| cp_lns / 29 | HEURISTIC_FEASIBLE | 384975095981 | [JSON](../../cp_lns/results/20261003T103727176988Z/seed_29/result.json) | [Gantt](../../cp_lns/results/20261003T103727176988Z/seed_29/gantt.html) |
| cp_lns / 47 | HEURISTIC_FEASIBLE | 384975098803 | [JSON](../../cp_lns/results/20261003T103727176988Z/seed_47/result.json) | [Gantt](../../cp_lns/results/20261003T103727176988Z/seed_47/gantt.html) |
