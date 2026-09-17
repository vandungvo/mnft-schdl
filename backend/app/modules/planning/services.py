import hashlib
import json

from sqlalchemy.orm import Session

from app.engine import aggregate_planning
from app.modules.master_data import services as master_data_services
from app.modules.planning import models


def _build_input_from_master_data(db: Session) -> aggregate_planning.AggregatePlanningInput:
    cfg = aggregate_planning.AggregatePlanningInput()

    orders = master_data_services.list_orders(db)
    if orders:
        cfg.orders = [(o.type, o.due_day, o.qty) for o in orders]

    snapshots = master_data_services.list_latest_inventory_snapshots(db)
    for s in snapshots:
        cfg.wip_init[s.product_type] = s.wip_qty
        cfg.fg_init[s.product_type] = s.fg_qty
        cfg.wip_min[s.product_type] = s.wip_min
        cfg.fg_min[s.product_type] = s.fg_min

    return cfg


def run_aggregate_planning(db: Session) -> models.ScheduleRun:
    cfg = _build_input_from_master_data(db)
    result = aggregate_planning.build_and_solve(cfg)

    input_payload = {
        "orders": cfg.orders,
        "wip_init": cfg.wip_init,
        "fg_init": cfg.fg_init,
        "wip_min": cfg.wip_min,
        "fg_min": cfg.fg_min,
    }
    input_hash = hashlib.sha256(json.dumps(input_payload, sort_keys=True).encode()).hexdigest()

    run = models.ScheduleRun(run_type="aggregate", input_hash=input_hash, result_json=json.dumps(result))
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def get_run(db: Session, run_id: int) -> models.ScheduleRun | None:
    return db.query(models.ScheduleRun).filter(models.ScheduleRun.id == run_id).first()


def run_to_read(run: models.ScheduleRun) -> dict:
    return {
        "id": run.id,
        "run_type": run.run_type,
        "created_at": run.created_at,
        "result": json.loads(run.result_json),
    }
