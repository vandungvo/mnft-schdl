# Wheel factory — small synthetic instance (self-authored, not external)

**Tạo ngày:** 2026-09-30 (schema 5 — 5 công đoạn chính theo quy trình thực tế; 2 tầng input) | **Trạng thái:** `prepare.py` sinh + tự kiểm (đủ lượng cho mọi tổ hợp dự trữ, tải máy không vượt công suất). Chạy được cả 8 phương pháp của `models/` qua engine `models/common/stage_runs/` (FIFO, EDD, SPT, SA, GA, CP-SAT, CP-SAT+hint, CP-LNS); lịch xếp tay ở `manual_schedule.json`.

Dữ liệu tổng hợp **tự sinh cho đồ án**. Quy trình và phần lớn thông số lấy theo [báo cáo quy trình sản xuất vành hợp kim](../../report/Báo%20cáo%20quy%20trình%20sản%20xuất%20vành%20(mâm)%20xe%20máy%20hợp%20kim.md) (quan sát video + ước tính theo thực hành ngành); chỉ thời gian nhiệt luyện có trích dẫn (Lu và cộng sự, 2018). Mọi số còn lại là **ước tính**, cột "Nguồn" ghi rõ.

## Hai tầng input

```
raw_input.json  ──►  prepare.py  ──►  model_input.json  ──►  engine xếp lịch
(tầng 1: người dùng nhập)  (tính + kiểm)   (tầng 2: model đọc, không sửa tay)
```

`model_input.json` = tầng 1 (trừ `reserve_policy`) + `orders[].lot_allocations`, `runs`, `reserve_options`. Chạy lại: `python dataset/wheel-factory-small/prepare.py`. `prepare.py` từ chối (`PrepError`) khi dữ liệu sai: tồn không đủ cho `initial_allocated`, làm trước vượt đơn dài hạn, tuyến/ma trận setup thiếu mã, lượt đúc vượt giới hạn khuôn, một tổ hợp phương án dự trữ thiếu hàng, tải bắt buộc của một công đoạn vượt công suất máy.

## Quy trình: 5 công đoạn chính

Các bước phụ trong báo cáo được gộp vào công đoạn chính gần nhất. Nấu chảy (bước 1–3) chạy song song cấp liệu liên tục nên không mô hình (vật tư cho đúc đủ từ t=0).

| # | Công đoạn (`stages`) | Gộp các bước trong báo cáo | Máy | Cỡ lượt |
|---|---|---|---|---|
| 1 | `cast` đúc | 4–6 chuẩn bị khuôn, rót trọng lực, mở khuôn; 7–8 cắt đậu ngót, khoan tâm | CAST_1, CAST_2 + 4 khuôn | 16 |
| 2 | `heat` nhiệt luyện | 9 lò mẻ + bể tôi | HT_1, HT_2 (chạy 24/7) | 24 (1 giá; báo cáo 20–30 vành) |
| 3 | `machining` gia công | 10 làm ba via, 11 phun bi, 12 tiện CNC, 13 đo kích thước, 14 thổi phoi, 15 khoan lỗ van | CNC_1, CNC_2 | 20 |
| 4 | `paint` sơn | 16 rửa tiền xử lý, 17 phun sơn + sấy | PAINT_1 (băng tải) | 25 |
| 5 | `qc` thử nghiệm & đóng gói | 18 thử nghiệm (trên mẫu), 19 đóng thùng 4 vành | QC_1 | 20 (= lô = 5 thùng) |

**Cách gộp thời gian:** các bước phụ do người khác làm song song theo dây chuyền, nên **nhịp mỗi vành = nhịp máy chính** (khuôn đúc, máy CNC); thời gian các bước phụ chỉ cộng vào **phần cố định mỗi lượt** (vành đầu tiên phải đi qua hết). Cộng dồn mọi bước vào từng vành sẽ làm máy chính bận gấp 2–3 lần thực tế.

Mã BTP: `F_CAST`, `F_HEAT`, `F_MACH` dùng chung 2 màu (tương tự R); màu chỉ xuất hiện ở sơn (`F_SILVER_PAINT`, …).

## Thông số máy và nguồn

Thời lượng một lượt = `ceil(cỡ lượt × phút/vành + phút cố định)`.

| Máy | Phút/vành | Cố định | Một lượt | Setup | Nguồn |
|---|---|---|---|---|---|
| CAST_1 / CAST_2 | 4,0 / 4,5 | 10 (5 + cắt đậu ngót vành cuối) | 74' / 82' | lắp khuôn đầu kỳ 60', đổi F↔R 60', sau phủ khuôn 30' | Báo cáo: đúc 3–6 phút/vành/khuôn, cắt đậu ngót + khoan tâm 3–6 phút/vành (người khác làm song song). Setup: **ước tính** |
| HT_1 / HT_2 | 0 | 480 | 480' = 8 giờ (mọi lượng trong giá) | 0 | **Chọn 8 giờ theo yêu cầu người dùng** (2026-09-30). Báo cáo trích Lu và cộng sự (2018): T6 thông thường ≈ 15 giờ, cùng nhóm tác giả rút thời gian hòa tan xuống 30 phút mà cơ tính gần như không đổi — 8 giờ tương ứng chu trình đã rút ngắn. `calendar: continuous` |
| CNC_1 / CNC_2 | 6,0 / 7,0 | 28 (tiện 8 + ba via 5 + phun bi 10 + đo 3 + khoan van 2) | 148' / 168' | 10' đầu kỳ, đổi F↔R 18' | Báo cáo: tiện 4–8, ba via 3–5, phun bi 10–15/mẻ, đo 1–3, khoan van 1–2 phút. Setup: ước tính. CNC_2 downtime 15:00–15:30 ngày 1 |
| PAINT_1 | 1,0 | 15 | 40' | cùng màu 0', bạc→đen 12', đen→bạc 24' | Nhịp 1 vành/phút và setup đổi màu: **ước tính** (báo cáo không có nhịp băng tải) |
| QC_1 | 1,0 | 15 (kiểm mẫu mỗi lô) | 35' | 4' | Báo cáo: đóng gói 2–5 phút/thùng 4 vành. Thử mỏi/va đập làm offline trên mẫu, không chặn dòng chảy |

**Độ trễ chuyển tiếp** (`transfer_minutes`): 10' mọi công đoạn, riêng **sơn 120'** (sấy; báo cáo: giai đoạn sơn 1,5–3 giờ/vành, lò sấy chiếm phần lớn).

**Khuôn** (`molds`): khuôn thép **1 lòng** (mỗi lần rót 1 vành), 2 khuôn F + 2 khuôn R, lắp được lên máy đúc nào cũng được. Phủ lại sơn khuôn sau 48 lần rót (F) / 40 (R), mất 30' — **ước tính**. Đã dùng đầu kỳ: MOLD_F1 32/48, MOLD_F2 0/48, MOLD_R1 8/40, MOLD_R2 32/40.

**Lịch ca:** 3 ca/ngày, S2 nghỉ 12:00–12:30; mọi máy chạy cả 3 ca, trừ lò nhiệt luyện chạy liên tục.

## Đơn hàng, tồn kho, chính sách

- **Horizon 3 ngày** (4320 phút): báo cáo cho 1–3 ngày từ thỏi nhôm tới thùng hàng. Với nhiệt luyện 8 giờ, vành đúc mới giao được ngay trong ngày 1 (xem ước lượng O001).
- **Đơn:** O001 F_SILVER 44 (4 từ tồn), **hạn 16:00 ngày 2**, ưu tiên 4; O002 F_BLACK 20 hạn 12:00 ngày 3; O003 R_SILVER 20 hạn 16:00 ngày 3; O004 R_BLACK 24 (4 từ tồn) hạn 22:00 ngày 3.
- **Đơn dài hạn:** LT001 F_SILVER 50, LT002 F_BLACK 25, LT003 R_SILVER 20 (hạn ngày 7–9). Chính sách làm trước: 1 lô F_SILVER, 1 lô F_BLACK, 1 lượt đúc R_SILVER.
- **Tồn BTP đầu kỳ** (WIP đang có): F_CAST 8 / R_CAST 4, **F_HEAT 24 / R_HEAT 12** (giá đã nhiệt luyện chờ gia công), F_MACH 6 / R_MACH 4, tồn sơn 4/3/3/2.
- Không khai `capacity` kho BTP: báo cáo chỉ thấy vành xếp xe giá, không có số.

## Kết quả bước chuẩn bị

- **Lượt bắt buộc (29):** đúc 4 F + 3 R, nhiệt luyện 3 F + 2 R, gia công 4 F + 3 R, sơn 5, lô QC 5. **Phương án làm trước (13 lượt):** RL001 (F_SILVER: 2 đúc, 1 mẻ lò, 1 gia công, 1 sơn, lô QC), RL002 (F_BLACK: tương tự), RB001 (1 lượt đúc R). Tổng 42 lượt.
- **Tải tối thiểu** (phút gia công ÷ phút máy có trong 3 ngày, chưa tính setup):

| | cast | heat | machining | paint | qc |
|---|---|---|---|---|---|
| Chỉ bắt buộc | 6% | **28%** | 12% | 5% | 4% |
| Bật cả 3 phương án làm trước | 10% | **39%** | 16% | 7% | 6% |

Nhiệt luyện vẫn là công đoạn tải cao nhất, nhưng với 8 giờ/mẻ không còn là nút cổ chai nặng như bản 15 giờ (52% / 73%).

- **Tồn BTP dư cuối kỳ (chỉ bắt buộc): 82**, do cỡ lượt lệch nhau (16/24/20/25/20).

### Kiểm tay: O001 có kịp hạn không (ước lượng lạc quan, chưa phải lịch)

O001 cần 40 vành sơn bạc (tồn 4) → 2 lượt sơn → 3 lượt gia công (tồn 6) → dùng giá đã nhiệt luyện sẵn 24 + 2 mẻ lò mới → 3 lượt đúc.

| Mốc | Phút | Giờ |
|---|---|---|
| Gia công lượt 1 từ giá đã nhiệt luyện sẵn (CNC_1) | 0–158 | |
| Sơn lượt 1 → sấy xong | 168–218 → 338 | |
| **QC L001 xong** | ≈ 383 | 06:23 ngày 1 |
| Đúc 3 lượt F (2 máy, lắp khuôn 60') | 60–208 | |
| Mẻ lò 1 / 2 ra lò (HT_1 / HT_2 song song) | ≈ 634 / 708 | 10:34 / 11:48 ngày 1 |
| Gia công 2 lượt trên CNC_1 (chờ hết nghỉ trưa) → sơn lượt 2 → sấy xong | 750–1046 → 1056–1096 → 1216 | |
| **QC L002 xong → giao O001** | ≈ 1251 | **20:51 ngày 1** (hạn 16:00 ngày 2, dư ≈ 19 giờ) |

Bỏ qua tranh chấp máy với đơn khác — chỉ cho thấy hạn không bất khả thi; lịch thật do engine xếp.

## Từ điển trường

**Tầng 1 (`raw_input.json`)**

| Trường | Ý nghĩa |
|---|---|
| `horizon`, `origin`, `time_unit` | 3 ngày = 4320 phút, gốc 2026-09-28 00:00 (+07) |
| `stages` | 5 công đoạn theo thứ tự tuyến |
| `run_size` | Lượng mỗi lượt theo công đoạn |
| `transfer_minutes.{stage}` | Độ trễ từ lúc lượt ở công đoạn đó xong đến khi hàng dùng được ở công đoạn sau |
| `checkpoints` | Thời điểm đo tồn thành phẩm (cuối mỗi ngày) |
| `machine_initial_state` | Trạng thái mọi máy lúc t=0 (`INITIAL`) |
| `shift_template` | 3 ca/ngày, áp cho mọi máy có lịch ca |
| `products.{p}` | `route` (mã BTP ở 4 công đoạn trước QC), `initial_stock`, `safety_stock`, `stock_cap` |
| `btp.{code}` | `initial_stock`, `capacity` (tuỳ chọn) |
| `machines.{m}` | `stage`, `calendar` (`continuous` = 24/7; mặc định theo ca), `minutes_per_unit`, `fixed_minutes`, `mold_change_minutes` (máy đúc: thay khuôn), `downtime` (tuỳ chọn), `setup` (ma trận có hướng) |
| `molds.{id}` | Khuôn theo mã đúc: `item`, `cavities`, `limit_cycles`, `initial_cycles`, `maintenance_minutes`, `after_maintenance` |
| `orders[]` | `id`, `product`, `quantity`, `due`, `priority`, `release`, `initial_allocated` |
| `long_term_orders[]`, `reserve_policy` | Căn cứ và chính sách làm trước |
| `weights`, `objective_tiers` | Trọng số từng thành phần mục tiêu; danh sách thành phần tầng 1 và hệ số `scale` (xem mục Hàm mục tiêu) |

**Tầng 2 thêm:** `orders[].lot_allocations`, `runs[]` (`id`, `stage`, `item`, `reserve_option`), `reserve_options.{o}.pull_ahead_for`.

**Model tự suy ra (không lưu):** cửa sổ làm việc (mỗi ca × mỗi ngày, trừ nghỉ và downtime; lò: cả horizon − downtime), thời lượng lượt, chu kỳ khuôn = `ceil(lượng / lòng khuôn)`, bảo trì khi và chỉ khi vượt giới hạn, giới hạn làm trước = đơn dài hạn − dư kỹ thuật thành phẩm.

**Quy tắc khuôn:** lượt đúc mã X dùng một khuôn có `item` = X (model chọn khuôn); một khuôn chỉ trên một máy tại một thời điểm; bộ đếm chu kỳ đi theo khuôn; bảo trì khi và chỉ khi lượt kế tiếp làm vượt giới hạn. Setup của lượt đúc: sau bảo trì = hàng `CLEAN`; nếu máy lắp khuôn khác lượt trước = `max(ma trận, mold_change_minutes)` (60', kể cả hai khuôn cùng loại); còn lại = ma trận theo mã lượt trước.

## Quy ước mô hình (mọi phương pháp dùng chung)

Cài trong `models/common/stage_runs/` và kiểm bởi `evaluate.validate()` — không tin cờ khả thi do thuật toán tự báo.

| Quy ước | Chọn | Lý do |
|---|---|---|
| Lượt có chạy xuyên ca không | **Không**: cả khối (bảo trì + setup + gia công) nằm trọn trong một ca, không xuyên giờ nghỉ/downtime. Lò: một cửa sổ cả horizon | Giống engine schema 4, nên máy rảnh tính theo ca rõ ràng |
| Thời gian không tạo sản phẩm | Theo từng (máy, ca) có ít nhất một lượt: **phút khả dụng − phút gia công** (setup, bảo trì và rảnh đều là thời gian không tạo sản phẩm). **Máy `continuous` (lò) không tính** | Mỗi phút của ca đã bật đều trả nhân công; chỉ gia công tạo ra sản phẩm. Phạt máy rảnh nhắm vào ca có người; lò chạy không người trực |
| Tồn BTP | Lượt công đoạn k cộng vào kho lúc `end + transfer_minutes[k]`, lượt công đoạn sau trừ lúc bắt đầu khối; cùng phút thì cộng trước | Như A10/R12 |
| Làm trước | Các lượt cùng `reserve_option` chọn cả nhóm hoặc không. FIFO/EDD/SPT không chọn (luật điều độ thuần, giống schema 4); SA/GA chọn qua gen bật/tắt; CP-SAT/CP-LNS chọn qua biến nhị phân | Quyết định kinh tế, không phải luật điều độ |
| Tồn thành phẩm | Không âm; ≤ `stock_cap` tại mỗi checkpoint; thiếu/dư so với tồn an toàn tính tại checkpoint | Như schema 4 |
| Mục tiêu | Hai tầng theo mục 4.3.2 yêu cầu (xem mục Hàm mục tiêu) | Khác schema 4 có chủ đích: sửa các lỗi thiết kế công thức cũ |

## Hàm mục tiêu

Hai tầng, so sánh theo thứ tự (lexicographic), cài bằng `objective = scale × tầng1 + tầng2` với `scale = 1.000.000` lớn hơn mọi giá trị tầng 2 có thể có:

| Tầng | Thành phần | Trọng số | Đơn vị |
|---|---|---:|---|
| 1 — mức phục vụ | Trễ có trọng số | 15 | Σ ưu tiên đơn × phút trễ |
| 1 | Thiếu tồn an toàn | 20 | vành thiếu, cộng qua các mốc cuối ngày |
| 2 — chi phí vận hành | Thời gian không tạo sản phẩm | 3 | phút (khả dụng − gia công) trong ca máy đã bật |
| 2 | Setup | 1 | phút — chi phí đổi việc ngoài nhân công (đã tính ở dòng trên) |
| 2 | Bảo trì khuôn | 1 | phút — hao mòn khuôn |
| 2 | Makespan bắt buộc | 1 | phút — phân định khi hoà |
| 2 | Làm trước | 2 | vành được làm trước |
| 2 | Dư tồn thành phẩm | 1 | vành vượt tồn an toàn, cộng qua các mốc cuối ngày |
| 2 | Tồn BTP cuối kỳ | 1 | vành bán thành phẩm còn lại cuối horizon |

**Vì sao đổi so với công thức schema 4** (`1×makespan + 15×trễ + 3×setup + 3×(khả dụng − gia công − setup − bảo trì) + 20×thiếu tồn + 2×số phương án + 1×dư tồn`): (1) bảo trì làm *giảm* điểm và setup trong ca đã bật gần như miễn phí — nay mọi phút không tạo sản phẩm đều trả nhân công, setup/bảo trì có thêm chi phí riêng; (2) phạt làm trước theo phương án không phân biệt 16 phôi với 20 thành phẩm — nay theo vành; (3) tồn BTP cuối kỳ không có chi phí — nay có; (4) trễ và thiếu tồn an toàn cộng chung với chi phí vận hành — nay là tầng 1, đúng chính sách hai tầng của yêu cầu. Trọng số vẫn là **giả định chính sách**, chưa quy từ chi phí thật; 7 biến thể trọng số đã thử không đổi thứ hạng đầu bảng.

## Chạy các phương pháp

```powershell
python dataset/wheel-factory-small/prepare.py                      # sinh model_input.json
python -m models.run_all --input dataset/wheel-factory-small/model_input.json --seconds 30 --seeds 11 29 47
python -m models.cp_sat_hint.run --input dataset/wheel-factory-small/model_input.json --seconds 60
$env:MNFT_CP_WORKERS = 8   # tuỳ chọn: CP-SAT nhiều luồng (mặc định 1 để so sánh công bằng)
python -m unittest models.tests.test_stage_runs -v
```

`models.common.instance.load()` nhận ra `schema_version: 5` và chuyển sang engine `stage_runs`; engine schema 4 (backend dùng) không đổi.

**Quy tắc phương án làm trước:** các lượt cùng `reserve_option` chọn cả nhóm hoặc không; mỗi phương án chỉ dựa vào tồn dư của việc bắt buộc (không dựa vào phương án khác), nên chọn tổ hợp nào cũng đủ hàng.

## Ánh xạ business rule

| Mã | Thể hiện |
|---|---|
| A01 | Lô = lượt QC 20 (5 thùng), cắt từ đơn ở bước chuẩn bị |
| A02 | `initial_allocated` ở O001, O004; dư kỹ thuật thành phẩm 0; dư nằm ở tồn BTP (82) |
| A03 | `shift_template` 3 ca cho mọi máy; lò nhiệt luyện chạy liên tục |
| A04 | `machine_initial_state`; setup theo mã công đoạn, bạc↔đen chỉ tốn ở sơn |
| A05 | `molds` 1 lòng, 2 khuôn mỗi loại, mức hao mòn khác nhau; thay khuôn 60' (`mold_change_minutes`) |
| A08 | `long_term_orders` + `reserve_policy` → `reserve_options` |
| A09–A10 | `products.route`, `btp`, `transfer_minutes` theo công đoạn (sấy sơn 120'), `runs` |
| R04, R09 | `stock_cap`, `safety_stock`, `checkpoints` |
| R06 | `CNC_2.downtime` |
| R08 | O001 hạn 16:00 ngày 2, ưu tiên 4 |
| R12 | `btp.{code}.capacity` — hiện không khai |
| A07, R11 | Chưa mô hình |

## Kết quả thực nghiệm (run `20260930T094223177417Z`, công thức hai tầng)

`python -m models.run_all --input dataset/wheel-factory-small/model_input.json --seconds 30 --seeds 11 29 47` — 18/18 lần chạy hợp lệ theo validator độc lập; objective của CP khớp evaluator (tính trên chính lời giải trả về). Điểm ghi **tầng 1 · tầng 2**; so tầng 1 trước. Báo cáo: `models/runs/v2/comparison/20260930T094223177417Z/REPORT.md`.

| Phương pháp | Tốt nhất | Các seed | Ca-máy | Làm trước |
|---|---:|---|---:|---|
| **CP-LNS** | **40 · 10.564** | 40·10.564 · 40·11.686 · 40·14.902 | 11 | RB001, RL001, RL002 |
| SA | 40 · 14.397 | 40·14.397 · 40·15.970 · 40·16.023 | 13 | RB001, RL001 |
| GA | 40 · 15.843 | 40·15.843 · 40·17.321 · 40·18.465 | 14 | RB001, RL001 |
| CP-SAT + gợi ý | 120 · 11.440 | 120·11.440 · 120·12.599 · 120·12.780 | 10 | RB001 |
| Xếp tay (`manual_schedule.json`) | 160 · 6.356 | — | 7 | RB001 |
| FIFO | 160 · 17.938 | — | 15 | — |
| EDD / SPT | 200 · 17.904 | — | 15 | — |
| CP-SAT (không gợi ý) | 8.410 · 24.067 | 8.410·… · 28.325·… · 58.450·… | 19 | RB001, RL001 |

**Đọc kết quả:** SA, GA, CP-LNS tự chọn làm trước lô RL001 để bù thiếu tồn an toàn của F bạc (tầng 1: 160 → 40), nên theo chính sách hai tầng chúng xếp trên lịch tay; đổi lại tầng 2 cao hơn (bật 11–14 ca-máy so với 7). Lịch tay chưa được xếp lại theo công thức mới (chưa làm trước RL001). CP-SAT không gợi ý kém và dao động mạnh trong 30 giây/1 worker (có seed trễ đơn O002); đây là giới hạn đã biết, không phải lỗi mô hình. Chưa phương pháp CP nào chứng minh tối ưu.

**So với trước cải tiến** (lịch của run `20260930T084648619393Z` chấm lại bằng công thức mới): SA 160·12.067 → 40·14.397, GA 160·12.067 → 40·15.843, CP-LNS 160·11.994 → 40·10.564, CP-SAT + gợi ý 160·7.748 → 120·11.440; FIFO/EDD/SPT không đổi (luật thuần); CP-SAT không gợi ý 80·13.851 → 8.410·24.067 (kém đi — hệ số tầng 1 lớn làm tìm nghiệm đầu khó hơn).

## Cần quyết định / chưa đồng bộ

1. **`prepare.py` vẫn nằm trong folder dataset.** Quy tắc tính lượt là chung, nên chuyển vào `models/common/stage_runs/` nếu có thêm dataset schema 5.
2. **Tài liệu yêu cầu chưa cập nhật:** `problem_requirements.md`, `TECHNICAL_SPEC.md` vẫn mô tả đúc → CNC → sơn → QC.
3. **Giá nhiệt luyện** chỉ chứa một loại (F hoặc R); trộn F+R thì lò đầy hơn.
4. **Số ước tính cần xác nhận:** setup khuôn 60', chu kỳ phủ khuôn 48/40, nhịp băng tải sơn, sấy 120', thời gian các bước phụ gộp vào phần cố định, tồn WIP đầu kỳ.
5. **Tồn BTP dư 82** có tính vào giới hạn làm trước không.

## Lịch sử

- **Nhiệt luyện 15 giờ → 8 giờ** (2026-09-30, theo yêu cầu): tải lò bắt buộc 52% → 28%. Số lượt, lô và tồn BTP dư không đổi (chỉ đổi thời lượng).
- **8 công đoạn** (đúc → cắt → nhiệt luyện → làm sạch → CNC → kiểm → sơn → QC), chiều 2026-09-30: rút gọn còn 5 công đoạn chính theo yêu cầu. Bản 8 công đoạn: scratchpad `raw_input.8stage.json`. Khi rút gọn, bước kiểm tổ hợp phát hiện lỗi trong `prepare.py` (phương án sau dựa vào phần dư của phương án trước) — đã sửa.
- **4 công đoạn cũ** (đúc → CNC → sơn → QC): đúc/CNC nhanh hơn thực tế 3–4 lần, khuôn 4 lòng, không có nhiệt luyện, horizon 2 ngày. Bản cũ: git + scratchpad `raw_input.4stage.json`.
- **Schema 4** (lô 20/24 chạy cùng lượng qua 4 công đoạn): đã chạy end-to-end qua `models/common` (CP-SAT 4512, FIFO/EDD/SPT 7142, xếp tay 5494). Không còn áp dụng.
