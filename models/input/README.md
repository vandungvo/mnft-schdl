# Đầu vào chung: dây chuyền bánh xe trong hai tuần

File duy nhất dùng cho mọi phương pháp: [wheel_factory.json](wheel_factory.json). Sinh xác định bằng `python -m models.common.instance` với seed `20260919`; không sinh lại hoặc đổi input giữa các phương pháp trong cùng đợt so sánh.

Bản xem nhanh bằng Excel: [đơn hàng](orders.csv), [lô](lots.csv), [máy](machines.csv). Đây là bản xuất để đọc; chương trình chỉ đọc JSON, sửa CSV không làm thay đổi input solver.

## Quy mô và yếu tố gây khó

- 36 đơn, 48 lô cố định, 192 công đoạn, bốn SKU: bánh trước/sau × bạc/đen; tổng sản lượng 3.588 sản phẩm.
- 7 máy: 2 đúc chuyên dụng trước/sau, 2 CNC tốc độ/eligibility khác nhau, 2 sơn và 1 QC. Bánh sau đen chỉ gia công trên CNC_2.
- Hai tuần từ thứ Hai 21/09/2026, mười ngày làm việc; mỗi ngày tối đa hai ca 06–14h và 14–22h, mỗi ca nghỉ 30 phút. Thời gian JSON là phút lịch kể từ 00h ngày đầu, giữ cả đêm/cuối tuần.
- Đơn đến sáu đợt, bốn đơn khẩn cấp hạn 14h trong ngày đến, trọng số trễ cao hơn. Đơn thường hạn sau 1–2 ngày làm việc; không chỉnh hạn theo thuật toán.
- Đổi sơn bạc→đen và đen→bạc khác thời lượng; setup ban đầu và sau bảo trì được tính. Thời lượng gia công tăng theo lượng lô.
- Hai khuôn cố định, hai lòng/khuôn, bảo trì 45 phút trước khi lô tiếp theo làm vượt 140 chu kỳ. Trạng thái đầu kỳ đã dùng 95/115 chu kỳ, vì vậy bảo trì thực sự phát sinh.
- CNC_1 và PAINT_1 có downtime cố định trong kỳ. Không xem máy nào cũng luôn sẵn sàng.
- Tồn đầu 18 sản phẩm/SKU, 12 được phân bổ cho đơn đầu tiên của mỗi SKU; safety stock 30/SKU cuối ngày. Mỗi đơn để dư 4 sản phẩm từ lô cuối, tổng dư sản xuất 144; cuối kỳ tồn 42/SKU.

Các con số thời lượng, năng lực và số lượng là **giả định kỹ thuật tổng hợp**, chưa hiệu chỉnh từ số đo nhà máy. Độ giống thực tế nằm ở quan hệ nghiệp vụ và các đánh đổi, không phải khẳng định đây là thông số công nghiệp đã xác minh.

## Hợp đồng áp dụng giống nhau cho mọi phương pháp

1. Lô và phân bổ lô–đơn được cố định; không thuật toán nào được bớt việc hoặc sản xuất thêm. Giao đủ đơn ngay khi tất cả lô được phân bổ hoàn tất QC và đơn đã được release. Không tối ưu riêng thời điểm trì hoãn giao hàng để giữ safety stock.
2. Khuôn cố định theo máy đúc, dùng chung cho hai biến thể màu cùng hình học. Không có vận chuyển/đổi khuôn vật lý giữa máy.
3. Bảo trì đúng lúc cần, không cho phép chèn bảo trì sớm tuỳ ý để giảm idle trong mục tiêu. Toàn bộ khối **bảo trì nếu có → setup → gia công** phải liên tục trong một khoảng khả dụng giữa các giờ nghỉ/biên ca. Bảo trì cũng chờ bán thành phẩm sẵn sàng trong thí nghiệm này. Đây là hạn chế bảo thủ so với yêu cầu tổng quát, áp dụng đồng nhất cho cả CP lẫn heuristic.
4. Mở ca khi và chỉ khi có khối hoạt động trong ca. Mẫu số utilization là toàn thời gian khả dụng ca, không chỉ first-start→last-end; downtime cố định được loại trước, setup/bảo trì quyết định trong lịch không bị loại khỏi mẫu số.
5. Đơn khẩn cấp và downtime đều **đã biết tại thời điểm lập lịch**. Thí nghiệm tĩnh này chưa triển khai đóng băng lịch và tái lập lịch khi sự kiện bất ngờ xảy ra.
6. Không có WIP ban đầu, thiếu nguyên liệu, phế phẩm, thời gian vận chuyển hoặc tài nguyên nhân công giới hạn. Không mô phỏng sơn theo mẻ nhiều lô đồng thời.

## Mục tiêu chung

```text
F = makespan
  + 15 * tổng(priority_đơn * phút_trễ_giao_đủ)
  + 3 * phút_setup
  + phút_idle_trong_ca_bật
  + 20 * tổng_thiếu_safety_stock_theo_sản_phẩm_và_ngày
```

Trọng số là cấu hình minh hoạ để thử đánh đổi, **không phải giá tiền** hay chính sách đã được nhà máy phê duyệt. Makespan/trễ tính theo phút lịch, bao gồm đêm/cuối tuần. Thiếu safety stock tính theo đơn vị sản phẩm tại 14 mốc cuối ngày; không âm tồn vật lý là cứng. Cùng một file input chứa toàn bộ trọng số.

Khi thay input, chạy lại cả nhóm trong đợt mới. So sánh hash trong `result.json`; không ghép thứ hạng giữa các input/cấu hình khác nhau.
