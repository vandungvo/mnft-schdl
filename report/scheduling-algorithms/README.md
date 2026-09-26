# Nghiên cứu phương pháp lập lịch sản xuất

Ngày nghiên cứu: **18/09/2026**. Đầu vào chính: [yêu cầu bài toán](../problem-requirements/problem_requirements.md), đối chiếu [đặc tả kỹ thuật](../TECHNICAL_SPEC.md) và [báo cáo sơ bộ](../Report_so_bo_Do_an_CO5103_VoVanDung.md).

| Tài liệu | Nội dung |
|---|---|
| [Khảo sát và đề xuất](scheduling_methods_and_recommendation.md) | Bản đồ các họ phương pháp, ưu/nhược điểm, mức phù hợp, lựa chọn cho đồ án và nguồn nghiên cứu |
| [Mô hình và kế hoạch kiểm chứng](model_and_evaluation_plan.md) | Xử lý các điểm chưa rõ, mô hình CP-SAT, tái lập lịch, baseline, thí nghiệm và lộ trình |
| [Bản nháp trước](scheduling_approaches_survey.md) | Giữ để đối chiếu lịch sử; xem ghi chú hiệu chỉnh đầu file |

**Đề xuất:** CP-SAT làm lõi; FIFO/EDD/SPT với bộ dựng lịch hợp lệ làm baseline; giải lại theo sự kiện với phần lịch đã thực hiện được cố định; thử hint, rolling horizon và LNS khi có bằng chứng thiếu hiệu năng. MILP/CP Optimizer là đối chứng có giá trị; RL/GNN là hướng nghiên cứu tiếp theo, chưa cần cho demo hiện tại.

Đây là kết quả khảo sát và thiết kế, **chưa phải kết quả benchmark**. Các mốc thời gian chạy, kích thước dữ liệu và tiêu chí nghiệm thu đề xuất cần được kiểm chứng trên máy thực nghiệm. “Tất cả phương pháp” được hiểu là bao phủ các **họ phương pháp chính và các hướng bổ trợ liên quan**, không phải liệt kê mọi thuật toán mang tên riêng hoặc chứng minh đã rà soát toàn bộ công bố.
