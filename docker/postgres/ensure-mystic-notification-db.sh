#!/usr/bin/env bash
# Idempotent: create mystic_notification if missing (notification-service default DB).
set -euo pipefail
CONTAINER="${POSTGRES_CONTAINER:-mystic-postgres}"
USER="${POSTGRES_USER:-mystic}"
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' is not running. Start infra: make infra" >&2
  exit 1
fi
exists=$(docker exec "$CONTAINER" psql -U "$USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='mystic_notification'" || true)
if [ "$exists" = "1" ]; then
  echo "Database mystic_notification already exists."
  exit 0
fi
docker exec "$CONTAINER" psql -U "$USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE mystic_notification OWNER mystic;"
echo "Created database mystic_notification."
