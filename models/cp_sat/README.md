# CP-SAT nguyên khối

Chạy từ gốc repo: `python -m models.cp_sat.run --seconds 30 --seed 11` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/cp_sat/results/<run>/seed_<seed>/`.

Ở cả hai phiên bản: không cung cấp lịch hint; thời gian dựng mô hình được trừ khỏi ngân sách solver. Có incumbent thì lưu lịch và đối chiếu objective với evaluator; không có nghiệm thì lưu UNKNOWN/log, không lấy lịch baseline thay thế. Cận/gap chỉ báo khi có nghiệm; FEASIBLE không đồng nghĩa tối ưu.

## v1 — lô đi qua 4 công đoạn

Mô hình đầy đủ của hợp đồng thí nghiệm: optional interval chọn máy, circuit chọn thứ tự, setup theo cung liền kề, bộ đếm chu kỳ khuôn và bảo trì, gán khoảng khả dụng, mở ca, giao đủ đơn, safety stock cuối ngày và mục tiêu chung.

Cài đặt: [cp_engine.py](../common/cp_engine.py). Chạy một worker.

## v2 — lượt theo công đoạn

Mỗi lượt chọn máy, khuôn (với lượt đúc) và cửa sổ lịch; mỗi phương án làm trước là một biến bật/tắt cho cả nhóm lượt. Một circuit mỗi máy cho setup, một circuit mỗi khuôn mang bộ đếm chu kỳ và bảo trì. Tồn bán thành phẩm là reservoir theo mã, có độ trễ chuyển tiếp theo công đoạn. Mục tiêu hai tầng: `scale × tầng 1 + tầng 2`.

Cài đặt: [stage_runs/cp_engine.py](../common/stage_runs/cp_engine.py). Mặc định một worker; đặt biến môi trường `MNFT_CP_WORKERS` để chạy nhiều luồng. Hàm `solve()` còn nhận `limits` (chặn trên một thành phần mục tiêu) để vẽ đường đánh đổi; chưa có file chạy nào trong repo dùng tham số này.
