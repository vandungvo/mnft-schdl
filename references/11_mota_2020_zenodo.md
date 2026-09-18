# [11] Mota, Gomes, Faria, Ramos & Vale (2020) — dataset dây chuyền sản xuất, Zenodo

**Trích dẫn:** Mota, B., Gomes, L., Faria, P., Ramos, C., & Vale, Z. (2020). *Production line dataset for task scheduling and energy optimization – Schedule Optimization* (v0.1) [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.4106746

**License:** MIT — tự do dùng lại, chỉnh sửa, chỉ cần giữ ghi nhận bản quyền/license.

**Truy cập file:** không tải dữ liệu về đây (là dataset, không phải bài báo) — link Zenodo ở trên vẫn hoạt động, tải trực tiếp khi cần dùng.

**Nội dung:** dữ liệu **thật** từ một công ty dệt may sản xuất hangtag — 3 máy trong cùng 1 cell sản xuất, theo dõi trong 6 ngày (thứ 2 7h00 – thứ 7 23h00), lấy mẫu mỗi **5 phút** cho cả thời lượng tác vụ (task duration) lẫn dữ liệu tiêu thụ năng lượng. Có API liên quan tại http://www.gecad.isep.ipp.pt/api/spear/ (dự án được tài trợ bởi FCT — Bồ Đào Nha, UIDB/00760/2020).

**Liên quan đến đề tài:** không phải benchmark JSSP chuẩn (không có cấu trúc job/machine eligibility như Taillard), nhưng là dữ liệu **thực đo** về thời gian tác vụ + năng lượng theo máy — dùng để đối chiếu/hiệu chỉnh tham số cho ràng buộc "hiệu suất sử dụng máy" (§2.2 TECHNICAL_SPEC.md) thay vì tham số hoá hoàn toàn chủ quan. Quy mô nhỏ hơn nhiều (3 máy, 1 cell) so với case study bánh xe của đề tài nên chỉ dùng tham chiếu, không dùng trực tiếp làm input.
