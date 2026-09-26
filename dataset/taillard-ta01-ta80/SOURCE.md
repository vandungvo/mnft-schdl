# Taillard ta01–ta80 — job-shop scheduling instances

**Tải ngày:** 2026-09-18 | **Trạng thái:** đã tải, nguyên bản

## Nguồn

- Trích dẫn gốc: Taillard, E. (1993). Benchmarks for basic scheduling problems. *European Journal of Operational Research*, 64(2), 278–285. Xem `references/01_taillard_1993.md`.
- Trang chủ gốc của Taillard (`mistic.heig-vd.ch`) đã **ngừng hoạt động** (connection refused khi kiểm tra). OR-Library (`brunel.ac.uk`) chỉ có mã sinh instance (Pascal/C, cần tự chạy), **không có** file dữ liệu ta01–ta80 sẵn.
- File dùng ở đây tải từ mirror hợp pháp, còn hoạt động: repo **`nasuta/jsp-instance-utils`** (bộ công cụ Python đọc/parse instance JSSP), đóng gói lại toàn bộ instance chuẩn kèm license.
  - Zenodo record: https://zenodo.org/records/15063451 (DOI: `10.5281/zenodo.15063451`, v1.0.4, xuất bản 2025-03-21)
  - License Zenodo record: **CC BY 4.0**. License code trong repo (`LICENSE` — đã copy vào đây): **MIT** (Alexander Nasuta).
  - File gốc archive: `jsp-instance-utils-main.zip`, chỉ trích riêng 2 folder `resources/jsp_instances/{standard,taillard}/ta*.txt` (bỏ code/docs/notebook không liên quan tới đề tài).

## Nội dung

80 instance `ta01`–`ta80`, ở **2 format**:

| Folder | Format | Mô tả |
|---|---|---|
| `standard/` | mỗi dòng 1 job, các cặp `(máy, thời gian)` xen kẽ trên 1 dòng | dễ đọc trực tiếp cho parser JSSP thông dụng (đúng format OR-Library) |
| `taillard/` | 2 khối riêng: ma trận thứ tự máy, rồi ma trận thời gian xử lý | đúng format công bố gốc trong bài báo Taillard (1993) |

Kích thước instance tăng dần từ `ta01` (15 job × 15 máy) tới `ta80` (50 job × 20 máy — nhóm lớn nhất).

## Liên quan đến đề tài

Benchmark **Taillard** là 1 trong 2 bộ dữ liệu chuẩn công khai dùng để kiểm chứng phần lõi thuật toán CP-SAT (§2.5 báo cáo) — không có ràng buộc đặc thù ngành của đề tài, chỉ dùng đối chứng makespan với kết quả tốt nhất đã công bố trong tài liệu (best-known solutions tham khảo thêm tại http://optimizizer.com/TA.php, chưa tải về đây).
