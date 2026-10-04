# mnft-schdl — Đồ án CO5103: Reasonable Scheduling Agent

Đồ án cao học CO5103 (Hệ thống thông tin quản lý), GVHD **PGS.TS Võ Thị Ngọc Châu**. Bài toán: agent lập lịch sản xuất tạo ra lịch hợp lý cho nhà máy sản xuất linh kiện (case study: bánh xe, 2 dây chuyền trước/sau, 4 công đoạn đúc→CNC→sơn→QC), mô hình hoá dạng Flexible Job-Shop Scheduling (FJSP) giải bằng OR-Tools CP-SAT, đóng gói trong pipeline 2 tầng (planning tháng/quý + scheduling 2 tuần) kèm lớp diễn giải phụ trợ (critical path, sensitivity, counterfactual, utilization — hỗ trợ tin tưởng lịch hợp lý, không phải mục tiêu cốt lõi). Backend FastAPI, frontend Next.js, cả hai đã có skeleton.

Repo này vừa được bổ sung bộ **BA-Kit** (skills/rules/agents/templates BA, nguồn `D:\ai4ba-master`) để hỗ trợ đi từ spec → sản phẩm chạy được. Đây là dự án cá nhân, không phải sản phẩm thương mại đa stakeholder — dùng skill nào khi cần, không bắt buộc chạy hết pipeline.

## Cấu trúc thư mục

| Path | Nội dung |
|------|---------|
| `report/` | Báo cáo sơ bộ đã nộp (`Report_so_bo_Do_an_CO5103_VoVanDung.md` + `.pdf`) và spec kỹ thuật sống `TECHNICAL_SPEC.md` (roadmap 13 tuần) ở gốc — **nguồn sự thật hiện tại của đồ án**, tách riêng khỏi `docs/` để không lẫn với tài liệu BA-Kit sinh ra sau này. 5 folder con: `problem-requirements/` (tổng hợp gọn yêu cầu bài toán — bối cảnh/mục tiêu/phạm vi/ràng buộc/tiêu chí thành công, rút từ 2 file gốc), `literature-review/` (rà soát tài liệu tham khảo + benchmark data + bảng đối sánh), `scheduling-algorithms/` (phân tích xu hướng/lựa chọn thuật toán lập lịch), `evaluation/` (kết quả thực nghiệm baseline vs CP-SAT trên benchmark — việc 3 cô Châu), `meeting-notes/` (ghi nhận phản hồi GVHD theo thời gian) |
| `references/` | Benchmark/reference đang mở rộng theo yêu cầu cô Châu (ở gốc repo, ngang hàng `report/`) — ghi chú trích dẫn học thuật (bài báo), KHÔNG chứa file dữ liệu thật |
| `dataset/` | File dữ liệu benchmark thật (ngang hàng `report/`) — OR-Library raw, Taillard ta01-ta80, Deliktaş et al. FJSP cellular (43 instance), Mota et al. production-line energy. Mỗi nguồn 1 folder + `SOURCE.md` (license/ngày tải/liên quan đề tài), xem `dataset/README.md` |
| `docs/` | Tài liệu BA-Kit sinh ra qua skill — mỗi feature 1 folder `docs/{feature-slug}/`, xem `.claude/rules/feature-bootstrap.md`. Đã có `docs/production-scheduling/` (SRS + use case cho feature lập lịch chính) |
| `docs/_shared/project-profile.md` | Bối cảnh dự án tích luỹ dần — skill nào thiếu info sẽ hỏi rồi ghi vào đây (đang là khung rỗng, chưa điền) |
| `docs/_product/prd.md` | PRD cấp sản phẩm nếu muốn hình thức hoá scope tổng (đang là khung rỗng — chạy `/prd` để điền, không bắt buộc cho đồ án solo) |
| `backend/` | FastAPI + OR-Tools CP-SAT engine (sản phẩm chính). Alembic migrations, SQLite qua `data/mnft.db`. Xem `README.md` gốc repo để chạy local/Docker |
| `frontend/` | Next.js UI (quản lý dataset, kế hoạch tổng hợp, lịch chi tiết, Gantt) — gọi API của `backend/` |
| `models/` | Bộ baseline lập lịch dùng để đánh giá (FIFO/EDD/SPT/SA/GA/CP-SAT/CP-SAT+hint/CP-LNS) trên cùng 1 input — phục vụ việc 3 cô Châu yêu cầu (implement + evaluate). `models/input/wheel_factory.json` còn được `backend/` dùng làm dữ liệu bootstrap mặc định (path tham chiếu cứng, không di chuyển thư mục này). Xem `models/README.md` |
| `experiment/` | Thử nghiệm mô hình lập lịch mới (tồn bán thành phẩm theo công đoạn) — **tách biệt có chủ đích** khỏi `models/`, không dùng chung kết quả. Xem `experiment/README.md` |
| `legacy/` | Script POC/mô hình cũ trước khi có `backend/`+`frontend/`+`models/` — giữ để tham khảo, không phát triển tiếp. Gồm cả `legacy/dashboard/` (dashboard HTML/JSON tĩnh sinh bởi script cũ, đã bị `frontend/` thay thế) |
| `.claude/skills/` | 58 skill user-invocable (`/command`), mỗi skill 1 folder chứa `SKILL.md` — **coi là tham khảo/công cụ khi cần, không bắt buộc chạy** |
| `.claude/agents/` | 13 agent persona review/research (gọi qua Task tool khi skill cần) |
| `.claude/rules/` | Quy ước dùng chung: naming, status lifecycle, changelog, approval-gate, diagram-correctness... |
| `.claude/scripts/`, `.claude/hooks/` | Engine verify diagram (mermaid/erd/bpmn), hook tự động changelog/status/staleness |
| `_templates/` | Template các skill Write ra (ở gốc repo, ngang hàng `.claude/`) |

**`report/` là tài liệu chính thức của đồ án, không đụng vào trừ khi sửa nội dung báo cáo/spec.** `docs/` là không gian làm việc mới, sạch, cho bất kỳ tài liệu BA-Kit nào sinh ra sau này.

## Quy ước khi dùng skill

- **Approval gate**: skill phải cho xem plan (L1) trước khi Write, diff (L2) trước khi Edit file đã có, và lặp tối đa 3 vòng (L3) cho output sáng tạo (ASCII wireframe, mermaid). Xem `.claude/rules/approval-gate.md`.
- **Changelog**: mọi thay đổi do skill tạo ra được hook `auto-changelog.sh` ghi vào `docs/_shared/changelog.md` (chưa tồn tại — tự tạo lần Write đầu).
- **Status lifecycle**: `draft → in-review → revisions → approved → shipped` (frontmatter `status`). Xem `.claude/rules/status-lifecycle.md`.
- **Naming**: slug kebab-case, ID có prefix feature (`FR-{feature}-NNN`...). Xem `.claude/rules/naming-conventions.md`.

## Gợi ý áp dụng cho 4 việc cô Châu yêu cầu

1. **Thêm nguồn benchmark/reference** — không có skill riêng, làm thủ công trong `references/` như đang làm; `/cr` nếu cần sửa lại `report/` đã nộp có kiểm tác động.
2. **Bảng đối sánh literature** — có thể dùng `/discover` hoặc viết thủ công trong `report/literature-review/`; nếu muốn hình thức hoá thành SRS-style so sánh, `/srs` hoặc `/usecase` không hợp — đây là việc viết academic, không phải BA spec.
3. **Implement + evaluate model** (FIFO/EDD/SPT baseline, benchmark Taillard/Lawrence) — dùng `/test-checklist` rồi `/test-cases` để đặc tả kịch bản đánh giá, `/userstory` + `/ac` để đóng gói việc còn lại thành backlog rõ ràng. Kết quả thực nghiệm ghi vào `report/evaluation/`.
4. **Xuất báo cáo nộp cô Châu** — `/export` (cần cài `pandoc`) hoặc `/preview` (không cần cài gì, mở thẳng bằng browser).

## Công cụ ngoài cần cài (chỉ khi dùng skill tương ứng)

Node.js + Python 3 (bắt buộc cho phần lớn script verify) · `pandoc` (export PDF/DOCX) · mermaid-cli `mmdc` (export/dbdiagram/user-flow) · `d2` CLI (họ d2-*) · Playwright (playwright-gen, test-cases screenshot) · `@usebruno/cli` qua npx (api-test) · MCP Atlassian (jira/confluence, chưa cấu hình) · MCP reqwise-figma (figma, chưa cấu hình).

PlantUML (activity-swimlane, usecase-diagram, preview) render qua plantuml.com — gửi nội dung diagram (tên lane/step) qua HTTPS ra ngoài, không dùng cho nội dung nhạy cảm.
