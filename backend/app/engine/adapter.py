from __future__ import annotations

import copy
import platform
import sys
import time
from dataclasses import dataclass
from typing import Any

import ortools
from models.common import evaluate as evaluate_v4
from models.common.experiment import execute
from models.common.instance import upgrade_input
from models.common.stage_runs import evaluate as evaluate_v5
from models.common.stage_runs.manual import repair

# Re-optimisation around a planner's edit (see backend/app/manual_edits.py): not a
# method a user can pick, it needs the edit and its pins, carried in the run's
# solver_metadata["repair"] from creation until the run completes.
REPAIR_ALGORITHM = "cp_repair"

# Columns of schedule_operations; anything else an engine returns stays out of the row.
OPERATION_FIELDS = (
    "stage", "machine", "block_start", "start", "end", "setup_minutes",
    "maintenance_minutes", "cycles_after", "mold", "window", "shift",
)


def _checker(input_data: dict[str, Any]):  # type: ignore[no-untyped-def]
    """(validate, evaluate) of the production model the input belongs to."""
    module = evaluate_v5 if input_data.get("schema_version") == 5 else evaluate_v4
    return module.validate, module.evaluate


def _stored_rows(operations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Engine rows -> schedule_operations rows. Schema 5 names a row by its run and
    item; it is stored in `lot` (the run id) and `item`."""
    rows = []
    for op in operations:
        row = {key: op.get(key) for key in OPERATION_FIELDS}
        row["lot"] = op["run"] if "run" in op else op["lot"]
        row["item"] = op.get("item")
        rows.append(row)
    return rows


@dataclass(frozen=True, slots=True)
class EngineResult:
    operations: list[dict[str, Any]]
    solver_status: str
    solver_metadata: dict[str, Any]
    validation: dict[str, Any]
    metrics: dict[str, Any]


class InvalidScheduleError(RuntimeError):
    def __init__(self, validation: dict[str, Any]) -> None:
        super().__init__("Solver returned a schedule that failed independent validation")
        self.validation = validation


class NoScheduleError(RuntimeError):
    def __init__(self, solver_status: str, metadata: dict[str, Any]) -> None:
        super().__init__(f"Solver did not return a schedule (status={solver_status})")
        self.solver_status = solver_status
        self.metadata = metadata


class SchedulingEngine:
    """Pure adapter around the research engine with mandatory independent validation."""

    def run(
        self,
        input_data: dict[str, Any],
        *,
        algorithm: str,
        time_budget_seconds: float,
        seed: int,
        options: dict[str, Any] | None = None,
    ) -> EngineResult:
        # Runs created before schema_version 4 keep their stored v3 snapshot
        # untouched (reproducibility); it is relabelled explicitly here.
        input_data = upgrade_input(input_data)
        started = time.perf_counter()
        if algorithm == REPAIR_ALGORITHM:
            if not options or not options.get("rows"):
                raise ValueError("cp_repair needs the edited schedule and its pins (solver_metadata.repair)")
            operations, metadata = repair(
                copy.deepcopy(input_data), copy.deepcopy(options["rows"]), set(options.get("fixed", [])),
                seconds=time_budget_seconds, seed=seed,
            )
        else:
            operations, metadata = execute(
                copy.deepcopy(input_data), algorithm, time_budget_seconds, seed
            )
        elapsed = time.perf_counter() - started
        solver_status = str(metadata.get("status", "UNKNOWN"))
        metadata = {
            **metadata,
            "algorithm_seconds": elapsed,
            "environment": {
                "python": sys.version,
                "ortools": ortools.__version__,
                "platform": platform.platform(),
                "processor": platform.processor(),
                "workers": 1,
            },
        }
        if not operations:
            raise NoScheduleError(solver_status, metadata)

        validate, evaluate = _checker(input_data)
        validation = validate(input_data, operations)
        if not validation["valid"]:
            raise InvalidScheduleError(validation)

        metrics, _details = evaluate(input_data, operations)
        solver_objective = metadata.get("solver_objective")
        if solver_objective is not None and abs(metrics["objective"] - solver_objective) > 0.01:
            raise InvalidScheduleError(
                {
                    "valid": False,
                    "errors": [
                        "Solver objective disagrees with the independent evaluator: "
                        f"{solver_objective} != {metrics['objective']}"
                    ],
                }
            )
        return EngineResult(
            operations=_stored_rows(operations),
            solver_status=solver_status,
            solver_metadata=metadata,
            validation=validation,
            metrics=metrics,
        )
