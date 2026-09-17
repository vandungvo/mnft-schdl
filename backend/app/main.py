from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.modules.explanation.routers import router as explanation_router
from app.modules.kpi.routers import router as kpi_router
from app.modules.master_data import models as master_data_models  # noqa: F401
from app.modules.master_data.routers import router as master_data_router
from app.modules.planning import models as planning_models  # noqa: F401
from app.modules.planning.routers import router as planning_router
from app.modules.scheduling.routers import router as scheduling_router

app = FastAPI(title="Explainable Scheduling Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # MVP: tạo bảng trực tiếp từ model khi khởi động (dev only). Alembic
    # migration (backend/alembic/) là nguồn sự thật cho schema — dùng
    # `alembic upgrade head` khi cần versioned migration thực sự.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(master_data_router)
app.include_router(planning_router)
app.include_router(scheduling_router)
app.include_router(explanation_router)
app.include_router(kpi_router)
