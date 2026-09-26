# Bản nháp 3: Xu hướng thuật toán lập lịch hiện đại — có nên đổi khỏi CP-SAT?

**Mục đích:** Dũng hỏi "thuật toán nên dùng để sắp lịch có nên thay đổi không, hướng mới của thế giới là gì". Đợt rà soát này trả lời bằng tài liệu thật (WebSearch/WebFetch, có DOI/URL), không phải suy đoán. Đây là **bản nháp để Dũng duyệt**, chưa đụng vào `Report_so_bo_Do_an_CO5103_VoVanDung.md`, `TECHNICAL_SPEC.md`, hay thư mục `references/`.

**Kết luận ngắn (chi tiết + trích dẫn ở dưới):** xu hướng chính của thế giới đúng là chuyển sang **RL/GNN học trực tiếp priority dispatching rule** cho JSP/FJSP — nhưng các mô hình này là hộp đen, không chứng minh được lời giải hợp lý/tối ưu tới đâu, khó kiểm chứng lại quyết định. Bản thân cộng đồng nghiên cứu năm 2026 cũng đang phải vá lại vấn đề này (mục 3). **Không có căn cứ để đổi khỏi CP-SAT làm lõi** — CP-SAT vẫn là cách chắc chắn nhất để đạt mục tiêu "lịch hợp lý" của đề tài (chứng minh được tối ưu/gap, mỗi ràng buộc tường minh). Hướng đáng cân nhắc là **hybrid CP + học máy** — dùng CP-SAT làm lõi đảm bảo tính đúng, học máy chỉ hỗ trợ tăng tốc (mục 4) — đúng như `TECHNICAL_SPEC.md` §2.1 đã phác thảo qua tài liệu #13 (Li et al., 2025), giờ có thêm căn cứ củng cố.

---

## 1. Xu hướng chính: RL/GNN học trực tiếp dispatching rule

**Zhang, C., Song, W., Cao, Z., Zhang, J., Tan, P. S., & Xu, C. (2020).** Learning to Dispatch for Job Shop Scheduling via Deep Reinforcement Learning. *Advances in Neural Information Processing Systems (NeurIPS) 33*. arXiv:2010.12367. https://arxiv.org/abs/2010.12367

- **Venue:** NeurIPS — hội nghị AI hàng đầu (CORE A*). **Truy cập:** open access, PDF + code (GitHub: zcaicaros/L2D) tải trực tiếp được.
- Công trình khai sinh hướng "**L2D**" (Learning to Dispatch): biểu diễn trạng thái JSP bằng disjunctive graph, dùng Graph Neural Network embed trạng thái, huấn luyện RL để tự học priority dispatching rule thay vì thiết kế tay. Đây là điểm khởi đầu được trích dẫn nhiều nhất cho toàn bộ dòng nghiên cứu RL+GNN cho lập lịch phân xưởng từ 2020 tới nay.

**Song, W., Chen, X., Li, Q., & Cao, Z. (2023).** Flexible Job-Shop Scheduling via Graph Neural Network and Deep Reinforcement Learning. *IEEE Transactions on Industrial Informatics*, 19(2), 1600–1610. https://doi.org/10.1109/TII.2022.3189725

- **Venue:** IEEE TII — Q1. **Truy cập:** trả phí (IEEE Xplore); bản PDF tác giả tự lưu trữ có tại Singapore Management University (ink.library.smu.edu.sg).
- Mở rộng trực tiếp L2D cho **đúng bài toán FJSP** (không chỉ JSP cứng nhắc) — cùng dạng bài toán với đề tài (mỗi công đoạn có nhiều máy khả thi). Là bài được xem là tham chiếu chuẩn khi ai đó hỏi "SOTA cho FJSP bằng RL là gì" — nên đây là tài liệu quan trọng nhất trong nhóm này nếu báo cáo cần trích dẫn hướng RL làm đối trọng so sánh.

**Smit, I. G., Zhou, J., Reijnen, R., Wu, Y., Chen, J., Zhang, C., Bukhsh, Z., Zhang, Y., & Nuijten, W. (2024).** Graph Neural Networks for Job Shop Scheduling Problems: A Survey. *Computers & Operations Research*. arXiv:2406.14096. https://arxiv.org/abs/2406.14096

- **Venue:** Computers & Operations Research — Q1. **Truy cập:** open access qua arXiv.
- Bài tổng quan (survey) toàn diện nhất hiện có riêng cho **GNN áp dụng vào JSP/FJSP** — phân loại biểu diễn đồ thị, kiến trúc GNN, cách kết hợp với RL. Dùng làm nguồn duy nhất cần trích nếu muốn nói "đây là xu hướng chủ đạo của thế giới hiện nay" mà không cần liệt kê hàng chục bài lẻ.

## 2. Vì sao hướng này KHÔNG hợp với đề tài (khó kiểm chứng lịch có hợp lý không)

Cả 3 tài liệu ở mục 1 đều dùng mạng nơ-ron sâu (GNN + policy network) ra quyết định — về bản chất là **hộp đen**: không có cách nào trích xuất "vì sao chọn job này trước job kia" bằng suy luận tường minh như CP-SAT (constraint nào đang active, ràng buộc nào giới hạn lời giải), và cũng không chứng minh được lời giải cách tối ưu bao xa — tức là không tự khẳng định được lịch có "hợp lý" hay không, phải tin vào hiệu năng thực nghiệm trên tập test. Đây không phải nhận định chủ quan — chính cộng đồng nghiên cứu XAI-cho-RL xác nhận:

**Hu, C., Zhang, Y., & Baier, H. (2026).** Scheduling That Speaks: An Interpretable Programmatic Reinforcement Learning Framework. arXiv:2605.18454. https://arxiv.org/abs/2605.18454

- **Venue:** arXiv preprint (05/2026, rất mới). **Truy cập:** open access.
- Đề xuất **ProRL** — khung RL sinh ra policy dạng **chương trình con người đọc được** (thay vì mạng nơ-ron) để giải JSP, chính vì lý do "DRL scheduling hiện tại là hộp đen, cản trở triển khai thực tế khi người quản lý cần hiểu quyết định". Điểm đáng chú ý: tác giả báo cáo ProRL đạt hiệu năng **gần bằng hoặc tốt hơn CP-SAT** ở quy mô lớn khi cho CP-SAT 1 giờ để giải — tức là ngay cả hướng "sửa RL cho dễ kiểm chứng hơn" vẫn phải lấy **CP-SAT làm mốc so sánh chuẩn**, không phải cái cần thay thế.
- Đây là bằng chứng trực tiếp nhất cho thấy: (a) hộp đen của RL/GNN là vấn đề thật, đang được chính cộng đồng đó thừa nhận và tìm cách vá năm 2026 — không phải điều đề tài tự nghĩ ra; (b) CP-SAT vẫn là baseline uy tín ngay trong chính các bài báo đề xuất thay thế nó.

## 3. Hướng đáng cân nhắc: hybrid CP + học máy (không thay CP-SAT, chỉ tăng tốc nó)

**Chalumeau, F., Coulon, I., Cappart, Q., & Rousseau, L.-M. (2021).** SeaPearl: A Constraint Programming Solver guided by Reinforcement Learning. arXiv:2102.09193. https://arxiv.org/abs/2102.09193

- **Venue:** arXiv preprint (2021). **Truy cập:** open access, mã nguồn mở (Julia).
- Solver CP dùng RL để học **chiến lược branching** (thứ tự thử biến/giá trị khi tìm kiếm) — lõi vẫn là constraint programming đảm bảo tính đúng và khả năng chứng minh tối ưu, RL chỉ tăng tốc quá trình tìm kiếm. Nhóm tác giả tự nhận đây là proof-of-concept, chưa đọ được solver công nghiệp (CP-SAT/CPLEX) — nhưng minh hoạ đúng mô hình "học máy phụ trợ, CP làm lõi" mà đề tài nên đi theo nếu muốn hiện đại hoá.

**Echeverria, I., Murua, M., & Santana, R. (2024).** Leveraging constraint programming in a deep learning approach for dynamically solving the flexible job-shop scheduling problem. *Expert Systems with Applications*, 265, Article 125895. arXiv:2403.09249. https://doi.org/10.1016/j.eswa.2024.125895

- **Venue:** Expert Systems with Applications — Q1. **Truy cập:** bản preprint mở tại arXiv, bản chính thức trả phí (ScienceDirect).
- Trực tiếp giải bài toán **FJSP động** (đơn hàng đến liên tục — gần với kịch bản "đơn gấp" của đề tài): huấn luyện mô hình deep learning bằng **lời giải tối ưu do CP sinh ra làm dữ liệu huấn luyện** (thay vì để DRL tự khám phá bằng thử-sai tốn kém), rồi mô hình học được dùng để ra quyết định real-time. Báo cáo vượt qua 5 phương pháp DRL khác và 1 solver có tên tuổi trên 5 bộ dữ liệu. Đây là **hướng cụ thể nhất, mới nhất (2024), khớp trực tiếp nhất với kịch bản "đơn gấp/máy hỏng" của đề tài** trong toàn bộ đợt rà soát 3 lần — nên là trích dẫn ưu tiên nếu Dũng quyết định thêm 1 đoạn "hướng mở rộng" vào TECHNICAL_SPEC.md §2.1, bổ sung cho tài liệu #13 (Li et al., 2025) đã có.

## 4. Phản biện lại giả định "ML thay solver = hiện đại hơn"

**Liu, A., Lin, S., Chen, J., Wu, P., & Shen, Z. M. (2025/2026).** Machine Learning for Scheduling Decision Systems: A Critical Review of Architecture, Assurance, and Deployment. arXiv preprint (nộp 12/2025, sửa lần cuối 09/2026). https://arxiv.org/abs/2512.22642

- **Venue:** arXiv preprint, rất mới (bản sửa cùng tháng với thời điểm rà soát này). **Truy cập:** open access.
- Lập luận trực diện phản bác khung nhìn "hệ thống lập lịch đi từ solver-based lên ML-driven là 1 đường tiến hoá tất yếu". Nguyên văn: *"solver-led, shared-authority, and model-led configurations are alternative designs, not maturity stages"* — tức 3 kiểu kiến trúc (solver làm chủ, chia sẻ quyền quyết định, model làm chủ) là **các lựa chọn thiết kế song song tuỳ bài toán**, không phải các nấc thang "cũ → mới". Bài nhấn mạnh: hiệu năng mô hình không tự động cho nó quyền quyết định cao hơn — còn phụ thuộc governance/assurance (ai chịu trách nhiệm khi sai).
- Đây là **căn cứ học thuật mạnh nhất** để trả lời câu hỏi gốc của Dũng theo hướng "không cần đổi": việc đề tài giữ CP-SAT (solver-led, có thể audit từng ràng buộc, chứng minh được tối ưu/gap) thay vì chuyển sang model-led (RL/GNN) không phải là chọn hướng cũ kỹ — đó là 1 lựa chọn kiến trúc hợp lý và được chính review 2026 này công nhận là chính đáng, đặc biệt hợp khi mục tiêu chính của đề tài là **tạo ra lịch hợp lý, đáng tin cậy** cho người ra quyết định không rành kỹ thuật (đúng persona "quản đốc/ban lãnh đạo" của đề tài).

## 5. Khuyến nghị cụ thể

1. **Không đổi thuật toán lõi.** Giữ CP-SAT, không có bằng chứng nào trong đợt rà soát này cho thấy RL/GNN vượt trội đến mức đáng đánh đổi khả năng chứng minh lịch hợp lý + 5 prototype đã kiểm chứng + thời gian còn lại (12–14 tuần).
2. **Nếu muốn, thêm 1 đoạn ngắn vào `TECHNICAL_SPEC.md` §2.1** (hoặc mục mới "Quyết định kiến trúc") giải thích **vì sao không dùng RL/GNN** — dùng tài liệu #(Song et al. 2023) làm đại diện xu hướng RL/GNN, #(Hu et al. 2026 — ProRL) làm bằng chứng chính cộng đồng đó cũng thừa nhận vấn đề hộp đen, #(Liu et al. 2025/2026) làm căn cứ "solver-led là lựa chọn chính đáng, không phải lạc hậu". Đây trực tiếp phục vụ yêu cầu #2 của cô Châu (thêm tài liệu 2020s) và làm mạnh thêm phần lý luận chọn phương pháp cho mục tiêu "lịch hợp lý".
3. **Stretch goal không bắt buộc:** nếu dư thời gian ở tuần 10+ (theo roadmap `TECHNICAL_SPEC.md` §8), có thể thử nghiệm nhỏ hướng hybrid — vd dùng lời giải CP-SAT trước đó làm warm-start cho lần giải lại khi có đơn gấp — đúng tinh thần tài liệu #13 (Li et al., 2025) đã có sẵn trong `references/` và củng cố thêm bởi Echeverria et al. (2024) ở mục 3. Không nên bắt đầu từ đầu bằng RL/GNN — rủi ro cao, không có prototype sẵn, và khó chứng minh lịch sinh ra hợp lý tới đâu.

---

*Chưa fold vào `references/` hay `TECHNICAL_SPEC.md`. Đợi Dũng duyệt nội dung + quyết định có thêm đoạn "quyết định kiến trúc" vào spec không trước khi đánh số thứ tự tài liệu tham khảo #20+.*
