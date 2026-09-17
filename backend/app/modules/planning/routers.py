from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.modules.planning import schemas, services

router = APIRouter(prefix="/planning", tags=["production-planning"])


@router.post("/aggregate/run", response_model=schemas.AggregateRunRead)
def run_aggregate(db: Session = Depends(get_db)):
    run = services.run_aggregate_planning(db)
    return services.run_to_read(run)


@router.get("/aggregate/{run_id}", response_model=schemas.AggregateRunRead)
def get_aggregate_run(run_id: int, db: Session = Depends(get_db)):
    run = services.get_run(db, run_id)
    if run is None or run.run_type != "aggregate":
        raise HTTPException(status_code=404, detail="Aggregate run not found")
    return services.run_to_read(run)
