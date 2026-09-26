# Mô hình hóa bài toán trong LR25

**Bài:** Nguyễn Hồng Phúc và cộng sự (2026), *Mô hình tối ưu điều độ job-shop linh hoạt kết hợp hoạch định nguồn lực thuê ngoài*, TNU Journal of Science and Technology 231(02): 204–212. [Trang bài](https://jst.tnu.edu.vn/jst/article/view/14459/0) · [PDF](https://jst.tnu.edu.vn/jst/article/download/14459/pdf)

**Mức đọc của bản này:** đọc phần mô hình (mục 2.1–2.2, trang 205–206) và mô tả GA (mục 2.3). Phần thực nghiệm (mục 3) mới đọc lướt, chưa đối chiếu Bảng 3 và Hình 3. Công thức chép từ ảnh trang PDF; mục 6 và mục 7 là phân tích của người ghi chú, không phải khẳng định của tác giả bài.

**Nguồn đối chiếu đồ án:** [problem_requirements.md](../../problem-requirements/problem_requirements.md), phiên bản rà soát 19/09/2026.

---

## 1. Bài toán trong năm câu

1. Có J đơn hàng, mỗi đơn đi qua S công đoạn theo cùng một thứ tự 1 → 2 → … → S.
2. Mỗi công đoạn có một tập máy nội bộ để chọn; thời gian và chi phí gia công phụ thuộc đơn và máy.
3. Mỗi công đoạn của mỗi đơn chọn đúng một trong ba cách: máy nội bộ tiêu chuẩn, máy nội bộ có tăng ca, hoặc thuê ngoài (trừ tập công đoạn O không được thuê ngoài).
4. Không được chồng lấn trên cùng một máy nội bộ, và phải tuân thủ trình tự công đoạn.
5. Mục tiêu là tối thiểu tổng chi phí: gia công nội bộ + tăng ca + thuê ngoài + phạt trễ hạn.

## 2. Giả định của bài (trang 205)

- Chi phí gia công của từng công đoạn theo từng loại nguồn lực là biết trước.
- Nguồn lực thuê ngoài luôn sẵn sàng, chất lượng được cam kết.
- Mọi máy luôn trong tình trạng tốt; thời gian chuẩn bị không đáng kể.
- Một số công đoạn chỉ được thực hiện bằng nguồn lực nội bộ (do bảo mật, công nghệ hoặc đề nghị của khách hàng).

## 3. Bảng bốn nhóm

| Nhóm | Nội dung | Ký hiệu |
|---|---|---|
| **Dữ liệu đầu vào** | Tập đơn hàng, tập công đoạn, tập công đoạn không được thuê ngoài, tập máy của từng công đoạn | J, S, O ⊂ S, M_s |
| | Thời gian gia công công đoạn s của đơn j trên máy m | p_jsm |
| | Chi phí gia công công đoạn s của đơn j trên máy m | c_jsm |
| | Thời gian giới hạn khả dụng của máy m ở công đoạn s | a_ms |
| | Giới hạn tăng ca của máy m ở công đoạn s | h_ms |
| | Chi phí cố định khi quyết định tăng ca tại (s, m) | f_ms |
| | Thời lượng xử lý thuê ngoài công đoạn s của đơn j | q_js |
| | Chi phí thuê ngoài công đoạn s của đơn j | d_js |
| | Thời hạn giao hàng của đơn j | r_j |
| | Chi phí phạt trễ hạn của đơn j | u_j |
| | Hằng số lớn (big-M) | B |
| **Quyết định** | 1 nếu công đoạn s của đơn j gia công nội bộ trên máy m | X_jsm |
| | Thời điểm bắt đầu công đoạn s của đơn j | G_js |
| | 1 nếu công đoạn s của đơn j thuê ngoài | Y_js |
| | 1 nếu tăng ca tại công đoạn s trên máy m | K_ms |
| | 1 nếu đơn i đứng trước đơn j tại công đoạn s trên máy m | Z_ijsm |
| **Biến phụ** | Thời điểm kết thúc công đoạn s của đơn j | e_js |
| | Thời điểm hoàn tất đơn j | l_j |
| | Độ trễ của đơn j | t_j |
| **Ràng buộc** | (2) đến (9), xem mục 4 | |
| **Mục tiêu** | Tối thiểu tổng chi phí Z, công thức (1) | Z |

## 4. Mô hình toán

**Hàm mục tiêu (1):**

```
Min Z = Σ_j Σ_s Σ_m c_jsm · X_jsm     (gia công nội bộ)
      + Σ_m Σ_s f_ms · K_ms           (tăng ca, chi phí cố định)
      + Σ_j Σ_s d_js · Y_js           (thuê ngoài)
      + Σ_j u_j · t_j                 (phạt trễ)
```

**Ràng buộc:**

| # | Công thức | Nghĩa bằng ngôn ngữ sản xuất |
|---|---|---|
| (2) | Σ_m X_jsm + Y_js = 1, ∀j, s | Mỗi công đoạn của mỗi đơn chọn đúng một cách: một máy nội bộ hoặc thuê ngoài |
| (3) | Y_js = 0, ∀j, s ∈ O | Công đoạn không được thuê ngoài thì bắt buộc làm nội bộ |
| (4) | G_j,s+1 ≥ e_js, s = 1..S−1 | Công đoạn sau chỉ bắt đầu khi công đoạn trước của cùng đơn đã kết thúc |
| (5) | e_js ≥ G_js + Σ_m p_jsm·X_jsm + q_js·Y_js | Kết thúc = bắt đầu + thời gian gia công (nội bộ) hoặc + thời lượng thuê ngoài |
| (6) | l_j ≥ e_j,S | Đơn hoàn tất khi công đoạn cuối xong |
| (7) | t_j = max(0, l_j − r_j) | Độ trễ = phần vượt hạn giao, không âm |
| (8.1) | G_js ≥ e_is − B(1 − Z_ijsm) − B(2 − X_ism − X_jsm) | Nếu i trước j trên cùng máy m thì j bắt đầu sau khi i kết thúc |
| (8.2) | G_is ≥ e_js − B·Z_ijsm − B(2 − X_ism − X_jsm) | Nếu j trước i trên cùng máy m thì i bắt đầu sau khi j kết thúc |
| (9) | Σ_j p_jsm·X_jsm ≤ a_ms nếu K_ms = 0; ≤ a_ms + h_ms nếu K_ms = 1, ∀m, s | Tổng tải của máy không vượt thời gian khả dụng; tăng ca nới thêm tối đa h_ms |

Cách đọc (8.1)–(8.2): đây là cách viết "hai công đoạn không dùng chung máy cùng lúc" bằng điều kiện **hoặc–hoặc**. Biến Z chọn thứ tự; số hạng B(2 − X_ism − X_jsm) làm ràng buộc **vô hiệu** khi hai đơn không cùng chọn máy m.

### Ví dụ số cho (8.1)–(8.2)

Đơn 1 và đơn 2 cùng chọn máy m ở công đoạn s (X_1sm = X_2sm = 1). Đơn 1 có p = 3, G_1s = 0, e_1s = 3. Đơn 2 có p = 4. Lấy B = 100.

- Chọn Z_12sm = 1 (đơn 1 trước đơn 2). (8.1) thành G_2s ≥ 3 − 0 − 0 = 3, nên đơn 2 bắt đầu từ phút 3 trở đi. (8.2) thành G_1s ≥ e_2s − 100, luôn đúng nên không ràng buộc gì.
- Chọn Z_12sm = 0 (đơn 2 trước đơn 1). (8.1) thành G_2s ≥ 3 − 100, luôn đúng. (8.2) thành G_1s ≥ e_2s, nên đơn 1 chờ đơn 2 xong.
- Nếu đơn 2 chọn máy khác (X_2sm = 0): số hạng B(2 − 1 − 0) = 100 làm cả hai ràng buộc luôn đúng, hai đơn không ảnh hưởng nhau trên máy m.

## 5. Nhận diện cấu trúc bài toán

- **Không phải job shop thuần.** Ràng buộc (4) buộc mọi đơn đi qua công đoạn 1 → 2 → … → S theo cùng một thứ tự, mỗi công đoạn có nhiều máy song song. Đó là cấu trúc **hybrid/flexible flow shop**; bài gọi là "FJSP". Cần ghi lại khi làm Bước 2 (phân biệt JSP, FJSP, hybrid flow shop).
- Cấu trúc này cũng là cấu trúc của tuyến đúc → CNC → sơn → QC trong đồ án (yêu cầu mục 4.1).
- **Thuê ngoài** thay việc gia công nội bộ bằng một khoảng thời lượng q_js không chiếm máy nào. Công đoạn thuê ngoài vẫn phải tuân thủ (4) và (5).
- **Tăng ca** không kéo dài trục thời gian mà chỉ nới trần tải trong (9) và cộng chi phí cố định f_ms (mục 6.2).

## 6. Nhận xét về mô hình (phân tích của người ghi chú)

1. **(9) là trần tổng tải, không phải khung thời gian.** Trong mô hình không có ràng buộc nào nối a_ms với G_js hoặc e_js. Lịch thỏa (9) vẫn có thể kết thúc công đoạn muộn hơn a_ms (do chờ giữa công đoạn) hoặc chạy vào giờ máy lẽ ra nghỉ. Mô hình không có khái niệm ca bật/tắt hay giờ nghỉ.
2. **Tăng ca chỉ có một chi phí cố định** f_ms, không tính theo số giờ tăng ca thực dùng. Kích hoạt K_ms = 1 để chạy thêm 1 phút hay h_ms phút có cùng chi phí trong (1).
3. **B chưa được cho giá trị.** Big-M phải đủ lớn (không nhỏ hơn thời điểm kết thúc tối đa có thể) nhưng không quá lớn; bài chỉ liệt kê "hằng số B".
4. **Ký hiệu chưa chặt:** (8.1)–(8.2) ghi ∀i ≠ j, ∀i < j (dư một điều kiện, nên hiểu là xét mỗi cặp i < j một lần). (9) ghi ∀m ∈ M, s ∈ S trong khi tập máy là M_s.
5. **Phi tuyến ở (7).** Hàm max(0, ·) và tích trong (8.x) nếu viết dạng đầy đủ là lý do bài gọi mô hình là hỗn hợp nguyên phi tuyến và chọn GA.
6. **Kích thước ví dụ.** Bài thử với 12 đơn, 6 công đoạn, 3 máy mỗi công đoạn. Từ công thức: X có 12 × 6 × 3 = 216 biến; Z có C(12,2) × 6 × 3 = 1.188 biến. Số biến Z tăng theo bình phương số đơn.
7. **Không có thời điểm sẵn sàng** của đơn: công đoạn đầu chỉ được giả định bắt đầu từ mốc 0 (G_j1 không có cận dưới nêu trong bài).

## 7. Đối chiếu với đồ án

| Yếu tố | Trong LR25 | Trong yêu cầu đồ án | Kế thừa hoặc cần sửa |
|---|---|---|---|
| Đơn vị công việc | Đơn hàng j, mỗi đơn đi một lần qua mọi công đoạn | Lô l; một đơn có thể chia nhiều lô, một lô có thể gộp nhiều đơn; lô bắt buộc và lô dự trữ tùy chọn (A01) | Đổi chỉ số j từ đơn sang lô; thêm biến chọn/không chọn lô tùy chọn và bảng phân bổ đơn–lô |
| Tuyến công đoạn | S công đoạn, cùng thứ tự | 4 công đoạn đúc → CNC → sơn → QC; công đoạn sau chờ **toàn lô** xong công đoạn trước | Kế thừa ràng buộc (4)–(5) nguyên ý; S = 4 |
| Chọn máy | X_jsm | Máy thuộc đúng công đoạn và đủ điều kiện xử lý sản phẩm (R02) | Kế thừa; thêm tập máy đủ điều kiện theo sản phẩm |
| Thời lượng gia công | p_jsm là tham số cho sẵn | `processing_time = ceil(fixed + q_lô × unit_time)` theo (công đoạn, sản phẩm, máy), mục 3.4 | Tính p từ công thức trước khi giải; sau khi chốt lô thì là hằng số |
| Không chồng lấn máy | Biến thứ tự Z + big-M, (8.1)–(8.2) | Không chồng khoảng chiếm cùng máy/khuôn, gồm gia công, setup, bảo trì (R02) | Ý tưởng kế thừa; trong CP-SAT thường thay big-M bằng biến khoảng (interval) và ràng buộc không chồng lấn |
| Tăng ca / mở ca | K_ms, trần tải a_ms + h_ms, chi phí cố định f_ms | Mở ca/tăng ca là **tùy chọn** nếu cấu hình cho phép và có dữ liệu (A08, mục 4.3); ca bật xác định theo từng máy (A03) | Ý tưởng chi phí cố định kế thừa được; nhưng đồ án cần biểu diễn ca như khoảng thời gian thực, không chỉ trần tổng tải |
| Thuê ngoài | Y_js, q_js, d_js; tập O không được thuê ngoài | Tôi không thấy trong yêu cầu và phạm vi | Không kế thừa; chỉ đọc để hiểu cách mô hình hóa lựa chọn nguồn lực |
| Ca, giờ nghỉ, downtime | Không có | Lịch ca; công đoạn không chạy xuyên nghỉ/downtime (A03, R06) | Cần thêm hoàn toàn; a_ms không thay được |
| Setup | Giả định không đáng kể | Ma trận setup có hướng, chiếm máy, tính cả setup đầu kỳ (A04, R03) | Cần thêm hoàn toàn |
| Khuôn và bảo trì | Giả định máy luôn tốt; không có khuôn | Khuôn vật lý dùng chung; bộ đếm chu kỳ; bảo trì chiếm máy và khuôn (A05, R05) | Cần thêm hoàn toàn |
| Tồn kho và giao hàng | Chỉ có hạn giao và phạt trễ (6)–(7) | Bảo toàn lượng, tồn không âm, safety stock, giao đủ đơn (R07–R09) | Kế thừa cách tính trễ (7); phần tồn kho cần thêm |
| Tái lập lịch | Không có | Giữ quá khứ, xếp lại tương lai, so sánh trước/sau (R11, mục 4.5) | Cần thêm hoàn toàn |
| Mục tiêu | Một mục tiêu: tổng chi phí | Đa mục tiêu có trọng số: makespan bắt buộc, trễ, setup, idle, thiếu safety stock, lô dự trữ, mở ca (mục 4.3) | Kế thừa dạng tổng có trọng số; cần chuẩn hóa thang đo và báo từng KPI |
| Phương pháp giải | GA, nghiệm xấp xỉ, không có cận | CP-SAT, có trạng thái: tối ưu / khả thi / vô nghiệm / hết ngân sách (mục 4.5) | Khác bản chất; GA không chứng minh tối ưu |
| Kiểm chứng | So với FIFO/SPT/LPT/EDD kết hợp tìm kiếm tham lam | So FIFO/EDD/SPT với cùng input, ràng buộc, validator (D04) | Ý tưởng so baseline kế thừa được |

## 8. Điều rút ra cho đồ án

**Kế thừa được**
- Cách tách bốn nhóm: dữ liệu, biến quyết định, ràng buộc, mục tiêu.
- Cặp biến "chọn máy" (X) và "thời điểm bắt đầu" (G), cùng ràng buộc trình tự (4) và (5).
- Cách viết thứ tự trên máy chung là hoặc–hoặc, và cách nhìn "ràng buộc chỉ hoạt động khi hai đơn cùng chọn máy".
- Cách tính độ trễ (7) và cộng phạt trễ vào mục tiêu.
- Ý tưởng chi phí cố định khi kích hoạt tài nguyên bổ sung.

**Phải đổi hoặc thêm**
- Chỉ số công việc từ đơn sang lô, cùng lô dự trữ tùy chọn.
- Thời lượng tính theo lượng lô và máy.
- Lịch ca/nghỉ/downtime, setup có hướng, khuôn, bảo trì, tồn kho, tái lập lịch.
- Cách biểu diễn tăng ca thành khoảng thời gian thật.
- Mục tiêu đa thành phần, có báo từng KPI.

## 9. Điểm chưa hiểu / cần kiểm tra tiếp

- Chi tiết giải mã NST thành lịch, số thế hệ, điều kiện dừng và cách xử lý lịch vi phạm ràng buộc: phần đã đọc chưa mô tả.
- Bảng 1: nhãn "tỷ lệ đột biến" (3 mức 0,6–0,8) và "tỷ lệ lai ghép" (4 mức 0,01–0,15) có vẻ đảo so với bảng ANOVA (đột biến DF = 3, lai ghép DF = 2). Cần kiểm lại trên PDF trước khi trích số.
- Giá trị của a_ms, h_ms, f_ms và B trong ví dụ thực nghiệm: chưa thấy nêu.
- Mục 3 (thực nghiệm): chưa đọc kỹ Bảng 3 và Hình 3 nên chưa ghi nhận kết quả so sánh với FIFO/SPT/LPT/EDD.
