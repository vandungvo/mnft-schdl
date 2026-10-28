from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def scheduling_input() -> dict:
    return json.loads((ROOT / "models/input/wheel_factory.json").read_text(encoding="utf-8"))


@pytest.fixture
def client(tmp_path: Path):
    settings = Settings(
        environment="test",
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        database_auto_create=True,
        run_jobs_inline=True,
        solver_default_budget_seconds=1,
        solver_max_budget_seconds=10,
        log_level="WARNING",
        bootstrap_factory=False,
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def factory_client(tmp_path: Path):
    """App with only the sample factory (5-stage plant, order book, first period)."""
    settings = Settings(
        environment="test",
        database_url=f"sqlite:///{(tmp_path / 'factory.db').as_posix()}",
        database_auto_create=True,
        run_jobs_inline=True,
        solver_default_budget_seconds=1,
        solver_max_budget_seconds=10,
        log_level="WARNING",
        bootstrap_standard_data=False,
        bootstrap_factory=True,
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client
