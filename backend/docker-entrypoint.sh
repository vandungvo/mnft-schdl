#!/bin/sh
set -eu

# Optional: start from a bundled SQLite snapshot when the database file does not exist yet.
# Render's free plan has no persistent disk, so every start (deploy, restart, wake-up after
# sleeping) is a fresh container; MNFT_SEED_DATABASE brings the demo plant back each time.
if [ -n "${MNFT_SEED_DATABASE:-}" ]; then
    url="${MNFT_DATABASE_URL:-}"
    db_path="${url#sqlite:///}"
    if [ "$db_path" != "$url" ] && [ ! -f "$db_path" ]; then
        mkdir -p "$(dirname "$db_path")"
        cp "$MNFT_SEED_DATABASE" "$db_path"
        echo "Database created from snapshot $MNFT_SEED_DATABASE"
    fi
fi

python -m alembic -c backend/alembic.ini upgrade head
exec "$@"
