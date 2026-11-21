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

Vì tầng 1 được tìm theo kiểu tham lam, hoán đổi ngẫu nhiên hiếm khi chạm đúng vài lượt quyết định đơn trễ cuối cùng. Từ 13/11/2026, 25% số bước là **bước đi định hướng** (`PULL_LATE`): lấy một lượt cấp hàng cho một đơn đang trễ trong lịch hiện tại, đổi ưu tiên với một lượt cùng công đoạn đang xếp trước nó và xoá trì hoãn của lượt đó. Trên bộ 2 tuần, SA 1 seed 60 giây đi từ 2 đơn trễ xuống 0 (cùng với decoder nhanh hơn khoảng 3 lần). Các đợt SA v2 lưu trước ngày này chạy bằng bản chưa có bước đi này.

`portfolio()` chạy nhiều seed song song, mỗi seed một tiến trình, và cho nửa số seed kém hơn xuất phát lại từ lịch dẫn đầu một lần giữa chừng; phương pháp [`hybrid`](../hybrid/README.md) dùng nó làm bước 2.

Cài đặt: [stage_runs/search.py](../common/stage_runs/search.py), nhánh `sa`, dùng [stage_runs/decoder.py](../common/stage_runs/decoder.py) và [stage_runs/compact.py](../common/stage_runs/compact.py).
