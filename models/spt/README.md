# Shortest Processing Time

Chạy từ gốc repo: `python -m models.spt.run`.

Tại sự kiện sớm nhất, ưu tiên công đoạn có thời gian gia công ngắn trên máy ứng viên; tie-break bằng hạn giao rồi thứ tự lô. Thời gian setup/bảo trì vẫn chiếm tài nguyên và tính trong KPI, nhưng không được cộng vào chỉ số SPT.

Thuật toán: [decoder chung](../common/decoder.py). Kết quả nằm trong `results/<run>/seed_<seed>/`.
