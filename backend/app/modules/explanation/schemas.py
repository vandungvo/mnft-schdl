from pydantic import BaseModel


class BottleneckRead(BaseModel):
    run_id: int
    lines: list[str]
