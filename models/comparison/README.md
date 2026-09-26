# Các đợt so sánh đã lưu

Mỗi thư mục timestamp UTC là một đợt chạy độc lập. `latest.json` trỏ tới đợt hoàn tất gần nhất; mở `REPORT.md` hoặc `index.html` trong đợt đó để xem bảng và liên kết kết quả từng phương pháp.

Đợt thực nghiệm chính đầu tiên: `20260918T172523480257Z` (00:25 ngày 19/09/2026 giờ Việt Nam), ngân sách 30 giây, seed 11/29/47; ba baseline xác định chỉ chạy seed 11. Các timestamp trước đợt này là **smoke test trong quá trình phát triển**, có thay đổi decoder hoặc độ chặt hạn giao; không dùng để gộp thứ hạng với đợt chính.

Đối chiếu `input_sha256` và `code_sha256` trước khi so sánh. Đợt chính có snapshot input và mã nguồn cho từng phương pháp. Báo cáo giữ cả trường hợp không có nghiệm; không loại thất bại rồi chỉ lấy trung bình trên những lịch thuận lợi mà không ghi số lần thành công.

Thời gian chạy gồm dựng mô hình/khởi tạo; số liệu thời gian thực có thể hơi vượt ngân sách do kiểm tra điểm dừng, import hoặc một lượt decode đang chạy. Không lấy số thời gian rất ngắn của baseline làm khẳng định tốc độ tổng thể của hệ thống sản xuất.
