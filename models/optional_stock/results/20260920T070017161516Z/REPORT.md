# Thử nghiệm lô dự trữ tùy chọn

Mô hình giải hai tầng: cả sáu đơn bắt buộc đều sẵn sàng đúc từ đầu horizon (`release = 0`), với hạn giao chia đều hai đơn ở cuối mỗi ca; tầng 1 khóa mức trễ và tầng 2 quyết định chọn các lô dự trữ 40 sản phẩm để giảm tổng chi phí công suất. Hai lô dự trữ đi qua toàn bộ route; một lô WIP đầu kỳ đã hoàn tất CNC_1 và sẵn sàng cấp trực tiếp cho PAINT_1. Mỗi máy có ba ca đã mở: ca 1 (06–14h), ca 2 (14–22h), ca 3 (22–06h); mỗi ca nghỉ 30 phút và có 450 phút khả dụng.

- Số đơn bắt buộc: **6**; tổng tardiness tầng 1: **0 phút**.
- Tardiness từng đơn: `{'ORDER_1': 0, 'ORDER_2': 0, 'ORDER_3': 0, 'ORDER_4': 0, 'ORDER_5': 0, 'ORDER_6': 0}`.
- Makespan bắt buộc tầng 1: **660 phút**.
- Tồn đầu/cuối khi chưa sản xuất dự trữ: **20**, bằng safety stock.
- Trần tồn: **140**, nên tối đa hoàn tất cả 3 lô dự trữ của test case.
- Chi phí đúc/CNC của lô WIP đầu kỳ đã phát sinh nên không được tính lại trong quyết định; model chỉ tính chi phí hoàn thiện và tồn kho.
- [Mở Gantt của hai kịch bản](gantt.html).

| Kịch bản | Lô dự trữ chọn | Lượng dự trữ | Idle (phút) | Utilization có ích | Tồn cuối | Tổng chi phí | Tiết kiệm so với không sản xuất thêm |
|---|---|---:|---:|---:|---:|---:|---:|
| `low_holding_cost` | STOCK_1, STOCK_2, WIP_AFTER_CNC_1 | 120 | 3505 | 29.6% | 140 | 2,331,500 | 53,500 |
| `high_holding_cost` | Không chọn | 0 | 3975 | 22.5% | 20 | 2,385,000 | 0 |

## Kết quả theo ca

| Kịch bản | Ca | Giờ | Gia công bắt buộc | Gia công dự trữ | Setup | Idle | Utilization có ích |
|---|---|---|---:|---:|---:|---:|---:|
| `low_holding_cost` | Ca 1 | 06:00–14:00 | 945 | 55 | 180 | 620 | 55.6% |
| `low_holding_cost` | Ca 2 | 14:00–22:00 | 270 | 330 | 115 | 1085 | 33.3% |
| `low_holding_cost` | Ca 3 | 22:00–06:00 | 0 | 0 | 0 | 1800 | 0.0% |
| `high_holding_cost` | Ca 1 | 06:00–14:00 | 945 | 0 | 165 | 690 | 52.5% |
| `high_holding_cost` | Ca 2 | 14:00–22:00 | 270 | 0 | 45 | 1485 | 15.0% |
| `high_holding_cost` | Ca 3 | 22:00–06:00 | 0 | 0 | 0 | 1800 | 0.0% |

## Chi tiết chi phí

| Kịch bản | Idle | Sản xuất thêm | Lưu kho | Rủi ro tồn dư | Setup tăng thêm | Tổng |
|---|---:|---:|---:|---:|---:|---:|
| `low_holding_cost` | 2,103,000 | 120,000 | 36,000 | 30,000 | 42,500 | 2,331,500 |
| `high_holding_cost` | 2,385,000 | 0 | 0 | 0 | 0 | 2,385,000 |

## Kết luận

- Khi chi phí lưu kho thấp, model chọn **120 sản phẩm** dự trữ và tiết kiệm **53,500 đồng** theo bộ trọng số minh họa.
- Khi chi phí lưu kho cao, model chọn **0 sản phẩm**; để resource rảnh rẻ hơn sản xuất tồn kho.
- Với các tham số còn lại của ví dụ, điểm hòa vốn của chi phí lưu kho là **812.5 đồng/sản phẩm**: thấp hơn mức này thì một lô còn lợi, cao hơn thì không.
- Cả hai lịch giữ nguyên tardiness tầng 1 và đều vượt qua validator độc lập của thử nghiệm.

## Giới hạn

Đây là thử nghiệm có kiểm soát để kiểm tra chính sách kinh tế, chưa phải mô hình nhà máy đầy đủ. Setup đang là thời lượng cố định theo lô/công đoạn; chưa có ma trận setup phụ thuộc thứ tự, khuôn, bảo trì, downtime hay tái lập lịch. Các chi phí là số minh họa, không phải định mức đã được nhà máy xác nhận.
