# [9] Lan & Berkhout (2025) — PyJobShop

**Trích dẫn:** Lan, L., & Berkhout, J. (2025). PyJobShop: Solving scheduling problems with constraint programming in Python. *arXiv:2502.13483*. https://arxiv.org/abs/2502.13483

**License:** arXiv preprint — tự do tải. **File PDF đã tải về:** `pdfs/09_lan_berkhout_2025_pyjobshop.pdf`.

**Nội dung:** giới thiệu **PyJobShop**, thư viện Python mã nguồn mở để mô hình hoá và giải các biến thể bài toán lập lịch bằng constraint programming — hỗ trợ flexible job shop scheduling và resource-constrained project scheduling qua một giao diện thống nhất, dễ dùng. Thư viện tích hợp cả 2 bộ giải: **Google OR-Tools CP-SAT** và **IBM ILOG CP Optimizer**, cho phép so sánh trực tiếp.

**Kết quả thực nghiệm chính:** đánh giá trên **hơn 9.000 instance benchmark** từ tài liệu lập lịch máy và lập lịch dự án. CP Optimizer vượt trội ở bài toán permutation-scheduling và quy mô rất lớn; **OR-Tools CP-SAT cạnh tranh tốt ở job-shop và project-scheduling** trong khi hoàn toàn mã nguồn mở, miễn phí.

**Liên quan đến đề tài:** bằng chứng thực nghiệm **độc lập** (không phải tài liệu Google tự viết) để bảo vệ lựa chọn CP-SAT làm bộ giải chính (§2.1/§4 TECHNICAL_SPEC.md) — đúng lớp bài toán (job-shop/FJSP) mà CP-SAT được chứng minh cạnh tranh tốt.
