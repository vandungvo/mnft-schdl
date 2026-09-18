# [10] Deliktaş, Özcan, Üstün & Torkul (2024) — benchmark FJSP cellular

**Trích dẫn:** Deliktaş, D., Özcan, E., Üstün, Ö., & Torkul, O. (2024). A benchmark dataset for multi-objective flexible job shop cell scheduling. *Data in Brief*, 52, 110037. https://www.sciencedirect.com/science/article/pii/S2352340923009770

**Dataset:** https://data.mendeley.com/datasets/rtzby7pv7m/1

**License:** *Data in Brief* là tạp chí open access (Elsevier, CC BY) — về nguyên tắc PDF tự do tải, nhưng **không tải tự động được ở đây**: PMC chặn bằng thử thách proof-of-work chống bot, ResearchGate chặn bằng Cloudflare, link CDN trực tiếp của Elsevier trả lỗi 400 (thiếu token truy cập). **Cần tải thủ công** qua trình duyệt tại 1 trong các link: ScienceDirect (trên), PMC (https://pmc.ncbi.nlm.nih.gov/articles/PMC10751839/), hoặc Mendeley Data.

**Nội dung:** bộ benchmark cho bài toán **FJCS-SDFSTs-ITTs** (Flexible Job Shop Cell Scheduling with Sequence-Dependent Family Setup Times and Intercellular Transportation Times) — xét đến di chuyển liên-cell, part ngoại lệ, setup phụ thuộc trình tự theo họ sản phẩm, thời gian vận chuyển liên-cell, và tái nhập (recirculation); mục tiêu tối thiểu hoá đồng thời makespan và tổng độ trễ. **43 instance** (Ins#1.csv … Ins#43.csv), chia 3 nhóm nhỏ/vừa/lớn theo số job, máy, cell, họ sản phẩm; kèm theo mô tả thủ tục sinh instance, phương pháp heuristic tính lời giải tham chiếu, và công thức toán học của bài toán.

**Liên quan đến đề tài:** benchmark công khai duy nhất tìm được có sẵn **setup time phụ thuộc trình tự theo họ sản phẩm** — đúng loại ràng buộc "ma trận chuyển đổi" mà Taillard/Lawrence ([[1]](01_taillard_1993.md), [[2]](02_lawrence_1984.md)) không có. Đề xuất dùng làm bộ benchmark thứ 3 để đối chứng riêng phần ràng buộc changeover time (đã đưa vào §2.4/§2.5/§9 của báo cáo và spec).
