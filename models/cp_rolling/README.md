# CP-SAT cuốn chiếu (rolling horizon)

Chạy từ gốc repo: `python -m models.cp_rolling.run --input dataset/wheel-factory-2weeks/model_input.json --seconds 120 --seed 11`. Chỉ có cho v2 (schema 5). Kết quả lưu ở `models/runs/v2/cp_rolling/results/<run>/seed_<seed>/`.

**Vì sao:** mô hình CP-SAT nguyên khối lớn theo số lượt × máy × ca và theo từng cặp lượt trên một máy. Trên bộ 2 tuần (269 lượt), 1 worker không tìm nổi lịch hợp lệ nào trong 120 giây; trên bộ 3 ngày (42 lượt), CP-SAT lại giải tốt. Cách này cắt kỳ lập lịch thành nhiều cửa sổ cỡ bộ nhỏ rồi giải lần lượt.

**Cách làm** ([rolling.py](../common/stage_runs/rolling.py)):

1. Tính **ngày cần** của mỗi lượt: lô QC lấy hạn của đơn; lượt thượng nguồn lấy ngày cần của phần nhu cầu phía sau mà nó là lượt đầu tiên bù được sau tồn đầu kỳ.
2. Mỗi cửa sổ bắt đầu ở một mốc ngày `T` (bước 2 ngày), gồm **tối đa 60 lượt bắt buộc gấp nhất** chưa chốt. Lô QC chỉ vào cửa sổ chứa ngày khách lấy hàng. Phương án làm trước chỉ được mở ở 4 ngày cuối.
3. Trạng thái tại `T` được gói vào dữ liệu của cửa sổ: máy dừng trước `T`; tồn bán thành phẩm và thành phẩm sau phần đã chốt; bộ đếm khuôn; setup sau lượt cuối đã chốt trên mỗi máy (máy đúc giả định có đổi khuôn: cận trên, tính lại chính xác khi ghép); chỉ các mốc tồn sau `T`. Cửa sổ phải xong trước `T + 4 ngày` (horizon của nó).
4. CP-SAT giải cửa sổ với gợi ý là lịch EDD của chính cửa sổ đó, giữ lịch EDD nếu không tốt hơn. Ngân sách thời gian chia đều cho các cửa sổ còn lại.
5. Lượt xong (tính cả thời gian chuyển công đoạn) trước `T + 2 ngày` được chốt; phần còn lại quay về hàng chờ. Phương án làm trước đã chốt một lượt thì các lượt còn lại thành bắt buộc (vẫn làm cả hoặc không).
6. Ghép các phần đã chốt, tính lại setup theo lượt đứng trước thật, kiểm bằng validator của toàn bài.

**Giới hạn:** mỗi cửa sổ không thấy đơn sau tầm nhìn của nó, nên không tối ưu toàn cục và không có cận dưới. Các tham số (bước 2 ngày, nhìn trước 4 ngày, 60 lượt) chọn bằng thử nghiệm trên bộ 2 tuần so với 40–90 lượt và bước 1–3 ngày, không phải giá trị tối ưu chứng minh được.
