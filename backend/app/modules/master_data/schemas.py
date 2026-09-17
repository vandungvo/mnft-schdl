from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class OrderCreate(BaseModel):
    type: str
    qty: int
    due_day: int


class OrderRead(OrderCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class MachineCreate(BaseModel):
    name: str
    stage: str
    daily_capacity: int
    eligible_product_types: list[str] = []


class MachineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    stage: str
    daily_capacity: int
    eligible_product_types: list[str]


class InventorySnapshotCreate(BaseModel):
    product_type: str
    wip_qty: int = 0
    fg_qty: int = 0
    wip_min: int = 0
    fg_min: int = 0
    snapshot_date: date


class InventorySnapshotRead(InventorySnapshotCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
