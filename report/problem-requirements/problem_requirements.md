# Yêu cầu bài toán — Đồ án CO5103

**Mục đích:** tổng hợp và làm rõ yêu cầu từ [báo cáo sơ bộ](../Report_so_bo_Do_an_CO5103_VoVanDung.md) (mục 1–4) và [đặc tả kỹ thuật](../TECHNICAL_SPEC.md) (§1–§2), làm căn cứ chung cho triển khai, kiểm thử và trình bày đề tài.

**Phiên bản rà soát:** 19/09/2026; bổ sung quản lý tồn kho bán thành phẩm ngày 21/09/2026 (A09, A10, R12); bổ sung độ trễ chuyển tiếp BTP cố định ngày 27/09/2026 (A09, R12; mục 3.2); bổ sung công thức tính số lô từ đơn hàng, tồn kho và lượng lô ngày 28/09/2026 (A01, A02, R04, R09; mục 3.3.1). Bản này bổ sung quy tắc để giải quyết những điểm chưa rõ; không còn chỉ là bản trích lại. Các mặc định ở mục 3.3 là **giả định mô hình cho đồ án**, chưa phải quy trình đã được nhà máy xác nhận. Những khác biệt với tài liệu gốc cần đồng bộ được liệt kê ở mục 9; khi có xung đột chưa xử lý, ghi nhận rõ thay vì tự chọn cách hiểu thuận lợi cho thuật toán.

**Tên đề tài:** Xây dựng tác nhân lập lịch sản xuất tạo ra lịch hợp lý, ứng dụng trong ngành sản xuất linh kiện — trường hợp nghiên cứu: sản xuất bánh xe.

---

## 1. Bối cảnh & động lực

Đề tài xét bối cảnh tham chiếu một nhà máy sản xuất linh kiện bánh xe, nơi việc lập lịch dựa trên các file Excel và kinh nghiệm người lập kế hoạch. Các vấn đề dưới đây là động lực xây dựng mô hình; do chưa có dữ liệu khảo sát nhà máy, không xem đây là kết luận đã kiểm chứng cho toàn ngành:

- **Dữ liệu phân mảnh, thiếu kiểm soát** — mỗi bộ phận (kế hoạch, kho, sản xuất) giữ 1 bản Excel riêng, không đồng bộ, thường xuyên lệch phiên bản.
- **Mang tính "hộp đen"** — ban lãnh đạo không nắm được logic lập lịch, vì nằm trong kinh nghiệm cá nhân người lập kế hoạch, chưa được hệ thống hoá.
- **Khó điều chỉnh nhanh** khi có đơn hàng gấp chen ngang, vì phải dò và sửa tay trên Excel.
- **Phụ thuộc kinh nghiệm cá nhân** — khó chuẩn hoá/mở rộng, dễ đứt gãy khi nhân sự chủ chốt nghỉ/luân chuyển.
- **Khó cân bằng đồng thời nhiều ràng buộc**: số máy giới hạn (điểm nghẽn), thời gian chuyển đổi giữa sản phẩm, máy chuyên dụng theo sản phẩm, quy mô lô tối thiểu, bảo trì khuôn định kỳ, quản lý tồn kho, và tận dụng tối đa máy đã bật (tránh lãng phí điện năng/nhân công đứng chờ).

## 2. Phát biểu bài toán (4 mục tiêu)

Thiết kế một tác nhân lập lịch sản xuất có khả năng:

1. **Tự động sinh lịch** — tìm lịch khả thi và cải thiện chất lượng trong ngân sách thời gian cho phép; chỉ gọi là tối ưu/gần tối ưu khi có chứng cứ tương ứng từ cận hoặc đối chứng.
2. **Tạo ra lịch hợp lý** — đáp ứng mọi ràng buộc cứng đã khai báo, báo cáo đầy đủ KPI và thể hiện đánh đổi theo chính sách mục tiêu được lưu cùng lần chạy. Lịch phải qua kiểm tra tự động độc lập trước khi đưa ra sử dụng; không đồng nhất tính hợp lý với chứng minh tối ưu. Diễn giải chuyên sâu ở mục 7 là phụ trợ.
3. **Phản ứng với gián đoạn** — cập nhật đơn gấp hoặc máy hỏng, giữ phần lịch đã thực hiện, lập lại phần tương lai và so sánh tác động với lịch gốc.
4. **Cải thiện hiệu suất sử dụng máy trong ca đã bật** — giảm thời gian nhàn rỗi theo chính sách đánh đổi với hạn giao và tồn kho. Giảm lãng phí nhân công/năng lượng là lợi ích kỳ vọng; chỉ định lượng tiền hoặc kWh khi có dữ liệu chi phí/công suất phù hợp.

## 3. Phạm vi

### 3.1. Trong phạm vi

- **Dữ liệu chủ**: máy và sản phẩm, thời gian xử lý theo công đoạn/sản phẩm/máy và lượng lô (cách tính tại mục 3.4), tập máy đủ điều kiện, ma trận setup (cách hiểu tại mục 3.5), giới hạn lô, kích thước lô dự trữ chuẩn, tồn kho tối đa, khuôn vật lý và khả năng tương thích, số chu kỳ tối đa giữa hai lần bảo trì và thời lượng bảo trì, lịch ca/nghỉ/downtime. Với bán thành phẩm: sức chứa tối đa (nếu có) và đơn giá lưu theo (sản phẩm, công đoạn), danh mục sản phẩm được phép dự trữ. Chi phí resource nhàn rỗi, sản xuất, lưu kho, mở ca và tăng ca là dữ liệu tham chiếu nếu có.
- **Dữ liệu giao dịch và trạng thái đầu kỳ**: đơn hàng (sản phẩm, lượng, thời điểm sẵn sàng, hạn giao, mức ưu tiên), tồn thành phẩm, tồn bán thành phẩm, công đoạn dở dang, trạng thái máy/khuôn và số chu kỳ khuôn đã sử dụng từ lần bảo trì gần nhất.
- **Lập kế hoạch sản xuất (tháng/quý)** — tổng hợp đơn hàng thành kế hoạch theo giai đoạn ngắn hơn (2 tuần), mô hình **hierarchical production planning** (Hax & Meal, 1975). Chỉ xử lý mức tổng hợp nhu cầu, không cần mô hình tối ưu riêng.
- **Lập lịch sản xuất chi tiết** horizon 2 tuần cho 1 dây chuyền đơn giản hoá (bánh trước/bánh sau), 4 công đoạn: đúc → CNC → sơn → kiểm tra chất lượng (QC). Đầu ra gồm lô, lượt chạy theo công đoạn, lượng, máy/khuôn, thời điểm bắt đầu/kết thúc, setup, bảo trì, ca bật, mức tồn bán thành phẩm theo sự kiện, thời điểm giao đơn và KPI.
- **Diễn giải quyết định** (phụ trợ, không bắt buộc) đi kèm mỗi lịch sinh ra.
- **Ràng buộc/mục tiêu hiệu suất sử dụng máy** khi đã bật (chi tiết mục 4.2 dưới).
- **Quản lý tồn kho**: bảo toàn lượng thành phẩm theo sản xuất và giao hàng; dùng tồn đầu kỳ, ngưỡng an toàn và trần tồn kho theo sản phẩm. Cho phép sản xuất dự trữ có giới hạn để tận dụng resource trong ca đã mở khi lợi ích lớn hơn chi phí phát sinh; không tối ưu tồn kho như bài toán độc lập. **Tồn kho bán thành phẩm**: mọi công đoạn sau lấy nguyên liệu từ tồn bán thành phẩm của công đoạn ngay trước, quản lý theo mã sản phẩm và công đoạn (A09–A10); cho phép dự trữ có giới hạn ở công đoạn còn công suất trống, cũng không tối ưu như bài toán độc lập.

### 3.2. Ngoài phạm vi

- Multi-tenant, quy mô lớn, real-time streaming — đây là công cụ hỗ trợ quyết định cho **1 nhà máy**, chạy theo phiên (batch), không cần kiến trúc phân tán.
- Tối ưu tồn kho hoặc mua nguyên liệu như bài toán độc lập; mặc định nguyên liệu đủ tại thời điểm lô được phép bắt đầu.
- Đa dây chuyền/đa nhà máy phối hợp (kiến trúc đa-agent) — ghi nhận là hướng phát triển, không triển khai trong đồ án này.
- Tối ưu đồng thời kích thước lô và lịch trong cùng mô hình; giao từng phần; mô hình phế phẩm/làm lại; sơn nhiều lô đồng thời trong một mẻ; tối ưu phân công nhân sự. Đây là các hướng mở rộng, không mặc nhiên được suy ra từ tên công đoạn.

### 3.3. Giả định nghiệp vụ cho phiên bản đồ án

| Mã | Quy tắc mặc định |
|---|---|
| A01 — Lô | Tạo lô trước khi lập lịch; được chia một đơn thành nhiều lô hoặc gộp nhiều đơn cùng sản phẩm, nhưng phải lưu phân bổ lượng và giữ hạn giao từng đơn. Đầu vào phân biệt **lô bắt buộc** và **lô dự trữ tùy chọn** có kích thước cố định. Solver phải xếp mọi lô bắt buộc và được quyết định chọn/không chọn từng lô tùy chọn; lô dự trữ thành phẩm đã chọn phải có lượt QC như lô bắt buộc. **Một lô là một lần sản xuất, thường 25 sản phẩm**; kích thước thực tế là tham số của lô, và lô giữ danh tính ở công đoạn QC để gán đơn và giao hàng. Công đoạn sau **không chờ toàn lô** ở công đoạn trước hoàn tất mà lấy nguyên liệu từ tồn bán thành phẩm theo A09–A10. |
| A02 — Lượng và giao hàng | Cho phép lượng dư kỹ thuật để đáp ứng lô tối thiểu và lượng dự trữ kinh tế từ các lô tùy chọn, nhưng tổng tồn không vượt trần theo sản phẩm và tổng lượng dư không vượt giới hạn của lần chạy. Mặc định giao đủ từng đơn, không giao từng phần; một đơn có thể dùng tồn đầu kỳ và nhiều lô. Đơn được gán cho lượt QC của các lô (và tồn thành phẩm đầu kỳ); thời điểm giao đủ đơn và độ trễ (R08) tính từ lúc hoàn tất QC của các lô được gán. Lượng dự trữ không được dùng hai lần hoặc gán ngược cho một đơn đã giao. |
| A03 — Gia công và ca | Mỗi ngày chia thành **3 ca**, mỗi ca có thời lượng danh nghĩa **8 giờ**; giờ bắt đầu/kết thúc và thời gian nghỉ của từng ca được khai báo trong lịch ca. Ba ca là khung lịch trong ngày, không bắt buộc mọi máy phải bật cả ba ca; ca bật được xác định theo từng máy. Thời gian khả dụng được tính sau khi trừ nghỉ và downtime theo mục 4.4. Công đoạn không ngắt giữa chừng, không chạy xuyên giờ nghỉ/downtime. Được đi qua các ca liền nhau nếu máy liên tục khả dụng và các ca đều bật. Mỗi máy xử lý một lô tại một thời điểm. |
| A04 — Setup | Setup chiếm máy, chỉ thực hiện trong thời gian khả dụng của ca bật, sau khi tồn bán thành phẩm của công đoạn trước đủ cho lượt chạy (A10) và sát trước gia công. Tính cả setup đầu tiên từ trạng thái máy đầu kỳ; A→B có thể khác B→A. Trạng thái setup được giữ qua nghỉ ca nếu không có sự kiện làm thay đổi khuôn/trạng thái máy. |
| A05 — Khuôn | Khai báo từng khuôn vật lý và tập máy/sản phẩm tương thích; một khuôn không dùng đồng thời ở hai nơi. Một lần đúc là một chu kỳ khuôn, lượng mỗi chu kỳ theo số lòng khuôn. Bảo trì trong phiên bản đồ án chiếm cả khuôn và máy đang gắn khuôn, trong ca khả dụng; trước khi chạy lại phải tính setup từ trạng thái sau bảo trì đã khai báo. |
| A06 — Thời gian và biên kỳ | Dùng một đơn vị thời gian thống nhất; quy tắc làm tròn áp dụng giống nhau cho mọi thuật toán. Tồn kho an toàn kiểm tra cuối mỗi ngày trong horizon. Việc đã cam kết phải hoàn tất trong horizon; nếu không xếp được thì báo trạng thái, không tự bỏ việc. Đơn chưa được đưa vào horizon và WIP/tồn kho chuyển kỳ phải được liệt kê riêng. |
| A07 — Sự cố | Khi máy hỏng giữa gia công, giữ phần đã làm và tiếp tục phần còn lại trên máy đó sau sửa; đây là ngoại lệ ngắt việc do sự cố. Giả định không mất sản phẩm và không mất trạng thái setup do sự cố. Nếu dữ liệu thực tế không phù hợp, phải đổi chính sách trước khi dùng mô hình. |
| A08 — Tận dụng resource | Sau khi bảo vệ khả năng giao đơn và tồn kho an toàn, được chọn lô dự trữ để lấp công suất còn trống khi chi phí resource nhàn rỗi tránh được lớn hơn chi phí setup, sản xuất, lưu kho và rủi ro tồn dư. Ưu tiên lấp ca đã mở; chỉ mở thêm ca/tăng ca cho lô dự trữ khi cấu hình cho phép và lợi ích vẫn lớn hơn toàn bộ chi phí tăng thêm. Không ép máy chạy hoặc sản xuất vượt trần chỉ để làm đẹp utilization. Công suất trống chỉ ở một số công đoạn có thể được lấp bằng lượt sản xuất dự trữ bán thành phẩm theo A09–A10. |
| A09 — Bán thành phẩm | **Bán thành phẩm (BTP)** là sản phẩm đã hoàn tất công đoạn đúc, CNC hoặc sơn. **Mọi công đoạn sau lấy nguyên liệu từ tồn BTP của công đoạn ngay trước, không lấy trực tiếp từ lượt chạy của lô trước.** Tồn BTP được quản lý theo mã sản phẩm và công đoạn vừa hoàn tất, ở mức lượng; các đơn vị cùng mã và cùng công đoạn hoán đổi được cho nhau, không theo dõi đơn vị nào do lô nào sinh ra. Công đoạn đúc lấy nguyên liệu thô, giả định đủ tại thời điểm lượt chạy bắt đầu (mục 3.2); công đoạn QC nhập thành phẩm (R07). Tồn BTP đầu kỳ là dữ liệu đầu vào riêng, không nhầm với công đoạn dở dang. Sức chứa tối đa của từng (sản phẩm, công đoạn) là dữ liệu tùy chọn; chưa khai báo thì hiểu là không giới hạn. Giả định BTP không hỏng, không phế phẩm, không hạn dùng, mỗi BTP thuộc đúng một sản phẩm cuối; BTP dùng chung cho nhiều sản phẩm cuối (ví dụ nhiều màu sơn) cần khai báo ánh xạ riêng trước khi dùng. |
| A10 — Lượt chạy | **Lượt chạy** là một lần sản xuất của một lô tại một công đoạn trên một máy (thường 25 sản phẩm). Khi hoàn tất, lượt chạy công đoạn k nhập đúng lượng của lô vào tồn BTP công đoạn k **sau một độ trễ chuyển tiếp cố định 10 phút** (thời gian bê/chuyển bán thành phẩm giữa 2 công đoạn liền kề, áp dụng cho mọi cặp đúc→CNC, CNC→sơn, sơn→QC — không phải chờ toàn lô, không mô hình tài nguyên vận chuyển tường minh); khi bắt đầu (bắt đầu setup nếu lượt có setup, nếu không thì bắt đầu gia công), lượt chạy công đoạn k+1 trừ đúng lượng đó khỏi tồn BTP công đoạn k. Lượt công đoạn k+1 chỉ bắt đầu khi tồn BTP tại thời điểm bắt đầu đủ lượng, dù lượng đó do lô nào tạo ra hoặc từ tồn đầu kỳ; không phải chờ lượt của cùng lô ở công đoạn trước. Hoàn tất cộng độ trễ chuyển tiếp được ghi nhận trước tiêu thụ nếu cùng thời điểm. Lượt QC mang danh tính lô: lô bắt buộc phải có lượt QC, lô dự trữ thành phẩm có lượt QC nếu được chọn. Các lượt ở công đoạn đúc, CNC, sơn là lượt **tùy chọn**, chỉ chạy khi cần để tồn đủ cho công đoạn sau hoặc để dự trữ. **Lượt dự trữ BTP** là lượt tùy chọn tạo tồn BTP vượt nhu cầu của các lô đã chọn; chỉ được chọn theo chính sách A08, vẫn tiêu hao chu kỳ khuôn (đúc), chịu setup và bảo trì như mọi lượt (A04–A05). Tồn BTP còn lại cuối kỳ được liệt kê riêng theo A06 và chịu chi phí lưu và rủi ro tồn dư. |

Các giả định trên là cấu hình của bài toán, không phải lựa chọn ngầm của solver. Thay đổi giả định phải cập nhật cả bộ sinh dữ liệu, baseline và bộ kiểm tra lịch.

#### 3.3.1. Cách tạo lô từ đơn hàng (bước chuẩn bị dữ liệu, trước khi lập lịch)

A01 quy định lô được tạo trước khi lập lịch và kích thước lô là tham số cố định của solver (mục 3.2 loại việc tối ưu đồng thời kích thước lô và lịch). Vì vậy số lô và lượng từng lô phải được tính ở bước chuẩn bị dữ liệu theo quy tắc dưới đây, không nhập tay tùy ý. Với mỗi sản phẩm p trong horizon:

| Ký hiệu | Ý nghĩa |
|---|---|
| D_p | Tổng số lượng các đơn hàng của sản phẩm p trong horizon |
| I_p | Tồn thành phẩm đầu kỳ của p |
| SS_p | Tồn kho an toàn cần giữ của p (R09); đặt SS_p = 0 nếu cấu hình không yêu cầu giữ tồn an toàn cuối kỳ |
| Q | Lượng chuẩn của một lô (thường 25, theo A01) |
| L_min | Lô tối thiểu về kỹ thuật (`minimum_lot`, R04) |

```
Nhu cầu ròng cần sản xuất   N_p = max(0, D_p + SS_p − I_p)
Số lô                       n_p = ⌈ N_p / Q ⌉
Lượng dư kỹ thuật           s_p = n_p · Q − N_p
```

Quy tắc đi kèm:

1. **Dùng tồn trước, sản xuất sau.** Tồn thành phẩm đầu kỳ được phân bổ cho các đơn của p theo hạn giao tăng dần (hòa thì theo độ ưu tiên); phần tồn còn lại sau khi đủ các đơn được tính vào SS_p. Lượng đó ghi vào `initial_allocated` của từng đơn, tính ra từ công thức, không khai tay.
2. **Gom đơn cùng sản phẩm.** Phần nhu cầu còn lại của các đơn cùng sản phẩm được gộp thành một pool rồi chia thành n_p lô; lô được gán cho đơn theo hạn giao tăng dần và ghi `lot_allocations` (A01, A02). Một lô có thể phục vụ nhiều đơn, một đơn có thể dùng nhiều lô.
3. **Lô chuẩn hoặc lô co giãn.** Mặc định mọi lô có lượng Q. Khi cần giảm lượng dư, cho phép chia đều N_p cho n_p lô, mỗi lô nằm trong [L_min, Q]; nếu N_p / n_p < L_min thì nâng mỗi lô lên L_min và phần chênh là lượng dư kỹ thuật (A02).
4. **Kiểm tra sau khi tính.** Tổng lượng dư Σ s_p phải không vượt giới hạn lượng dư của lần chạy và tồn dự kiến của từng sản phẩm không vượt trần (R04). Vượt giới hạn thì báo rõ và chọn: dùng lô co giãn, hoặc nâng giới hạn có ghi nhận; không được âm thầm bỏ ràng buộc.
5. **Tồn BTP không làm giảm số lô.** Mọi lô bắt buộc chạy đủ bốn công đoạn (A10), nên tồn BTP đầu kỳ chỉ là bộ đệm giữa các công đoạn và được tính vào tổng lượng dư BTP theo R12. Muốn tồn BTP thay được lượt chạy ở công đoạn trước thì cần lượt tùy chọn theo A10, thuộc hướng mở rộng A08.

Ví dụ với bộ dữ liệu nhỏ `dataset/wheel-factory-small/` (Q = 25, có tính tồn an toàn):

| Sản phẩm | D | SS | I | N | n | Dư |
|---|---|---|---|---|---|---|
| F_SILVER | 44 | 8 | 10 | 42 | 2 | 8 |
| F_BLACK | 20 | 6 | 6 | 20 | 1 | 5 |
| R_SILVER | 20 | 6 | 6 | 20 | 1 | 5 |
| R_BLACK | 24 | 6 | 8 | 22 | 1 | 3 |

Kết quả là 5 lô với tổng dư 21, lớn hơn giới hạn lượng dư 10 của bộ dữ liệu hiện tại, nên nếu áp quy tắc này phải nâng giới hạn hoặc dùng lô co giãn. Bộ dữ liệu nhỏ hiện dùng lô 20/24 đặt tay và chưa sinh từ công thức này; quy tắc chưa được cài đặt trong code.

### 3.4. Thời gian xử lý theo công đoạn, sản phẩm, máy và lượng lô

Thời gian xử lý không phải một giá trị chung cho một sản phẩm. Nó được xác định cho từng phương án **công đoạn–sản phẩm–máy** vì cùng một sản phẩm có thể cần thời gian khác nhau ở đúc, CNC, sơn và QC; đồng thời hai máy cùng công đoạn có thể có tốc độ khác nhau. Với lô `l`, ký hiệu:

- `s`: công đoạn;
- `p`: sản phẩm;
- `m`: máy được chọn, thuộc công đoạn `s` và đủ điều kiện xử lý `p`;
- `q[l]`: số sản phẩm trong lô, đã được chốt trước khi lập lịch;
- `fixed[s,p,m]`: số phút cố định phát sinh một lần khi gia công lô trên phương án này;
- `unit_time[s,p,m]`: số phút gia công cho một sản phẩm.

Thời lượng gia công dùng trong lịch là:

```text
processing_time[l,s,m]
    = ceil(fixed[s,p,m] + q[l] * unit_time[s,p,m])
```

Kết quả được làm tròn lên theo đơn vị thời gian của lần chạy; phiên bản dữ liệu hiện tại dùng phút. Nếu dữ liệu gốc được khai báo theo năng suất `r` sản phẩm/giờ thì đổi sang `phút/sản phẩm` bằng `unit_time = 60 / r` trước khi tính. Bộ tham số thời gian thực sự dùng phải được lưu trong snapshot đầu vào của lần chạy để có thể tái lập kết quả.

Ví dụ, lô 84 bánh trước bạc trong bộ dữ liệu tổng hợp hiện tại (kích thước lô thực tế thường là 25 theo A01; bộ dữ liệu tổng hợp chưa đồng bộ) có thời gian cố định 8 phút ở CNC. Trên `CNC_1`, `unit_time = 1,65` phút/sản phẩm nên thời lượng là `ceil(8 + 84 × 1,65) = 147` phút. Trên `CNC_2`, `unit_time = 1,85` nên thời lượng là 164 phút. Cả hai máy có thể đủ điều kiện, nhưng lựa chọn máy làm thay đổi thời lượng và vì vậy ảnh hưởng đến lịch.

`fixed` trong công thức là phần cố định của **gia công một lô**, ví dụ thời gian nạp/tháo gắn với mọi lô. Nó vẫn phát sinh khi hai lô liên tiếp cùng sản phẩm. Các khoảng dưới đây được lưu và tính riêng, không cộng vào `processing_time`:

- **setup/changeover** do trạng thái hoặc sản phẩm trước đó quyết định;
- **bảo trì**, giờ nghỉ và downtime;
- **thời gian chờ** bán thành phẩm, máy hoặc khuôn;
- **độ trễ chuyển tiếp BTP** giữa 2 công đoạn liền kề: cố định 10 phút, cộng vào thời điểm bán thành phẩm được tính là "đã nhập" tồn (xem A09, R12, mục 3.2) — đã vào phạm vi từ 27/09/2026;
- tài nguyên vận chuyển tường minh (AGV, xe nâng có định tuyến/tranh chấp), phế phẩm và làm lại, vì các nội dung này ngoài phạm vi hiện tại.

Một phương án chỉ hợp lệ khi máy thuộc đúng công đoạn, máy–sản phẩm nằm trong tập đủ điều kiện và có đủ tham số thời gian. Thiếu bản ghi thời gian là lỗi dữ liệu, không được hiểu là thời lượng bằng 0. Do lượng của từng lô bắt buộc và lô dự trữ tùy chọn đều được chốt trước theo A01, `processing_time[l,s,m]` là hằng số sau khi chọn máy; biến quyết định về việc chạy chỉ là chọn hay không chọn lô tùy chọn (lượt QC của nó) và các lượt tùy chọn ở công đoạn đúc, CNC, sơn theo A10; thời lượng của mọi lượt vẫn là hằng số sau khi chọn máy. Nếu sau này cho solver tự quyết định cả kích thước lô, quan hệ giữa lượng và thời lượng phải được đưa thành biến/ràng buộc; đó là phần mở rộng đang được loại khỏi phạm vi ở mục 3.2.

Riêng ở công đoạn đúc, số chu kỳ khuôn để kiểm tra bảo trì vẫn tính bằng `ceil(q[l] / cavities)`, theo A05. Đại lượng này không thay thế thời lượng gia công ở trên. Nếu dữ liệu nhà máy chỉ cung cấp thời gian theo chu kỳ đúc, phải khai báo mô hình thời lượng theo chu kỳ và đồng bộ bộ sinh dữ liệu, mọi thuật toán cùng validator trước khi sử dụng; không được âm thầm trộn hai cách tính.

### 3.5. Ma trận setup

**Setup** là khoảng thời gian chuẩn bị máy để chuyển từ trạng thái đang có sang sản xuất sản phẩm kế tiếp, chẳng hạn thay dụng cụ/khuôn, vệ sinh hoặc chỉnh thông số. **Ma trận setup** là bảng tra thời lượng chuyển đổi này. Với từng máy `m`:

- hàng `a` là sản phẩm hoặc trạng thái máy ngay trước đó;
- cột `b` là sản phẩm sắp được gia công;
- ô `setup[m,a,b]` là số phút máy bị chiếm để chuyển từ `a` sang `b`.

Ví dụ minh hoạ cho một máy sơn:

| Trạng thái trước / Sản phẩm kế tiếp | Bạc | Đen |
|---|---:|---:|
| `CLEAN` | 24 | 24 |
| Bạc | 0 | 12 |
| Đen | 24 | 0 |

Ma trận **có hướng**: thời gian bạc → đen có thể khác đen → bạc, nên không được tự giả định `setup[m,a,b] = setup[m,b,a]`. Đường chéo thường bằng 0 khi chạy liên tiếp cùng loại sản phẩm, nhưng vẫn phải khai báo hoặc được quy tắc dữ liệu xác định rõ; không mặc định bằng 0 nếu nghiệp vụ yêu cầu vệ sinh giữa hai lô cùng loại.

Với chuỗi lô được xếp trên máy `m`, setup ngay trước lô `j` được tính bằng:

```text
setup_before[j] = setup[m, previous_state[m], product[j]]
```

`previous_state[m]` là sản phẩm của lô liền trước trên chính máy đó. Với lô đầu tiên trong horizon, nó là trạng thái máy đầu kỳ đã khai báo; sau bảo trì, nó là trạng thái sau bảo trì, ví dụ `CLEAN`, theo A04–A05. Nghỉ giữa ca hoặc downtime không tự làm mất trạng thái setup, trừ khi dữ liệu sự kiện khai báo việc đó.

Setup chiếm máy và phải nằm trong khoảng máy khả dụng, kết thúc sát trước gia công theo A04. Nó không được cộng vào `processing_time` tại mục 3.4 và phải được báo riêng trong KPI. Nếu setup kéo dài 12 phút và gia công kéo dài 147 phút thì máy bị chiếm tổng cộng 159 phút cho hai hoạt động này, chưa tính bảo trì; lịch vẫn lưu hai thành phần riêng để validator và báo cáo kiểm tra được.

Ma trận có thể khác nhau theo máy vì thiết bị hoặc quy trình vệ sinh khác nhau. Nếu nhiều máy dùng chung một ma trận theo công đoạn, hệ thống có thể lưu một mẫu dùng chung, nhưng trước khi giải phải xác định được duy nhất giá trị `setup[m,a,b]` cho mọi cặp chuyển đổi hợp lệ. Thiếu ô cần dùng là lỗi dữ liệu, không được hiểu là setup bằng 0.

## 4. Mô hình hoá bài toán

### 4.1. Phân loại

Sử dụng khung **Flexible Job-Shop Scheduling Problem (FJSP)** để biểu diễn lựa chọn máy cho từng công đoạn. Với giả định mọi lô cùng tuyến đúc → CNC → sơn → QC và máy phân nhóm theo công đoạn, trường hợp nghiên cứu có cấu trúc **hybrid/flexible flow shop với giới hạn máy đủ điều kiện**. Vì mọi công đoạn sau lấy nguyên liệu từ tồn BTP (A09), đây là flow shop có kho đệm giữa các công đoạn, và các lượt chạy của cùng một lô không bị ràng buộc thứ tự trực tiếp với nhau. Riêng điều kiện “chỉ một tập con máy được xử lý sản phẩm” không đủ để phân biệt hai lớp bài toán. Xem [khảo sát phương pháp, mục 3](../scheduling-algorithms/scheduling_methods_and_recommendation.md) và các nguồn phân loại tại đó.

### 4.2. Ràng buộc nghiệp vụ

**Cứng:** mọi lịch được đưa ra sử dụng phải tuân thủ. **Mềm:** cho phép thiếu mục tiêu nhưng phải tính phạt và báo mức thiếu; không được bỏ qua âm thầm.

| Mã | Yêu cầu | Loại | Quy tắc kiểm tra |
|---|---|---|---|
| R01 | Đủ việc, đúng trình tự và thời lượng | Cứng | Mỗi lô bắt buộc phải có lượt QC; mỗi lô tùy chọn hoặc không được chọn và không có lượt QC, hoặc được chọn và có lượt QC. Mọi lượt đã xếp tuân thủ thời điểm sẵn sàng của lô, thời lượng tại mục 3.4 và điều kiện tồn BTP của công đoạn ngay trước (R12); trình tự đúc → CNC → sơn → QC được bảo đảm qua dòng lượng, không qua việc chờ toàn lô. |
| R02 | Tài nguyên và tính tương thích | Cứng | Không chồng khoảng chiếm cùng máy/khuôn; chỉ chọn máy/khuôn đủ điều kiện. Kiểm tra cả sản xuất, setup và bảo trì. |
| R03 | Chuyển đổi sản phẩm | Cứng | Đủ setup theo cặp liền kề và trạng thái ban đầu/sau bảo trì, theo mục 3.5 và A04–A05. |
| R04 | Giới hạn lô và lượng dư | Cứng với ngưỡng kỹ thuật | Lượng từng lô đạt ngưỡng kỹ thuật, lô tùy chọn dùng kích thước chuẩn đã khai báo, tồn theo sản phẩm không vượt trần và tổng lượng dư không vượt giới hạn lần chạy theo A02. Ngưỡng chỉ mang tính kinh tế phải ghi riêng là khuyến nghị, không dùng thay ngưỡng kỹ thuật. |
| R05 | Bảo trì khuôn | Cứng | Tính mức sử dụng đầu kỳ và chu kỳ phát sinh; không vượt ngưỡng trước khi bảo trì đủ thời lượng. Hoàn tất bảo trì thì đặt lại bộ đếm. Lô vượt ngưỡng toàn chu kỳ phải chia lại trước khi lập lịch. |
| R06 | Lịch khả dụng và ca bật | Cứng | Chỉ sản xuất/setup/bảo trì trong ca bật và không chồng nghỉ/downtime; khi sự cố xảy ra, chỉ phần gia công trước/sau downtime được tính là hoạt động theo A07. |
| R07 | Bảo toàn lượng và tồn vật lý | Cứng | Tồn = tồn đầu kỳ + lượng hoàn tất QC của mọi lô đã chọn − lượng giao thực tế; không âm và không vượt sức chứa/trần tồn đã khai báo tại mọi sự kiện. QC hoàn tất được ghi nhận trước giao hàng nếu cùng thời điểm. Không dùng cùng lượng hàng cho hai đơn. |
| R08 | Hạn giao | Mềm mặc định | Phạt độ trễ thời điểm giao đủ đơn. Chỉ thêm deadline cứng nếu dữ liệu đơn khai báo rõ cam kết bắt buộc. |
| R09 | Tồn kho an toàn | Mềm | Thiếu hụt tại cuối ngày = max(0, ngưỡng an toàn − tồn thực tế); tính phạt và báo cáo. Không nhầm thiếu safety stock với tồn vật lý âm. |
| R10 | Hiệu suất sử dụng máy | Mềm | Giảm chi phí resource nhàn rỗi theo toàn bộ ca bật và cho phép chọn lô dự trữ theo A08; báo idle/utilization theo mục 4.4. Không ép đạt tỷ lệ cứng hoặc sản xuất vượt trần chỉ để tăng utilization. |
| R11 | Bảo toàn phần lịch thực hiện | Cứng | Không sửa lịch quá khứ; cập nhật việc đang chạy và tài nguyên theo trạng thái thực tại thời điểm sự kiện, theo mục 4.5. |
| R12 | Tồn kho bán thành phẩm | Cứng | Với mỗi (sản phẩm, công đoạn k = đúc, CNC, sơn): tồn = tồn đầu kỳ + lượng các lượt công đoạn k đã hoàn tất **và đã qua độ trễ chuyển tiếp cố định (10 phút)** − lượng các lượt công đoạn k+1 đã bắt đầu; không âm và không vượt sức chứa (nếu có khai báo) tại mọi sự kiện; hoàn tất cộng độ trễ chuyển tiếp được ghi nhận trước tiêu thụ nếu cùng thời điểm. Không dùng cùng một đơn vị BTP cho hai lượt; lượt tùy chọn đã chọn phải hoàn tất trong horizon; tổng lượng BTP dự trữ không vượt giới hạn cấu hình của lần chạy. |

Lượng chưa giao được theo dõi riêng với tồn kho; không trừ nhu cầu đúng hạn khỏi tồn vật lý khi thực tế chưa giao. Việc gộp/hoãn lô có thể gây trễ và phải chịu phạt R08; không được vi phạm deadline cứng để tăng hiệu suất. Lô dự trữ là công việc tùy chọn, không được dùng để che việc bỏ sót lô bắt buộc. Tương tự, tồn BTP và lượt dự trữ BTP không được dùng để che việc bỏ sót lô bắt buộc; mọi lượt của lô bắt buộc phải có nguồn tồn theo R12.

### 4.3. Hàm mục tiêu

Đa mục tiêu có trọng số — tối thiểu hoá tổng có trọng số của:

- **Makespan bắt buộc**: khoảng thời gian từ đầu horizon đến lúc công đoạn cuối cùng của lô bắt buộc hoàn thành sau cùng; cách tính chi tiết tại mục 4.3.1.
- **Độ trễ giao hàng**: tổng có trọng số ưu tiên của `max(0, thời điểm giao đủ đơn − hạn giao)`.
- **Thời gian hoặc chi phí chuyển đổi** giữa các loại sản phẩm; dùng một cách biểu diễn nhất quán để không phạt trùng cùng một setup
- **Chi phí resource nhàn rỗi trong ca đã bật**; nếu chưa có đơn giá tin cậy thì dùng thời gian idle với trọng số đã hiệu chỉnh
- **Mức thiếu hụt** so với ngưỡng tồn kho an toàn
- **Chi phí của lô dự trữ đã chọn** (thành phẩm và bán thành phẩm): sản xuất, lưu kho theo lượng và thời gian, và rủi ro tồn dư
- **Chi phí mở ca/tăng ca** nếu đây là biến quyết định và có dữ liệu tương ứng

#### 4.3.1. Cách tính makespan

Mỗi lô bắt buộc phải có lượt QC, còn nguyên liệu của các công đoạn trước đi qua tồn BTP (A09–A10). Gọi `completion[l]` là thời điểm kết thúc lượt QC của lô `l`, `required_lots` là tập lô mà lần chạy đã cam kết phải hoàn tất và `horizon_start` là mốc bắt đầu kỳ lập lịch. Khi đó:

```text
makespan = max(completion[l] for l in required_lots) - horizon_start
```

Nếu trục thời gian của dữ liệu đã lấy đầu horizon làm phút 0 thì công thức rút gọn thành `max(completion[l])`. “Lô bắt buộc” gồm các lô được đưa vào lần chạy để đáp ứng đơn hàng/kế hoạch và phần WIP đã cam kết phải hoàn tất. Đơn nằm ngoài horizon, việc chưa được đưa vào lần chạy và phần quá khứ đã hoàn thành không tham gia phép lấy `max`.

Makespan là **độ dài lịch sản xuất theo thời gian lịch**, không phải tổng số phút gia công của mọi lô. Setup, bảo trì, chờ máy, nghỉ ca, downtime, ban đêm hoặc cuối tuần không được cộng riêng vào công thức, nhưng chúng có thể đẩy thời điểm hoàn thành cuối cùng ra xa hơn nên vẫn làm makespan tăng. Makespan cũng không phải thời gian máy tính chạy solver.

Ví dụ, horizon bắt đầu lúc 06:00 thứ Hai và ba lô bắt buộc có thời điểm hoàn tất QC như sau:

| Lô | Hoàn tất QC | Thời gian từ đầu horizon |
|---|---|---:|
| `L01` | 10:00 thứ Ba | 28 giờ |
| `L02` | 14:00 thứ Ba | 32 giờ |
| `L03` | 15:00 thứ Tư | 57 giờ |

Khi đó `makespan = max(28, 32, 57) = 57 giờ`, tương đương 3.420 phút. Không cộng thành `28 + 32 + 57`, vì các lô có thể chạy song song trên những máy khác nhau.

**Thời điểm giao hàng là chỉ số khác.** Mỗi đơn có thời điểm giao đủ riêng, được xác định khi đã có đủ lượng hàng được phân bổ cho đơn đó và theo chính sách giao hàng. Chẳng hạn đơn `O01` cần cả `L01` và `L02` thì sớm nhất giao đủ lúc 14:00 thứ Ba, tức giờ thứ 32, trong khi makespan của toàn lịch vẫn là 57 giờ vì `L03` còn phải hoàn thành. Nếu mọi lô đều gắn với đơn chờ giao và chính sách giao ngay khi đủ hàng thì thời điểm giao cuối cùng có thể trùng với điểm kết thúc makespan. Hai giá trị vẫn phải lưu riêng vì chúng có thể khác khi dùng tồn đầu kỳ, có lượng sản xuất dư/tái lập tồn kho hoặc có quy tắc về thời điểm xuất hàng.

Khi có lô dự trữ tùy chọn, KPI trên được xuất rõ là `mandatory_makespan` và chỉ lấy `max` trên lô bắt buộc để đo mức phục vụ nhu cầu đã cam kết. Hệ thống đồng thời báo `schedule_end = max(completion[l])` trên mọi lô thực sự được xếp, kể cả lô tùy chọn, để không che phần lịch kéo dài do sản xuất dự trữ.

#### 4.3.2. Sản xuất dự trữ để tận dụng resource còn trống

Chỉ giảm idle không làm solver tự tạo thêm việc. Trước khi giải, hệ thống phải sinh một tập hữu hạn lô dự trữ tùy chọn cho các sản phẩm được phép dự trữ; mỗi lô đã có lượng cố định, thời điểm sẵn sàng và lượt QC. Hệ thống cũng sinh tập hữu hạn lượt tùy chọn (kích thước chuẩn) ở công đoạn đúc, CNC, sơn cho các sản phẩm được phép dự trữ, đủ để bao phủ nhu cầu tồn BTP và dự trữ (A10). Solver dùng biến chọn nhị phân cho từng lô và từng lượt tùy chọn. Lô hoặc lượt không được chọn không chiếm tài nguyên và không cộng vào tồn kho; lô và lượt đã chọn phải tuân thủ toàn bộ R01–R07 và R12.

Chi phí kinh tế của phần công suất còn trống được tính theo cấu trúc:

```text
economic_capacity_cost
    = idle_cost_in_open_shifts
    + optional_lot_production_cost
    + inventory_holding_and_surplus_risk_cost
    + incremental_setup_cost
    + shift_opening_and_overtime_cost
```

Một lô dự trữ chỉ có lợi khi chi phí idle tránh được lớn hơn toàn bộ chi phí tăng thêm do lô đó gây ra. Chi phí mở ca chỉ phát sinh khi phải bật ca chưa mở; không được coi việc mở thêm ca là “giảm idle”. Nếu chi phí nhân công của ca đã nằm trọn trong chi phí mở ca thì phải xác định rõ phần nào là chi phí nhàn rỗi/cơ hội để tránh tính hai lần cùng một khoản.

Ví dụ minh họa, một ca đã mở còn 120 phút trống, tương ứng chi phí resource nhàn rỗi 120.000 đồng. Một lô dự trữ có tổng chi phí sản xuất, setup và lưu kho 65.000 đồng và đi trọn tuyến trong phần công suất phù hợp thì chọn lô giúp giảm chi phí ròng 55.000 đồng. Nếu lô đó buộc phải mở thêm ca với chi phí 200.000 đồng, tổng chi phí tăng thêm thành 265.000 đồng và không nên chọn. Các con số này chỉ minh họa quy tắc quyết định, không phải định mức của nhà máy.

Chính sách mặc định dùng hai tầng ưu tiên:

1. Xếp lô bắt buộc; cho phép chọn các lô dự trữ cần thiết để giảm thiếu safety stock; tối ưu mức phục vụ gồm deadline cứng, độ trễ và thiếu safety stock. Tầng này không chọn thêm hàng vượt safety stock chỉ nhằm lấp idle.
2. Cho phép chọn thêm lô dự trữ để tận dụng resource và tối ưu `economic_capacity_cost`, với điều kiện không làm tăng độ trễ của bất kỳ đơn bắt buộc nào và không làm tăng thiếu safety stock so với kết quả tầng 1. Có thể xếp lại lô bắt buộc nếu các mức phục vụ này không xấu đi.

Cấu hình mỗi lần chạy phải khai báo sản phẩm được phép dự trữ, kích thước/số lô tùy chọn, trần tồn từng sản phẩm, giới hạn tổng lượng dư, chi phí lưu kho theo lượng và thời gian, chi phí sản xuất tăng thêm, chi phí idle theo máy–ca và chính sách cho phép mở thêm ca/tăng ca. Khi chưa có số tiền đã xác nhận, dùng trọng số chuẩn hóa và phân tích độ nhạy; kết quả chỉ thể hiện chính sách đánh đổi, không được báo là số tiền tiết kiệm thực tế.

Trọng số và thang đo được khai báo trong cấu hình, lưu cùng mỗi lần chạy và giữ giống nhau giữa các thuật toán đối chứng. Đánh giá độ nhạy trên tập hiệu chỉnh trước khi khoá cấu hình cho tập kiểm thử. Ngoài chính sách hai tầng dành cho lô dự trữ ở mục 4.3.2, chưa mặc định ưu tiên tuyệt đối giữa các mục tiêu mềm trong cùng một tầng; nếu cần ưu tiên tuyệt đối khác thì phải khai báo chính sách riêng. Luôn báo từng KPI ngoài điểm tổng, vì điểm tổng tốt hơn có thể đi kèm một KPI xấu hơn.

#### 4.3.3. Bán thành phẩm dự trữ

Lô dự trữ thành phẩm (mục 4.3.2) cần sản xuất xuyên cả bốn công đoạn nên chỉ lấp được công suất trống khi cả tuyến còn trống. Thực tế công suất trống thường chỉ xuất hiện ở một số công đoạn, ví dụ đúc còn trống trong ca đã mở trong khi CNC đã kín. Lượt dự trữ BTP (A09–A10) cho phép dùng đúng công đoạn còn trống và nhập kết quả vào tồn BTP; các lượt công đoạn sau lấy từ tồn đó nên không phải chờ hoặc chạy lại công đoạn trước. Nhờ vậy khối lượng công việc dịch sang thời điểm rảnh, giảm tải và giảm trễ ở giai đoạn cao điểm.

Lợi ích kinh tế của một lượt dự trữ BTP gồm chi phí idle tránh được ở công đoạn nó chiếm và, nếu có lượt công đoạn sau dùng tồn đó, phần giảm độ trễ hoặc tải về sau. Phần thứ hai đã thể hiện qua số hạng độ trễ và makespan trong mục tiêu, không tính riêng để tránh tính hai lần. Chi phí phát sinh gồm sản xuất, setup tăng thêm, chu kỳ khuôn tiêu hao (có thể kéo bảo trì đến sớm hơn), lưu kho BTP theo thời gian và rủi ro tồn dư cuối kỳ. Cấu trúc `economic_capacity_cost` ở mục 4.3.2 được dùng nguyên; `inventory_holding_and_surplus_risk_cost` tính cả thành phẩm và BTP.

Chính sách hai tầng ở mục 4.3.2 áp dụng thêm: tầng 1 được dùng tồn BTP đầu kỳ; lượt dự trữ BTP mới chỉ được chọn ở tầng 2, với điều kiện không làm tăng độ trễ và thiếu safety stock so với tầng 1. Các lượt công đoạn sau lấy từ tồn này vẫn được phép giảm độ trễ hơn nữa.

Ví dụ minh họa (số giả định, không phải định mức nhà máy): ca thứ Hai đã mở còn 180 phút đúc trống, CNC đã kín. Một lượt dự trữ BTP sau đúc cần 100 phút đúc và 10 phút setup, tổng chi phí sản xuất, setup và lưu là 55.000 đồng, tránh được chi phí idle 90.000 đồng: nên chọn. Nếu lượt đó làm khuôn chạm ngưỡng và phải bảo trì sớm, tăng thêm 70.000 đồng thì tổng chi phí 125.000 đồng vượt 90.000 đồng: không chọn.

### 4.4. Định nghĩa hiệu suất theo ca

- **Thời gian khả dụng của ca** = thời lượng ca trừ nghỉ cố định và downtime đã biết trong đầu vào của lần chạy. Không tự loại thời gian setup hoặc bảo trì do thuật toán xếp khỏi mẫu số.
- **Hiệu suất sản xuất** = tổng thời gian gia công thực tế / tổng thời gian khả dụng của các ca đã bật. Báo theo từng máy–ca và toàn hệ thống; chỉ số toàn hệ dùng tổng thời gian, không lấy trung bình không trọng số các tỷ lệ.
- **Idle trong ca bật** = thời gian khả dụng − thời gian gia công − thời gian setup − thời gian bảo trì chiếm máy; tính cả khoảng rảnh đầu/cuối ca. Công đoạn qua ca được phân bổ theo phần thời gian nằm trong từng ca.
- Thời gian gia công của lô bắt buộc và lô dự trữ đều làm giảm idle, nhưng phải báo tách hai phần để thấy utilization tăng nhờ nhu cầu bắt buộc hay nhờ sản xuất dự trữ; phần dự trữ báo tiếp thành thành phẩm dự trữ và BTP dự trữ. Thời gian của ca không mở không được tính là idle tránh được.
- Báo riêng gia công bắt buộc, gia công dự trữ, setup, bảo trì, idle và số ca mở. Không có ca khả dụng được bật thì tỷ lệ là **N/A**, không phải 100%.
- Mức 90% là tham chiếu đánh giá trên kịch bản đủ tải, không phải ràng buộc cứng. Ca khả dụng 8 giờ chỉ chạy 2 giờ liên tục có hiệu suất 25%, dù không có khoảng trống giữa các việc.

### 4.5. Tái lập lịch và trạng thái đầu ra

Khi có đơn gấp hoặc máy hỏng, chụp trạng thái tại thời điểm sự kiện: việc đã xong/đang chạy, lượng đã giao, tồn kho/WIP, máy/khuôn và mức sử dụng khuôn. Giữ phần đã làm; công đoạn đang chạy trên máy không hỏng giữ máy và phần thời lượng còn lại. Máy hỏng giữa công đoạn xử lý theo A07. Lô dự trữ đã bắt đầu trở thành WIP cam kết và phải được bảo toàn như lô bắt buộc; lô dự trữ chưa bắt đầu được phép bỏ hoặc chọn lại. Tồn BTP thực tế tại thời điểm sự kiện là một phần của trạng thái chụp; lượt chưa bắt đầu được phép xếp lại hoặc chờ tồn nếu tồn BTP không còn đủ; lượt đang chạy đã trừ tồn tại thời điểm bắt đầu của nó. Việc tương lai được phép xếp lại; chỉ giữ cam kết tương lai cố định khi đầu vào khai báo và vẫn khả thi sau sự cố. Cam kết bị sự cố làm bất khả thi phải báo rõ, không tự bỏ.

Kết quả so sánh gồm thay đổi thời gian bắt đầu, máy được chọn, độ trễ từng đơn, ca mở và hiệu suất. Lịch cũ chỉ là phương án dự phòng nếu vẫn qua kiểm tra với dữ liệu mới.

Mỗi lần chạy phải trả trạng thái: có nghiệm tối ưu; có nghiệm khả thi chưa chứng minh tối ưu; đã chứng minh không khả thi; chưa tìm được nghiệm trong ngân sách; hoặc mô hình/dữ liệu không hợp lệ. Không đồng nhất hết thời gian với vô nghiệm. Chỉ xuất lịch để sử dụng khi có nghiệm và lịch vượt qua bộ kiểm tra độc lập.

## 5. Nguồn dữ liệu

Không tiếp cận được dữ liệu thật của nhà máy → dùng dữ liệu tổng hợp theo 3 nguồn tham chiếu:

1. **Ràng buộc nghiệp vụ thực tế** (hiểu biết về quy trình sản xuất bánh xe) — tham số hoá bộ sinh dữ liệu tổng hợp. Thời gian tác vụ + năng lượng theo máy đối chiếu với dữ liệu thực đo (Mota et al., 2020 — tài liệu #11, `dataset/mota-production-line-energy/`).
2. **Bộ dữ liệu chuẩn công khai** (Taillard, Lawrence trong OR-Library) — kiểm chứng lõi thuật toán (`dataset/taillard-ta01-ta80/`, `dataset/or-library-raw/`).
3. **Bộ benchmark FJSP có setup phụ thuộc trình tự theo họ sản phẩm** (Deliktaş et al., 2024 — tài liệu #10, `dataset/deliktas-fjsp-cellular/`) — bổ sung cho (2) vì Taillard/Lawrence không có ràng buộc changeover.

Theo [rà soát tài liệu](../literature-review/lit_review_draft.md), đã tìm thêm trên data.gov/data.gov.vn/Kaggle nhưng chưa chọn được dữ liệu phù hợp; chưa tìm thấy công trình tiếng Việt cùng đầy đủ phạm vi bài toán trong đợt tra cứu. Đây không phải khẳng định không tồn tại dữ liệu/công trình như vậy.

Taillard/Lawrence chỉ kiểm chứng phần lõi JSP tương ứng, không chứng minh đủ nghiệp vụ mở rộng. Khi dùng Deliktaş, phải giữ đúng định nghĩa bài toán gốc để so số công bố; nếu bỏ cấu trúc cell/vận chuyển thì ghi rõ dữ liệu đã biến đổi. Mota chỉ là nguồn tham chiếu tham số, không phải dữ liệu xác nhận riêng cho nhà máy bánh xe.

**Quy trình sinh dữ liệu:** bộ sinh dữ liệu điều chỉnh được tham số (số máy, số công việc, phân phối thời gian xử lý, tần suất đơn gấp, số lô dự trữ tùy chọn (thành phẩm và bán thành phẩm), trần tồn (thành phẩm và bán thành phẩm) và tương quan chi phí idle/lưu kho) → nhiều kịch bản kiểm thử, đánh giá độ ổn định của tác nhân.

## 6. Tiêu chí đánh giá thành công (Definition of Done)

| Mã | Tiêu chí | Cách nghiệm thu |
|---|---|---|
| D01 | Tính hợp lệ | 100% lịch xuất để sử dụng vượt qua validator độc lập cho mọi ràng buộc cứng R01–R12. Có trường hợp kiểm thử cố tình sai cho từng nhóm; không buộc sinh lịch với đầu vào bất khả thi. |
| D02 | Hiệu suất và sản xuất dự trữ | So cấu hình có/không lô dự trữ (thành phẩm và bán thành phẩm, báo tách) trên cùng dữ liệu, ràng buộc và ngân sách; báo chênh lệch idle/chi phí idle, độ trễ, thiếu safety stock, lượng dự trữ, tồn bình quân/cuối kỳ, setup và ca mở. Có ít nhất hai ca kiểm thử đối nghịch: chọn lô khi chi phí idle tránh được lớn hơn chi phí tăng thêm, và không chọn khi quan hệ đảo lại. Xác nhận lô dự trữ không làm xấu mức phục vụ đã khoá ở tầng 1. Báo tỷ lệ ca đạt mức tham chiếu 90% theo tải, không bỏ các ca không đạt khỏi thống kê. |
| D03 | Thời gian và trạng thái | Báo thời gian đến nghiệm đầu, tổng thời gian phiên, p50/p95, tỷ lệ tìm được lịch và trạng thái mục 4.5. Hết ngân sách không được xuất lịch chưa kiểm tra hoặc tuyên bố vô nghiệm. |
| D04 | Chất lượng và đối chứng | So FIFO/EDD/SPT với cùng tập lô bắt buộc, tập lô dự trữ, chính sách chọn lô và validator; trên benchmark gốc báo makespan, best-known, nguồn/ngày tham chiếu và độ lệch RPD. Với mô hình đầy đủ báo từng KPI, mục tiêu tổng và cận/gap nếu có. |
| D05 | Gián đoạn | Kiểm thử đơn gấp và máy hỏng cả lúc rảnh/đang chạy; phần quá khứ không đổi, lô dự trữ đã bắt đầu được giữ như WIP cam kết, lô chưa bắt đầu được phép chọn lại, lịch mới tuân thủ dữ liệu mới và có bảng tác động trước/sau. |
| D06 | Tái lập thực nghiệm | Lưu input, cấu hình mục tiêu, phiên bản solver, phần cứng, số worker, seed, ngân sách và kết quả thô; công bố cả instance không tìm được lịch. |

**Các ngưỡng cần khoá trước thực nghiệm chính:** tập instance và quy mô demo, phần cứng, số lần chạy, giới hạn thời gian, tỷ lệ instance phải tìm được lịch, ngưỡng RPD và mức cải thiện hiệu suất mong muốn. Pilot dùng để xác định giá trị khả thi; không chọn lại ngưỡng sau khi xem kết quả tập kiểm thử. Mốc khởi đầu đề xuất: ngân sách solver 30 giây cho tập demo, 120 giây cho chế độ nghiên cứu; đo riêng độ trễ toàn phiên gồm tiền xử lý và validator. Chưa tuyên bố đạt nghiệm thu định lượng khi các ngưỡng còn chưa được khoá.

Xem [kế hoạch đánh giá](../scheduling-algorithms/model_and_evaluation_plan.md) để thiết kế tập kiểm thử và ablation. Diễn giải chuyên sâu là tính năng phụ, nhưng KPI, trạng thái giải và cảnh báo thiếu mục tiêu là đầu ra bắt buộc.

## 7. Lớp diễn giải hỗ trợ (tính năng phụ, không phải mục tiêu #2)

Xây dựng thêm các phân tích từ lịch và các lần giải đối chứng khi cần tham khảo lý do; đây không phải tính năng tự có chỉ nhờ dùng CP-SAT:

- **Phân tích độ nhạy** — nới từng ràng buộc trong kịch bản phân tích và đo thay đổi mục tiêu/KPI với cùng ngân sách. Nếu hai lần giải chưa tối ưu, kết quả chỉ là bằng chứng thực nghiệm, không khẳng định quan hệ nhân quả tuyệt đối; lịch nới lỏng không phải lịch thực thi.
- **Đường găng (critical path)** — chuỗi công đoạn và quan hệ tài nguyên giới hạn thời điểm hoàn tất của lịch, hỗ trợ phân tích chậm; không tự giải thích mọi trường hợp trễ hạn từng đơn.
- **Phản thực (counterfactual)** — "nếu chèn đơn gấp Y, công việc nào bị đẩy lùi và trễ bao lâu".
- **Diễn giải hiệu suất sử dụng máy** — phân tích nguyên nhân không đạt và đánh đổi khi gộp ca. Phần tính/báo KPI cơ bản ở mục 4.4 vẫn bắt buộc.

## 8. Ràng buộc phi-nghiệp-vụ (điều kiện làm đồ án)

- **Đồ án cá nhân** (solo), không phải sản phẩm thương mại đa stakeholder.
- Ngân sách kế hoạch tham chiếu **12–14 tuần triển khai** theo đặc tả ban đầu; tại lần rà soát 19/09/2026 chưa xác nhận lịch học kỳ còn lại. Không dùng con số này như thời gian còn lại cập nhật tự động.
- Mục tiêu cuối là **ứng dụng demo chạy local** (không cần hạ tầng cloud production).
- Có các prototype nền: [lập lịch cơ bản](../../poc/scheduling_poc.py), [đa máy](../../poc/scheduling_poc_multi.py), [tồn kho](../../poc/scheduling_poc_inventory.py), [planning](../../model/production_planning_2weeks.py), [lịch ngày](../../model/detailed_day_schedule.py). Theo tài liệu gốc, các prototype đã được kiểm chứng trong phạm vi ví dụ; chưa xem là bằng chứng đáp ứng toàn bộ yêu cầu bản này. Mỗi kết luận kiểm chứng cần kèm input/cấu hình và kết quả chạy tương ứng.
- Lựa chọn triển khai hiện tại: **CP-SAT (OR-Tools)** — xem [khảo sát và đề xuất hiện hành](../scheduling-algorithms/scheduling_methods_and_recommendation.md). Đây là quyết định kỹ thuật, không thay thế các yêu cầu nghiệp vụ và kiểm chứng độc lập.

## 9. Những điểm cần đồng bộ với tài liệu gốc

| Nội dung | Cách hiểu trong bản rà soát | Việc cần đồng bộ |
|---|---|---|
| Tồn kho | Tồn vật lý không âm và không vượt trần là cứng; safety stock mềm; cho phép lô dự trữ tùy chọn có giới hạn | Schema lô/tồn kho, bảng ràng buộc, mục tiêu và DoD trong cả hai tài liệu gốc |
| Số lô | Số lô và lượng từng lô tính ở bước chuẩn bị dữ liệu: N = max(0, D + SS − I), n = ⌈N/Q⌉ (mục 3.3.1); solver không tự chia lô | Bộ sinh dữ liệu, planning và bộ kiểm tra lô/lượng dư; đồng bộ với A01, A02, R04 |
| Bán thành phẩm | Mọi công đoạn sau lấy nguyên liệu từ tồn BTP của công đoạn ngay trước, quản lý theo mã sản phẩm và công đoạn; lô giữ danh tính ở QC; R12 là cứng; chi phí lưu BTP nằm trong chi phí lô dự trữ; sức chứa không khai báo hiểu là không giới hạn | Quy tắc "công đoạn sau chờ toàn lô" thay bằng lấy từ tồn; schema lượt chạy và lô, bảng tồn BTP, ràng buộc bảo toàn BTP, mục tiêu, DoD và kế hoạch đánh giá trong cả hai tài liệu gốc |
| Hiệu suất | Đo theo toàn ca bật; 90% là tham chiếu theo tải; có thể lấp idle bằng lô dự trữ khi hiệu quả kinh tế | Công thức idle/utilization, chi phí idle–lưu kho, biến chọn lô, biến bật ca và tiêu chí thành công |
| Planning | Tổng hợp nhu cầu tháng/quý, đầu vào scheduling 2 tuần, chưa cần solver tối ưu riêng | Sơ đồ aggregate engine CP-SAT trong TECHNICAL_SPEC và mô tả phạm vi |
| Giả định và gián đoạn | A01–A10, R11–R12 và chính sách bảo toàn lịch thực tế | Schema, luồng máy hỏng/đơn gấp, baseline và bộ kiểm tra |
| Diễn giải | Phân tích nâng cao là phụ; KPI và trạng thái là bắt buộc | Danh sách UI bắt buộc và roadmap trong TECHNICAL_SPEC |
| Nghiệm thu | D01–D06, ngưỡng khoá trước đánh giá chính | Kế hoạch thực nghiệm, không giữ các câu “chấp nhận được/không thua đáng kể” thiếu định nghĩa |

Các tài liệu gốc chưa được sửa trong lần cập nhật file này. Khi dùng để triển khai, ghi rõ phiên bản yêu cầu đang áp dụng; các điểm chưa thống nhất hoặc vượt giả định đồ án phải được ghi nhận thay vì âm thầm thay đổi mô hình.

---

*Nguồn nền: báo cáo sơ bộ mục 1–4 và TECHNICAL_SPEC §1–§2. Bổ sung làm rõ sau review ngày 19/09/2026; đối chiếu khảo sát phương pháp và kế hoạch đánh giá trong `report/scheduling-algorithms/`.*
