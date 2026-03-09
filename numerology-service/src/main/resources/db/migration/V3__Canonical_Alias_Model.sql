CREATE TABLE IF NOT EXISTS name_aliases (
    id BIGSERIAL PRIMARY KEY,
    canonical_name_id BIGINT NOT NULL REFERENCES names (id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    normalized_alias_name VARCHAR(255) NOT NULL,
    alias_type VARCHAR(32) NOT NULL,
    confidence NUMERIC(5, 3) NOT NULL DEFAULT 1.000,
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_name_aliases_normalized_alias_name
    ON name_aliases (normalized_alias_name);

CREATE INDEX IF NOT EXISTS idx_name_aliases_canonical_name_id
    ON name_aliases (canonical_name_id);

CREATE INDEX IF NOT EXISTS idx_name_aliases_alias_type
    ON name_aliases (alias_type);

CREATE INDEX IF NOT EXISTS idx_name_aliases_is_manual
    ON name_aliases (is_manual);

ALTER TABLE parsed_name_candidates
    ADD COLUMN IF NOT EXISTS canonical_name_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_parsed_candidates_canonical_name_id'
          AND table_name = 'parsed_name_candidates'
    ) THEN
        ALTER TABLE parsed_name_candidates
            ADD CONSTRAINT fk_parsed_candidates_canonical_name_id
                FOREIGN KEY (canonical_name_id) REFERENCES names (id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE parsed_name_candidates
    ADD COLUMN IF NOT EXISTS canonical_normalized_name VARCHAR(255);

UPDATE parsed_name_candidates
SET canonical_normalized_name = normalized_name
WHERE canonical_normalized_name IS NULL OR trim(canonical_normalized_name) = '';

ALTER TABLE parsed_name_candidates
    ALTER COLUMN canonical_normalized_name SET NOT NULL;

ALTER TABLE parsed_name_candidates
    ADD COLUMN IF NOT EXISTS alias_match_level VARCHAR(24) NOT NULL DEFAULT 'NO_MATCH';

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_canonical_normalized_name
    ON parsed_name_candidates (canonical_normalized_name);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_canonical_name_id
    ON parsed_name_candidates (canonical_name_id);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_alias_match_level
    ON parsed_name_candidates (alias_match_level);
