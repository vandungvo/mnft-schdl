# Earliest Due Date

Chạy từ gốc repo: `python -m models.edd.run`.

Tại sự kiện có thể xếp việc sớm nhất, ưu tiên hạn giao gần; nếu cùng hạn thì ưu tiên trọng số đơn cao, sau đó mã thứ tự lô. Mọi công đoạn dùng hạn giao của đơn chứa lô.

Thuật toán: [decoder chung](../common/decoder.py). Kết quả nằm trong `results/<run>/seed_<seed>/`. Đây cũng là lịch khởi tạo chung cho SA/GA, CP-SAT có hint và LNS; thời gian khởi tạo tính trong ngân sách.
