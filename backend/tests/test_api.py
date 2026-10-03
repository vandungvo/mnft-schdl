from __future__ import annotations

import time
from copy import deepcopy
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.bootstrap import bootstrap_standard_data
from backend.app.config import Settings
from backend.app.main import create_app


def run_payload(scheduling_input: dict, **overrides) -> dict:
    payload = {
        "input": scheduling_input,
        "algorithm": "edd",
        "seed": 11,
        "time_budget_seconds": 1,
    }
    payload.update(overrides)
    return payload


def test_health_checks_database(client) -> None:
    response = client.get("/api/v1/health", headers={"X-Request-ID": "health-test"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["master_data_status"] == "ready"
    assert response.json()["master_dataset_count"] == 1
    assert response.json()["production_plan_count"] == 0
    assert response.json()["plans_needing_attention"] == 0
    assert response.json()["schedule_run_count"] == 0
    assert response.json()["solver_default_budget_seconds"] == 1
    assert response.json()["solver_max_budget_seconds"] == 10
    assert "cp_sat_hint" in response.json()["supported_algorithms"]
    assert response.json()["database_latency_ms"] >= 0
    assert response.json()["queued_runs"] == 0
    assert response.json()["running_runs"] == 0
    assert response.json()["failed_runs_24h"] == 0
    assert response.headers["X-Request-ID"] == "health-test"


def test_api_key_roles_protect_data_and_capture_actor(tmp_path, scheduling_input) -> None:
    operator_key = "operator-key-123456789012"
    reader_key = "reader-key-12345678901234"
    settings = Settings(
        environment="test",
        database_url=f"sqlite:///{(tmp_path / 'auth.db').as_posix()}",
        database_auto_create=True,
        bootstrap_standard_data=False,
        run_jobs_inline=True,
        operator_api_key=operator_key,
        reader_api_key=reader_key,
        solver_default_budget_seconds=1,
        solver_max_budget_seconds=10,
        log_level="WARNING",
    )
    with TestClient(create_app(settings)) as secured:
        assert secured.get("/api/v1/health").status_code == 200
        assert secured.get("/api/v1/master-data/datasets").status_code == 401
        reader_headers = {"Authorization": f"Bearer {reader_key}"}
        assert secured.get(
            "/api/v1/master-data/datasets", headers=reader_headers
        ).status_code == 200
        assert secured.post(
            "/api/v1/master-data/datasets/import",
            json={"input": scheduling_input},
            headers=reader_headers,
        ).status_code == 403
        operator_headers = {"Authorization": f"Bearer {operator_key}"}
        imported = secured.post(
            "/api/v1/master-data/datasets/import",
            json={"input": scheduling_input},
            headers=operator_headers,
        )
        assert imported.status_code == 201
        events = secured.get(
            "/api/v1/audit-events", headers=operator_headers
        ).json()["items"]
        assert events[0]["actor"] == "api-key:operator"


def test_audit_events_capture_mutations(client, scheduling_input) -> None:
    dataset = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()

    response = client.get(
        "/api/v1/audit-events",
        params={"resource_type": "master_dataset", "resource_id": dataset["id"]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["action"] == "master_data.imported"
    assert body["items"][0]["actor"] == "local-operator"


def test_startup_imports_standard_data_only_when_database_is_empty(client) -> None:
    listing = client.get("/api/v1/master-data/datasets").json()

    assert listing["total"] == 1
    assert listing["items"][0]["name"] == "wheel_factory_48_lots_2weeks"
    assert listing["items"][0]["is_ready"] is True

    with client.app.state.session_factory() as session:
        result = bootstrap_standard_data(session, Path("missing-standard-data.json"))
    assert result is None


def test_create_run_persists_valid_schedule(client, scheduling_input) -> None:
    response = client.post("/api/v1/schedule-runs", json=run_payload(scheduling_input))
    assert response.status_code == 202, response.text
    summary = response.json()
    assert summary["status"] == "SUCCEEDED"

    detail_response = client.get(f"/api/v1/schedule-runs/{summary['id']}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["validation"]["valid"] is True
    assert detail["validation"]["errors"] == []
    assert detail["validation"]["operations_checked"] == 192
    assert len(detail["operations"]) == len(scheduling_input["lots"]) * 4
    assert detail["metrics"]["objective"] > 0
    assert detail["input_hash"] == summary["input_hash"]

    filtered = client.get(
        "/api/v1/schedule-runs",
        params={"status": "SUCCEEDED", "algorithm": "edd", "search": "factory"},
    ).json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["id"] == summary["id"]
    assert client.get(
        "/api/v1/schedule-runs", params={"status": "FAILED"}
    ).json()["total"] == 0


def test_dispatch_failure_is_persisted_as_terminal_failure(
    client, scheduling_input, monkeypatch
) -> None:
    def fail_submit(_run_id: str) -> None:
        raise RuntimeError("executor unavailable")

    monkeypatch.setattr(client.app.state.dispatcher, "submit", fail_submit)
    response = client.post("/api/v1/schedule-runs", json=run_payload(scheduling_input))

    assert response.status_code == 202
    assert response.json()["status"] == "FAILED"
    assert response.json()["error_code"] == "JOB_DISPATCH_FAILED"
    persisted = client.get(f"/api/v1/schedule-runs/{response.json()['id']}").json()
    assert persisted["status"] == "FAILED"


def test_idempotency_key_returns_original_run(client, scheduling_input) -> None:
    headers = {"Idempotency-Key": "same-user-action"}
    first = client.post(
        "/api/v1/schedule-runs", json=run_payload(scheduling_input), headers=headers
    )
    second = client.post(
        "/api/v1/schedule-runs", json=run_payload(scheduling_input), headers=headers
    )
    assert first.status_code == second.status_code == 202
    assert first.json()["id"] == second.json()["id"]

    listing = client.get("/api/v1/schedule-runs").json()
    assert listing["total"] == 1


def test_retry_run_preserves_snapshot_and_records_lineage(client, scheduling_input) -> None:
    original = client.post(
        "/api/v1/schedule-runs", json=run_payload(scheduling_input)
    ).json()

    retried = client.post(
        f"/api/v1/schedule-runs/{original['id']}/retry",
        json={"algorithm": "spt", "seed": 19, "time_budget_seconds": 1},
        headers={"Idempotency-Key": "retry-once"},
    )
    repeated = client.post(
        f"/api/v1/schedule-runs/{original['id']}/retry",
        json={"algorithm": "spt", "seed": 19, "time_budget_seconds": 1},
        headers={"Idempotency-Key": "retry-once"},
    )

    assert retried.status_code == repeated.status_code == 202
    body = retried.json()
    assert body["id"] == repeated.json()["id"]
    assert body["retry_of_id"] == original["id"]
    assert body["input_hash"] == original["input_hash"]
    assert body["algorithm"] == "spt"
    assert body["seed"] == 19

    events = client.get(
        "/api/v1/audit-events",
        params={"resource_type": "schedule_run", "resource_id": body["id"]},
    ).json()
    assert any(event["action"] == "schedule_run.retried" for event in events["items"])


def test_invalid_contract_uses_stable_error_envelope(client, scheduling_input) -> None:
    invalid = deepcopy(scheduling_input)
    invalid["lots"][0]["quantity"] = 0
    response = client.post("/api/v1/schedule-runs", json=run_payload(invalid))
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "REQUEST_VALIDATION_ERROR"
    assert body["error"]["request_id"]


def test_cross_entity_validation_error_is_json_serializable(client, scheduling_input) -> None:
    invalid = deepcopy(scheduling_input)
    invalid["lots"][0]["product"] = "UNKNOWN"
    response = client.post("/api/v1/schedule-runs", json=run_payload(invalid))
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "REQUEST_VALIDATION_ERROR"
    assert "scheduling contract" in str(body["error"]["details"])


def test_budget_above_server_limit_is_rejected(client, scheduling_input) -> None:
    response = client.post(
        "/api/v1/schedule-runs",
        json=run_payload(scheduling_input, time_budget_seconds=11),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "TIME_BUDGET_EXCEEDED"


def test_missing_run_uses_stable_error_envelope(client) -> None:
    response = client.get("/api/v1/schedule-runs/not-a-real-id")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RUN_NOT_FOUND"


def test_background_dispatch_reaches_terminal_state(tmp_path, scheduling_input) -> None:
    settings = Settings(
        environment="test",
        database_url=f"sqlite:///{(tmp_path / 'async.db').as_posix()}",
        database_auto_create=True,
        run_jobs_inline=False,
        solver_default_budget_seconds=1,
        solver_max_budget_seconds=10,
        log_level="WARNING",
    )
    with TestClient(create_app(settings)) as async_client:
        created = async_client.post("/api/v1/schedule-runs", json=run_payload(scheduling_input))
        assert created.status_code == 202
        run_id = created.json()["id"]
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            detail = async_client.get(f"/api/v1/schedule-runs/{run_id}").json()
            if detail["status"] not in {"QUEUED", "RUNNING"}:
                break
            time.sleep(0.05)
        assert detail["status"] == "SUCCEEDED", detail
        assert detail["validation"]["valid"] is True


def test_master_dataset_import_round_trips_and_is_idempotent(client, scheduling_input) -> None:
    first = client.post("/api/v1/master-data/datasets/import", json={"input": scheduling_input})
    assert first.status_code == 201, first.text
    detail = first.json()
    assert detail["is_ready"] is True
    assert detail["counts"] == {
        "products": 4,
        "machines": 7,
        "orders": 36,
        "lots": 48,
    }
    assert detail["input"] == scheduling_input

    second = client.post("/api/v1/master-data/datasets/import", json={"input": scheduling_input})
    assert second.status_code == 201
    assert second.json()["id"] == detail["id"]
    listing = client.get("/api/v1/master-data/datasets").json()
    assert listing["total"] == 1
    assert client.get(
        "/api/v1/master-data/datasets", params={"search": "not-present"}
    ).json()["total"] == 0
    assert client.get(
        "/api/v1/master-data/datasets", params={"search": "wheel_factory"}
    ).json()["total"] == 1


def test_schedule_run_can_use_persisted_master_dataset(client, scheduling_input) -> None:
    imported = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()
    response = client.post(
        "/api/v1/schedule-runs",
        json={
            "dataset_id": imported["id"],
            "algorithm": "edd",
            "seed": 11,
            "time_budget_seconds": 1,
        },
    )
    assert response.status_code == 202, response.text
    run = response.json()
    assert run["status"] == "SUCCEEDED"
    assert run["dataset_id"] == imported["id"]
    assert run["dataset_revision"] == 1

    deleted = client.delete(f"/api/v1/master-data/datasets/{imported['id']}")
    assert deleted.status_code == 204
    persisted_run = client.get(f"/api/v1/schedule-runs/{run['id']}").json()
    assert persisted_run["status"] == "SUCCEEDED"
    assert persisted_run["dataset_id"] is None
    assert len(persisted_run["operations"]) == 192


def test_schedule_run_requires_exactly_one_input_source(client, scheduling_input) -> None:
    neither = client.post("/api/v1/schedule-runs", json={"algorithm": "edd", "seed": 11})
    assert neither.status_code == 422

    imported = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()
    both = client.post(
        "/api/v1/schedule-runs",
        json={
            "input": scheduling_input,
            "dataset_id": imported["id"],
            "algorithm": "edd",
            "seed": 11,
        },
    )
    assert both.status_code == 422


def test_production_plan_is_revisioned_idempotent_and_can_source_a_run(
    client, scheduling_input
) -> None:
    dataset = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()
    payload = {
        "dataset_id": dataset["id"],
        "period_start": 0,
        "period_end": scheduling_input["horizon"],
        "bucket_minutes": 1440,
    }
    first = client.post("/api/v1/production-plans", json=payload)
    assert first.status_code == 201, first.text
    plan = first.json()
    assert plan["dataset_revision"] == 1
    assert plan["result"]["order_count"] == len(scheduling_input["orders"])
    assert plan["result"]["lot_count"] == len(scheduling_input["lots"])
    assert len(plan["result"]["products"]) == 4
    assert len(plan["result"]["stages"]) == 4
    assert len(plan["result"]["buckets"]) == 14
    assert {stage["stage"] for stage in plan["result"]["stages"]} == {
        "cast",
        "cnc",
        "paint",
        "qc",
    }

    repeated = client.post("/api/v1/production-plans", json=payload)
    assert repeated.status_code == 201
    assert repeated.json()["id"] == plan["id"]
    assert client.get("/api/v1/production-plans").json()["total"] == 1
    assert client.get(
        "/api/v1/production-plans",
        params={"status": plan["status"], "search": "wheel_factory"},
    ).json()["total"] == 1
    assert client.get(
        "/api/v1/production-plans", params={"search": plan["id"][:12]}
    ).json()["total"] == 1
    assert client.get(
        "/api/v1/production-plans", params={"status": "NOT_A_STATUS"}
    ).json()["total"] == 0

    run = client.post(
        "/api/v1/schedule-runs",
        json={
            "plan_id": plan["id"],
            "algorithm": "edd",
            "seed": 11,
            "time_budget_seconds": 1,
        },
    )
    assert run.status_code == 202, run.text
    assert run.json()["status"] == "SUCCEEDED"
    assert run.json()["plan_id"] == plan["id"]
    assert run.json()["dataset_id"] == dataset["id"]
    assert run.json()["dataset_revision"] == 1


def test_production_plan_snapshot_survives_master_data_deletion(client, scheduling_input) -> None:
    dataset = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()
    plan = client.post("/api/v1/production-plans", json={"dataset_id": dataset["id"]}).json()

    assert client.delete(f"/api/v1/master-data/datasets/{dataset['id']}").status_code == 204
    persisted = client.get(f"/api/v1/production-plans/{plan['id']}")
    assert persisted.status_code == 200
    assert persisted.json()["dataset_id"] is None

    run = client.post(
        "/api/v1/schedule-runs",
        json={"plan_id": plan["id"], "algorithm": "edd", "time_budget_seconds": 1},
    )
    assert run.status_code == 202, run.text
    assert run.json()["status"] == "SUCCEEDED"
    assert run.json()["dataset_id"] is None
    assert run.json()["dataset_revision"] == 1


def test_production_plan_rejects_period_outside_horizon(client, scheduling_input) -> None:
    dataset = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()
    response = client.post(
        "/api/v1/production-plans",
        json={"dataset_id": dataset["id"], "period_end": scheduling_input["horizon"] + 1},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_PLANNING_PERIOD"


def test_master_dataset_replacement_is_atomic_and_versioned(client, scheduling_input) -> None:
    imported = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()
    first_run = client.post(
        "/api/v1/schedule-runs",
        json={"dataset_id": imported["id"], "algorithm": "edd", "time_budget_seconds": 1},
    ).json()
    assert first_run["dataset_revision"] == 1

    replacement = deepcopy(scheduling_input)
    replacement["name"] = "wheel_factory_revised"
    updated = client.put(
        f"/api/v1/master-data/datasets/{imported['id']}",
        json={"input": replacement, "expected_revision": 1},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["revision"] == 2
    assert updated.json()["name"] == "wheel_factory_revised"

    second_run = client.post(
        "/api/v1/schedule-runs",
        json={"dataset_id": imported["id"], "algorithm": "edd", "time_budget_seconds": 1},
    ).json()
    assert second_run["dataset_revision"] == 2
    old_run = client.get(f"/api/v1/schedule-runs/{first_run['id']}").json()
    assert old_run["dataset_revision"] == 1
    assert old_run["input_name"] == scheduling_input["name"]

    invalid = deepcopy(replacement)
    invalid["lots"][0]["quantity"] = 0
    rejected = client.put(
        f"/api/v1/master-data/datasets/{imported['id']}",
        json={"input": invalid, "expected_revision": 2},
    )
    assert rejected.status_code == 422
    unchanged = client.get(f"/api/v1/master-data/datasets/{imported['id']}").json()
    assert unchanged["revision"] == 2
    assert unchanged["name"] == "wheel_factory_revised"


def test_entity_edits_are_validated_and_use_optimistic_revision(client, scheduling_input) -> None:
    dataset = client.post(
        "/api/v1/master-data/datasets/import", json={"input": scheduling_input}
    ).json()
    dataset_id = dataset["id"]

    product_update = client.patch(
        f"/api/v1/master-data/datasets/{dataset_id}/products/F_SILVER",
        json={
            "expected_revision": 1,
            "color": "SILVER",
            "line": "F",
            "initial_inventory": 50,
            "safety_stock": 35,
        },
    )
    assert product_update.status_code == 200, product_update.text
    assert product_update.json()["revision"] == 2
    assert product_update.json()["input"]["initial_inventory"]["F_SILVER"] == 50

    stale = client.patch(
        f"/api/v1/master-data/datasets/{dataset_id}/products/F_SILVER",
        json={
            "expected_revision": 1,
            "color": "SILVER",
            "line": "F",
            "initial_inventory": 60,
            "safety_stock": 35,
        },
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"

    order = scheduling_input["orders"][0]
    invalid_order_update = client.patch(
        f"/api/v1/master-data/datasets/{dataset_id}/orders/{order['id']}",
        json={
            "expected_revision": 2,
            "release": order["due"] + 1,
            "due": order["due"],
            "priority": order["priority"],
            "urgent": order["urgent"],
            "deadline": None,
        },
    )
    assert invalid_order_update.status_code == 422

    order_update = client.patch(
        f"/api/v1/master-data/datasets/{dataset_id}/orders/{order['id']}",
        json={
            "expected_revision": 2,
            "release": order["release"],
            "due": order["due"] + 60,
            "priority": 3,
            "urgent": True,
            "deadline": None,
        },
    )
    assert order_update.status_code == 200, order_update.text
    assert order_update.json()["revision"] == 3

    invalid_delete = client.delete(
        f"/api/v1/master-data/datasets/{dataset_id}/machines/QC_1",
        params={"expected_revision": 3},
    )
    assert invalid_delete.status_code == 422
    assert invalid_delete.json()["error"]["code"] == "MASTER_DATA_VALIDATION_ERROR"
    assert client.get(f"/api/v1/master-data/datasets/{dataset_id}").json()["revision"] == 3

    created = client.post(
        f"/api/v1/master-data/datasets/{dataset_id}/products",
        json={
            "expected_revision": 3,
            "code": "  unused_sku ",
            "color": "BLACK",
            "line": "F",
            "initial_inventory": 0,
            "safety_stock": 0,
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["revision"] == 4
    assert "UNUSED_SKU" in created.json()["input"]["products"]
    assert created.json()["input"]["product_color"]["UNUSED_SKU"] == "BLACK"

    assert created.json()["input"]["btp_routing"]["UNUSED_SKU"]["cast"] == "UNUSED_SKU_CAST"

    btp_created = client.post(
        f"/api/v1/master-data/datasets/{dataset_id}/btp-codes",
        json={"expected_revision": 4, "code": "shared_cast"},
    )
    assert btp_created.status_code == 200, btp_created.text
    assert btp_created.json()["revision"] == 5
    assert "SHARED_CAST" in btp_created.json()["input"]["btp_codes"]

    # initial_qty stays 0: the dataset's max_surplus_btp is 0, so any nonzero
    # declared BTP stock would (correctly) fail the aggregate-cap contract check.
    btp_inventory_set = client.put(
        f"/api/v1/master-data/datasets/{dataset_id}/btp-codes/SHARED_CAST/inventory",
        json={"expected_revision": 5, "initial_qty": 0, "capacity": 40},
    )
    assert btp_inventory_set.status_code == 200, btp_inventory_set.text
    assert btp_inventory_set.json()["revision"] == 6
    assert btp_inventory_set.json()["input"]["inventory_btp"]["SHARED_CAST"] == 0
    assert btp_inventory_set.json()["input"]["btp_capacity"]["SHARED_CAST"] == 40

    # Route UNUSED_SKU's cast stage AND F_SILVER's cast stage to the SAME shared
    # code — the A09 scenario (one BTP code serving multiple finished products).
    route_unused_sku = client.put(
        f"/api/v1/master-data/datasets/{dataset_id}/products/UNUSED_SKU/routing/cast",
        json={"expected_revision": 6, "btp_code": "SHARED_CAST"},
    )
    assert route_unused_sku.status_code == 200, route_unused_sku.text
    assert route_unused_sku.json()["revision"] == 7
    assert route_unused_sku.json()["input"]["btp_routing"]["UNUSED_SKU"]["cast"] == "SHARED_CAST"

    # schema_version 4: machines are keyed by the BTP code they produce, so
    # F_SILVER cannot be routed to SHARED_CAST until a casting machine can make it.
    route_f_silver_early = client.put(
        f"/api/v1/master-data/datasets/{dataset_id}/products/F_SILVER/routing/cast",
        json={"expected_revision": 7, "btp_code": "SHARED_CAST"},
    )
    assert route_f_silver_early.status_code == 422
    assert route_f_silver_early.json()["error"]["code"] == "MASTER_DATA_VALIDATION_ERROR"

    cast_f = route_unused_sku.json()["input"]["machines"]["CAST_F"]
    cast_f["minutes_per_unit"]["SHARED_CAST"] = cast_f["minutes_per_unit"]["F_SILVER_CAST"]
    for row in cast_f["setup"].values():
        row["SHARED_CAST"] = row["F_SILVER_CAST"]
    cast_f["setup"]["SHARED_CAST"] = {**cast_f["setup"]["F_SILVER_CAST"], "SHARED_CAST": 0}
    capability_added = client.put(
        f"/api/v1/master-data/datasets/{dataset_id}/machines/CAST_F",
        json={"expected_revision": 7, "machine": cast_f},
    )
    assert capability_added.status_code == 200, capability_added.text
    assert capability_added.json()["revision"] == 8

    route_f_silver = client.put(
        f"/api/v1/master-data/datasets/{dataset_id}/products/F_SILVER/routing/cast",
        json={"expected_revision": 8, "btp_code": "SHARED_CAST"},
    )
    assert route_f_silver.status_code == 200, route_f_silver.text
    assert route_f_silver.json()["revision"] == 9
    assert route_f_silver.json()["input"]["btp_routing"]["F_SILVER"]["cast"] == "SHARED_CAST"

    btp_delete_blocked = client.delete(
        f"/api/v1/master-data/datasets/{dataset_id}/btp-codes/SHARED_CAST",
        params={"expected_revision": 9},
    )
    assert btp_delete_blocked.status_code == 409
    assert btp_delete_blocked.json()["error"]["code"] == "BTP_CODE_IN_USE"

    btp_renamed = client.patch(
        f"/api/v1/master-data/datasets/{dataset_id}/btp-codes/SHARED_CAST",
        json={"expected_revision": 9, "code": "shared_cast_v2"},
    )
    assert btp_renamed.status_code == 200, btp_renamed.text
    assert btp_renamed.json()["revision"] == 10
    renamed_input = btp_renamed.json()["input"]
    assert "SHARED_CAST_V2" in renamed_input["btp_codes"]
    assert renamed_input["btp_routing"]["UNUSED_SKU"]["cast"] == "SHARED_CAST_V2"
    assert renamed_input["btp_routing"]["F_SILVER"]["cast"] == "SHARED_CAST_V2"
    assert renamed_input["inventory_btp"]["SHARED_CAST_V2"] == 0
    # The rename follows the code into machine configuration too.
    assert "SHARED_CAST_V2" in renamed_input["machines"]["CAST_F"]["minutes_per_unit"]
    assert "SHARED_CAST" not in renamed_input["machines"]["CAST_F"]["setup"]

    deleted = client.delete(
        f"/api/v1/master-data/datasets/{dataset_id}/products/UNUSED_SKU",
        params={"expected_revision": 10},
    )
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["revision"] == 11
    # F_SILVER's own routing to the shared code (untouched by UNUSED_SKU's
    # deletion) proves the code survives losing one of its two routers.
    assert deleted.json()["input"]["btp_routing"]["F_SILVER"]["cast"] == "SHARED_CAST_V2"
