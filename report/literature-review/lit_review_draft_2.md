# Bản nháp 2: Tài liệu tham khảo bổ sung theo chủ đề còn thiếu

**Mục đích:** đợt rà soát đầu (`report/literature-review/lit_review_draft.md`, đã fold vào báo cáo chính thức, tài liệu #5–11) tập trung vào benchmark dữ liệu + XAI cho lập lịch nói chung. Đợt này rà soát tiếp **6 chủ đề mà `TECHNICAL_SPEC.md` mô tả phương pháp nhưng chưa có trích dẫn nào hỗ trợ** — hiệu suất sử dụng máy (§2.2), tái lập lịch phản ứng/rolling horizon (§2.1, §11), đường găng + độ nhạy (§2.3, hiện chưa có nguồn), lập kế hoạch 2 tầng (§1/§3, kiến trúc cốt lõi chưa có căn cứ phương pháp luận), khung XAI cho OR nói chung (khác GA-specific ở tài liệu #5/#6), và tài liệu học thuật tiếng Việt. Đây là **bản nháp để Dũng duyệt**, chưa đụng vào `Report_so_bo_Do_an_CO5103_VoVanDung.md`, `TECHNICAL_SPEC.md`, hay thư mục `references/`. Mọi trích dẫn đều lấy từ tìm kiếm thật (WebSearch/WebFetch), có DOI/URL kèm theo.

---

## 1. Tài liệu bổ sung theo chủ đề

### 1.1. Hiệu suất sử dụng máy / tối thiểu hoá thời gian nhàn rỗi (§2.2 TECHNICAL_SPEC.md)

**Dauzère-Pérès, S., Ding, J., Shen, L., & Tamssaouet, K. (2024).** The flexible job shop scheduling problem: A review. *European Journal of Operational Research*, 314(2), 409–432. https://doi.org/10.1016/j.ejor.2023.05.017

- **Venue:** EJOR — **Q1** (Scimago, Computer Science/OR). **Truy cập:** trả phí (ScienceDirect), không tìm được bản mở hợp pháp để tải PDF tự động.
- Không tìm được 1 bài chuyên biệt "machine utilization as objective" đủ mạnh và độc lập để đứng riêng — thay vào đó, đây là **bài tổng quan (review) FJSP mới nhất và toàn diện nhất** (30 năm nghiên cứu), phân loại đầy đủ các tiêu chí/ràng buộc/cấu hình FJSP bao gồm cân bằng tải máy và tối thiểu hoá thời gian nhàn rỗi như các biến thể mục tiêu phổ biến. Dùng làm **nguồn tổng quan chính** cho toàn bộ mục 2 (Mô hình hoá bài toán) của báo cáo — hiện §2 không trích dẫn bất kỳ tài liệu tổng quan FJSP nào, chỉ mô tả trực tiếp ràng buộc, đây là khoảng trống lớn nhất phát hiện được trong đợt rà soát này.

### 1.2. Tái lập lịch phản ứng / rolling horizon / khởi tạo nóng (§2.1, §11 TECHNICAL_SPEC.md)

**Li, S., Ouyang, W., Ma, Y., & Wu, C. (2025).** Learning-Guided Rolling Horizon Optimization for Long-Horizon Flexible Job-Shop Scheduling. *arXiv:2502.15791*. https://arxiv.org/abs/2502.15791

- **Venue:** arXiv preprint (2025) — không áp dụng xếp hạng (chưa qua bình duyệt tại thời điểm rà soát). **Truy cập:** open access, PDF tải trực tiếp được từ arXiv.
- Đề xuất **L-RHO**: dùng mạng nơ-ron để quyết định biến nào **không cần giải lại** giữa các chu kỳ rolling-horizon optimization, tăng tốc tới 54% đồng thời cải thiện chất lượng lời giải cho đúng bài toán **FJSP horizon dài**. Trực tiếp trả lời hạn chế đã nêu ở §2.1 TECHNICAL_SPEC.md ("giải lại từ đầu tốn thời gian... cần rolling horizon hoặc warm start") và rủi ro ở §11 ("bài toán động giải lại từ đầu quá chậm khi quy mô lớn") — đây là hướng cụ thể, có thể trích dẫn làm định hướng mở rộng nếu đồ án cần tối ưu tốc độ giải lại cho counterfactual/máy hỏng.

### 1.3. Đường găng + phân tích độ nhạy như cơ chế giải thích (§2.3 TECHNICAL_SPEC.md — hiện KHÔNG có trích dẫn nào)

**Kelley, J. E., & Walker, M. R. (1959).** Critical-path planning and scheduling. In *Papers presented at the December 1–3, 1959, eastern joint IRE-AIEE-ACM computer conference (IRE-AIEE-ACM '59, Eastern)*, ACM Press, 160–173. https://doi.org/10.1145/1460299.1460318

- **Venue:** kỷ yếu hội nghị kinh điển (1959) — không áp dụng xếp hạng hiện đại (quá cũ, trước hệ thống SJR/CORE). **Truy cập:** trả phí (ACM Digital Library); có link tham khảo miễn phí không chính thức tại mosaicprojects.com.au (bản scan lịch sử), nhưng nên trích dẫn qua ACM DL để đúng chuẩn học thuật.
- Đây là **bài báo gốc khai sinh ra phương pháp đường găng (Critical Path Method)** — nguồn phù hợp nhất để trích dẫn khi báo cáo mô tả kỹ thuật "đường găng" ở §2.3/§2.4 mà hiện không có bất kỳ căn cứ tài liệu nào. Nên dùng làm trích dẫn nền tảng (foundational), không phải để so sánh phương pháp.

**Nedbálek, L., & Novák, A. (2025).** Bottleneck Identification in Resource-Constrained Project Scheduling via Constraint Relaxation. In *Proceedings of the 14th International Conference on Operations Research and Enterprise Systems (ICORES 2025)*. arXiv:2504.07495. https://arxiv.org/abs/2504.07495

- **Venue:** ICORES — hội nghị OR, **CORE ranking: C** (theo CORE 2023; đây là tài liệu tham khảo **đầu tiên trong toàn bộ danh mục là báo cáo hội nghị** — 19 tài liệu còn lại đều là tạp chí/sách/báo cáo kỹ thuật/preprint, không có hội nghị nào khác). **Truy cập:** open access, PDF tải trực tiếp được từ arXiv.
- **Trùng khớp gần như trực tiếp** với phương pháp "phân tích độ nhạy" mô tả ở §2.1/§2.3 TECHNICAL_SPEC.md: nới lỏng từng ràng buộc, đo mức cải thiện, xác định ràng buộc nào đang là điểm nghẽn — đúng bài toán lập lịch có ràng buộc tài nguyên (RCPSP, họ hàng gần với FJSP). Đây là tài liệu **sát nhất tìm được cho "phân tích độ nhạy qua nới lỏng ràng buộc"** — nên trích dẫn trực tiếp cho phần này thay vì để trống như hiện tại.

### 1.4. Lập kế hoạch 2 tầng (aggregate planning → detailed scheduling) (§1/§3 TECHNICAL_SPEC.md — kiến trúc cốt lõi, chưa có căn cứ phương pháp luận)

**Hax, A. C., & Meal, H. C. (1975).** Hierarchical integration of production planning and scheduling. In M. A. Geisler (Ed.), *Studies in Management Sciences, Vol. 1: Logistics* (pp. 53–69). North-Holland/American Elsevier.

- **Venue:** chương sách/kỷ yếu kinh điển (1975) — không áp dụng xếp hạng hiện đại. **Truy cập:** trả phí/không có bản số hoá công khai miễn phí được xác nhận; bản PDF tồn tại ở một số trang giảng dạy đại học (ví dụ prolog.univie.ac.at) nhưng không rõ tính hợp pháp bản quyền lâu dài — khuyến nghị chỉ trích dẫn, không tải/phân phối lại PDF đó.
- Đây là **công trình nền tảng khai sinh khái niệm lập kế hoạch phân cấp (hierarchical production planning)**: quyết định ở tầng tổng hợp (aggregate) tạo ràng buộc đầu vào cho quyết định chi tiết hơn (detailed scheduling) — đúng chính xác kiến trúc 2 tầng planning/scheduling mà toàn bộ đồ án dựa trên (§1, §3 TECHNICAL_SPEC.md), nhưng hiện báo cáo mô tả kiến trúc này như một lựa chọn thiết kế riêng, không trích dẫn gốc lý thuyết OR đã có từ 1975. Nên thêm vào phần đầu §2 hoặc §3 để đặt kiến trúc 2 tầng vào đúng bối cảnh lý thuyết đã tồn tại 50 năm, không phải phát minh riêng của đồ án.

### 1.5. Khung XAI cho Operations Research nói chung (bổ sung, khác GA-specific ở tài liệu #5/#6)

**De Bock, K. W., Coussement, K., De Caigny, A., Słowiński, R., Baesens, B., Boute, R. N., Choi, T. M., Delen, D., Kraus, M., Lessmann, S., Maldonado, S., Martens, D., Óskarsdóttir, M., Vairetti, C., Verbeke, W., & Weber, R. (2024).** Explainable AI for Operational Research: A defining framework, methods, applications, and a research agenda. *European Journal of Operational Research*, 317(2). https://doi.org/10.1016/j.ejor.2023.09.026

- **Venue:** EJOR — **Q1**. **Truy cập:** trả phí, không tìm được bản mở hợp pháp. *(Không xác nhận được số trang chính xác qua tìm kiếm — chỉ ghi volume/issue, dùng DOI làm định danh chính, tránh bịa số trang.)*
- Bài **định khung (framework paper)** uy tín nhất hiện có cho XAI trong OR nói chung — không riêng cho GA/scheduling như tài liệu #5/#6 (Wang & Chen). Do 16 tác giả từ nhiều đại học lớn đồng biên soạn, được xem là tài liệu tham chiếu chuẩn khi mở đầu chương tổng quan về XAI trong luận văn — nên dùng để **định nghĩa XAI cho OR** trước khi thu hẹp vào các nghiên cứu cụ thể GA/counterfactual đã có.

**Garn, W., & Amirghasemi, M. (2025).** Transparency of combinatorial optimisations via machine learning and explainable AI. *Annals of Operations Research*, 354, 427–458. https://doi.org/10.1007/s10479-025-06684-8

- **Venue:** Annals of Operations Research — **Q1**. **Truy cập:** trả phí (Springer), không tìm được bản mở hợp pháp (ResearchGate có yêu cầu, không xác nhận PDF công khai).
- Minh hoạ cụ thể (qua bài toán Knapsack) cách mô hình ML diễn giải được (interpretable ML) có thể giải bài toán tối ưu tổ hợp **và** cách áp dụng kỹ thuật XAI hậu kỳ (post-hoc) cho lời giải OR — bổ sung góc nhìn "XAI áp dụng trực tiếp lên bài toán tối ưu tổ hợp" (gần với FJSP hơn là JSP/GA như #5/#6), dùng làm ví dụ thứ 2 minh hoạ diện rộng của hướng nghiên cứu này ngoài lập lịch.

### 1.6. Tài liệu học thuật tiếng Việt về lập lịch

Kết quả **không hoàn toàn trống** như đợt rà soát dữ liệu mở (data.gov.vn) trước — nhưng thứ tìm được **không trùng khớp trực tiếp** với "lập lịch sản xuất/phân xưởng" (JSP/FJSP), mà là lập lịch công việc cá nhân. Ghi nhận trung thực:

**Trang Hồng Sơn (2021).** *Một số phương pháp tiếp cận cho bài toán lập lịch cá nhân*. Luận án Tiến sĩ, ngành Khoa học Máy tính (mã số 62480101), Trường Đại học Bách Khoa – ĐHQG-HCM. Người hướng dẫn: PGS.TS Trần Văn Lăng, PGS.TS Huỳnh Tường Nguyên. https://grad.hcmut.edu.vn/hv/download/LATS/8140009/TOM_TAT_LATS_THSon.pdf

- **Venue:** luận án tiến sĩ — không áp dụng xếp hạng tạp chí/hội nghị. **Truy cập:** open access, PDF tóm tắt luận án tải trực tiếp được từ chính trang grad.hcmut.edu.vn (đã tải và đọc được văn bản để xác nhận nội dung).
- **Cùng trường (Đại học Bách Khoa – ĐHQG-HCM)** với đồ án của Dũng — đây là điểm đáng chú ý nhất, dù chủ đề khác: luận án tập trung vào **lập lịch công việc cá nhân** (personal job scheduling) trên 1 máy đơn, với ràng buộc time-windows và "bounded-splitting" (chia nhỏ công việc có giới hạn) — không phải lập lịch phân xưởng/sản xuất đa máy như FJSP của đồ án. **Không nên trích dẫn như một công trình cùng bài toán** — nhưng có thể trích dẫn như bằng chứng cho thấy nghiên cứu lập lịch (scheduling theory nói chung) tại chính trường Bách Khoa có tiền lệ và chất lượng quốc tế: công trình chính từ luận án này (T. H. Son, T. V. Lang, N. Huynh-Tuong, & A. Soukhal, "Resolution for bounded-splitting jobs scheduling problem on a single machine in available time-windows", *Journal of Ambient Intelligence and Humanized Computing*, 12(1), 1179–1196, 2021) được chính luận án tự ghi nhận là **SCIE Q1, IF=7.104** — độc lập kiểm tra qua Scimago/Researcher.Life cũng cho kết quả **Q1** cho tạp chí này (cần đối chiếu lại năm 2021 cụ thể vì quartile có thể đổi theo năm).
- **Không tìm thấy** luận văn/luận án/bài báo tiếng Việt nào về đúng bài toán "lập lịch sản xuất/phân xưởng đa máy có ràng buộc chuyển đổi + bảo trì + hiệu suất máy" như đề tài của Dũng — các kết quả tìm được khác (Scribd, timtailieu.vn, doan.edu.vn) là tài liệu ôn tập/đồ án sinh viên không rõ nguồn gốc học thuật, chất lượng không đủ để trích dẫn trong luận văn cao học.

---

## 2. Danh sách tiếp nối số thứ tự

*(tiếp số từ tài liệu tham khảo hiện có trong `report/Report_so_bo_Do_an_CO5103_VoVanDung.md` / `report/TECHNICAL_SPEC.md`, hiện đang dừng ở tài liệu số 11)*

12. Dauzère-Pérès, S., Ding, J., Shen, L., & Tamssaouet, K. (2024). The flexible job shop scheduling problem: A review. *European Journal of Operational Research*, 314(2), 409–432. https://doi.org/10.1016/j.ejor.2023.05.017

13. Li, S., Ouyang, W., Ma, Y., & Wu, C. (2025). Learning-Guided Rolling Horizon Optimization for Long-Horizon Flexible Job-Shop Scheduling. *arXiv:2502.15791*. https://arxiv.org/abs/2502.15791

14. Kelley, J. E., & Walker, M. R. (1959). Critical-path planning and scheduling. In *Papers presented at the December 1–3, 1959, eastern joint IRE-AIEE-ACM computer conference (IRE-AIEE-ACM '59, Eastern)*, ACM Press, 160–173. https://doi.org/10.1145/1460299.1460318

15. Nedbálek, L., & Novák, A. (2025). Bottleneck Identification in Resource-Constrained Project Scheduling via Constraint Relaxation. In *Proceedings of the 14th International Conference on Operations Research and Enterprise Systems (ICORES 2025)*. https://arxiv.org/abs/2504.07495

16. Hax, A. C., & Meal, H. C. (1975). Hierarchical integration of production planning and scheduling. In M. A. Geisler (Ed.), *Studies in Management Sciences, Vol. 1: Logistics* (pp. 53–69). North-Holland/American Elsevier.

17. De Bock, K. W., Coussement, K., De Caigny, A., Słowiński, R., Baesens, B., Boute, R. N., Choi, T. M., Delen, D., Kraus, M., Lessmann, S., Maldonado, S., Martens, D., Óskarsdóttir, M., Vairetti, C., Verbeke, W., & Weber, R. (2024). Explainable AI for Operational Research: A defining framework, methods, applications, and a research agenda. *European Journal of Operational Research*, 317(2). https://doi.org/10.1016/j.ejor.2023.09.026

18. Garn, W., & Amirghasemi, M. (2025). Transparency of combinatorial optimisations via machine learning and explainable AI. *Annals of Operations Research*, 354, 427–458. https://doi.org/10.1007/s10479-025-06684-8

19. Trang, H. S. (2021). *Một số phương pháp tiếp cận cho bài toán lập lịch cá nhân* [Luận án Tiến sĩ]. Trường Đại học Bách Khoa – ĐHQG-HCM. https://grad.hcmut.edu.vn/hv/download/LATS/8140009/TOM_TAT_LATS_THSon.pdf

---

## Ghi chú tổng kết

- **6/6 chủ đề đều tìm được ít nhất 1 nguồn thật**, kể cả chủ đề tiếng Việt (mục 1.6) — nhưng nguồn tiếng Việt **không cùng bài toán** (lập lịch cá nhân, không phải lập lịch sản xuất/phân xưởng), cần nêu rõ giới hạn này nếu đưa vào luận văn, tránh gây hiểu nhầm là "đã có tiền lệ trực tiếp trong nước".
- Tài liệu #15 (Nedbálek & Novák, ICORES 2025) là **báo cáo hội nghị đầu tiên** trong toàn bộ danh mục tham khảo — có xếp hạng CORE (hạng C), khác với 18 tài liệu còn lại đều là tạp chí/sách/preprint/luận án.
- 2 tài liệu (#12, #17 — cả hai đều trên EJOR) và #18 (Annals of OR) đều **trả phí, không tải được PDF hợp pháp** qua tự động hoá — cần tải thủ công qua tài khoản thư viện trường nếu muốn có bản đầy đủ.
- Đã tránh bịa số trang cho tài liệu #17 (chỉ ghi volume/issue, không đoán page range) vì không xác nhận được qua tìm kiếm — nên tự tra lại DOI để lấy số trang chính xác nếu cần trích dẫn đầy đủ.
