# Báo cáo sơ bộ: Đồ án Hệ thống thông tin quản lý (CO5103)

**Học viên:** Võ Văn Dũng
**Chương trình:** Cao học ngành Hệ thống thông tin quản lý
**Học kỳ:** HK261
**GVHD:** PGS.TS Võ Thị Ngọc Châu

## 1. Đề xuất bài toán cụ thể

Tên đề tài đề xuất: Xây dựng tác nhân lập lịch sản xuất có khả năng giải thích, ứng dụng trong ngành sản xuất linh kiện, trường hợp nghiên cứu: sản xuất bánh xe.

Lĩnh vực: Sản xuất

### 1.1. Bối cảnh thực tế

Tại nhiều nhà máy sản xuất linh kiện quy mô vừa và lớn (trường hợp tham khảo: một nhà máy sản xuất bánh xe quy mô vừa và lớn tại Việt Nam), việc lập lịch sản xuất hiện vẫn xoay quanh các file Excel rời rạc do từng nhân viên lập kế hoạch tự quản lý theo kinh nghiệm cá nhân. Dữ liệu đơn hàng, tồn kho, tình trạng máy móc nằm rải rác trên nhiều file khác nhau giữa các bộ phận (kế hoạch, kho, sản xuất), thường xuyên lệch phiên bản và không ai chịu trách nhiệm là "bản đúng nhất". Hệ quả là ban lãnh đạo không có một nguồn dữ liệu thống nhất, đáng tin cậy để theo dõi và ra quyết định kịp thời. Cụ thể, cách làm này tồn tại các vấn đề:

- Dữ liệu phân mảnh, thiếu kiểm soát: mỗi bộ phận tự giữ một bản Excel riêng, không có cơ chế đồng bộ hay lịch sử thay đổi, dẫn đến sai lệch số liệu và mất nhiều thời gian đối chiếu thủ công mỗi khi cần báo cáo.
- Mang tính "hộp đen": ngay cả khi có số liệu, ban lãnh đạo cũng không nắm được logic đằng sau các quyết định lập lịch, vì toàn bộ nằm trong kinh nghiệm cá nhân của người lập kế hoạch chứ không được hệ thống hoá.
- Khó điều chỉnh nhanh khi có đơn hàng gấp chen ngang lịch đã lập, vì mọi thay đổi đều phải dò và sửa tay trên file Excel.
- Phụ thuộc kinh nghiệm cá nhân, khó chuẩn hoá và mở rộng khi quy mô tăng, dễ đứt gãy khi nhân sự chủ chốt nghỉ việc hoặc luân chuyển.
- Khó cân bằng đồng thời nhiều ràng buộc: số máy giới hạn (điểm nghẽn), thời gian chuyển đổi giữa các loại sản phẩm, máy chuyên dụng theo loại sản phẩm, số lượng lô sản xuất tối thiểu, bảo trì khuôn định kỳ, quản lý tồn kho, và đảm bảo máy đã bật phải được tận dụng tối đa (tránh lãng phí điện năng và nhân công đứng chờ).

### 1.2. Phát biểu bài toán

Thiết kế một tác nhân lập lịch sản xuất có khả năng:

1. Tự động sinh lịch sản xuất tối ưu hoặc gần tối ưu dựa trên đơn hàng và ràng buộc thực tế của nhà máy.
2. Giải thích được lý do đằng sau mỗi quyết định lập lịch, thay vì chỉ đưa ra kết quả cuối cùng, để ban lãnh đạo có thể giám sát, tin tưởng và can thiệp khi cần.
3. Phản ứng linh hoạt với các sự kiện gián đoạn ngoài kế hoạch (đơn hàng gấp, máy hỏng) bằng cách giải lại lịch và so sánh với lịch gốc để thấy rõ tác động.
4. Tối đa hoá hiệu suất sử dụng máy trong mỗi khung ca đã được kích hoạt, giảm thiểu lãng phí nhân công và năng lượng.

### 1.3. Phạm vi

- Dữ liệu chủ: thiết kế dữ liệu nền có cấu trúc cho hệ thống gồm danh mục máy, danh mục sản phẩm, thời gian xử lý theo từng công đoạn/sản phẩm/máy, khả năng xử lý của từng máy theo loại sản phẩm, ma trận thời gian chuyển đổi giữa các loại sản phẩm, quy mô lô tối thiểu theo công đoạn/sản phẩm, danh mục khuôn (gắn với máy/sản phẩm, tuổi thọ sử dụng, chu kỳ bảo trì), ca làm việc và định mức chi phí nhân công theo ca.
- Dữ liệu giao dịch: đơn hàng (mã sản phẩm, số lượng, hạn giao hàng), nguồn dữ liệu đầu vào cho ràng buộc hạn giao hàng cũng như cho phần lập kế hoạch và lập lịch bên dưới.
- Lập kế hoạch sản xuất (theo quý/tháng): tổng hợp đơn hàng đổ về theo quý/tháng thành kế hoạch sản xuất theo từng giai đoạn ngắn hơn (2 tuần), làm đầu vào cho phần lập lịch sản xuất, đúng với quy trình thực tế (đơn hàng → lập kế hoạch → lập lịch). Xử lý ở mức tổng hợp nhu cầu, không cần một mô hình tối ưu riêng như phần lập lịch.
- Lập lịch sản xuất chi tiết cho một dây chuyền sản xuất đơn giản hoá (bánh sau / bánh trước), tập trung các công đoạn chính: đúc → gia công CNC → sơn → kiểm tra chất lượng.
- Phần giải thích quyết định đi kèm mỗi lịch được sinh ra.
- Ràng buộc/mục tiêu tối ưu hoá hiệu suất sử dụng máy khi đã bật (chi tiết ở mục 2.3).
- Quản lý tồn kho là một phần của dữ liệu chủ (tồn đầu kỳ và ngưỡng an toàn theo từng loại sản phẩm), dùng làm ràng buộc đầu vào cho lịch sản xuất ở mức vừa đủ (không đi sâu tối ưu tồn kho như một bài toán độc lập).

## 2. Hướng tiếp cận giải quyết bài toán

### 2.1. Mô hình hoá bài toán

Vì chỉ một tập con máy được phép xử lý mỗi loại sản phẩm (không phải máy nào cũng làm được mọi việc), bài toán được mô hình hoá dưới dạng bài toán lập lịch phân xưởng linh hoạt (Flexible Job-Shop Scheduling Problem), với các ràng buộc bổ sung:

| Ràng buộc | Mô tả |
|---|---|
| Trình tự công đoạn | Công đoạn sau chỉ bắt đầu khi công đoạn trước hoàn thành (đúc → CNC → sơn → kiểm tra chất lượng) |
| Giới hạn công suất máy | Một máy chỉ xử lý một công đoạn tại một thời điểm |
| Khả năng xử lý theo máy | Chỉ một tập con máy được phép xử lý một loại sản phẩm nhất định |
| Thời gian chuyển đổi phụ thuộc trình tự | Thời gian chuyển đổi phụ thuộc cặp loại sản phẩm liền kề (A↔B) |
| Quy mô lô tối thiểu | Một số công đoạn không hiệu quả nếu chạy dưới ngưỡng số lượng nhất định |
| Chu kỳ bảo trì | Khuôn có tuổi thọ sử dụng, sau N lần đúc phải nghỉ bảo trì |
| Hạn giao hàng | Mỗi đơn hàng có hạn giao hàng, vi phạm bị phạt (trễ hạn) |
| Tồn kho an toàn | Sản lượng tích luỹ đến cuối mỗi giai đoạn phải đủ bù ngưỡng tồn kho an toàn theo từng loại sản phẩm |
| Hiệu suất sử dụng máy | Khi máy đã bật (mở ca), phải tối thiểu hoá thời gian nhàn rỗi giữa các công đoạn |

Hàm mục tiêu (đa mục tiêu có trọng số): tối thiểu hoá tổng có trọng số của: makespan (thời điểm hoàn thành đơn hàng cuối cùng), độ trễ giao hàng, thời gian chuyển đổi giữa các loại sản phẩm, thời gian máy nhàn rỗi, và mức thiếu hụt so với ngưỡng tồn kho an toàn.

### 2.2. Thuật toán lập lịch chính: Quy hoạch ràng buộc (CP-SAT)

Sử dụng bộ giải CP-SAT của Google OR-Tools làm công cụ giải chính, vì:

- Xử lý tốt các ràng buộc cứng như trên với hàng nghìn biến, thời gian giải hợp lý cho quy mô đồ án.
- Mỗi công đoạn được biểu diễn bằng một biến khoảng thời gian (gồm thời điểm bắt đầu, thời lượng, thời điểm kết thúc); ràng buộc không chồng lấn đảm bảo máy không xử lý hai công đoạn cùng lúc.
- Lời giải có thể chứng minh là tối ưu (hoặc biết được khoảng cách với lời giải tối ưu) → dễ đánh giá, so sánh trong báo cáo.
- CP-SAT không có sẵn "giá trị đối ngẫu" (shadow price) như quy hoạch tuyến tính, nhưng có thể suy ra ràng buộc nào đang giới hạn lời giải bằng cách nới lỏng từng ràng buộc rồi giải lại và so sánh mức cải thiện mục tiêu → đây là nguyên liệu cho phần phân tích độ nhạy ở mục 2.4 (đổi lại chi phí là phải giải lại nhiều lần).

Hạn chế: Với bài toán động (đơn hàng gấp chen ngang), giải lại từ đầu có thể tốn thời gian nếu quy mô bài toán lớn → cần chiến lược lập kế hoạch cuốn chiếu hoặc khởi tạo nóng từ lời giải trước để giải nhanh hơn khi có sự kiện gián đoạn.

### 2.3. Ràng buộc tối ưu hoá hiệu suất sử dụng máy

Một yêu cầu nghiệp vụ quan trọng: một khi máy đã bật (mở ca, có nhân công trực), phải tận dụng tối đa thời gian đó bằng công việc thực, tránh lãng phí điện năng và chi phí nhân công đứng chờ.

**Cách tích hợp vào mô hình:**

1. Thêm số hạng phạt thời gian nhàn rỗi vào hàm mục tiêu, đo tổng khoảng trống giữa các công đoạn liên tiếp trên mỗi máy, trong khung thời gian máy đã được bật.
2. Thêm biến quyết định nhị phân "có nên bật máy trong ca này không?", nếu bật mà không gán đủ công việc để đạt hiệu suất sử dụng mục tiêu thì bị phạt trong hàm mục tiêu (ràng buộc mềm, không bắt buộc cứng để tránh bài toán trở nên bất khả thi khi không đủ đơn hàng lấp ca); nếu không đủ việc, bộ giải có thể chọn không bật máy đó (tiết kiệm chi phí nhân công).
3. Ràng buộc này liên kết trực tiếp với quy mô lô tối thiểu: nếu một máy sắp phải bật cho một công việc nhỏ lẻ không lấp đầy được ca, bộ giải nên ưu tiên dồn/hoãn công việc để gộp lô, miễn không vi phạm hạn giao hàng, đây là sự đánh đổi giữa hiệu suất sử dụng máy và độ trễ giao hàng, cần thể hiện rõ qua trọng số trong hàm mục tiêu.

### 2.4. Lớp giải thích

- Phân tích độ nhạy: nới lỏng từng ràng buộc và đo mức cải thiện tổng thời gian hoàn thành → xác định điểm nghẽn chính.
- Phân tích đường găng (critical path): xác định chuỗi công đoạn quyết định tổng thời gian hoàn thành → giải thích "vì sao công việc X trễ".
- Giải thích phản thực (counterfactual): trả lời "nếu chèn đơn gấp Y, công việc nào bị đẩy lùi và trễ bao lâu", thực hiện bằng cách thêm ràng buộc/đơn hàng giả định rồi giải lại, so sánh với lịch gốc.
- Báo cáo hiệu suất sử dụng máy: giải thích vì sao một máy đạt/không đạt hiệu suất mục tiêu trong ca, gợi ý gộp ca hoặc điều thêm đơn hàng.

### 2.5. Kiểm chứng

So sánh kết quả của tác nhân với: (a) lịch thủ công mô phỏng theo quy tắc điều độ kinh nghiệm thường dùng trong ngành (ví dụ FIFO, EDD, ưu tiên hạn giao gần nhất, SPT — ưu tiên thời gian xử lý ngắn nhất), (b) bộ dữ liệu chuẩn công khai cho bài toán lập lịch phân xưởng (bộ Taillard, Lawrence trong OR-Library) để kiểm chứng riêng phần lõi thuật toán (tối ưu makespan) không bị lệch do dùng dữ liệu tổng hợp tự sinh, lưu ý các bộ chuẩn này không có sẵn ràng buộc đặc thù của đề tài (thời gian chuyển đổi, lô tối thiểu, bảo trì, hiệu suất máy) nên chỉ dùng để đối chứng phần lõi, không thay thế được việc kiểm thử trên dữ liệu tổng hợp riêng.


## 3. Nguồn dữ liệu dự kiến sử dụng

Vì không tiếp cận được dữ liệu thật của nhà máy, đề tài sử dụng dữ liệu tổng hợp được xây dựng theo 2 nguồn tham chiếu:

1. Ràng buộc nghiệp vụ thực tế (rút ra từ hiểu biết về quy trình sản xuất bánh xe): số lượng máy theo từng công đoạn, thời gian chuyển đổi ước lượng, quy mô lô tối thiểu, chu kỳ bảo trì khuôn, tỷ lệ đơn hàng gấp phát sinh, dùng để tham số hoá bộ sinh dữ liệu tổng hợp sao cho phản ánh đúng đặc điểm ngành.
2. Bộ dữ liệu chuẩn công khai cho bài toán lập lịch phân xưởng (bộ Taillard, Lawrence trong OR-Library), dùng để kiểm chứng rằng phần lõi thuật toán lập lịch hoạt động đúng và có thể so sánh chất lượng lời giải với các nghiên cứu khác trong lĩnh vực.

Quy trình sinh dữ liệu: Xây dựng bộ sinh dữ liệu có thể điều chỉnh tham số (số máy, số công việc, phân phối thời gian xử lý, tần suất đơn gấp) để tạo ra nhiều kịch bản kiểm thử khác nhau, đảm bảo đánh giá được độ ổn định của tác nhân trong nhiều tình huống.

## 4. Tiêu chí đánh giá thành công

- Lịch sinh ra hợp lệ về mặt vật lý 100% (không vi phạm tồn kho, công suất máy, trình tự công đoạn) trên mọi kịch bản kiểm thử.
- Hiệu suất sử dụng máy trong các ca đã bật đạt mục tiêu đề ra (ví dụ ≥ 90%), có thể hiện cải thiện rõ so với kịch bản không có ràng buộc này.
- Mỗi lịch sinh ra đều có giải thích tương ứng (điểm nghẽn, đường găng, tác động khi giả lập đơn gấp/máy hỏng) mà nhà quản lý có thể đọc hiểu mà không cần biết CP-SAT là gì.
- Thời gian giải nằm trong ngưỡng chấp nhận được cho một phiên làm việc, có cảnh báo rõ khi solver không kịp tìm lời giải tối ưu.
- Chất lượng lời giải trên bộ dữ liệu chuẩn công khai không thua kém đáng kể so với kết quả tốt nhất đã công bố cho phần lõi thuật toán.


## Tài liệu tham khảo

1. Taillard, E. (1993). Benchmarks for basic scheduling problems. *European Journal of Operational Research*, 64(2), 278–285.
2. Lawrence, S. (1984). *Resource constrained project scheduling: An experimental investigation of heuristic scheduling techniques*. GSIA, Carnegie Mellon University.
3. Beasley, J. E. (1990). OR-Library: Distributing test problems by electronic mail. *Journal of the Operational Research Society*, 41(11), 1069–1072.
4. Google OR-Tools — CP-SAT Solver. https://developers.google.com/optimization