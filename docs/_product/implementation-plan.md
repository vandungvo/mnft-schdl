---
type: implementation-plan
status: draft
updated: 2026-09-21
links:
  - report/TECHNICAL_SPEC.md
  - report/problem-requirements/problem_requirements.md
  - docs/production-scheduling/srs/production-scheduling-spec.md
  - models/README.md
---

# Kế hoạch triển khai Reasonable Scheduling Agent

## 0. Tiến độ triển khai — 2026-09-21

- ✅ Foundation: FastAPI, Next.js, SQLAlchemy/Alembic, SQLite, Docker Compose, structured logging/errors.
- ✅ Scheduling vertical slice: persisted background job, idempotency, snapshot/hash, validator, history, KPI và Gantt.
- ✅ Master Data phase 1: schema quan hệ đầy đủ, import/round-trip theo transaction, revisioned aggregate update, delete, export và tạo run từ `dataset_id`.
- ✅ Master Data phase 2: form chỉnh tồn kho/safety stock, machine setup time, đơn hàng; API create/update/delete entity, optimistic revision và validation toàn cục trước commit.
- ✅ Aggregate planning phase 1: plan bất biến theo dataset revision, bucket ngày/tuần, nhu cầu/tồn kho, rough-cut capacity, cảnh báo và tạo detailed run từ `plan_id`.
- ⬜ Chọn cửa sổ 2 tuần từ horizon dài, explanation, what-if/re-scheduling và hardening cuối.

## 1. Kết quả cần bàn giao

Một ứng dụng web nội bộ chạy local cho quản đốc/ban lãnh đạo, cho phép:

1. Quản lý dữ liệu nhà máy: sản phẩm, công đoạn/thời gian xử lý, máy và eligibility, changeover, khuôn, ca/downtime, đơn hàng và tồn kho.
2. Tổng hợp nhu cầu theo tháng/quý và chọn một cửa sổ 2 tuần để lập lịch chi tiết.
3. Chạy engine lập lịch, kiểm tra độc lập tính hợp lệ, lưu lịch sử run và hiển thị Gantt/KPI.
4. Xem nguyên nhân trễ, đường găng, bottleneck và hiệu suất máy.
5. Tạo kịch bản đơn gấp hoặc máy hỏng, lập lại lịch và so sánh trước/sau.
6. Chạy toàn bộ bằng Docker Compose; có dữ liệu demo cố định, test tự động và hướng dẫn trình diễn.

Không nằm trong bản bàn giao chính: multi-tenant, phân quyền phức tạp, cloud production, realtime streaming, kéo-thả để sửa lịch, chatbot, Celery/Redis và tối ưu cho nhiều nhà máy đồng thời.

## 2. Hiện trạng và quyết định nền

### Có thể tái sử dụng

- `models/common/cp_engine.py`: lõi CP-SAT cho lịch chi tiết.
- `models/common/decoder.py`: FIFO/EDD/SPT và lịch khởi tạo.
- `models/common/evaluate.py`: evaluator và validator độc lập.
- `models/common/instance.py` cùng `models/input/wheel_factory.json`: hợp đồng đầu vào và scenario demo 2 tuần.
- Hệ thống thực nghiệm trong `models/`: kết quả so sánh, metadata, seed và artifact đầu ra.
- 14 test hiện hữu đang pass tại ngày 2026-09-21.

### Cần xây mới

- Chưa có source application FastAPI, Next.js, SQLAlchemy/Alembic hay Docker Compose.
- Chưa có persistence cho master data, trạng thái run và kết quả lịch.
- Chưa có UI nghiệp vụ; `dashboard/*.html` chỉ là prototype tĩnh.
- SRS mới chi tiết cho `production-scheduling`; các module master data, planning, explanation và KPI chưa có contract đủ chặt.

### Quyết định triển khai

- Giữ nguyên engine đã kiểm chứng; thêm lớp adapter chuyển dữ liệu DB sang input contract của engine. Không nhúng query DB vào solver.
- Aggregate planning ở MVP là tổng hợp nhu cầu/công suất theo tháng/quý và tạo đầu vào 2 tuần; chưa dùng một solver CP-SAT riêng cho tầng này trừ khi yêu cầu sau này chứng minh cần thiết.
- Run dài được mô hình hóa như một job có trạng thái `QUEUED/RUNNING/SUCCEEDED/FAILED/CANCELLED`; frontend poll trạng thái. MVP vẫn chỉ có một backend service, chạy job trong process pool cục bộ.
- Chỉ đánh dấu run `SUCCEEDED` và cho phép xác nhận khi lịch đã qua validator độc lập.
- SQLite là mặc định cho demo. Schema và repository không phụ thuộc SQLite để có thể chuyển PostgreSQL sau này.
- `models/` tiếp tục là khu vực nghiên cứu/thực nghiệm; product code gọi một package engine ổn định, không gọi CLI hay đọc artifact từ thư mục `results/`.

## 3. Kiến trúc mục tiêu

```text
Next.js UI
   |
   | REST/JSON + polling run status
   v
FastAPI
   +-- master_data: CRUD, import/export, validation
   +-- planning: aggregate demand/capacity, select 2-week window
   +-- scheduling: create run, history, confirmation
   +-- explanation: critical path, bottleneck, utilization, what-if
   +-- kpi: summary and comparison
   |
   +-- application services
   |      |
   |      +-- engine adapter --> CP-SAT / heuristic / validator
   |      +-- repositories --> SQLAlchemy --> SQLite
   |
   +-- local process pool for solve jobs
```

Đề xuất cấu trúc source:

```text
backend/
  app/
    api/
    core/
    db/
    modules/{master_data,planning,scheduling,explanation,kpi}/
    engine/{contracts,adapter,explanation}/
  migrations/
  tests/{unit,integration,contract}/
frontend/
  app/{master,planning,scheduling,runs,compare}/
  components/{forms,gantt,kpi,run-status}/
  lib/{api,types,queries}/
  tests/
docker-compose.yml
```

## 4. Hợp đồng dữ liệu phải khóa trước khi code UI

Schema hiện tại trong Technical Spec chưa đủ để tái tạo và kiểm chứng một lịch. Trước Sprint 1 cần chốt tối thiểu các nhóm sau:

| Nhóm | Dữ liệu bắt buộc |
|---|---|
| Product/route | SKU, thứ tự công đoạn, min lot, processing time theo machine |
| Resource | machine, stage, eligibility, calendar/shift, downtime |
| Setup/mold | changeover theo cặp SKU/family, mold state, max cycles, maintenance duration |
| Demand/inventory | order, release/due/priority, quantity, initial FG inventory, initial semi-finished (BTP) inventory theo (sản phẩm, công đoạn) kèm capacity, running operations tại t0, safety stock |
| Run | loại run, input snapshot/hash, algorithm, seed, time budget, solver version, status, timestamps, error |
| Operation result | lot/order/product/stage/machine, block/start/end, setup, maintenance, shift, sequence |
| Metrics | objective components, tardiness, inventory shortage, utilization, idle, gap/bound, validator result |
| Scenario | base run, event time, rush order hoặc machine downtime, frozen operations, diff result |

Mỗi run phải lưu snapshot đầu vào bất biến. Master data có thể tiếp tục thay đổi nhưng lịch cũ vẫn xem và giải thích lại được đúng theo dữ liệu tại thời điểm chạy.

## 5. Kế hoạch theo sprint

Ước lượng cho một người làm toàn thời gian: 8–10 tuần cho product hoàn chỉnh phục vụ demo; nếu làm bán thời gian nên quy đổi theo khoảng 45–55 ngày công.

| Sprint | Thời lượng | Phạm vi | Đầu ra nghiệm thu |
|---|---:|---|---|
| 0. Khóa contract | 2–3 ngày | Chốt scope P0/P1, schema v1, API conventions, trạng thái run, mapping DB → engine, scenario demo | OpenAPI nháp, ERD cập nhật, backlog có acceptance criteria; xử lý xong mâu thuẫn spec |
| 1. Foundation | 4–5 ngày | Dựng FastAPI, Next.js, SQLAlchemy/Alembic, SQLite, config, CORS, error envelope, Docker Compose, CI cơ bản | `docker compose up` mở được UI và `/health`; migration và test chạy bằng một lệnh |
| 2. Master data | 6–7 ngày | DB schema, seed/import `wheel_factory.json`, CRUD products/routes/machines/shifts/downtime/changeover/molds/orders/inventory; validation tham chiếu chéo | Có thể chuẩn bị toàn bộ input bằng UI/API, không sửa JSON/DB tay; import transaction an toàn và báo lỗi theo field |
| 3. Scheduling vertical slice | 7–8 ngày | Engine adapter, tạo run, process pool, state machine, input snapshot/hash, validator, persistence kết quả, history/detail API | Từ dữ liệu seed tạo được lịch 2 tuần; reload vẫn xem được; run lỗi/timeout không sinh lịch giả; kết quả khớp CLI trong tolerance đã chốt |
| 4. Gantt và KPI | 5–6 ngày | Trang tạo run, progress/polling, Gantt theo máy/công đoạn, filter/zoom, operation drawer, KPI/tồn kho/utilization, cảnh báo FEASIBLE/timeout | Demo được luồng nhập → solve → Gantt; mọi KPI tính ở backend và có test, UI không tự suy diễn nghiệp vụ |
| 5. Aggregate planning | 4–5 ngày | Tổng hợp tháng/quý, capacity check, tồn kho dự kiến, chọn cửa sổ 2 tuần, tạo detailed-run từ plan snapshot | Plan truy vết được tới orders/inventory và detailed run; cảnh báo thiếu công suất/dữ liệu |
| 6. Explanation | 5–6 ngày | Critical path, bottleneck, late-order trace, utilization breakdown; panel “Vì sao?” | Click operation/order/machine trả lời bằng dữ liệu run đã lưu, không solve lại; có evidence chain và test trên golden run |
| 7. What-if/re-scheduling | 7–8 ngày | Đơn gấp, máy hỏng, event-time snapshot, freeze quá khứ/WIP, solve lại, before/after diff | Hai kịch bản bắt buộc đều chạy được; quá khứ không đổi; validator pass; diff nêu thay đổi start/machine/tardiness/utilization |
| 8. Hardening và bàn giao | 5–7 ngày | E2E, performance, backup/restore demo DB, accessibility cơ bản, logging, scripted demo, tài liệu chạy và xử lý lỗi | Fresh clone chạy được; test suite xanh; có 2 scenario demo; không có lỗi blocker/critical |

## 6. Thứ tự ưu tiên tính năng

### P0 — product usable

- Foundation và Docker local.
- Master data + import dữ liệu mẫu.
- Detailed scheduling, validator, run history.
- Gantt, KPI, trạng thái solver và lỗi rõ ràng.
- Aggregate view đủ tạo input cho cửa sổ 2 tuần.

### P1 — giá trị chính của đồ án

- Critical path, bottleneck, utilization explanation.
- Đơn gấp và máy hỏng, re-scheduling và before/after diff.
- Baseline FIFO/EDD/SPT trong cùng contract để đối chứng.
- Audit metadata phục vụ báo cáo thực nghiệm.

### P2 — chỉ làm khi còn thời gian

- Sensitivity solve nhiều kịch bản.
- Chính sách lô và lượt dự trữ tùy chọn đầy đủ (thành phẩm và bán thành phẩm).
- PostgreSQL profile, worker queue riêng, authentication/RBAC.
- Export PDF/Excel nâng cao, kéo-thả Gantt, chatbot.

Nếu thiếu thời gian, không cắt validator, input snapshot, run history, CRUD dữ liệu chủ hoặc hai kịch bản gián đoạn. Cắt P2 trước.

## 7. API tối thiểu

```text
GET/POST/PATCH/DELETE /api/v1/{products,machines,shifts,downtimes,molds,orders}
GET/PUT                 /api/v1/changeovers
GET/POST                /api/v1/inventory-snapshots
POST                    /api/v1/imports/wheel-factory

POST                    /api/v1/plans
GET                     /api/v1/plans/{id}

POST                    /api/v1/schedule-runs
GET                     /api/v1/schedule-runs
GET                     /api/v1/schedule-runs/{id}
GET                     /api/v1/schedule-runs/{id}/operations
GET                     /api/v1/schedule-runs/{id}/metrics
POST                    /api/v1/schedule-runs/{id}/confirm

GET                     /api/v1/schedule-runs/{id}/explanations/critical-path
GET                     /api/v1/schedule-runs/{id}/explanations/bottleneck
GET                     /api/v1/schedule-runs/{id}/explanations/utilization
POST                    /api/v1/schedule-runs/{id}/scenarios
GET                     /api/v1/scenarios/{id}/comparison
```

`POST /schedule-runs` và `POST /scenarios` trả `202 Accepted` cùng id để UI poll. OpenAPI là nguồn sinh TypeScript types/client, tránh duy trì hai bộ type thủ công.

## 8. Chiến lược test và cổng chất lượng

| Lớp test | Nội dung |
|---|---|
| Unit | Domain validation, mapping DB → engine contract, KPI, critical path, run state transitions |
| Solver contract | Giữ toàn bộ test hiện có; golden tiny instance; cùng input/hash cho kết quả hợp lệ và objective được evaluator xác nhận |
| Repository/API integration | Migration trên DB rỗng, CRUD và FK, import rollback, create/run/read history, lỗi dữ liệu và timeout |
| Frontend component | Form validation, trạng thái loading/error/empty, mapping operation → Gantt, KPI rendering |
| E2E | Seed → edit order → aggregate → run → Gantt → explanation → rush order/machine failure → compare |
| Non-functional | 30 giây demo budget, 120 giây research budget; không khóa UI; reload không mất run; artifact tái lập được |

Cổng merge cho mọi sprint: formatter/linter/type-check pass, test mới cho logic mới, migration có đường upgrade từ DB rỗng, API schema không thay đổi âm thầm, không ghi đè artifact nghiên cứu cũ.

## 9. Definition of Done cấp product

- 100% lịch được cho phép sử dụng đều qua validator độc lập; trạng thái UNKNOWN/INFEASIBLE/INVALID không hiển thị như lịch thành công.
- Dữ liệu demo có thể nạp lại từ đầu và toàn bộ luồng không cần sửa code hay DB tay.
- Một run lưu đủ input hash/snapshot, cấu hình, seed, solver version, time budget, trạng thái, KPI và operations để tái lập.
- Gantt thể hiện đúng machine, stage, lot/order, setup, maintenance và downtime; KPI khớp evaluator backend.
- Hai luồng gián đoạn có bảng before/after và không thay đổi phần lịch đã đóng băng.
- Fresh clone chạy được bằng tài liệu README và Docker Compose; test unit/integration/E2E bắt buộc đều pass.
- Có kịch bản demo cố định dưới 10 phút và một bộ kết quả thực nghiệm dùng được trong báo cáo.

## 10. Rủi ro chính và cách kiểm soát

| Rủi ro | Kiểm soát |
|---|---|
| Spec hiện tại không đồng nhất về aggregate planning và schema | Sprint 0 khóa version yêu cầu; ghi decision record, không âm thầm chọn một cách hiểu |
| Engine nghiên cứu gắn với JSON/file artifact | Adapter thuần dữ liệu + contract test; không cho router gọi CLI hoặc đọc `results/` |
| Request solve kéo dài/timeout | Job state + process pool + polling; lưu error/timeout; giới hạn một solve đồng thời ở demo |
| Schema kết quả quá ít để explain/validate | Lưu operation-level detail và input snapshot ngay từ đầu; không trì hoãn migration này |
| What-if làm thay đổi lịch quá khứ | Snapshot tại event time, explicit frozen set và regression test |
| UI CRUD chiếm nhiều thời gian | Dùng form/table component chung và generated API types; ưu tiên luồng nghiệp vụ hơn trang trí |
| Kết quả đẹp nhưng không tái lập | Hash, seed, solver metadata, validator và golden scenario là điều kiện bắt buộc của mỗi run |

## 11. Mốc demo

- Cuối Sprint 3: API-only demo — import dữ liệu, chạy solver, đọc lại lịch/KPI.
- Cuối Sprint 4: MVP trực quan — thao tác trên web và xem Gantt/KPI.
- Cuối Sprint 6: demo giá trị quyết định — xem “vì sao”.
- Cuối Sprint 7: feature-complete — đơn gấp/máy hỏng và so sánh lịch.
- Cuối Sprint 8: release candidate phục vụ bảo vệ.

## 12. Việc đầu tiên khi bắt đầu code

1. Lập decision record cho aggregate planning, job execution và schema run result.
2. Viết Pydantic contract v1 từ `wheel_factory.json`; tạo test round-trip và test invalid input.
3. Chốt ERD/migration v1, đặc biệt các trường operation result và run metadata còn thiếu trong Technical Spec.
4. Dựng skeleton backend/frontend/Docker và một endpoint `POST /schedule-runs` dùng seed data.
5. Hoàn thành vertical slice nhỏ nhất trước khi mở rộng CRUD: seed → run → validate → persist → Gantt.
