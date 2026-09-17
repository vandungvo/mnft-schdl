from sqlalchemy.orm import Session

from app.modules.master_data import models, schemas


def create_order(db: Session, payload: schemas.OrderCreate) -> models.Order:
    order = models.Order(type=payload.type, qty=payload.qty, due_day=payload.due_day)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def list_orders(db: Session) -> list[models.Order]:
    return db.query(models.Order).order_by(models.Order.id).all()


def create_machine(db: Session, payload: schemas.MachineCreate) -> schemas.MachineRead:
    machine = models.Machine(name=payload.name, stage=payload.stage, daily_capacity=payload.daily_capacity)
    db.add(machine)
    db.flush()
    for product_type in payload.eligible_product_types:
        db.add(models.MachineEligibility(machine_id=machine.id, product_type=product_type))
    db.commit()
    db.refresh(machine)
    return _to_machine_read(db, machine)


def list_machines(db: Session) -> list[schemas.MachineRead]:
    machines = db.query(models.Machine).order_by(models.Machine.id).all()
    return [_to_machine_read(db, m) for m in machines]


def _to_machine_read(db: Session, machine: models.Machine) -> schemas.MachineRead:
    eligibility = (
        db.query(models.MachineEligibility.product_type)
        .filter(models.MachineEligibility.machine_id == machine.id)
        .all()
    )
    return schemas.MachineRead(
        id=machine.id,
        name=machine.name,
        stage=machine.stage,
        daily_capacity=machine.daily_capacity,
        eligible_product_types=[e[0] for e in eligibility],
    )


def create_inventory_snapshot(
    db: Session, payload: schemas.InventorySnapshotCreate
) -> models.InventorySnapshot:
    snapshot = models.InventorySnapshot(**payload.model_dump())
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def latest_inventory_snapshot(db: Session, product_type: str) -> models.InventorySnapshot | None:
    return (
        db.query(models.InventorySnapshot)
        .filter(models.InventorySnapshot.product_type == product_type)
        .order_by(models.InventorySnapshot.snapshot_date.desc(), models.InventorySnapshot.id.desc())
        .first()
    )


def list_latest_inventory_snapshots(db: Session) -> list[models.InventorySnapshot]:
    """1 snapshot mới nhất cho mỗi product_type — dùng làm tồn kho đầu kỳ cho Planning."""
    product_types = [row[0] for row in db.query(models.InventorySnapshot.product_type).distinct()]
    return [s for pt in product_types if (s := latest_inventory_snapshot(db, pt)) is not None]


def get_changeover_matrix(db: Session) -> list[models.ChangeoverMatrix]:
    return db.query(models.ChangeoverMatrix).all()


def upsert_changeover(db: Session, type_a: str, type_b: str, setup_time: int) -> models.ChangeoverMatrix:
    existing = (
        db.query(models.ChangeoverMatrix)
        .filter(models.ChangeoverMatrix.type_a == type_a, models.ChangeoverMatrix.type_b == type_b)
        .first()
    )
    if existing:
        existing.setup_time = setup_time
    else:
        existing = models.ChangeoverMatrix(type_a=type_a, type_b=type_b, setup_time=setup_time)
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing
