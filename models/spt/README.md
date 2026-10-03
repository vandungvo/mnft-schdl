# Shortest Processing Time

Chạy từ gốc repo: `python -m models.spt.run` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/spt/results/<run>/seed_<seed>/`.

## v1 — lô đi qua 4 công đoạn

Tại sự kiện sớm nhất, ưu tiên công đoạn có thời gian gia công ngắn trên máy ứng viên; tie-break bằng hạn giao rồi thứ tự lô. Thời gian setup/bảo trì vẫn chiếm tài nguyên và tính trong KPI, nhưng không được cộng vào chỉ số SPT.

Thuật toán: [decoder chung](../common/decoder.py).

## v2 — lượt theo công đoạn

Cùng cơ chế trên lượt; không chọn phương án làm trước. Trên dataset nhỏ hiện tại SPT cho cùng lịch với EDD.

Thuật toán: [stage_runs/decoder.py](../common/stage_runs/decoder.py).
