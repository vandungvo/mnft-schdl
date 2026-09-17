from sqlalchemy.orm import Session

from app.engine import explanation as explanation_engine
from app.modules.planning import services as planning_services


def bottleneck_for_run(db: Session, run_id: int) -> list[str]:
    run = planning_services.get_run(db, run_id)
    if run is None:
        raise ValueError(f"schedule_run {run_id} not found")

    result = planning_services.run_to_read(run)["result"]

    if run.run_type == "aggregate":
        # TODO: đọc cast_cap_per_day/cnc_cap_per_day thực tế đã dùng cho run này
        # (hiện đang giả định giá trị mặc định của AggregatePlanningInput vì
        # schedule_runs chưa lưu lại tham số công suất đã dùng).
        from app.engine.aggregate_planning import AggregatePlanningInput

        defaults = AggregatePlanningInput()
        return explanation_engine.bottleneck_from_aggregate_plan(
            result, defaults.cast_cap_per_day, defaults.cnc_cap_per_day
        )

    # TODO (Production Scheduling chưa implement service/router): dùng
    # explanation_engine.bottleneck_summary(result) một khi `run_type ==
    # "detailed"` có kết quả job-level (per_machine/orders) như mô tả trong
    # docstring của app/engine/explanation.py.
    raise ValueError(f"bottleneck chưa hỗ trợ run_type={run.run_type!r}")
