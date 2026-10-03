# Báo cáo tiến độ đồ án CO5103 (cập nhật sau báo cáo sơ bộ)

**Học viên:** Võ Văn Dũng
**GVHD:** PGS.TS Võ Thị Ngọc Châu
**Ngày cập nhật:** 03/10/2026
**Báo cáo trước:** [Báo cáo sơ bộ](Report_so_bo_Do_an_CO5103_VoVanDung.md) (gửi cô ngày 17/09/2026)

Sau báo cáo sơ bộ, cô góp ý bốn việc: (1) tìm thêm dữ liệu benchmark (data.gov, data.gov.vn, Kaggle…); (2) bổ sung tài liệu tham khảo, nhất là tài liệu gần đây; (3) lập bảng đối sánh; (4) nếu được thì triển khai mô hình dự kiến và đánh giá hiệu quả. Báo cáo này trình bày kết quả của từng việc.

## Tóm tắt

| # | Việc cô yêu cầu | Tình trạng | Kết quả chính |
|---|---|---|---|
| 1 | Dữ liệu benchmark | Đã làm phần lớn | Thu thập 4 bộ benchmark công khai (Taillard, OR-Library/Lawrence, Deliktaş 2024, Mota 2020) và tự xây 2 bộ dữ liệu nhà máy vành. Các cổng data.gov / data.gov.vn / Kaggle chưa tìm được bộ dữ liệu cấp máy–công đoạn–đơn hàng phù hợp |
| 2 | Tài liệu tham khảo | Đã xong đợt 1 | Từ 19 lên **30 tài liệu**; **16/30 xuất bản 2024–2026**, có 2 nghiên cứu trong nước |
| 3 | Bảng đối sánh | Đã xong | 11 công trình tiêu biểu đối sánh với đồ án (Mục 3) |
| 4 | Triển khai và đánh giá | Đã có kết quả thăm dò | Đã cài **8 phương pháp** lập lịch dùng chung dữ liệu và bộ kiểm tra lịch độc lập. Chạy trên bộ dữ liệu 3 ngày và 2 tuần: mọi lịch được xuất ra đều hợp lệ; trên bộ 2 tuần, lịch tốt nhất giảm số đơn trễ từ 5 (luật EDD) xuống 1 |

## 1. Dữ liệu benchmark

### 1.1. Bộ dữ liệu công khai đã thu thập

Dữ liệu lưu ở thư mục `dataset/`, mỗi bộ kèm tệp `SOURCE.md` ghi nguồn, giấy phép và ngày tải.

| Bộ dữ liệu | Nguồn | Giấy phép | Quy mô | Vai trò trong đồ án |
|---|---|---|---|---|
| Taillard ta01–ta80 | Taillard (1993), EJOR; bản lưu trên Zenodo | CC BY 4.0 | 80 instance | Kiểm tra lõi job-shop (thứ tự công đoạn, máy, makespan) |
| OR-Library, gồm Lawrence la01–la40 | Beasley (1990), JORS | Tự do cho nghiên cứu | 82 instance | Như trên |
| FJSP trong môi trường cell | Deliktaş et al. (2024), *Data in Brief*; Mendeley Data | CC BY 4.0 | 43 instance (nhỏ/vừa/lớn) | Kiểm tra lựa chọn máy và thời gian chuyển đổi (setup) theo họ sản phẩm |
| Dây chuyền sản xuất – năng lượng | Mota et al. (2020), Zenodo | MIT | 3 tệp JSON/XLSX | Tham khảo cấu trúc dữ liệu tác vụ và tham số hiệu suất máy |

### 1.2. Các cổng dữ liệu mở (data.gov, data.gov.vn, Kaggle)

| Cổng | Kết quả tra cứu |
|---|---|
| data.gov (Mỹ) | Tra theo tag "manufacturing": chủ yếu là chỉ số sản xuất công nghiệp, tỷ lệ sử dụng công suất (Federal Reserve) và dữ liệu đánh giá năng lượng. Không có dữ liệu cấp máy/công đoạn/đơn hàng |
| data.gov.vn | Không tìm thấy bộ dữ liệu sản xuất công nghiệp hay lập lịch nào. Lộ trình công bố dữ liệu mở cho doanh nghiệp mới bắt đầu từ 2026 |
| Kaggle | Có 3 ứng viên chưa kiểm chứng được nội dung: cuộc thi "Job Shop Scheduling Challenge" (2026), bộ "10000 Jobshop Problem data" và bộ "Manufacturing Production Data". Cần tải về để kiểm tra cấu trúc trước khi dùng |

Như vậy em chưa tìm thấy bộ nào có đủ thông tin cấp **máy – công đoạn – đơn hàng – thời gian gia công** mà bài toán lập lịch cần. Một bộ dữ liệu chỉ được đưa vào thực nghiệm khi đã xác nhận rõ cấu trúc, đơn vị, quyền sử dụng và cách chuyển đổi. Vì vậy em ghi nhận là *chưa tìm được bộ phù hợp*, không kết luận các cổng này không có dữ liệu dùng được. Em sẽ rà soát lại có hệ thống và ghi danh sách bộ dữ liệu đã xem kèm lý do loại (Mục 5).

### 1.3. Bộ dữ liệu nghiệp vụ tự xây

Benchmark công khai chỉ kiểm tra được phần lõi job-shop: không bộ nào có đủ ca làm việc, khuôn dùng chung, tồn bán thành phẩm và giao hàng theo đơn. Vì vậy em xây thêm hai bộ dữ liệu tổng hợp cho nhà máy vành.

Để thông số sát thực tế hơn, em phân tích một video quy trình sản xuất vành xe máy hợp kim nhôm gồm 19 công đoạn ([báo cáo phân tích](Báo%20cáo%20quy%20trình%20sản%20xuất%20vành%20(mâm)%20xe%20máy%20hợp%20kim.md)). Từ phân tích này, mô hình được điều chỉnh từ 4 công đoạn trong báo cáo sơ bộ lên **5 công đoạn chính**: đúc → nhiệt luyện → gia công → sơn → thử nghiệm và đóng gói.

| Bộ dữ liệu | Kỳ lập lịch | Đơn hàng | Lượt sản xuất | Máy / khuôn | Đặc điểm |
|---|---|---|---|---|---|
| `wheel-factory-small` | 3 ngày | 4 đơn, 108 vành | 42 | 8 máy, 4 khuôn | Có kèm lịch xếp tay để so sánh với cách làm thủ công |
| `wheel-factory-2weeks` | 14 ngày | 24 đơn, 980 vành | 269 | 8 máy, 4 khuôn | Quy mô gần với kỳ lập lịch 2 tuần thực tế: nghỉ Chủ nhật, bảo trì máy, 2 đơn gấp, khách nhận hàng đúng giờ hẹn |

Đây là dữ liệu tổng hợp, không phải dữ liệu thật của nhà máy. Mọi giả định đều được ghi trong `SOURCE.md` của từng bộ.

## 2. Tài liệu tham khảo

Danh mục được rà soát lại và mở rộng từ 19 lên **30 tài liệu** (bản tổng quan đầy đủ: [literature_review.md](literature-review/literature_review.md)). Em cũng kiểm tra lại metadata từng nguồn và sửa các chỗ ghi sai trong bản trước, ví dụ mã bài Deliktaş đúng là 109946, và tác giả cùng thuật toán của bài IEEE Access 2024.

**Phân bố theo năm:** 16/30 tài liệu xuất bản 2024–2026. Những tài liệu gần đây nổi bật:

| Năm | Tài liệu | Nội dung liên quan |
|---|---|---|
| 2026 | Nguyễn Hồng Phúc et al., *TNU Journal of Science and Technology* | FJSP kết hợp tăng ca và thuê ngoài, giải bằng GA. Đây là nghiên cứu trong nước trực tiếp về lập lịch sản xuất |
| 2026 | Hu, Zhang & Baier, arXiv (preprint) | Học tăng cường cho ra chính sách lập lịch dạng chương trình đọc được |
| 2026 | Liu et al., arXiv v3 (preprint) | Tổng quan kiến trúc hệ thống quyết định lập lịch có dùng học máy |
| 2025 | Li et al., ICLR 2025 | Rolling horizon có học máy cho FJSP kỳ dài |
| 2025 | Echeverria et al., *Expert Systems with Applications* | Kết hợp quy hoạch ràng buộc (CP) với học sâu cho FJSP động |
| 2025 | Smit et al., *Computers & Operations Research* | Tổng quan mạng nơ-ron đồ thị (GNN) cho job-shop |
| 2025 | Lan & Berkhout, arXiv (PyJobShop) | Thư viện CP cho lập lịch, so sánh CP-SAT và CP Optimizer |
| 2025 | Garn & Amirghasemi, *Annals of OR*; Wang & Chen, sách Springer | Diễn giải kết quả tối ưu hoá (XAI) |
| 2024 | Dauzère-Pérès et al., *EJOR* | Tổng quan FJSP |
| 2024 | Cheng et al., *IEEE Access* | FJSP có khuôn và thời gian chuyển đổi khuôn |
| 2024 | De Bock et al., *EJOR* | Khung XAI cho vận trù học |

Hai bài nền tảng nhất (tổng quan FJSP 2024 và PyJobShop 2025) đã được em đọc toàn văn và dịch sang tiếng Việt để làm cơ sở mô hình hoá.

## 3. Bảng đối sánh

Các ô chỉ ghi nội dung đã xác nhận được từ nguồn. Bản đầy đủ có ghi chú mức tiếp cận từng nguồn ở [literature_review.md, Mục 7](literature-review/literature_review.md).

| Công trình | Bài toán và cách tiếp cận | Nội dung đã xác nhận | Khác biệt với đồ án |
|---|---|---|---|
| Cheng et al., 2024 | FJSP có khuôn; MODE cải tiến | Phối hợp máy–khuôn, setup, makespan | Không xét bảo trì khuôn theo chu kỳ, ca làm việc, tồn kho |
| Ghaleb et al., 2021 | FJSP động; GA lai | Lập lịch kết hợp bảo trì và gián đoạn | Mô hình suy giảm máy khác giả định bảo trì của đồ án |
| Lan & Berkhout, 2025 | Thư viện CP, thực nghiệm nhiều lớp bài toán | So sánh CP-SAT / CP Optimizer | Không có nghiệp vụ cụ thể của ngành |
| Zhang et al., 2020 | JSP; học tăng cường | Học chính sách điều độ trên đồ thị | Chưa có lựa chọn máy, ca, khuôn |
| Song et al., 2023 | FJSP; GNN + học tăng cường | Chọn công đoạn–máy | Chưa có ca, khuôn, tồn kho |
| Li et al., 2025 | FJSP kỳ dài; rolling horizon có học máy | Học cách cố định biến giữa các cửa sổ | Cần dữ liệu huấn luyện |
| Echeverria et al., 2025 | FJSP động; CP + học sâu | Học từ lời giải CP | Chưa xác nhận xử lý sự cố giữa lúc gia công |
| Wang & Chen, 2024 | Diễn giải GA trong lập lịch | Kỹ thuật XAI cho kết quả GA | Tham khảo cho lớp diễn giải phụ trợ |
| Mehdiyev et al., 2024 | Dự đoán quy trình + giải thích phản thực | NSGA-II, giải thích đa mục tiêu | Khác cách what-if bằng giải lại mô hình |
| Nedbálek & Novák, 2025 | RCPSP; nới lỏng ràng buộc | Xác định điểm nghẽn | Cần chuyển sang cấu trúc máy/khuôn |
| Nguyễn Hồng Phúc et al., 2026 | FJSP; mô hình toán + GA | Nguồn lực nội bộ, tăng ca, thuê ngoài | Khác mục tiêu và tổ hợp ràng buộc |
| **Đồ án CO5103** | Dây chuyền 5 công đoạn; CP-SAT so với 7 phương pháp khác | **Đã cài:** 3 ca/ngày, setup, khuôn dùng chung, bảo trì, tồn bán thành phẩm và thành phẩm, tồn an toàn, giao hàng theo đơn, bộ kiểm tra lịch độc lập | Chưa cài tái lập lịch khi có sự cố phát sinh giữa chừng; dữ liệu là dữ liệu tổng hợp |

**Nhận xét:** các công trình trên đã nghiên cứu riêng lẻ từng chủ đề như khuôn, bảo trì, học chính sách hay diễn giải. Đồ án không tuyên bố là công trình đầu tiên kết hợp các chủ đề này. Đóng góp đồ án hướng tới là **xây dựng và kiểm chứng một hệ thống tích hợp đủ bộ ràng buộc của một dây chuyền cụ thể**, so sánh nhiều phương pháp trên cùng dữ liệu và cùng tiêu chí.

## 4. Triển khai mô hình và đánh giá

### 4.1. Những gì đã triển khai

- **8 phương pháp lập lịch** dùng chung dữ liệu, hàm mục tiêu và bộ kiểm tra:
  - 3 luật điều độ: FIFO, EDD (hạn sớm trước), SPT (gia công ngắn trước);
  - 2 thuật toán metaheuristic: mô phỏng luyện kim (SA) và di truyền (GA);
  - 3 cấu hình CP-SAT: CP-SAT nguyên khối, CP-SAT có lịch gợi ý ban đầu, và CP-LNS (tìm kiếm lân cận lớn, dùng CP sửa từng phần lịch).
- **Bộ kiểm tra lịch độc lập (validator)**: kiểm tra lại toàn bộ ràng buộc từ dữ liệu đầu vào, không dựa vào kết quả tự báo của thuật toán. Kèm 64 kiểm thử tự động, trong đó có các lịch cố tình làm sai để bảo đảm validator phát hiện được lỗi.
- **Hàm mục tiêu hai tầng**, so sánh theo thứ tự ưu tiên:
  - tầng 1 là mức phục vụ khách hàng (trễ hạn, thiếu tồn an toàn);
  - tầng 2 là chi phí vận hành (setup, số ca phải mở máy, thời gian máy chạy không, tồn dư).
- **Sản phẩm chạy được**: backend FastAPI gọi bộ giải và frontend Next.js để quản lý dữ liệu, xem kế hoạch và biểu đồ Gantt.

Trong cùng một đợt, mọi phương pháp chạy tuần tự, cùng ngân sách thời gian và 1 luồng CP-SAT. Các thuật toán có yếu tố ngẫu nhiên chạy 3 seed (11, 29, 47).

### 4.2. Kết quả trên bộ 3 ngày (30 giây/lần chạy)

18/18 lần chạy cho lịch hợp lệ. Điểm ghi theo dạng **tầng 1 · tầng 2**, điểm nhỏ hơn là tốt hơn, và so tầng 1 trước.

| Phương pháp | Lịch tốt nhất | Số ca-máy phải mở |
|---|---:|---:|
| **CP-LNS** | **40 · 10.564** | 11 |
| SA | 40 · 14.397 | 13 |
| GA | 40 · 15.843 | 14 |
| CP-SAT có gợi ý | 120 · 11.440 | 10 |
| Lịch xếp tay | 160 · 6.356 | 7 |
| FIFO | 160 · 17.938 | 15 |
| EDD / SPT | 200 · 17.904 | 15 |
| CP-SAT nguyên khối | 8.410 · 24.067 | 19 |

Không đơn nào bị trễ ở các phương pháp đứng đầu. CP-LNS, SA và GA tự chọn sản xuất trước một lô để bù thiếu hụt tồn an toàn, nhờ đó giảm tầng 1 từ 160 xuống 40 so với lịch xếp tay và luật điều độ. Đổi lại, các phương pháp này phải mở thêm ca máy. CP-SAT nguyên khối chạy 30 giây với 1 luồng thì dao động mạnh và có lần để đơn bị trễ.

### 4.3. Kết quả trên bộ 2 tuần (120 giây/lần chạy)

| Phương pháp | Lịch hợp lệ / số lần chạy | Đơn trễ (lịch tốt nhất) | Tầng 1 (lịch tốt nhất) |
|---|---:|---:|---:|
| **SA** | 3/3 | **1** | **24.845** |
| GA | 3/3 | 2 | 61.430 |
| EDD | 1/1 | 5 | 323.465 |
| FIFO | 1/1 | 5 | 365.305 |
| SPT | 1/1 | 5 | 389.245 |
| CP-SAT có gợi ý | 3/3 | 5 | 323.465 (không cải thiện so với lịch gợi ý EDD) |
| CP-LNS | 3/3 | 5 | 323.465 (không cải thiện so với EDD) |
| CP-SAT nguyên khối | 0/3 | — | Không tìm được lịch trong 120 giây |

**Nhận xét:**

- So với luật EDD, SA giảm đơn trễ từ 5 xuống 1 và giảm tầng 1 khoảng 92%. Kết quả giữa các seed còn dao động: tầng 1 của SA trải từ 24.845 đến 148.455.
- Ở quy mô 2 tuần (269 lượt sản xuất), CP-SAT nguyên khối không tìm được lịch trong 120 giây với 1 luồng. Hai cấu hình CP còn lại cũng không cải thiện được lịch ban đầu. Đây là phát hiện quan trọng: phương pháp CP-SAT chọn trong báo cáo sơ bộ giải tốt bài nhỏ nhưng gặp giới hạn về quy mô.
- Hướng xử lý em đang triển khai là **CP-SAT cuốn chiếu (rolling horizon)**: chia kỳ 2 tuần thành các cửa sổ khoảng 60 lượt (cỡ mà CP-SAT giải tốt ở bộ 3 ngày), giải lần lượt rồi ghép lại và kiểm tra bằng validator. Hướng này có cơ sở từ Li et al. (ICLR 2025). Mã đã viết xong nhưng chưa có đợt đánh giá đầy đủ trên bộ 2 tuần.

### 4.4. Giới hạn của kết quả hiện tại

- Mỗi bộ chỉ có một tập dữ liệu và 3 seed, nên đây là **thử nghiệm thăm dò**, chưa đủ để kết luận thống kê phương pháp nào tốt nhất nói chung.
- Trạng thái "hợp lệ" của CP-SAT chưa đồng nghĩa với tối ưu: chưa lần chạy nào chứng minh được lời giải tối ưu.
- Trọng số hàm mục tiêu là giả định chính sách, chưa quy đổi từ chi phí thật. Em đã thử 7 biến thể trọng số trên bộ 3 ngày và thứ hạng đầu bảng không đổi.
- Chưa chạy các phương pháp trên benchmark công khai (Taillard, Lawrence, Deliktaş), nên chưa có so sánh với lời giải tốt nhất đã công bố.
- Đơn gấp và lịch bảo trì đều được biết trước trong dữ liệu; chưa kiểm chứng tái lập lịch khi sự cố phát sinh giữa chừng.

## 5. Kế hoạch tiếp theo

1. **Benchmark công khai:** chạy CP-SAT và các luật điều độ trên Taillard và Lawrence, so với lời giải tốt nhất đã công bố (tính RPD), để kiểm chứng phần lõi của mô hình.
2. **Cổng dữ liệu mở:** tải và kiểm tra 3 bộ dữ liệu ứng viên trên Kaggle, duyệt trực tiếp danh mục trên data.gov.vn, rồi lập bảng các bộ đã xem kèm lý do chọn/loại.
3. **Bộ 2 tuần:** hoàn tất đánh giá CP-SAT cuốn chiếu; chạy thêm ngân sách thời gian dài hơn và nhiều luồng CP-SAT.
4. **Tái lập lịch:** xử lý đơn gấp và máy hỏng phát sinh giữa chừng, giữ nguyên phần lịch đã thực hiện.
5. **Đồng bộ tài liệu:** cập nhật đặc tả yêu cầu và spec kỹ thuật theo quy trình 5 công đoạn, ghi kết quả thực nghiệm vào `report/evaluation/`.

Em kính mong cô góp ý thêm về hướng xử lý giới hạn quy mô của CP-SAT (Mục 4.3) và phạm vi đánh giá trên benchmark công khai.
