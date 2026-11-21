---
type: improvement-plan
status: proposed
updated: 2026-11-13
audience: orchestrator + sub-agents hiện thực
links:
  - report/TECHNICAL_SPEC.md
  - docs/_product/implementation-plan.md
  - docs/_product/factory-periods.md
  - docs/_product/manual-editing.md
  - frontend/DESIGN.md
---

# Kế hoạch cải tiến PlanWise (rà soát 13/11/2026)

Tài liệu này là kết quả rà soát toàn hệ thống (tính năng, UI, UX, design system, hiện thực, roadmap) và chia việc thành các **gói việc (WP)** để giao cho sub-agent. Mỗi WP tự chứa: đọc mục 3 (quy tắc chung) rồi đọc đúng WP của mình là đủ để bắt đầu.

## 1. Hiện trạng đã kiểm chứng

Kiểm tra ngày 13/11/2026 trên `master` (commit `d9d3534`):

| Hạng mục | Kết quả |
|---|---|
| `pytest backend/tests models/tests` | 124 test đạt, 91 giây |
| Frontend `tsc --noEmit`, `eslint .` | Sạch |
| Test frontend (unit / component / E2E) | **Không có file nào**; CI chỉ lint + typecheck + build |
| Chạy thật (backend + Next dev, DB bản sao) | Các trang Hôm nay, Kỳ lập lịch (mọi tab), Sổ đơn hàng, Nhà máy hiển thị đúng ở 1440 px và 420 px, không lỗi console |
| Thực nghiệm trên benchmark công khai | **Chưa có**: `report/evaluation/README.md` ghi "chưa có nội dung"; không file `.py` nào đọc `dataset/taillard-*`, `or-library-raw`, `deliktas-*` |

Điểm mạnh nên giữ nguyên: snapshot + hash + bộ kiểm độc lập cho mọi lần chạy; mô hình Nhà máy / Sổ đơn / Kỳ; chỉnh lịch tay + `cp_repair`; token màu đủ sáng/tối; trạng thái trong URL; song ngữ qua `t(vi, en)`; audit a11y 25/10 đạt 0 vi phạm.

Mốc thời gian (suy ra từ roadmap 13 tuần ở `TECHNICAL_SPEC.md` §8 và báo cáo đầu tiên ngày 18/09): hiện ở khoảng **tuần 9–10**, còn khoảng 4 tuần. Roadmap tuần 10 (kiểm chứng benchmark) chưa bắt đầu; tuần 8 (panel "Vì sao?") mới làm một phần.

## 2. Phát hiện chính

Xếp theo mức ảnh hưởng tới đồ án. Mỗi phát hiện dẫn tới WP ở mục 5.

### 2.1. Tính năng so với đặc tả

| # | Phát hiện | Bằng chứng | WP |
|---|---|---|---|
| F1 | Chưa kiểm chứng trên benchmark công khai (Taillard, Lawrence, Deliktaş) dù là việc 3 của GVHD và tiêu chí thành công §10 | `report/evaluation/` rỗng; `models/` chỉ chạy bộ wheel-factory | A1 |
| F2 | Sản phẩm chưa có pipeline lai đã được thực nghiệm chứng minh tốt nhất (SA → CP-SAT khởi đầu từ lịch SA: 0 đơn trễ, chi phí −52%). `cp_sat_hint` trong sản phẩm lấy hint từ luật điều độ; UI tự báo "Bộ tối ưu chưa tìm được lịch tốt hơn luật điều độ" | `models/common/stage_runs/experiment.py::execute`; `frontend/components/decision/generate-dialog.tsx:28-31`; báo cáo tiến độ 25/10 §1.3 | A2 |
| F3 | Lớp diễn giải (§2.3 spec) mới có phần "vì sao trễ" tính **trong trình duyệt** bằng suy đoán "lượt gần nhất đã xong". Chưa có đường găng, chưa có phân tích độ nhạy, không có endpoint `/explain/*` | `frontend/lib/explain.ts:9-34`; `backend/app/api/routes.py` không có route explanation | A3, A4 |
| F4 | Không có bảng trước/sau giữa kỳ chính và biến thể what-if / bản lập lại lịch. So sánh chỉ hoạt động giữa các phương án cùng `input_hash` | `frontend/components/scenario/workspace.tsx:170-179` nhóm theo `input_hash`; `components/period/*` không có so sánh chéo phiên bản | A4 |
| F5 | Tầng 1 (kế hoạch tháng/quý) không tồn tại cho mô hình 5 công đoạn — luồng chính. Trang `/planning` chỉ chạy schema 4 và nằm trong nhóm Nâng cao; luồng kỳ chỉ có "tải 6–8 tuần" | `backend/app/planning.py:31` (`PLANNING_NOT_AVAILABLE`); `frontend/components/app-shell.tsx:62` ("Kế hoạch tổng hợp (v4)") | A5 |
| F6 | Tiêu chí "hiệu suất máy ≥ 90% trong ca đã bật" chưa đạt và chưa có thí nghiệm bật/tắt mục tiêu này: tốt nhất 73,6% sau 24 giờ | Báo cáo tiến độ 25/10 bảng §1.2 | A2 (phần ablation), quyết định Q3 |

### 2.2. Hiện thực

| # | Phát hiện | Bằng chứng | WP |
|---|---|---|---|
| I1 | Bàn điều độ tải **tới 500 lần chạy của toàn hệ thống** rồi lọc theo kịch bản ở client, lặp lại mỗi 3 giây khi đang giải; sau đó gọi tới 40 request chi tiết kèm toàn bộ operations. API không có bộ lọc `dataset_id`. Quá 500 lần chạy thì phương án cũ biến mất | `workspace.tsx:152-156`, `:179`; `lib/api.ts::listAllScheduleRuns`; `routes.py:733-740` | B1 |
| I2 | Không hủy được lần chạy (enum `CANCELLED` có nhưng không route nào dùng); không có tiến độ khi giải 5–60 phút | `backend/app/models.py:33`; `backend/app/jobs.py` | B1 |
| I3 | Job chạy bằng `ThreadPoolExecutor`: SA/GA là Python thuần nên giữ GIL, API chậm khi đang giải; `shutdown(wait=True)` chặn tắt server tới hết ngân sách (tối đa 900 giây). Kế hoạch gốc ghi process pool | `backend/app/jobs.py:37`, `:166-168` | B1 |
| I4 | Metadata ghi cứng `"workers": 1` dù engine đọc `MNFT_CP_WORKERS` | `backend/app/engine/adapter.py:106`; `stage_runs/experiment.py:54` | A2 |
| I5 | Xếp hạng, chính sách, KPI phái sinh và diễn giải đều tính ở client, không có test. Trái nguyên tắc "UI không tự suy diễn nghiệp vụ" của kế hoạch gốc; nhãn "được đề xuất" không tái lập được từ server | `frontend/lib/decision.ts` (309 dòng), `lib/explain.ts` (190 dòng) | B2 (khoá bằng test), A3 (chuyển diễn giải), Q5 |
| I6 | Type TypeScript viết tay song song với Pydantic (`lib/types.ts` 390 dòng, `lib/factory-types.ts` 209 dòng) | Kế hoạch gốc §7 yêu cầu sinh từ OpenAPI | B3 |
| I7 | Thông báo lỗi API là tiếng Anh và được hiển thị thẳng trong giao diện tiếng Việt, trừ lỗi biên dịch kỳ | `lib/api.ts::apiErrorMessage` trả `error.message` | B3 |
| I8 | File quá lớn, dòng rất dài: `schedule-editor.tsx` 48 KB, `workspace.tsx` 42 KB, `v5-views.tsx` 41 KB, `schedule-gantt.tsx` 34 KB; `api/routes.py` 763 dòng gộp 5 nhóm route | `wc -c` | C4, B3 |
| I9 | Token operator được build vào bundle trình duyệt (`NEXT_PUBLIC_API_TOKEN`) | `compose.yaml`; README đã ghi nhận | Ngoài phạm vi (demo local), xem mục 7 |

### 2.3. UI / UX (quan sát trên màn 1427 × 732)

| # | Phát hiện | WP |
|---|---|---|
| U1 | Tab *Xem lịch & so sánh*: hàng máy đầu tiên của Gantt bắt đầu ở y ≈ 663 px trên màn cao 732 px, lại bị thanh quyết định dính đáy che. Màn đầu tiên **không thấy hàng Gantt nào**. Phía trên là 9 tầng: top bar, tiêu đề, banner quá hạn, tab, chọn phương án, 4 KPI, đổi cách xem, thanh màu/zoom, chú giải 2 dòng | C1 |
| U2 | Tab *Phương án*: thẻ phương án bắt đầu ở y ≈ 587 px; banner cảnh báo + khối chính sách + dòng "khác biệt chính" đẩy nội dung cần quyết định xuống dưới | C1 |
| U3 | Banner "Kỳ đã kết thúc… chưa đóng" lặp lại ở mọi tab, cùng lúc với badge "Quá hạn đóng" cạnh tiêu đề | C1 |
| U4 | Trang Hôm nay và Sổ đơn: ô "Nhiệt luyện 190%" đỏ ở tuần hiện tại do 28 đơn quá hạn dồn vào một tuần; các tuần sau toàn "—". Con số đúng nhưng không nói nguyên nhân và không tách phần quá hạn | C2 |
| U5 | Dữ liệu mẫu neo cứng vào 05–18/10/2026 nên mọi buổi demo sau ngày đó mở ra trạng thái "kỳ đã qua, 28 đơn quá hạn" | D2 |
| U6 | Mobile 420 px dùng được; thanh quyết định dính đáy che nội dung cuối trang ở một số tab (padding đáy chưa tính chiều cao thanh khi thanh xuống 2 dòng) | C1 |
| U7 | Việc tồn từ `DESIGN.md` §6: so sánh 2 Gantt song song, sidebar thu gọn thành icon ở 1024–1280 px, `input type=date` theo locale trình duyệt ở các trang ngoài Nhà máy | C1, C3 |

### 2.4. Design system

| # | Phát hiện | WP |
|---|---|---|
| D1 | `frontend/DESIGN.md` là nhật ký thay đổi, không phải tài liệu chuẩn: đánh số lộn (…5, 6, 7, 8, 9, **6**, 10, 11), mục §4 mô tả token cũ (tiêu đề 24 px, thân 14 px) trái với §8 (22 px, 13 px) | C3 |
| D2 | 49 chỗ dùng cỡ chữ tuỳ ý với 7 giá trị (`text-[10px]`, `[10.5px]`, `[11px]`, `[12.5px]`, `[13px]`, `[13.5px]`, `[15px]`) ngoài thang chữ của `@theme` | C3 |
| D3 | Khoá localStorage có 4 kiểu tiền tố: `schedule-os:*`, `planwise:*`, `planwise-locale`, `schedule-run-filters` | C3 |
| D4 | Ba bộ "field/shared" song song: `components/factory/fields.tsx`, `components/master-data/shared.tsx`, `components/period/shared.tsx` | C3 |
| D5 | Màu: tốt. Chỉ 3 mã hex ngoài `globals.css`, đều có lý do (theme-color, CSS in ấn) | — |

### 2.5. Tài liệu và roadmap

| # | Phát hiện | WP |
|---|---|---|
| R1 | `docs/_product/implementation-plan.md` dừng ở 21/09: ghi "chưa có source application", explanation/what-if chưa làm, kéo-thả là ngoài phạm vi — đều đã sai | D1 |
| R2 | `README.md` còn câu "Explanation sẽ được bổ sung"; `CLAUDE.md` mô tả 4 công đoạn trong khi luồng chính là 5 công đoạn | D1 |
| R3 | `TECHNICAL_SPEC.md` (nguồn sự thật) lệch với sản phẩm: 4 công đoạn, `frappe-gantt`, cấu trúc `app/modules/*`, danh sách API §7, bảng §1.1 | D1 + quyết định Q1, Q2 |
| R4 | SRS `docs/production-scheduling/srs/*` còn `status: draft`, cập nhật 21/09; `report/meeting-notes/` rỗng | D1 |

## 3. Quy tắc chung cho mọi sub-agent

1. **Đọc trước**: `CLAUDE.md` (gốc), WP của mình, và với việc frontend: `frontend/AGENTS.md` (Next.js 16 khác bản quen thuộc — đọc tài liệu trong `frontend/node_modules/next/dist/docs/` trước khi dùng API của Next) cùng `frontend/DESIGN.md`.
2. **Không đụng**: `report/` (trừ khi WP ghi rõ), `models/input/` (backend tham chiếu cứng), `models/runs/v1|v2` đã lưu (chỉ thêm đợt mới), `research/`, `data/mnft.db` (muốn chạy thử thì chép sang thư mục tạm và đặt `MNFT_DATABASE_URL`).
3. **Bất biến của hệ thống**:
   - Lịch chỉ được lưu `SUCCEEDED` sau khi qua `evaluate.validate`; không thêm đường tắt.
   - Lần chạy cũ bất biến; thay đổi sinh lần chạy mới.
   - Thay đổi schema DB = một file Alembic mới trong `backend/migrations/versions/`, chạy được từ DB rỗng.
   - Thao tác ghi: hỗ trợ `Idempotency-Key` nếu tạo job, ghi sự kiện audit, lỗi có mã ổn định qua `ApplicationError`.
   - Tính năng mới chỉ cần chạy trên **schema 5**; schema 4 đóng băng (xem Q4) nhưng test hiện có vẫn phải đạt.
4. **Frontend**: mọi chuỗi qua `t(vi, en)` / `tr(vi, en)`; chỉ dùng token trong `app/globals.css`, không thêm mã hex; trạng thái điều hướng (tab, bản ghi, bộ lọc) nằm trong URL; đủ trạng thái tải / rỗng / lỗi (`components/ui-states.tsx`, `blocks.tsx`); mọi phần tử tương tác có focus ring và nhãn trợ năng.
5. **Kiểm tra trước khi báo xong** (báo đúng kết quả, kể cả khi trượt):
   ```powershell
   python -m pytest backend/tests models/tests -q -p no:cacheprovider --basetemp=$env:TEMP\mnft-pytest
   cd frontend; npm.cmd run lint; npm.cmd run typecheck; npm.cmd run build
   ```
   (`-p no:cacheprovider --basetemp` là cần thiết trên máy này: `backend/.pytest_cache` bị từ chối quyền ghi.) Sau khi chạy `npm run dev`, hoàn tác thay đổi tự sinh ở `frontend/next-env.d.ts`.
6. **Phạm vi file**: chỉ sửa file trong mục "Phạm vi" của WP. Cần sửa file ngoài phạm vi thì dừng và báo orchestrator, vì WP khác có thể đang giữ file đó (xem bảng mục 6).
7. **Không commit, không push** trừ khi người dùng yêu cầu. Kết thúc bằng báo cáo: đã làm gì, file nào, kết quả kiểm tra, phần chưa làm.

## 4. Thứ tự ưu tiên

| Ưu tiên | WP | Lý do |
|---|---|---|
| P0 | A1, A2, A3, B1, B2 | Lấp khoảng trống so với đặc tả và yêu cầu GVHD; nền để các WP sau không gãy |
| P1 | A4, A5, C1, D1, D2 | Hoàn thiện giá trị đồ án và khả năng trình diễn |
| P2 | B3, C2, C3, C4 | Chất lượng mã và nhất quán; cắt trước khi thiếu thời gian |

Nếu chỉ còn thời gian cho ba việc: **A1, A2, A3**.

## 5. Các gói việc

Cỡ: S ≈ nửa ngày, M ≈ 1–2 ngày, L ≈ 3–4 ngày công của một người.

### A1 — Kiểm chứng trên benchmark công khai (P0, L)

**Mục tiêu**: có bảng so sánh lõi CP-SAT và luật điều độ với kết quả tốt nhất đã công bố, đưa được vào báo cáo.

**Phạm vi**: tạo `models/benchmarks/` (mới), `models/tests/test_benchmarks.py` (mới), ghi kết quả vào `models/runs/benchmarks/<timestamp>/`, viết `report/evaluation/benchmark_results.md` và cập nhật `report/evaluation/README.md`. Không sửa `models/common/`.

**Việc cần làm**
1. Đọc `dataset/README.md` và `SOURCE.md` của `taillard-ta01-ta80`, `or-library-raw`, `deliktas-fjsp-cellular` để nắm định dạng và giấy phép.
2. Viết parser cho ba định dạng → một cấu trúc chung (job, operation, máy ứng viên, thời gian, setup phụ thuộc trình tự nếu có).
3. Viết mô hình CP-SAT makespan cho JSSP và FJSP có setup phụ thuộc trình tự (interval + `AddNoOverlap` / circuit), tách khỏi mô hình đề tài.
4. Baseline: luật điều độ không cần hạn giao (FIFO, SPT, MWKR). Ghi rõ EDD không áp dụng vì benchmark không có hạn giao.
5. Bộ chạy: chọn instance, ngân sách giây, seed, số worker; xuất `results.csv`, `results.json`, `config.json`; tính gap so với BKS/cận dưới (đưa bảng BKS vào `models/benchmarks/bks.json` kèm nguồn trích dẫn).
6. Bộ kiểm độc lập cho lịch benchmark (thứ tự công đoạn, không chồng máy, setup).
7. Chạy tập đại diện: Lawrence la01–la40, Taillard ta01–ta10 và mỗi cỡ một ít instance lớn, toàn bộ 43 instance Deliktaş; ngân sách 60 giây và 600 giây.
8. Viết `benchmark_results.md`: bảng theo nhóm instance (số instance, gap trung bình/tệ nhất, tỉ lệ chứng minh tối ưu), nhận xét, giới hạn (benchmark không có ràng buộc đặc thù đề tài — đúng §2.4 spec).

**Nghiệm thu**: một lệnh tái lập toàn bộ (`python -m models.benchmarks.run --suite … --seconds …`); mọi lịch qua bộ kiểm; test parser + mô hình trên 2–3 instance nhỏ có nghiệm tối ưu đã biết (ví dụ ft06 = 55, la01 = 666); bảng kết quả có trong `report/evaluation/`.

**Phụ thuộc**: không. Chạy song song với mọi WP khác.

### A2 — Pipeline lai SA → CP-SAT trong sản phẩm (P0, M) — phần lớn đã làm 13/11/2026

**Đã làm** (chưa commit; số đo ở `models/hybrid/README.md`): method `hybrid` cho schema 5 (luật → SA nhiều seed tiếp sức → CP-SAT), decoder nhanh hơn khoảng 3 lần với kết quả y hệt, CP-SAT được gợi ý đủ mọi biến và chạy nhiều worker, thiết lập `MNFT_SOLVER_CP_WORKERS`, metadata ghi đúng số worker (I4), `hybrid` là lựa chọn của cả ba mức sinh phương án cho mô hình 5 công đoạn (60 / 180 / 600 giây), test trong `models/tests/test_stage_runs_speed.py` và `backend/tests/test_api.py`.

**Kết quả** (bộ 2 tuần, máy 8 nhân): 60 giây và 180 giây đều cho 0 đơn trễ (5/5 lượt), chi phí 99–101 nghìn và 55–59 nghìn; 540 giây: 44,7 nghìn, 53 ca máy. 136 test backend + models đạt, frontend build đạt.

**Làm thêm 14/11/2026**: đã lưu đợt chạy chính thức `models/runs/v2/hybrid/results/20261113T175303106302Z` (180 giây, seed 11: 160 · 53.534, 0 đơn trễ, 59 ca máy) và ghi vào `models/runs/README.md`. Ablation cho F6 (mục 4) đã đo bằng `hybrid` 180 giây thay vì `run_all`: tắt trọng số thời gian không sản xuất thì cần 85–89 ca máy, hiệu suất 38–40%; bật thì 59–64 ca, 56–58%; cả hai đều 0 đơn trễ. Bảng ở `models/hybrid/README.md`.

Mức *Nhanh* (EDD + `hybrid` 60 giây) đã chạy qua API của backend trên bản sao DB: `SUCCEEDED` sau 68 giây, 0 đơn trễ, 160 · 105.436, metadata đủ 3 pha và 8 worker. Ở lượt đó SA chỉ có 24 giây và chỉ 1 / 8 seed đạt 0 đơn trễ, nên mức 60 giây còn mỏng khi máy bận; mức 180 giây là mức nên khuyến nghị.

**Còn lại**: (1) đoạn nhận xét trong `report/evaluation/` (chưa viết, chờ quyết định Q1–Q3 vì thuộc `report/`); (2) xem hộp thoại sinh phương án bằng mắt trên trình duyệt (14/11 tiện ích Chrome không kết nối được, mới kiểm qua API, typecheck và build); (3) tiến độ theo pha trên UI chờ B1.

Mô tả gốc của gói việc:

**Mục tiêu**: một nút "Lập lịch" cho ra lịch tốt hơn luật điều độ trong ngân sách vài phút, đúng cấu trúc đã thực nghiệm chứng minh (B2 → B3).

**Phạm vi**: `models/common/stage_runs/experiment.py`, `models/common/experiment.py` (đăng ký method), `models/tests/test_stage_runs.py`, `backend/app/engine/adapter.py`, `backend/app/config.py`, `backend/tests/test_api.py`, `frontend/lib/algorithms.ts`, `frontend/components/decision/generate-dialog.tsx`.

**Việc cần làm**
1. Thêm method `hybrid` cho schema 5: (a) lịch tốt nhất trong FIFO/EDD/SPT sau dồn ca; (b) SA với khoảng 40% ngân sách, xuất phát từ (a); (c) CP-SAT nhận lịch tốt nhất làm hint với phần ngân sách còn lại. Kết quả không bao giờ tệ hơn bước trước; `history` ghi mốc từng pha; `metadata.phases` ghi thời gian và điểm sau mỗi pha.
2. Thêm thiết lập `MNFT_SOLVER_CP_WORKERS` vào `Settings`, truyền xuống `execute(workers=…)`; sửa `adapter.py` ghi đúng số worker thay vì số 1 cố định.
3. Frontend: `hybrid` thành lựa chọn chính của mức *Cân bằng* và *Kỹ* (giữ EDD để đối chứng); nhãn song ngữ "Kết hợp: tìm kiếm rồi CP-SAT"; trạng thái solver của `hybrid` đọc được bằng lời.
4. Ablation cho F6: chạy `models/run_all.py` trên `dataset/wheel-factory-2weeks` với trọng số thời gian không sản xuất bật / tắt, ghi đợt mới vào `models/runs/v2/` và một đoạn nhận xét vào `report/evaluation/hybrid_and_utilization.md`.

**Nghiệm thu**: test chứng minh trên `wheel-factory-small` điểm `hybrid` ≤ điểm EDD và ≤ điểm SA cùng seed, cùng tổng ngân sách; chạy qua API trả `SUCCEEDED` với `metadata.phases` đủ 3 pha; `hybrid` bị từ chối trên schema 4 bằng `ALGORITHM_NOT_AVAILABLE`; bảng ablation có số liệu thật.

**Phụ thuộc**: nên sau B1 (dùng tiến độ theo pha), nhưng không bắt buộc.

### A3 — Lớp diễn giải ở backend (P0, L)

**Mục tiêu**: câu trả lời "vì sao" lấy từ dữ liệu lần chạy đã lưu, tính ở server, có test; thay phần suy đoán trong trình duyệt.

**Phạm vi**: `models/common/stage_runs/explain.py` (mới), `models/tests/test_explain.py` (mới), `backend/app/explanation.py` (mới), `backend/app/api/explanation_routes.py` (mới) + đăng ký trong `backend/app/main.py`, `backend/app/schemas.py` (thêm response model), `backend/tests/test_explanation.py` (mới), `frontend/lib/explain.ts`, `frontend/components/scenario/schedule-insights.tsx`, `frontend/lib/api.ts` và `lib/types.ts` (chỉ thêm).

**Việc cần làm**
1. Hàm thuần `explain(input, operations)` trả:
   - **Chuỗi cấp hàng theo đơn**: gắn lượt với đơn bằng đúng quy tắc dòng tồn mà `stage_runs/evaluate.py` dùng (không dùng "lượt gần nhất").
   - **Chuỗi găng** của mỗi đơn trễ và của cả lịch: lần ngược từ lượt cuối, mỗi bước xác định ràng buộc đang ghì: máy bận (lượt trước trên cùng máy), chờ vật tư (lượt cấp + thời gian chuyển), ngoài ca, khuôn (bận/bảo trì), ngày phát hành, trần kho. Kèm độ chùng (slack) từng bước.
   - **Điểm nghẽn**: công đoạn có tỉ lệ sử dụng ca đã mở cao nhất và tổng thời gian chờ trước nó lớn nhất.
   - **Hiệu suất máy**: theo máy và theo ca — phút gia công / setup / bảo trì / rảnh; cờ "ca mở nhưng dùng dưới 50%".
2. `GET /api/v1/schedule-runs/{id}/explanations` (toàn bộ) và `?order=<mã>` (một đơn); chỉ đọc, không giải lại; 404/409 có mã khi lần chạy chưa `SUCCEEDED`.
3. Frontend: `schedule-insights.tsx` đọc từ API; `lib/explain.ts` chỉ còn phần trình bày. Thêm mục "Đường găng" (bấm vào thì Gantt làm sáng chuỗi) và bảng hiệu suất theo ca. Câu chữ theo ngôn ngữ người lập lịch, không lộ thuật ngữ solver.
4. Giữ câu "đây là gợi ý" chỉ ở nơi thật sự là suy đoán.

**Nghiệm thu**: test trên lịch vàng của `wheel-factory-small`: mỗi đơn trễ có chuỗi găng kết thúc tại lượt giao của đơn; tổng phút theo máy khớp `evaluate` (sai số 0); lịch dựng tay với nguyên nhân biết trước (máy bận, ngoài ca) trả đúng loại nguyên nhân. UI: bấm một đơn trễ hiện chuỗi găng trong dưới 1 giây trên kỳ 2 tuần.

**Phụ thuộc**: không. A4 dùng kết quả của WP này.

### A4 — Độ nhạy và bảng trước/sau giữa các phiên bản kỳ (P1, L)

**Mục tiêu**: hoàn tất hai mục còn thiếu của §2.3 spec: phân tích độ nhạy và phản thực có bảng so sánh.

**Phạm vi**: `backend/app/sensitivity.py` (mới), `backend/app/api/explanation_routes.py` (thêm), migration mới cho bảng `schedule_analyses`, `backend/app/models.py`, `backend/app/jobs.py` (chỉ thêm loại job), `backend/tests/test_sensitivity.py` (mới), `frontend/components/period/compare-versions.tsx` (mới), `frontend/components/scenario/sensitivity-panel.tsx` (mới), điểm gắn tối thiểu trong `period-header.tsx` và `desk-views.tsx`.

**Việc cần làm**
1. **Trước/sau**: `GET /schedule-runs/{a}/diff/{b}` cho hai lần chạy khác `input_hash`: KPI, từng đơn (giờ giao, trễ, đổi trạng thái), tải từng máy, số lượt đổi máy / đổi giờ với các lượt trùng mã. Với bản lập lại lịch: xác nhận phần trước `frozen_until` không đổi và nói rõ điều đó.
2. UI: trong thanh phiên bản của kỳ, nút "So với kỳ chính" mở bảng trước/sau (đơn bị ảnh hưởng lên đầu) cho biến thể what-if và bản lập lại lịch.
3. **Độ nhạy**: `POST /schedule-runs/{id}/sensitivity` tạo job nền, thử từng nới lỏng: thêm một ca cho công đoạn nghẽn, lùi hạn từng đơn trễ một ngày, tăng chu kỳ khuôn. Mỗi phép thử giải bằng cùng một phương pháp nhanh (luật tốt nhất + dồn ca, hoặc SA 15 giây) và so với **mốc giải lại bằng chính phương pháp đó**. Kết quả lưu ở `schedule_analyses`, đọc bằng `GET …/sensitivity`.
4. UI: bảng "Nới cái gì thì được gì" sắp theo mức giảm trễ; mỗi dòng có nút "Tạo biến thể với thay đổi này".

**Nghiệm thu**: test: diff của một lần chạy với chính nó rỗng; bản lập lại lịch có 0 thay đổi trước mốc cắt; job độ nhạy sống sót qua khởi động lại; mọi lịch thử đều qua bộ kiểm; kỳ đã đóng từ chối bằng `PERIOD_CLOSED`.

**Phụ thuộc**: sau A3 (dùng điểm nghẽn) và B1 (dùng cơ chế hủy / tiến độ).

### A5 — Kế hoạch tổng hợp tháng/quý cho mô hình nhà máy (P1, L)

**Mục tiêu**: luồng chính có đủ hai tầng như đề tài phát biểu: kế hoạch quý → chọn cửa sổ 2 tuần → kỳ lập lịch.

**Phạm vi**: `backend/app/factory_plan.py` (mới), `backend/app/api/factory_routes.py` (thêm route), `backend/app/factory_schemas.py` (thêm), `backend/tests/test_factory_plan.py` (mới), `frontend/app/plan/page.tsx` (mới), `frontend/components/plan/*` (mới), `frontend/lib/nav.ts`, `frontend/lib/factory.ts` / `factory-types.ts` (chỉ thêm).

**Việc cần làm**
1. `GET /factories/{id}/plan?start=&months=3&bucket=week|month`, dựng trên logic của `outlook` trong `backend/app/factories.py`: nhu cầu theo sản phẩm từ sổ đơn; công suất theo công đoạn từ cấu hình đang hiệu lực (ca, ngày nghỉ, lễ, bảo trì định kỳ); % tải; tồn thành phẩm dự kiến so với tồn an toàn; cờ quá tải; gợi ý san tải (làm trước bao nhiêu ở bucket nào còn công suất). Đơn quá hạn tách thành cột riêng, không dồn vào bucket hiện tại.
2. Trang `/plan` trong nhóm *Điều độ*: lưới công đoạn × bucket, dòng nhu cầu / tồn theo sản phẩm, dải các kỳ đã tạo phủ lên trục thời gian, nút "Tạo kỳ cho 2 tuần này" (mở hộp thoại tạo kỳ với ngày điền sẵn).
3. Nói rõ trên trang đây là ước lượng thô (chưa tính setup, chưa xếp thứ tự), khác với lịch chi tiết.

**Nghiệm thu**: test: tổng nhu cầu các bucket = tổng đơn mở trong tầm nhìn; công suất bucket có ngày lễ nhỏ hơn bucket thường; thay phiên bản cấu hình có ngày hiệu lực giữa tầm nhìn thì các bucket sau dùng phiên bản mới. Trang đủ trạng thái rỗng (chưa có đơn) và lỗi.

**Phụ thuộc**: không. Phối hợp với C2 (cùng chỉnh cách hiện đơn quá hạn trong `outlook`).

### B1 — Vòng đời lần chạy: phạm vi truy vấn, hủy, tiến độ (P0, M)

**Mục tiêu**: bàn điều độ tải đúng dữ liệu của mình, người dùng dừng và theo dõi được lần giải dài.

**Phạm vi**: `backend/app/api/routes.py` (phần schedule-runs), `backend/app/repository.py`, `backend/app/services.py`, `backend/app/jobs.py`, `backend/app/schemas.py`, `backend/app/engine/adapter.py`, `models/common/stage_runs/{experiment,search,cp_engine}.py` (chỉ thêm tham số dừng / báo tiến độ), `backend/tests/test_api.py`, `frontend/lib/api.ts`, `frontend/components/scenario/workspace.tsx` (chỉ khối "data", dòng 150–180), `frontend/components/run-status.tsx`, `frontend/app/runs/[id]/page.tsx`.

**Việc cần làm**
1. `GET /schedule-runs` nhận `dataset_id`, `input_hash`; thêm `include=metrics` để danh sách trả luôn `metrics`, `solver_metadata` rút gọn, không kèm operations.
2. Frontend: bỏ `listAllScheduleRuns()` + lọc client ở workspace; dùng bộ lọc mới; chỉ tải operations của phương án đang xem và phương án so sánh.
3. `POST /schedule-runs/{id}/cancel`: `QUEUED` → `CANCELLED` ngay; `RUNNING` → đặt cờ, engine dừng hợp tác (callback `should_stop` trong vòng SA/GA/LNS, `StopSearch` của CP-SAT) và giữ lịch tốt nhất hiện có nếu đã qua bộ kiểm (trạng thái `SUCCEEDED`, `solver_status = STOPPED_BY_USER`), nếu chưa có lịch thì `CANCELLED`.
4. Tiến độ: engine gọi callback định kỳ (pha, điểm tốt nhất, giây đã chạy); dispatcher ghi vào `solver_metadata.progress` tối đa 1 lần / 2 giây; UI hiện pha + thanh thời gian + điểm tốt nhất.
5. Executor: chuyển phần giải sang tiến trình con (một `ProcessPoolExecutor` hoặc `multiprocessing` với cờ dừng dùng chung) để API không bị GIL chặn và tắt server không phải chờ hết ngân sách; giữ `inline=True` cho test.

**Nghiệm thu**: test: lọc `dataset_id` đúng; hủy `QUEUED`; hủy `RUNNING` kết thúc trong 5 giây; tiến độ xuất hiện trong lúc chạy; khởi động lại vẫn phục hồi job. Thủ công: mở một kỳ khi DB có hơn 500 lần chạy vẫn thấy đủ phương án; số request khi mở tab Phương án giảm từ 40+ xuống dưới 5.

**Phụ thuộc**: không. **Phải xong trước C1 và A4** (cùng chạm `workspace.tsx` / `jobs.py`).

### B2 — Test frontend và E2E (P0, M)

**Mục tiêu**: khoá hành vi nghiệp vụ đang nằm ở client trước khi các WP khác sửa.

**Phạm vi**: `frontend/package.json`, `frontend/vitest.config.ts` (mới), `frontend/lib/__tests__/*` (mới), `frontend/e2e/*` (mới), `frontend/playwright.config.ts` (mới), `.github/workflows/ci.yml`, `README.md` (mục kiểm tra chất lượng).

**Việc cần làm**
1. Vitest cho hàm thuần: `lib/decision.ts` (chấm điểm 3 chính sách, `shortlist`, hoà điểm), `lib/explain.ts`, `lib/plant.ts`, `lib/factory-config.ts` (`insertStage` / `removeStage` / `moveStage`, `configIssues`), `lib/format.ts`. Dữ liệu mẫu lấy từ `dataset/wheel-factory-small`.
2. Playwright một luồng khói trên backend thật với DB tạm: mở Hôm nay → kỳ mẫu → sinh phương án mức Nhanh → xem Gantt → chốt kèm lý do → tab Thực hiện có lệnh sản xuất. Thêm kiểm `@axe-core/playwright` trên 4 trang chính, sáng và tối.
3. CI: job `frontend` chạy vitest; job mới `e2e` dựng backend + frontend rồi chạy Playwright.

**Nghiệm thu**: `npm run test` và `npm run e2e` chạy được trên máy và CI; có ít nhất 40 ca unit cho `decision.ts` + `factory-config.ts`; luồng khói dưới 3 phút.

**Phụ thuộc**: không. WP duy nhất được sửa `package.json` ở đợt 1 (B3 sửa ở đợt 3).

### B3 — Hợp đồng API (P2, M)

**Phạm vi**: `frontend/lib/types.ts`, `lib/factory-types.ts`, `lib/api.ts`, `frontend/lib/errors.ts` (mới), `frontend/package.json` (script sinh type), `backend/app/api/routes.py` → tách thành `backend/app/api/{system,master_data,planning,runs}_routes.py`.

**Việc cần làm**: (1) sinh type từ `/api/v1/openapi.json` bằng `openapi-typescript`, type viết tay chỉ còn là alias; kiểm trong CI rằng file sinh ra không lệch. (2) Bảng mã lỗi → câu song ngữ ở `lib/errors.ts`; `apiErrorMessage` tra mã trước, rơi về message của server sau; phủ mọi mã trong `docs/_product/manual-editing.md` và `factory-periods.md`. (3) Tách `routes.py` theo tag, không đổi đường dẫn và hành vi.

**Nghiệm thu**: OpenAPI trước và sau khi tách giống hệt nhau (so JSON); không còn câu lỗi tiếng Anh khi giao diện ở tiếng Việt cho các mã đã liệt kê; toàn bộ test đạt.

**Phụ thuộc**: sau A3, A4, A5, B1 (các WP đó thêm route và type).

### C1 — Trang kỳ lập lịch: nội dung quyết định nằm ở màn đầu (P1, M)

**Mục tiêu**: mở tab là thấy thứ cần xem, không phải cuộn.

**Phạm vi**: `frontend/components/period/period-header.tsx`, `frontend/app/periods/[id]/page.tsx`, `frontend/components/scenario/desk-views.tsx`, `frontend/components/scenario/workspace.tsx` (phần bố cục, không đụng khối "data"), `frontend/components/schedule-gantt.tsx` (chỉ chú giải, trục dính, chế độ toàn màn), `frontend/components/decision/sections.tsx`, `frontend/components/decision/desk-chrome.tsx`.

**Việc cần làm**
1. Banner "kỳ đã kết thúc chưa đóng": gộp vào badge "Quá hạn đóng" cạnh tiêu đề (bấm mở giải thích + hành động); chỉ hiện dạng banner ở tab Chuẩn bị và Thực hiện.
2. Tab *Xem lịch*: gộp hàng chọn phương án, 4 KPI và nút sửa tay thành một hàng (KPI đã có trên thanh quyết định thì bỏ khỏi thân trang); chú giải thu thành nút "Chú giải" mở popover; trục ngày và cột tên máy dính khi cuộn; thêm nút "Toàn màn hình" cho Gantt (ẩn header kỳ, giữ thanh quyết định).
3. Tab *Phương án*: thẻ phương án lên đầu; chọn chính sách thành segmented control cùng hàng tiêu đề; cảnh báo "bộ tối ưu chưa hơn luật" thu thành một dòng phía trên thẻ.
4. Padding đáy của trang bằng chiều cao thật của thanh quyết định (kể cả khi thanh xuống 2 dòng ở mobile).
5. So sánh song song (việc tồn `DESIGN.md` §6.2): công tắc "Chồng viền / Hai Gantt" với cuộn ngang đồng bộ.

**Nghiệm thu** (đo ở 1366 × 768, sáng và tối): tab *Xem lịch* thấy ít nhất 6 / 8 hàng máy không cần cuộn; tab *Phương án* thấy trọn lưới KPI của phương án hạng 1; không mất chức năng nào (đối chiếu danh sách ở `DESIGN.md` §11); axe 0 vi phạm; 420 px không có nội dung bị thanh đáy che.

**Phụ thuộc**: sau B1. Không sửa `schedule-insights.tsx` (thuộc A3).

### C2 — Hôm nay và Sổ đơn hàng: nói rõ nguyên nhân tải (P2, S)

**Phạm vi**: `frontend/app/page.tsx`, `frontend/components/orders/outlook-panel.tsx`, `backend/app/factories.py` (hàm outlook), `backend/tests/test_factories.py`.

**Việc cần làm**: outlook trả riêng phần tải của đơn quá hạn; ô tải hiện hai phần (quá hạn / đến hạn trong tuần) và tooltip "190% vì 28 đơn quá hạn dồn vào tuần này"; tuần không có đơn hiện "0%" kèm chữ mờ thay cho "—"; trang Hôm nay khi kỳ đã qua thì hành động chính là "Đóng kỳ & tạo kỳ sau" thay vì "So sánh & chốt" nếu kỳ chưa từng được chốt quá N ngày (nêu rõ lựa chọn bỏ qua).

**Nghiệm thu**: test backend cho phần tách quá hạn; kiểm bằng mắt hai trang ở dữ liệu mẫu.

**Phụ thuộc**: phối hợp với A5 (cùng logic outlook) — giao cùng một agent hoặc làm sau A5.

### C3 — Design system: tài liệu chuẩn, token chữ, khoá lưu trữ (P2, M)

**Phạm vi**: `frontend/DESIGN.md`, `frontend/docs/design-changelog.md` (mới), `frontend/app/globals.css`, `frontend/lib/storage.ts` (mới), các file đang gọi `localStorage` trực tiếp, `frontend/components/form/*` (mới, gom từ ba bộ shared), `frontend/app/dev/ui/page.tsx` (mới, chỉ bật khi không phải production).

**Việc cần làm**
1. Viết lại `DESIGN.md` thành tài liệu chuẩn theo thứ tự: nguyên tắc → token (màu, chữ, bo góc, độ nổi, khoảng cách) → thành phần (khi nào dùng cái nào) → mẫu trang (trang đối tượng nhiều tab, ngăn chi tiết, thanh lưu dính, thanh quyết định) → quy ước URL và lưu trữ → a11y. Chuyển nguyên phần lịch sử sang `design-changelog.md`, giữ nội dung.
2. Thêm token cỡ chữ cho các cỡ đang dùng tuỳ ý (đề xuất `--text-2xs` 10.5 px, `--text-xs` 11.5 px; gộp 10 / 10.5 và 11 / 11.5 / 12.5), thay 49 chỗ `text-[Npx]`; thêm luật ESLint cấm `text-[…px]` mới.
3. `lib/storage.ts`: đọc / ghi có try-catch, một tiền tố `planwise:`; di trú một lần các khoá cũ (`schedule-os:*`, `schedule-run-filters`, `planwise-locale`) và không làm mất dữ liệu người dùng.
4. Gom `NumberField`, `TimeField`, `DateField`, `DirtyHint`, `MutationNotice`, `RecordSheet` về `components/form/`; ba file shared cũ chỉ re-export. Dùng `DateField` cho mọi ô ngày còn `input type=date`.
5. Trang `/dev/ui`: bảng token sáng / tối và mọi thành phần dùng chung ở các trạng thái.

**Nghiệm thu**: không còn `text-[…px]` ngoài danh sách ngoại lệ có chú thích; không còn `localStorage.` ngoài `lib/storage.ts`; `DESIGN.md` không còn mục mâu thuẫn; ảnh chụp trước / sau 6 trang chính không lệch bố cục đáng kể.

**Phụ thuộc**: mục 1, 3, 5 chạy bất kỳ lúc nào. Mục 2 và 4 chạm nhiều file component → chạy ở đợt cuối, sau C1, A3, A4.

### C4 — Tách file lớn (P2, M)

**Phạm vi**: `frontend/components/scenario/{schedule-editor,workspace,v5-views}.tsx`, `frontend/components/schedule-gantt.tsx`.

**Việc cần làm**: tách theo trách nhiệm, không đổi hành vi: Gantt → hình học thuần (`lib/gantt-layout.ts`, có unit test) + lớp vẽ + lớp kéo-thả; workspace → hook dữ liệu (`useScenarioData`) + khung tab; schedule-editor → reducer hoàn tác / làm lại (có test) + thanh công cụ + hộp thoại tối ưu. Giới hạn dòng 160 ký tự.

**Nghiệm thu**: không file nào trên 20 KB; E2E của B2 vẫn đạt; thêm unit test cho hình học Gantt và reducer.

**Phụ thuộc**: sau B2 (cần E2E làm lưới an toàn) và sau mọi WP chạm các file này (B1, C1, A3, A4). Làm cuối cùng.

### D1 — Đồng bộ tài liệu (P1, S)

**Phạm vi**: `README.md`, `CLAUDE.md`, `docs/_product/implementation-plan.md`, `docs/production-scheduling/srs/*`, `docs/_shared/project-profile.md`. `report/TECHNICAL_SPEC.md` **chỉ khi Q1 được duyệt**.

**Việc cần làm**: cập nhật mục tiến độ và phạm vi của `implementation-plan.md` theo thực tế (đã có: kỳ, what-if, lập lại lịch, sửa tay; chưa có: liệt kê theo WP của tài liệu này); bỏ câu "Explanation sẽ được bổ sung" khi A3 xong; `CLAUDE.md` nêu rõ hai mô hình (4 công đoạn đóng băng, 5 công đoạn là luồng chính); SRS cập nhật `status` / `updated` và các FR đã đổi; nếu Q1 được duyệt: `TECHNICAL_SPEC.md` v2.7 — 5 công đoạn, Gantt SVG tự viết, cấu trúc module thực tế, bảng §1.1 và API §7 theo sản phẩm, roadmap còn lại.

**Nghiệm thu**: không còn mệnh đề nào trong các file trên trái với mã nguồn; mọi đường dẫn nhắc tới đều tồn tại.

**Phụ thuộc**: làm hai lần — một lần ngay (phần đã sai), một lần cuối (sau các WP A*).

### D2 — Demo cố định (P1, M)

**Phạm vi**: `scripts/demo-reset.ps1` (mới), `backend/app/bootstrap.py`, `backend/app/seed/*`, `backend/app/config.py`, `backend/tests/test_factories.py`, `docs/_product/demo-script.md` (mới).

**Việc cần làm**: tuỳ chọn `MNFT_SEED_ANCHOR=today|<ngày>` dời toàn bộ ngày của dữ liệu mẫu sao cho kỳ đầu bắt đầu vào thứ Hai tuần hiện tại (mặc định giữ ngày gốc để test tái lập); `demo-reset.ps1` sao lưu DB cũ vào `data/backups/`, tạo DB mới, nạp mẫu, sinh sẵn phương án (EDD + `hybrid`) và hai tình huống: đơn gấp (biến thể what-if) và máy hỏng (lập lại lịch); `demo-script.md` dưới 10 phút, từng bước kèm điều cần nói và phương án dự phòng khi solver chậm.

**Nghiệm thu**: từ clone mới, một lệnh ra trạng thái demo trong dưới 10 phút; trang Hôm nay không còn "kỳ đã qua"; test xác nhận dời ngày không đổi kết quả biên dịch ngoài mốc thời gian.

**Phụ thuộc**: sau A2 (dùng `hybrid`); phần kịch bản hoàn thiện sau A3, A4.

## 6. Đợt thực hiện và quyền sở hữu file

Các WP trong cùng một đợt không chạm file của nhau nên chạy song song được.

| Đợt | WP chạy song song | Ghi chú |
|---|---|---|
| 1 | A1 · B1 · B2 · A3 · D1 (lần 1) · C3 (mục 1, 3, 5) | A3 chỉ thêm vào `lib/api.ts` / `lib/types.ts`; B1 sửa các hàm run sẵn có trong `lib/api.ts` → hai agent thêm ở hai vùng khác nhau, orchestrator gộp |
| 2 | A2 · C1 · A5 | C1 và A2 chỉ bắt đầu khi B1 đã gộp |
| 3 | A4 · C2 · D2 · B3 | B3 bắt đầu sau khi A4 gộp route |
| 4 | C3 (mục 2, 4) · C4 · D1 (lần 2) | C4 sau C3 |

File dễ xung đột và WP giữ quyền theo đợt:

| File | Đợt 1 | Đợt 2 | Đợt 3 | Đợt 4 |
|---|---|---|---|---|
| `frontend/components/scenario/workspace.tsx` | B1 (khối data) | C1 (bố cục) | — | C4 |
| `frontend/components/schedule-gantt.tsx` | — | C1 | — | C4 |
| `frontend/components/scenario/schedule-insights.tsx`, `lib/explain.ts` | A3 | — | — | — |
| `backend/app/jobs.py`, `repository.py` | B1 | — | A4 (chỉ thêm) | — |
| `backend/app/api/routes.py` | B1 | — | B3 (tách) | — |
| `models/common/stage_runs/experiment.py` | B1 (tham số dừng / tiến độ) | A2 | — | — |
| `backend/app/factories.py` (outlook) | — | A5 | C2 | — |
| `frontend/package.json` | B2 | — | B3 | — |
| `backend/app/schemas.py`, `frontend/lib/api.ts`, `lib/types.ts` | chỉ thêm ở cuối file | chỉ thêm | B3 tái cấu trúc | — |

Mỗi sub-agent nên làm trong worktree riêng; orchestrator gộp theo thứ tự đợt và chạy lại bộ kiểm tra ở mục 3.5 sau mỗi lần gộp.

## 7. Quyết định cần người dùng chốt

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | Có cho phép sửa `report/TECHNICAL_SPEC.md` lên v2.7 để khớp sản phẩm (5 công đoạn, cấu trúc, API)? | Có. Spec là "nguồn sự thật" nhưng đang lệch; không sửa thì báo cáo cuối kỳ mâu thuẫn với demo |
| Q2 | Spec §3.1 bắt buộc `app/modules/*`; mã hiện là các module phẳng tách theo trách nhiệm. Chuyển mã hay sửa spec? | Sửa spec, chỉ tách `routes.py` (B3). Dời cả cây thư mục lúc còn 4 tuần là rủi ro không đổi lấy giá trị |
| Q3 | Tiêu chí "hiệu suất máy ≥ 90%" trong khi tốt nhất đo được là 73,6% | Giữ là mục tiêu tối ưu, đổi tiêu chí thành "cải thiện rõ so với không có mục tiêu này" và chứng minh bằng ablation ở A2 |
| Q4 | Schema 4 (4 công đoạn, nhóm Nâng cao) | Đóng băng: không thêm tính năng, giữ test. Mọi WP chỉ nhắm schema 5 |
| Q5 | Chuyển xếp hạng / chính sách (`lib/decision.ts`) về backend? | Hoãn. B2 khoá hành vi bằng test trước; chuyển sau bảo vệ nếu còn phát triển |
| Q6 | Sub-agent có được commit không? | Mỗi WP một nhánh, commit sau khi orchestrator kiểm tra đạt; không push khi chưa được yêu cầu |

## 8. Ngoài phạm vi đợt này

Xác thực người dùng / SSO và BFF giấu token (I9) — demo chạy local; PostgreSQL và hàng đợi worker ngoài; chatbot; nhiều nhà máy; tối ưu Gantt cho trên 2.000 lượt; ứng dụng mobile riêng.
