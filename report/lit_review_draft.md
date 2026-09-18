# Bản nháp: Bổ sung dữ liệu chuẩn + tài liệu tham khảo + bảng đối sánh

**Mục đích:** trả lời 3 yêu cầu của cô Châu sau khi xem báo cáo sơ bộ (check thêm benchmark data, check thêm tài liệu tham khảo gần đây, làm bảng đối sánh). Đây là **bản nháp để Dũng duyệt** — chưa đụng vào `Report_so_bo_Do_an_CO5103_VoVanDung.md` hay `TECHNICAL_SPEC.md`. Mọi trích dẫn dưới đây đều lấy từ tìm kiếm thật (WebSearch/WebFetch), có link/DOI kèm theo; chỗ nào không xác nhận được đầy đủ thì ghi rõ là chưa xác nhận thay vì đoán.

---

## 1. Bổ sung nguồn dữ liệu chuẩn/tham khảo

### 1.1. data.gov (Mỹ)

Đã kiểm tra `catalog.data.gov` với tag "manufacturing". **Không có dataset nào phù hợp trực tiếp** cho lập lịch sản xuất/FJSP. Các dataset xuất hiện chủ yếu là: chỉ số sản xuất công nghiệp & tỷ lệ sử dụng công suất (Federal Reserve), dữ liệu đánh giá hiệu quả năng lượng (Industrial Assessment Centers), dữ liệu bán lẻ/kho vận — không phải dữ liệu cấp độ máy/công đoạn/đơn hàng mà đề tài cần. **Kết luận: data.gov không có nguồn dùng được cho phần lõi thuật toán hay dữ liệu tổng hợp của đề tài** — có thể bỏ qua, không cố ép dùng.

### 1.2. data.gov.vn

Cổng dữ liệu quốc gia (`data.gov.vn` / `open.data.gov.vn`) vận hành từ 2020; theo tin tức 2026, chính phủ mới bắt đầu lộ trình công bố "dữ liệu mở có kiểm soát" cho doanh nghiệp/viện nghiên cứu khai thác từ năm 2026. Tìm kiếm không cho ra danh mục dataset sản xuất công nghiệp/lập lịch cụ thể nào có thể trích dẫn — cổng này dường như chưa được index tốt bởi search engine và/hoặc dữ liệu ngành sản xuất cấp doanh nghiệp chưa được công bố. **Kết luận trung thực: chưa tìm thấy nguồn dùng được trên data.gov.vn cho đề tài này** — nếu muốn khai thác thật sự cần vào trực tiếp cổng và duyệt theo danh mục (không qua search engine), nhưng không nên kỳ vọng có dữ liệu cấp nhà máy/đơn hàng ở đây.

### 1.3. Kaggle

- **"Job Shop Scheduling Challenge: Minimize Makespan with ML"** (competition, 2026) — https://www.kaggle.com/competitions/job-shop-scheduling-2026 — dạng thi ML dự đoán phân công tối ưu, dữ liệu dạng bảng. Có thể tham khảo cách đóng khung bài toán nhưng không phải benchmark instance chuẩn theo nghĩa Taillard/Lawrence.
- **"100Jobshop Problem data"** — https://www.kaggle.com/datasets/yidalin/10000jobshop-problem-data — dataset JSP tổng hợp quy mô lớn. *Không fetch được mô tả chi tiết (trang Kaggle render bằng JS, WebFetch không đọc được nội dung)* — cần tải thủ công để kiểm tra schema trước khi dùng.
- **"Manufacturing Production Data"** — https://www.kaggle.com/datasets/ziya07/manufacturing-production-data — cùng hạn chế fetch như trên, chưa xác nhận được nội dung cụ thể.
- **"Job Shop Scheduling for Ultra-Distributed Systems"** — đây là bài toán lập lịch job trong hệ phân tán (distributed computing), **không cùng miền** với lập lịch sản xuất vật lý — loại khỏi danh sách, chỉ nêu để tránh nhầm lẫn nếu tra cứu sau này thấy tên tương tự.

### 1.4. Zenodo — nguồn thực tế đáng chú ý nhất

**Mota, B., Gomes, L., Faria, P., Ramos, C., & Vale, Z. (2020).** *Production line dataset for task scheduling and energy optimization – Schedule Optimization* (v0.1) [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.4106746

- Dữ liệu **thật** từ một nhà máy sản xuất hangtag dệt may: 3 máy trong 1 cell sản xuất, 6 ngày (thứ 2 7h – thứ 7 23h), lấy mẫu 5 phút/lần cho cả thời lượng tác vụ lẫn năng lượng tiêu thụ. Giấy phép MIT.
- **Không phải** JSSP benchmark chuẩn (không có cấu trúc job/machine eligibility như Taillard), nhưng là dữ liệu thực về **năng lượng + thời gian tác vụ theo máy** — phù hợp để tham chiếu/hiệu chỉnh tham số cho ràng buộc "hiệu suất sử dụng máy" (mục 2.2 của thesis) thay vì dùng hoàn toàn số liệu tự bịa. Đề xuất trích dẫn như một nguồn đối chứng thực tế cho phần này, không phải benchmark thay thế Taillard/Lawrence.

### 1.5. Mendeley Data — benchmark FJSP có sẵn ràng buộc gần với đề tài hơn Taillard/Lawrence

**Deliktaş, D., Özcan, E., Üstün, Ö., & Torkul, O. (2024).** A benchmark dataset for multi-objective flexible job shop cell scheduling. *Data in Brief*, 52. Dataset: https://data.mendeley.com/datasets/rtzby7pv7m/1 — bài mô tả: https://www.sciencedirect.com/science/article/pii/S2352340923009770

- 43 instance benchmark (nhỏ → lớn, gồm 1 instance thực tế lớn), **có sẵn setup time phụ thuộc trình tự theo họ sản phẩm** (sequence-dependent family setup times) — đúng loại ràng buộc "ma trận chuyển đổi" mà Taillard/Lawrence **không có**. Đề xuất thêm bộ này làm **benchmark thứ 3**, dùng riêng để đối chứng phần ràng buộc changeover time, bổ khuyết cho hạn chế đã ghi trong `TECHNICAL_SPEC.md` §2.4 ("Taillard/Lawrence không có ràng buộc đặc thù đề tài").
- Bộ liên quan (worker flexibility, ít liên quan hơn vì đề tài không có ràng buộc nhân công đa kỹ năng): "Benchmark data instances for the Multi-Objective FJSP with Worker Flexibility" trên Mendeley Data, đi kèm arXiv:2501.16159 (2025) — nêu để biết, không đề xuất dùng.

**Tóm tắt mục 1:** data.gov và data.gov.vn không có nguồn dùng được (đã kiểm tra trung thực, không gượng ép). Nguồn hữu ích nhất tìm được là (a) Zenodo — dữ liệu thực về năng lượng/thời gian máy, và (b) Mendeley/Data in Brief — benchmark FJSP có setup time phụ thuộc trình tự, sát với ràng buộc đề tài hơn Taillard/Lawrence.

---

## 2. Tài liệu tham khảo bổ sung

*(tiếp số thứ tự từ báo cáo sơ bộ, hiện đang dừng ở tài liệu số 4)*

5. Wang, Y. C., & Chen, T. (2024). Adapted techniques of explainable artificial intelligence for explaining genetic algorithms on the example of job scheduling. *Expert Systems with Applications*, 237, 121369. https://doi.org/10.1016/j.eswa.2023.121369
   *Liên quan:* công trình gần nhất về việc "mở hộp đen" cho một thuật toán lập lịch (GA thay vì CP-SAT) để người vận hành nhà máy hiểu được — cùng động lực với module Explanation của đề tài, nhưng khác thuật toán nền và không có ràng buộc đặc thù ngành.

6. Wang, Y. C., & Chen, T. (2025). *Explainable and Customizable Job Sequencing and Scheduling: Advancing Production Control and Management with XAI*. Springer. https://link.springer.com/book/9783031853739
   *Liên quan:* sách đầu tiên hệ thống hoá kỹ thuật XAI áp dụng cho lập lịch sản xuất — dùng làm nguồn cho phần khung lý thuyết XAI ở chương tổng quan.

7. Mehdiyev, N., Majlatow, M., & Fettke, P. (2024). Counterfactual Explanations in the Big Picture: An Approach for Process Prediction-Driven Job-Shop Scheduling Optimization. *Cognitive Computation*. https://doi.org/10.1007/s12559-024-10294-0
   *Liên quan:* trực tiếp nhất với module "phản thực" (counterfactual) của đề tài — sinh giải thích phản thực đa mục tiêu (NSGA-II) cho quyết định lập lịch phân xưởng; khác đề tài ở chỗ dựa trên predictive process monitoring, không phải giải lại bằng CP-SAT.

8. Flexible Job Shop Scheduling Method for Optimizing Mold Resource Setup Time (2024). *IEEE Access*. DOI: 10.1109/ACCESS.2024.3372396.
   *Liên quan:* công trình duy nhất tìm được coi **khuôn (mold) là tài nguyên lập lịch có setup time riêng** — gần như trùng khớp với ràng buộc "khuôn" của đề tài (mục 2 TECHNICAL_SPEC.md). *Lưu ý:* chưa xác nhận được đầy đủ tên tác giả qua tìm kiếm (trang IEEE Xplore/ResearchGate yêu cầu đăng nhập) — cần tra lại bằng DOI trước khi đưa vào danh mục tài liệu tham khảo chính thức.

9. Lan, L., & Berkhout, J. (2025). PyJobShop: Solving scheduling problems with constraint programming in Python. *arXiv:2502.13483*. https://arxiv.org/abs/2502.13483
   *Liên quan:* thực nghiệm trên hơn 9.000 benchmark instance JSP/FJSP/RCPSP cho thấy OR-Tools CP-SAT cạnh tranh tốt với CP Optimizer thương mại — củng cố lựa chọn công cụ (CP-SAT) đã nêu ở §2.1/§4 TECHNICAL_SPEC.md bằng bằng chứng thực nghiệm độc lập, thay vì chỉ dựa vào tài liệu Google OR-Tools.

10. Deliktaş, D., Özcan, E., Üstün, Ö., & Torkul, O. (2024). A benchmark dataset for multi-objective flexible job shop cell scheduling. *Data in Brief*, 52. https://www.sciencedirect.com/science/article/pii/S2352340923009770 — dataset: https://data.mendeley.com/datasets/rtzby7pv7m/1
    *Liên quan:* xem mục 1.5 — benchmark bổ sung có setup time phụ thuộc trình tự.

11. Mota, B., Gomes, L., Faria, P., Ramos, C., & Vale, Z. (2020). Production line dataset for task scheduling and energy optimization – Schedule Optimization (v0.1) [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.4106746
    *Liên quan:* xem mục 1.4 — dữ liệu thực về thời gian tác vụ/năng lượng theo máy.

**Tham khảo thêm (không đưa vào 6-10 mục chính vì mức độ liên quan thấp hơn, nhưng đáng ghi chú cho phần rủi ro/hướng mở rộng ở §11 TECHNICAL_SPEC.md):** "Leveraging Constraint Programming in a Deep Learning Approach for Dynamically Solving the Flexible Job-Shop Scheduling Problem", arXiv:2403.09249 (2024) — kết hợp CP với deep learning để giải FJSP động, liên quan đến ý tưởng "khởi tạo nóng/rolling horizon" đã ghi trong rủi ro của spec.

---

## 3. Bảng đối sánh

| Nghiên cứu | Loại bài toán | Thuật toán/phương pháp | Ràng buộc đặc thù | Khả năng giải thích | Xử lý gián đoạn động | Dữ liệu dùng |
|---|---|---|---|---|---|---|
| Wang & Chen 2024 (ESWA) | JSP (bán dẫn) | GA + hậu xử lý XAI (decision tree, contribution diagram) | Không | Có — diễn giải sau khi giải, không phải phản thực | Không | Tổng hợp mô phỏng |
| Wang & Chen 2025 (sách) | JSP tổng quát | GA + các thuật toán bio-inspired khác | Không đặc thù ngành | Có — khung XAI hệ thống | Không | Minh hoạ tổng hợp |
| Mehdiyev et al. 2024 (Cognitive Computation) | JSP (dự đoán quy trình + tối ưu) | Predictive process monitoring + NSGA-II | Không | Có — phản thực đa mục tiêu | Ngầm định (kịch bản what-if) | Log quy trình thực tế |
| FJSP-MRST (IEEE Access 2024) | FJSP + tài nguyên khuôn | Heuristic chèn kép mold-machine | Có — setup phụ thuộc khuôn | Không | Không | Tổng hợp |
| Lan & Berkhout 2025 (PyJobShop) | FJSP/JSP/RCPSP tổng quát | CP-SAT & CP Optimizer (đối chứng thực nghiệm) | Tổng quát, không đặc thù | Không | Không | >9.000 instance benchmark công khai |
| Deliktaş et al. 2024 (Data in Brief) | FJSP cellular + setup theo họ SP | Không quy định thuật toán (bộ dữ liệu) | Có — setup phụ thuộc trình tự theo họ | Không | Không | 43 instance chuẩn công khai |
| Mota et al. 2020 (Zenodo) | Lập lịch dây chuyền thực tế + năng lượng | GA | Có — dữ liệu năng lượng thực | Không | Không | **Dữ liệu thực** (nhà máy dệt may) |
| **Đề tài này (Dũng, 2026)** | FJSP 4 công đoạn (đúc→CNC→sơn→QC), 2 tầng planning/scheduling | CP-SAT (OR-Tools) | **Có đủ:** setup phụ thuộc trình tự, lô tối thiểu, bảo trì khuôn, tồn kho an toàn, hiệu suất sử dụng máy | **Có:** đường găng + độ nhạy + phản thực (đơn gấp/máy hỏng) + báo cáo hiệu suất máy | **Có:** đơn gấp + máy hỏng, giải lại và so lịch gốc | Tổng hợp tham số hoá theo thực tế + đối chứng lõi trên Taillard/Lawrence/Deliktaş et al. |

**Nhận định:** không có công trình nào tìm được kết hợp đủ cả 3 trục (bộ ràng buộc đặc thù ngành sản xuất linh kiện + khả năng giải thích + xử lý gián đoạn động) trong cùng một hệ thống. Mỗi công trình chỉ mạnh ở một trục: FJSP-MRST xử lý tốt ràng buộc khuôn nhưng không giải thích; Mehdiyev et al. giải thích phản thực tốt nhưng không có ràng buộc sản xuất đặc thù; Wang & Chen mạnh về khung XAI nhưng dùng GA và không xử lý gián đoạn động. **Đây chính là khoảng trống (gap) mà đề tài lấp vào** — nên nhấn mạnh điểm này khi viết chương tổng quan, thay vì chỉ liệt kê từng công trình riêng lẻ.

---

*Nháp này chưa đưa vào `Report_so_bo_Do_an_CO5103_VoVanDung.md` hay `TECHNICAL_SPEC.md`. Dũng xem lại, đặc biệt là mục 8 (tác giả IEEE Access chưa xác nhận đầy đủ) trước khi chính thức hoá.*
