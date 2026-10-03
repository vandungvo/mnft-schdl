# Simulated Annealing

Chạy từ gốc repo: `python -m models.simulated_annealing.run --seconds 30 --seed 11` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/simulated_annealing/results/<run>/seed_<seed>/`.

## v1 — lô đi qua 4 công đoạn

Mã hoá gồm random-key ưu tiên 192 công đoạn và thiên hướng lựa chọn máy. Khởi tạo theo EDD; mỗi bước hoán đổi 1–4 cặp key hoặc thay offset chọn máy. Chấp nhận bước xấu theo xác suất nhiệt độ; nhiệt độ giảm theo phần ngân sách đã dùng. Luôn lưu lịch tốt nhất, không chỉ trạng thái cuối chuỗi.

Cài đặt: [search.py](../common/search.py), nhánh `sa`, dùng [decoder](../common/decoder.py). Không dùng CP-SAT repair. `result.json` lưu số vòng, số bước chấp nhận và lịch sử cải thiện; không có cận toàn cục.

## v2 — lượt theo công đoạn

Bộ gen có thêm hai khối so với v1:

- **Gen trì hoãn** (0–960 phút mỗi lượt): cho phép lượt chờ một ca đã mở thay vì mở ca mới.
- **Gen phương án làm trước** (một gen mỗi phương án, > 0,5 là bật): để tìm kiếm tự quyết định làm trước.

Nhiệt độ tính trên thang tầng 2 của mục tiêu, nên bước làm xấu tầng 1 (trễ, thiếu tồn an toàn) không bao giờ được chấp nhận. 15% ngân sách cuối dành cho bước dồn ca trên lịch tốt nhất.

Cài đặt: [stage_runs/search.py](../common/stage_runs/search.py), nhánh `sa`, dùng [stage_runs/decoder.py](../common/stage_runs/decoder.py) và [stage_runs/compact.py](../common/stage_runs/compact.py).
