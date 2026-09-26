# Thí nghiệm: dòng nguyên liệu qua tồn bán thành phẩm

Thư mục này dành cho thí nghiệm với mô hình mới, trong đó nguyên liệu của mọi công đoạn sau lấy từ **tồn bán thành phẩm (BTP)** theo mã sản phẩm và công đoạn, còn lô giữ danh tính ở lượt QC. Căn cứ:

- [problem_requirements.md](../report/problem-requirements/problem_requirements.md): A09, A10, R12, mục 4.3.3.
- [mathematical_model.md](../report/scheduling-algorithms/mathematical_model.md): ràng buộc C7b (tồn BTP), C9 (lượt đang chạy), chính sách hai tầng.

Thư mục này tách khỏi `models/`. Mã và dữ liệu trong `models/` vẫn theo mô hình cũ (chờ toàn lô, tồn kho chỉ ở thành phẩm), không dùng lẫn kết quả hai bên.

## Cấu trúc

```text
experiment/
  README.md
  check_schedule.py       kiểm một lịch với dữ liệu và tính KPI (không giải bài toán)
  plot_gantt.py           vẽ biểu đồ Gantt của một lịch (matplotlib), ra .png và .svg
  data/
    standard_case.json    ca chuẩn (dữ liệu tổng hợp)
  results/
    manual_schedule.json  lịch lập tay cho ca chuẩn (máy đọc được)
    manual_schedule.md    lịch lập tay, KPI và nhận xét (người đọc)
    gantt_manual_schedule.png / .svg   biểu đồ Gantt của lịch lập tay
```

Kiểm tra lịch: `python experiment/check_schedule.py [lịch.json] [dữ liệu.json]`. Script kiểm lượt chạy, lịch ca và downtime, không chồng máy, setup, tồn bán thành phẩm tại mọi sự kiện, khuôn và bảo trì, giao hàng, tồn thành phẩm. Tôi đã thử 8 lỗi cố ý (cắt giờ nghỉ, bỏ bảo trì, tồn âm, setup sai, chồng máy, trước release, thiếu QC, đè downtime) và script bắt được cả 8.

`standard_case.json` dùng cấu trúc riêng (`shifts`, `molds`, `inventory.btp`, `lots[].type`...), **khác** cấu trúc của `models/input/wheel_factory.json`. Hiện chưa có bộ đọc nào cho file này.

## Ca chuẩn (`standard_case.json`)

Ba ngày sản xuất, thời điểm 0 là 06:00 thứ Hai 21/09/2026, đơn vị phút, horizon 4.320. Mỗi ngày ba ca 8 giờ (S1 06–14, S2 14–22, S3 22–06), mỗi ca nghỉ 30 phút nên khả dụng 450 phút.

| Yếu tố | Trong file | Yêu cầu liên quan |
|---|---|---|
| Sản phẩm và tuyến | 2 sản phẩm (bánh trước bạc `F_SILVER`, bánh sau đen `R_BLACK`), 4 công đoạn đúc → CNC → sơn → QC | mục 3.1 |
| Lô | Mỗi lô 25 sản phẩm; 9 lô bắt buộc (L01–L09) và 4 lô tùy chọn (L10–L13) | A01 |
| Đơn và gán | 4 đơn; đơn O001 và O003 dùng tồn thành phẩm đầu kỳ; lô L09 chỉ gán 10 trong 25, dư 15 | A02 |
| Hạn giao, ưu tiên, release | O001 hạn sớm ưu tiên cao; O004 release muộn (phút 480) | R08 |
| Chọn máy | 2 máy đúc, 2 máy CNC (CNC_2 chậm hơn), 1 máy sơn, 1 máy QC | R02 |
| Thời lượng theo lượng lô | `ceil(fixed + 25 × unit)`: 32/33, 50/55, 36, 16 phút | mục 3.4 |
| Setup có hướng | Sơn bạc→đen 12, đen→bạc 24, CLEAN→màu 24; trạng thái đầu kỳ từng máy | A04, R03 |
| Khuôn và bảo trì | 2 khuôn dùng chung hai máy đúc; 7 chu kỳ/lô; `MOLD_R` bị buộc bảo trì, `MOLD_F` không | A05, R05 |
| Ca và downtime | Ca S1 bắt buộc, S2/S3 tùy chọn có chi phí mở ca; CNC_1 có 1 giờ downtime đã biết | A03, R06 |
| Tồn thành phẩm | Tồn đầu, safety stock cuối ngày, trần 150 | R07, R09 |
| **Tồn BTP đầu kỳ** | `F_SILVER` 25 sau đúc; `R_BLACK` 25 sau CNC (một lô bỏ qua công đoạn đầu) | A09 |
| **Sức chứa BTP** | Không khai báo (`null`) = không giới hạn | A09 |
| **Lượt dự trữ BTP** | Lô tùy chọn cho phép dự trữ; công suất đúc còn nhiều chỗ trống | A08, A10, mục 4.3.3 |
| Chính sách hai tầng | `two_tier: true`, giới hạn dư thành phẩm 65 và BTP 75 | mục 4.3.2 |

## Giá trị tham chiếu để kiểm tay

Trong file, khối `reference_values` chứa các con số suy ra từ dữ liệu. Tôi đã kiểm bằng script rằng chúng khớp với dữ liệu; script này chưa nằm trong repo.

- Tổng cầu: 120 bánh trước bạc, 120 bánh sau đen. Lượng lô bắt buộc: 100 và 125, dư bắt buộc 15.
- Số lượt tối thiểu theo dòng lượng: đúc 7, CNC 8, sơn 9, QC 9. Bánh sau đen cần 4 lượt đúc và 4 lượt CNC vì tồn BTP đầu kỳ thay được một lượt.
- `MOLD_R`: 50 + 4 × 7 = 78 > 60 nên **bắt buộc ít nhất một lần bảo trì**. `MOLD_F`: 30 + 3 × 7 = 51 ≤ 60, tối đa 4 lượt đúc không cần bảo trì.

## Giới hạn của ca chuẩn

- **Tải nhẹ.** Việc tối thiểu ở máy sơn khoảng 324 phút so với 1.350 phút ca bắt buộc, nên lịch khả thi dễ và dự trữ BTP rất hấp dẫn. Ca này kiểm tra mô hình có đúng, không kiểm tra hiệu năng dưới áp lực.
- **Chưa phủ:** sức chứa BTP hữu hạn, lượt đang chạy tại t = 0 (`running_at_t0` rỗng), đơn gấp, máy hỏng, kịch bản vô nghiệm, quy mô lớn. Nên làm mỗi kịch bản thành một file riêng trong `data/`.
- Thời lượng dùng số thập phân (ví dụ 1,05 phút/sản phẩm). Khi cài đặt hãy dùng số nguyên (nhân 100) hoặc `Fraction`, tránh làm tròn lên sai do dấu phẩy động.
- Toàn bộ số là giả định kỹ thuật, không phải số đo nhà máy.
