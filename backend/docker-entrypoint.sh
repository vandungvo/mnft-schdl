#!/bin/sh
set -eu

python -m alembic -c backend/alembic.ini upgrade head
exec "$@"

