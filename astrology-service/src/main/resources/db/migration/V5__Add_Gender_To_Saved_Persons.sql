-- Adds gender to saved_persons. Also creates the table if missing (legacy DBs where V1 ran
-- before saved_persons was added to V1, or partial migrations).

CREATE TABLE IF NOT EXISTS saved_persons (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT,
    name                  VARCHAR(255),
    birth_date            DATE,
    birth_time            TIME,
    birth_location        VARCHAR(255),
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    timezone              VARCHAR(255),
    relationship_category VARCHAR(255),
    sun_sign              VARCHAR(255),
    moon_sign             VARCHAR(255),
    rising_sign           VARCHAR(255),
    ascendant_degree      DOUBLE PRECISION,
    mc_degree             DOUBLE PRECISION,
    planet_positions_json TEXT,
    house_placements_json TEXT,
    aspects_json          TEXT,
    gender                VARCHAR(32),
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_persons_user_id ON saved_persons (user_id);

ALTER TABLE saved_persons
    ADD COLUMN IF NOT EXISTS gender VARCHAR(32) NULL;
