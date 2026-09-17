"""`schedule_runs` / `schedule_run_results` (mục 6) — audit trail dùng chung bởi
Production Planning (run_type="aggregate") và Production Scheduling
(run_type="detailed"). Đặt ở module `planning` vì Planning là module tạo run
đầu tiên trong pipeline; `scheduling` và `explanation` import lại từ đây thay
vì định nghĩa bảng riêng (tránh trùng bảng / import vòng).

Lệch nhẹ so với mục 6: thêm cột `result_json` trên `schedule_runs` để lưu
đầy đủ output của Aggregate Planning (nhiều trường hơn — cast/cnc qty, wip,
fg, backlog... — so với các cột cố định của `schedule_run_results`, vốn được
thiết kế cho Gantt của Detailed Scheduling). `schedule_run_results` giữ đúng
mục 6, dùng cho tầng Detailed (TODO — populate khi implement
`app/modules/scheduling`).
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ScheduleRun(Base):
    __tablename__ = "schedule_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_type: Mapped[str] = mapped_column(String(16), nullable=False)  # aggregate | detailed
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ScheduleRunResult(Base):
    """TODO: chưa được ghi bởi bất kỳ service nào — dự trù cho
    `app/modules/scheduling` (Detailed Scheduling, horizon 2 tuần) ở các tuần
    kế tiếp (roadmap tuần 2-3, 7)."""

    __tablename__ = "schedule_run_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("schedule_runs.id"), nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), nullable=True)
    job_name: Mapped[str] = mapped_column(String(64), nullable=False)
    start: Mapped[int] = mapped_column(Integer, nullable=False)
    end: Mapped[int] = mapped_column(Integer, nullable=False)
    # TODO: FK -> shifts.id khi bảng `shifts` được thêm (mục 6 nợ lại).
    shift_id: Mapped[int] = mapped_column(Integer, nullable=True)
