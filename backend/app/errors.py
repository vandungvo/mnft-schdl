from __future__ import annotations

from typing import Any


class ApplicationError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class RunNotFoundError(ApplicationError):
    def __init__(self, run_id: str) -> None:
        super().__init__("RUN_NOT_FOUND", f"Schedule run '{run_id}' was not found", status_code=404)
