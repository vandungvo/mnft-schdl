# Kết hợp: luật điều độ → SA nhiều seed → CP-SAT

Chạy từ gốc repo: `python -m models.hybrid.run --input dataset/wheel-factory-2weeks/model_input.json --seconds 300 --seed 11`. Kết quả lưu ở `models/runs/v2/hybrid/results/<run>/seed_<seed>/`. Chỉ có cho v2 (schema 5).

Đây là phương pháp dùng trong sản phẩm cho kỳ 2 tuần. Nó ghép ba bước mà thực nghiệm cho thấy bù cho nhau:

| Bước | Làm gì | Vì sao |
|---|---|---|
| 1. Luật điều độ | FIFO, EDD, SPT; giữ lịch tốt nhất | Có lịch hợp lệ sau chưa tới 1 giây, làm phương án dự phòng |
| 2. SA nhiều seed | Mỗi seed một tiến trình, cùng thời lượng: 40% ngân sách, tối đa 90 giây | SA kéo số đơn trễ xuống nhanh nhưng kết quả dao động mạnh theo seed; nhân còn rảnh dùng để thử thêm seed |
| 3. CP-SAT | Xuất phát từ lịch tốt nhất của bước 2, gợi ý đủ mọi biến, nhiều worker (2 worker tìm kiếm đầy đủ để giữ cận, còn lại là LNS) | CP-SAT giữ mức phục vụ đó và giảm chi phí vận hành (dồn lượt vào ít ca hơn) |

Mỗi bước chỉ thay kết quả bước trước khi tốt hơn, nên kết quả không bao giờ tệ hơn luật điều độ tốt nhất. `result.json` ghi `phases` (thời điểm và điểm sau mỗi bước, điểm từng seed SA), `hint_source`, `workers`, `sa_processes`.

Tham số:

- Số worker của CP-SAT: `MNFT_CP_WORKERS`, mặc định một nửa số luồng của máy, tối thiểu 2 (khác các phương pháp CP đơn lẻ, mặc định 1 worker để so sánh công bằng). Trên máy 8 nhân / 16 luồng, 8 worker cho kết quả tốt hơn 16 ở mọi cặp đã đo.
- Số tiến trình SA: bằng số worker, tối đa 8. Với 1 worker, SA chạy một seed ngay trong tiến trình chính.

## Số đo trên bộ 2 tuần (13–14/11/2026)

`dataset/wheel-factory-2weeks`: 269 lượt, 24 đơn, 8 máy. Máy đo: 8 nhân / 16 luồng. Điểm ghi **tầng 1 · tầng 2** (tầng 1: trễ hạn và thiếu tồn an toàn; 160 là mức tối thiểu đã được chứng minh). Mỗi dòng là một lần chạy, chưa lặp đủ để lấy trung bình.

| Việc | Trước | Sau |
|---|---|---|
| SA, 1 seed, 60 giây | 13 lịch/giây · 139.690 · 102.731 · 2 đơn trễ | 30 lịch/giây · 160 · 97.321 · 0 đơn trễ |
| SA, 8 seed, 72 giây: lần chạy có seed đạt tầng 1 = 160 | chạy độc lập, chưa có bước đi định hướng: trung vị tầng 1 của các seed khoảng 53.000 | có bước đi định hướng, tiếp sức 1 lần giữa chừng: 10 / 10 lần chạy |
| CP-SAT từ lịch EDD: thời điểm có lịch đầu tiên | 47 giây (1 worker), 32 giây (16 worker) | 3,6 giây |
| CP-SAT 120 giây từ cùng một lịch SA (160 · 97.321) | 160 · 81.081 (presolve mặc định, 16 worker) | 160 · 49.751 (8 worker, 2 worker tìm kiếm đầy đủ) |
| Cả pipeline, 60 giây (seed 11, 29) | — | 160 · 98.567 và 160 · 100.566 · 0 đơn trễ · 91 ca máy |
| Cả pipeline, 180 giây (seed 11, 29, 47) | CP-SAT + gợi ý EDD: giữ nguyên EDD, 5 đơn trễ | 160 · 55.078 – 59.074 · 0 đơn trễ · 60–64 ca máy · hiệu suất 56–57% |
| Cả pipeline, 540 giây (seed 11) | — | 160 · 44.729 · 0 đơn trễ · 53 ca máy · hiệu suất 64,9% |

Các lượt cả pipeline đo khi máy chỉ còn khoảng 1 GB RAM trống (SA thử được ít lịch hơn khoảng 35% so với lúc máy rảnh), với trần SA 180 giây; mã hiện đặt trần 90 giây để ngân sách dài dành cho CP-SAT. Ở mọi lượt, cận của CP-SAT ≥ 160.003.000, tức mức phục vụ (tầng 1 = 160) đã được chứng minh là tối ưu.

Ngân sách 60 giây còn mỏng: SA chỉ có 24 giây. Một lượt chạy qua backend ngày 14/11 (cùng lúc máy đang chạy web) vẫn ra 0 đơn trễ (160 · 105.436), nhưng chỉ 1 / 8 seed SA tới được mức đó. Ở đợt 180 giây đã lưu (SA 72 giây), cả 8 seed đều đạt tầng 1 = 160.

Năm thay đổi tạo ra khác biệt:

1. **Decoder** tính vị trí một lần cho mỗi nhóm lượt hoán đổi được thay vì cho từng lượt, và dùng lại phần chỉ phụ thuộc input (`prepare()`). Lịch dựng ra giống hệt bản cũ (`models/tests/test_stage_runs_speed.py` so bằng digest).
2. **Bước đi định hướng trong SA**: 25% số bước lấy một lượt cấp hàng cho đơn đang trễ và đổi ưu tiên với một lượt xếp trước nó cùng công đoạn (`PULL_LATE`).
3. **SA nhiều seed, tiếp sức một lần**: giữa chừng, nửa số seed kém hơn xuất phát lại từ genome tốt nhất, nửa còn lại giữ hướng riêng.
4. **Gợi ý đủ mọi biến** cho CP-SAT (trước đây thiếu khoảng 13.000 / 52.000 biến) và bỏ các cung thứ tự mà ràng buộc đối xứng đã loại.
5. **Cấu hình solver khi có lịch khởi đầu**: presolve một lượt không probing, 2 worker tìm kiếm đầy đủ, còn lại là LNS; số worker bằng nửa số luồng.

Đợt chạy đã lưu: `models/runs/v2/hybrid/results/20261113T175303106302Z/seed_11/` (180 giây, mã hiện tại với trần SA 90 giây): 160 · 53.534, 0 đơn trễ, 59 ca máy, hiệu suất 58,4%, cận ≥ 160.004.109. Các pha: EDD 323.465 · 104.894 → SA 72 giây 160 · 96.122 (seed 2011) → CP-SAT 107 giây.

## Bật / tắt mục tiêu hiệu suất máy (14/11/2026)

Hiệu suất máy trong ca đã bật được tối ưu qua trọng số `nonproductive_minutes` (bộ 2 tuần đặt 3). Chạy `hybrid` 180 giây với trọng số này bằng 0, các trọng số khác giữ nguyên, rồi chấm lại bằng trọng số gốc:

| Trọng số thời gian không sản xuất | Lượt chạy | Đơn trễ | Ca máy đã bật | Hiệu suất trong ca đã bật | Tầng 2 theo trọng số gốc | Tồn dư thành phẩm (đơn vị·ngày) |
|---|---|---|---|---|---|---|
| 3 (mặc định) | seed 11 (2 lần), 29, 47 | 0 | 59–64 | 56–58% | 53.534 – 59.074 | 2.360 (đợt đã lưu) |
| 0 (tắt) | seed 11, 29 | 0 | 85 và 89 | 40,0% và 38,2% | 90.270 và 95.145 | 1.400 và 1.360 |

Mục tiêu này bớt khoảng 25–30 ca máy và nâng hiệu suất khoảng 18 điểm phần trăm mà không làm trễ đơn nào. Đổi lại, lượt được dồn sớm vào các ca đã mở nên thành phẩm nằm kho lâu hơn (tồn dư tăng từ khoảng 1.400 lên 2.360). Mức 90% trong tiêu chí ban đầu vẫn chưa đạt: tốt nhất đã đo là 64,9% sau 540 giây, và 73,6% sau 24 giờ CP-SAT ở báo cáo tiến độ 25/10. Mỗi cấu hình mới có 2–4 lượt chạy, chưa đủ để lấy khoảng tin cậy, nhưng hai nhóm không chồng lên nhau.

Vì dùng nhiều nhân, **không so điểm của `hybrid` với các phương pháp 1 luồng như một phép so thuật toán công bằng**; đây là phép so "giải pháp trên cả máy" với từng thành phần.

Cài đặt: `hybrid()` trong [stage_runs/experiment.py](../common/stage_runs/experiment.py), `portfolio()` trong [stage_runs/search.py](../common/stage_runs/search.py), [stage_runs/cp_engine.py](../common/stage_runs/cp_engine.py).
