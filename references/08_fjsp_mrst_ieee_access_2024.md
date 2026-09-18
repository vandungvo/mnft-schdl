# [8] Cheng, Xie, Xin, Chen & Zarei (2024) — FJSP với ràng buộc khuôn (mold), IEEE Access

**Trích dẫn (đã xác nhận đầy đủ từ PDF gốc — không còn "chưa xác nhận" như bản nháp ban đầu):**
Cheng, Y., Xie, Z., Xin, Y., Chen, K., & Zarei, R. (2024). Flexible Job Shop Scheduling Method for Optimizing Mold Resource Setup Time. *IEEE Access*, 12, 33486–33503. DOI: 10.1109/ACCESS.2024.3372396

**Tác giả & đơn vị:** Yi Cheng, Zhijun Xie, Yu Xin (Faculty of Electrical Engineering and Computer Science, Ningbo University, Trung Quốc); Kewei Chen (Faculty of Mechanical Engineering, Ningbo University); Roozbeh Zarei (School of Information Technology, Deakin University, Úc). Tác giả liên hệ: Zhijun Xie.

**License:** IEEE Access — open access, CC BY-NC-ND 4.0. **File PDF đã tải về:** `pdfs/08_fjsp_mrst_ieee_access_2024.pdf` (tải hợp pháp từ IEEE Xplore, vì IEEE Access là tạp chí open access).

**Tóm tắt (từ abstract gốc):** trong thực tế, hoàn thành một job thường cần phối hợp nhiều loại tài nguyên, nhưng ràng buộc tài nguyên như **khuôn (mold)** hiếm khi được xét trong bài toán lập lịch phân xưởng đa tài nguyên. Khuôn có **setup time phụ thuộc trình tự** và bị chiếm dụng hoàn toàn trong lúc gia công. Bài báo định nghĩa bài toán **FJSP-MRST** (Flexible Job Shop Scheduling Problem with Mold Resource Setup Time optimization), mục tiêu tối thiểu hoá setup time và makespan. Đề xuất 2 kỹ thuật: **Mold-Machine Double Fusion Insertion Method** (tối ưu thứ tự dùng khuôn-máy, cải thiện cách tính thời gian đổi khuôn) và **Mold-Operation Layer Loading Method** (nén thời gian setup bằng cách nới lỏng một số ràng buộc chặt giữa khuôn và công đoạn). Hai kỹ thuật này được tích hợp vào một **thuật toán tiến hoá vi phân đa mục tiêu được cải tiến (enhanced Multi-Objective Differential Evolution — MODE)**, không phải heuristic chèn đơn thuần. Thực nghiệm cho thấy phương pháp Double Fusion Insertion cải thiện chromosome tới mức tối ưu trong 70% trường hợp, và phương pháp Layer Loading loại bỏ được setup time ẩn trong phần lớn trường hợp.

*(Lưu ý sửa lại so với bảng đối sánh ban đầu trong `report/lit_review_draft.md`/báo cáo: thuật toán nền là **MODE**, không phải "heuristic chèn kép" — đã cập nhật lại bảng trong báo cáo chính thức.)*

**Liên quan đến đề tài:** công trình duy nhất tìm được coi khuôn là tài nguyên lập lịch có setup time riêng — đúng ràng buộc "khuôn" ở mục 2 báo cáo, dù họ tập trung vào **thời gian đổi khuôn** chứ không phải **tuổi thọ/chu kỳ bảo trì định kỳ** như đề tài của Dũng. Không có lớp giải thích, không xử lý gián đoạn động — mạnh 1 trục, yếu 2 trục còn lại (đúng như nhận định trong bảng đối sánh §2.6 báo cáo).
