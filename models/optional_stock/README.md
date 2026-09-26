# Thử nghiệm sản xuất dự trữ để lấp công suất trống

Thử nghiệm này kiểm tra riêng chính sách ở `problem_requirements.md` mục 4.3.2. Mỗi máy đúc, CNC, sơn và QC có ba ca đã mở: ca 1 (06–14h), ca 2 (14–22h), ca 3 (22–06h). Mỗi ca nghỉ 30 phút và có 450 phút khả dụng. Cả sáu lô/đơn bắt buộc đều có `release = 0` tại công đoạn đúc; hạn giao chia đều hai đơn ở cuối mỗi ca. Hai lô dự trữ đầy đủ đi từ đúc đến QC, còn một lô WIP đầu kỳ đã hoàn tất `CNC_1` và nằm chờ bên ngoài để cấp trực tiếp cho `PAINT_1`. Mỗi lô có 40 sản phẩm và trần kho cho phép hoàn tất cả ba lô khi phương án có lợi.

Model CP-SAT giải hai tầng:

1. Xếp lô bắt buộc và tối thiểu hóa tardiness rồi makespan.
2. Khóa tardiness từng đơn không được xấu hơn tầng 1, sau đó chọn lô dự trữ để tối thiểu hóa chi phí idle + sản xuất + lưu kho + rủi ro tồn dư + setup tăng thêm.

Một công đoạn được phép chạy xuyên mốc đổi ca nếu hai ca kế tiếp đều đã mở và máy khả dụng liên tục. Giờ nghỉ trong ca và downtime vẫn chia cắt cửa sổ xếp lịch. Với block xuyên ca, thời gian setup và gia công được phân bổ theo số phút thực tế vào KPI của từng ca.

Chi phí đúc/CNC của lô WIP đầu kỳ là chi phí đã phát sinh nên không được tính lại vào quyết định. Model chỉ so sánh chi phí hoàn thiện, lưu kho và rủi ro tồn dư của lô này với chi phí để `PAINT_1` và `QC_1` rảnh.

Chạy từ gốc repository:

```powershell
python -m models.optional_stock.run
```

Kết quả nằm trong `models/optional_stock/results/<timestamp>/`: `REPORT.md`, `gantt.html`, `results.json`, `schedule.csv`, input và lịch tầng 1. Hai kịch bản chỉ khác chi phí lưu kho: kịch bản thấp phải chọn lô dự trữ có lợi; kịch bản cao phải để công suất rảnh.

Đây là thí nghiệm có kiểm soát, chưa thay thế engine đầy đủ. Setup cố định theo lô/công đoạn; chưa có setup phụ thuộc trình tự, khuôn, bảo trì, downtime hoặc tái lập lịch.
