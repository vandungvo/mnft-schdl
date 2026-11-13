# Thử nghiệm lô dự trữ tùy chọn

Mô hình giải hai tầng: tầng 1 khóa mức trễ của hai đơn bắt buộc; tầng 2 quyết định chọn các lô dự trữ 40 sản phẩm để giảm tổng chi phí công suất. Bốn ca máy đều đã mở trong 480 phút.

- Tardiness tầng 1: `{'ORDER_1': 0, 'ORDER_2': 0}`.
- Makespan bắt buộc tầng 1: **310 phút**.
- Tồn đầu/cuối khi chưa sản xuất dự trữ: **20**, bằng safety stock.
- Trần tồn: **100**, nên tối đa chọn 2 trong 3 lô dự trữ.

| Kịch bản | Lô dự trữ chọn | Lượng dự trữ | Idle (phút) | Utilization có ích | Tồn cuối | Tổng chi phí | Tiết kiệm so với không sản xuất thêm |
|---|---|---:|---:|---:|---:|---:|---:|
| `low_holding_cost` | STOCK_1, STOCK_3 | 80 | 1045 | 38.3% | 100 | 826,000 | 41,000 |
| `high_holding_cost` | Không chọn | 0 | 1445 | 21.1% | 20 | 867,000 | 0 |

## Kết luận

- Khi chi phí lưu kho thấp, model chọn **80 sản phẩm** dự trữ và tiết kiệm **41,000 đồng** theo bộ trọng số minh họa.
- Khi chi phí lưu kho cao, model chọn **0 sản phẩm**; để resource rảnh rẻ hơn sản xuất tồn kho.
- Cả hai lịch giữ nguyên tardiness tầng 1 và đều vượt qua validator độc lập của thử nghiệm.

## Giới hạn

Đây là thử nghiệm có kiểm soát để kiểm tra chính sách kinh tế, chưa phải mô hình nhà máy đầy đủ. Setup đang là thời lượng cố định theo lô/công đoạn; chưa có ma trận setup phụ thuộc thứ tự, khuôn, bảo trì, downtime, ca thứ hai hay tái lập lịch. Các chi phí là số minh họa, không phải định mức đã được nhà máy xác nhận.
