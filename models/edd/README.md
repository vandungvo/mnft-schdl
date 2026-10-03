# Earliest Due Date

Chạy từ gốc repo: `python -m models.edd.run` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/edd/results/<run>/seed_<seed>/`.

## v1 — lô đi qua 4 công đoạn

Tại sự kiện có thể xếp việc sớm nhất, ưu tiên hạn giao gần; nếu cùng hạn thì ưu tiên trọng số đơn cao, sau đó mã thứ tự lô. Mọi công đoạn dùng hạn giao của đơn chứa lô.

Thuật toán: [decoder chung](../common/decoder.py). Đây cũng là lịch khởi tạo chung cho SA/GA, CP-SAT có hint và LNS của v1; thời gian khởi tạo tính trong ngân sách.

## v2 — lượt theo công đoạn

Cùng cơ chế trên lượt: hoà thời điểm bắt đầu thì ưu tiên hạn giao gần, rồi ưu tiên đơn cao. Không chọn phương án làm trước.

Thuật toán: [stage_runs/decoder.py](../common/stage_runs/decoder.py). Ở v2, lịch khởi tạo cho CP-SAT có hint và CP-LNS không cố định là EDD mà là lịch tốt nhất trong FIFO/EDD/SPT sau bước dồn ca.
