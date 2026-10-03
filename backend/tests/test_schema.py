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


def _downgrade_to_v3(data: dict) -> dict:
    """Rebuild the pre-schema-4 shape: BTP-stage machines keyed by final product."""
    legacy = deepcopy(data)
    legacy["schema_version"] = 3
    for machine in legacy["machines"].values():
        stage = machine["stage"]
        if stage == "qc":
            continue
        back = {codes[stage]: product for product, codes in legacy["btp_routing"].items()}
        relabel = lambda key, back=back: back.get(key, key)  # noqa: E731
        rates = machine["minutes_per_unit"]
        machine["minutes_per_unit"] = {relabel(k): v for k, v in rates.items()}
        machine["setup"] = {
            relabel(prev): {relabel(k): v for k, v in row.items()}
            for prev, row in machine["setup"].items()
        }
        machine["initial_product"] = relabel(machine["initial_product"])
    return legacy


def test_legacy_v3_snapshot_is_relabelled_explicitly(scheduling_input) -> None:
    legacy = _downgrade_to_v3(scheduling_input)
    parsed = SchedulingInput.model_validate(legacy)
    assert parsed.schema_version == 4
    assert parsed.to_engine_dict()["machines"] == scheduling_input["machines"]
    assert legacy["schema_version"] == 3  # stored snapshot is never mutated


def test_legacy_v3_with_conflicting_shared_code_is_rejected(scheduling_input) -> None:
    legacy = _downgrade_to_v3(scheduling_input)
    # Share one cast blank between two products whose v3 cast rows still differ.
    legacy["btp_routing"]["F_BLACK"]["cast"] = legacy["btp_routing"]["F_SILVER"]["cast"]
    with pytest.raises(ValidationError, match="Cannot upgrade to schema_version 4"):
        SchedulingInput.model_validate(legacy)
