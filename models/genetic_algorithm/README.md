# Genetic Algorithm

Chạy từ gốc repo: `python -m models.genetic_algorithm.run --seconds 30 --seed 11` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/genetic_algorithm/results/<run>/seed_<seed>/`.

## v1 — lô đi qua 4 công đoạn

Mã hoá random-key và thiên hướng máy giống SA; quần thể 14 cá thể, tournament 3, lai uniform theo từng gene, đột biến hoán đổi key/thay thiên hướng máy, giữ hai elite. Khởi tạo có EDD và các biến thể nhiễu. Mỗi cá thể được giải mã thành lịch với cùng ràng buộc.

Cài đặt: [search.py](../common/search.py), nhánh `ga`. Kết quả gồm số thế hệ, lượt đánh giá và lịch sử cải thiện. Đây là GA cơ bản để đối chứng, chưa phải GA được tuning chuyên sâu hay memetic algorithm.

## v2 — lượt theo công đoạn

Cùng cấu hình quần thể (14 cá thể, tournament 3, lai uniform, 2 elite). Bộ gen có thêm gen trì hoãn mỗi lượt và gen bật/tắt phương án làm trước, giống SA của v2. 15% ngân sách cuối dành cho bước dồn ca trên lịch tốt nhất.

Cài đặt: [stage_runs/search.py](../common/stage_runs/search.py), nhánh `ga`.
