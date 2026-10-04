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

Explanation và what-if/re-scheduling sẽ được bổ sung theo [implementation plan](docs/_product/implementation-plan.md).

## Chạy bằng Docker Compose

Yêu cầu Docker Engine có Compose v2:

```powershell
docker compose up --build
```

- Web: <http://localhost:3000>
- OpenAPI: <http://localhost:8000/api/v1/docs>
- Health: <http://localhost:8000/api/v1/health>

Container backend chạy Alembic migration trước khi khởi động API và chạy bằng user không phải root. SQLite nằm trong named volume `scheduling-data`.

## Chạy local để phát triển

Backend:

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

Khi database chưa có master data, backend tự kiểm tra và import `models/input/wheel_factory.json` trong lúc khởi động. Mở `/` để xem trạng thái vận hành, vào `/planning` để tạo kế hoạch tổng hợp, rồi lập lịch chi tiết từ snapshot của plan. Có thể tắt bootstrap bằng `MNFT_BOOTSTRAP_STANDARD_DATA=false` hoặc đổi nguồn bằng `MNFT_STANDARD_DATA_PATH`.

## Kiểm tra chất lượng

```powershell
python -m pytest backend/tests models/tests -q
cd frontend
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
