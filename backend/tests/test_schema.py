from __future__ import annotations

from copy import deepcopy

import pytest
from pydantic import ValidationError

from backend.app.schemas import SchedulingInput


def test_reference_input_satisfies_strict_contract(scheduling_input) -> None:
    parsed = SchedulingInput.model_validate(scheduling_input)
    assert len(parsed.lots) == 48
    assert len(parsed.machines) == 7


def test_cross_entity_contract_rejects_unknown_product(scheduling_input) -> None:
    invalid = deepcopy(scheduling_input)
    invalid["lots"][0]["product"] = "UNKNOWN"
    with pytest.raises(ValidationError, match="scheduling contract"):
        SchedulingInput.model_validate(invalid)


def test_contract_rejects_unknown_fields(scheduling_input) -> None:
    invalid = deepcopy(scheduling_input)
    invalid["unexpected"] = True
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        SchedulingInput.model_validate(invalid)


def test_contract_rejects_invalid_order_timing(scheduling_input) -> None:
    invalid = deepcopy(scheduling_input)
    invalid["orders"][0]["due"] = invalid["orders"][0]["release"] - 1

    with pytest.raises(ValidationError, match="release must be less than or equal to due"):
        SchedulingInput.model_validate(invalid)


def test_contract_rejects_order_outside_horizon(scheduling_input) -> None:
    invalid = deepcopy(scheduling_input)
    invalid["orders"][0]["due"] = invalid["horizon"] + 1

    with pytest.raises(ValidationError, match="due must be within the scheduling horizon"):
        SchedulingInput.model_validate(invalid)
