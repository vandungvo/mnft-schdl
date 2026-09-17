"""TODO (roadmap tuần 8): KPI / Report — `GET /kpi/summary` (tardiness cost,
holding cost, utilization) đọc từ `schedule_run_results` / kết quả run đã lưu.
Chưa implement trong đêm nay (không nằm trong 5 endpoint tối thiểu mục 7)."""
from fastapi import APIRouter

router = APIRouter(prefix="/kpi", tags=["kpi"])
