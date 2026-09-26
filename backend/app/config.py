from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from MNFT_* environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MNFT_",
        extra="ignore",
        case_sensitive=False,
    )

    application_name: str = "Reasonable Scheduling Agent API"
    environment: Literal["development", "test", "production"] = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./data/mnft.db"
    database_auto_create: bool = True
    bootstrap_standard_data: bool = True
    standard_data_path: Path = Path("models/input/wheel_factory.json")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    solver_max_concurrent_jobs: int = Field(default=1, ge=1, le=8)
    solver_default_budget_seconds: float = Field(default=30, gt=0, le=900)
    solver_max_budget_seconds: float = Field(default=900, gt=0, le=3600)
    run_jobs_inline: bool = False
    log_level: str = "INFO"
    operator_api_key: str | None = Field(default=None, min_length=24)
    reader_api_key: str | None = Field(default=None, min_length=24)
    max_request_body_bytes: int = Field(default=6 * 1024 * 1024, ge=1024, le=50 * 1024 * 1024)

    @model_validator(mode="after")
    def validate_production_safety(self) -> Settings:
        if self.environment == "production" and self.database_auto_create:
            raise ValueError(
                "MNFT_DATABASE_AUTO_CREATE must be false in production; apply Alembic migrations"
            )
        if self.environment == "production" and not self.operator_api_key:
            raise ValueError("MNFT_OPERATOR_API_KEY is required in production")
        if self.operator_api_key and self.operator_api_key == self.reader_api_key:
            raise ValueError("Operator and reader API keys must be different")
        if self.solver_default_budget_seconds > self.solver_max_budget_seconds:
            raise ValueError("Default solver budget cannot exceed the maximum budget")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
