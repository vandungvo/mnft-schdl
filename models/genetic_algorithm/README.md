# Genetic Algorithm

Chạy từ gốc repo: `python -m models.genetic_algorithm.run --seconds 30 --seed 11`.

Mã hoá random-key và thiên hướng máy giống SA; quần thể 14 cá thể, tournament 3, lai uniform theo từng gene, đột biến hoán đổi key/thay thiên hướng máy, giữ hai elite. Khởi tạo có EDD và các biến thể nhiễu. Mỗi cá thể được giải mã thành lịch với cùng ràng buộc.

Cài đặt: [search.py](../common/search.py), nhánh `ga`. Kết quả gồm số thế hệ, lượt đánh giá và lịch sử cải thiện. Đây là GA cơ bản để đối chứng, chưa phải GA được tuning chuyên sâu hay memetic algorithm.
