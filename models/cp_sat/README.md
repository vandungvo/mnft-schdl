# CP-SAT nguyên khối

Chạy từ gốc repo: `python -m models.cp_sat.run --seconds 30 --seed 11`.

Mô hình đầy đủ của hợp đồng thí nghiệm: optional interval chọn máy, circuit chọn thứ tự, setup theo cung liền kề, bộ đếm chu kỳ khuôn và bảo trì, gán khoảng khả dụng, mở ca, giao đủ đơn, safety stock cuối ngày và mục tiêu chung. Không cung cấp lịch hint.

Cài đặt: [cp_engine.py](../common/cp_engine.py). Chạy một worker; thời gian dựng mô hình được trừ khỏi ngân sách solver. Có incumbent thì lưu lịch và đối chiếu objective với evaluator; không có nghiệm thì lưu UNKNOWN/log, không lấy lịch baseline thay thế. Cận/gap chỉ báo khi có nghiệm; FEASIBLE không đồng nghĩa tối ưu.
