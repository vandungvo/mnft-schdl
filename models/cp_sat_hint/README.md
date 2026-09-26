# CP-SAT có hint EDD

Chạy từ gốc repo: `python -m models.cp_sat_hint.run --seconds 30 --seed 11`.

Cùng mô hình với CP-SAT nguyên khối, thêm gợi ý thời gian, máy, cửa sổ, cung thứ tự, setup và trạng thái khuôn từ lịch EDD. Hint không cố định quyết định. Bộ điều phối giữ EDD nếu solver không trả lịch tốt bằng lịch ban đầu; trường hợp đó ghi `HEURISTIC_FALLBACK` và lưu riêng `solver_status`.

Cài đặt: [experiment.py](../common/experiment.py) và [cp_engine.py](../common/cp_engine.py). Kết quả được kiểm tra độc lập; khi có nghiệm solver, objective cũng được đối chiếu. Không gọi lịch dự phòng là nghiệm solver.
