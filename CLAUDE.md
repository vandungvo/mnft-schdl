# mnft-schdl — Đồ án CO5103: Reasonable Scheduling Agent

Đồ án cao học CO5103 (Hệ thống thông tin quản lý), GVHD **PGS.TS Võ Thị Ngọc Châu**. Bài toán: agent lập lịch sản xuất tạo ra lịch hợp lý cho nhà máy sản xuất linh kiện (case study: bánh xe, 2 dây chuyền trước/sau, 4 công đoạn đúc→CNC→sơn→QC), mô hình hoá dạng Flexible Job-Shop Scheduling (FJSP) giải bằng OR-Tools CP-SAT, đóng gói trong pipeline 2 tầng (planning tháng/quý + scheduling 2 tuần) kèm lớp diễn giải phụ trợ (critical path, sensitivity, counterfactual, utilization — hỗ trợ tin tưởng lịch hợp lý, không phải mục tiêu cốt lõi). Backend FastAPI, frontend Next.js, cả hai đã có skeleton.

## Cấu trúc thư mục

| Path | Nội dung |
|------|---------|
| `report/` | Ở gốc chỉ để bản nộp chính thức: báo cáo sơ bộ (`Report_so_bo_Do_an_CO5103_VoVanDung.md` + `.pdf`), báo cáo tiến độ (`Report_tien_do_Do_an_CO5103_VoVanDung.md` + `.docx`/`.pdf`) và spec kỹ thuật sống `TECHNICAL_SPEC.md` (roadmap 13 tuần) — **nguồn sự thật hiện tại của đồ án**, tách riêng khỏi `docs/` (đặc tả sản phẩm). Folder con: `progress/` (báo cáo tiến độ ngắn theo ngày gửi GVHD, `Bao_cao_tien_do_YYYY-MM-DD_*`), `demo/` (trang demo HTML tự chứa theo ngày), `figures/` (hình dùng trong báo cáo), `archive/` (bản export cũ thay thế), `problem-requirements/` (tổng hợp gọn yêu cầu bài toán — bối cảnh/mục tiêu/phạm vi/ràng buộc/tiêu chí thành công, rút từ 2 file gốc; kèm `quy_trinh_san_xuat_vanh_xe_may.md` phân tích video quy trình), `literature-review/` (rà soát tài liệu tham khảo + benchmark data + bảng đối sánh; bản cuối `literature_review.md`, nháp cũ ở `drafts/`, bản dịch bài báo ở `papers/`), `scheduling-algorithms/` (phân tích xu hướng/lựa chọn thuật toán lập lịch), `evaluation/` (kết quả thực nghiệm baseline vs CP-SAT trên benchmark — việc 3 cô Châu), `meeting-notes/` (ghi nhận phản hồi GVHD theo thời gian) |
| `references/` | Benchmark/reference đang mở rộng theo yêu cầu cô Châu (ở gốc repo, ngang hàng `report/`) — ghi chú trích dẫn học thuật (bài báo) + PDF bài báo tải được ở `references/pdfs/` (nơi duy nhất để PDF), KHÔNG chứa file dữ liệu thật |
| `dataset/` | File dữ liệu benchmark thật (ngang hàng `report/`) — OR-Library raw, Taillard ta01-ta80, Deliktaş et al. FJSP cellular (43 instance), Mota et al. production-line energy, cùng 2 bộ wheel-factory tự dựng (`wheel-factory-small`, `wheel-factory-2weeks`). Mỗi nguồn 1 folder + `SOURCE.md` (license/ngày tải/liên quan đề tài), xem `dataset/README.md` |
| `docs/` | Đặc tả sản phẩm: `docs/production-scheduling/` (SRS + use case cho feature lập lịch chính), `docs/_product/implementation-plan.md` (kế hoạch triển khai), `docs/_shared/project-profile.md` (bối cảnh dự án: domain, người dùng & thuật ngữ). Viết ban đầu bằng bộ BA-Kit (đã gỡ khỏi repo 2026-10-26) — giờ sửa tay như tài liệu thường |
| `backend/` | FastAPI + OR-Tools CP-SAT engine (sản phẩm chính). Alembic migrations, SQLite qua `data/mnft.db` (`data/` bị gitignore, chỉ có ở máy local). Xem `README.md` gốc repo để chạy local/Docker |
| `frontend/` | Next.js UI (quản lý dataset, kế hoạch tổng hợp, lịch chi tiết, Gantt) — gọi API của `backend/` |
| `models/` | Bộ baseline lập lịch dùng để đánh giá (FIFO/EDD/SPT/SA/GA/CP-SAT/CP-SAT+hint/CP-LNS) trên cùng 1 input — phục vụ việc 3 cô Châu yêu cầu (implement + evaluate). `models/input/wheel_factory.json` còn được `backend/` dùng làm dữ liệu bootstrap mặc định (path tham chiếu cứng, không di chuyển thư mục này). Kết quả chạy lưu ở `models/runs/{v1,v2}/` (đã track); `models/runs/archive/` (chạy thử/bỏ dở) chỉ giữ local. Xem `models/README.md` |
| `research/` | Mã nghiên cứu, **không** thuộc sản phẩm và không build vào Docker (xem `research/README.md`): `research/experiment/` (thử nghiệm mô hình mới — tồn bán thành phẩm theo công đoạn — **tách biệt có chủ đích** khỏi `models/`, không dùng chung kết quả), `research/notebooks/` (notebook Colab/Kaggle tự chứa chạy CP-SAT không hint trên bộ 2 tuần với ngân sách dài; sinh bằng `build_cp_sat_cold_2weeks.py`, không sửa tay), `research/legacy/` (script POC/mô hình cũ trước khi có `backend/`+`frontend/`+`models/`, kèm `dashboard/` tĩnh đã bị `frontend/` thay thế — chỉ tham khảo, không phát triển tiếp) |
| `.github/workflows/ci.yml`, `.gitattributes`, `.editorconfig`, `.dockerignore` | CI (pytest backend+models, notebook test, lint/typecheck/build frontend) · chuẩn hoá line ending (LF cho `*.sh`/Dockerfile) · định dạng editor · loại `models/runs`, `research/`, tài liệu khỏi Docker image |

**`report/` là tài liệu chính thức của đồ án, không đụng vào trừ khi sửa nội dung báo cáo/spec.**

## 4 việc cô Châu yêu cầu — để ở đâu

1. **Thêm nguồn benchmark/reference** — ghi chú trong `references/`, file dữ liệu thật trong `dataset/` (kèm `SOURCE.md`).
2. **Bảng đối sánh literature** — `report/literature-review/literature_review.md`.
3. **Implement + evaluate model** (FIFO/EDD/SPT/SA/GA/CP-SAT...) — code trong `models/`, kết quả chạy trong `models/runs/`, tổng hợp thực nghiệm ghi vào `report/evaluation/`.
4. **Xuất báo cáo nộp cô Châu** — bản nộp ở gốc `report/`, báo cáo tiến độ theo ngày trong `report/progress/`.
