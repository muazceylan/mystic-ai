-- Canonical synastry scoring columns. Ensure table exists for legacy DBs that skipped V1/V2 DDL.

CREATE TABLE IF NOT EXISTS synastries (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT,
    saved_person_id      BIGINT,
    relationship_type    VARCHAR(255),
    harmony_score        INTEGER,
    cross_aspects_json   TEXT,
    harmony_insight      TEXT,
    strengths_json       TEXT,
    challenges_json      TEXT,
    key_warning          TEXT,
    cosmic_advice        TEXT,
    status               VARCHAR(255),
    correlation_id       UUID,
    calculated_at        TIMESTAMP,
    person_a_id          BIGINT,
    person_b_id          BIGINT,
    person_a_type        VARCHAR(32),
    person_b_type        VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS idx_synastries_user_id ON synastries (user_id);

ALTER TABLE synastries
    ADD COLUMN IF NOT EXISTS base_harmony_score INTEGER,
    ADD COLUMN IF NOT EXISTS score_snapshot_json TEXT,
    ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(64);
