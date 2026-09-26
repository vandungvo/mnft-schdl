# Mota et al. (2020) — Production line dataset (task scheduling + energy)

**Tải ngày:** 2026-09-18 | **Trạng thái:** đã tải, nguyên bản

## Nguồn

- Trích dẫn: Mota, B., Gomes, L., Faria, P., Ramos, C., & Vale, Z. (2020). *Production line dataset for task scheduling and energy optimization – Schedule Optimization* (v0.1) [Dataset]. Zenodo. Xem `references/11_mota_2020_zenodo.md`.
- Zenodo record: https://zenodo.org/records/4106746 (DOI: `10.5281/zenodo.4106746`)
- **License: MIT** — tự do dùng lại/chỉnh sửa, chỉ cần giữ ghi nhận bản quyền.
- Tải qua Zenodo REST API (`zenodo.org/api/records/4106746`) — link trực tiếp từng file lấy từ trường `files[].links.self`.

## Nội dung

Dữ liệu **thật** từ 1 công ty dệt may sản xuất hangtag — 3 máy trong 1 cell sản xuất, theo dõi 6 ngày (thứ 2 7h00 – thứ 7 23h00), lấy mẫu mỗi **5 phút** cho cả thời lượng tác vụ (task duration) lẫn tiêu thụ năng lượng.

| File | Kích thước | Nội dung |
|---|---|---|
| `Input_JSON_Schedule_Optimization.json` | 26 KB | dữ liệu đầu vào (task, máy, thời điểm) |
| `Output_JSON_Schedule_Optimization.json` | 386 KB | kết quả lập lịch + năng lượng theo thời gian |
| `Output_Statistics_Schedule_Optimization.xlsx` | 968 KB | thống kê tổng hợp dạng Excel |

## Liên quan đến đề tài

**Không phải** benchmark JSSP/FJSP chuẩn (không có cấu trúc job/machine eligibility như Taillard/Lawrence/Deliktaş) — đây là dữ liệu **thực đo** thời gian tác vụ + năng lượng theo máy, dùng để **đối chiếu/hiệu chỉnh tham số** cho ràng buộc "hiệu suất sử dụng máy" (§2.2 TECHNICAL_SPEC.md) khi sinh dữ liệu tổng hợp, thay vì tham số hoá hoàn toàn chủ quan. Quy mô (3 máy, 1 cell) nhỏ hơn nhiều so với case study bánh xe của đề tài — chỉ dùng tham chiếu, không dùng trực tiếp làm input.
