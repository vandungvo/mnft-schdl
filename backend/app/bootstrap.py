from __future__ import annotations

import logging
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .master_data import MasterDataService
from .models import MasterDataset
from .schemas import MasterDatasetDetail, SchedulingInput

logger = logging.getLogger(__name__)


def bootstrap_standard_data(
    session: Session,
    source_path: Path,
) -> MasterDatasetDetail | None:
    """Import the versioned standard scenario when no master data exists."""
    dataset_count = session.scalar(select(func.count()).select_from(MasterDataset)) or 0
    if dataset_count > 0:
        logger.info(
            "Master data bootstrap skipped because data already exists",
            extra={"dataset_count": dataset_count},
        )
        return None

    try:
        raw = source_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"Cannot read standard master data at '{source_path}'") from exc

    try:
        scheduling_input = SchedulingInput.model_validate_json(raw)
    except ValidationError as exc:
        raise RuntimeError(f"Standard master data at '{source_path}' is invalid") from exc

    dataset = MasterDataService(session).import_input(scheduling_input)
    logger.info(
        "Imported standard master data",
        extra={"dataset_id": dataset.id, "dataset_name": dataset.name},
    )
    return dataset
