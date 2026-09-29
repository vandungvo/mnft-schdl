# Mô hình đề xuất và kế hoạch đánh giá thuật toán

**Ngày:** 18/09/2026; cập nhật 21/09/2026 theo yêu cầu A09–A10, R12 (nguyên liệu công đoạn sau lấy từ tồn bán thành phẩm, mục 3.2 và 3.7); cập nhật 27/09/2026 thêm độ trễ chuyển tiếp BTP cố định `xfer` (mục 3.7). Đi cùng [khảo sát phương pháp](scheduling_methods_and_recommendation.md). Nội dung dưới đây là thiết kế đề xuất, chưa phải mô hình đã cài đặt hoặc kết quả thực nghiệm.

## 1. Những điểm cần thống nhất trong yêu cầu

Các tài liệu hiện có chưa định nghĩa đủ những trường hợp dưới đây. Để thiết kế có thể kiểm chứng, dùng giả định làm việc rõ ràng; không coi đây là thay đổi đã được chấp thuận trong đặc tả gốc.

| Điểm chưa rõ hoặc mâu thuẫn | Đề xuất mặc định | Ảnh hưởng nếu chọn khác |
|---|---|---|
| Tồn kho an toàn vừa là ràng buộc, vừa có phạt thiếu hụt | Tồn vật lý không âm là cứng; mục tiêu an toàn là mềm có báo cáo; hỗ trợ cấu hình cứng | Chế độ cứng có thể vô nghiệm, số hạng thiếu hụt luôn bằng 0 |
| Hạn giao có phạt nhưng gộp lô nói “miễn không vi phạm” | Due date mềm; đơn có cam kết tuyệt đối mới đặt deadline cứng | Gộp lô phải xét chi phí trễ, không được tự coi mọi hạn giao là cứng |
| Lô tối thiểu là ngưỡng kỹ thuật hay chỉ ngưỡng kinh tế | Ngưỡng kỹ thuật là cứng; ngưỡng kinh tế có thể phạt | Không được âm thầm chạy lô nhỏ hơn ngưỡng cứng |
| Quy mô lô cố định hay biến quyết định | MVP tạo lô trước, thử vài phương án phân lô | Không được gọi là tối ưu đồng thời lot-sizing nếu chỉ cố định lô |
| Một “lần đúc” tương ứng gì | Dùng số chu kỳ thực tế theo số lòng khuôn và lượng lô | Đếm một lô như một lần đúc có thể sai tuổi thọ nhiều lần |
| Khuôn cố định hay dùng chung giữa máy | Có danh mục tương thích và tài nguyên khuôn riêng | Nếu luôn cố định thì mô hình đơn giản hơn |
| Công đoạn đi qua giờ nghỉ | Không ngắt giữa chừng; có thể qua ca liền nhau nếu máy liên tục khả dụng | Nếu được pause/resume phải có mô hình thời lượng theo lịch, không chỉ start/end |
| Setup có thể trước khi bán thành phẩm đến không | Mặc định không; cần cả vật tư và máy sẵn sàng | Setup anticipatory là biến thể khác |
| Setup/bảo trì có cần ca và người không | Setup chiếm máy trong thời gian khả dụng; bảo trì chiếm khuôn và máy nếu nghiệp vụ yêu cầu | Thêm nhân lực khi có dữ liệu, không giả định tài nguyên vô hạn nếu có giới hạn thực |
| Giao hàng từng phần | MVP giao đủ đơn, cho phép lấy từ tồn đầu kỳ và nhiều lô | Nếu giao từng phần, đo trễ theo lượng và thời điểm giao |
| Sơn có xử lý nhiều lô đồng thời không | MVP mỗi máy xử lý một lô như yêu cầu hiện tại | Sơn theo mẻ cần batch-capacity và tương thích trong mẻ |
| Planning có cần solver riêng | Tổng hợp nhu cầu, kiểm tra tải sơ bộ theo yêu cầu | Sơ đồ aggregate engine CP-SAT trong spec cần được làm rõ |
| Nguyên liệu công đoạn sau lấy từ công đoạn trước hay từ tồn | Từ tồn bán thành phẩm theo mã sản phẩm và công đoạn (A09–A10); lô giữ danh tính ở lượt QC để gán đơn | Nếu chờ toàn lô thì không dự trữ được bán thành phẩm để lấp công suất trống |

“Không vi phạm tồn kho” trong Definition of Done cần tách thành không âm vật lý và đáp ứng safety stock. Chưa thống nhất thì báo cáo cả hai chế độ; không tính lịch thiếu safety stock là đạt yêu cầu cứng.

## 2. Dữ liệu và tiền xử lý

### 2.1. Dữ liệu tối thiểu

- Đơn hàng: sản phẩm, lượng, thời điểm được phép bắt đầu, hạn giao, trọng số ưu tiên, cho phép giao từng phần hay không.
- Máy: nhóm công đoạn, tập sản phẩm đủ điều kiện, lịch khả dụng, trạng thái sản phẩm/khuôn ban đầu, thời gian xử lý.
- Khuôn: sản phẩm/máy tương thích, số lượng khuôn vật lý, số lòng, mức sử dụng từ lần bảo trì gần nhất, ngưỡng, thời lượng bảo trì.
- Setup: ma trận theo máy/công đoạn và cặp họ sản phẩm, kể cả trạng thái ban đầu. Không mặc định A→B bằng B→A.
- Ca: giờ bắt đầu/kết thúc, nghỉ, ca được chọn mở hoặc bắt buộc mở, chi phí nếu dùng trong mục tiêu.
- Tồn kho thành phẩm đầu kỳ; tồn bán thành phẩm đầu kỳ theo (sản phẩm, công đoạn) kèm sức chứa (không khai báo là không giới hạn); lượt đang chạy tại đầu kỳ; mục tiêu an toàn theo mốc; nhu cầu sau biên kỳ để tránh cận thị.
- Quy tắc lô tối thiểu/tối đa, lượng sản xuất dư được phép, thời lượng theo lượng và máy.

Thời gian nội bộ là số nguyên theo một đơn vị thống nhất. Chọn phút nếu hợp lý; nếu làm tròn thời lượng lên thì ghi sai lệch và dùng cùng phép làm tròn cho mọi thuật toán. CP-SAT yêu cầu mô hình số nguyên cho ràng buộc. [Tài liệu Google](https://developers.google.com/optimization/cp/cp_solver).

### 2.2. Tạo lô trước khi xếp lịch

Tổng nhu cầu cần sản xuất phải xét tồn đầu kỳ và lượng giữ cho safety stock theo chính sách. Ví dụ cần giao 120, tồn đầu 30, muốn còn 20 thì cần sản xuất ít nhất 110 nếu yêu cầu an toàn là cứng. Nếu mỗi lô là một lần sản xuất 25 sản phẩm, cần ⌈110/25⌉ = 5 lô, tức 125 sản phẩm, phát sinh 15 sản phẩm dư so với lượng cần sản xuất. Đây là ví dụ minh hoạ, không phải tham số nhà máy.

Đề xuất thử vài cấu hình: chia theo đơn; gộp cùng sản phẩm trong cửa sổ hạn giao; chia theo dung lượng ca/khuôn. Bảo toàn bảng phân bổ lượng từ lô đến đơn. So sánh các cấu hình với cùng ngân sách tổng, tính cả thời gian tiền xử lý; không chỉ chọn lịch tốt nhất từ nhiều lần solve rồi so với baseline chạy một lần.

Không cho phép sản xuất thừa vô hạn để làm đẹp utilization. Đặt giới hạn lượng được duyệt hoặc chi phí/giới hạn tồn cuối kỳ. Nếu gộp hai đơn có hạn khác nhau, giữ hạn và KPI từng đơn; không thay bằng hạn xa hơn của cả lô.

## 3. Khung mô hình CP-SAT

### 3.1. Ký hiệu

| Ký hiệu | Ý nghĩa |
|---|---|
| `b, o=(b,k)` | Lô và lượt chạy công đoạn k của lô; lô giữ danh tính ở lượt QC |
| `m, g, s, t` | Máy, khuôn vật lý, ca, mốc kiểm kê |
| `q_b, p_om` | Lượng lô đã xác định và thời lượng công đoạn trên máy |
| `x_om` | Công đoạn o chọn máy m |
| `S_o, E_o` | Bắt đầu và kết thúc công đoạn |
| `a_ijm` | i là tác vụ sản xuất liền trước j trên máy m |
| `y_ms` | Máy m được bật ở ca s |
| `I_pt, h_pt` | Tồn kho sản phẩm p và thiếu hụt safety stock tại mốc t |
| `C_j, T_j` | Thời điểm giao đủ đơn j và độ trễ |
| `Lvl_pk(t)` | Tồn bán thành phẩm sản phẩm p sau công đoạn k tại thời điểm t |
| `xfer` | Độ trễ chuyển tiếp BTP cố định giữa 2 công đoạn liền kề (10 phút, dùng chung cho đúc→CNC, CNC→sơn, sơn→QC) |

Đây là khung mô hình; chỉ các máy/khuôn đủ điều kiện mới có biến lựa chọn. Khi thời lượng phụ thuộc lượng lô biến đổi, phải bổ sung miền lượng và quan hệ thời lượng; MVP tránh phức tạp này bằng cách cố định lượng từng cấu hình.

### 3.2. Gán máy và lượt chạy

Với mỗi lượt chạy (lượt QC của lô bắt buộc luôn có mặt; lượt ở công đoạn đúc, CNC, sơn là lượt tùy chọn, xem A10):

```text
sum(x[o,m] for m in eligible[o]) = present[o]
x[o,m] = 1 => E[o] = S[o] + p[o,m]
W[o] >= release[b]        # W[o]: thời điểm rút nguyên liệu (bắt đầu setup nếu có)
# Không có S[b,k+1] >= E[b,k]: thứ tự công đoạn đi qua tồn bán thành phẩm, xem mục 3.7
```

Dùng optional interval theo máy, liên kết với start/end của công đoạn. `NoOverlap` bao gồm khoảng sản xuất, setup chiếm máy, bảo trì chiếm máy và downtime trên máy đó. Với công việc bắt buộc, không cho solver bỏ việc để giảm mục tiêu. [Ví dụ nền tảng job shop](https://developers.google.com/optimization/scheduling/job_shop).

### 3.3. Setup phụ thuộc cặp liền kề

Với mỗi máy, dùng circuit với depot, các nút công đoạn, self-loop cho công đoạn không chọn máy, và xử lý trường hợp máy không có việc. Cung liền kề được chọn liên kết khoảng setup tương ứng. Nguồn tham khảo cấu trúc circuit: [ví dụ chính thức OR-Tools](https://github.com/google/or-tools/blob/stable/examples/python/jobshop_ft06_distance_sat.py).

Quan hệ tối thiểu `a[i,j,m] => S[j] >= E[i] + setup[i,j,m]` **chưa đủ** nếu setup không được thực hiện trong downtime. Đề xuất explicit optional setup interval `U[i,j,m]` với presence là cung, duration là thời lượng setup và nằm trong lịch khả dụng:

```text
a[i,j,m] => start(U[i,j,m]) >= E[i]
a[i,j,m] => end(U[i,j,m]) = S[j]
```

Trong mặc định setup không anticipatory, setup chỉ bắt đầu khi tồn bán thành phẩm của công đoạn trước đã đủ cho lượt (nguyên liệu bị rút tại bắt đầu setup, mục 3.7) và không sớm hơn release tương ứng. Mặc định này coi setup sát ngay trước chạy; nếu cho phép tách setup khỏi sản xuất thì thay bằng `end(U) <= S[j]` và theo dõi trạng thái đã chuẩn bị.

Tính setup đầu tiên từ trạng thái thực của máy, không mặc định bằng 0. Xác định liệu nghỉ qua ca hoặc bảo trì có làm mất trạng thái setup hay không. Nếu có, cần trạng thái/cung chuyển qua bảo trì; không được chỉ nối hai tác vụ sản xuất và bỏ ảnh hưởng trung gian.

### 3.4. Lịch ca và bật máy

Các khoảng đóng máy/nghỉ bắt buộc là downtime. Với ca tuỳ chọn, có thể tạo khoảng chặn cả ca khi `y_ms = 0`; interval này tham gia `NoOverlap`. Chuẩn hoá lịch thành các đoạn không chồng nhau để tránh blocker trùng nhau. Công đoạn và setup phải nằm trong miền thời gian hợp lệ.

Ràng buộc “muốn chạy thì ca phải bật” là **cứng**; chỉ mục tiêu hiệu suất thấp hoặc chi phí mở ca là mềm. Không diễn đạt toàn bộ biến bật ca như một ràng buộc mềm có thể bỏ qua.

Công đoạn không ngắt có thể qua hai ca liền nhau nếu cả hai bật và không có nghỉ giữa chúng. Công đoạn dài hơn mọi đoạn khả dụng liên tục cần chia lô, cho phép ngắt theo nghiệp vụ, hoặc báo không xếp được; không kéo xuyên downtime.

### 3.5. Khuôn và bảo trì theo sử dụng

Phân biệt bảo trì theo thời gian lịch với bảo trì theo số lần đúc. Lịch nghỉ định sẵn chỉ mô hình được trường hợp thứ nhất.

Với khuôn g, lô b dùng `c_bg = ceil(q_b / cavities_g)` chu kỳ theo giả định không có phế phẩm. Duy trì trạng thái sử dụng `u_before, u_after` theo thứ tự sử dụng trên **khuôn**, kể cả khi khuôn chuyển máy:

```text
lô được thực hiện: u_after = u_before + c_bg <= limit_g
bảo trì hoàn tất:  u_after = 0
tác vụ tiếp theo:  u_before[next] = u_after[previous]
```

Khởi tạo bằng mức đã dùng trước horizon. Bảo trì là tác vụ có thời lượng, chiếm khuôn và tài nguyên liên quan. Mọi tác vụ dùng cùng một khuôn phải `NoOverlap`; có nhiều khuôn giống nhau thì khai báo từng khuôn hoặc mô hình tài nguyên dung lượng với trạng thái bảo trì phù hợp.

Có thể tạo số slot bảo trì hữu hạn theo tổng chu kỳ và ngưỡng rồi chọn sử dụng; cần cận đủ lớn và ràng buộc đối xứng để không bỏ nghiệm. Nếu một lô đòi nhiều chu kỳ hơn toàn ngưỡng, bắt buộc chia lô hoặc hỗ trợ bảo trì giữa các phần; thêm bảo trì trước lô không giải quyết được.

### 3.6. Tồn kho và giao hàng

Chỉ ghi nhận thành phẩm sau QC. Với `Q_pt` là lượng hoàn tất QC trong kỳ và `Ship_pt` là lượng giao thực tế:

```text
I[p,t] = I[p,t-1] + Q[p,t] - Ship[p,t]
I[p,t] >= 0
h[p,t] >= safety[p,t] - I[p,t]
h[p,t] >= 0
```

Nếu chỉ kiểm tra ở cuối kỳ, có thể bỏ sót giao hàng trước sản xuất trong kỳ. Cần kiểm tra tồn theo mọi sự kiện giao/hoàn tất hoặc đặt quy ước giao tại mốc kiểm kê. Quy định thứ tự sự kiện cùng thời điểm, ví dụ QC hoàn tất trước giao hàng.

Không trừ toàn bộ nhu cầu đúng hạn trực tiếp vào tồn vật lý khi cho phép giao trễ. Làm vậy có thể biến due date mềm thành cứng. Theo dõi riêng lượng chưa giao/backlog và tồn vật lý, nối thời điểm giao với thành phẩm đã được phân bổ.

MVP không giao từng phần: đơn được gán cho lượt QC của các lô, và `C_j` là thời điểm có đủ lượng đã phân bổ để giao đơn (hoàn tất QC muộn nhất trong các lượt được gán), kể cả phần lấy tồn đầu kỳ; `T_j = max(0, C_j - due_j)`. Một lô phục vụ nhiều đơn hoặc một đơn dùng nhiều lô phải được phản ánh trong phép tính này. Với giao từng phần, dùng KPI độ trễ theo lượng hoặc thời điểm giao đủ, ghi rõ lựa chọn.

Chế độ safety stock cứng thêm `I[p,t] >= safety[p,t]`; chế độ mềm dùng `h` trong mục tiêu và gắn cờ thiếu. Công đoạn hoàn tất ở đúng biên kỳ cần quy tắc nhất quán để không đếm hai lần.

### 3.7. Tồn bán thành phẩm và dòng nguyên liệu

Nguyên liệu của công đoạn sau lấy từ tồn bán thành phẩm (BTP) theo mã sản phẩm và công đoạn (A09–A10), không lấy trực tiếp từ lượt chạy của lô trước. Với sản phẩm p và công đoạn k = 1..3:

```text
Lvl[p,k](t) = I0[p,k]
            + sum(q[o] * present[o] * (E[o] + xfer <= t) for o at stage k,   product p)
            - sum(q[o] * present[o] * (W[o] <= t)        for o at stage k+1, product p, not running at t=0)
0 <= Lvl[p,k](t) <= cap[p,k]          # cap không khai báo = không giới hạn
```

`W[o]` là thời điểm rút nguyên liệu (bắt đầu setup nếu có, ngược lại bắt đầu gia công). `xfer` là độ
trễ chuyển tiếp BTP cố định (10 phút, dùng chung mọi cặp công đoạn liền kề) — bán thành phẩm chỉ
được coi là "đã nhập" tồn tại `E[o] + xfer`, không phải ngay tại `E[o]`. Mức tồn chỉ đổi tại các sự
kiện nên kiểm tại sự kiện là đủ; CP-SAT có ràng buộc reservoir cho dạng này, cần thử ngữ nghĩa sự
kiện đồng thời trước khi dựa vào. Hoàn tất cộng `xfer` được ghi nhận trước tiêu thụ nếu cùng thời điểm.

Hệ quả cần kiểm thử: (1) lượt công đoạn sau bắt đầu trước khi lượt cùng lô ở công đoạn trước xong, nếu tồn đủ; (2) lượt tùy chọn được chọn để dự trữ khi công đoạn còn công suất trống; (3) dự trữ không làm xấu độ trễ hoặc safety stock so với tầng phục vụ (mục 4.1). Công thức đầy đủ ở [mathematical_model.md](mathematical_model.md), ràng buộc C7b.

## 4. Hàm mục tiêu và đo hiệu suất

### 4.1. Mục tiêu cơ sở

Giữ năm thành phần trong yêu cầu:

```text
min F = wC*Cmax + wT*sum(priority[j]*T[j])
      + wS*Setup + wI*Idle + wH*sum(h[p,t])
```

Yêu cầu còn bổ sung chi phí lô/lượt dự trữ (sản xuất, lưu kho thành phẩm và bán thành phẩm) và chi phí mở ca (mục 4.3 của yêu cầu); các thành phần này nằm ngoài năm mục cơ sở và được cấu hình riêng. Các thành phần có đơn vị và độ lớn khác nhau. Chọn trọng số theo chi phí nghiệp vụ nếu có; nếu không, dùng thang chuẩn cố định theo capacity/horizon hoặc baseline tham chiếu trên tập hiệu chỉnh, rồi chuyển hệ số về số nguyên. Giữ nguyên thang khi so sánh thuật toán trên cùng instance. Không chuẩn hoá riêng theo min/max của từng lời giải.

Không khẳng định “trọng số 1000 đủ lớn để ưu tiên tuyệt đối” nếu chưa có cận tổng các thành phần còn lại. Nếu cần ưu tiên tuyệt đối hạn giao, giải lexicographic nhiều pha hoặc tính trọng số từ cận chứng minh được. Đây là phương án thay đổi chính sách mục tiêu, phải ghi rõ khác weighted sum cơ sở.

Chi phí bật ca và độ xáo trộn lịch có thể là thành phần mở rộng, không nằm nguyên dạng trong năm mục tiêu gốc. Đề xuất dùng tie-break hoặc cấu hình riêng và có ablation. Nếu không có dữ liệu năng lượng, không quy đổi giảm idle thành kWh tiết kiệm.

### 4.2. Hiệu suất trên ca đã bật

Với ca s của máy m, định nghĩa thời lượng khả dụng `A_ms` sau khi loại nghỉ cố định/downtime đã biết từ đầu. Các quyết định bảo trì phát sinh trong lịch được ghi riêng, không tự động loại khỏi mẫu số để làm tăng utilization.

```text
P_ms = thời gian thực sự sản xuất nằm trong ca
S_ms = thời gian setup nằm trong ca
M_ms = thời gian bảo trì chiếm máy nằm trong ca
Idle_ms = y_ms*A_ms - P_ms - S_ms - M_ms
U_productive = sum(P_ms) / sum(y_ms*A_ms)
U_busy = sum(P_ms + S_ms + M_ms) / sum(y_ms*A_ms)
```

Tính phần giao interval với ca, không gán toàn bộ công đoạn qua ca vào một ca. Báo cáo cả sản xuất, setup, bảo trì và idle; `U_busy` cao không đồng nghĩa năng suất cao. Máy tắt toàn bộ có utilization **N/A**, không phải 100%.

Ví dụ: ca khả dụng 480 phút, sản xuất 120 phút liên tục, không setup/bảo trì. Tính theo first-start/last-end cho 100%; tính trên ca đã bật cho 25%. Vì vậy “idle giữa hai công đoạn” và “idle trong ca đã mở” là hai KPI khác nhau. Prototype đang có chỉ tiêu khoảng hoạt động cần được rà lại trước khi dùng để chứng minh mục tiêu theo ca.

Nếu dùng mục tiêu mềm 90%, có thể đo thiếu hụt `z_ms >= 0.9*y_ms*A_ms - P_ms`, `z_ms >= 0`, nhân hệ số để nguyên hoá. Không dùng ngưỡng 90% cứng trên mọi ca; thiếu nhu cầu và nghẽn công đoạn có thể khiến nó bất khả thi. Đo tác động lên trễ hạn và tồn cuối kỳ để tránh “tối ưu utilization” bằng trì hoãn hoặc sản xuất dư.

## 5. Tái lập lịch khi có sự kiện

Tại thời điểm sự kiện `tau`:

1. Chụp trạng thái thực: lượt đã hoàn tất, đang chạy, tồn bán thành phẩm theo (sản phẩm, công đoạn), tồn thành phẩm, máy/khuôn, chu kỳ đã sử dụng.
2. Giữ nguyên phần đã thực hiện. Với việc đang chạy trên máy không hỏng, giữ máy và phần thời lượng còn lại theo thực tế.
3. Nếu máy hỏng ngay khi đang gia công, áp dụng chính sách đã khai báo: tiếp tục phần còn lại sau sửa, làm lại, hoặc phế phẩm và tạo lô bù. Không được vừa giữ chạy xuyên sự cố vừa chặn downtime.
4. Khoá cửa sổ cam kết gần nhất cho các việc vẫn khả thi; nếu sự cố làm việc bị khoá không còn khả thi, mở khoá các việc bị ảnh hưởng theo quy tắc rõ ràng và ghi nhận.
5. Cập nhật đơn gấp/downtime, sửa hoặc loại các hint không còn hợp lệ.
6. Giải phần tương lai; kiểm tra độc lập toàn lịch ghép và so sánh với kế hoạch trước sự kiện.

Đo số việc đổi máy, độ dịch giờ bắt đầu, thay đổi độ trễ từng đơn, số ca mở thêm và thời gian tính lại. Nếu dùng chi phí ổn định, với tập công đoạn tương lai có ở cả hai lịch:

```text
Delta = sum(abs(S_new[o] - S_old[o]))
        + k_machine*sum(machine_new[o] != machine_old[o])
```

Không phạt đơn mới vì chưa có lịch cũ; giữ quy tắc ghép mã lô/công đoạn khi phân lô thay đổi. Nếu kết quả `UNKNOWN` và không có lịch mới hợp lệ, báo chưa có phương án; lịch cũ có máy hỏng không mặc nhiên được dùng lại.

## 6. Baseline và bộ kiểm tra độc lập

### 6.1. Decoder chung

Baseline FIFO/EDD/SPT cùng sử dụng quy tắc phân lô, calendar, setup, khuôn và inventory như CP-SAT. Tại mỗi bước, duyệt các lượt đã đủ tồn bán thành phẩm ở công đoạn trước (mục 3.7); tính các vị trí máy–khuôn hợp lệ, chèn bảo trì nếu cần, chọn theo quy tắc rồi tie-break ổn định. Quy tắc tạo lượt tiền QC (đúc, CNC, sơn) là cố định và giống nhau giữa mọi baseline: chỉ tạo đủ để phục vụ lượt QC của lô bắt buộc từ tồn hiện có; dự trữ bán thành phẩm chỉ bật khi so sánh có chủ đích và dùng cùng một quy tắc chọn lượt dự trữ cho mọi thuật toán. Nếu không tìm được chỗ, trả trạng thái thất bại heuristic và nguyên nhân quan sát được.

Chỉ so sánh mục tiêu giữa các lịch hợp lệ. Tỷ lệ tìm được lịch là KPI riêng; không im lặng bỏ các instance heuristic/solver thất bại khỏi thống kê.

### 6.2. Validator không phụ thuộc solver

Validator đọc đầu vào và lịch xuất ra, tự tính lại:

- Đủ lượt QC cho lô bắt buộc và đủ lượng đơn; mỗi lượt chọn đúng máy/khuôn đủ điều kiện.
- Tồn bán thành phẩm không âm và không vượt sức chứa tại mọi sự kiện, release, duration theo lượng, không chồng máy/khuôn.
- Setup đúng cặp liền kề và trạng thái đầu, không thực hiện trong downtime.
- Ca bật cho mọi khoảng chiếm máy; bảo trì đủ thời lượng, chu kỳ không vượt ngưỡng.
- Lô tối thiểu, bảo toàn lượng, tồn theo sự kiện, chế độ safety stock đã chọn.
- Lịch quá khứ/cam kết được giữ theo chính sách; mọi KPI/mục tiêu tính lại khớp.

Không lấy biến trung gian “inventory”, “idle”, “setup” do solver trả làm bằng chứng duy nhất. Validator cần phát hiện lỗi liên kết biến trong mô hình.

## 7. Thiết kế thực nghiệm

### 7.1. Ba lớp dữ liệu

| Lớp | Dữ liệu | Điều được kiểm chứng |
|---|---|---|
| Lõi JSP | Taillard/Lawrence trong thư mục dataset hiện có | Máy cố định, precedence, không overlap, makespan; không chứng minh đúng machine flexibility |
| FJSP + setup | Deliktaş và instance nhỏ tự kiểm chứng | Gán máy, thứ tự, setup theo họ |
| Nghiệp vụ bánh xe | Bộ tổng hợp có đủ ca, khuôn, lô, tồn kho, đơn gấp, sự cố | Độ phủ yêu cầu và đánh đổi KPI |

Deliktaş chứa cấu trúc cellular và vận chuyển giữa cell ngoài setup. Nếu bỏ vận chuyển hoặc ràng buộc cell, phải ghi “phiên bản biến đổi”; không so trực tiếp với số công bố của bài gốc. [Mô tả bài dữ liệu](https://pubmed.ncbi.nlm.nih.gov/38152490/).

Dữ liệu năng lượng Mota theo tài liệu dự án là nguồn tham chiếu tham số, không tự đại diện dây chuyền bánh xe. Hiệu chỉnh số liệu tổng hợp phải ghi nguồn, phép chuyển đổi và giới hạn suy rộng.

### 7.2. Kịch bản bắt buộc

1. Lịch nhỏ 2–3 lô có thể tính tay/duyệt hết để kiểm tra mục tiêu và setup đầu tiên.
2. Máy chuyên dụng thành nghẽn, không thể dồn tuỳ ý sang máy khác.
3. Setup bất đối xứng và setup đi qua giờ nghỉ nếu chỉ dùng khoảng cách thời gian.
4. Khuôn gần hết tuổi thọ, khuôn dùng chung giữa máy, lô lớn hơn ngưỡng.
5. Thiếu đơn lấp ca; kiểm tra mục tiêu 90% không gây báo vô nghiệm sai.
6. Tồn đầu kỳ đủ giao một phần đơn, thiếu safety stock nhưng tồn vật lý không âm.
7. Đơn gấp đến giữa kỳ, máy hỏng ở cả thời điểm rảnh và đang chạy.
8. Nhu cầu ngay sau biên horizon, kiểm tra tác dụng của overlap/look-ahead.
9. Instance không khả thi có chủ đích: không máy đủ điều kiện, deadline cứng không thể đạt, lô không thể chạy trong lịch khả dụng.
10. Hết thời gian: có incumbent, chưa có incumbent; không nhầm `UNKNOWN` với `INFEASIBLE`.
11. Công suất trống chỉ ở một công đoạn (ví dụ đúc), CNC kín: dự trữ bán thành phẩm được chọn khi lợi ích vượt chi phí, không chọn khi đảo lại, và lượt công đoạn sau lấy đúng lượng từ tồn.
12. Tồn bán thành phẩm đầu kỳ đủ cho một số lô bỏ qua công đoạn đầu; sức chứa hữu hạn chặn dự trữ; sức chứa không khai báo không chặn.

### 7.3. Quy mô và ngân sách đề xuất

Các con số dưới đây là **thiết kế pilot**, không là lời hứa về năng lực solver:

- Nhỏ: 10–20 lô; vừa: 50–100; lớn trong đồ án: khoảng 200; mỗi lô có lượt QC và tối đa bốn lượt chạy. Thay đổi số máy, độ linh hoạt và mật độ cung setup để đo đúng nguồn khó.
- Pilot 10 instance mỗi nhóm, sau đó chọn tập chính tối thiểu 30 instance/nhóm nếu tài nguyên cho phép.
- Ngân sách mỗi thuật toán 10/30/120 giây; tổng chi phí gồm tiền xử lý, dựng lịch, repair và solve. Thời gian validator báo riêng và tính thêm trong độ trễ toàn phiên.
- Thuật toán ngẫu nhiên: ít nhất 5 seed trên tập chính; heuristic xác định chỉ cần một kết quả, chạy lặp khi đo thời gian rất ngắn.
- Khoá CPU, số worker, RAM, phiên bản thư viện, cấu hình và seed. CP-SAT nhiều worker có thể không tái hiện hoàn toàn chỉ bằng cùng seed; ghi rõ cấu hình.

Không mở rộng toàn tích Descartes mọi tham số. Làm pilot, chọn mức tải nhẹ/vừa/căng và tăng từng yếu tố để biết nguyên nhân thay đổi.

### 7.4. Chỉ số báo cáo

| Nhóm | Chỉ số |
|---|---|
| Tính đúng | Tỷ lệ lịch qua validator; số vi phạm theo loại; tỷ lệ instance có lịch |
| Giao hàng | Tổng độ trễ có trọng số, số đơn trễ, trễ lớn nhất |
| Sản xuất | Makespan, tổng setup, số lần đổi loại, lượng sản xuất dư (thành phẩm và bán thành phẩm) |
| Máy | Productive utilization theo ca/toàn hệ, busy utilization, idle, số ca mở |
| Tồn kho | Tồn cuối kỳ, safety-stock shortfall theo mốc, backlog, tồn bán thành phẩm cuối kỳ và mức cực đại theo (sản phẩm, công đoạn) |
| Hiệu năng | Thời gian tới nghiệm khả thi đầu tiên, tổng thời gian, p50/p95, bộ nhớ |
| Chất lượng | Objective incumbent, best bound, gap; từng KPI chưa gộp trọng số |
| Động | Thời gian sửa lịch, độ dịch start, đổi máy, KPI trước/sau cùng sự kiện |

Với tối thiểu hoá, dùng `gap = (UB-LB)/max(1,abs(UB))` khi có incumbent UB và cận hợp lệ LB, ghi rõ quy ước này. Cận phải thuộc toàn bài cùng mục tiêu; không dùng cận từ vùng LNS hoặc cửa sổ RHO như cận toàn horizon.

Với benchmark, `RPD = 100*(value-BKS)/BKS` cho BKS dương và cùng định nghĩa bài toán/mục tiêu. Best-known không nhất thiết là tối ưu; ghi ngày và nguồn BKS. Không so điểm weighted sum của bài toán mở rộng với makespan công bố của JSP.

So sánh theo cặp trên cùng instance; báo median/IQR và khoảng tin cậy bootstrap của chênh lệch, tỷ lệ thắng/hoà/thua. Không gộp nhiều seed của cùng instance như nhiều nhà máy độc lập. Tách kết quả theo quy mô/tải, báo cả số thất bại để tránh thiên lệch chọn mẫu.

### 7.5. Ablation

| Thí nghiệm | Câu hỏi |
|---|---|
| CP-SAT có/không phạt idle | Hiệu suất cải thiện bao nhiêu, có tăng độ trễ/tồn dư không? |
| Hint bật/tắt | Cải thiện nghiệm đầu hoặc objective cuối trong cùng thời gian không? |
| Nguyên khối / RHO | Quy mô nào tiết kiệm thời gian, mất chất lượng bao nhiêu? |
| CP-SAT mặc định / LNS ngoài solver | LNS tự viết có thêm lợi ích thực tế không? |
| Có/không phạt xáo trộn | Đánh đổi ổn định và chất lượng sau sự cố ra sao? |
| Các cấu hình trọng số | Kết luận có phụ thuộc một bộ trọng số thuận lợi không? |
| Chia/gộp lô khác nhau | Hiệu quả đến từ scheduler hay tiền xử lý? |
| Có/không dự trữ bán thành phẩm | Lấp công suất trống ở công đoạn đầu có giảm idle và trễ so với chỉ dự trữ thành phẩm không? |

Giữ cùng ràng buộc cứng cho mọi thuật toán trong phép so sánh chính. Khi thử bỏ ràng buộc để phân tích, gọi rõ là mô hình nới lỏng, không tính là phương án hợp lệ cạnh tranh.

## 8. Tiêu chí ra quyết định và nghiệm thu

- **Tính đúng:** 100% lịch được xuất như phương án sử dụng phải qua validator; instance vô nghiệm/timeout vẫn phải được báo đúng, không buộc sinh lịch cho mọi đầu vào.
- **Chất lượng:** so sánh baseline trên cả mục tiêu tổng và các KPI; không định trước kết luận CP-SAT phải thắng. Cụm “không thua đáng kể BKS” trong yêu cầu cần chuyển thành ngưỡng RPD theo tập benchmark sau pilot, trước chạy đánh giá chính.
- **Hiệu suất:** 90% là mức tham chiếu trong yêu cầu. Báo theo tải và ca; nếu không đạt do thiếu việc, nêu nguyên nhân và đánh đổi, không coi là lỗi vật lý.
- **Thời gian:** đề xuất pilot với mục tiêu p95 không quá 30 giây cho tập demo, chế độ nghiên cứu 120 giây; phải xác nhận bằng đo thực tế rồi mới đưa thành SLA của ứng dụng.
- **Chọn mở rộng:** nếu CP-SAT đạt thời gian và chất lượng thì dừng mở rộng thuật toán; nếu chậm, kiểm tra mô hình/cận/horizon trước hint/RHO/LNS; nếu vẫn không đạt mới cân nhắc metaheuristic hoặc solver khác.
- **Trạng thái:** `OPTIMAL`, `FEASIBLE`, `INFEASIBLE`, `UNKNOWN`, `MODEL_INVALID` có thông điệp khác nhau. Không đọc giá trị biến như nghiệm khi chưa có nghiệm hợp lệ. [Định nghĩa trạng thái chính thức](https://developers.google.com/optimization/cp/cp_solver).

## 9. Lộ trình 12–14 tuần đề xuất

Đây là phân bổ từ lúc bắt đầu triển khai, không phải xác nhận số tuần thực tế còn lại của học kỳ.

| Giai đoạn | Đầu ra thuật toán | Điều kiện hoàn tất |
|---|---|---|
| Tuần 1–2 | Chốt giả định, schema, instance nhỏ, validator, phân lô | Phát hiện được lịch cố tình sai ở từng nhóm ràng buộc |
| Tuần 3–4 | CP-SAT đủ bốn công đoạn với dòng nguyên liệu qua tồn bán thành phẩm, setup, máy/khuôn, ca | Lịch nhỏ khớp kiểm tra tay, không chạy setup trong nghỉ |
| Tuần 5–6 | Bảo trì theo sử dụng, tồn kho/giao hàng, KPI và PDR | Các baseline cùng hợp đồng dữ liệu và validator |
| Tuần 7–8 | Benchmark lõi, dữ liệu tổng hợp, phân tích trọng số | Có kết quả pilot và chọn tập thực nghiệm chính |
| Tuần 9–10 | Đơn gấp, máy hỏng, freeze và hint | Quá khứ không đổi, sự cố giữa công đoạn được xử lý đúng |
| Tuần 11–12 | Thực nghiệm chính, tích hợp demo, báo cáo | Có dữ liệu thô, cấu hình tái lập và bảng KPI |
| Tuần 13–14 nếu có | Một mở rộng LNS/RHO hoặc TS/ILS theo nút thắt | Chứng minh lợi ích bằng ablation; không ảnh hưởng phần bắt buộc |

Phát triển giao diện/dữ liệu có thể xen kẽ; không cần đợi thuật toán hoàn hảo mới tích hợp. Đóng góp phù hợp của đồ án là một hệ thống lập lịch đúng nghiệp vụ, có đối chứng và xử lý gián đoạn, không bắt buộc phát minh thuật toán tối ưu mới.
