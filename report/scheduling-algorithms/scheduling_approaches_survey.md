# Bản nháp 4: Toàn cảnh các phương pháp tiếp cận bài toán lập lịch của đề tài

> **Lưu ý cập nhật 18/09/2026:** Giữ bản nháp này để đối chiếu lịch sử. Bản nghiên cứu và đề xuất hiện hành là [scheduling_methods_and_recommendation.md](scheduling_methods_and_recommendation.md), kèm [mô hình và kế hoạch kiểm chứng](model_and_evaluation_plan.md). Một số nhận định dưới đây đã được hiệu chỉnh ở bản mới: không đồng nhất tối ưu với hợp lý; không mặc định PDR luôn thua; không suy rộng kết quả Tabu Search từ biến thể khác; không coi mô hình học máy là không thể kiểm tra tính hợp lệ. Các trích dẫn chưa xác minh trong bản nháp không được dùng làm căn cứ cho đề xuất mới.

**Mục đích:** Dũng yêu cầu "tìm hiểu tất cả những phương pháp để tiếp cận bài toán tôi đặt ra". Khác `report/literature-review/lit_review_draft_3.md` (chỉ trả lời câu hỏi hẹp "có nên đổi khỏi CP-SAT sang RL/GNN không"), file này dựng **toàn bộ bản đồ phương pháp** có thể dùng để giải bài toán lập lịch phân xưởng linh hoạt (FJSP) của đề tài — exact, heuristic, metaheuristic, matheuristic, học máy, đa-agent, mô phỏng — rồi định vị CP-SAT (lựa chọn hiện tại) và các baseline dự kiến (FIFO/EDD/SPT, việc 3 cô Châu yêu cầu) trong bản đồ đó theo mục tiêu chính của đề tài: **tạo ra lịch hợp lý** (`Report_so_bo_Do_an_CO5103_VoVanDung.md` mục 1.2). Đây là **bản nháp để Dũng duyệt**, chưa đụng vào `Report_so_bo_Do_an_CO5103_VoVanDung.md`, `TECHNICAL_SPEC.md`, hay thư mục `references/`. Trích dẫn lấy từ tìm kiếm thật (WebSearch/WebFetch), có DOI/URL kèm theo; chỗ chưa xác nhận đầy đủ được ghi rõ.

---

## 0. Nhắc lại bài toán để làm khung đánh giá

Bài toán (chi tiết ở `Report_so_bo_Do_an_CO5103_VoVanDung.md` mục 1–2, `TECHNICAL_SPEC.md` §1–§2) có các đặc điểm quyết định phương pháp nào phù hợp:

1. **FJSP** (Flexible Job-Shop): 4 công đoạn trình tự cố định (đúc → CNC → sơn → QC), mỗi công đoạn có **tập con máy khả thi** (machine eligibility), không phải job-shop cứng nhắc 1 máy/công đoạn.
2. **Ràng buộc phụ đặc thù ngành:** thời gian chuyển đổi phụ thuộc trình tự (sequence-dependent setup), quy mô lô tối thiểu, chu kỳ bảo trì khuôn, tồn kho an toàn.
3. **Mục tiêu đa tiêu chí có trọng số:** makespan, độ trễ giao hàng, thời gian chuyển đổi, **thời gian máy nhàn rỗi (machine utilization)**, thiếu hụt tồn kho — không phải chỉ tối thiểu makespan đơn thuần như phần lớn benchmark học thuật.
4. **Động:** phải giải lại khi có đơn gấp/máy hỏng, so sánh với lịch gốc (counterfactual).
5. **Phân cấp 2 tầng:** planning tháng/quý → scheduling 2 tuần (hierarchical production planning).
6. **Yêu cầu "lịch hợp lý"** là mục tiêu cốt lõi ngang hàng với chất lượng lời giải: lịch phải khả thi vật lý 100% (không vi phạm ràng buộc) và cân đối có căn cứ giữa các mục tiêu cạnh tranh, để ban lãnh đạo tin dùng mà không cần rà tay lại — khả năng diễn giải (critical path/sensitivity/counterfactual) chỉ là tính năng phụ trợ, không phải điều kiện loại phương pháp.
7. **Ràng buộc thời gian:** đồ án cá nhân, còn ~12–14 tuần, đã có 5 prototype dùng CP-SAT.

7 điểm này dùng làm tiêu chí so sánh ở mục 8.

---

## 1. Phương pháp chính xác (Exact methods)

**Ý tưởng:** mô hình hoá bài toán thành mô hình toán học (biến quyết định + ràng buộc + hàm mục tiêu) rồi dùng solver tổng quát giải tới tối ưu hoặc chứng minh được khoảng cách với tối ưu (optimality gap).

| Kỹ thuật | Đại diện |
|---|---|
| **MILP** (Mixed-Integer Linear Programming) | Biến nhị phân biểu diễn "job i công đoạn j chạy trên máy k, trước/sau job i' " — 4 cách mô hình hoá phổ biến: sequence-based, position-based, time-indexed, disjunctive |
| **CP** (Constraint Programming) | Biến khoảng thời gian (interval variable) + ràng buộc toàn cục (`NoOverlap`, `Cumulative`) — cách CP-SAT của đề tài đang dùng |
| **Branch-and-Bound / Branch-and-Cut** | Dùng nội bộ trong solver MILP/CP để cắt nhánh không khả thi |

**Tài liệu:**

- **Fattahi, P., Saidi Mehrabad, M., & Jolai, F. (2007).** Mathematical modeling and heuristic approaches to flexible job shop scheduling problems. *Journal of Intelligent Manufacturing*, 18(3), 331–342. https://doi.org/10.1007/s10845-007-0026-8
  - **Venue:** Springer — công trình **khai sinh mô hình MILP machine-position-based cho FJSP**, giải 20 instance nhỏ/vừa bằng LINGO. Bộ instance benchmark của bài này (Fattahi 4×5, 10×10...) vẫn được dùng làm chuẩn so sánh tới hiện tại. Đây là tài liệu nền tảng nên trích khi mô tả "vì sao mô hình hoá bằng biến khoảng thời gian/MILP là hướng exact kinh điển", trước khi giới thiệu CP-SAT là 1 biến thể hiện đại của hướng này.

- **Tác giả/năm chưa xác nhận đầy đủ (⚠️).** Mixed-integer linear programming and constraint programming formulations for solving distributed flexible job shop scheduling problem. *Computers & Industrial Engineering*, 2020. Link đã xác nhận qua search: https://www.sciencedirect.com/science/article/abs/pii/S0360835220300814 — **DOI và danh sách tác giả đầy đủ CHƯA lấy được** (trang trả phí, WebFetch bị chặn HTTP 403); search engine gợi ý tên Öztop/Tasgetiren/Kandiller nhưng KHÔNG đủ tin cậy để trích chính thức. Dũng cần tự mở link trên (hoặc tra DOI qua Google Scholar) để lấy trích dẫn đầy đủ trước khi đưa vào `references/`.
  - Đề xuất 4 mô hình MILP + 1 mô hình CP cho FJSP phân tán, kết luận: **CP vượt trội MILP rõ rệt khi instance lớn lên** (MILP chỉ tối ưu được instance nhỏ/vừa trong thời gian hợp lý) — đúng lý do kỹ thuật đề tài đã chọn CP-SAT (`TECHNICAL_SPEC.md` §2.2: "xử lý tốt ràng buộc cứng với hàng nghìn biến").

- **Lan & Berkhout (2025) — PyJobShop** (đã có trong vault, tài liệu tham khảo số 9) đối chứng thực nghiệm CP-SAT vs CP Optimizer trên >9.000 instance công khai — dùng làm bằng chứng "CP-SAT là lựa chọn CP trưởng thành, có cạnh tranh với solver thương mại (CP Optimizer)".

**Đánh giá cho đề tài:** Đây là nhóm đề tài **đã chọn** (CP-SAT). Ưu điểm quyết định cho mục tiêu "lịch hợp lý": (a) lời giải kèm chứng minh tối ưu/gap → khẳng định được lịch thật sự hợp lý (không phải "trông có vẻ ổn"), dễ báo cáo học thuật; (b) mỗi ràng buộc là 1 constraint tường minh trong code → dễ kiểm chứng lại vì sao lịch hợp lý khi cần (constraint nào active, nới constraint nào cải thiện mục tiêu bao nhiêu — cơ chế sensitivity analysis ở §2.4, nay là tính năng phụ trợ, không phải yêu cầu bắt buộc); (c) OR-Tools miễn phí, đã có 5 prototype chạy được. Nhược điểm đã biết: giải lại từ đầu chậm khi instance lớn (đã có hướng khắc phục ở mục 5).

---

## 2. Heuristic đơn giản: Priority Dispatching Rules (PDR)

**Ý tưởng:** quy tắc đơn giản, tính toán trực tiếp (không tìm kiếm/tối ưu), gán độ ưu tiên cho công việc đang chờ mỗi khi máy rảnh — job có ưu tiên cao nhất được chọn. Chi phí tính toán gần như bằng 0, dùng được real-time, nhưng không có gì đảm bảo về chất lượng lời giải.

- **Haupt, R. (1989).** A survey of priority rule-based scheduling. *OR Spectrum*, 11(1), 3–16. https://doi.org/10.1007/BF01721162
  - **Venue:** Springer, bài tổng quan kinh điển nhất về PDR (dù cũ, vẫn là nguồn phân loại chuẩn được trích liên tục tới hiện tại). Phân loại PDR thành 4 nhóm: **SPR** (Simple Priority Rule — 1 tiêu chí, ví dụ SPT/EDD), **WPI** (Weighted Priority Index — tổ hợp trọng số nhiều tiêu chí), **CDR** (Composite Dispatching Rule — kết hợp có điều kiện nhiều SPR), **HSR** (Heuristic Scheduling Rule — quy tắc suy ra từ cấu trúc bài toán cụ thể).
  - **Liên quan trực tiếp đến đề tài:** đây chính là nguồn phân loại học thuật cho **FIFO, EDD, SPT** — 3 baseline đã chốt dùng ở mục 2.5/kiểm chứng của báo cáo (và là nội dung việc 3 cô Châu yêu cầu "implement + evaluate model"). Hiện `TECHNICAL_SPEC.md`/báo cáo nhắc tới FIFO/EDD/SPT như quy tắc "kinh nghiệm ngành" nhưng **chưa trích dẫn học thuật nào** — đây là khoảng trống nên lấp bằng tài liệu này.

**Đánh giá cho đề tài:** Đây là baseline **bắt buộc phải có** cho việc 3 (so sánh CP-SAT với cách làm thủ công mô phỏng bằng quy tắc kinh nghiệm). Không cạnh tranh vai trò với CP-SAT — vai trò của PDR trong đồ án là **đường nền để đo cải thiện**, không phải ứng viên thay thế.

---

## 3. Metaheuristics (tìm kiếm meta cho lời giải gần-tối-ưu)

**Ý tưởng:** tìm kiếm trong không gian lời giải bằng chiến lược tổng quát (không đảm bảo tối ưu, nhưng thường ra lời giải tốt trong thời gian hợp lý cho instance lớn mà exact method không giải được).

| Họ | Đại diện | Đã có trong vault? |
|---|---|---|
| Evolutionary (GA, differential evolution) | Cheng et al. 2024 — MODE cho FJSP-MRST (tài liệu #8); Mota et al. 2020 — GA trên dữ liệu thực (#11) | ✅ |
| Trajectory-based (Tabu Search, SA, ILS, GRASP) | Araújo, Birgin & Ronconi (2024/2025) — xem dưới | Mới |
| Swarm (PSO, ACO) | Nêu trong tổng quan #12, chưa có bài riêng | — |

- **Araújo, K. A. G., Birgin, E. G., & Ronconi, D. P. (2024/2025).** Local search and trajectory metaheuristics for the flexible job shop scheduling problem with sequencing flexibility and position-based learning effect. *Journal of Scheduling* (Springer). arXiv:2403.16787. https://doi.org/10.1007/s10951-025-00869-6
  - **Venue:** Journal of Scheduling — Q1/Q2 (Springer, chuyên ngành scheduling). **Truy cập:** preprint mở tại arXiv, bản chính thức trả phí.
  - Kết luận thực nghiệm chính: **Tabu Search dựa trên "reduced neighborhood" vượt trội 3 metaheuristic khác (ILS, GRASP, Simulated Annealing) trên instance FJSP kích thước lớn.** Đây là bằng chứng gần nhất (2024–2025) cho câu hỏi "nếu cần 1 metaheuristic để đối chứng thêm ngoài PDR, nên chọn họ nào" — Tabu Search có bằng chứng mạnh nhất trong nhóm trajectory-based hiện nay.

**Đánh giá cho đề tài:** Không cần thay CP-SAT bằng metaheuristic — CP-SAT hiện đủ tốt cho quy mô đồ án (theo `TECHNICAL_SPEC.md` §2.2: "hàng nghìn biến, thời gian giải hợp lý"). Nhưng **nếu muốn làm phần "evaluate model" (việc 3) sâu hơn PDR**, thêm 1 baseline Tabu Search sẽ mạnh hơn nhiều so với chỉ so với FIFO/EDD/SPT — vì PDR luôn thua metaheuristic về chất lượng, nên "CP-SAT thắng PDR" là kết quả hiển nhiên (ít giá trị học thuật), còn "CP-SAT đọ với Tabu Search có ràng buộc phụ" mới thực sự kiểm chứng được lõi thuật toán tốt tới đâu. **Đây là gợi ý mở rộng có giá trị nhất của mục này**, không bắt buộc, tuỳ thời gian còn lại.

---

## 4. Matheuristics (lai exact + metaheuristic)

**Ý tưởng:** dùng mathematical programming (MILP/CP) như một thành phần bên trong vòng lặp metaheuristic (hoặc ngược lại) — lấy độ chính xác của exact + khả năng mở rộng của heuristic.

- **Ngoo, C. M., Goh, S. L., Sze, S. N., Sabar, N. R., Ahmad Hijazi, M. H., & Kendall, G. (2024).** A survey of mat-heuristics for combinatorial optimisation problems: Variants, trends and opportunities. *Applied Soft Computing*. https://doi.org/10.1016/j.asoc.2024.111947
  - **Venue:** Applied Soft Computing — Q1 (Scimago, Computer Science). **Truy cập:** trả phí (ScienceDirect); bản PDF tác giả có tại graham-kendall.com.
  - Phân loại matheuristic theo 3 kiểu tích hợp (loose/tight/multi) × 2 hướng (direct/decomposition). Không chuyên biệt cho scheduling nhưng là **khung phân loại chung mới nhất** cho toàn họ phương pháp này.
  - **Liên quan đến hướng "hybrid CP + học máy" ở mục 5 dưới** (SeaPearl — RL học branching cho CP; Echeverria et al. 2024 — CP sinh dữ liệu huấn luyện cho deep learning): về bản chất đó **chính là 1 dạng matheuristic** (tight integration, decomposition) — tài liệu này cho đề tài 1 khung lý thuyết chung để gọi tên đúng hướng mở rộng đã đề xuất, thay vì chỉ mô tả rời rạc từng bài.

**Đánh giá cho đề tài:** Không cần triển khai ngay — đây là **khung lý thuyết** để đặt tên chính xác cho "stretch goal" (warm-start CP-SAT bằng lời giải trước, hoặc rolling-horizon có học máy chọn biến cố định — tài liệu #13 Li, Ouyang, Ma & Wu 2025 đã có trong `references/`). Nếu viết vào spec, nên gọi đúng thuật ngữ "matheuristic/hybrid CP-ML" và trích tài liệu này làm nguồn định danh.

---

## 5. Học máy / Học sâu / RL / GNN

**Ý tưởng:** thay vì thiết kế tay quy tắc ưu tiên (mục 2) hoặc mô hình hoá toán học (mục 1), huấn luyện một mạng nơ-ron (thường là Graph Neural Network kết hợp Reinforcement Learning) để **tự học cách ra quyết định lập lịch** từ dữ liệu/mô phỏng, sau đó suy luận (infer) tức thời trên instance mới.

**Xu hướng chính của thế giới — RL/GNN học trực tiếp priority dispatching rule:**

- **Zhang, C., Song, W., Cao, Z., Zhang, J., Tan, P. S., & Xu, C. (2020).** Learning to Dispatch for Job Shop Scheduling via Deep Reinforcement Learning. *Advances in Neural Information Processing Systems (NeurIPS) 33*. arXiv:2010.12367. https://arxiv.org/abs/2010.12367
  - **Venue:** NeurIPS — hội nghị AI hàng đầu (CORE A*). **Truy cập:** open access, PDF + code (GitHub: zcaicaros/L2D).
  - Công trình khai sinh hướng "**L2D**" (Learning to Dispatch): biểu diễn trạng thái JSP bằng disjunctive graph, dùng GNN embed trạng thái, huấn luyện RL để tự học priority dispatching rule thay vì thiết kế tay. Điểm khởi đầu được trích dẫn nhiều nhất cho toàn bộ dòng nghiên cứu RL+GNN cho lập lịch phân xưởng từ 2020 tới nay.

- **Song, W., Chen, X., Li, Q., & Cao, Z. (2023).** Flexible Job-Shop Scheduling via Graph Neural Network and Deep Reinforcement Learning. *IEEE Transactions on Industrial Informatics*, 19(2), 1600–1610. https://doi.org/10.1109/TII.2022.3189725
  - **Venue:** IEEE TII — Q1. **Truy cập:** trả phí (IEEE Xplore); bản PDF tác giả tự lưu trữ tại Singapore Management University (ink.library.smu.edu.sg).
  - Mở rộng L2D cho **đúng bài toán FJSP** (không chỉ JSP cứng nhắc) — cùng dạng bài toán với đề tài (mỗi công đoạn có nhiều máy khả thi). Được xem là tham chiếu chuẩn khi hỏi "SOTA cho FJSP bằng RL là gì".

- **Smit, I. G., Zhou, J., Reijnen, R., Wu, Y., Chen, J., Zhang, C., Bukhsh, Z., Zhang, Y., & Nuijten, W. (2024).** Graph Neural Networks for Job Shop Scheduling Problems: A Survey. *Computers & Operations Research*. arXiv:2406.14096. https://arxiv.org/abs/2406.14096
  - **Venue:** Computers & Operations Research — Q1. **Truy cập:** open access qua arXiv.
  - Bài tổng quan toàn diện nhất hiện có riêng cho **GNN áp dụng vào JSP/FJSP** — phân loại biểu diễn đồ thị, kiến trúc GNN, cách kết hợp với RL.

**Vì sao khó kiểm chứng lịch có hợp lý không:** cả 3 tài liệu trên dùng mạng nơ-ron sâu (GNN + policy network) ra quyết định — về bản chất là **hộp đen**: không có cách nào trích xuất "vì sao chọn job này trước job kia" bằng suy luận tường minh như CP-SAT (constraint nào đang active, ràng buộc nào giới hạn lời giải), và cũng không chứng minh được lời giải cách tối ưu bao xa — tức là không tự khẳng định được lịch có "hợp lý" hay không, phải tin vào hiệu năng thực nghiệm trên tập test. Đây không phải nhận định chủ quan của đề tài — chính cộng đồng nghiên cứu năm 2026 cũng xác nhận và tìm cách vá:

- **Hu, C., Zhang, Y., & Baier, H. (2026).** Scheduling That Speaks: An Interpretable Programmatic Reinforcement Learning Framework. arXiv:2605.18454. https://arxiv.org/abs/2605.18454
  - **Venue:** arXiv preprint (05/2026, rất mới). **Truy cập:** open access.
  - Đề xuất **ProRL** — khung RL sinh ra policy dạng **chương trình con người đọc được** (thay mạng nơ-ron) để giải JSP, đúng vì lý do "DRL scheduling hiện tại là hộp đen, cản trở triển khai thực tế khi người quản lý cần hiểu quyết định". Đáng chú ý: ProRL đạt hiệu năng **gần bằng hoặc tốt hơn CP-SAT** ở quy mô lớn khi cho CP-SAT 1 giờ để giải — ngay cả hướng "sửa RL cho dễ kiểm chứng hơn" vẫn phải lấy **CP-SAT làm mốc so sánh chuẩn**, không phải cái cần thay thế.

- **Liu, A., Lin, S., Chen, J., Wu, P., & Shen, Z. M. (2025/2026).** Machine Learning for Scheduling Decision Systems: A Critical Review of Architecture, Assurance, and Deployment. arXiv preprint (nộp 12/2025, sửa lần cuối 09/2026). https://arxiv.org/abs/2512.22642
  - **Venue:** arXiv preprint, rất mới. **Truy cập:** open access.
  - Phản bác khung nhìn "hệ thống lập lịch đi từ solver-based lên ML-driven là 1 đường tiến hoá tất yếu". Nguyên văn: *"solver-led, shared-authority, and model-led configurations are alternative designs, not maturity stages"* — 3 kiểu kiến trúc là **lựa chọn thiết kế song song tuỳ bài toán**, không phải nấc thang "cũ → mới"; hiệu năng mô hình không tự động cho nó quyền quyết định cao hơn, còn phụ thuộc governance/assurance (ai chịu trách nhiệm khi sai).

**Đánh giá cho đề tài:** RL/GNN là xu hướng chủ đạo của thế giới, nhưng mô hình hộp đen khiến khó kiểm chứng lại vì sao 1 lịch là hợp lý (không lộ constraint nào quyết định, không chứng minh được tối ưu/gap — đúng cái CP-SAT làm tốt và đề tài cần cho mục tiêu chính), cộng thêm effort xây pipeline train cao và rủi ro lớn trong 12–14 tuần còn lại, không có prototype sẵn. Vì vậy **không dùng làm thuật toán lõi**. Nếu muốn tận dụng, chỉ nên ở vai trò phụ trợ tăng tốc CP-SAT (matheuristic/hybrid CP-ML, mục 4) — ví dụ dùng lời giải CP-SAT làm dữ liệu huấn luyện cho 1 mô hình dự đoán biến nào không cần giải lại giữa các chu kỳ rolling-horizon:

- **Chalumeau, F., Coulon, I., Cappart, Q., & Rousseau, L.-M. (2021).** SeaPearl: A Constraint Programming Solver guided by Reinforcement Learning. arXiv:2102.09193. https://arxiv.org/abs/2102.09193 — solver CP dùng RL học **chiến lược branching**, lõi vẫn là CP đảm bảo tính đúng, RL chỉ tăng tốc tìm kiếm. Nhóm tác giả tự nhận là proof-of-concept, chưa đọ được CP-SAT/CPLEX.
- **Echeverria, I., Murua, M., & Santana, R. (2024).** Leveraging constraint programming in a deep learning approach for dynamically solving the flexible job-shop scheduling problem. *Expert Systems with Applications*, 265, Article 125895. arXiv:2403.09249. https://doi.org/10.1016/j.eswa.2024.125895 — giải **FJSP động** (đơn hàng đến liên tục, gần với kịch bản "đơn gấp" của đề tài): huấn luyện deep learning bằng lời giải CP làm dữ liệu, dùng để ra quyết định real-time. Vượt 5 phương pháp DRL khác + 1 solver có tên tuổi trên 5 bộ dữ liệu — hướng cụ thể nhất, mới nhất, khớp trực tiếp nhất với kịch bản "đơn gấp/máy hỏng" của đề tài trong cả đợt rà soát này.

---

## 6. Đa-agent / lập lịch phân tán (Multi-Agent Systems)

**Ý tưởng:** mỗi máy/dây chuyền/xưởng là 1 agent tự quyết định, thương lượng (negotiation/bidding) với agent khác để phân công công việc — không có bộ giải trung tâm.

- Tìm được nhiều công trình (agent-based distributed manufacturing scheduling, Cogent Engineering 2019; multi-agent + GA/Tabu Search, US patent 8606386; MARL cho flexible shop scheduling — survey Frontiers in Industrial Engineering, 2025, open access: https://www.frontiersin.org/journals/industrial-engineering/articles/10.3389/fieng.2025.1611512/full) nhưng **không có bài nào đủ khớp** với quy mô bài toán đề tài để trích chi tiết — nhóm phương pháp này giải quyết vấn đề **nhiều xưởng/nhiều dây chuyền độc lập cần điều phối lẫn nhau**, còn đề tài chỉ có **1 dây chuyền đơn giản hoá (bánh trước/bánh sau)** với 1 bộ giải trung tâm.

**Đánh giá cho đề tài:** **Ngoài phạm vi hiện tại.** Chỉ đáng cân nhắc nếu về sau đề tài mở rộng sang nhiều dây chuyền/nhiều nhà máy phối hợp — có thể ghi 1 câu ở mục "Hướng phát triển" của báo cáo cuối kỳ, không cần đọc sâu bây giờ.

---

## 7. Mô phỏng (Simulation-based scheduling / Discrete-Event Simulation)

**Ý tưởng:** không tối ưu trực tiếp, mà mô phỏng hệ thống theo thời gian rời rạc để đánh giá 1 chính sách lập lịch (PDR hoặc lời giải CP-SAT) trong điều kiện có nhiễu/ngẫu nhiên (thời gian xử lý dao động, máy hỏng ngẫu nhiên).

**Đánh giá cho đề tài:** Đề tài hiện đi theo hướng **giải quyết định (CP-SAT) rồi giải lại khi có sự kiện** (deterministic re-optimization), không phải mô phỏng ngẫu nhiên liên tục — đúng với phạm vi đã chốt (`Report_so_bo...md` mục 1.3: "không mục tiêu real-time streaming"). Mô phỏng chỉ đáng dùng nếu muốn **kiểm định độ ổn định** của tác nhân qua nhiều kịch bản ngẫu nhiên (đã có kế hoạch ở mục 3 báo cáo: "bộ sinh dữ liệu có thể điều chỉnh tham số... đánh giá độ ổn định") — đây thực chất đã là 1 dạng simulation-based validation nhẹ, không cần thêm framework DES riêng (SimPy, AnyLogic...).

---

## 8. Bảng so sánh tổng hợp theo 7 tiêu chí của đề tài (mục 0)

| Nhóm phương pháp | Chất lượng lời giải (hợp lý được chứng minh?) | Tốc độ | Kiểm chứng/diễn giải được (phụ) | Ràng buộc phụ phức tạp | Trưởng thành công cụ | Effort trong 12–14 tuần | Vai trò trong đề tài |
|---|---|---|---|---|---|---|---|
| **Exact (CP-SAT)** | **Tối ưu hoặc có gap chứng minh** — đúng nghĩa "hợp lý" mạnh nhất | Chậm khi instance rất lớn | Cao — constraint tường minh | Tốt (global constraint) | Cao (OR-Tools, 5 prototype sẵn) | Đã làm | **Lõi (đã chọn)** |
| PDR (FIFO/EDD/SPT) | Thấp, không đảm bảo hợp lý (chỉ khả thi, không tối ưu) | Tức thời | Cao (quy tắc đơn giản, dễ hiểu) | Không xử lý được trực tiếp | Cao (code vài chục dòng) | Rất thấp | **Baseline bắt buộc (việc 3)** |
| Metaheuristic (GA/TS/PSO) | Khá tốt, không chứng minh tối ưu (hợp lý ở mức thực nghiệm) | Trung bình–chậm | Thấp–trung bình (lời giải cuối không lộ lý do) | Tốt (linh hoạt hàm mục tiêu) | Trung bình (phải tự cài) | Trung bình | Baseline mở rộng (khuyến nghị, không bắt buộc) |
| Matheuristic/Hybrid CP-ML | Tốt, tăng tốc CP mà vẫn giữ phần chứng minh được | Nhanh hơn CP thuần khi warm-start đúng | Trung bình (phần CP vẫn kiểm chứng được, phần ML không) | Tốt | Thấp (nghiên cứu, ít công cụ sẵn) | Cao | Stretch goal (không bắt buộc) |
| RL/GNN thuần | Tốt–rất tốt ở scale lớn, nhưng không chứng minh được hợp lý | Rất nhanh lúc infer (chậm lúc train) | **Thấp** (hộp đen, khó audit) | Tốt (nếu train đúng) | Thấp (phải tự xây pipeline train) | Rất cao, rủi ro cao | **Không dùng** (không đáng đổi thời gian, khó kiểm chứng) |
| Multi-agent | Trung bình (cục bộ tối ưu từng agent, không đảm bảo hợp lý toàn cục) | Nhanh, phân tán | Trung bình | Tốt cho đa-xưởng | Thấp | Cao | Ngoài phạm vi |
| Simulation (DES) | Không tối ưu, chỉ đánh giá | Tuỳ số lần chạy | Cao (thấy rõ hành vi mô phỏng) | Tốt | Trung bình | Trung bình | Đã làm 1 phần (bộ sinh dữ liệu tham số hoá) |

---

## 9. Khuyến nghị tổng hợp

1. **Không đổi lõi.** CP-SAT vẫn là lựa chọn đúng cho mục tiêu "lịch hợp lý" — cho lời giải chứng minh được tối ưu/gap, mỗi ràng buộc tường minh nên dễ kiểm chứng lại, đã có 5 prototype. Kết luận này giờ có căn cứ rộng hơn `lit_review_draft_3.md` (không chỉ so với RL/GNN, mà so với toàn bộ 6 nhóm phương pháp khác).
2. **Việc 3 (implement + evaluate) nên có 2 tầng baseline, không chỉ 1:**
   - Tầng 1 (bắt buộc, đã có trong scope): FIFO/EDD/SPT — trích Haupt (1989) làm căn cứ học thuật cho việc dùng đúng thuật ngữ PDR/SPR.
   - Tầng 2 (khuyến nghị thêm nếu còn thời gian): 1 metaheuristic đối chứng — **Tabu Search với reduced neighborhood** (Araújo et al. 2024/2025) là ứng viên tốt nhất theo bằng chứng mới nhất, mạnh hơn so sánh chỉ với PDR vì PDR thua CP-SAT là kết quả gần như tất nhiên.
3. **Bổ sung 1 đoạn ngắn vào `TECHNICAL_SPEC.md` §2.2 hoặc §4** định vị CP-SAT trong toàn bộ bản đồ phương pháp (không chỉ đối trọng với RL/GNN như hiện tại) — dùng tài liệu #12 (đã có) + Fattahi et al. 2007 + Öztop et al. 2020 (cần Dũng xác nhận tác giả) làm căn cứ nhóm exact; Haupt 1989 cho nhóm PDR.
4. **Matheuristic/multi-agent/simulation:** không cần đọc sâu hơn bây giờ — ghi 1 câu ở mục "Hướng phát triển" của báo cáo cuối kỳ là đủ, đúng tinh thần "đồ án cá nhân, phạm vi rõ ràng" đã chốt.

---

## 10. Danh sách tài liệu mới đề xuất đưa vào `references/` (đợi Dũng duyệt, đánh số #20+)

| Đề xuất # | Tài liệu | Ghi chú xác nhận |
|---|---|---|
| 20 | Fattahi, Saidi Mehrabad & Jolai (2007) — *J. Intelligent Manufacturing* | Đã xác nhận đầy đủ (Springer) |
| 21 | Haupt (1989) — *OR Spectrum* | Đã xác nhận đầy đủ (Springer, DOI verify) |
| 22 | Araújo, Birgin & Ronconi (2024/2025) — *Journal of Scheduling* | Đã xác nhận đầy đủ (arXiv + Springer DOI) |
| 23 | Ngoo, Goh, Sze, Sabar, Ahmad Hijazi & Kendall (2024) — *Applied Soft Computing* | Đã xác nhận đầy đủ |
| 24 | Öztop, Tasgetiren, Eliiyi & Kandiller (2020) — *Computers & Industrial Engineering* | **⚠️ Chưa xác nhận đầy đủ tác giả/DOI** — cần Dũng tự kiểm trên ScienceDirect trước khi fold vào `references/` |

---

*Chưa fold vào `references/` hay `TECHNICAL_SPEC.md`. Đợi Dũng duyệt nội dung + xác nhận lại tài liệu #24 trước khi đánh số chính thức.*
