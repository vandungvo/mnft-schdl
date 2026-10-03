"""Key cast/cnc/paint machine data by stage item (BTP code), not final product.

schema_version 3 -> 4. A casting machine casts F_CAST whether the wheel will
later be painted silver or black, so its speed, changeover matrix, eligibility
and initial state are keyed by the BTP code that stage produces (via
master_btp_routing). QC machines stay keyed by finished product.

Stored run/plan input snapshots are NOT rewritten (reproducibility); the engine
relabels them explicitly at read time (models.common.instance.upgrade_input).

Revision ID: 20260929_0009
Revises: 20260927_0008
Create Date: 2026-09-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260929_0009"
down_revision: str | None = "20260927_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BTP_STAGES = ("cast", "cnc", "paint")


def _merge(target: dict, key, value, where: str) -> None:
    if key in target and target[key] != value:
        raise RuntimeError(
            f"Cannot migrate to schema_version 4: {where} maps two products onto "
            f"'{key[-1] if isinstance(key, tuple) else key}' with different values "
            f"({target[key]} vs {value}). Make them equal (or split the BTP code) first."
        )
    target[key] = value


def upgrade() -> None:
    connection = op.get_bind()
    routing: dict[tuple[str, str], dict[str, str]] = {}
    for row in connection.execute(
        sa.text("SELECT dataset_id, product_code, stage, btp_code FROM master_btp_routing")
    ):
        routing.setdefault((row.dataset_id, row.stage), {})[row.product_code] = row.btp_code

    machines = connection.execute(
        sa.text("SELECT id, dataset_id, code, stage, initial_product FROM master_machines")
    ).fetchall()
    for machine in machines:
        if machine.stage not in BTP_STAGES:
            continue
        mapping = routing.get((machine.dataset_id, machine.stage), {})
        item = lambda key, mapping=mapping: mapping.get(key, key)  # noqa: E731 -- states pass through
        where = f"machine {machine.code}"

        rates: dict = {}
        for row in connection.execute(
            sa.text(
                "SELECT product_code, minutes_per_unit FROM "
                "machine_capabilities WHERE machine_id = :m"
            ),
            {"m": machine.id},
        ):
            _merge(rates, item(row.product_code), row.minutes_per_unit, where + " minutes_per_unit")
        setups: dict = {}
        for row in connection.execute(
            sa.text(
                "SELECT from_product, to_product, minutes FROM "
                "machine_changeovers WHERE machine_id = :m"
            ),
            {"m": machine.id},
        ):
            _merge(
                setups,
                (item(row.from_product), item(row.to_product)),
                row.minutes,
                where + " setup",
            )

        connection.execute(
            sa.text("DELETE FROM machine_capabilities WHERE machine_id = :m"), {"m": machine.id}
        )
        connection.execute(
            sa.text("DELETE FROM machine_changeovers WHERE machine_id = :m"), {"m": machine.id}
        )
        for code, minutes in rates.items():
            connection.execute(
                sa.text(
                    "INSERT INTO machine_capabilities (machine_id, product_code, minutes_per_unit) "
                    "VALUES (:m, :c, :v)"
                ),
                {"m": machine.id, "c": code, "v": minutes},
            )
        for (source, target), minutes in setups.items():
            connection.execute(
                sa.text(
                    "INSERT INTO machine_changeovers "
                    "(machine_id, from_product, to_product, minutes) VALUES (:m, :f, :t, :v)"
                ),
                {"m": machine.id, "f": source, "t": target, "v": minutes},
            )
        connection.execute(
            sa.text("UPDATE master_machines SET initial_product = :p WHERE id = :m"),
            {"p": item(machine.initial_product), "m": machine.id},
        )

    op.execute(sa.text("UPDATE master_datasets SET schema_version = 4 WHERE schema_version = 3"))


def downgrade() -> None:
    # Inverse relabel is only well-defined when every BTP code is routed from
    # exactly one product (no sharing); otherwise a v3 product-keyed row cannot
    # be reconstructed and the downgrade refuses.
    connection = op.get_bind()
    inverse: dict[tuple[str, str], dict[str, str]] = {}
    for row in connection.execute(
        sa.text("SELECT dataset_id, product_code, stage, btp_code FROM master_btp_routing")
    ):
        bucket = inverse.setdefault((row.dataset_id, row.stage), {})
        if row.btp_code in bucket:
            raise RuntimeError(
                f"Cannot downgrade: BTP code '{row.btp_code}' is shared "
                f"by several products at {row.stage}"
            )
        bucket[row.btp_code] = row.product_code
    machines = connection.execute(
        sa.text("SELECT id, dataset_id, stage, initial_product FROM master_machines")
    ).fetchall()
    for machine in machines:
        if machine.stage not in BTP_STAGES:
            continue
        mapping = inverse.get((machine.dataset_id, machine.stage), {})
        for old, new in mapping.items():
            params = {"m": machine.id, "old": old, "new": new}
            connection.execute(
                sa.text(
                    "UPDATE machine_capabilities SET product_code = :new WHERE "
                    "machine_id = :m AND product_code = :old"
                ),
                params,
            )
            connection.execute(
                sa.text(
                    "UPDATE machine_changeovers SET from_product = :new WHERE "
                    "machine_id = :m AND from_product = :old"
                ),
                params,
            )
            connection.execute(
                sa.text(
                    "UPDATE machine_changeovers SET to_product = :new WHERE "
                    "machine_id = :m AND to_product = :old"
                ),
                params,
            )
            connection.execute(
                sa.text(
                    "UPDATE master_machines SET initial_product = :new "
                    "WHERE id = :m AND initial_product = :old"
                ),
                params,
            )
    op.execute(sa.text("UPDATE master_datasets SET schema_version = 3 WHERE schema_version = 4"))
