# Technical Specification — Explainable Scheduling Agent

**Đồ án:** CO5103 — Võ Văn Dũng | **Học kỳ:** HK261 (2026–2027)
**Trạng thái:** Draft v1 — dựa trên các prototype đã kiểm chứng (`scheduling_poc*.py`, `production_planning_2weeks.py`, `detailed_day_schedule.py`)

**Giả định khi lập tài liệu này** (chỉnh lại nếu sai): đồ án cá nhân (solo), còn khoảng **12–14 tuần** trong học kỳ, mục tiêu cuối là một ứng dụng demo chạy local (không cần hạ tầng cloud production).

---

## 1. Mục tiêu ứng dụng

Đóng gói 2 tầng lập lịch đã kiểm chứng (Aggregate Planning → Detailed Scheduling) cùng lớp giải thích thành một **ứng dụng web nội bộ** cho quản đốc/ban lãnh đạo: nhập đơn hàng + tồn kho → xem kế hoạch sản xuất → hỏi "vì sao" → giả lập tình huống (đơn gấp, máy hỏng).

Không mục tiêu: multi-tenant, scale lớn, real-time streaming — đây là công cụ hỗ trợ quyết định cho 1 nhà máy, chạy theo phiên (batch), không cần kiến trúc phân tán.

---

## 2. Kiến trúc tổng thể

```
┌─────────────────┐      REST/JSON       ┌──────────────────────┐
│   Frontend Web   │ ───────────────────▶ │     Backend API      │
│  (React + Vite)  │ ◀─────────────────── │      (FastAPI)       │
└─────────────────┘                       └──────────┬────────────┘
                                                       │
                                     ┌─────────────────┼─────────────────┐
                                     ▼                 ▼                 ▼
                            ┌───────────────┐ ┌────────────────┐ ┌─────────────┐
                            │ Aggregate      │ │ Detailed        │ │ Explanation │
                            │ Planning engine│ │ Scheduling engine│ │ engine      │
                            │ (OR-Tools CP-SAT)│ (OR-Tools CP-SAT)│ │ (Python)    │
                            └───────────────┘ └────────────────┘ └─────────────┘
                                     │                 │                 │
                                     └────────┬────────┴────────┬────────┘
                                              ▼                 ▼
                                       ┌─────────────────────────────┐
                                       │   Database (PostgreSQL)     │
                                       │ orders, machines, inventory,│
                                       │ schedule runs, audit log    │
                                       └─────────────────────────────┘
```

**Số service = 2 service ứng dụng + 1 datastore** (MVP):
1. **Frontend** — React SPA, không có logic nghiệp vụ, chỉ gọi API và hiển thị.
2. **Backend API** — 1 process FastAPI duy nhất, chứa cả 3 "engine" (aggregate/detailed/explanation) như các **module Python nội bộ**, không tách microservice — vì solve time (~1–30s) đủ ngắn để chạy đồng bộ (synchronous) trong 1 request, không cần queue/worker riêng.
3. **PostgreSQL** — lưu cấu hình (đơn hàng, máy, tồn kho) và lịch sử các lần chạy (audit trail cho lớp giải thích).

> **Stretch goal (chỉ làm nếu dư thời gian ở tuần 10+):** tách engine solve thành **service thứ 3** (worker chạy bằng Celery + Redis) nếu cần chạy nhiều kịch bản what-if song song hoặc solve time vượt quá ngưỡng chấp nhận được cho 1 request HTTP (>30s). Không làm ngay từ đầu — thêm phức tạp hạ tầng không cần thiết cho MVP.

---

## 3. Tech stack & lý do chọn

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Optimization engine | **Python + OR-Tools CP-SAT** | Đã viết và kiểm chứng (5 file prototype), không viết lại |
| Backend framework | **FastAPI** | Cùng ngôn ngữ với engine (không cần serialize qua ranh giới ngôn ngữ), tự sinh OpenAPI docs, async-ready nếu sau này cần |
| Database | **PostgreSQL** (dev: SQLite cũng chạy được qua cùng SQLAlchemy model) | Đủ mạnh cho quan hệ đơn hàng/tồn kho/lịch sử, miễn phí, quen thuộc |
| ORM | **SQLAlchemy 2.x + Alembic** | Migration có version, chuẩn trong hệ sinh thái Python |
| Frontend framework | **React 18 + TypeScript + Vite** | Cần UI tương tác thật (kéo/zoom Gantt, click để xem giải thích) — Streamlit/Dash không đủ linh hoạt cho các tương tác này |
| Styling | **TailwindCSS** | Tốc độ dựng UI nhanh, không cần thiết kế design system riêng |
| Gantt/timeline chart | **frappe-gantt** hoặc **vis-timeline** | Thư viện JS nhẹ, đủ cho Gantt kéo/zoom, không cần D3 tự viết từ đầu |
| Biểu đồ KPI/tồn kho | **Recharts** | Đủ cho line/bar chart tồn kho theo ngày, tích hợp React tốt |
| Data fetching | **TanStack Query (React Query)** | Cache + refetch khi re-plan, tránh tự quản lý loading state thủ công |
| Container hoá | **Docker Compose** (3 container: frontend, backend, db) | Demo local nhất quán, dễ chạy trên máy GVHD nếu cần |

**Không dùng** (và lý do): Celery/Redis (chưa cần ở MVP), Kubernetes (quá mức cần thiết), microservices nhiều service (thêm độ phức tạp vận hành không tương xứng giá trị cho 1 đồ án cá nhân).

---

## 4. Mapping code hiện có → module backend

| File prototype hiện tại | Trở thành module trong backend |
|---|---|
| `scheduling_poc_multi.py` + `detailed_day_schedule.py` | `app/engine/detailed_scheduling.py` |
| `production_planning_2weeks.py` | `app/engine/aggregate_planning.py` |
| Các hàm `trace_critical_path`, `explain_machine_gaps`, `bottleneck_summary`, `explain_rush_order` (trong `scheduling_poc_inventory.py`) | `app/engine/explanation.py` |
| Dữ liệu hard-code (`JOBS`, `MACHINES`, `ELIGIBLE`, `ORDERS`...) | Chuyển thành bảng DB (`orders`, `machines`, `machine_eligibility`, `changeover_matrix`) — nhập qua UI thay vì sửa code |

Việc này **không viết lại thuật toán** — chỉ tách phần dữ liệu hard-code ra khỏi logic solve, và bọc mỗi hàm `build_and_solve()` thành 1 hàm service nhận input từ DB, trả JSON cho API.

---

## 5. Data model (bảng chính)

| Bảng | Trường chính | Ghi chú |
|---|---|---|
| `orders` | id, type, qty, due_day, created_at | Đơn hàng khách |
| `machines` | id, name, stage (cast/cnc), daily_capacity | Danh sách máy |
| `machine_eligibility` | machine_id, product_type | Machine eligibility (n-n) |
| `changeover_matrix` | type_a, type_b, setup_time | Ma trận đổi khuôn |
| `inventory_snapshot` | product_type, wip_qty, fg_qty, wip_min, fg_min, snapshot_date | Tồn kho tại 1 thời điểm |
| `schedule_runs` | id, run_type (aggregate/detailed), input_hash, created_at | Audit trail — mỗi lần bấm "Lập lịch" |
| `schedule_run_results` | run_id, day, machine_id, job_name, start, end | Kết quả chi tiết, dùng để vẽ Gantt và trace lại giải thích sau này mà không cần solve lại |

`schedule_run_results` lưu lại đầy đủ là điểm quan trọng: **lớp giải thích đọc từ đây, không solve lại** → trả lời "vì sao" tức thời, không tốn thời gian CP-SAT lần 2 (trừ counterfactual, vốn cần solve lại theo định nghĩa).

---

## 6. API chính (REST)

```
POST   /orders                        Tạo đơn hàng
GET    /orders                        Danh sách đơn hàng
POST   /machines                      Khai báo máy + eligibility
POST   /inventory/snapshot            Nhập tồn kho đầu kỳ

POST   /planning/aggregate/run        Chạy Tầng 1 (2 tuần) -> lưu schedule_run, trả plan theo ngày
GET    /planning/aggregate/{run_id}   Lấy lại kết quả 1 lần chạy

POST   /scheduling/detailed/run       Chạy Tầng 2 cho 1 ngày cụ thể (đọc từ 1 aggregate run)
GET    /scheduling/detailed/{run_id}  Lấy lại Gantt chi tiết

GET    /explain/critical-path         params: run_id, job -> chuỗi nguyên nhân
GET    /explain/bottleneck            params: run_id -> máy nút thắt, đơn sát hạn
POST   /explain/counterfactual        body: run_id, job, new_due -> solve lại, trả diff

GET    /kpi/summary                   params: run_id -> tardiness cost, holding cost, utilization
```

---

## 7. Lộ trình thực hiện (giả định 13 tuần còn lại)

| Tuần | Việc chính | Đầu ra |
|---|---|---|
| 1 | Chốt data model, dựng repo skeleton (FastAPI + React + Docker Compose rỗng) | Repo chạy "Hello World" end-to-end |
| 2–3 | Bọc `aggregate_planning.py` + `detailed_scheduling.py` thành service, nối DB (thay hard-code bằng query) | API `/planning/aggregate/run` trả JSON đúng như bản CLI |
| 4 | Bọc `explanation.py`, endpoint `/explain/*` | Trace critical path qua API, khớp kết quả CLI cũ |
| 5–6 | Frontend: layout, form nhập đơn hàng/tồn kho, gọi API | Nhập liệu → thấy bảng kế hoạch |
| 7 | Frontend: Gantt chart tương tác (frappe-gantt) cho cả 2 tầng | Xem lịch trực quan, zoom/filter được |
| 8 | Frontend: panel "Vì sao?" + cảnh báo bottleneck | Click ô lịch → hiện giải thích |
| 9 | Frontend: form giả lập đơn gấp (counterfactual) + hiển thị diff | Demo được kịch bản "đơn J6 cần gấp" |
| 10 | Kiểm chứng: chạy lại trên benchmark JSSP công khai (Taillard/Lawrence), so sánh chất lượng lời giải | Bảng so sánh đưa vào báo cáo |
| 11 | Viết chương "Mô hình hoá & Kết quả thực nghiệm" của luận văn | Draft chương 3–4 |
| 12 | Polish UI, chuẩn bị 1–2 kịch bản demo cố định cho buổi bảo vệ | Kịch bản demo scripted |
| 13 | Buffer + phản hồi từ GVHD + chỉnh sửa cuối | Bản nộp cuối |

**Ưu tiên khi thiếu thời gian:** cắt Tầng 3 (chatbot, human-in-the-loop kéo-thả) trước; **không cắt** panel "Vì sao?" và counterfactual — đó là phần tạo giá trị học thuật khác biệt theo đúng định hướng đã thống nhất.

---

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| CP-SAT solve chậm khi dữ liệu thật lớn hơn nhiều so với ví dụ minh hoạ | Giới hạn `max_time_in_seconds`, chấp nhận `FEASIBLE` thay vì `OPTIMAL`, cảnh báo rõ trên UI |
| Kết quả CP-SAT không tái lập được giữa các lần chạy (đã gặp ở `scheduling_poc_inventory.py`) | Cố định `random_seed` + `num_search_workers=1` cho các lần chạy dùng để demo/báo cáo |
| Scope UI phình to, hết thời gian cho phần thuật toán/luận văn | Theo đúng thứ tự ưu tiên ở mục 7; không làm Tầng 3 nếu tuần 9 chưa xong Tầng 2 |
| GVHD yêu cầu đổi hướng dữ liệu (dùng dữ liệu thật thay vì synthetic) | Data model đã tách khỏi code (mục 4–5) nên đổi nguồn dữ liệu không cần sửa engine |

---

*Tài liệu này là bản nháp v1, cập nhật lại khi phạm vi thay đổi theo phản hồi của GVHD.*
