from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AggregateRunRequest(BaseModel):
    """Body rỗng cho MVP: service tự đọc `orders` + `inventory_snapshot` mới
    nhất từ Master Data. TODO: cho phép override days/horizon qua body khi
    UI Planning cần chọn kỳ tháng/quý cụ thể."""

    pass


class AggregateRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_type: str
    created_at: datetime
    result: dict
