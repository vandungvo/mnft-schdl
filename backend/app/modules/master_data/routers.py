from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.modules.master_data import schemas, services

router = APIRouter(tags=["master-data"])


@router.post("/orders", response_model=schemas.OrderRead)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    return services.create_order(db, payload)


@router.get("/orders", response_model=list[schemas.OrderRead])
def list_orders(db: Session = Depends(get_db)):
    return services.list_orders(db)


@router.post("/machines", response_model=schemas.MachineRead)
def create_machine(payload: schemas.MachineCreate, db: Session = Depends(get_db)):
    return services.create_machine(db, payload)


@router.get("/machines", response_model=list[schemas.MachineRead])
def list_machines(db: Session = Depends(get_db)):
    return services.list_machines(db)


@router.post("/inventory/snapshot", response_model=schemas.InventorySnapshotRead)
def create_inventory_snapshot(payload: schemas.InventorySnapshotCreate, db: Session = Depends(get_db)):
    return services.create_inventory_snapshot(db, payload)


@router.get("/inventory/snapshot", response_model=list[schemas.InventorySnapshotRead])
def list_inventory_snapshots(db: Session = Depends(get_db)):
    return services.list_latest_inventory_snapshots(db)
