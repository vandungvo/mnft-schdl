# FIFO

Chạy từ gốc repo: `python -m models.fifo.run`.

Tại thời điểm sớm nhất có thể xếp công đoạn, ưu tiên release rồi thứ tự lô trong input. Chọn máy hoàn tất sớm nhất trong tập đủ điều kiện. Đây là heuristic xây dựng lịch, không có chứng minh tối ưu.

Thuật toán: [decoder chung](../common/decoder.py). Lịch, KPI và kiểm tra hợp lệ lưu trong `results/<run>/seed_<seed>/`. Cùng input: [wheel_factory.json](../input/wheel_factory.json).
