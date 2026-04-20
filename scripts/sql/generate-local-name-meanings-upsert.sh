#!/usr/bin/env bash

set -euo pipefail

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-mystic-postgres}"
POSTGRES_USER_NAME="${POSTGRES_USER_NAME:-mystic}"
NUMEROLOGY_DB="${NUMEROLOGY_DB:-mystic_numerology}"
OUTPUT_PATH="${1:-scripts/sql/generated/local-name-meanings-upsert.sql}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

psql_in_container() {
  docker exec "$POSTGRES_CONTAINER" psql -X -U "$POSTGRES_USER_NAME" -d "$NUMEROLOGY_DB" -At -c "$1"
}

TOTAL_NAMES="$(psql_in_container "select count(*) from names;")"
TOTAL_ALIASES="$(psql_in_container "select count(*) from name_aliases;")"

if [[ "$TOTAL_NAMES" == "0" ]]; then
  echo "No rows found in names table of $NUMEROLOGY_DB." >&2
  exit 1
fi

NAME_VALUES_SQL="$(psql_in_container "
select string_agg(
  format(
    E'    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
    quote_nullable(name),
    quote_nullable(normalized_name),
    quote_nullable(gender::text),
    quote_nullable(meaning_short),
    quote_nullable(meaning_long),
    quote_nullable(origin),
    quote_nullable(character_traits_text),
    quote_nullable(letter_analysis_text),
    quote_nullable(quran_flag),
    quote_nullable(status::text),
    quote_nullable(created_at),
    quote_nullable(updated_at)
  ),
  E',\n'
)
from names;
")"

ALIAS_VALUES_SQL="$(psql_in_container "
select coalesce(
  string_agg(
    format(
      E'    (%s, %s, %s, %s, %s, %s, %s, %s)',
      quote_nullable(n.normalized_name),
      quote_nullable(a.alias_name),
      quote_nullable(a.normalized_alias_name),
      quote_nullable(a.alias_type),
      quote_nullable(a.confidence),
      quote_nullable(a.is_manual),
      quote_nullable(a.created_at),
      quote_nullable(a.updated_at)
    ),
    E',\n'
  ),
  ''
)
from name_aliases a
join names n on n.id = a.canonical_name_id;
")"

{
  cat <<SQL
-- Generated from local database ${NUMEROLOGY_DB} in container ${POSTGRES_CONTAINER}
-- Source rows: ${TOTAL_NAMES} names, ${TOTAL_ALIASES} aliases
-- Usage: run this file on the target PostgreSQL database.

BEGIN;

CREATE TEMP TABLE tmp_name_import (
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    gender VARCHAR(24),
    meaning_short TEXT,
    meaning_long TEXT,
    origin VARCHAR(255),
    character_traits_text TEXT,
    letter_analysis_text TEXT,
    quran_flag BOOLEAN,
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

INSERT INTO tmp_name_import (
    name,
    normalized_name,
    gender,
    meaning_short,
    meaning_long,
    origin,
    character_traits_text,
    letter_analysis_text,
    quran_flag,
    status,
    created_at,
    updated_at
) VALUES
${NAME_VALUES_SQL}
;

INSERT INTO names (
    name,
    normalized_name,
    gender,
    meaning_short,
    meaning_long,
    origin,
    character_traits_text,
    letter_analysis_text,
    quran_flag,
    status,
    created_at,
    updated_at
)
SELECT
    t.name,
    t.normalized_name,
    t.gender,
    t.meaning_short,
    t.meaning_long,
    t.origin,
    t.character_traits_text,
    t.letter_analysis_text,
    t.quran_flag,
    t.status,
    t.created_at,
    t.updated_at
FROM tmp_name_import t
ON CONFLICT (normalized_name) DO UPDATE
SET
    name = EXCLUDED.name,
    gender = COALESCE(EXCLUDED.gender, names.gender),
    meaning_short = COALESCE(EXCLUDED.meaning_short, names.meaning_short),
    meaning_long = COALESCE(EXCLUDED.meaning_long, names.meaning_long),
    origin = COALESCE(EXCLUDED.origin, names.origin),
    character_traits_text = COALESCE(EXCLUDED.character_traits_text, names.character_traits_text),
    letter_analysis_text = COALESCE(EXCLUDED.letter_analysis_text, names.letter_analysis_text),
    quran_flag = COALESCE(EXCLUDED.quran_flag, names.quran_flag),
    status = EXCLUDED.status,
    created_at = LEAST(names.created_at, EXCLUDED.created_at),
    updated_at = GREATEST(names.updated_at, EXCLUDED.updated_at);
SQL

  if [[ -n "$ALIAS_VALUES_SQL" ]]; then
    cat <<SQL

CREATE TEMP TABLE tmp_name_alias_import (
    canonical_normalized_name TEXT NOT NULL,
    alias_name TEXT NOT NULL,
    normalized_alias_name TEXT NOT NULL,
    alias_type VARCHAR(32) NOT NULL,
    confidence NUMERIC(5, 3) NOT NULL,
    is_manual BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

INSERT INTO tmp_name_alias_import (
    canonical_normalized_name,
    alias_name,
    normalized_alias_name,
    alias_type,
    confidence,
    is_manual,
    created_at,
    updated_at
) VALUES
${ALIAS_VALUES_SQL}
;

INSERT INTO name_aliases (
    canonical_name_id,
    alias_name,
    normalized_alias_name,
    alias_type,
    confidence,
    is_manual,
    created_at,
    updated_at
)
SELECT
    n.id,
    a.alias_name,
    a.normalized_alias_name,
    a.alias_type,
    a.confidence,
    a.is_manual,
    a.created_at,
    a.updated_at
FROM tmp_name_alias_import a
JOIN names n
  ON n.normalized_name = a.canonical_normalized_name
ON CONFLICT (normalized_alias_name) DO UPDATE
SET
    canonical_name_id = EXCLUDED.canonical_name_id,
    alias_name = EXCLUDED.alias_name,
    alias_type = EXCLUDED.alias_type,
    confidence = EXCLUDED.confidence,
    is_manual = EXCLUDED.is_manual,
    created_at = LEAST(name_aliases.created_at, EXCLUDED.created_at),
    updated_at = GREATEST(name_aliases.updated_at, EXCLUDED.updated_at);
SQL
  fi

  cat <<'SQL'

COMMIT;
SQL
} > "$OUTPUT_PATH"

echo "Generated $OUTPUT_PATH"
