# OR-Library — raw job-shop instance file

**Tải ngày:** 2026-09-18 | **Trạng thái:** đã tải, nguyên bản

## Nguồn

- Trích dẫn: Beasley, J. E. (1990). OR-Library: Distributing test problems by electronic mail. *Journal of the Operational Research Society*, 41(11), 1069–1072. Xem `references/03_beasley_1990.md`.
- File tải trực tiếp: https://people.brunel.ac.uk/~mastjjb/jeb/orlib/files/jobshop1.txt
- License: OR-Library được Beasley xây dựng với mục đích phân phối miễn phí cho nghiên cứu (ban đầu qua email) — không có license hình thức, nhưng dùng lại trong nghiên cứu là thông lệ chuẩn của cả cộng đồng OR trong hơn 30 năm.

## Nội dung file `jobshop1.txt`

82 instance JSSP kinh điển, gộp từ nhiều nguồn được trích dẫn ngay trong header của file:

| Family | Số instance | Nguồn gốc |
|---|---|---|
| `abz5`–`abz9` | 5 | Adams, Balas & Zawack (1988) |
| `ft06`, `ft10`, `ft20` | 3 | Fisher & Thompson (1963) |
| `la01`–`la40` | 40 | **Lawrence (1984)** — xem `references/02_lawrence_1984.md` |
| `orb01`–`orb10` | 10 | Applegate & Cook (1991) |
| `swv01`–`swv20` | 20 | Storer, Wu & Vaccari (1992) |
| `yn1`–`yn4` | 4 | Yamada & Nakano (1992) |

Format: mỗi instance có 1 dòng mô tả, 1 dòng `số job / số máy`, rồi N dòng (1 dòng/job) liệt kê cặp `(số máy, thời gian xử lý)` cho từng công đoạn. Máy đánh số từ 0.

## Liên quan đến đề tài

Bộ **Lawrence (la01–la40)** trong file này là 1 trong 2 benchmark công khai dùng để kiểm chứng phần lõi thuật toán CP-SAT (§2.5 báo cáo, xem `references/02_lawrence_1984.md`). Không có ràng buộc đặc thù ngành của đề tài (setup phụ thuộc trình tự, lô tối thiểu, bảo trì khuôn, hiệu suất máy) — chỉ dùng đối chứng phần lõi (tối ưu makespan).
