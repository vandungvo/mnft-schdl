# Large Neighborhood Search với CP repair

Chạy từ gốc repo: `python -m models.cp_lns.run --seconds 30 --seed 11`.

Bắt đầu từ EDD. Mỗi lượt chọn ngẫu nhiên khoảng 20% lô để mở toàn bộ công đoạn; giữ máy và thời điểm của các lô còn lại. CP-SAT tối ưu lại trong tối đa 10 giây/lượt, tính cả dựng mô hình. Chỉ nhận lịch đã qua kiểm tra có objective thấp hơn incumbent.

Cài đặt: [experiment.py](../common/experiment.py), nhánh `cp_lns`, dùng [cp_engine.py](../common/cp_engine.py). Kết quả lưu danh sách lô mở, trạng thái và thời gian từng bài con. Đây là LNS cơ bản, chưa phải ALNS. Không báo gap toàn bài từ cận bài con.
