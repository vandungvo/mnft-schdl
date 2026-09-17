from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.modules.explanation import schemas, services

router = APIRouter(prefix="/explain", tags=["explanation"])


@router.get("/bottleneck", response_model=schemas.BottleneckRead)
def bottleneck(run_id: int, db: Session = Depends(get_db)):
    try:
        lines = services.bottleneck_for_run(db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return schemas.BottleneckRead(run_id=run_id, lines=lines)
