#!/usr/bin/env bash
# Idempotent: create application databases if missing (matches docker-compose POSTGRES_MULTIPLE_DATABASES).
# Use when Postgres data volume predates a newly added service DB, or after pulling DB list changes.
set -euo pipefail
CONTAINER="${POSTGRES_CONTAINER:-mystic-postgres}"
USER="${POSTGRES_USER:-mystic}"
DATABASES=(
  mystic_auth
  mystic_tarot
  mystic_astrology
  mystic_numerology
  mystic_dream
  mystic_oracle
  mystic_notification
  mystic_vision
  mystic_spiritual
)

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' is not running. Start infra: make infra" >&2
  exit 1
fi

for db in "${DATABASES[@]}"; do
  exists=$(docker exec "$CONTAINER" psql -U "$USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" || true)
  if [ "$exists" = "1" ]; then
    echo "  ${db}: OK"
  else
    docker exec "$CONTAINER" psql -U "$USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db} OWNER ${USER};"
    echo "  ${db}: created"
  fi
done
echo "App databases check complete."
