# Large Neighborhood Search với CP repair

Chạy từ gốc repo: `python -m models.cp_lns.run --seconds 30 --seed 11` (v1) hoặc thêm `--input dataset/wheel-factory-small/model_input.json` (v2). Kết quả lưu ở `models/runs/<v1|v2>/cp_lns/results/<run>/seed_<seed>/`.

Ở cả hai phiên bản: CP-SAT tối ưu lại phần được mở trong tối đa 10 giây/lượt, tính cả dựng mô hình; chỉ nhận lịch đã qua kiểm tra có objective thấp hơn incumbent. Đây là LNS cơ bản, chưa phải ALNS. Không báo gap toàn bài từ cận bài con.

## v1 — lô đi qua 4 công đoạn

Bắt đầu từ EDD. Mỗi lượt chọn ngẫu nhiên khoảng 20% lô để mở toàn bộ công đoạn; giữ máy và thời điểm của các lô còn lại.

Cài đặt: [experiment.py](../common/experiment.py), nhánh `cp_lns`, dùng [cp_engine.py](../common/cp_engine.py). Kết quả lưu danh sách lô mở, trạng thái và thời gian từng bài con.

## v2 — lượt theo công đoạn

Bắt đầu từ lịch tốt nhất trong FIFO/EDD/SPT sau bước dồn ca. Luân phiên bốn kiểu vùng lân cận:

- **Thời gian:** mọi lượt chạm một cửa sổ ngẫu nhiên dài 8–16 giờ, để cả ca có thể trống.
- **Máy:** mọi lượt trên 2 máy ngẫu nhiên.
- **Công đoạn:** mọi lượt của một công đoạn.
- **Ngẫu nhiên:** khoảng 20% số lượt.

Cài đặt: [stage_runs/experiment.py](../common/stage_runs/experiment.py), nhánh `cp_lns`, dùng [stage_runs/cp_engine.py](../common/stage_runs/cp_engine.py) với `fixed_runs`. Kết quả lưu kiểu vùng lân cận, danh sách lượt mở, trạng thái và thời gian từng bài con.
