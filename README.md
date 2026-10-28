# PlanWise

PlanWise — Reasonable Scheduling Agent cho đồ án CO5103. Giao diện hỗ trợ tiếng Việt và tiếng Anh (nút VI/EN ở góc trên).

Ứng dụng lập lịch sản xuất cho dây chuyền linh kiện, gồm FastAPI, Next.js và engine OR-Tools. Mỗi lần chạy lưu snapshot đầu vào, hash, cấu hình solver, lịch theo công đoạn, KPI và kết quả kiểm tra độc lập.

## Trạng thái MVP

Lát cắt đầu tiên đã hỗ trợ:

- Nhận scheduling input schema v1 với validation chặt và kiểm tra tham chiếu chéo.
- Chạy FIFO/EDD/SPT, SA/GA, CP-SAT, CP-SAT + hint hoặc CP-LNS dưới dạng persisted job.
- Idempotency cho thao tác tạo run, trạng thái `QUEUED/RUNNING/SUCCEEDED/FAILED` và phục hồi job dang dở sau restart.
- Import master data theo transaction vào schema quan hệ: sản phẩm/tồn kho, máy/capability/changeover, ca/windows/downtime, khuôn, đơn hàng/lô/allocation.
- Đọc, export, cập nhật nguyên bộ dữ liệu theo revision và xóa dataset; update sai bị từ chối trước khi thay đổi dữ liệu cũ.
- Form và API chỉnh từng entity với optimistic revision: sản phẩm/tồn kho, máy và đơn hàng; thay đổi làm mất tính khả thi bị chặn trước commit.
- Tạo schedule run trực tiếp từ `dataset_id`; run lưu revision và snapshot nên vẫn tái lập được sau khi master data đổi hoặc bị xóa.
- Tạo kế hoạch sản xuất tổng hợp bất biến theo revision: nhu cầu/tồn kho, sản lượng lô, bucket ngày/tuần và rough-cut capacity theo công đoạn.
- Tạo detailed schedule trực tiếp từ `plan_id`; plan và run đều giữ snapshot nên luồng vẫn tái lập được khi master data gốc bị xóa.
- Chỉ lưu lịch thành công khi vượt qua validator độc lập.
- Lịch sử run, chi tiết KPI/metadata và 192 operation của scenario chuẩn.
- UI quản lý dataset, kế hoạch tổng hợp, upload JSON dùng một lần, theo dõi trạng thái, KPI và Gantt theo máy.

- **Nhà máy, sổ đơn hàng, kỳ lập lịch** (mô hình 5 công đoạn): cấu hình nhà máy có phiên bản và ngày hiệu lực, chỉ khai báo một lần. Đơn hàng nhập một lần vào sổ (Excel/CSV/dán từ Excel, xem trước và báo lỗi từng dòng). Mỗi kỳ tự lấy đơn còn mở, lấy tồn đầu kỳ dự kiến từ lịch đã chốt kỳ trước, tự suy ra lô/lượt rồi biên dịch thành kịch bản schema 5. Có biến thể what-if, lập lại lịch sau sự cố (giữ nguyên phần đã chạy), lệnh sản xuất in/xuất CSV, đóng kỳ và chuyển kỳ. Xem [docs/_product/factory-periods.md](docs/_product/factory-periods.md).

- **Chỉnh lịch bằng tay (người lập lịch trong vòng lặp)**: trên một phương án (mô hình 5 công đoạn), kéo-thả lượt sang máy/giờ khác hoặc đổi máy, thứ tự, giờ sớm nhất trong bảng chi tiết. Hệ thống xếp lại giờ (lượt không sửa giữ giờ cũ, chỉ lượt bị đẩy mới dời), kiểm bằng bộ kiểm độc lập và hiện KPI thay đổi ngay; có hoàn tác/làm lại. Bản sửa hợp lệ được lưu thành phương án mới (`algorithm = manual`) để so sánh và chốt như mọi phương án; phương án gốc giữ nguyên. **Tối ưu phần còn lại**: khoá các lượt phải giữ (và/hoặc một vùng giữ nguyên đầu kỳ), CP-SAT xếp lại phần còn lại chạy nền (`algorithm = cp_repair`), không bao giờ tệ hơn bản sửa. Xem [docs/_product/manual-editing.md](docs/_product/manual-editing.md).

Explanation sẽ được bổ sung theo [implementation plan](docs/_product/implementation-plan.md).

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| `backend/` | FastAPI, engine OR-Tools, Alembic migrations |
| `frontend/` | Giao diện Next.js |
| `models/` | Tám phương pháp lập lịch dùng để đánh giá, input chuẩn (`models/input/`) và kết quả chạy (`models/runs/`) — xem [models/README.md](models/README.md) |
| `research/` | Mã nghiên cứu ngoài sản phẩm: `experiment/` (mô hình tồn bán thành phẩm), `notebooks/` (Colab/Kaggle chạy CP-SAT ngân sách dài), `legacy/` (POC cũ) — xem [research/README.md](research/README.md) |
| `dataset/` | Dữ liệu benchmark và bộ wheel-factory, mỗi nguồn có `SOURCE.md` |
| `references/` | Ghi chú trích dẫn và PDF bài báo (`references/pdfs/`) |
| `report/` | Báo cáo đồ án: bản nộp ở gốc, `progress/`, `demo/`, `figures/`, tài liệu phân tích theo chủ đề |
| `docs/` | Tài liệu đặc tả sản phẩm (SRS, use case, kế hoạch triển khai) |

## Chạy bằng Docker Compose

Yêu cầu Docker Engine có Compose v2. Container backend chạy ở chế độ `production` nên bắt buộc có API key (tối thiểu 24 ký tự); key này cũng được build vào frontend làm token gọi API:

```powershell
$env:MNFT_OPERATOR_API_KEY = "local-dev-operator-key-change-me"
docker compose up --build
```

- Web: <http://localhost:3000>
- OpenAPI: <http://localhost:8000/api/v1/docs>
- Health: <http://localhost:8000/api/v1/health>

Container backend chạy Alembic migration trước khi khởi động API và chạy bằng user không phải root. SQLite nằm trong named volume `scheduling-data`.

## Chạy local để phát triển

Yêu cầu Python 3.13 và Node.js 22 trở lên (CI dùng đúng hai phiên bản này). Lệnh backend chạy từ thư mục gốc repo.

Chạy nhanh cả hai bằng một lệnh (sau khi đã `pip install -r backend/requirements-dev.txt`): migrate DB, mở backend ở cửa sổ riêng, chạy frontend ở cửa sổ hiện tại; Ctrl+C tắt cả hai.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Hoặc chạy từng phần — backend:

```powershell
python -m pip install -r backend/requirements-dev.txt
$env:MNFT_DATABASE_URL = "sqlite:///./data/mnft.db"
$env:MNFT_DATABASE_AUTO_CREATE = "false"
python -m alembic -c backend/alembic.ini upgrade head
python -m uvicorn backend.app.main:app --reload --port 8000
```

Frontend, ở terminal khác:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm.cmd ci
npm.cmd run dev
```

Mở web ở <http://localhost:3000>, API docs ở <http://localhost:8000/api/v1/docs>. Ở chế độ development không cần API key.

Khi database chưa có master data, backend tự kiểm tra và import `models/input/wheel_factory.json` trong lúc khởi động. Mở `/` để xem trạng thái vận hành, vào `/planning` để tạo kế hoạch tổng hợp, rồi lập lịch chi tiết từ snapshot của plan. Có thể tắt bootstrap bằng `MNFT_BOOTSTRAP_STANDARD_DATA=false` hoặc đổi nguồn bằng `MNFT_STANDARD_DATA_PATH`.

## Kiểm tra chất lượng

```powershell
python -m pytest backend/tests models/tests -q
python -m unittest research.notebooks.test_cp_sat_cold_notebook
cd frontend
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit
```

## Nguyên tắc vận hành

### Bảo vệ API khi triển khai

- Đặt `MNFT_OPERATOR_API_KEY` (tối thiểu 24 ký tự) để bật Bearer authentication; biến này là bắt buộc khi `MNFT_ENVIRONMENT=production`.
- Có thể đặt thêm `MNFT_READER_API_KEY` cho tài khoản chỉ đọc. Reader chỉ được phép gọi `GET`/`HEAD`; mọi thao tác thay đổi dữ liệu cần operator key.
- Frontend nội bộ có thể nhận token qua `NEXT_PUBLIC_API_TOKEN`. Khi expose ra Internet, dùng SSO/BFF và reverse proxy TLS thay vì phân phối shared token cho trình duyệt.
- `MNFT_MAX_REQUEST_BODY_BYTES` giới hạn kích thước request, mặc định 6 MiB.

- Không expose shared browser token trực tiếp ra Internet; dùng SSO/BFF và reverse proxy/TLS cho môi trường public.
- Backend container cố định một web process vì dispatcher hiện là local bounded executor. `schedule_runs` đã là database-backed job contract; khi cần scale nhiều API replica, thay dispatcher bằng worker queue mà không đổi API/engine adapter.
- Ở `production`, `MNFT_DATABASE_AUTO_CREATE` bắt buộc `false`; schema chỉ được thay đổi qua Alembic.
- Không sửa trực tiếp dữ liệu của run cũ. Input snapshot và hash là bằng chứng tái lập.
