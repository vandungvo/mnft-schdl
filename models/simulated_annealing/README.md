# Simulated Annealing

Chạy từ gốc repo: `python -m models.simulated_annealing.run --seconds 30 --seed 11`.

Mã hoá gồm random-key ưu tiên 192 công đoạn và thiên hướng lựa chọn máy. Khởi tạo theo EDD; mỗi bước hoán đổi 1–4 cặp key hoặc thay offset chọn máy. Chấp nhận bước xấu theo xác suất nhiệt độ; nhiệt độ giảm theo phần ngân sách đã dùng. Luôn lưu lịch tốt nhất, không chỉ trạng thái cuối chuỗi.

Cài đặt: [search.py](../common/search.py), nhánh `sa`, dùng [decoder](../common/decoder.py). Không dùng CP-SAT repair. `result.json` lưu số vòng, số bước chấp nhận và lịch sử cải thiện; không có cận toàn cục.
