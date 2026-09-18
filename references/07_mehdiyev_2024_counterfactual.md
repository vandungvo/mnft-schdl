# [7] Mehdiyev, Majlatow & Fettke (2024) — Counterfactual explanations cho job-shop scheduling

**Trích dẫn:** Mehdiyev, N., Majlatow, M., & Fettke, P. (2024). Counterfactual Explanations in the Big Picture: An Approach for Process Prediction-Driven Job-Shop Scheduling Optimization. *Cognitive Computation*, 16, 2674–2700. https://doi.org/10.1007/s12559-024-10294-0

**Truy cập PDF:** không có ở đây — Springer (Cognitive Computation), không tìm được bản open access hợp lệ (trang institutional repository Saarland được tìm thấy trong search nhưng không truy cập được nội dung để xác nhận có PDF đầy đủ).

**Abstract:** đề xuất một khung sinh **giải thích phản thực đa mục tiêu** (multi-objective counterfactual explanations) cho bối cảnh lập lịch phân xưởng, kết hợp *predictive process monitoring* với **NSGA-II** (Non-dominated Sorting Genetic Algorithm II). Cách tiếp cận này làm rõ các cải thiện tiềm năng ở cả cấp độ vận hành lẫn hệ thống. Được kiểm chứng trên dữ liệu thực tế, kết quả cho thấy NSGA-II tạo ra giải thích phản thực phù hợp và khả thi (actionable) hơn, hiệu quả hơn các phương pháp truyền thống.

**Liên quan đến đề tài — sát nhất với module counterfactual của đề tài:** khác biệt cốt lõi là Mehdiyev et al. sinh counterfactual từ **mô hình dự đoán học từ log** (data-driven, không giải lại bài toán tối ưu), trong khi đề tài của Dũng thêm ràng buộc/đơn hàng giả định rồi **giải lại CP-SAT trực tiếp** và so sánh 2 lịch — một dạng counterfactual "chính xác" (re-optimize) thay vì suy luận từ mô hình dự đoán. Nên nêu rõ trong luận văn: cách của Dũng chính xác hơn (giải lại thật) nhưng đánh đổi bằng thời gian giải (phải chạy CP-SAT lần 2), đúng như rủi ro đã ghi ở §11 TECHNICAL_SPEC.md.
