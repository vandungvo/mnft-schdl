# FIFO

Chạy từ gốc repo: `python -m models.fifo.run` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/fifo/results/<run>/seed_<seed>/`.

## v1 — lô đi qua 4 công đoạn

Tại thời điểm sớm nhất có thể xếp công đoạn, ưu tiên release rồi thứ tự lô trong input. Chọn máy hoàn tất sớm nhất trong tập đủ điều kiện. Đây là heuristic xây dựng lịch, không có chứng minh tối ưu.

Thuật toán: [decoder chung](../common/decoder.py). Input: [wheel_factory.json](../input/wheel_factory.json).

## v2 — lượt theo công đoạn

Cùng cơ chế, đơn vị xếp là lượt thay cho công đoạn của lô: mỗi bước, lượt bắt buộc nào sẵn sàng và có thời điểm bắt đầu sớm nhất thì được xếp, hoà thì theo thứ tự trong input. Không chọn phương án làm trước.

Thuật toán: [stage_runs/decoder.py](../common/stage_runs/decoder.py).
