# Technical Specification — Explainable Scheduling Agent

**Đồ án:** CO5103 — Võ Văn Dũng | **Học kỳ:** HK261 (2026–2027) | **GVHD:** PGS.TS Võ Thị Ngọc Châu
**Trạng thái:** Draft v2.5 — cập nhật theo `report/Report_so_bo_Do_an_CO5103_VoVanDung.md` (báo cáo sơ bộ), dựa trên các prototype đã kiểm chứng (`scheduling_poc*.py`, `production_planning_2weeks.py`, `detailed_day_schedule.py`). **Thay đổi so với v2:** Frontend = Next.js; DB dev = SQLite; Docker 2 service. **v2.1–v2.2:** UI đầy đủ + CRUD master data. **v2.3:** Phân module Master Data / Planning / Scheduling / Explanation. **v2.4:** Làm rõ horizon — **Planning = tháng/quý**, **Scheduling = 2 tuần** (chi tiết). **v2.5:** Bổ sung tài liệu tham khảo gần đây (2020–2025) + benchmark FJSP thứ 3 (Deliktaş et al., 2024) theo phản hồi GVHD sau báo cáo sơ bộ — xem `report/lit_review_draft.md` cho chi tiết nghiên cứu gốc. **v2.6:** Bổ sung tài liệu tham khảo số 12–19, lấp các khoảng trống trích dẫn còn lại (mô hình hoá FJSP, rolling horizon, đường găng/độ nhạy, lập kế hoạch phân cấp, khung XAI cho OR, rà soát tiếng Việt) — xem `report/lit_review_draft_2.md`.

**Giả định khi lập tài liệu này** (chỉnh lại nếu sai): đồ án cá nhân (solo), còn khoảng **12–14 tuần** trong học kỳ, mục tiêu cuối là một ứng dụng demo chạy local (không cần hạ tầng cloud production).

---

## 1. Mục tiêu ứng dụng

**Đề tài:** Xây dựng tác nhân lập lịch sản xuất có khả năng giải thích, ứng dụng trong ngành sản xuất linh kiện — trường hợp nghiên cứu: **sản xuất bánh xe** (dây chuyền đơn giản hoá gồm 2 dòng sản phẩm bánh trước/bánh sau, 4 công đoạn chính: **đúc → gia công CNC → sơn → kiểm tra chất lượng**).

**Bối cảnh:** thay thế cách lập lịch thủ công bằng Excel rời rạc (dữ liệu phân mảnh giữa các bộ phận, mang tính "hộp đen", khó điều chỉnh khi có đơn gấp, phụ thuộc kinh nghiệm cá nhân) bằng một **ứng dụng web nội bộ** cho quản đốc/ban lãnh đạo.

Đóng gói 2 tầng lập lịch đã kiểm chứng (**Production Planning** theo tháng/quý → **Production Scheduling** chi tiết horizon 2 tuần) cùng lớp giải thích thành luồng: nhập đơn hàng + tồn kho → xem kế hoạch sản xuất → hỏi "vì sao" → giả lập tình huống (đơn gấp, máy hỏng). Kiến trúc phân tầng này không phải lựa chọn tuỳ ý — đây là mô hình **hierarchical production planning** kinh điển trong OR (quyết định tầng tổng hợp ràng buộc đầu vào cho quyết định chi tiết hơn), do Hax & Meal (1975, tài liệu tham khảo số 16) đặt nền móng từ 50 năm trước.

Tác nhân cần đạt 4 khả năng (theo phát biểu bài toán trong báo cáo sơ bộ):

1. Tự động sinh lịch sản xuất tối ưu hoặc gần tối ưu dựa trên đơn hàng và ràng buộc thực tế của nhà máy.
2. Giải thích được lý do đằng sau mỗi quyết định lập lịch (không chỉ đưa kết quả cuối) để ban lãnh đạo giám sát, tin tưởng và can thiệp khi cần.
3. Phản ứng linh hoạt với sự kiện gián đoạn ngoài kế hoạch (đơn hàng gấp, máy hỏng) bằng cách giải lại lịch và so sánh với lịch gốc.
4. Tối đa hoá hiệu suất sử dụng máy trong mỗi khung ca đã kích hoạt, giảm lãng phí nhân công và năng lượng.

Không mục tiêu: multi-tenant, scale lớn, real-time streaming — đây là công cụ hỗ trợ quyết định cho 1 nhà máy, chạy theo phiên (batch), không cần kiến trúc phân tán.

### 1.1. Yêu cầu bao phủ UI

**Ràng buộc bắt buộc:** UI phải cover đầy đủ mọi tính năng nằm trong phạm vi bài toán (mục 1.3 của `report/Report_so_bo_Do_an_CO5103_VoVanDung.md`) — không chỉ các màn hình "trình diễn" (Gantt, giải thích) mà cả toàn bộ màn hình quản trị dữ liệu chủ cần thiết để vận hành hệ thống mà không cần sửa code/DB tay. Bảng dưới đây là nguồn tham chiếu duy nhất để kiểm tra thiếu sót — mỗi hạng mục trong phạm vi báo cáo phải có ít nhất 1 màn hình UI tương ứng trước khi coi là "hoàn thành":

| Hạng mục trong phạm vi (báo cáo mục 1.3) | Màn hình UI bắt buộc | Trạng thái trong roadmap (mục 8) |
|---|---|---|
| Danh mục máy + khả năng xử lý theo sản phẩm | Quản lý máy (CRUD `machines` + `machine_eligibility`) | **Đã đưa vào tuần 5–6** |
| Danh mục sản phẩm + thời gian xử lý theo công đoạn/sản phẩm/máy | Quản lý sản phẩm & thời gian xử lý | **Đã đưa vào tuần 5–6** |
| Ma trận thời gian chuyển đổi giữa các loại sản phẩm | Quản lý ma trận chuyển đổi (`changeover_matrix`) | **Đã đưa vào tuần 5–6** |
| Quy mô lô tối thiểu theo công đoạn/sản phẩm | Phần của màn hình sản phẩm ở trên | **Đã đưa vào tuần 5–6** |
| Danh mục khuôn (gắn máy/sản phẩm, tuổi thọ, chu kỳ bảo trì) | Quản lý khuôn (CRUD `molds`) | **Đã đưa vào tuần 5–6** |
| Ca làm việc + định mức chi phí nhân công theo ca | Quản lý ca làm việc (CRUD `shifts`) | **Đã đưa vào tuần 5–6** |
| Đơn hàng (mã sản phẩm, số lượng, hạn giao) | Form nhập đơn hàng | Đã có — tuần 5–6 |
| Tồn kho đầu kỳ + ngưỡng an toàn theo sản phẩm | Form nhập tồn kho | Đã có — tuần 5–6 |
| Lập kế hoạch sản xuất theo **tháng / quý** (aggregate) | Màn hình kế hoạch tổng hợp (aggregate) | Đã có — tuần 5–6 |
| Lập lịch chi tiết horizon **2 tuần** (đúc→CNC→sơn→QC) | Gantt tầng 2 (detailed) | Đã có — tuần 7 |
| Giải thích quyết định (đường găng, độ nhạy, hiệu suất máy) | Panel "Vì sao?" | Đã có — tuần 8 |
| Phản ứng với đơn hàng gấp chen ngang | Form counterfactual — kịch bản đơn gấp | Đã có — tuần 9 |
| Phản ứng với **máy hỏng** (sự kiện gián đoạn thứ 2 nêu ở mục 1.2 báo cáo) | Form counterfactual — kịch bản máy hỏng (chọn máy + khung giờ ngưng hoạt động) | **Đã đưa vào tuần 9** |
| Tối đa hoá hiệu suất sử dụng máy khi đã bật | Báo cáo hiệu suất máy (`/explain/utilization`) + KPI dashboard | Đã có — tuần 8 và tuần 6 |

Bất kỳ màn hình nào ở trạng thái "Đã có" nhưng chưa thực sự implement khi đến hạn tuần tương ứng đều tính là **chưa hoàn thành tuần đó** — không được bỏ qua để chuyển sang việc khác.

---

## 2. Mô hình hoá bài toán

Vì chỉ một tập con máy được phép xử lý mỗi loại sản phẩm, bài toán được mô hình hoá dưới dạng **Flexible Job-Shop Scheduling Problem (FJSP)** — theo phân loại của bài tổng quan FJSP toàn diện nhất hiện có (Dauzère-Pérès, Ding, Shen & Tamssaouet, 2024, tài liệu tham khảo số 12) — với các ràng buộc bổ sung:

| Ràng buộc | Mô tả |
|---|---|
| Trình tự công đoạn | Công đoạn sau chỉ bắt đầu khi công đoạn trước hoàn thành (đúc → CNC → sơn → kiểm tra chất lượng) |
| Giới hạn công suất máy | Một máy chỉ xử lý một công đoạn tại một thời điểm |
| Khả năng xử lý theo máy | Chỉ một tập con máy được phép xử lý một loại sản phẩm nhất định |
| Thời gian chuyển đổi phụ thuộc trình tự | Thời gian chuyển đổi phụ thuộc cặp loại sản phẩm liền kề (A↔B) |
| Quy mô lô tối thiểu | Một số công đoạn không hiệu quả nếu chạy dưới ngưỡng số lượng nhất định |
| Chu kỳ bảo trì khuôn | Khuôn có tuổi thọ sử dụng (số lần đúc tối đa), sau N lần đúc phải nghỉ bảo trì |
| Hạn giao hàng | Mỗi đơn hàng có hạn giao hàng, vi phạm bị phạt (trễ hạn) |
| Tồn kho an toàn | Sản lượng tích luỹ đến cuối mỗi giai đoạn phải đủ bù ngưỡng tồn kho an toàn theo từng loại sản phẩm |
| Hiệu suất sử dụng máy | Khi máy đã bật (mở ca), phải tối thiểu hoá thời gian nhàn rỗi giữa các công đoạn |

**Hàm mục tiêu** (đa mục tiêu có trọng số): tối thiểu hoá tổng có trọng số của makespan, độ trễ giao hàng, thời gian chuyển đổi giữa các loại sản phẩm, thời gian máy nhàn rỗi, và mức thiếu hụt so với ngưỡng tồn kho an toàn.

### 2.1. Thuật toán: CP-SAT (Google OR-Tools)

- Mỗi công đoạn = 1 biến khoảng thời gian (start, duration, end); ràng buộc không chồng lấn đảm bảo máy không xử lý 2 công đoạn cùng lúc.
- Lời giải có thể chứng minh tối ưu (hoặc biết khoảng cách với lời giải tối ưu) → dễ đánh giá, so sánh trong báo cáo.
- CP-SAT không có "giá trị đối ngẫu" như LP, nhưng có thể suy ra ràng buộc nào đang giới hạn lời giải bằng cách nới lỏng từng ràng buộc rồi giải lại và so sánh mức cải thiện mục tiêu → nguyên liệu cho phân tích độ nhạy (mục 2.3).
- Hạn chế: với bài toán động (đơn gấp chen ngang), giải lại từ đầu có thể tốn thời gian nếu quy mô lớn → cần chiến lược lập kế hoạch cuốn chiếu hoặc khởi tạo nóng (warm start) từ lời giải trước — hướng cụ thể: dùng mô hình học máy để quyết định biến nào không cần giải lại giữa các chu kỳ rolling-horizon (Li, Ouyang, Ma & Wu, 2025, tài liệu tham khảo số 13), báo cáo tăng tốc tới 54% cho FJSP horizon dài.

### 2.2. Ràng buộc hiệu suất sử dụng máy

Yêu cầu nghiệp vụ: một khi máy đã bật (mở ca, có nhân công trực), phải tận dụng tối đa thời gian đó bằng công việc thực.

1. Số hạng phạt thời gian nhàn rỗi trong hàm mục tiêu: đo tổng khoảng trống giữa các công đoạn liên tiếp trên mỗi máy, trong khung thời gian máy đã bật.
2. Biến quyết định nhị phân "có nên bật máy trong ca này không?" — ràng buộc **mềm**: nếu bật mà không đạt hiệu suất mục tiêu thì bị phạt trong hàm mục tiêu (không bắt buộc cứng, để tránh bài toán bất khả thi khi thiếu đơn hàng lấp ca). Nếu không đủ việc, bộ giải có thể chọn không bật máy đó.
3. Liên kết với quy mô lô tối thiểu: nếu một máy sắp bật cho việc nhỏ lẻ không lấp đầy ca, bộ giải nên ưu tiên dồn/hoãn công việc để gộp lô (miễn không vi phạm hạn giao hàng) — đánh đổi giữa hiệu suất máy và độ trễ giao hàng, thể hiện qua trọng số trong hàm mục tiêu.

### 2.3. Lớp giải thích

| Loại giải thích | Cách thực hiện |
|---|---|
| Phân tích độ nhạy | Nới lỏng từng ràng buộc, đo mức cải thiện tổng thời gian hoàn thành → xác định điểm nghẽn chính. Phương pháp gần trùng khớp nhất tìm được trong tài liệu: nới lỏng ràng buộc để xác định điểm nghẽn trong bài toán lập lịch có ràng buộc tài nguyên (Nedbálek & Novák, 2025 — ICORES, tài liệu tham khảo số 15) |
| Đường găng (critical path) | Xác định chuỗi công đoạn quyết định tổng thời gian hoàn thành → trả lời "vì sao công việc X trễ". Phương pháp gốc: Kelley & Walker (1959), tài liệu tham khảo số 14 |
| Phản thực (counterfactual) | "Nếu chèn đơn gấp Y, công việc nào bị đẩy lùi và trễ bao lâu" — thêm ràng buộc/đơn hàng giả định rồi giải lại, so sánh với lịch gốc |
| Báo cáo hiệu suất sử dụng máy | Giải thích vì sao một máy đạt/không đạt hiệu suất mục tiêu trong ca, gợi ý gộp ca hoặc điều thêm đơn hàng |

### 2.4. Kiểm chứng

So sánh kết quả của tác nhân với:

- **(a) Lịch thủ công mô phỏng** theo quy tắc điều độ kinh nghiệm thường dùng trong ngành: FIFO, EDD (ưu tiên hạn giao gần nhất), SPT (ưu tiên thời gian xử lý ngắn nhất).
- **(b) Bộ dữ liệu chuẩn công khai** cho bài toán lập lịch phân xưởng (Taillard, Lawrence — OR-Library) để kiểm chứng riêng phần lõi thuật toán (tối ưu makespan), tránh sai lệch do dùng dữ liệu tổng hợp tự sinh. Lưu ý các bộ chuẩn này **không** có ràng buộc đặc thù của đề tài (thời gian chuyển đổi, lô tối thiểu, bảo trì, hiệu suất máy) nên chỉ dùng để đối chứng phần lõi, không thay thế kiểm thử trên dữ liệu tổng hợp riêng.
- **(c) Bộ benchmark FJSP công khai thứ 3** (Deliktaş, Özcan, Üstün & Torkul, 2024 — *Data in Brief*, 43 instance, xem tài liệu tham khảo số 10) — có sẵn **setup time phụ thuộc trình tự theo họ sản phẩm**, đúng loại ràng buộc mà (b) không có. Dùng để đối chứng riêng phần ràng buộc "ma trận chuyển đổi" của đề tài.

---

## 3. Kiến trúc tổng thể

```
┌─────────────────┐      REST/JSON       ┌──────────────────────┐
│   Frontend Web   │ ───────────────────▶ │     Backend API      │
│  (Next.js App    │ ◀─────────────────── │      (FastAPI)       │
│   Router + TS)   │                       └──────────┬────────────┘
└─────────────────┘                                    │
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
                                       │ Database (SQLite dev /      │
                                       │ PostgreSQL production)      │
                                       │ orders, machines, inventory,│
                                       │ schedule runs, audit log    │
                                       └─────────────────────────────┘
```

**Số service = 2 service ứng dụng + 1 datastore** (MVP):
1. **Frontend** — Next.js (App Router, TypeScript), không có logic nghiệp vụ nặng, chỉ gọi API và hiển thị.
2. **Backend API** — 1 process FastAPI duy nhất, chứa các **module Python nội bộ**, không tách microservice — vì solve time (~1–30s) đủ ngắn để chạy đồng bộ (synchronous) trong 1 request, không cần queue/worker riêng.
3. **Database** — SQLite file cho dev (không cần server), PostgreSQL cho production nếu cần. Lưu cấu hình (đơn hàng, máy, tồn kho, khuôn, ca làm việc) và lịch sử các lần chạy (audit trail cho lớp giải thích).

### 3.1. Phân module nghiệp vụ (bắt buộc)

Hệ thống **phải** được chia rõ thành các module độc lập về trách nhiệm (không gộp logic vào một file lớn). Mỗi module có thư mục/package riêng trong backend và (khi cần) nhóm trang UI riêng trên frontend:

| Module | Trách nhiệm | Backend path (gợi ý) | Frontend (gợi ý) |
|---|---|---|---|
| **Master Data** | CRUD dữ liệu chủ: máy, eligibility, sản phẩm & thời gian xử lý, ma trận chuyển đổi, khuôn, ca làm việc, đơn hàng, tồn kho | `app/modules/master_data/` (models, schemas, routers, services) | `/master/*` (máy, sản phẩm, changeover, khuôn, ca, orders, inventory) |
| **Production Planning** | Tầng 1 — Aggregate Planning theo **tháng / quý** (sản lượng, ca, tồn kho an toàn) | `app/modules/planning/` + `app/engine/aggregate_planning.py` | `/planning/aggregate` |
| **Production Scheduling** | Tầng 2 — Detailed Scheduling horizon **2 tuần** (Gantt đúc→CNC→sơn→QC theo ngày/ca) | `app/modules/scheduling/` + `app/engine/detailed_scheduling.py` | `/scheduling/detailed` + Gantt |
| **Explanation** | Critical path, bottleneck, sensitivity, utilization, counterfactual | `app/modules/explanation/` + `app/engine/explanation.py` | Panel "Vì sao?", form what-if |
| **KPI / Report** | Tóm tắt tardiness, holding, utilization | `app/modules/kpi/` | Dashboard KPI |

**Quy tắc:**
- Engine CP-SAT chỉ nằm trong `app/engine/` và được gọi bởi service layer của module tương ứng — **không** import engine trực tiếp từ router.
- Master Data không chứa logic lập lịch; Planning/Scheduling chỉ đọc master data qua service, không ghi đè bảng master.
- Explanation đọc `schedule_run_results` (đã lưu) trước; chỉ solve lại khi counterfactual / sensitivity.

> **Stretch goal (chỉ làm nếu dư thời gian ở tuần 10+):** tách engine solve thành **service thứ 3** (worker chạy bằng Celery + Redis) nếu cần chạy nhiều kịch bản what-if song song hoặc solve time vượt quá ngưỡng chấp nhận được cho 1 request HTTP (>30s). Không làm ngay từ đầu — thêm phức tạp hạ tầng không cần thiết cho MVP.

---

## 4. Tech stack & lý do chọn

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Optimization engine | **Python + OR-Tools CP-SAT** | Đã viết và kiểm chứng (5 file prototype), không viết lại |
| Backend framework | **FastAPI** | Cùng ngôn ngữ với engine (không cần serialize qua ranh giới ngôn ngữ), tự sinh OpenAPI docs, async-ready nếu sau này cần |
| Database | **SQLite (dev)** / PostgreSQL (prod) — cùng SQLAlchemy model | SQLite file cho dev: không cần setup DB server, chạy nhanh. PostgreSQL đủ mạnh cho quan hệ đơn hàng/tồn kho/khuôn/lịch sử khi cần |
| ORM | **SQLAlchemy 2.x + Alembic** | Migration có version, chuẩn trong hệ sinh thái Python |
| Frontend framework | **Next.js (App Router) + TypeScript** | Yêu cầu của chủ đồ án. App Router + TypeScript cho routing rõ ràng, SSR/SSG khi cần, DX tốt hơn Vite thuần cho demo local. Vẫn dùng React dưới hood nên tương thích Recharts, TanStack Query, Gantt libs |
| Styling | **TailwindCSS** | Tốc độ dựng UI nhanh, không cần thiết kế design system riêng |
| Gantt/timeline chart | **frappe-gantt** hoặc **vis-timeline** | Thư viện JS nhẹ, đủ cho Gantt kéo/zoom, không cần D3 tự viết từ đầu |
| Biểu đồ KPI/tồn kho | **Recharts** | Đủ cho line/bar chart tồn kho theo ngày, tích hợp React/Next.js tốt |
| Data fetching | **TanStack Query (React Query)** | Cache + refetch khi re-plan, tránh tự quản lý loading state thủ công |
| Container hoá | **Docker Compose** (2 container: frontend, backend — SQLite file mount) | Demo local nhất quán, dễ chạy trên máy GVHD nếu cần. Không cần container DB riêng khi dùng SQLite |

**Không dùng** (và lý do): Celery/Redis (chưa cần ở MVP), Kubernetes (quá mức cần thiết), microservices nhiều service (thêm độ phức tạp vận hành không tương xứng giá trị cho 1 đồ án cá nhân).

---

## 5. Mapping code hiện có → module backend

| File prototype hiện tại | Engine (CP-SAT) | Module bao quanh (service + router) |
|---|---|---|
| `scheduling_poc_multi.py` + `detailed_day_schedule.py` | `app/engine/detailed_scheduling.py` | **Production Scheduling** — `app/modules/scheduling/` |
| `production_planning_2weeks.py` (prototype; nghiệp vụ thực tế = planning **tháng/quý**) | `app/engine/aggregate_planning.py` | **Production Planning** — `app/modules/planning/` |
| Các hàm `trace_critical_path`, `explain_machine_gaps`, `bottleneck_summary`, `explain_rush_order` (trong `scheduling_poc_inventory.py`) | `app/engine/explanation.py` (+ `sensitivity_analysis`) | **Explanation** — `app/modules/explanation/` |
| Dữ liệu hard-code (`JOBS`, `MACHINES`, `ELIGIBLE`, `ORDERS`...) | — | **Master Data** — `app/modules/master_data/` (bảng DB + CRUD API + UI) |

Việc này **không viết lại thuật toán** — chỉ tách phần dữ liệu hard-code ra khỏi logic solve, và bọc mỗi hàm `build_and_solve()` thành 1 hàm service trong module tương ứng, nhận input từ DB, trả JSON cho API. Router chỉ gọi service, service gọi engine.

---

## 6. Data model (bảng chính)

| Bảng | Trường chính | Ghi chú |
|---|---|---|
| `orders` | id, type, qty, due_day, created_at | Đơn hàng khách |
| `machines` | id, name, stage (cast/cnc/paint/qc), daily_capacity | Danh sách máy |
| `machine_eligibility` | machine_id, product_type | Machine eligibility (n-n) |
| `changeover_matrix` | type_a, type_b, setup_time | Ma trận đổi khuôn/đổi loại sản phẩm |
| `molds` | id, machine_id, product_type, max_cycles, used_cycles, maintenance_cycle_days | Khuôn: tuổi thọ sử dụng + chu kỳ bảo trì (ràng buộc mục 2, hàng "Chu kỳ bảo trì khuôn") |
| `shifts` | id, start_time, end_time, labor_cost | Ca làm việc + định mức chi phí nhân công theo ca (dùng cho ràng buộc hiệu suất sử dụng máy, mục 2.2) |
| `inventory_snapshot` | product_type, wip_qty, fg_qty, wip_min, fg_min, snapshot_date | Tồn kho tại 1 thời điểm |
| `schedule_runs` | id, run_type (aggregate/detailed), input_hash, created_at | Audit trail — mỗi lần bấm "Lập lịch" |
| `schedule_run_results` | run_id, day, machine_id, job_name, start, end, shift_id | Kết quả chi tiết, dùng để vẽ Gantt và trace lại giải thích sau này mà không cần solve lại |

`schedule_run_results` lưu lại đầy đủ là điểm quan trọng: **lớp giải thích đọc từ đây, không solve lại** → trả lời "vì sao" tức thời, không tốn thời gian CP-SAT lần 2 (trừ counterfactual và phân tích độ nhạy, vốn cần solve lại theo định nghĩa).

---

## 7. API chính (REST)

```
POST   /orders                        Tạo đơn hàng
GET    /orders                        Danh sách đơn hàng
POST   /machines                      Khai báo máy + eligibility
POST   /molds                         Khai báo khuôn (máy, sản phẩm, tuổi thọ, chu kỳ bảo trì)
POST   /shifts                        Khai báo ca làm việc + chi phí nhân công
POST   /inventory/snapshot            Nhập tồn kho đầu kỳ

POST   /planning/aggregate/run        Chạy Tầng 1 (tháng/quý) -> lưu schedule_run, trả plan sản lượng theo kỳ
GET    /planning/aggregate/{run_id}   Lấy lại kết quả 1 lần chạy

POST   /scheduling/detailed/run       Chạy Tầng 2 horizon 2 tuần / 1 ngày (đọc từ 1 aggregate run)
GET    /scheduling/detailed/{run_id}  Lấy lại Gantt chi tiết

GET    /explain/critical-path         params: run_id, job -> chuỗi nguyên nhân
GET    /explain/bottleneck            params: run_id -> máy nút thắt, đơn sát hạn
GET    /explain/sensitivity           params: run_id -> mức cải thiện khi nới lỏng từng ràng buộc
GET    /explain/utilization           params: run_id, machine_id -> vì sao máy đạt/không đạt hiệu suất mục tiêu
POST   /explain/counterfactual        body: run_id, job, new_due -> solve lại, trả diff

GET    /kpi/summary                   params: run_id -> tardiness cost, holding cost, utilization
```

---

## 8. Lộ trình thực hiện (giả định 13 tuần còn lại)

| Tuần | Việc chính | Đầu ra |
|---|---|---|
| 1 | Chốt data model, dựng repo skeleton (FastAPI + Next.js App Router + Docker Compose rỗng, SQLite) | Repo chạy "Hello World" end-to-end |
| 2–3 | Bọc `aggregate_planning.py` + `detailed_scheduling.py` thành service, nối DB (thay hard-code bằng query) | API `/planning/aggregate/run` trả JSON đúng như bản CLI |
| 4 | Bọc `explanation.py`, endpoint `/explain/*` (bao gồm sensitivity, utilization) + API CRUD master data (machines, products, changeover, molds, shifts) | Trace critical path + độ nhạy qua API; CRUD master data sẵn sàng cho UI |
| 5–6 | **Frontend đầy đủ dữ liệu chủ + nghiệp vụ:** layout, CRUD máy / sản phẩm & thời gian xử lý / ma trận chuyển đổi / khuôn / ca làm việc, form đơn hàng + tồn kho, màn hình kế hoạch aggregate (bảng) | Hệ thống vận hành được end-to-end **không cần sửa code/DB tay** — đúng yêu cầu mục 1.1 |
| 7 | Frontend: Gantt chart tương tác (frappe-gantt) cho cả 2 tầng | Xem lịch trực quan, zoom/filter được |
| 8 | Frontend: panel "Vì sao?" + cảnh báo bottleneck + báo cáo hiệu suất máy + KPI dashboard | Click ô lịch → hiện giải thích |
| 9 | Frontend: form giả lập đơn gấp **và máy hỏng** (counterfactual) + hiển thị diff | Demo được cả 2 kịch bản gián đoạn (đơn gấp + máy hỏng) |
| 10 | Kiểm chứng: so sánh với baseline heuristic (FIFO/EDD/SPT) và chạy lại trên benchmark JSSP công khai (Taillard/Lawrence) | Bảng so sánh đưa vào báo cáo |
| 11 | Viết chương "Mô hình hoá & Kết quả thực nghiệm" của luận văn | Draft chương 3–4 |
| 12 | Polish UI, chuẩn bị 1–2 kịch bản demo cố định cho buổi bảo vệ | Kịch bản demo scripted |
| 13 | Buffer + phản hồi từ GVHD + chỉnh sửa cuối | Bản nộp cuối |

**Ưu tiên khi thiếu thời gian:** cắt Tầng 3 (chatbot, human-in-the-loop kéo-thả) trước; **không cắt** panel "Vì sao?", counterfactual (đơn gấp + máy hỏng), và các màn hình CRUD dữ liệu chủ — đó là phần tạo giá trị học thuật + đáp ứng ràng buộc mục 1.1.

---

## 9. Nguồn dữ liệu

Vì không tiếp cận được dữ liệu thật của nhà máy, đề tài sử dụng dữ liệu tổng hợp theo 3 nguồn tham chiếu:

1. **Ràng buộc nghiệp vụ thực tế** (rút ra từ hiểu biết về quy trình sản xuất bánh xe): số lượng máy theo công đoạn, thời gian chuyển đổi ước lượng, quy mô lô tối thiểu, chu kỳ bảo trì khuôn, tỷ lệ đơn hàng gấp phát sinh — dùng để tham số hoá bộ sinh dữ liệu tổng hợp sao cho phản ánh đúng đặc điểm ngành. Thời gian tác vụ + tiêu thụ năng lượng theo máy được đối chiếu với dữ liệu thực đo tại 1 dây chuyền sản xuất (Mota et al., 2020 — tài liệu tham khảo số 11, Zenodo, MIT license) để tránh tham số hoá hoàn toàn chủ quan.
2. **Bộ dữ liệu chuẩn công khai** cho bài toán lập lịch phân xưởng (Taillard, Lawrence — OR-Library) — dùng để kiểm chứng phần lõi thuật toán và so sánh chất lượng lời giải với nghiên cứu khác trong lĩnh vực.
3. **Bộ benchmark FJSP công khai thứ 3** (Deliktaş et al., 2024 — tài liệu tham khảo số 10) có setup time phụ thuộc trình tự theo họ sản phẩm — bổ sung cho (2) trên đúng ràng buộc mà Taillard/Lawrence không có (xem §2.4).

**Đã kiểm tra thêm** data.gov, data.gov.vn và Kaggle theo phản hồi GVHD: data.gov/data.gov.vn không có dataset cấp máy/công đoạn/đơn hàng phù hợp (chỉ có chỉ số vĩ mô/năng lực sản xuất); vài dataset JSP tổng hợp trên Kaggle được ghi nhận nhưng chưa kiểm chứng đủ để dùng chính thức. Chi tiết quá trình rà soát ở `report/lit_review_draft.md`.

**Đã kiểm tra thêm tài liệu học thuật tiếng Việt** về lập lịch sản xuất/phân xưởng: không tìm thấy công trình tiếng Việt nào cùng bài toán (đa máy, ràng buộc chuyển đổi/bảo trì/hiệu suất máy). Có 1 luận án tiến sĩ cùng trường (Trang, 2021 — tài liệu tham khảo số 19, ĐH Bách Khoa – ĐHQG-HCM) nhưng giải bài toán khác (lập lịch cá nhân, 1 máy) — chỉ dùng làm bằng chứng cho tiền lệ nghiên cứu lập lịch chất lượng quốc tế tại trường, không phải công trình liên quan trực tiếp. Chi tiết ở `report/lit_review_draft_2.md`.

Bộ sinh dữ liệu cần điều chỉnh được tham số (số máy, số công việc, phân phối thời gian xử lý, tần suất đơn gấp) để tạo nhiều kịch bản kiểm thử, đánh giá độ ổn định của tác nhân.

---

## 10. Tiêu chí đánh giá thành công

- Lịch sinh ra hợp lệ về mặt vật lý 100% (không vi phạm tồn kho, công suất máy, trình tự công đoạn) trên mọi kịch bản kiểm thử.
- Hiệu suất sử dụng máy trong các ca đã bật đạt mục tiêu đề ra (ví dụ ≥ 90%), thể hiện cải thiện rõ so với kịch bản không có ràng buộc này.
- Mỗi lịch sinh ra đều có giải thích tương ứng (điểm nghẽn, đường găng, tác động khi giả lập đơn gấp/máy hỏng) mà nhà quản lý đọc hiểu được mà không cần biết CP-SAT là gì.
- Thời gian giải nằm trong ngưỡng chấp nhận được cho 1 phiên làm việc, có cảnh báo rõ khi solver không kịp tìm lời giải tối ưu.
- Chất lượng lời giải trên bộ dữ liệu chuẩn công khai không thua kém đáng kể so với kết quả tốt nhất đã công bố cho phần lõi thuật toán.

---

## 11. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| CP-SAT solve chậm khi dữ liệu thật lớn hơn nhiều so với ví dụ minh hoạ | Giới hạn `max_time_in_seconds`, chấp nhận `FEASIBLE` thay vì `OPTIMAL`, cảnh báo rõ trên UI |
| Kết quả CP-SAT không tái lập được giữa các lần chạy (đã gặp ở `scheduling_poc_inventory.py`) | Cố định `random_seed` + `num_search_workers=1` cho các lần chạy dùng để demo/báo cáo |
| Scope UI phình to, hết thời gian cho phần thuật toán/luận văn | Theo đúng thứ tự ưu tiên ở mục 8; không làm Tầng 3 nếu tuần 9 chưa xong Tầng 2 |
| GVHD yêu cầu đổi hướng dữ liệu (dùng dữ liệu thật thay vì synthetic) | Data model đã tách khỏi code (mục 5–6) nên đổi nguồn dữ liệu không cần sửa engine |
| Bài toán động (đơn gấp) giải lại từ đầu quá chậm khi quy mô lớn | Cân nhắc chiến lược lập kế hoạch cuốn chiếu hoặc khởi tạo nóng (warm start) từ lời giải trước (mục 2.1); hướng cụ thể đã có tiền lệ trong tài liệu: Li et al. (2025), tài liệu tham khảo số 13 |
| Bộ benchmark công khai (Taillard/Lawrence) không có ràng buộc đặc thù đề tài | Chỉ dùng để đối chứng phần lõi thuật toán (mục 2.4), không thay thế kiểm thử trên dữ liệu tổng hợp riêng |

---

## Tài liệu tham khảo

1. Taillard, E. (1993). Benchmarks for basic scheduling problems. *European Journal of Operational Research*, 64(2), 278–285.
2. Lawrence, S. (1984). *Resource constrained project scheduling: An experimental investigation of heuristic scheduling techniques*. GSIA, Carnegie Mellon University.
3. Beasley, J. E. (1990). OR-Library: Distributing test problems by electronic mail. *Journal of the Operational Research Society*, 41(11), 1069–1072.
4. Google OR-Tools — CP-SAT Solver. https://developers.google.com/optimization
5. Wang, Y. C., & Chen, T. (2024). Adapted techniques of explainable artificial intelligence for explaining genetic algorithms on the example of job scheduling. *Expert Systems with Applications*, 237, 121369. https://doi.org/10.1016/j.eswa.2023.121369
6. Wang, Y. C., & Chen, T. (2025). *Explainable and Customizable Job Sequencing and Scheduling: Advancing Production Control and Management with XAI*. Springer. https://link.springer.com/book/9783031853739
7. Mehdiyev, N., Majlatow, M., & Fettke, P. (2024). Counterfactual Explanations in the Big Picture: An Approach for Process Prediction-Driven Job-Shop Scheduling Optimization. *Cognitive Computation*. https://doi.org/10.1007/s12559-024-10294-0
8. Cheng, Y., Xie, Z., Xin, Y., Chen, K., & Zarei, R. (2024). Flexible Job Shop Scheduling Method for Optimizing Mold Resource Setup Time. *IEEE Access*, 12, 33486–33503. https://doi.org/10.1109/ACCESS.2024.3372396
9. Lan, L., & Berkhout, J. (2025). PyJobShop: Solving scheduling problems with constraint programming in Python. *arXiv:2502.13483*. https://arxiv.org/abs/2502.13483
10. Deliktaş, D., Özcan, E., Üstün, Ö., & Torkul, O. (2024). A benchmark dataset for multi-objective flexible job shop cell scheduling. *Data in Brief*, 52. https://www.sciencedirect.com/science/article/pii/S2352340923009770 (dataset: https://data.mendeley.com/datasets/rtzby7pv7m/1)
11. Mota, B., Gomes, L., Faria, P., Ramos, C., & Vale, Z. (2020). Production line dataset for task scheduling and energy optimization – Schedule Optimization (v0.1) [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.4106746
12. Dauzère-Pérès, S., Ding, J., Shen, L., & Tamssaouet, K. (2024). The flexible job shop scheduling problem: A review. *European Journal of Operational Research*, 314(2), 409–432. https://doi.org/10.1016/j.ejor.2023.05.017
13. Li, S., Ouyang, W., Ma, Y., & Wu, C. (2025). Learning-Guided Rolling Horizon Optimization for Long-Horizon Flexible Job-Shop Scheduling. *arXiv:2502.15791*. https://arxiv.org/abs/2502.15791
14. Kelley, J. E., & Walker, M. R. (1959). Critical-path planning and scheduling. In *Papers presented at the December 1–3, 1959, eastern joint IRE-AIEE-ACM computer conference (IRE-AIEE-ACM '59, Eastern)*, ACM Press, 160–173. https://doi.org/10.1145/1460299.1460318
15. Nedbálek, L., & Novák, A. (2025). Bottleneck Identification in Resource-Constrained Project Scheduling via Constraint Relaxation. In *Proceedings of the 14th International Conference on Operations Research and Enterprise Systems (ICORES 2025)*. https://arxiv.org/abs/2504.07495
16. Hax, A. C., & Meal, H. C. (1975). Hierarchical integration of production planning and scheduling. In M. A. Geisler (Ed.), *Studies in Management Sciences, Vol. 1: Logistics* (pp. 53–69). North-Holland/American Elsevier.
17. De Bock, K. W., Coussement, K., De Caigny, A., Słowiński, R., Baesens, B., Boute, R. N., Choi, T. M., Delen, D., Kraus, M., Lessmann, S., Maldonado, S., Martens, D., Óskarsdóttir, M., Vairetti, C., Verbeke, W., & Weber, R. (2024). Explainable AI for Operational Research: A defining framework, methods, applications, and a research agenda. *European Journal of Operational Research*, 317(2). https://doi.org/10.1016/j.ejor.2023.09.026
18. Garn, W., & Amirghasemi, M. (2025). Transparency of combinatorial optimisations via machine learning and explainable AI. *Annals of Operations Research*, 354, 427–458. https://doi.org/10.1007/s10479-025-06684-8
19. Trang, H. S. (2021). *Một số phương pháp tiếp cận cho bài toán lập lịch cá nhân* [Luận án Tiến sĩ]. Trường Đại học Bách Khoa – ĐHQG-HCM. https://grad.hcmut.edu.vn/hv/download/LATS/8140009/TOM_TAT_LATS_THSon.pdf

---

*Tài liệu này là bản nháp v2.6 (Next.js + SQLite + UI đầy đủ + phân module + horizon Planning tháng/quý, Scheduling 2 tuần + tài liệu tham khảo & benchmark bổ sung + bổ sung tài liệu nền tảng cho các mục chưa có trích dẫn: FJSP review, rolling horizon, critical path/sensitivity, hierarchical planning, XAI-for-OR, rà soát tiếng Việt), cập nhật lại khi phạm vi thay đổi theo phản hồi của GVHD.*
