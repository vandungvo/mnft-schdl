# Đợt chạy dài: chạy tới khi xong, không theo ngân sách cố định

Run `20261004T172544670619Z`; SHA256 input `ff97168ecb584636c3b40cb31047b7e5c84dc5e91a754ce3b430052a8adc6a6a`.
SA/GA/CP-LNS: 1 worker, dừng sau 600 s không cải thiện, mốc an toàn 7200 s. CP-SAT: 8 worker, gợi ý từ lịch tốt nhất (simulated_annealing seed 29), dừng khi OPTIMAL hoặc sau 24 giờ. CP-SAT không gợi ý (cp_sat_cold_long): 8 worker, dừng khi OPTIMAL hoặc sau 12 giờ.

| Phương pháp / seed | Trạng thái | Lý do dừng | Objective | Cận dưới | Thời gian (s) |
|---|---|---|---:|---:|---:|
| fifo / 11 | HEURISTIC_FEASIBLE | — | 365305105032 | — | 0 |
| edd / 11 | HEURISTIC_FEASIBLE | — | 323465104894 | — | 0 |
| spt / 11 | HEURISTIC_FEASIBLE | — | 389245104822 | — | 0 |
| simulated_annealing / 11 | HEURISTIC_FEASIBLE | no_improvement | 160077565 | — | 4651 |
| simulated_annealing / 29 | HEURISTIC_FEASIBLE | no_improvement | 160073495 | — | 6419 |
| simulated_annealing / 47 | HEURISTIC_FEASIBLE | no_improvement | 160078331 | — | 4440 |
| genetic_algorithm / 11 | HEURISTIC_FEASIBLE | no_improvement | 2385097018 | — | 1956 |
| genetic_algorithm / 29 | HEURISTIC_FEASIBLE | no_improvement | 2365093652 | — | 4648 |
| genetic_algorithm / 47 | HEURISTIC_FEASIBLE | no_improvement | 160084140 | — | 2703 |
| cp_lns / 11 | HEURISTIC_FEASIBLE | no_improvement | 323465101816 | — | 888 |
| cp_lns / 29 | HEURISTIC_FEASIBLE | no_improvement | 323465103544 | — | 611 |
| cp_lns / 47 | HEURISTIC_FEASIBLE | no_improvement | 323465103544 | — | 607 |
| cp_rolling / 11 | HEURISTIC_FEASIBLE | — | 125810072384 | — | 6174 |
| cp_rolling / 29 | HEURISTIC_FEASIBLE | — | 93355055816 | — | 6174 |
| cp_rolling / 47 | HEURISTIC_FEASIBLE | — | 88960056528 | — | 6173 |
| cp_sat_long / 11 | FEASIBLE | — | 160035016 | 160017025.0 | 86413 |
| cp_sat_cold_long / 11 | UNKNOWN | — | — | — | 43214 |
