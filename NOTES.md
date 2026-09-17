# NOTES — trạng thái implementation so với TECHNICAL_SPEC v2.4

Cập nhật lần cuối: phiên làm việc "skeleton + Aggregate Planning end-to-end".

## Đã xong

- Skeleton `backend/` (FastAPI, phân module `master_data/planning/scheduling/explanation/kpi`
  + `app/engine/`) và `frontend/` (Next.js App Router + TypeScript + TailwindCSS).
- `docker-compose.yml` 2 service (frontend, backend), SQLite file mount tại `./data/app.db`.
- Data model (mục 6): `orders`, `machines`, `machine_eligibility`, `changeover_matrix`,
  `inventory_snapshot`, `schedule_runs`, `schedule_run_results` — SQLAlchemy 2.x models +
  Alembic migration `0001_initial`. **Thiếu**: `molds`, `shifts` (nợ lại theo v2.4).
- Engine đã bọc (không sửa thuật toán), xem docstring từng file để biết chi tiết tham số hoá:
  - `app/engine/aggregate_planning.py` ← `model/production_planning_2weeks.py`
  - `app/engine/detailed_scheduling.py` ← `poc/scheduling_poc_multi.py` + `model/detailed_day_schedule.py`
  - `app/engine/explanation.py` ← các hàm `trace_critical_path`/`explain_machine_gaps`/
    `bottleneck_summary`/`explain_rush_order` trong `poc/scheduling_poc_inventory.py`
- API đã implement (router → service → engine, đúng mục 3.1):
  - `POST/GET /orders`, `POST/GET /machines`, `POST/GET /inventory/snapshot` (Master Data)
  - `POST /planning/aggregate/run`, `GET /planning/aggregate/{run_id}` (Production Planning) —
    đọc `orders` + `inventory_snapshot` mới nhất từ DB thật, solve CP-SAT, lưu `schedule_runs`.
  - `GET /explain/bottleneck?run_id=` (Explanation) — dùng
    `bottleneck_from_aggregate_plan` (bản đơn giản hoá, xem TODO bên dưới).
- Frontend: layout + form nhập đơn hàng & tồn kho (gọi API thật) + bảng kết quả Aggregate
  Planning theo ngày/loại, dùng TanStack Query, không mock data.
- Đã test thủ công end-to-end: tạo order + inventory snapshot → chạy aggregate → xem bảng kết
  quả trên UI → gọi bottleneck.

## Chưa xong / TODO (không bỏ qua lỗi, ghi rõ ở đây theo yêu cầu)

1. **`molds`, `shifts`**: chưa có model/migration/CRUD. Cần cho CRUD Master Data đầy đủ
   (mục 1.1) — làm ở tuần 5-6 theo roadmap.
2. **CRUD Master Data đầy đủ** (mục 1.1): máy/sản phẩm & thời gian xử lý/changeover
   matrix/khuôn/ca làm việc — đêm nay chỉ có `POST/GET /machines` tối thiểu (không có UI form
   riêng, không có sản phẩm/thời gian xử lý/lô tối thiểu/khuôn/ca). Ưu tiên theo mục 8: orders +
   inventory + bảng aggregate trước, đúng như roadmap yêu cầu khi thiếu thời gian.
3. **Production Scheduling (Tầng 2, detailed, horizon 2 tuần)**: engine đã bọc
   (`app/engine/detailed_scheduling.py`) nhưng **chưa có service/router**.
   `app/modules/scheduling/routers.py` là skeleton rỗng có TODO chi tiết. Cần:
   `POST /scheduling/detailed/run`, `GET /scheduling/detailed/{run_id}`, ghi kết quả vào
   `schedule_run_results`.
4. **Explanation đầy đủ**: `trace_critical_path`, `explain_machine_gaps`,
   `explain_rush_order`/`/explain/counterfactual`, `/explain/critical-path`,
   `/explain/sensitivity`, `/explain/utilization` — đã bọc thuật toán trong
   `app/engine/explanation.py` nhưng **chưa có router**, vì các hàm này cần kết quả job-level
   (per_machine + due date, giống `scheduling_poc_inventory.build_and_solve()`), phụ thuộc vào
   mục (3) ở trên. `GET /explain/bottleneck` hiện dùng bản đơn giản hoá
   `bottleneck_from_aggregate_plan` cho kết quả Aggregate (không có utilization theo máy thật,
   vì Aggregate không biết máy nào làm được loại nào — đúng như lưu ý trong
   `detailed_day_schedule.py`/mục 5 TECHNICAL_SPEC). Cần chuyển sang `bottleneck_summary` đầy đủ
   khi có detailed run.
5. **KPI/Report**: `GET /kpi/summary` — chưa implement (`app/modules/kpi/routers.py` là
   skeleton rỗng).
6. **Gantt chart** (frappe-gantt/vis-timeline), panel "Vì sao?", counterfactual UI (đơn gấp +
   máy hỏng), CRUD UI cho máy/sản phẩm/changeover/khuôn/ca: chưa làm — phụ thuộc mục 3-5 ở trên
   (roadmap tuần 7-9).
7. **Kiểm chứng** (so với FIFO/EDD/SPT baseline, benchmark Taillard/Lawrence): chưa làm
   (roadmap tuần 10).
8. **Alembic**: đã viết `alembic.ini` + `env.py` + migration `0001_initial` thủ công (chưa chạy
   `alembic init` vì môi trường viết code không có mạng cài `alembic` lúc soạn migration —
   **đã cài & test chạy `alembic upgrade head` thành công**, xem lệnh trong README). `main.py`
   cũng gọi `Base.metadata.create_all()` khi startup cho tiện dev nhanh — Alembic vẫn là nguồn
   sự thật cho schema, `create_all()` chỉ là fallback không phá schema đã có.
9. **`schedule_run_results`**: bảng đã tạo theo đúng mục 6 nhưng **chưa được ghi bởi service
   nào** (chỉ dùng khi có Production Scheduling — mục 3 ở trên). `schedule_runs.result_json`
   (cột thêm ngoài mục 6) đang là nơi lưu trữ output Aggregate Planning thật.

## Cách chạy

```
docker compose up --build
```

- Backend: http://localhost:8000 (docs tại `/docs`)
- Frontend: http://localhost:3000
