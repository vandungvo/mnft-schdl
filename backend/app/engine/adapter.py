from __future__ import annotations

import copy
import platform
import sys
import time
from dataclasses import dataclass
from typing import Any

import ortools
from models.common.evaluate import evaluate, validate
from models.common.experiment import execute


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
    ) -> EngineResult:
        started = time.perf_counter()
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
            operations=operations,
            solver_status=solver_status,
            solver_metadata=metadata,
            validation=validation,
            metrics=metrics,
        )
