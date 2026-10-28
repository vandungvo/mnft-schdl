"""Factories, order book and planning periods (the planner-facing workflow)."""

from __future__ import annotations

import base64
import io
import json
from pathlib import Path

from openpyxl import Workbook

from backend.app.factory_model import compile_period, schedule_state, split_document

ROOT = Path(__file__).resolve().parents[2]
TWO_WEEKS = ROOT / "dataset" / "wheel-factory-2weeks"
API = "/api/v1"


def _factory(client) -> dict:
    return client.get(f"{API}/factories").json()["items"][0]


def _period(client) -> dict:
    return client.get(f"{API}/periods").json()["items"][0]


def _run_and_commit(client, period: dict, algorithm: str = "edd") -> dict:
    run = client.post(
        f"{API}/schedule-runs",
        json={
            "dataset_id": period["dataset_id"],
            "algorithm": algorithm,
            "seed": 11,
            "time_budget_seconds": 2,
        },
    ).json()
    assert run["status"] == "SUCCEEDED", run
    response = client.post(
        f"{API}/master-data/datasets/{period['dataset_id']}/decisions",
        json={
            "run_id": run["id"],
            "alternative": algorithm.upper(),
            "policy": "test",
            "score": "1",
            "late": 0,
            "shortfall": 0,
            "shifts": 1,
            "reason": "test commit",
        },
    )
    assert response.status_code == 201
    return run


def test_split_and_compile_reproduce_the_reference_dataset() -> None:
    """Plant + period compiled back give exactly the research model input."""
    reference = json.loads((TWO_WEEKS / "model_input.json").read_text(encoding="utf-8"))
    for source in ("raw_input.json", "model_input.json"):
        split = split_document(json.loads((TWO_WEEKS / source).read_text(encoding="utf-8")))
        assert split.config.weekly_off == [6]  # Sundays closed for the whole plant
        result = compile_period(
            split.config,
            split.start_date,
            split.days,
            split.inputs,
            name=reference["name"],
            derived_from=reference["derived_from"],
        )
        assert result.ok, [i.as_dict() for i in result.issues]
        assert result.model == reference


def test_bootstrap_creates_factory_book_and_compiled_period(factory_client) -> None:
    factory = _factory(factory_client)
    assert factory["counts"] == {"products": 4, "machines": 8, "open_orders": 28, "periods": 1}
    period = _period(factory_client)
    assert period["status"] == "ready"
    assert period["counts"]["scheduled"] == 24 and period["counts"]["long_term"] == 4
    detail = factory_client.get(f"{API}/periods/{period['id']}").json()
    assert detail["issues"] == []
    assert {row["stage"] for row in detail["load"]} == {"cast", "heat", "machining", "paint", "qc"}
    assert detail["book_sync"] == {"added": [], "changed": [], "removed": []}

    # The compiled scenario is owned by the period: listed apart, never edited directly.
    owned = factory_client.get(f"{API}/master-data/datasets", params={"owner": "periods"}).json()
    assert owned["total"] == 1 and owned["items"][0]["owner_period_id"] == period["id"]
    assert (
        factory_client.get(f"{API}/master-data/datasets", params={"owner": "standalone"}).json()[
            "total"
        ]
        == 0
    )
    dataset = factory_client.get(f"{API}/master-data/datasets/{period['dataset_id']}").json()
    blocked = factory_client.put(
        f"{API}/master-data/datasets/{period['dataset_id']}",
        json={"input": dataset["input"], "expected_revision": dataset["revision"]},
    )
    assert (
        blocked.status_code == 409 and blocked.json()["error"]["code"] == "SCENARIO_OWNED_BY_PERIOD"
    )
    assert (
        factory_client.delete(f"{API}/master-data/datasets/{period['dataset_id']}").status_code
        == 409
    )


def test_editing_inputs_recompiles_and_bad_input_keeps_last_good_scenario(factory_client) -> None:
    period = factory_client.get(f"{API}/periods/{_period(factory_client)['id']}").json()
    inputs = period["inputs"]
    inputs["orders"][0]["quantity"] += 8
    updated = factory_client.put(
        f"{API}/periods/{period['id']}/inputs",
        json={"expected_revision": period["revision"], "inputs": inputs},
    ).json()
    assert updated["revision"] == 2 and updated["compiled_revision"] == 2
    assert updated["dataset_revision"] == period["dataset_revision"] + 1

    stale = factory_client.put(
        f"{API}/periods/{period['id']}/inputs", json={"expected_revision": 1, "inputs": inputs}
    )
    assert stale.status_code == 409

    inputs["orders"][0]["product"] = "F_SLIVER"
    broken = factory_client.put(
        f"{API}/periods/{period['id']}/inputs", json={"expected_revision": 2, "inputs": inputs}
    ).json()
    assert broken["status"] == "needs_fix"
    assert [i["code"] for i in broken["issues"] if i["severity"] == "error"] == ["UNKNOWN_PRODUCT"]
    assert broken["dataset_revision"] == updated["dataset_revision"]  # last good scenario kept


def test_order_import_csv_preview_and_commit(factory_client) -> None:
    factory = _factory(factory_client)
    csv = (
        "Mã đơn;Sản phẩm;Số lượng;Hạn giao;Giờ giao;Ưu tiên;Khách hàng\n"
        "N001;f_silver;1.200;20/10/2026;14:00;Gấp;Honda\n"
        "N002;F_SLIVER;40;2026-10-21;;;\n"
        "O001;F_SILVER;60;06/10/2026;12:00;4;\n"
        "N003;R_BLACK;abc;22/10/2026;;Thấp;\n"
    )
    url = f"{API}/factories/{factory['id']}/orders/import"
    preview = factory_client.post(url, json={"format": "csv", "content": csv}).json()
    assert preview["missing_columns"] == []
    rows = {r["values"].get("code"): r for r in preview["rows"]}
    assert rows["N001"]["action"] == "add"
    assert rows["N001"]["values"] == {
        "code": "N001",
        "product": "F_SILVER",
        "quantity": 1200,
        "due": "2026-10-20T14:00",
        "priority": 4,
        "pickup": "at_due",
        "customer": "Honda",
        "note": None,
    }
    assert rows["N002"]["action"] == "invalid" and "F_SILVER" in rows["N002"]["errors"][0]["vi"]
    assert rows["O001"]["action"] == "update" and rows["O001"]["changes"] == ["quantity"]
    assert rows["N003"]["action"] == "invalid"
    assert preview["summary"]["add"] == 1 and preview["summary"]["invalid"] == 2

    refused = factory_client.post(url, json={"format": "csv", "content": csv, "commit": True})
    assert refused.status_code == 422
    done = factory_client.post(
        url, json={"format": "csv", "content": csv, "commit": True, "skip_invalid": True}
    ).json()
    assert done["committed"]
    book = factory_client.get(
        f"{API}/factories/{factory['id']}/orders", params={"search": "N00"}
    ).json()
    assert [o["code"] for o in book["items"]] == ["N001"]

    # The period sees the new and changed book orders and can take them in.
    period = factory_client.get(f"{API}/periods/{_period(factory_client)['id']}").json()
    assert period["book_sync"]["added"] == ["N001"]
    assert period["book_sync"]["changed"] == [{"code": "O001", "fields": ["quantity"]}]
    synced = factory_client.post(
        f"{API}/periods/{period['id']}/book-sync", params={"expected_revision": period["revision"]}
    ).json()
    assert synced["book_sync"] == {"added": [], "changed": [], "removed": []}
    codes = {o["code"]: o for o in synced["inputs"]["orders"]}
    assert codes["O001"]["quantity"] == 60 and "N001" in codes


def test_order_import_xlsx_and_replace_open(factory_client) -> None:
    factory = _factory(factory_client)
    book = Workbook()
    sheet = book.active
    sheet.append(["Order", "Product", "Qty", "Due date"])
    from datetime import datetime

    sheet.append(["X1", "R_SILVER", 48, datetime(2026, 10, 30, 16, 0)])
    buffer = io.BytesIO()
    book.save(buffer)
    content = base64.b64encode(buffer.getvalue()).decode()
    result = factory_client.post(
        f"{API}/factories/{factory['id']}/orders/import",
        json={"format": "xlsx", "content": content, "mode": "replace_open", "commit": True},
    ).json()
    assert result["summary"]["add"] == 1 and result["summary"]["cancel"] == 28
    open_orders = factory_client.get(
        f"{API}/factories/{factory['id']}/orders", params={"status": "open"}
    ).json()
    assert [o["code"] for o in open_orders["items"]] == ["X1"]
    assert open_orders["items"][0]["due"] == "2026-10-30T16:00"


def test_commit_reschedule_variant_and_rollover(factory_client) -> None:
    period = _period(factory_client)
    run = _run_and_commit(factory_client, period)
    assert factory_client.get(f"{API}/periods/{period['id']}").json()["status"] == "committed"

    state = factory_client.get(
        f"{API}/periods/{period['id']}/state", params={"at": "2026-10-08T10:00"}
    ).json()
    assert state["run_id"] == run["id"] and 0 < state["started"] < state["total_runs"]

    breakdown = {
        "id": "B1",
        "machine": "CNC_1",
        "start": "2026-10-08T10:00",
        "end": "2026-10-09T10:00",
        "kind": "breakdown",
        "note": "hỏng trục chính",
    }
    child = factory_client.post(
        f"{API}/periods/{period['id']}/reschedule",
        json={"cutoff": "2026-10-08T10:00", "exceptions": [breakdown]},
    ).json()
    assert (
        child["kind"] == "reschedule"
        and child["start_date"] == "2026-10-08"
        and child["days"] == 11
    )
    assert child["status"] == "ready", child["issues"]
    assert child["inputs"]["frozen_until"] == 600
    assert set(child["inputs"]["busy_until"]) == set(state["busy_until"])
    assert len(child["inputs"]["orders"]) == 28 - len(state["delivered"])
    # The replanned rest of the period is solvable as is.
    _run_and_commit(factory_client, child)

    variant = factory_client.post(
        f"{API}/periods/{period['id']}/variants", json={"label": "Thêm đơn gấp"}
    ).json()
    assert variant["kind"] == "variant" and variant["status"] == "ready"
    assert {p["kind"] for p in variant["family"]} == {"regular", "reschedule", "variant"}

    following = factory_client.post(f"{API}/periods/{period['id']}/rollover", json={}).json()
    assert following["start_date"] == "2026-10-19" and following["kind"] == "regular"
    assert following["inputs"]["opening"]["projected"] == {
        key: following["inputs"]["opening"][key] for key in ("finished", "btp", "molds")
    }
    assert following["status"] == "ready", following["issues"]
    # The executed plan was the reschedule: its deliveries closed the book orders.
    factory = _factory(factory_client)
    delivered = factory_client.get(
        f"{API}/factories/{factory['id']}/orders", params={"status": "delivered"}
    ).json()
    assert delivered["total"] == 24
    closed = factory_client.get(f"{API}/periods/{period['id']}").json()
    assert closed["status"] == "closed"
    edit = factory_client.put(
        f"{API}/periods/{period['id']}/inputs",
        json={"expected_revision": closed["revision"], "inputs": closed["inputs"]},
    )
    assert edit.status_code == 409


def test_factory_versions_and_effective_dates(factory_client) -> None:
    factory = factory_client.get(f"{API}/factories/{_factory(factory_client)['id']}").json()
    config = factory["config"]
    config["machines"]["CNC_2"]["minutes_per_unit"] = {"F_MACH": 6.5, "R_MACH": 6.5}
    response = factory_client.put(
        f"{API}/factories/{factory['id']}/config",
        json={
            "expected_version": 1,
            "config": config,
            "effective_from": "2026-11-01",
            "note": "CNC_2 nâng cấp",
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["current_version"] == 2
    assert updated["versions"][0]["changes"][0]["path"] == "machines.CNC_2.minutes_per_unit"

    # Not yet effective for the October period; a November period picks it up.
    period = factory_client.get(f"{API}/periods/{_period(factory_client)['id']}").json()
    assert period["factory"] == {
        **period["factory"],
        "pinned_version": 1,
        "applicable_version": 1,
        "latest_version": 2,
    }
    november = factory_client.post(
        f"{API}/periods",
        json={"factory_id": factory["id"], "start_date": "2026-11-02", "opening": "zero"},
    ).json()
    assert november["factory_version"] == 2

    conflict = factory_client.put(
        f"{API}/factories/{factory['id']}/config", json={"expected_version": 1, "config": config}
    )
    assert conflict.status_code == 409
    config["products"]["F_SILVER"]["route"]["cast"] = "NOPE"
    invalid = factory_client.put(
        f"{API}/factories/{factory['id']}/config", json={"expected_version": 2, "config": config}
    )
    assert invalid.status_code == 422


def test_new_period_without_orders_explains_itself(factory_client) -> None:
    factory = _factory(factory_client)
    # Open orders already overdue would be pulled in (they still have to be made); skip them.
    period = factory_client.post(
        f"{API}/periods",
        json={
            "factory_id": factory["id"],
            "start_date": "2027-03-01",
            "opening": "zero",
            "pull_orders": False,
        },
    ).json()
    assert period["status"] == "needs_fix"
    assert [i["code"] for i in period["issues"]] == ["NO_ORDERS"]
    assert period["dataset_id"] is None
    assert factory_client.delete(f"{API}/periods/{period['id']}").status_code == 204


def test_outlook_reports_weekly_load(factory_client) -> None:
    factory = _factory(factory_client)
    outlook = factory_client.get(
        f"{API}/factories/{factory['id']}/outlook", params={"start": "2026-10-05", "weeks": 3}
    ).json()
    assert [w["start"] for w in outlook["weeks"]] == ["2026-10-05", "2026-10-12", "2026-10-19"]
    first = outlook["weeks"][0]
    assert first["orders"] == 12 and sum(first["demand"].values()) > 0
    heat = next(s for s in first["stages"] if s["stage"] == "heat")
    assert heat["available_minutes"] == 2 * 6 * 1440  # two furnaces, 24/7, Sunday closed


def test_schedule_state_counts_started_runs_as_done() -> None:
    model = json.loads((TWO_WEEKS / "model_input.json").read_text(encoding="utf-8"))
    state = schedule_state(model, [], 0)
    assert state.finished == {p: s["initial_stock"] for p, s in model["products"].items()}
    assert state.delivered == {} and state.started == 0
