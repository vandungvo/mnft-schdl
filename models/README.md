# Thử nghiệm nhiều hướng lập lịch trên cùng đầu vào

Mỗi hướng có thư mục riêng, file chạy riêng và kết quả được giữ theo timestamp/seed. Mã dùng chung trong `common/` đảm bảo cùng dữ liệu, cách tính mục tiêu và validator; không sao chép tám bản logic nghiệp vụ dễ lệch nhau.

## Đợt thực nghiệm đã hoàn tất — 19/09/2026

- [Mở bảng kết quả HTML](comparison/20260918T172523480257Z/index.html) · [Báo cáo đầy đủ](comparison/20260918T172523480257Z/REPORT.md) · [CSV so sánh](comparison/20260918T172523480257Z/results.csv).
- 18 lần chạy: 15 lịch hợp lệ, 3 lượt CP-SAT không hint trả UNKNOWN sau khoảng 30 giây. Các lịch đã lưu được đọc lại, kiểm tra và tính lại KPI; input và source hash giống nhau. [Biên bản kiểm tra](comparison/20260918T172523480257Z/audit.json).
- SA có median objective 48.110 (EDD 68.017); lịch SA tốt nhất đạt 43.545, giảm khoảng 36% điểm tổng so với EDD và còn 1 đơn trễ thay vì 3. [Gantt lịch tốt nhất quan sát được](simulated_annealing/results/20260918T172523480257Z/seed_47/gantt.html).
- GA và CP-LNS cũng cải thiện so với EDD. CP-SAT có hint tìm được nghiệm nhưng chưa cải thiện EDD trong ngân sách này. Đây là kết quả trên một input và cấu hình cụ thể, không kết luận CP-SAT kém hơn nói chung.

Các run trước đợt trên là smoke test trong quá trình phát triển; không gộp chúng vào bảng so sánh chính.

| Folder | Phương pháp thực sự chạy | Cơ chế |
|---|---|---|
| `fifo/` | Quy tắc ưu tiên FIFO | Tại sự kiện sớm nhất, ưu tiên release rồi thứ tự lô |
| `edd/` | Earliest Due Date | Ưu tiên hạn gần, sau đó trọng số đơn |
| `spt/` | Shortest Processing Time | Ưu tiên thời lượng gia công công đoạn ngắn trên máy ứng viên |
| `simulated_annealing/` | Simulated Annealing | Đổi random-key ưu tiên và thiên hướng chọn máy; chấp nhận bước xấu theo nhiệt độ giảm |
| `genetic_algorithm/` | Genetic Algorithm | Quần thể 14, tournament 3, lai uniform random-key, đột biến, giữ 2 elite |
| `cp_sat/` | CP-SAT nguyên khối không hint | Assignment, circuit thứ tự, setup, trạng thái khuôn, ca, tồn kho và mục tiêu chung |
| `cp_sat_hint/` | CP-SAT + hint EDD | Cùng mô hình CP, thêm lịch EDD; giữ fallback hợp lệ nếu solver chưa cải thiện/tìm được nghiệm |
| `cp_lns/` | Large Neighborhood Search + CP repair | Bắt đầu EDD; mở khoảng 20% lô, cố định các lô còn lại, dùng CP giải bài con tối đa 10s/lượt |

Thư mục `optional_stock/` là thử nghiệm riêng cho chính sách sản xuất dự trữ nhằm lấp công suất trống. Nó dùng model CP-SAT hai tầng và hai kịch bản chi phí đối nghịch; chưa được gộp vào bảng xếp hạng tám phương pháp vì thay đổi tập quyết định và hàm mục tiêu của bài toán gốc.

Đây là tám cấu hình thuộc các nhóm dispatching, metaheuristic, CP và hybrid. Chưa triển khai MILP/RL/GNN; không gán tên những phương pháp này cho một wrapper gọi CP-SAT.

## Chạy lại

Chạy từ gốc `D:\mnft-schdl` với Python 3.13 đã dùng trong lần thực nghiệm:

```powershell
python -m pip install -r models/requirements.txt
python -m models.run_all --seconds 30 --seeds 11 29 47
```

Chạy một hướng, hoặc một nhóm:

```powershell
python -m models.simulated_annealing.run --seconds 30 --seed 11
python -m models.cp_sat_hint.run --seconds 60 --seed 11
python -m models.run_all --methods fifo edd spt cp_lns --seconds 30 --seeds 11
python -m unittest discover -s models/tests -v
```

Input có sẵn ở [input/wheel_factory.json](input/wheel_factory.json), giải thích trong [input/README.md](input/README.md). Có thể truyền `--input path/to/file.json` theo cùng schema/hợp đồng; không sửa giả định về khuôn/tài nguyên tuỳ tiện rồi coi các bộ giải vẫn tương đương.

## Xem kết quả

- `comparison/latest.json` trỏ đến báo cáo đợt chạy gần nhất, `comparison/<run>/REPORT.md` có bảng tổng hợp, từng seed và link lịch.
- `comparison/<run>/results.csv` mở được bằng Excel; JSON giữ toàn bộ metadata.
- `<method>/results/<run>/seed_<seed>/result.json`: trạng thái, KPI, thời gian, validator, cận/gap nếu có, lịch sử cải thiện.
- Cùng thư mục có `schedule.json`, `schedule.csv`, `gantt.html`, giao hàng, tồn kho theo sự kiện/cuối ngày, số liệu từng ca, `solver.log`, input snapshot và snapshot mã Python. Mở `gantt.html` trực tiếp trên trình duyệt, rê chuột vào thanh để xem lô/thời gian.
- Nếu không có nghiệm, vẫn lưu trạng thái/input/log; không sinh lịch giả. Run mới không ghi đè run cũ. Timestamp dùng UTC (giờ Việt Nam = UTC+7).

## Công bằng và giới hạn so sánh

Mọi hướng dùng cùng input/hash, ràng buộc và hàm mục tiêu. Ngân sách tối ưu gồm khởi tạo/dựng mô hình; CP dùng một worker và chạy tuần tự để tránh tranh CPU. Baseline xác định chạy một lần, search chạy ba seed. Một bước decode không bị ngắt giữa chừng nên có thể vượt ngân sách vài chục mili giây; thời gian thực luôn lưu lại. Import thư viện khởi động, xuất file và validator được phản ánh trong các số thời gian thực, không dùng thời gian suy luận riêng để so với thời gian huấn luyện.

FIFO/EDD/SPT và SA/GA dùng bộ dựng lịch tại sự kiện sớm nhất, append-only trên từng máy; chỉ ưu tiên giữa các công đoạn tại sự kiện đó, không đặt chỗ cho việc chưa release và bỏ việc sẵn sàng. SA/GA còn tối ưu thiên hướng máy bằng offset trong [-600,600] phút khi chấm ứng viên, không thay đổi thời lượng thực. Decoder này không chủ động trì hoãn để gộp ca như CP có thể làm; đây là khác biệt sức mạnh tìm kiếm, không phải thay đổi ràng buộc cứng.

CP-LNS giữ lịch tốt nhất đã kiểm tra; cận bài con không phải cận toàn bài nên không báo gap toàn cục. CP-SAT hết giờ chưa có nghiệm trả UNKNOWN, không tuyên bố bài toán vô nghiệm. CP-SAT có hint dùng fallback phải ghi rõ HEURISTIC_FALLBACK. FEASIBLE không đồng nghĩa OPTIMAL.

Validator dựng lại chuỗi máy, setup, bảo trì theo chu kỳ, precedence, ca, lượng phân bổ và tồn kho từ đầu vào/lịch, không tin các cờ khả thi từ thuật toán. Với CP, objective do solver trả được đối chiếu với evaluator độc lập. Các kiểm thử cố tình phá lịch kiểm tra validator có phát hiện lỗi; instance nhỏ kiểm tra CP và evaluator nhất quán.

Một input vừa phải và ba seed là **thử nghiệm thăm dò**, không đủ kết luận thuật toán tốt nhất nói chung. Đây là mô hình tĩnh đã biết đơn gấp/downtime, với các đơn giản hoá minh bạch trong README input; chưa kiểm chứng đầy đủ yêu cầu tái lập lịch trực tuyến.

## Nguồn kỹ thuật

- [OR-Tools Job Shop](https://developers.google.com/optimization/scheduling/job_shop): interval, precedence, no-overlap.
- [Ví dụ circuit và khoảng cách](https://github.com/google/or-tools/blob/stable/examples/python/jobshop_ft06_distance_sat.py): nguồn tham khảo mô hình thứ tự; mã tại đây bổ sung setup/bảo trì/calendar theo hợp đồng riêng.
- [Trạng thái CP-SAT](https://developers.google.com/optimization/cp/cp_solver).
- [Khảo sát phương pháp của đề tài](../report/scheduling-algorithms/scheduling_methods_and_recommendation.md).
