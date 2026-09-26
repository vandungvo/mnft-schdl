# Biên bản rà soát literature-review — 19/09/2026

**Kết quả:** tạo [bản tổng quan mới](literature_review.md), tổng hợp và hiệu chỉnh ba bản nháp. Giữ nguyên nội dung các bản nháp để truy vết. Đây là rà soát tài liệu, không phải kết quả chạy solver hay nghiệm thu phần mềm.

## 1. Tài liệu đã đối chiếu

- [Bản nháp 1](lit_review_draft.md): nguồn dữ liệu, tài liệu bổ sung và bảng đối sánh.
- [Bản nháp 2](lit_review_draft_2.md): tài liệu theo chủ đề.
- [Bản nháp 3](lit_review_draft_3.md): xu hướng thuật toán và CP-SAT/RL.
- [Yêu cầu bài toán](../problem-requirements/problem_requirements.md): phạm vi hiện hành, bao gồm 3 ca/ngày.
- [Khảo sát phương pháp hiện hành](../scheduling-algorithms/scheduling_methods_and_recommendation.md): đối chiếu định hướng, định nghĩa và danh mục nguồn; không thẩm định lại toàn bộ tài liệu thuật toán.
- Danh mục `references/README.md`, các ghi chú nguồn liên quan và mô tả dataset. Các mô tả kết quả cũ được xem là thông tin cần kiểm chứng, không tự động kế thừa.

## 2. Các vấn đề nội dung và cách xử lý

| Mã | Phát hiện | Vị trí trong bản cũ | Xử lý trong bản mới |
|---|---|---|---|
| RV01 | Đồng nhất lịch hợp lý, giải thích được và chứng minh tối ưu | Nháp 3, phần kết luận và mục 2 | Tách khả thi, chất lượng, tối ưu; validator áp dụng cho mọi thuật toán |
| RV02 | Kết luận RL/GNN không thể kiểm chứng lịch | Nháp 3, mục 2 | Phân biệt chính sách khó diễn giải với lịch có thể kiểm tra; nêu chi phí dữ liệu và môi trường học |
| RV03 | Gọi RL/GNN là xu hướng chủ đạo của toàn thế giới từ một nhóm nguồn | Nháp 3, mục 1 | Mô tả là một hướng phát triển; bổ sung CP, heuristic, bảo trì và hybrid |
| RV04 | Gọi CP-SAT là cách chắc chắn nhất, dựa một phần vào tính giải thích | Nháp 3, kết luận/khuyến nghị | Giữ CP-SAT như lựa chọn triển khai cần pilot; không khẳng định ưu thế phổ quát |
| RV05 | Hàng đồ án ghi “có đủ” dù chưa có thực nghiệm tương ứng | Nháp 1, bảng đối sánh | Đổi thành thiết kế dự kiến; không trộn mục tiêu và thành quả |
| RV06 | Dùng ô “không” cho nội dung không thấy trong abstract | Nháp 1, bảng đối sánh | Nêu nội dung đã xác nhận và giới hạn; không suy diễn sự vắng mặt |
| RV07 | Khoảng trống nghiên cứu được khẳng định quá rộng | Nháp 1, sau bảng đối sánh | Định vị đóng góp ứng dụng/tích hợp, không tuyên bố đầu tiên trên thế giới |
| RV08 | Chưa phân biệt tuyến cố định và FJSP tổng quát | Các nháp | Đối chiếu hybrid flow shop theo LR02 và yêu cầu hiện tại |
| RV09 | Xem setup khuôn gần như đồng nhất với bảo trì theo chu kỳ | Nháp 1, nguồn khuôn | Tách setup, chiếm tài nguyên và tuổi thọ khuôn; bổ sung nguồn bảo trì LR06 |
| RV10 | So kết quả dữ liệu Deliktaş như chỉ thêm setup | Nháp 1, phần dữ liệu | Nêu cell, vận chuyển, tái nhập; dữ liệu chuyển đổi không so trực tiếp kết quả gốc |
| RV11 | Dữ liệu Mota dễ bị hiểu là thông số nhà máy bánh xe hoặc toàn bộ là phép đo thô | Nháp 1, mục 1.4 và ghi chú dataset | Giới hạn ở tham khảo miền khác; phân biệt input và output tối ưu |
| RV12 | Kết luận các cổng dữ liệu “không có nguồn dùng được” | Nháp 1, mục 1 | Chỉ ghi chưa chọn được nguồn phù hợp; không tuyên bố tra cứu toàn diện |
| RV13 | Chưa có cơ sở cho nhận định giải lại CP-SAT “chính xác hơn” phản thực dựa dự đoán | Ghi chú nguồn #7, ảnh hưởng lập luận XAI | Nêu hai câu hỏi/phương pháp khác nhau; muốn so chất lượng cần thiết kế chung |
| RV14 | Warm-start bị gộp vào hướng học máy | Nháp 3, khuyến nghị | Tách hint không học, rolling horizon và hybrid có học |
| RV15 | Giữ diễn giải nâng cao như tính năng chắc chắn có | Nháp 1 và nháp 2 | KPI/trạng thái bắt buộc; XAI nâng cao là phụ theo yêu cầu |
| RV16 | Dùng 12–14 tuần như thời gian thực tế còn lại | Nháp 3 | Không dùng để suy luận thời gian còn lại; chưa xác nhận lịch học kỳ |
| RV17 | Thiếu quy tắc 3 ca/ngày trong đối chiếu nghiệp vụ | Các nháp | Bổ sung 3 ca × 8 giờ danh nghĩa; ca bật theo máy, trừ nghỉ/downtime |
| RV18 | Chưa phân tích mặt trái của chỉ phạt idle | Nháp 2, hiệu suất | Bổ sung suy luận đại số: idle có thể giảm do tăng setup/bảo trì; cần ablation và KPI tách riêng |

## 3. Đính chính thông tin nguồn

| Nguồn | Kết quả kiểm tra | Căn cứ |
|---|---|---|
| Cheng et al. — nguồn cũ #8 | Thuật toán nền là MODE cải tiến, không chỉ heuristic chèn; có khác biệt setup cần đối chiếu A04 | [Bản bài báo tác giả chia sẻ](https://www.researchgate.net/publication/378677223_Flexible_job_shop_scheduling_method_for_optimizing_mold_resource_setup_time), DOI 10.1109/ACCESS.2024.3372396 |
| Li et al. — nguồn cũ #13 | Đã xuất bản tại ICLR 2025; nhãn chỉ-preprint trong nháp 2 và ghi chú cũ lỗi thời | [Kỷ yếu ICLR](https://proceedings.iclr.cc/paper_files/paper/2025/file/052e2404709e8df9dc38fbc7bfec5b80-Paper-Conference.pdf) |
| Smit et al. — nháp 3 | Bản tạp chí năm 2025, Computers & Operations Research 176, 106914; preprint năm 2024 | [Kho TU/e](https://research.tue.nl/en/publications/graph-neural-networks-for-job-shop-scheduling-problems-a-survey-2/) |
| Echeverria et al. — nháp 3 | Bản tạp chí năm 2025, ESWA 265, 125895; preprint 2024. Có phối hợp CP khi tạo lời giải, không chỉ sinh nhãn học | [Nhà xuất bản](https://www.sciencedirect.com/science/article/pii/S0957417424027623), [preprint](https://arxiv.org/html/2403.09249v1) |
| Deliktaş et al. — nguồn cũ #10 | Mã bài **109946**, DOI **10.1016/j.dib.2023.109946**; không phải 110037 trong SOURCE.md cũ | [Bản ghi bài gốc](https://pubmed.ncbi.nlm.nih.gov/38152490/) |
| Dataset Deliktaş | Dataset v1 công bố 14/08/2023; phân biệt với bài mô tả thuộc tập năm 2024 | [Mendeley Data](https://data.mendeley.com/datasets/rtzby7pv7m/1) |
| Mehdiyev et al. — nguồn cũ #7 | Trang nhà xuất bản có toàn văn open access; không tiếp tục ghi “không tìm được bản mở” | [Springer](https://link.springer.com/article/10.1007/s12559-024-10294-0) |
| Garn & Amirghasemi — nguồn cũ #18 | Trang nhà xuất bản ghi open access; không tiếp tục ghi trả phí/không có bản mở | [Springer](https://link.springer.com/article/10.1007/s10479-025-06684-8) |
| Hax & Meal — nguồn cũ #16 | Có working paper năm 1973 tại MIT; bản này khác chương sách 1975 | [Kho MIT](https://dspace.mit.edu/handle/1721.1/1868) |
| Nedbálek & Novák — nguồn cũ #15 | Xác nhận ICORES 2025, trang 340–347, DOI 10.5220/0013253700003893 | [Metadata arXiv](https://arxiv.org/abs/2504.07495) |
| Danh mục hội nghị | Nhận định “chỉ một nguồn hội nghị” không còn đúng: có CPM, NeurIPS, ICLR và ICORES | Các nguồn LR10/LR13/LR20/LR29 trong bản mới |
| Xếp hạng Q1/CORE | Bỏ khỏi lập luận chính; không kiểm tra lại toàn bộ năm/category trong đợt này | Không dùng xếp hạng thay mức phù hợp hoặc chất lượng bằng chứng |

## 4. Nguồn bổ sung và nguồn không ưu tiên

Nguồn mới có ích trực tiếp gồm: Ghaleb et al. (2021) về bảo trì tích hợp; Vieira et al. (2003) về tái lập lịch; Ruiz & Vázquez-Rodríguez (2010) về cấu trúc hybrid flow shop; Allahverdi (2015) về setup; Nguyễn Hồng Phúc et al. (2026) về FJSP, tăng ca và thuê ngoài. Một số nguồn đã hiện diện trong thư mục khảo sát thuật toán nhưng chưa được tích hợp đúng vào literature-review.

Nguồn tiếng Việt mới được kiểm tra trên trang tạp chí và PDF. Với bài Nguyễn Hữu Mùi–Vũ Đình Hòa, PDF ghi **2012, 50(6), 565–577**, còn trang bài ghi **50(5)** và ngày đăng **2017**. Bản mới dùng năm theo PDF, bỏ số kỳ khỏi trích dẫn tạm và ghi rõ xung đột. Không âm thầm chọn một metadata thuận tiện. [PDF](https://vjs.ac.vn/jst/article/download/9529/7806/35526), [trang bài](https://vjs.ac.vn/jst/article/view/9529)

Luận án lập lịch cá nhân của Trang Hồng Sơn vẫn được giữ trong hồ sơ nguồn cũ, nhưng không dùng làm công trình đối sánh chính vì khác đối tượng và cấu trúc bài toán. Không cần dựa vào việc cùng trường hoặc xếp hạng tạp chí để tăng mức liên quan.

Hu et al. và Liu et al. năm 2026 được giữ ở vai trò tham khảo xu hướng, có nhãn preprint. Không lặp lại so sánh hiệu năng ProRL với CP-SAT trong nháp 3 vì chưa thẩm định đầy đủ thiết lập và bảng kết quả cho nhận định đó.

## 5. Giới hạn còn lại và đồng bộ sau này

Bản tổng quan đã hoàn chỉnh ở mức tổng hợp và định hướng; một số giới hạn bằng chứng vẫn phải được giữ minh bạch:

- Nhiều công trình được phân tích ở mức abstract/trang nhà xuất bản. Chưa tái lập thực nghiệm hay kiểm chứng mọi chi tiết mô hình của chúng.
- Chưa có dữ liệu nhà máy bánh xe xác nhận A01–A07. Quy định 3 ca/ngày là yêu cầu của đồ án.
- Chưa có kết quả đồ án đủ để khẳng định cải thiện hiệu suất, chất lượng hoặc tiết kiệm năng lượng.
- Chưa chốt ngưỡng nghiệm thu định lượng và best-known có ngày tham chiếu cho toàn bộ benchmark.
- Xung đột metadata LR26 được ghi nhận, không dùng để hỗ trợ kết luận định lượng.

Phạm vi cập nhật lần này là `report/literature-review/`. Các ghi chú trong `references/`, `dataset/*/SOURCE.md`, báo cáo sơ bộ và TECHNICAL_SPEC có thể vẫn chứa thông tin cũ. Khi đồng bộ các tài liệu đó, ưu tiên sửa mã bài Deliktaş, tình trạng xuất bản L-RHO, tình trạng open access, nhận định về nguồn tiếng Việt và cách diễn đạt “lịch hợp lý”. Không tự coi các tệp cũ là đã được sửa chỉ vì bản tổng quan mới có thông tin đúng.
