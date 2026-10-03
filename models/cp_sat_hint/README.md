# CP-SAT có hint

Chạy từ gốc repo: `python -m models.cp_sat_hint.run --seconds 30 --seed 11` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/cp_sat_hint/results/<run>/seed_<seed>/`.

Ở cả hai phiên bản: cùng mô hình với CP-SAT nguyên khối, thêm gợi ý thời gian, máy, cửa sổ, cung thứ tự, setup và trạng thái khuôn từ một lịch heuristic. Hint không cố định quyết định. Bộ điều phối giữ lịch ban đầu nếu solver không trả lịch tốt bằng nó; trường hợp đó ghi `HEURISTIC_FALLBACK` và lưu riêng `solver_status`. Kết quả được kiểm tra độc lập; khi có nghiệm solver, objective cũng được đối chiếu. Không gọi lịch dự phòng là nghiệm solver.

## v1 — lô đi qua 4 công đoạn

Hint là lịch EDD.

Cài đặt: [experiment.py](../common/experiment.py) và [cp_engine.py](../common/cp_engine.py).

## v2 — lượt theo công đoạn

Hint là lịch tốt nhất trong FIFO/EDD/SPT sau bước dồn ca (`heuristic_start`); `result.json` ghi nguồn ở `hint_source`.

Cài đặt: [stage_runs/experiment.py](../common/stage_runs/experiment.py) và [stage_runs/cp_engine.py](../common/stage_runs/cp_engine.py).
