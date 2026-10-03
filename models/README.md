# Thử nghiệm nhiều hướng lập lịch trên cùng đầu vào

Thư mục này chứa **hai phiên bản mô hình lập lịch**, mỗi phiên bản chạy được bằng cùng tám phương pháp. Mã dùng chung đảm bảo mọi phương pháp của một phiên bản dùng cùng dữ liệu, cùng cách tính mục tiêu và cùng validator; không sao chép tám bản logic nghiệp vụ dễ lệch nhau.

## Hai phiên bản

| | v1 — lô đi qua 4 công đoạn | v2 — lượt theo công đoạn |
|---|---|---|
| Input | `schema_version` 4 (tự nâng từ 3) | `schema_version` 5 |
| File input | [input/wheel_factory.json](input/wheel_factory.json) | `dataset/wheel-factory-small/model_input.json` (sinh bởi `prepare.py` từ `raw_input.json`) |
| Quy trình | đúc → CNC → sơn → QC | đúc → nhiệt luyện → gia công → sơn → thử nghiệm & đóng gói |
| Đơn vị xếp lịch | Lô cố định, mỗi lô đi qua cả 4 công đoạn | Lượt có cỡ riêng theo công đoạn (16/24/20/25/20), nối nhau qua kho bán thành phẩm |
| Quy mô input hiện có | 36 đơn, 48 lô, 7 máy, 2 tuần | 4 đơn, 42 lượt, 9 máy, 4 khuôn, 3 ngày |
| Khuôn | Cố định theo máy đúc | Dùng chung, lắp lên máy đúc nào cũng được |
| Lịch máy | Theo ca | Theo ca; lò nhiệt luyện chạy 24/7 |
| Mục tiêu | Một tầng: tổng có trọng số | Hai tầng: mức phục vụ trước, chi phí vận hành sau |
| Mã engine | `common/*.py` | `common/stage_runs/` |
| Ai dùng | `backend/` và các đợt chạy tháng 9 (18–19/09) | Dataset nhỏ 5 công đoạn (30/09) |
| Tài liệu quy ước | [input/README.md](input/README.md) | `dataset/wheel-factory-small/SOURCE.md` |
| Kết quả đã lưu | [runs/v1/](runs/v1/) | [runs/v2/](runs/v2/) |

`common.instance.load()` đọc `schema_version` của input rồi tự chọn engine, nên lệnh chạy của hai phiên bản chỉ khác tham số `--input`. Hai engine tách riêng để thay đổi bên này không âm thầm làm đổi bên kia.

## Cấu trúc thư mục

| Đường dẫn | Phiên bản | Nội dung |
|---|---|---|
| `common/instance.py` | v1 + chung | `load()` (chọn engine theo schema), `digest`, `save_json`; phần còn lại là quy tắc và bộ sinh input v1 |
| `common/experiment.py` | v1 + chung | Bộ chạy chung (`run_one`, `entry`, `METHODS`, ghi kết quả); `execute()` của v1 gồm CP-SAT có hint và CP-LNS |
| `common/decoder.py` | v1 | Dựng lịch FIFO/EDD/SPT, decoder cho SA/GA |
| `common/search.py` | v1 | SA và GA |
| `common/cp_engine.py` | v1 | Mô hình CP-SAT |
| `common/evaluate.py` | v1 | Validator độc lập và KPI |
| `common/stage_runs/instance.py` | v2 | Lịch ca, thời lượng lượt, quy tắc khuôn, kiểm input |
| `common/stage_runs/experiment.py` | v2 | `execute()` của v2: lịch khởi tạo, CP-SAT có hint, CP-LNS |
| `common/stage_runs/decoder.py` | v2 | Dựng lịch FIFO/EDD/SPT, decoder cho SA/GA |
| `common/stage_runs/search.py` | v2 | SA và GA (có gen trì hoãn và gen làm trước) |
| `common/stage_runs/compact.py` | v2 | Dồn ca: dời lượt sang ca đã mở mà không đổi thứ tự trên máy |
| `common/stage_runs/cp_engine.py` | v2 | Mô hình CP-SAT |
| `common/stage_runs/evaluate.py` | v2 | Validator độc lập và KPI hai tầng |
| `common/stage_runs/report.py` | v2 | Vẽ Gantt HTML |
| `fifo/`, `edd/`, `spt/`, `simulated_annealing/`, `genetic_algorithm/`, `cp_sat/`, `cp_sat_hint/`, `cp_lns/` | cả hai | Mỗi thư mục một `run.py` (gọi bộ chạy chung) và `README.md` mô tả phương pháp ở từng phiên bản |
| `run_all.py` | cả hai | Chạy nhiều phương pháp, nhiều seed trên một input, sinh bảng so sánh |
| `input/` | v1 | Input mặc định và bản CSV để đọc. `backend/` tham chiếu cứng `input/wheel_factory.json`, không di chuyển |
| `runs/` | cả hai | Mọi đợt chạy đã lưu, chia `v1/`, `v2/`, `archive/`. Danh mục: [runs/README.md](runs/README.md) |
| `optional_stock/` | riêng | Thử nghiệm độc lập về sản xuất dự trữ (xem dưới) |
| `tests/` | xem dưới | Kiểm thử |

Vì sao mã v1 vẫn nằm trực tiếp trong `common/`: `backend/` import `models.common.evaluate`, `models.common.experiment` và `models.common.instance`, và `backend/Dockerfile` chép nguyên thư mục này. Đổi đường dẫn gói phải sửa cả backend.

### Kiểm thử

| File | Phiên bản | Số test | Kiểm gì |
|---|---|---:|---|
| `tests/test_contract.py` | v1 | 21 | Instance nhỏ giải chính xác, lịch cố tình phá để thử validator |
| `tests/test_reserve_capacity.py` | v1 | 17 | Lô dự trữ, lượt bán thành phẩm tuỳ chọn, ca đóng được |
| `tests/test_stage_runs.py` | v2 | 20 | Engine v2 trên dataset nhỏ |
| `tests/test_optional_stock.py` | riêng | 6 | Thử nghiệm `optional_stock/` |

### `optional_stock/`

Thử nghiệm riêng cho chính sách sản xuất dự trữ nhằm lấp công suất trống. Nó có model CP-SAT hai tầng, instance demo và kết quả riêng (`optional_stock/results/`), không dùng `common/` và không nằm trong bảng xếp hạng tám phương pháp vì thay đổi tập quyết định và hàm mục tiêu. Ý tưởng làm trước sau đó đã được đưa vào cả v1 (lô dự trữ) và v2 (phương án làm trước).

## Tám phương pháp

| Folder | Phương pháp | v1 | v2 khác gì |
|---|---|---|---|
| `fifo/` | Quy tắc ưu tiên FIFO | Tại sự kiện sớm nhất, ưu tiên release rồi thứ tự lô | Cùng cơ chế trên lượt; không chọn làm trước; lô QC chờ khi kho thành phẩm sẽ vượt trần |
| `edd/` | Earliest Due Date | Ưu tiên hạn gần, sau đó trọng số đơn | Như trên |
| `spt/` | Shortest Processing Time | Ưu tiên thời lượng gia công ngắn trên máy ứng viên | Như trên |
| `simulated_annealing/` | Simulated Annealing | Đổi random-key ưu tiên và thiên hướng chọn máy; chấp nhận bước xấu theo nhiệt độ giảm | Thêm gen trì hoãn và gen làm trước; dồn ca ở cuối |
| `genetic_algorithm/` | Genetic Algorithm | Quần thể 14, tournament 3, lai uniform random-key, đột biến, giữ 2 elite | Như SA |
| `cp_sat/` | CP-SAT nguyên khối không hint | Assignment, circuit thứ tự, setup, trạng thái khuôn, ca, tồn kho và mục tiêu chung | Thêm chọn khuôn, circuit theo khuôn, reservoir bán thành phẩm, biến bật/tắt làm trước |
| `cp_sat_hint/` | CP-SAT + hint | Hint là lịch EDD; giữ fallback hợp lệ nếu solver chưa cải thiện | Hint là lịch tốt nhất trong FIFO/EDD/SPT sau dồn ca |
| `cp_lns/` | Large Neighborhood Search + CP repair | Bắt đầu EDD; mở khoảng 20% lô, CP giải bài con tối đa 10 giây/lượt | Luân phiên 4 kiểu vùng lân cận: thời gian, máy, công đoạn, ngẫu nhiên |

Đây là tám cấu hình thuộc các nhóm dispatching, metaheuristic, CP và hybrid. Chưa triển khai MILP/RL/GNN; không gán tên những phương pháp này cho một wrapper gọi CP-SAT.

## Chạy

Chạy từ gốc `D:\mnft-schdl` với Python 3.13:

```powershell
python -m pip install -r models/requirements.txt

# v1 (input mặc định)
python -m models.run_all --seconds 30 --seeds 11 29 47
python -m models.simulated_annealing.run --seconds 30 --seed 11
python -m models.run_all --methods fifo edd spt cp_lns --seconds 30 --seeds 11

# v2
python dataset/wheel-factory-small/prepare.py
python -m models.run_all --input dataset/wheel-factory-small/model_input.json --seconds 30 --seeds 11 29 47
python -m models.cp_sat_hint.run --input dataset/wheel-factory-small/model_input.json --seconds 60
$env:MNFT_CP_WORKERS = 8   # tuỳ chọn, chỉ v2: CP-SAT nhiều luồng (mặc định 1)

# kiểm thử
python -m unittest discover -s models/tests -v
python -m unittest models.tests.test_stage_runs -v
```

Có thể truyền `--input path/to/file.json` theo cùng schema/hợp đồng; không sửa giả định về khuôn/tài nguyên tuỳ tiện rồi coi các bộ giải vẫn tương đương.

## Kết quả đã lưu

Danh mục đầy đủ và phân loại từng đợt: [runs/README.md](runs/README.md).

- **v1, 30 giây** ([báo cáo](runs/v1/comparison/20260918T172523480257Z/REPORT.md), [bảng HTML](runs/v1/comparison/20260918T172523480257Z/index.html), [biên bản kiểm tra](runs/v1/comparison/20260918T172523480257Z/audit.json)): 15/18 lịch hợp lệ, 3 lượt CP-SAT không hint trả UNKNOWN. SA tốt nhất 43.545, giảm khoảng 36% so với EDD 68.017.
- **v1, 900 giây** ([báo cáo](runs/v1/comparison/20260919T015246251063Z/REPORT.md)): CP-LNS tốt nhất 37.802, SA 39.216; CP-SAT không hint vẫn UNKNOWN.
- **v2, 30 giây, công thức hai tầng** ([báo cáo](runs/v2/comparison/20260930T094223177417Z/REPORT.md)): 18/18 lịch hợp lệ. CP-LNS tốt nhất 40 · 10.564 (tầng 1 · tầng 2); phân tích ở `dataset/wheel-factory-small/SOURCE.md`.

Hai đợt v1 chạy trên input schema 1, trước khi engine v1 có tồn bán thành phẩm. Engine v1 hiện tại (schema 4) cho số khác và chưa có đợt so sánh đầy đủ nào được lưu; đừng trích số v1 ở trên như kết quả của mã hiện tại.

Điểm của v1 và v2 không so được với nhau: khác input, khác quy trình và khác công thức mục tiêu.

Mỗi lần chạy lưu `result.json` (trạng thái, KPI, thời gian, validator, cận/gap nếu có, lịch sử cải thiện), `schedule.json`, `schedule.csv`, `gantt.html`, giao hàng, tồn kho, số liệu từng ca, `solver.log`, snapshot input và snapshot mã Python. Nếu không có nghiệm, vẫn lưu trạng thái/input/log; không sinh lịch giả. Run mới không ghi đè run cũ.

## Công bằng và giới hạn so sánh

Trong một phiên bản, mọi hướng dùng cùng input/hash, ràng buộc và hàm mục tiêu. Ngân sách tối ưu gồm khởi tạo/dựng mô hình; CP dùng một worker và chạy tuần tự để tránh tranh CPU. Baseline xác định chạy một lần, search chạy ba seed. Một bước decode không bị ngắt giữa chừng nên có thể vượt ngân sách vài chục mili giây; thời gian thực luôn lưu lại. Import thư viện khởi động, xuất file và validator được phản ánh trong các số thời gian thực, không dùng thời gian suy luận riêng để so với thời gian huấn luyện.

FIFO/EDD/SPT và SA/GA dùng bộ dựng lịch tại sự kiện sớm nhất, append-only trên từng máy; chỉ ưu tiên giữa các công đoạn tại sự kiện đó, không đặt chỗ cho việc chưa release và bỏ việc sẵn sàng. SA/GA còn tối ưu thiên hướng máy bằng offset trong [-600,600] phút khi chấm ứng viên, không thay đổi thời lượng thực. Ở v1, decoder này không chủ động trì hoãn để gộp ca như CP có thể làm; ở v2, gen trì hoãn và bước dồn ca bù một phần khoảng cách đó. Đây là khác biệt sức mạnh tìm kiếm, không phải thay đổi ràng buộc cứng.

CP-LNS giữ lịch tốt nhất đã kiểm tra; cận bài con không phải cận toàn bài nên không báo gap toàn cục. CP-SAT hết giờ chưa có nghiệm trả UNKNOWN, không tuyên bố bài toán vô nghiệm. CP-SAT có hint dùng fallback phải ghi rõ HEURISTIC_FALLBACK. FEASIBLE không đồng nghĩa OPTIMAL.

Validator dựng lại chuỗi máy, setup, bảo trì theo chu kỳ, precedence, ca, lượng phân bổ và tồn kho từ đầu vào/lịch, không tin các cờ khả thi từ thuật toán. Với CP, objective do solver trả được đối chiếu với evaluator độc lập. Các kiểm thử cố tình phá lịch kiểm tra validator có phát hiện lỗi; instance nhỏ kiểm tra CP và evaluator nhất quán.

Một input và ba seed là **thử nghiệm thăm dò**, không đủ kết luận thuật toán tốt nhất nói chung. Đây là mô hình tĩnh đã biết đơn gấp/downtime, với các đơn giản hoá minh bạch trong tài liệu input; chưa kiểm chứng đầy đủ yêu cầu tái lập lịch trực tuyến.

## Nguồn kỹ thuật

- [OR-Tools Job Shop](https://developers.google.com/optimization/scheduling/job_shop): interval, precedence, no-overlap.
- [Ví dụ circuit và khoảng cách](https://github.com/google/or-tools/blob/stable/examples/python/jobshop_ft06_distance_sat.py): nguồn tham khảo mô hình thứ tự; mã tại đây bổ sung setup/bảo trì/calendar theo hợp đồng riêng.
- [Trạng thái CP-SAT](https://developers.google.com/optimization/cp/cp_solver).
- [Khảo sát phương pháp của đề tài](../report/scheduling-algorithms/scheduling_methods_and_recommendation.md).
