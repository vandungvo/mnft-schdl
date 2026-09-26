# Dataset — bộ dữ liệu benchmark cho đồ án

Thư mục ngang hàng với `report/` và `references/`, chứa **file dữ liệu thật** (không phải ghi chú/citation) cho các benchmark đã nêu trong `references/` và `Report_so_bo_Do_an_CO5103_VoVanDung.md` §2.5/§3. Mỗi bộ có 1 file `SOURCE.md` ghi rõ nguồn, license, ngày tải, và liên quan tới đề tài — `references/*.md` vẫn là nơi ghi trích dẫn học thuật đầy đủ (bài báo), thư mục này chỉ chứa dữ liệu để chạy thực nghiệm.

## Các bộ đã thu thập

| Folder | Nguồn | License | Số instance/file | Dùng để |
|---|---|---|---|---|
| `or-library-raw/` | Beasley (1990), OR-Library — [`references/03`](../references/03_beasley_1990.md) | phân phối tự do cho nghiên cứu | 82 instance (gồm **Lawrence la01–la40**, [`references/02`](../references/02_lawrence_1984.md)) | Kiểm chứng lõi CP-SAT — makespan |
| `taillard-ta01-ta80/` | Taillard (1993) — [`references/01`](../references/01_taillard_1993.md), mirror qua Zenodo `10.5281/zenodo.15063451` | CC BY 4.0 (record) / MIT (code) | 80 instance × 2 format | Kiểm chứng lõi CP-SAT — makespan |
| `deliktas-fjsp-cellular/` | Deliktaş et al. (2024) — [`references/10`](../references/10_deliktas_2024_databrief.md), Mendeley Data `10.17632/rtzby7pv7m.1` | CC BY 4.0 | 43 instance CSV (Small/Medium/Large) | Kiểm chứng ràng buộc setup phụ thuộc trình tự theo họ sản phẩm |
| `mota-production-line-energy/` | Mota et al. (2020) — [`references/11`](../references/11_mota_2020_zenodo.md), Zenodo `10.5281/zenodo.4106746` | MIT | 3 file (JSON×2 + XLSX) | Đối chiếu tham số hiệu suất sử dụng máy (dữ liệu thực đo năng lượng) |

## Chưa thu thập được (cần làm thủ công nếu muốn dùng)

- **Best-known solutions cho Taillard** (để so optimality gap) — tham khảo http://optimizizer.com/TA.php, chưa tải.
- **data.gov / data.gov.vn / Kaggle** — đã rà soát ở `report/literature-review/lit_review_draft.md` mục 1, kết luận không có dataset cấp máy/công đoạn/đơn hàng phù hợp — không thu thập.

## Quy ước

- Mỗi folder con là **1 nguồn**, có `SOURCE.md` riêng (nguồn/license/ngày tải/liên quan đề tài) — không sửa nội dung file dữ liệu gốc.
- File nén gốc (`.rar`, `.zip`) chỉ giữ nội dung đã giải nén nếu cần dùng trực tiếp; bản gốc archive không commit nếu đã có nội dung giải nén tương đương (tránh trùng lặp dung lượng).
- Dataset lớn/nhị phân — nếu về sau cần thêm nguồn khác, tạo folder mới cùng cấp, đừng gộp chung vào 1 folder đã có.
