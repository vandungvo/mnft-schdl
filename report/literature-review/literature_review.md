# Tổng quan nghiên cứu về lập lịch sản xuất và định hướng cho đồ án CO5103

**Phiên bản:** 1.0 — 19/09/2026.  
**Đề tài:** Xây dựng tác nhân lập lịch sản xuất tạo ra lịch hợp lý, ứng dụng trong sản xuất linh kiện bánh xe.  
**Phạm vi áp dụng:** [Yêu cầu bài toán ngày 19/09/2026](../problem-requirements/problem_requirements.md), gồm bổ sung **3 ca/ngày, mỗi ca danh nghĩa 8 giờ**.  
**Tính chất:** tổng quan có chọn lọc và phân tích phê bình; chưa phải báo cáo kết quả thực nghiệm của đồ án.

## 1. Mục tiêu và phương pháp rà soát

Tổng quan này xác định cơ sở học thuật cho việc mô hình hóa, lựa chọn phương pháp giải và đánh giá hệ thống lập lịch của đồ án. Nội dung tổng hợp ba bản nháp trước, kiểm tra lại nguồn gốc trích dẫn và bổ sung nghiên cứu về bảo trì, tái lập lịch và nghiên cứu tiếng Việt. Những kết luận thiết kế được tách khỏi kết quả do tác giả các công trình công bố.

Việc rà soát tập trung vào năm câu hỏi:

1. Quy trình đúc → CNC → sơn → QC thuộc lớp bài toán nào và cần mở rộng những ràng buộc gì?
2. Các phương pháp CP, heuristic, metaheuristic và học máy hỗ trợ bài toán đến mức nào?
3. Cách xử lý ca làm việc, khuôn, bảo trì và gián đoạn nào phù hợp với phạm vi đồ án?
4. Những bộ dữ liệu nào dùng được để kiểm chứng lõi thuật toán và nghiệp vụ mở rộng?
5. Đóng góp nào có thể khẳng định và cần thực nghiệm gì để chứng minh?

Nguồn tra cứu gồm trang nhà xuất bản, kỷ yếu hội nghị, arXiv, kho lưu trữ đại học, tài liệu chính thức OR-Tools, OR-Library, Mendeley Data, Zenodo và trang tạp chí trong nước. Các nhóm từ khóa đã dùng gồm `flexible job shop review`, `hybrid flow shop`, `scheduling setup times`, `integrated production scheduling maintenance`, `rescheduling manufacturing systems`, `learning to dispatch`, `learning-guided rolling horizon`, `explainable scheduling`, `lập lịch sản xuất job shop` và `điều độ job-shop linh hoạt`. Ngày kiểm tra nguồn là 19/09/2026.

Ưu tiên tài liệu 2020–2026 cho các hướng hiện đại, đồng thời giữ nguồn nền tảng về phân loại, planning, benchmark và tái lập lịch. Chọn nguồn có định danh truy xuất được và liên quan trực tiếp đến ít nhất một câu hỏi trên. Nguồn chỉ liên quan đến lập lịch cá nhân, bài tập hoặc kho tài liệu không xác định được xuất xứ không được dùng làm bằng chứng cho lập lịch sản xuất.

Đây không phải tổng quan hệ thống theo PRISMA: không có tập kết quả tìm kiếm đóng, quy trình sàng lọc độc lập hay bảo đảm bao phủ mọi công trình. Không suy ra “không tồn tại nghiên cứu/dữ liệu” từ việc chưa tìm thấy. Với nguồn chỉ đọc được tóm tắt, kết luận giới hạn ở nội dung tóm tắt; mức tiếp cận được ghi trong danh mục tài liệu. Bản preprint và bản xuất bản của cùng nghiên cứu được xem là một công trình.

## 2. Cơ sở mô hình hóa

### 2.1. Phân biệt FJSP và hybrid flow shop

Tổng quan của Dauzère-Pérès và cộng sự bao quát FJSP, các tiêu chí tối ưu và ràng buộc mở rộng. Đây là cơ sở để xem lựa chọn máy, thứ tự và thời gian là những quyết định liên kết, thay vì chỉ sắp xếp một danh sách công việc. Công trình không xác lập một thuật toán tốt nhất cho mọi biến thể. [LR01](https://doi.org/10.1016/j.ejor.2023.05.017)

Ruiz và Vázquez-Rodríguez khảo sát hybrid flow shop, trong đó các công việc đi qua các tầng công nghệ có máy song song. Đối chiếu với yêu cầu hiện tại, khi mọi lô đều đi theo tuyến đúc → CNC → sơn → QC và máy chia theo công đoạn, trường hợp bánh xe có cấu trúc **hybrid/flexible flow shop với giới hạn máy đủ điều kiện**. Có thể dùng khung FJSP tổng quát để triển khai, nhưng điều kiện “mỗi công đoạn có nhiều máy để chọn” chưa đủ để gọi riêng cấu trúc này là job shop. Đây là suy luận phân loại từ tuyến công nghệ của đồ án. [LR02](https://doi.org/10.1016/j.ejor.2009.09.024)

### 2.2. Planning và scheduling

Hax và Meal trình bày cách tổ chức quyết định sản xuất theo cấp: quyết định tổng hợp tạo điều kiện cho quyết định chi tiết. Kho MIT có working paper năm 1973; cần phân biệt bản này với chương sách năm 1975 thường được trích trong tài liệu dự án. [LR03](https://dspace.mit.edu/handle/1721.1/1868)

Trong đồ án, áp dụng tư tưởng phân cấp bằng cách tổng hợp nhu cầu tháng/quý và chọn công việc cho horizon hai tuần. Tầng planning chưa cần một mô hình tối ưu riêng. Chia/gộp lô thực hiện trước scheduling, có lưu lượng phân bổ về từng đơn. Chọn horizon hai tuần và quy tắc tạo lô là quyết định phạm vi của đồ án, không phải thông số được nghiên cứu nền tảng xác nhận cho nhà máy bánh xe.

### 2.3. Định nghĩa “lịch hợp lý”

Theo yêu cầu dự án, một lịch được đưa ra sử dụng phải đáp ứng ràng buộc cứng, có KPI thể hiện chất lượng và đánh đổi, và vượt qua bộ kiểm tra độc lập. Ba thuộc tính cần phân biệt là:

| Thuộc tính | Bằng chứng cần có |
|---|---|
| Khả thi | Lịch tuân thủ mô hình nghiệp vụ và kiểm tra độc lập |
| Chất lượng | KPI, đối chứng và chính sách trọng số đã công bố |
| Tối ưu | Chứng cứ từ bộ giải/cận hợp lệ cho đúng mô hình và mục tiêu |

CP-SAT phân biệt `OPTIMAL`, `FEASIBLE`, `INFEASIBLE`, `UNKNOWN` và `MODEL_INVALID`. Hết thời gian không đồng nghĩa với vô nghiệm. Trạng thái giải chỉ nói về mô hình đã mã hóa; việc mô hình phản ánh đúng yêu cầu phải được kiểm tra riêng. [LR07](https://developers.google.com/optimization/cp/cp_solver)

Lịch do heuristic hoặc mô hình học sinh ra vẫn có thể khả thi và hữu ích. Khả năng giải thích chính sách, kiểm tra tính khả thi và chứng minh tối ưu là các vấn đề khác nhau; không dùng một thuộc tính thay thế cho hai thuộc tính còn lại.

## 3. Ràng buộc sản xuất và ý nghĩa đối với đồ án

### 3.1. Setup và khuôn dùng chung

Allahverdi phân loại nghiên cứu về setup theo môi trường máy, họ sản phẩm và quan hệ phụ thuộc trình tự. Nguồn này hỗ trợ việc khai báo setup tường minh thay vì gộp vào một hằng số xử lý cho mọi sản phẩm. [LR04](https://doi.org/10.1016/j.ejor.2015.04.004)

Cheng và cộng sự nghiên cứu FJSP có tài nguyên khuôn và tối ưu setup cùng makespan. Thuật toán nền là **tiến hóa vi phân đa mục tiêu cải tiến (MODE)**, có tích hợp kỹ thuật chèn và giải mã liên quan đến khuôn–máy. Nghiên cứu hỗ trợ cách xem khuôn là tài nguyên hữu hạn. Tuy nhiên, kỹ thuật cho phép thực hiện trước một phần đổi khuôn trong bài cần được đối chiếu với A04 của đồ án: setup chỉ bắt đầu khi bán thành phẩm sẵn sàng và nằm sát trước gia công. Không chuyển nguyên kỹ thuật này sang mô hình nếu khác ngữ nghĩa setup. [LR05](https://doi.org/10.1109/ACCESS.2024.3372396)

Yêu cầu A05/R05 bổ sung một vấn đề khác: bảo trì theo chu kỳ sử dụng khuôn. Setup khuôn và tuổi thọ khuôn không phải cùng ràng buộc. Bộ kiểm tra phải theo dõi từng khuôn vật lý, số chu kỳ đầu kỳ, sử dụng phát sinh và việc đặt lại bộ đếm sau bảo trì.

### 3.2. Bảo trì và gián đoạn

Ghaleb, Taghipour và Zolfagharinia kết hợp scheduling với bảo trì trong FJSP động, xem xét suy giảm máy, hỏng máy và đơn mới. Hệ thống sử dụng GA lai cùng cách tối ưu chủ động–phản ứng. Công trình cho thấy tích hợp bảo trì và scheduling đã có tiền lệ; không thể coi riêng sự kết hợp này là điểm mới của đồ án. [LR06](https://doi.org/10.1016/j.jmsy.2021.09.018)

Đồ án dùng chính sách đơn giản hơn: bảo trì khuôn theo ngưỡng chu kỳ, thời lượng khai báo và chiếm cả khuôn lẫn máy đang gắn khuôn. Khi máy hỏng giữa gia công, giữ phần đã làm và tiếp tục phần còn lại trên cùng máy sau sửa theo A07. Đây là giả định mô hình của dự án; không tuyên bố đã mô phỏng đầy đủ suy giảm thiết bị hay bảo trì dự đoán.

### 3.3. Ba ca mỗi ngày và đo hiệu suất

Theo A03, ngày sản xuất chia thành **3 ca, mỗi ca danh nghĩa 8 giờ**. Giờ bắt đầu/kết thúc và nghỉ được cấu hình. Ba ca tạo khung lịch; từng máy có quyết định ca bật riêng. Với 14 ngày, có 42 vị trí ca danh nghĩa trên mỗi máy, nhưng số ca khả dụng và số ca được bật còn phụ thuộc lịch ngày nghỉ, downtime và nhu cầu.

Quy tắc đánh giá theo mục 4.4 của yêu cầu:

\[
A_{ms}=\text{thời lượng ca}_{ms}-\text{độ dài hợp các khoảng nghỉ/downtime}_{ms}
\]

\[
U=\frac{\sum_{m,s\in\text{ca bật}}P_{ms}}{\sum_{m,s\in\text{ca bật}}A_{ms}},\qquad
I_{ms}=A_{ms}-P_{ms}-S_{ms}-M_{ms}.
\]

Ở đây, \(P\), \(S\), \(M\) lần lượt là thời gian gia công, setup và bảo trì chiếm máy. Các khoảng thời gian được tính trong từng ca, không trừ trùng nghỉ/downtime. Nếu mẫu số bằng 0 thì hiệu suất là N/A. Ca khả dụng 8 giờ chỉ gia công 2 giờ đạt 25%; mức 90% chỉ là tham chiếu theo tải.

**Nhận xét phân tích của bản tổng quan:** giảm idle không luôn đồng nghĩa tăng thời gian gia công. Với \(A\) và \(P\) cố định, tăng setup hoặc bảo trì cũng làm \(I\) giảm theo công thức. Nếu hàm mục tiêu chứa \(w_I I+w_S S\), hệ số thực của \(S\) sau thay thế là \(w_S-w_I\), trước khi xét các mục tiêu khác. Vì vậy phải kiểm tra độ nhạy trọng số, báo riêng setup/bảo trì/gia công và kiểm tra có khuyến khích hoạt động không cần thiết hay không. Đây là điểm cần kiểm chứng của thiết kế hiện tại, không phải kết quả thực nghiệm đã đạt.

Dữ liệu Mota cung cấp bối cảnh sản xuất hangtag dệt may với ba máy và thời gian rời rạc theo bước năm phút. Nó hữu ích để tham khảo cách biểu diễn dữ liệu tác vụ và năng lượng, nhưng không xác nhận thời gian đúc/CNC, công suất máy bánh xe hoặc mức tiết kiệm kWh của đồ án. [LR24](https://zenodo.org/records/4106746)

### 3.4. Lô, giao hàng và tồn kho

Theo A01–A02 và R07–R09, các thuật toán phải dùng cùng tập lô đã tạo, cùng giới hạn sản xuất dư và cùng cách phân bổ lượng về đơn hàng. Tồn vật lý không âm là ràng buộc cứng; thiếu safety stock cuối ngày là mục tiêu mềm. Hạn giao mặc định mềm, chỉ có deadline cứng khi đơn hàng khai báo.

Những quy tắc này mở rộng đáng kể so với benchmark chỉ tối thiểu makespan. Kiểm tra lượng phải dựa trên hàng hoàn tất QC và giao hàng thực tế; không trừ lượng đơn đến hạn nếu hàng chưa giao. Mô hình phải lưu cả lượng chưa giao để đánh giá độ trễ, tránh che thiếu hàng bằng một chỉ số tồn kho tổng hợp.

## 4. Các hướng giải và bằng chứng lựa chọn

### 4.1. Constraint programming, CP-SAT và mô hình nguyên hỗn hợp

PyJobShop của Lan và Berkhout cung cấp giao diện mô hình hóa scheduling với CP-SAT và CP Optimizer. Thực nghiệm của bài trên hơn 9.000 instance cho thấy CP-SAT cạnh tranh ở nhóm job-shop và project scheduling, trong khi CP Optimizer tốt hơn ở một số nhóm permutation và quy mô lớn. Kết quả hỗ trợ việc thử CP-SAT, không chứng minh nó tốt nhất cho hệ thống bánh xe có ca, khuôn, tồn kho và bảo trì. [LR08](https://arxiv.org/abs/2502.13483)

**Đánh giá cho đồ án:** CP-SAT phù hợp làm lựa chọn đầu tiên vì cần mô hình hóa rõ quyết định gán máy, trình tự và tài nguyên; dự án cũng đã có prototype để kế thừa. Điều kiện giữ lựa chọn này là mô hình đầy đủ, validator độc lập và kết quả pilot đạt chất lượng/thời gian chấp nhận được. Bản tổng quan không xác nhận lại kết quả chạy các prototype.

Một phương án đối chứng là mô hình quy hoạch tuyến tính nguyên hỗn hợp (MILP), biểu diễn gán máy và thứ tự bằng biến nguyên, liên kết với thời gian và lượng tồn kho. **Nhận định thiết kế:** phương án này đáng cân nhắc nếu quyết định lượng sản xuất/chi phí trở thành trọng tâm, hoặc để kiểm tra chéo instance nhỏ. Nó cũng đòi hỏi mô hình đúng và lựa chọn cách mã hóa thời gian phù hợp. Trong phạm vi hiện tại, chưa có thực nghiệm cùng dữ liệu và ngân sách để kết luận CP-SAT tốt hơn MILP; không cần triển khai cả hai trước khi hoàn thành bộ kiểm tra nghiệp vụ.

### 4.2. Dispatching, heuristic và metaheuristic

FIFO, EDD và SPT được chọn làm baseline theo yêu cầu D04. Quy tắc ưu tiên phải đi qua một bộ dựng lịch có xét máy/khuôn, setup, nghỉ ca và bảo trì. Một danh sách sắp theo hạn giao chưa phải lịch khả thi. Cần khóa cách xử lý hòa, hạn giao đại diện cho lô gộp và thời lượng dùng cho SPT.

GA, DE, tìm kiếm cục bộ và các phương pháp lai là những hướng thay thế cần xem xét theo bài toán cụ thể. MODE của Cheng và GA lai của Ghaleb cho thấy các phương pháp này có thể xử lý biến thể công nghiệp khi được thiết kế tương ứng; không thể suy ra chúng yếu hơn CP-SAT chỉ vì không tự cung cấp chứng minh tối ưu. [LR05](https://doi.org/10.1109/ACCESS.2024.3372396), [LR06](https://doi.org/10.1016/j.jmsy.2021.09.018)

Trong phạm vi triển khai, hoàn thành ba baseline cùng validator trước. Chỉ thêm một metaheuristic đối chứng khi có ngân sách và câu hỏi thực nghiệm rõ ràng. Không cần triển khai nhiều thuật toán chỉ để tăng số hàng trong bảng so sánh.

### 4.3. RL và biểu diễn đồ thị

Zhang và cộng sự dùng RL cùng biểu diễn đồ thị để học quy tắc dispatching cho JSP. Song và cộng sự xử lý FJSP bằng quyết định kết hợp công đoạn–máy và đồ thị không đồng nhất. Đây là các ví dụ cụ thể về học chính sách lập lịch, khác với chỉ học thời gian xử lý đầu vào. [LR10](https://arxiv.org/abs/2010.12367), [LR11](https://doi.org/10.1109/TII.2022.3189725)

Tổng quan của Smit và cộng sự hệ thống hóa biểu diễn đồ thị, GNN và cách học cho job-shop cũng như một số bài toán flow-shop liên quan. Bản tạp chí xuất bản năm **2025**, dù preprint và DOI chứa năm 2024. Nguồn này cho thấy GNN là một hướng nghiên cứu phát triển mạnh, chưa đủ để kết luận toàn bộ lĩnh vực đang thay solver bằng RL. [LR12](https://doi.org/10.1016/j.cor.2024.106914)

Với đồ án, trở ngại chính là xây môi trường học đủ nghiệp vụ, dữ liệu huấn luyện đại diện và phép đánh giá khi thay đổi tải, máy, khuôn hoặc ca. Chính sách học có thể sinh lịch hợp lệ qua action masking, decoder hoặc bước sửa lịch; vẫn phải qua validator chung. Chưa chọn RL làm lõi là quyết định về phạm vi và chi phí kiểm chứng, không phải kết luận RL không thể tạo lịch hợp lý.

### 4.4. Kết hợp học máy với tối ưu

L-RHO của Li và cộng sự dùng học máy xác định những gán máy có thể cố định giữa các cửa sổ rolling horizon, nhằm giảm bài toán phải giải lại. Công trình đã xuất bản tại **ICLR 2025**. Cải thiện được báo cáo trong thiết lập của bài không phải cam kết tăng tốc cho đồ án. [LR13](https://openreview.net/forum?id=Aly68Y5Es0)

Echeverria, Murua và Santana kết hợp CP với deep learning: dùng lời giải CP để học, đồng thời phối hợp mô hình học và CP khi dựng lời giải. Bản tạp chí là năm **2025**, preprint năm 2024. Không nên mô tả công trình chỉ là “CP sinh nhãn, sau đó mạng học thay hoàn toàn solver”. [LR14](https://doi.org/10.1016/j.eswa.2024.125895)

SeaPearl minh họa hướng RL học quyết định branching bên trong một solver CP; bản công bố được kiểm tra mô tả đây là proof of concept. Nó khác với việc truyền một lịch cũ làm hint cho CP-SAT. [LR30](https://arxiv.org/abs/2102.09193)

**Định hướng cho đồ án:** thử hint hoặc rolling horizon không học trước khi bổ sung ML. Hint không tự tạo thành một phương pháp học máy, cũng không bảo đảm tăng tốc. Khi cố định một phần lịch hoặc giải một cửa sổ, cận tối ưu của bài con không được báo thành cận toàn horizon.

### 4.5. Nghiên cứu mới năm 2026

ProRL của Hu, Zhang và Baier nghiên cứu chính sách dạng chương trình có thể đọc và sửa. Đây là phản ví dụ đối với nhận định mọi cách tiếp cận RL đều buộc phải có chính sách mạng nơ-ron không diễn giải được. Nguồn được kiểm tra là preprint tháng 5/2026; chỉ dùng để ghi nhận hướng nghiên cứu, không dùng làm chứng cứ solver nào thắng trên phạm vi đồ án. [LR15](https://arxiv.org/abs/2605.18454)

Liu và cộng sự phân tích hệ thống quyết định lập lịch ở cấp kiến trúc, kiểm soát kết quả và triển khai. Bản v3 tháng 9/2026 phân biệt cấu hình solver-led, shared-authority và model-led như các lựa chọn thiết kế. Do vẫn là preprint trong nguồn được kiểm tra, công trình bổ sung góc nhìn chứ không quyết định lựa chọn thuật toán. [LR16](https://arxiv.org/abs/2512.22642v3)

## 5. Tái lập lịch và diễn giải hỗ trợ

### 5.1. Phản ứng với sự kiện

Vieira, Herrmann và Lin cung cấp khung phân biệt chiến lược, chính sách kích hoạt và phương pháp tái lập lịch. Cơ sở này giúp tách hai quyết định: khi nào cần sửa lịch và sửa phần nào của lịch. [LR09](https://doi.org/10.1023/A:1022235519958)

Áp dụng cho đồ án: chụp trạng thái tại thời điểm đơn gấp/máy hỏng, giữ quá khứ và phần việc đang chạy theo A07/R11, sau đó xếp lại phần tương lai. Rolling horizon là một cách chia bài toán theo cửa sổ; không đồng nghĩa với mọi lần tái lập lịch theo sự kiện. Hệ thống vẫn có thể phản ứng theo sự kiện bằng cách giải lại toàn phần tương lai trong horizon hai tuần.

Đánh giá phải báo thay đổi độ trễ, giờ bắt đầu, gán máy và ca bật; kiểm tra cả sự cố lúc máy rảnh và giữa công đoạn. Lịch cũ chỉ là phương án dự phòng khi còn hợp lệ với trạng thái mới. Phạt xáo trộn lịch là mở rộng có thể thử, chưa tự động trở thành mục tiêu bắt buộc.

### 5.2. XAI và phân tích quyết định

Wang và Chen đề xuất kỹ thuật diễn giải kết quả GA trong scheduling; De Bock và cộng sự đưa ra khung XAI cho OR. Hai nguồn hỗ trợ nhu cầu cung cấp thông tin dễ hiểu cho người dùng, nhưng không làm CP-SAT tự có lời giải thích nghiệp vụ. [LR17](https://doi.org/10.1016/j.eswa.2023.121369), [LR19](https://doi.org/10.1016/j.ejor.2023.09.026)

Mehdiyev và cộng sự kết hợp predictive process monitoring và NSGA-II để tạo giải thích phản thực. Cách tiếp cận này khác với việc thay một giả định đầu vào rồi giải lại mô hình scheduling. Không có phép đối chứng chung để kết luận giải lại bằng CP-SAT “chính xác hơn” phương pháp của bài. [LR18](https://doi.org/10.1007/s12559-024-10294-0)

Nedbálek và Novák xác định điểm nghẽn qua nới lỏng ràng buộc trong RCPSP. Có thể tham khảo tư tưởng so sánh kịch bản, nhưng phải chuyển đổi cho cấu trúc máy/khuôn của đồ án. Nếu cả hai lần giải đều dừng khi chưa chứng minh tối ưu, chênh lệch KPI có thể phản ánh cả thay đổi mô hình lẫn chất lượng tìm kiếm. [LR20](https://doi.org/10.5220/0013253700003893)

Đường găng có nguồn nền tảng từ Kelley và Walker; khi dùng cho lịch phân xưởng phải xét thêm thứ tự tài nguyên đã chọn. Sách Wang–Chen và nghiên cứu Garn–Amirghasemi có thể dùng để mở rộng phần diễn giải; nghiên cứu sau minh họa bằng knapsack, không phải bằng chứng thực nghiệm trên FJSP. [LR29](https://doi.org/10.1145/1460299.1460318), [LR28](https://doi.org/10.1007/978-3-031-85374-6), [LR27](https://doi.org/10.1007/s10479-025-06684-8)

Theo yêu cầu hiện tại, KPI và trạng thái giải là bắt buộc; đường găng, độ nhạy và giải thích phản thực nâng cao là phụ trợ. Đồ án không cần xây một mô hình XAI hoàn chỉnh để đạt mục tiêu “lịch hợp lý”.

## 6. Nghiên cứu trong nước

Nguyễn Hồng Phúc và cộng sự (2026) nghiên cứu FJSP kết hợp nguồn lực nội bộ, tăng ca và thuê ngoài. Bài xây dựng mô hình toán và sử dụng GA để tìm nghiệm xấp xỉ, với mục tiêu chi phí có phạt trễ. Đây là nguồn tiếng Việt trực tiếp về lập lịch sản xuất. Phạm vi tăng ca/thuê ngoài khác với bài toán khuôn và ca bật của đồ án; không suy ra bài đã giải cùng bộ ràng buộc. [LR25](https://jst.tnu.edu.vn/jst/article/view/14459/0)

Nguyễn Hữu Mùi và Vũ Đình Hòa nghiên cứu GA cho JSP, sử dụng cơ chế dựng lịch và tìm kiếm lân cận. Bản PDF ghi năm 2012, nhưng trang metadata có khác biệt về năm và số tạp chí; bản tổng quan ghi rõ xung đột tại LR26. Nguồn này xác nhận có công trình tiếng Việt cùng họ JSP, không xác nhận đã có hệ thống bánh xe với toàn bộ yêu cầu hiện tại. [LR26](https://vjs.ac.vn/jst/article/view/9529)

Vì vậy, nhận định cũ rằng chỉ tìm được luận án lập lịch cá nhân không còn mô tả đúng tập nguồn đã thu thập. Tổng quan mới có nghiên cứu sản xuất trong nước, nhưng chưa đủ cơ sở để khẳng định đã bao phủ đầy đủ nghiên cứu Việt Nam hoặc chứng minh tính mới trong nước của tổ hợp yêu cầu.

## 7. Bảng đối sánh công trình tiêu biểu

Các hàng mô tả phạm vi được nguồn xác nhận. “Chưa xác nhận” không có nghĩa công trình chắc chắn không hỗ trợ; không đánh dấu “không” chỉ vì abstract không đề cập. Hàng đồ án là **thiết kế dự kiến**, không phải kết quả triển khai.

| Công trình | Bài toán và cách tiếp cận | Nội dung đã xác nhận | Khác biệt hoặc giới hạn với đồ án |
|---|---|---|---|
| Cheng et al., 2024 [LR05] | FJSP khuôn; MODE cải tiến | Phối hợp máy–khuôn, setup, makespan | Không dùng làm chứng cứ cho bảo trì khuôn theo chu kỳ; ngữ nghĩa setup cần đối chiếu |
| Ghaleb et al., 2021 [LR06] | FJSP động; GA lai | Scheduling, bảo trì và gián đoạn | Mô hình suy giảm/CBM khác giả định bảo trì khuôn đơn giản |
| Lan & Berkhout, 2025 [LR08] | Thư viện CP và thực nghiệm nhiều lớp scheduling | So sánh CP-SAT/CP Optimizer | Không xác nhận toàn bộ nghiệp vụ bánh xe |
| Zhang et al., 2020 [LR10] | JSP; RL học dispatching | Học chính sách từ biểu diễn đồ thị | Cần mở rộng cho lựa chọn máy và nghiệp vụ của đồ án |
| Song et al., 2023 [LR11] | FJSP; GNN và DRL | Quyết định công đoạn–máy | Chưa xác nhận mô hình đầy đủ ca/khuôn/tồn kho như yêu cầu |
| Li et al., 2025 [LR13] | FJSP dài hạn; L-RHO | Học cố định biến qua cửa sổ | Cần dữ liệu học và đo tác động biên kỳ |
| Echeverria et al., 2025 [LR14] | FJSP; CP kết hợp DL | Học từ CP và phối hợp dựng lời giải | Chưa xác nhận xử lý sự cố giữa gia công đúng A07 |
| Wang & Chen, 2024 [LR17] | Diễn giải GA scheduling | Các kỹ thuật XAI cho kết quả GA | Tham khảo lớp diễn giải phụ trợ |
| Mehdiyev et al., 2024 [LR18] | Dự đoán quy trình và phản thực | NSGA-II cho giải thích đa mục tiêu | Khác phép what-if bằng giải lại scheduler |
| Nedbálek & Novák, 2025 [LR20] | RCPSP; nới ràng buộc | Phân tích điểm nghẽn | Cần chuyển mô hình sang máy/khuôn |
| Nguyễn Hồng Phúc et al., 2026 [LR25] | FJSP; mô hình toán và GA | Nguồn lực nội bộ, tăng ca, thuê ngoài | Khác mục tiêu và tổ hợp ràng buộc |
| Đồ án CO5103 — dự kiến | Tuyến bốn công đoạn; CP-SAT và baseline | Mục tiêu: 3 ca/ngày, setup, khuôn, bảo trì, tồn kho, tái lập lịch, validator | Chưa có kết quả thực nghiệm xác nhận toàn bộ thiết kế |

## 8. Dữ liệu và giới hạn đối chứng

### 8.1. Ba tầng dữ liệu

OR-Library phân phối các instance job-shop cùng tài liệu định dạng; Taillard là nguồn benchmark scheduling nền tảng. Các instance JSP thông thường không tự cung cấp đầy đủ dữ liệu ca, khuôn và tồn kho. [LR21](https://people.brunel.ac.uk/~mastjjb/jeb/orlib/jobshopinfo.html), [LR22](https://people.brunel.ac.uk/~mastjjb/jeb/orlib/jobshopinfo.html)

Deliktaş và cộng sự cung cấp 43 instance cho scheduling trong môi trường cell, có setup theo họ, vận chuyển liên cell và tái nhập. Khi bỏ cell/vận chuyển hoặc đổi mục tiêu, dữ liệu trở thành một biến thể đã chuyển đổi; không so trực tiếp với kết quả công bố của bài toán gốc. [LR23](https://pubmed.ncbi.nlm.nih.gov/38152490/)

| Tầng | Nguồn trong repository | Mục đích | Không đủ để kết luận |
|---|---|---|---|
| Lõi JSP | [Taillard](../../dataset/taillard-ta01-ta80/SOURCE.md), [OR-Library/Lawrence](../../dataset/or-library-raw/SOURCE.md) | Kiểm tra parser, precedence, tài nguyên và makespan | Đáp ứng đầy đủ nghiệp vụ bánh xe |
| Biến thể mở rộng | [Deliktaş](../../dataset/deliktas-fjsp-cellular/SOURCE.md) | Kiểm tra lựa chọn máy và setup theo mô hình được công bố hoặc chuyển đổi rõ ràng | Vượt kết quả gốc nếu đã thay mô hình/mục tiêu |
| Nghiệp vụ đồ án | Bộ sinh dữ liệu cần xây theo A01–A07/R01–R11 | Kiểm tra ca, khuôn, chu kỳ, lượng, tồn kho và sự cố | Hiệu quả trên một nhà máy thực chưa khảo sát |
| Tham chiếu tham số | [Mota](../../dataset/mota-production-line-energy/SOURCE.md) | Tham khảo dữ liệu tác vụ/năng lượng và cấu trúc input/output | Thông số thực đo của dây chuyền bánh xe |

Mendeley Data ghi bộ Deliktaş phiên bản 1 công bố năm 2023, trong khi bài mô tả thuộc tập tạp chí năm 2024. Mã bài đúng là **109946**, DOI **10.1016/j.dib.2023.109946**. Không dùng mã 110037 đang xuất hiện trong một số ghi chú cũ. [Bản ghi dữ liệu](https://data.mendeley.com/datasets/rtzby7pv7m/1), [bài mô tả](https://pubmed.ncbi.nlm.nih.gov/38152490/)

### 8.2. Các cổng dữ liệu chưa được chọn

Các bản nháp trước ghi nhận tra cứu data.gov, data.gov.vn và Kaggle nhưng chưa chọn được bộ dữ liệu cấp máy–công đoạn–đơn hàng phù hợp. Đợt này không thực hiện lại một cuộc kiểm kê đầy đủ các cổng đó. Vì vậy, kết luận sử dụng là **chưa có bộ dữ liệu từ các cổng này được xác nhận phù hợp trong hồ sơ dự án**, không phải “các cổng không có dữ liệu dùng được”.

Một nguồn mới chỉ được đưa vào thực nghiệm sau khi xác nhận schema, đơn vị, quyền sử dụng, phiên bản, giả định và cách chuyển đổi. Việc có tên “manufacturing” hoặc “job shop” không đủ để bảo đảm phù hợp.

## 9. Khoảng trống ứng dụng và đóng góp dự kiến

Tập tài liệu được rà soát đã có nghiên cứu về máy–khuôn, bảo trì động, học chính sách, tái lập lịch và diễn giải. Do đó, chưa có căn cứ tuyên bố đồ án là công trình đầu tiên kết hợp các chủ đề này. Đóng góp thích hợp là **xây dựng và kiểm chứng một hệ thống tích hợp cho bộ yêu cầu đã xác định**, trong bối cảnh dữ liệu tổng hợp và demo local.

| Nhu cầu của đồ án | Cơ sở tham khảo | Phần phải tự xây dựng/kiểm chứng |
|---|---|---|
| Lịch bốn công đoạn, lựa chọn máy | LR01, LR02, LR08 | Schema, mô hình tuyến cố định và máy đủ điều kiện |
| Setup và khuôn | LR04, LR05 | Ngữ nghĩa A04, chiếm khuôn và trạng thái sau bảo trì |
| Bảo trì, máy hỏng, đơn gấp | LR06, LR09 | Chính sách A05/A07, snapshot và bảo toàn quá khứ |
| Ba ca/ngày và hiệu suất | Yêu cầu A03, mục 4.4; LR24 tham khảo dữ liệu | Lịch khả dụng, ca bật, mẫu số và đánh đổi idle/setup |
| Lô, tồn kho và giao hàng | Yêu cầu A01–A02, R07–R09 | Bảo toàn lượng, phân bổ về đơn và kiểm tra theo sự kiện |
| Kết quả tin cậy | LR07, LR19 và D01–D06 | Validator độc lập, trạng thái, cấu hình tái lập và đối chứng |

Các câu hỏi thực nghiệm cần trả lời là: CP-SAT có cải thiện chất lượng so với FIFO/EDD/SPT trong cùng ngân sách không; phạt idle thay đổi hiệu suất, setup, độ trễ và lượng dư ra sao; và tái lập lịch có giữ được phần đã thực hiện đồng thời tạo lịch hợp lệ đủ nhanh không. Đây là câu hỏi mở, không phải các kết luận đã được tổng quan chứng minh.

## 10. Định hướng triển khai và đánh giá

Giữ CP-SAT làm bộ giải chính để triển khai ban đầu; sử dụng FIFO/EDD/SPT qua bộ dựng lịch hợp lệ làm đối chứng. Mọi phương pháp dùng chung dữ liệu, phân lô, định nghĩa KPI và validator. Ưu tiên hoàn thiện nghiệp vụ trước khi thử tăng tốc bằng hint, rolling horizon hoặc LNS. Chi tiết thuật toán và kế hoạch thí nghiệm nằm trong [khảo sát phương pháp](../scheduling-algorithms/scheduling_methods_and_recommendation.md) và [kế hoạch mô hình/đánh giá](../scheduling-algorithms/model_and_evaluation_plan.md).

Thiết kế đánh giá bám D01–D06:

- **Tính đúng:** kiểm tra từng nhóm ràng buộc cứng, có lịch cố tình sai và đầu vào bất khả thi; chỉ xuất lịch sử dụng sau khi qua validator.
- **Chất lượng:** báo makespan, trễ có trọng số, setup, idle, thiếu safety stock, lượng dư và ca bật; không chỉ báo điểm tổng.
- **Đối chứng benchmark:** giữ đúng bài toán và mục tiêu; RPD với best-known không đồng nghĩa gap tới tối ưu. Lưu nguồn và ngày của giá trị tham chiếu.
- **Hiệu suất:** thử tải nhẹ/vừa/căng, có/không phạt idle, cùng khung 3 ca/ngày; kiểm tra nghỉ ca, ca liền nhau và ca không bật.
- **Gián đoạn:** đơn mới và máy hỏng cả lúc rảnh/đang chạy; đo tác động trước/sau và kiểm tra lịch sử không đổi.
- **Tái lập:** lưu input, cấu hình, seed, worker, phiên bản solver, phần cứng, ngân sách và kết quả thô; báo cả trường hợp không tìm được lịch.

Mốc 30 giây cho solver ở demo và 120 giây ở chế độ nghiên cứu là đề xuất pilot trong yêu cầu. Độ trễ toàn phiên còn gồm tiền xử lý và validator, phải đo riêng. Ngưỡng chất lượng, tỷ lệ tìm được lịch và quy mô nghiệm thu cần khóa sau pilot, trước khi xem tập kiểm thử chính. Bản tổng quan không tạo ra số liệu benchmark và không tuyên bố hệ thống đã đạt nghiệm thu.

## 11. Tài liệu tham khảo và mức tiếp cận

Mã **LRxx** chỉ dùng trong tài liệu này, độc lập với số thứ tự cũ trong `references/`. “Trang/tóm tắt” nghĩa là chưa thẩm định đầy đủ mô hình và thí nghiệm toàn văn. “Toàn văn, phần liên quan” nghĩa là đã truy cập và kiểm tra phần dùng cho nhận định, không có nghĩa đã tái lập kết quả của bài. Các nguồn web được kiểm tra ngày 19/09/2026; không dùng xếp hạng Q1/CORE chưa xác minh năm/lĩnh vực làm căn cứ lựa chọn.

| Mã | Trích dẫn và nguồn | Mức tiếp cận / ghi chú |
|---|---|---|
| LR01 | Dauzère-Pérès, S., Ding, J., Shen, L., & Tamssaouet, K. (2024). *The flexible job shop scheduling problem: A review*. European Journal of Operational Research, 314(2), 409–432. [DOI](https://doi.org/10.1016/j.ejor.2023.05.017) | Trang nhà xuất bản; dùng cho phạm vi tổng quan |
| LR02 | Ruiz, R., & Vázquez-Rodríguez, J. A. (2010). *The hybrid flow shop scheduling problem*. European Journal of Operational Research, 205(1), 1–18. [DOI](https://doi.org/10.1016/j.ejor.2009.09.024) | Trang/tóm tắt nhà xuất bản |
| LR03 | Hax, A. C., & Meal, H. C. (1973). *Hierarchical integration of production planning and scheduling*. MIT Sloan Working Paper 656-73. [Kho MIT](https://dspace.mit.edu/handle/1721.1/1868) | Metadata và đoạn nội dung bản lưu trữ; phân biệt chương sách 1975 trong ghi chú cũ |
| LR04 | Allahverdi, A. (2015). *The third comprehensive survey on scheduling problems with setup times/costs*. European Journal of Operational Research, 246(2), 345–378. [DOI](https://doi.org/10.1016/j.ejor.2015.04.004) | Tóm tắt nhà xuất bản; nguồn nền tảng, không gọi là tổng quan mới nhất |
| LR05 | Cheng, Y., Xie, Z., Xin, Y., Chen, K., & Zarei, R. (2024). *Flexible Job Shop Scheduling Method for Optimizing Mold Resource Setup Time*. IEEE Access, 12, 33486–33503. [DOI](https://doi.org/10.1109/ACCESS.2024.3372396) | Nội dung bài trên bản toàn văn tác giả chia sẻ; trang IEEE không truy cập được trong phiên kiểm tra |
| LR06 | Ghaleb, M., Taghipour, S., & Zolfagharinia, H. (2021). *Real-time integrated production-scheduling and maintenance-planning in a flexible job shop with machine deterioration and condition-based maintenance*. Journal of Manufacturing Systems, 61, 423–449. [DOI](https://doi.org/10.1016/j.jmsy.2021.09.018) | Trang/tóm tắt nhà xuất bản |
| LR07 | Google. *CP-SAT Solver*. OR-Tools documentation. [Tài liệu chính thức](https://developers.google.com/optimization/cp/cp_solver) | Đã kiểm tra định nghĩa trạng thái; tài liệu công cụ, không phải bài đối chứng |
| LR08 | Lan, L., & Berkhout, J. (2025). *PyJobShop: Solving scheduling problems with constraint programming in Python*. arXiv:2502.13483. [Bản truy cập](https://arxiv.org/abs/2502.13483) | Preprint; abstract và nội dung HTML liên quan |
| LR09 | Vieira, G. E., Herrmann, J. W., & Lin, E. (2003). *Rescheduling Manufacturing Systems: A Framework of Strategies, Policies, and Methods*. Journal of Scheduling, 6, 39–62. [DOI](https://doi.org/10.1023/A:1022235519958) | Bản bài báo lưu tại đại học; nội dung khung tái lập lịch |
| LR10 | Zhang, C., Song, W., Cao, Z., Zhang, J., Tan, P. S., & Xu, C. (2020). *Learning to Dispatch for Job Shop Scheduling via Deep Reinforcement Learning*. Advances in Neural Information Processing Systems, 33. [Kỷ yếu NeurIPS](https://proceedings.neurips.cc/paper/2020/hash/11958dfee29b6709f48a9ba0387a2431-Abstract.html) | Metadata/tóm tắt kỷ yếu và arXiv |
| LR11 | Song, W., Chen, X., Li, Q., & Cao, Z. (2023). *Flexible Job-Shop Scheduling via Graph Neural Network and Deep Reinforcement Learning*. IEEE Transactions on Industrial Informatics, 19(2), 1600–1610. [DOI](https://doi.org/10.1109/TII.2022.3189725) | Metadata/tóm tắt từ [kho SMU](https://ink.library.smu.edu.sg/sis_research/8197/) |
| LR12 | Smit, I. G., Zhou, J., Reijnen, R., Wu, Y., Chen, J., Zhang, C., Bukhsh, Z., Zhang, Y., & Nuijten, W. P. M. (2025). *Graph neural networks for job shop scheduling problems: A survey*. Computers & Operations Research, 176, 106914. [DOI](https://doi.org/10.1016/j.cor.2024.106914) | Metadata/tóm tắt từ kho TU/e và arXiv; bản tạp chí 2025 |
| LR13 | Li, S., Ouyang, W., Ma, Y., & Wu, C. (2025). *Learning-Guided Rolling Horizon Optimization for Long-Horizon Flexible Job-Shop Scheduling*. ICLR 2025. [OpenReview](https://openreview.net/forum?id=Aly68Y5Es0) | Kỷ yếu ICLR và arXiv; đã xác nhận xuất bản hội nghị |
| LR14 | Echeverria, I., Murua, M., & Santana, R. (2025). *Leveraging constraint programming in a deep learning approach for dynamically solving the flexible job-shop scheduling problem*. Expert Systems with Applications, 265, 125895. [DOI](https://doi.org/10.1016/j.eswa.2024.125895) | Trang nhà xuất bản và phần phương pháp trong preprint 2024; không trộn số liệu khác phiên bản |
| LR15 | Hu, C., Zhang, Y., & Baier, H. (2026). *Scheduling That Speaks: An Interpretable Programmatic Reinforcement Learning Framework*. arXiv:2605.18454. [Preprint](https://arxiv.org/abs/2605.18454) | Metadata/tóm tắt; chưa xác nhận bản bình duyệt |
| LR16 | Liu, A., Lin, S., Chen, J., Wu, P., & Shen, Z. M. (2026, bản v3; v1 năm 2025). *Machine Learning for Scheduling Decision Systems: A Critical Review of Architecture, Assurance, and Deployment*. arXiv:2512.22642v3. [Preprint](https://arxiv.org/abs/2512.22642v3) | Metadata/tóm tắt v3 ngày 05/09/2026; chưa xác nhận bản bình duyệt |
| LR17 | Wang, Y.-C., & Chen, T. (2024). *Adapted techniques of explainable artificial intelligence for explaining genetic algorithms on the example of job scheduling*. Expert Systems with Applications, 237, 121369. [DOI](https://doi.org/10.1016/j.eswa.2023.121369) | Tóm tắt nhà xuất bản |
| LR18 | Mehdiyev, N., Majlatow, M., & Fettke, P. (2024). *Counterfactual Explanations in the Big Picture: An Approach for Process Prediction-Driven Job-Shop Scheduling Optimization*. Cognitive Computation, 16, 2674–2700. [DOI](https://doi.org/10.1007/s12559-024-10294-0) | Tóm tắt và trang toàn văn mở; không còn ghi “không có bản mở” |
| LR19 | De Bock, K. W., Coussement, K., De Caigny, A., Słowiński, R., Baesens, B., Boute, R. N., Choi, T.-M., Delen, D., Kraus, M., Lessmann, S., Maldonado, S., Martens, D., Óskarsdóttir, M., Vairetti, C., Verbeke, W., & Weber, R. (2024). *Explainable AI for Operational Research: A defining framework, methods, applications, and a research agenda*. European Journal of Operational Research, 317(2), 249–272. [DOI](https://doi.org/10.1016/j.ejor.2023.09.026) | Trang nhà xuất bản, nội dung khung XAIOR |
| LR20 | Nedbálek, L., & Novák, A. (2025). *Bottleneck Identification in Resource-Constrained Project Scheduling via Constraint Relaxation*. Proceedings of ICORES 2025, 340–347. [DOI](https://doi.org/10.5220/0013253700003893) | Metadata xuất bản và tóm tắt tại arXiv:2504.07495 |
| LR21 | Beasley, J. E. (1990). *OR-Library: Distributing test problems by electronic mail*. Journal of the Operational Research Society, 41(11), 1069–1072. [Trang dữ liệu của tác giả](https://people.brunel.ac.uk/~mastjjb/jeb/orlib/jobshopinfo.html) | Đã kiểm tra trang phân phối; không đọc lại toàn văn bài 1990 |
| LR22 | Taillard, E. (1993). *Benchmarks for basic scheduling problems*. European Journal of Operational Research, 64, 278–285. [Nguồn phân phối và dẫn chiếu](https://people.brunel.ac.uk/~mastjjb/jeb/orlib/jobshopinfo.html) | Đối chiếu dẫn chiếu trên OR-Library; chưa đọc toàn văn bài gốc |
| LR23 | Deliktaş, D., Özcan, E., Ustun, O., & Torkul, O. (2024). *A benchmark dataset for multi-objective flexible job shop cell scheduling*. Data in Brief, 52, **109946**. [DOI bài](https://doi.org/10.1016/j.dib.2023.109946); [dataset v1, 2023](https://data.mendeley.com/datasets/rtzby7pv7m/1) | Abstract bài gốc trên PubMed và record dữ liệu; online 13/12/2023, tập tạp chí 02/2024 |
| LR24 | Mota, B., Gomes, L., Faria, P., Ramos, C., & Vale, Z. (2020). *Production line dataset for task scheduling and energy optimization – Schedule Optimization*, v0.1 [Dataset]. [Zenodo](https://doi.org/10.5281/zenodo.4106746) | Record và mô tả file; không coi mọi file output là phép đo thô |
| LR25 | Nguyễn Hồng Phúc, Lê Thị Thanh Hương, Nguyễn Thúy Vi, & Tiền Tú Trinh (2026). *Mô hình tối ưu điều độ job-shop linh hoạt kết hợp hoạch định nguồn lực thuê ngoài*. TNU Journal of Science and Technology, 231(02), 204–212. [DOI](https://doi.org/10.34238/tnu-jst.14459) | Toàn văn, phần mô hình/phương pháp liên quan; mục 2.3 xác nhận dùng GA |
| LR26 | Nguyễn Hữu Mùi & Vũ Đình Hòa (2012, theo PDF). *Một thuật toán di truyền hiệu quả cho bài toán lập lịch Job Shop*. Tạp chí Khoa học và Công nghệ, 50, 565–577. [Trang bài/DOI](https://vjs.ac.vn/jst/article/view/9529) | PDF ghi 50(6), năm 2012; trang ghi 50(5), ngày đăng 2017. Tạm không chốt số kỳ; giữ cảnh báo metadata |
| LR27 | Garn, W., & Amirghasemi, M. (2025). *Transparency of combinatorial optimisations via machine learning and explainable AI*. Annals of Operations Research, 354, 427–458. [DOI](https://doi.org/10.1007/s10479-025-06684-8) | Trang/tóm tắt và tình trạng open access; minh họa knapsack |
| LR28 | Wang, Y.-C., & Chen, T. (2025). *Explainable and Customizable Job Sequencing and Scheduling: Advancing Production Control and Management with XAI*. Springer. [DOI sách](https://doi.org/10.1007/978-3-031-85374-6) | Trang sách/mô tả; không đọc toàn bộ sách |
| LR29 | Kelley, J. E., & Walker, M. R. (1959). *Critical-path planning and scheduling*. IRE-AIEE-ACM '59 (Eastern), 160–173. [DOI](https://doi.org/10.1145/1460299.1460318) | Dẫn chiếu nền tảng từ hồ sơ cũ; chưa đọc lại toàn văn trong đợt này |
| LR30 | Chalumeau, F., Coulon, I., Cappart, Q., & Rousseau, L.-M. (2021). *SeaPearl: A Constraint Programming Solver guided by Reinforcement Learning*. arXiv:2102.09193. [Preprint](https://arxiv.org/abs/2102.09193) | Metadata/tóm tắt v2; proof of concept |

Các lỗi và thay đổi so với ba bản nháp được ghi riêng trong [biên bản rà soát](review_notes_2026-09-19.md). Các ghi chú cũ ngoài thư mục này có thể chưa đồng bộ; khi trích dẫn lại cần dùng metadata và giới hạn nêu ở bản tổng quan này.
