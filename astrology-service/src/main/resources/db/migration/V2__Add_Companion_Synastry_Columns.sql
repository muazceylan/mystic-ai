-- Companion-vs-companion synastry support. Legacy DBs may lack synastries (old V1).

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
    ADD COLUMN IF NOT EXISTS person_a_id BIGINT,
    ADD COLUMN IF NOT EXISTS person_b_id BIGINT,
    ADD COLUMN IF NOT EXISTS person_a_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS person_b_type VARCHAR(32);

-- Legacy records were implicitly USER (A) vs SAVED_PERSON (B).
UPDATE synastries
SET person_a_type = COALESCE(person_a_type, 'USER'),
    person_b_type = COALESCE(person_b_type, 'SAVED_PERSON'),
    person_b_id   = COALESCE(person_b_id, saved_person_id),
    person_a_id   = COALESCE(person_a_id, user_id)
WHERE person_a_type IS NULL
   OR person_b_type IS NULL
   OR person_b_id IS NULL
   OR person_a_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_synastries_person_a_id ON synastries (person_a_id);
CREATE INDEX IF NOT EXISTS idx_synastries_person_b_id ON synastries (person_b_id);
CREATE INDEX IF NOT EXISTS idx_synastries_person_pair ON synastries (person_a_type, person_a_id, person_b_type, person_b_id);
