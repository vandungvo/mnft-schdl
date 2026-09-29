# Lộ trình đọc tài liệu và hiểu bài toán lập lịch sản xuất

**Ngày lập:** 19/09/2026.  
**Mục tiêu:** hiểu đủ để giải thích bài toán, xây dựng mô hình, lựa chọn phương pháp và thiết kế thực nghiệm cho đồ án CO5103.  
**Trình tự:** hiểu bài toán → hiểu mô hình → hiểu cách giải → hiểu cách kiểm chứng.

## 1. Cách sử dụng

Đọc theo thứ tự bên dưới và đánh dấu checklist khi đã hoàn thành đầu ra của từng bước. Có thể chia một bước thành nhiều buổi. Mỗi buổi dành khoảng 60–90 phút là gợi ý tự học, không phải thời lượng bắt buộc để hiểu một bài.

Tài liệu dùng để đối chiếu xuyên suốt:

- [Yêu cầu bài toán](../problem-requirements/problem_requirements.md): định nghĩa nghiệp vụ của đồ án, đặc biệt mục 3–4.
- [Literature review hiện hành](literature_review.md): bản đồ nghiên cứu và danh mục LRxx.
- [Kế hoạch mô hình và đánh giá](../scheduling-algorithms/model_and_evaluation_plan.md): đọc khi bắt đầu chuyển kiến thức thành mô hình/thực nghiệm.

Phân biệt điều tác giả bài báo đã chứng minh, giả định của bài và điều mình muốn áp dụng. Nếu mới đọc abstract, ghi rõ mức đọc đó; chưa kết luận về các chi tiết toàn văn chưa kiểm tra.

## 2. Checklist tổng thể

| Xong | Bước | Nội dung | Đầu ra cần giữ lại | Ngày hoàn thành |
|---|---|---|---|---|
| [x] | 0 | Đọc yêu cầu, lập ví dụ nhỏ | Bảng thuật ngữ và lịch vẽ tay ban đầu | 21/09/2026 |
| [x] | 1 | Bài tiếng Việt về FJSP | Bảng đầu vào – quyết định – ràng buộc – mục tiêu | 27/09/2026 |
| [x] | 2 | Tổng quan FJSP và phân loại flow shop | Một đoạn định vị bài toán bánh xe | 27/09/2026 |
| [ ] | 3 | PyJobShop và mô hình CP | Mô hình tối thiểu cho ví dụ nhỏ | |
| [ ] | 4 | Scheduling với khuôn | Lịch có setup/khuôn và bảng khác biệt giả định | |
| [ ] | 5 | Tái lập lịch | Quy tắc giữ/sửa lịch sau một sự kiện | |
| [ ] | 6 | Scheduling kết hợp bảo trì | Ví dụ bảo trì theo chu kỳ và lịch điều chỉnh | |
| [ ] | 7 | Benchmark và đối chứng | Bảng dữ liệu – phần được kiểm chứng – KPI | |

Nhánh tùy chọn sau phần cốt lõi:

- [ ] L2D → FJSP với GNN/RL → L-RHO.
- [ ] XAI và phân tích quyết định, nếu triển khai lớp diễn giải phụ trợ.

## 3. Nội dung từng bước

### Bước 0 — Nắm yêu cầu trước khi đọc paper

Đọc mục 3–4 trong [yêu cầu bài toán](../problem-requirements/problem_requirements.md). Viết định nghĩa bằng lời của mình cho: đơn hàng, lô, công đoạn, máy, khuôn, setup, thời điểm sẵn sàng, hạn giao và ca bật.

- [ ] Phân biệt đơn hàng với lô sản xuất; một đơn có thể được phục vụ bởi nhiều lô.
- [ ] Phân biệt ràng buộc cứng với mục tiêu mềm.
- [ ] Giải thích được 3 ca/ngày, mỗi ca danh nghĩa 8 giờ, và vì sao không mặc định mọi máy đều bật cả ba ca.
- [ ] Vẽ lịch đầu tiên cho ví dụ ở mục 5 của tài liệu này.

**Điều kiện chuyển bước:** có thể mô tả đầu vào, quyết định phải tìm và đầu ra của hệ thống trong khoảng năm câu.

### Bước 1 — Xem một bài toán sản xuất được chuyển thành mô hình

**Đọc:** Nguyễn Hồng Phúc và cộng sự (2026), *Mô hình tối ưu điều độ job-shop linh hoạt kết hợp hoạch định nguồn lực thuê ngoài* — LR25. [Trang bài](https://jst.tnu.edu.vn/jst/article/view/14459/0), [PDF](https://jst.tnu.edu.vn/jst/article/download/14459/pdf).

Tập trung vào phát biểu bài toán, giả định, biến quyết định, ràng buộc, hàm mục tiêu và ví dụ. Lượt đầu có thể đọc lướt chi tiết giải thuật di truyền (GA).

- [x] Lập bảng bốn nhóm: dữ liệu đầu vào, quyết định, ràng buộc, mục tiêu.
- [x] Chọn hai ràng buộc và diễn giải từng ký hiệu bằng ngôn ngữ sản xuất.
- [x] Ghi rõ điểm khác đồ án: tăng ca/thuê ngoài trong bài và ca bật/khuôn trong yêu cầu của mình.

**Câu hỏi cần trả lời:** từ câu “hai công đoạn không được dùng cùng máy đồng thời”, làm sao chuyển thành điều kiện của mô hình?

### Bước 2 — Hiểu vị trí của đề tài trong lĩnh vực

**Đọc chính:** Dauzère-Pérès và cộng sự (2024), *The flexible job shop scheduling problem: A review* — LR01. [DOI](https://doi.org/10.1016/j.ejor.2023.05.017).

Đọc chọn lọc phần định nghĩa, tiêu chí tối ưu, ràng buộc và phân loại phương pháp. Chưa cần theo hết mọi công trình được dẫn trong bài.

**Đọc bổ sung:** phần định nghĩa trong Ruiz & Vázquez-Rodríguez (2010), *The hybrid flow shop scheduling problem* — LR02. [DOI](https://doi.org/10.1016/j.ejor.2009.09.024).

- [x] Giải thích khác biệt JSP, FJSP và hybrid flow shop bằng ví dụ.
- [x] Phân biệt makespan với độ trễ giao hàng.
- [x] Liệt kê phần nào trong yêu cầu là bài toán lõi, phần nào là mở rộng nghiệp vụ.
- [x] Viết một đoạn định vị tuyến đúc → CNC → sơn → QC của đồ án.

**Câu hỏi cần trả lời:** vì sao có nhiều máy để chọn chưa đủ để phân biệt job shop với flow shop?

### Bước 3 — Hiểu mô hình CP và cách tạo lịch

**Đọc:** Lan & Berkhout (2025), *PyJobShop: Solving scheduling problems with constraint programming in Python* — LR08. [Bài báo](https://arxiv.org/abs/2502.13483), [PDF có trong repository](../../references/pdfs/09_lan_berkhout_2025_pyjobshop.pdf).

Tập trung vào mô tả bài toán, mô hình CP, ví dụ sử dụng và cách thiết kế thực nghiệm. Nếu cần cầu nối thực hành, xem [ví dụ Job Shop chính thức của OR-Tools](https://developers.google.com/optimization/scheduling/job_shop).

- [ ] Xác định biến bắt đầu/kết thúc và lựa chọn máy cho ví dụ nhỏ.
- [ ] Diễn giải ràng buộc thứ tự công đoạn và không chồng lấn máy.
- [ ] Phân biệt mô hình bài toán với thuật toán/bộ giải dùng để tìm nghiệm.
- [ ] Phân biệt có nghiệm khả thi, chứng minh tối ưu, chứng minh vô nghiệm và hết thời gian chưa có kết luận.

**Đầu ra:** một mô hình tối thiểu bằng bảng biến và lời mô tả ràng buộc. Có thể viết mã nếu đã sẵn sàng; chưa cần đưa toàn bộ nghiệp vụ vào cùng lúc.

### Bước 4 — Thêm setup và khuôn dùng chung

**Đọc:** Cheng và cộng sự (2024), *Flexible Job Shop Scheduling Method for Optimizing Mold Resource Setup Time* — LR05. [DOI](https://doi.org/10.1109/ACCESS.2024.3372396), [PDF có trong repository](../../references/pdfs/08_fjsp_mrst_ieee_access_2024.pdf).

Ưu tiên giả định, quan hệ máy–khuôn, setup và hình minh họa. Chi tiết MODE có thể đọc sâu sau khi hiểu mô hình tài nguyên.

- [ ] Chỉ ra một lịch máy không chồng lấn nhưng vẫn sai do dùng trùng khuôn.
- [ ] Thêm setup vào lịch vẽ tay, kể cả setup từ trạng thái ban đầu.
- [ ] So ngữ nghĩa setup của bài với A04: bán thành phẩm sẵn sàng và setup sát trước gia công.
- [ ] Phân biệt đổi khuôn với bảo trì khuôn theo chu kỳ.

**Đầu ra:** lịch cập nhật và bảng “giả định của bài / giả định đồ án / áp dụng được hay cần sửa”.

### Bước 5 — Hiểu tái lập lịch khi có sự kiện

**Đọc:** Vieira, Herrmann & Lin (2003), *Rescheduling Manufacturing Systems: A Framework of Strategies, Policies, and Methods* — LR09. [DOI](https://doi.org/10.1023/A:1022235519958).

Tập trung vào thời điểm kích hoạt tái lập lịch, sửa cục bộ/toàn phần và quan hệ giữa chất lượng với ổn định lịch.

- [ ] Chọn thời điểm xảy ra một đơn gấp hoặc máy hỏng trong ví dụ.
- [ ] Đánh dấu công đoạn đã xong, đang chạy và chưa bắt đầu.
- [ ] Ghi rõ phần nào phải giữ, phần nào được xếp lại theo A07/R11.
- [ ] So lịch trước/sau bằng giờ bắt đầu, máy được chọn và độ trễ.

**Câu hỏi cần trả lời:** tái lập lịch theo sự kiện khác rolling horizon ở điểm nào?

### Bước 6 — Hiểu bảo trì ảnh hưởng scheduling

**Đọc:** Ghaleb, Taghipour & Zolfagharinia (2021), *Real-time integrated production-scheduling and maintenance-planning in a flexible job shop with machine deterioration and condition-based maintenance* — LR06. [DOI](https://doi.org/10.1016/j.jmsy.2021.09.018).

Đọc giả định và cách liên kết sản xuất, bảo trì, sự cố. Đối chiếu với chính sách đơn giản hơn của đồ án: khuôn có bộ đếm chu kỳ và ngưỡng bảo trì.

- [ ] Ghi số chu kỳ khuôn đã dùng ở đầu kỳ và số chu kỳ từng lô tạo thêm.
- [ ] Xác định khi nào phải bảo trì trước lô tiếp theo.
- [ ] Bố trí thời gian bảo trì chiếm cả máy và khuôn trong ca khả dụng.
- [ ] Tính setup cần thiết sau bảo trì theo trạng thái khai báo.

**Câu hỏi cần trả lời:** đồ án đơn giản hóa những yếu tố nào so với mô hình suy giảm thiết bị của bài?

### Bước 7 — Hiểu cách đánh giá một phương pháp

**Đọc:** Deliktaş và cộng sự (2024), *A benchmark dataset for multi-objective flexible job shop cell scheduling* — LR23. [DOI](https://doi.org/10.1016/j.dib.2023.109946), [dataset](https://data.mendeley.com/datasets/rtzby7pv7m/1), [PDF có trong repository](../../references/pdfs/10_deliktas_2024_databrief.pdf).

Tập trung vào định nghĩa bài toán, cấu trúc dữ liệu và mục tiêu. Đọc kèm mục 8–10 của [literature review](literature_review.md).

- [ ] Lập bảng dữ liệu nào kiểm chứng lõi JSP, setup và nghiệp vụ đầy đủ.
- [ ] Nêu được vì sao bỏ cell/vận chuyển thì không so trực tiếp với kết quả bài toán gốc.
- [ ] Phân biệt best-known với nghiệm đã chứng minh tối ưu.
- [ ] Phác thảo phép so CP-SAT với FIFO/EDD/SPT: cùng input, phân lô, ràng buộc, validator và ngân sách.
- [ ] Liệt kê KPI cần báo và cách xử lý instance không tìm được lịch.

**Đầu ra:** một trang kế hoạch đánh giá, chưa cần có kết quả chạy.

## 4. Cách đọc mỗi bài và mẫu ghi chú

Đọc theo ba lượt:

1. **Định hướng, khoảng 15–20 phút:** abstract, hình minh họa và kết luận; xác định vấn đề bài giải quyết.
2. **Hiểu mô hình:** giả định, input, biến, ràng buộc và mục tiêu; viết lại bằng lời của mình, thử trên ví dụ nhỏ.
3. **Hiểu phương pháp và bằng chứng:** thuật toán, baseline, dữ liệu, ngân sách tính toán, kết quả và giới hạn; tập trung phần cần cho đồ án.

Nếu mắc ở công thức, chọn một chỉ số/cặp công đoạn và thay bằng số cụ thể. Nếu thuật ngữ chưa rõ, ghi vào danh sách cần làm rõ rồi quay lại; không cần hiểu mọi kỹ thuật trong một lượt đọc.

Sao chép mẫu sau cho mỗi bài, ghi khoảng nửa đến một trang:

```markdown
### Ghi chú bài: [Tên bài / mã LRxx]

- Ngày đọc:
- Mức đọc: abstract / phần mô hình / phương pháp / thực nghiệm
- Nguồn và phiên bản:

1. Bài giải quyết vấn đề gì?
2. Các giả định quan trọng là gì?
3. Input, quyết định, ràng buộc và mục tiêu là gì?
4. Bằng chứng nào hỗ trợ kết luận? So với ai, trên dữ liệu/ngân sách nào?
5. Đồ án kế thừa được gì và phải thay đổi gì?

Ví dụ tự diễn giải hoặc hình lịch:

Điểm chưa hiểu / cần kiểm tra tiếp:

Trang, mục hoặc bảng làm căn cứ cho ghi chú:
```

## 5. Bài tập xuyên suốt: một lịch nhỏ

Dùng một ví dụ tự tạo gồm **2–3 lô**, bốn công đoạn đúc → CNC → sơn → QC; một máy đúc, hai máy CNC, một máy sơn, một máy QC và một khuôn dùng chung. Khai báo sản phẩm của các lô tương thích với khuôn đó. Đây là ví dụ học tập, không phải dữ liệu thực của nhà máy.

Tự chọn lượng lô, thời lượng, setup và hạn giao đủ nhỏ để tính tay. Khai báo rõ đơn vị thời gian, giờ ca và nghỉ; ghi số chu kỳ phát sinh của từng lô cùng trạng thái khuôn đầu kỳ.

| Phiên bản | Thay đổi | Việc cần tự làm |
|---|---|---|
| V0 | Chỉ có gia công, máy và thứ tự công đoạn | Vẽ Gantt, tính makespan |
| V1 | Thêm setup và khuôn | Kiểm tra khoảng chiếm tài nguyên; giải thích vì sao lịch đổi |
| V2 | Áp dụng 3 ca/ngày, ca bật và giờ nghỉ | Kiểm tra công đoạn không chạy qua nghỉ; tính gia công/setup/idle theo ca |
| V3 | Thêm bảo trì theo chu kỳ | Xác định vị trí bảo trì, bộ đếm và setup sau bảo trì |
| V4 | Chèn đơn gấp hoặc máy hỏng | Giữ lịch sử, xếp lại tương lai, so KPI trước/sau |
| V5 | Thêm tồn đầu kỳ và giao hàng | Theo dõi lượng hoàn tất QC, lượng giao và tồn không âm |

V0–V1 là bài tập giản lược để học từng lớp ràng buộc. Chỉ coi lịch đáp ứng yêu cầu đầy đủ sau khi đã bổ sung và kiểm tra các quy tắc tương ứng.

**Dấu hiệu đã hiểu:** có thể giải thích bằng một ví dụ cụ thể vì sao lịch hợp lệ hoặc sai, và vì sao cải thiện một KPI có thể làm KPI khác xấu đi.

## 6. Nhánh mở rộng sau phần cốt lõi

### Học máy hỗ trợ lập lịch

Đọc theo thứ tự:

1. [Zhang et al. (2020), L2D — LR10](https://arxiv.org/abs/2010.12367): hiểu trạng thái, hành động, phần thưởng và chính sách dispatching.
2. [Song et al. (2023), FJSP với GNN/RL — LR11](https://doi.org/10.1109/TII.2022.3189725): hiểu lựa chọn đồng thời công đoạn và máy.
3. [Li et al. (2025), L-RHO — LR13](https://arxiv.org/abs/2502.15791): hiểu phần quyết định do mô hình học hỗ trợ và phần vẫn do solver giải.

Sau mỗi bài, hỏi: cần dữ liệu học nào; kiểm tra tính khả thi ở đâu; chi phí huấn luyện và suy luận được tính thế nào; điều gì xảy ra khi đổi số máy, tải hoặc lịch ca?

### Diễn giải quyết định

Nếu cần triển khai lớp phụ trợ, đọc [De Bock et al. — LR19](https://doi.org/10.1016/j.ejor.2023.09.026) để định hướng, rồi chọn [Nedbálek & Novák — LR20](https://arxiv.org/abs/2504.07495) cho phân tích nới ràng buộc hoặc [Mehdiyev et al. — LR18](https://doi.org/10.1007/s12559-024-10294-0) cho phản thực.

Đối chiếu với mục 7 của yêu cầu: diễn giải nâng cao là phụ trợ; KPI, trạng thái giải và kiểm tra lịch vẫn bắt buộc.

## 7. Việc làm trong buổi đầu tiên

- [ ] Đọc mục 3–4 của yêu cầu và ghi thuật ngữ chưa rõ.
- [ ] Đọc lượt đầu bài tiếng Việt ở bước 1.
- [ ] Tạo bảng dữ liệu ví dụ nhỏ và vẽ lịch V0.
- [ ] Viết ba câu: mình đang quyết định gì, điều gì không được vi phạm, lịch tốt được đo thế nào.
- [ ] Ghi lại câu hỏi còn vướng để giải quyết ở buổi tiếp theo.

## 8. Nhật ký tiến độ

| Ngày | Bước / bài | Đã hiểu hoặc hoàn thành | Còn vướng | Việc tiếp theo |
|---|---|---|---|---|
| 21/09/2026 | Bước 0 | Đọc mục 3–4 yêu cầu, lập thuật ngữ và ví dụ nhỏ | | Bước 1: đọc LR25, ghi chú tại [notes/LR25_nguyen_hong_phuc_2026.md](notes/LR25_nguyen_hong_phuc_2026.md) |
| 27/09/2026 | Bước 1 | Đọc LR25, lập bảng 4 nhóm (đầu vào/quyết định/ràng buộc/mục tiêu), diễn giải 2 ràng buộc, ghi điểm khác đồ án | | Bước 2: đọc LR01 (FJSP review) + LR02 (hybrid flow shop) |
| 27/09/2026 | Bước 2 | Đọc LR01 + LR02, phân biệt JSP/FJSP/hybrid flow shop, makespan vs độ trễ giao hàng, định vị tuyến đúc→CNC→sơn→QC | | Bước 3: đọc LR08 (PyJobShop), dựng mô hình CP tối thiểu cho ví dụ nhỏ |
