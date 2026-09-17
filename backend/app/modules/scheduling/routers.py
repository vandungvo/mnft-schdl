"""TODO (roadmap tuần 2-3, 7): Production Scheduling — Tầng 2 Detailed
(horizon 2 tuần, Gantt đúc→CNC→sơn→QC).

Engine đã được bọc sẵn ở `app/engine/detailed_scheduling.py`
(`run_two_weeks`, `run_day`, `schedule_stage`) — chưa có service/router gọi
tới vì API tối thiểu đêm nay (mục 7 rút gọn) chỉ yêu cầu
`POST /scheduling/detailed/run` + `GET /scheduling/detailed/{run_id}` ở mức
"còn lại", không nằm trong 5 endpoint bắt buộc. Khi implement:
  - service đọc `machines`/`machine_eligibility`/`changeover_matrix` (Master
    Data) để build `DetailedSchedulingConfig` thay vì dùng default.
  - service đọc 1 `schedule_runs` (run_type="aggregate") làm input, giống
    `production_planning_2weeks.py` -> `detailed_day_schedule.py`.
  - lưu output vào `schedule_run_results` (mục 6) để Explanation/Gantt đọc
    lại không cần solve lại.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/scheduling", tags=["production-scheduling"])
