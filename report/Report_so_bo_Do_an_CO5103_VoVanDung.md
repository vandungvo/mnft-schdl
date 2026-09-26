# Báo cáo sơ bộ: Đồ án Hệ thống thông tin quản lý (CO5103)

**Học viên:** Võ Văn Dũng
**Chương trình:** Cao học ngành Hệ thống thông tin quản lý
**Học kỳ:** HK261
**GVHD:** PGS.TS Võ Thị Ngọc Châu

## 1. Đề xuất bài toán cụ thể

Tên đề tài đề xuất: Xây dựng tác nhân lập lịch sản xuất tạo ra lịch hợp lý, ứng dụng trong ngành sản xuất linh kiện, trường hợp nghiên cứu: sản xuất bánh xe.

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
2. Tạo ra lịch sản xuất hợp lý — tuân thủ đầy đủ ràng buộc vật lý/nghiệp vụ của nhà máy, cân đối có căn cứ giữa các mục tiêu cạnh tranh (hạn giao, hiệu suất máy, tồn kho), để ban lãnh đạo có thể tin tưởng sử dụng mà không cần rà tay lại.
3. Phản ứng linh hoạt với các sự kiện gián đoạn ngoài kế hoạch (đơn hàng gấp, máy hỏng) bằng cách giải lại lịch và so sánh với lịch gốc để thấy rõ tác động.
4. Tối đa hoá hiệu suất sử dụng máy trong mỗi khung ca đã được kích hoạt, giảm thiểu lãng phí nhân công và năng lượng.

### 1.3. Phạm vi

- Dữ liệu chủ: thiết kế dữ liệu nền có cấu trúc cho hệ thống gồm danh mục máy, danh mục sản phẩm, thời gian xử lý theo từng công đoạn/sản phẩm/máy, khả năng xử lý của từng máy theo loại sản phẩm, ma trận thời gian chuyển đổi giữa các loại sản phẩm, quy mô lô tối thiểu theo công đoạn/sản phẩm, danh mục khuôn (gắn với máy/sản phẩm, tuổi thọ sử dụng, chu kỳ bảo trì), ca làm việc và định mức chi phí nhân công theo ca.
- Dữ liệu giao dịch: đơn hàng (mã sản phẩm, số lượng, hạn giao hàng), nguồn dữ liệu đầu vào cho ràng buộc hạn giao hàng cũng như cho phần lập kế hoạch và lập lịch bên dưới.
- Lập kế hoạch sản xuất (theo quý/tháng): tổng hợp đơn hàng đổ về theo quý/tháng thành kế hoạch sản xuất theo từng giai đoạn ngắn hơn (2 tuần), làm đầu vào cho phần lập lịch sản xuất, đúng với quy trình thực tế (đơn hàng → lập kế hoạch → lập lịch) — mô hình **hierarchical production planning** kinh điển trong OR (Hax & Meal, 1975, tài liệu tham khảo số 16). Xử lý ở mức tổng hợp nhu cầu, không cần một mô hình tối ưu riêng như phần lập lịch.
- Lập lịch sản xuất chi tiết cho một dây chuyền sản xuất đơn giản hoá (bánh sau / bánh trước), tập trung các công đoạn chính: đúc → gia công CNC → sơn → kiểm tra chất lượng.
- Phần diễn giải quyết định (phụ trợ, không bắt buộc) đi kèm mỗi lịch được sinh ra.
- Ràng buộc/mục tiêu tối ưu hoá hiệu suất sử dụng máy khi đã bật (chi tiết ở mục 2.3).
- Quản lý tồn kho là một phần của dữ liệu chủ (tồn đầu kỳ và ngưỡng an toàn theo từng loại sản phẩm), dùng làm ràng buộc đầu vào cho lịch sản xuất ở mức vừa đủ (không đi sâu tối ưu tồn kho như một bài toán độc lập).

## 2. Hướng tiếp cận giải quyết bài toán

### 2.1. Mô hình hoá bài toán

Vì chỉ một tập con máy được phép xử lý mỗi loại sản phẩm (không phải máy nào cũng làm được mọi việc), bài toán được mô hình hoá dưới dạng bài toán lập lịch phân xưởng linh hoạt (Flexible Job-Shop Scheduling Problem — theo phân loại của bài tổng quan FJSP toàn diện nhất hiện có, Dauzère-Pérès, Ding, Shen & Tamssaouet, 2024, tài liệu tham khảo số 12), với các ràng buộc bổ sung:

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

Hạn chế: Với bài toán động (đơn hàng gấp chen ngang), giải lại từ đầu có thể tốn thời gian nếu quy mô bài toán lớn → cần chiến lược lập kế hoạch cuốn chiếu hoặc khởi tạo nóng từ lời giải trước để giải nhanh hơn khi có sự kiện gián đoạn — hướng cụ thể đã có tiền lệ trong tài liệu: dùng mô hình học máy để quyết định biến nào không cần giải lại giữa các chu kỳ rolling-horizon (Li, Ouyang, Ma & Wu, 2025, tài liệu tham khảo số 13).

### 2.3. Ràng buộc tối ưu hoá hiệu suất sử dụng máy

Một yêu cầu nghiệp vụ quan trọng: một khi máy đã bật (mở ca, có nhân công trực), phải tận dụng tối đa thời gian đó bằng công việc thực, tránh lãng phí điện năng và chi phí nhân công đứng chờ.

**Cách tích hợp vào mô hình:**

1. Thêm số hạng phạt thời gian nhàn rỗi vào hàm mục tiêu, đo tổng khoảng trống giữa các công đoạn liên tiếp trên mỗi máy, trong khung thời gian máy đã được bật.
2. Thêm biến quyết định nhị phân "có nên bật máy trong ca này không?", nếu bật mà không gán đủ công việc để đạt hiệu suất sử dụng mục tiêu thì bị phạt trong hàm mục tiêu (ràng buộc mềm, không bắt buộc cứng để tránh bài toán trở nên bất khả thi khi không đủ đơn hàng lấp ca); nếu không đủ việc, bộ giải có thể chọn không bật máy đó (tiết kiệm chi phí nhân công).
3. Ràng buộc này liên kết trực tiếp với quy mô lô tối thiểu: nếu một máy sắp phải bật cho một công việc nhỏ lẻ không lấp đầy được ca, bộ giải nên ưu tiên dồn/hoãn công việc để gộp lô, miễn không vi phạm hạn giao hàng, đây là sự đánh đổi giữa hiệu suất sử dụng máy và độ trễ giao hàng, cần thể hiện rõ qua trọng số trong hàm mục tiêu.

### 2.4. Lớp diễn giải hỗ trợ (không phải mục tiêu cốt lõi)

Ngoài mục tiêu chính là tạo ra lịch hợp lý (mục 1.2), tác nhân giữ lại một số tính năng diễn giải phụ trợ — tận dụng sẵn CP-SAT (không tốn thêm nhiều effort) để tăng độ tin cậy khi ban lãnh đạo cần tham khảo lý do, không bắt buộc phải "trong suốt hoàn toàn":

- Phân tích độ nhạy: nới lỏng từng ràng buộc và đo mức cải thiện tổng thời gian hoàn thành → xác định điểm nghẽn chính. Phương pháp gần trùng khớp nhất tìm được trong tài liệu: nới lỏng ràng buộc để xác định điểm nghẽn trong bài toán lập lịch có ràng buộc tài nguyên (Nedbálek & Novák, 2025 — ICORES, tài liệu tham khảo số 15).
- Phân tích đường găng (critical path): xác định chuỗi công đoạn quyết định tổng thời gian hoàn thành → giải thích "vì sao công việc X trễ". Phương pháp gốc: Kelley & Walker (1959), tài liệu tham khảo số 14.
- Giải thích phản thực (counterfactual): trả lời "nếu chèn đơn gấp Y, công việc nào bị đẩy lùi và trễ bao lâu", thực hiện bằng cách thêm ràng buộc/đơn hàng giả định rồi giải lại, so sánh với lịch gốc.
- Báo cáo hiệu suất sử dụng máy: giải thích vì sao một máy đạt/không đạt hiệu suất mục tiêu trong ca, gợi ý gộp ca hoặc điều thêm đơn hàng.

### 2.5. Kiểm chứng

So sánh kết quả của tác nhân với: (a) lịch thủ công mô phỏng theo quy tắc điều độ kinh nghiệm thường dùng trong ngành (ví dụ FIFO, EDD, ưu tiên hạn giao gần nhất, SPT — ưu tiên thời gian xử lý ngắn nhất), (b) bộ dữ liệu chuẩn công khai cho bài toán lập lịch phân xưởng (bộ Taillard, Lawrence trong OR-Library) để kiểm chứng riêng phần lõi thuật toán (tối ưu makespan) không bị lệch do dùng dữ liệu tổng hợp tự sinh, lưu ý các bộ chuẩn này không có sẵn ràng buộc đặc thù của đề tài (thời gian chuyển đổi, lô tối thiểu, bảo trì, hiệu suất máy) nên chỉ dùng để đối chứng phần lõi, không thay thế được việc kiểm thử trên dữ liệu tổng hợp riêng, và (c) bộ benchmark FJSP công khai có sẵn ràng buộc setup time phụ thuộc trình tự theo họ sản phẩm (Deliktaş, Özcan, Üstün & Torkul, 2024 — *Data in Brief*, 43 instance, xem tài liệu tham khảo số 10), bổ khuyết cho hạn chế của (b) trên đúng ràng buộc "ma trận chuyển đổi" của đề tài.

### 2.6. Vị trí của đề tài so với các công trình liên quan

Rà soát tài liệu gần đây (2020–2025) về explainable scheduling, XAI áp dụng cho job-shop/flexible job-shop scheduling, và giải thích phản thực cho quyết định tối ưu hoá, cho kết quả đối sánh sau:

| Nghiên cứu | Loại bài toán | Thuật toán/phương pháp | Ràng buộc đặc thù | Khả năng giải thích | Xử lý gián đoạn động | Dữ liệu dùng |
|---|---|---|---|---|---|---|
| Wang & Chen 2024 (ESWA) | JSP (bán dẫn) | GA + hậu xử lý XAI (decision tree, contribution diagram) | Không | Có — diễn giải sau khi giải, không phải phản thực | Không | Tổng hợp mô phỏng |
| Wang & Chen 2025 (sách) | JSP tổng quát | GA + các thuật toán bio-inspired khác | Không đặc thù ngành | Có — khung XAI hệ thống | Không | Minh hoạ tổng hợp |
| Mehdiyev et al. 2024 (Cognitive Computation) | JSP (dự đoán quy trình + tối ưu) | Predictive process monitoring + NSGA-II | Không | Có — phản thực đa mục tiêu | Ngầm định (kịch bản what-if) | Log quy trình thực tế |
| Cheng et al. 2024 (IEEE Access, FJSP-MRST) | FJSP + tài nguyên khuôn | Differential evolution đa mục tiêu (MODE) + chèn kép mold-machine | Có — setup phụ thuộc khuôn | Không | Không | Tổng hợp |
| Lan & Berkhout 2025 (PyJobShop) | FJSP/JSP/RCPSP tổng quát | CP-SAT & CP Optimizer (đối chứng thực nghiệm) | Tổng quát, không đặc thù | Không | Không | >9.000 instance benchmark công khai |
| Deliktaş et al. 2024 (Data in Brief) | FJSP cellular + setup theo họ SP | Không quy định thuật toán (bộ dữ liệu) | Có — setup phụ thuộc trình tự theo họ | Không | Không | 43 instance chuẩn công khai |
| Mota et al. 2020 (Zenodo) | Lập lịch dây chuyền thực tế + năng lượng | GA | Có — dữ liệu năng lượng thực | Không | Không | Dữ liệu thực (nhà máy dệt may) |
| **Đề tài này (Dũng, 2026)** | FJSP 4 công đoạn (đúc→CNC→sơn→QC), 2 tầng planning/scheduling | CP-SAT (OR-Tools) | **Có đủ:** setup phụ thuộc trình tự, lô tối thiểu, bảo trì khuôn, tồn kho an toàn, hiệu suất sử dụng máy | **Có:** đường găng + độ nhạy + phản thực (đơn gấp/máy hỏng) + báo cáo hiệu suất máy | **Có:** đơn gấp + máy hỏng, giải lại và so lịch gốc | Tổng hợp tham số hoá theo thực tế + đối chứng lõi trên Taillard/Lawrence/Deliktaş et al. |

**Nhận định:** chưa tìm thấy công trình nào kết hợp đủ cả 3 trục — bộ ràng buộc đặc thù ngành sản xuất linh kiện, khả năng giải thích, và xử lý gián đoạn động — trong cùng một hệ thống. Mỗi công trình chỉ mạnh ở một trục: FJSP-MRST xử lý tốt ràng buộc khuôn nhưng không giải thích; Mehdiyev et al. giải thích phản thực tốt nhưng không có ràng buộc sản xuất đặc thù; Wang & Chen mạnh về khung XAI nhưng dùng GA và không xử lý gián đoạn động. Đề tài này vẫn giữ được cả 3 năng lực trên (bảng), nhưng sau khi tái định hướng mục tiêu chính sang **lịch hợp lý** (mục 1.2), khả năng giải thích không còn là trục khác biệt hoá bắt buộc — nó là một điểm cộng phụ trợ có sẵn nhờ dùng CP-SAT, không phải lý do chọn phương pháp.

## 3. Nguồn dữ liệu dự kiến sử dụng

Vì không tiếp cận được dữ liệu thật của nhà máy, đề tài sử dụng dữ liệu tổng hợp được xây dựng theo 3 nguồn tham chiếu:

1. Ràng buộc nghiệp vụ thực tế (rút ra từ hiểu biết về quy trình sản xuất bánh xe): số lượng máy theo từng công đoạn, thời gian chuyển đổi ước lượng, quy mô lô tối thiểu, chu kỳ bảo trì khuôn, tỷ lệ đơn hàng gấp phát sinh, dùng để tham số hoá bộ sinh dữ liệu tổng hợp sao cho phản ánh đúng đặc điểm ngành. Riêng thời gian tác vụ và mức tiêu thụ năng lượng theo máy được đối chiếu với dữ liệu thực đo tại một dây chuyền sản xuất (Mota et al., 2020 — tài liệu tham khảo số 11) để tránh tham số hoá hoàn toàn chủ quan.
2. Bộ dữ liệu chuẩn công khai cho bài toán lập lịch phân xưởng (bộ Taillard, Lawrence trong OR-Library), dùng để kiểm chứng rằng phần lõi thuật toán lập lịch hoạt động đúng và có thể so sánh chất lượng lời giải với các nghiên cứu khác trong lĩnh vực.
3. Bộ benchmark FJSP công khai có ràng buộc setup time phụ thuộc trình tự theo họ sản phẩm (Deliktaş et al., 2024 — tài liệu tham khảo số 10), dùng bổ sung cho (2) vì Taillard/Lawrence không có ràng buộc đặc thù này (xem mục 2.5).

Đã kiểm tra thêm các nguồn dữ liệu mở theo góp ý của GVHD: **data.gov** và **data.gov.vn** không có dataset cấp máy/công đoạn/đơn hàng phù hợp với bài toán (chủ yếu là chỉ số vĩ mô/năng lực sản xuất, không đủ chi tiết để làm input mô hình); một số dataset JSP tổng hợp trên **Kaggle** được ghi nhận nhưng chưa kiểm chứng đủ nội dung để đưa vào chính thức. Kết luận: dữ liệu tổng hợp tự sinh (tham số hoá theo (1)) vẫn là nguồn chính, được đối chứng bằng benchmark công khai (2)+(3).

Đã kiểm tra thêm **tài liệu học thuật tiếng Việt** về lập lịch sản xuất/phân xưởng: không tìm thấy công trình tiếng Việt nào giải cùng bài toán (đa máy, ràng buộc chuyển đổi/bảo trì/hiệu suất máy). Có 1 luận án tiến sĩ cùng trường (Trang, 2021 — tài liệu tham khảo số 19, ĐH Bách Khoa – ĐHQG-HCM) nhưng giải bài toán khác (lập lịch cá nhân, 1 máy) — chỉ dùng làm bằng chứng cho tiền lệ nghiên cứu lập lịch chất lượng quốc tế tại trường, không phải công trình liên quan trực tiếp.

Quy trình sinh dữ liệu: Xây dựng bộ sinh dữ liệu có thể điều chỉnh tham số (số máy, số công việc, phân phối thời gian xử lý, tần suất đơn gấp) để tạo ra nhiều kịch bản kiểm thử khác nhau, đảm bảo đánh giá được độ ổn định của tác nhân trong nhiều tình huống.

## 4. Tiêu chí đánh giá thành công

- Lịch sinh ra hợp lệ về mặt vật lý 100% (không vi phạm tồn kho, công suất máy, trình tự công đoạn) trên mọi kịch bản kiểm thử.
- Hiệu suất sử dụng máy trong các ca đã bật đạt mục tiêu đề ra (ví dụ ≥ 90%), có thể hiện cải thiện rõ so với kịch bản không có ràng buộc này.
- (Phụ trợ) Mỗi lịch sinh ra có thể tra cứu diễn giải tương ứng (điểm nghẽn, đường găng, tác động khi giả lập đơn gấp/máy hỏng) mà nhà quản lý có thể đọc hiểu mà không cần biết CP-SAT là gì — không phải điều kiện thành công bắt buộc như 4 tiêu chí trên/dưới.
- Thời gian giải nằm trong ngưỡng chấp nhận được cho một phiên làm việc, có cảnh báo rõ khi solver không kịp tìm lời giải tối ưu.
- Chất lượng lời giải trên bộ dữ liệu chuẩn công khai không thua kém đáng kể so với kết quả tốt nhất đã công bố cho phần lõi thuật toán.


## Tài liệu tham khảo

1. Taillard, E. (1993). Benchmarks for basic scheduling problems. *European Journal of Operational Research*, 64(2), 278–285.
2. Lawrence, S. (1984). *Resource constrained project scheduling: An experimental investigation of heuristic scheduling techniques*. GSIA, Carnegie Mellon University.
3. Beasley, J. E. (1990). OR-Library: Distributing test problems by electronic mail. *Journal of the Operational Research Society*, 41(11), 1069–1072.
4. Google OR-Tools — CP-SAT Solver. https://developers.google.com/optimization
5. Wang, Y. C., & Chen, T. (2024). Adapted techniques of explainable artificial intelligence for explaining genetic algorithms on the example of job scheduling. *Expert Systems with Applications*, 237, 121369. https://doi.org/10.1016/j.eswa.2023.121369
6. Wang, Y. C., & Chen, T. (2025). *Explainable and Customizable Job Sequencing and Scheduling: Advancing Production Control and Management with XAI*. Springer. https://link.springer.com/book/9783031853739
7. Mehdiyev, N., Majlatow, M., & Fettke, P. (2024). Counterfactual Explanations in the Big Picture: An Approach for Process Prediction-Driven Job-Shop Scheduling Optimization. *Cognitive Computation*. https://doi.org/10.1007/s12559-024-10294-0
8. Cheng, Y., Xie, Z., Xin, Y., Chen, K., & Zarei, R. (2024). Flexible Job Shop Scheduling Method for Optimizing Mold Resource Setup Time. *IEEE Access*, 12, 33486–33503. https://doi.org/10.1109/ACCESS.2024.3372396
9. Lan, L., & Berkhout, J. (2025). PyJobShop: Solving scheduling problems with constraint programming in Python. *arXiv:2502.13483*. https://arxiv.org/abs/2502.13483
10. Deliktaş, D., Özcan, E., Üstün, Ö., & Torkul, O. (2024). A benchmark dataset for multi-objective flexible job shop cell scheduling. *Data in Brief*, 52. https://www.sciencedirect.com/science/article/pii/S2352340923009770 (dataset: https://data.mendeley.com/datasets/rtzby7pv7m/1)
11. Mota, B., Gomes, L., Faria, P., Ramos, C., & Vale, Z. (2020). Production line dataset for task scheduling and energy optimization – Schedule Optimization (v0.1) [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.4106746
12. Dauzère-Pérès, S., Ding, J., Shen, L., & Tamssaouet, K. (2024). The flexible job shop scheduling problem: A review. *European Journal of Operational Research*, 314(2), 409–432. https://doi.org/10.1016/j.ejor.2023.05.017
13. Li, S., Ouyang, W., Ma, Y., & Wu, C. (2025). Learning-Guided Rolling Horizon Optimization for Long-Horizon Flexible Job-Shop Scheduling. *arXiv:2502.15791*. https://arxiv.org/abs/2502.15791
14. Kelley, J. E., & Walker, M. R. (1959). Critical-path planning and scheduling. In *Papers presented at the December 1–3, 1959, eastern joint IRE-AIEE-ACM computer conference (IRE-AIEE-ACM '59, Eastern)*, ACM Press, 160–173. https://doi.org/10.1145/1460299.1460318
15. Nedbálek, L., & Novák, A. (2025). Bottleneck Identification in Resource-Constrained Project Scheduling via Constraint Relaxation. In *Proceedings of the 14th International Conference on Operations Research and Enterprise Systems (ICORES 2025)*. https://arxiv.org/abs/2504.07495
16. Hax, A. C., & Meal, H. C. (1975). Hierarchical integration of production planning and scheduling. In M. A. Geisler (Ed.), *Studies in Management Sciences, Vol. 1: Logistics* (pp. 53–69). North-Holland/American Elsevier.
17. De Bock, K. W., Coussement, K., De Caigny, A., Słowiński, R., Baesens, B., Boute, R. N., Choi, T. M., Delen, D., Kraus, M., Lessmann, S., Maldonado, S., Martens, D., Óskarsdóttir, M., Vairetti, C., Verbeke, W., & Weber, R. (2024). Explainable AI for Operational Research: A defining framework, methods, applications, and a research agenda. *European Journal of Operational Research*, 317(2). https://doi.org/10.1016/j.ejor.2023.09.026
18. Garn, W., & Amirghasemi, M. (2025). Transparency of combinatorial optimisations via machine learning and explainable AI. *Annals of Operations Research*, 354, 427–458. https://doi.org/10.1007/s10479-025-06684-8
19. Trang, H. S. (2021). *Một số phương pháp tiếp cận cho bài toán lập lịch cá nhân* [Luận án Tiến sĩ]. Trường Đại học Bách Khoa – ĐHQG-HCM. https://grad.hcmut.edu.vn/hv/download/LATS/8140009/TOM_TAT_LATS_THSon.pdf