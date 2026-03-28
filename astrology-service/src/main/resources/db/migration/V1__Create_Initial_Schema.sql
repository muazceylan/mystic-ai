-- ============================================================
-- V1 — Astrology Service Initial Schema
-- ============================================================
-- Creates all baseline tables that existed before V2+ migrations.
-- V2  → adds person_a/b columns to synastries
-- V3  → creates star_mate_* tables
-- V4  → creates poster_share_tokens
-- V5  → adds gender to saved_persons
-- V6  → creates planner_reminders
-- ============================================================

CREATE TABLE IF NOT EXISTS natal_charts (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                VARCHAR(255),
    name                   VARCHAR(255),
    birth_date             DATE,
    birth_time             TIME,
    birth_location         VARCHAR(255),
    latitude               DOUBLE PRECISION,
    longitude              DOUBLE PRECISION,
    sun_sign               VARCHAR(255),
    moon_sign              VARCHAR(255),
    rising_sign            VARCHAR(255),
    ascendant_degree       DOUBLE PRECISION,
    mc_degree              DOUBLE PRECISION,
    utc_offset             DOUBLE PRECISION,
    planet_positions_json  TEXT,
    house_placements_json  TEXT,
    aspects_json           TEXT,
    ai_interpretation      TEXT,
    interpretation_status  VARCHAR(255),
    calculated_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_natal_charts_user_id ON natal_charts(user_id);

-- ──────────────────────────────────────────────────────────────
-- saved_persons — NOTE: gender column added later in V5
-- ──────────────────────────────────────────────────────────────
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
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_persons_user_id ON saved_persons(user_id);

-- ──────────────────────────────────────────────────────────────
-- synastries — NOTE: person_a/b columns added later in V2
-- ──────────────────────────────────────────────────────────────
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
    calculated_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_synastries_user_id ON synastries(user_id);

-- ──────────────────────────────────────────────────────────────
-- dream_entries
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dream_entries (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL,
    title                   VARCHAR(200),
    dream_text              TEXT NOT NULL,
    dream_date              DATE,
    audio_url               VARCHAR(255),
    interpretation          TEXT,
    warnings_json           TEXT,
    opportunities_json      TEXT,
    recurring_symbols_json  TEXT,
    extracted_symbols_json  TEXT,
    correlation_id          UUID,
    interpretation_status   VARCHAR(255),
    created_at              TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dream_entries_user_id ON dream_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_entries_date ON dream_entries(dream_date);

-- ──────────────────────────────────────────────────────────────
-- dream_symbols
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dream_symbols (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    symbol_name    VARCHAR(255) NOT NULL,
    count          INTEGER NOT NULL,
    last_seen_date DATE
);

CREATE INDEX IF NOT EXISTS idx_dream_symbols_user_id ON dream_symbols(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dream_symbols_user_symbol ON dream_symbols(user_id, symbol_name);

-- ──────────────────────────────────────────────────────────────
-- daily_transits_cache
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_transits_cache (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL,
    transit_date      DATE NOT NULL,
    timezone          VARCHAR(64) NOT NULL,
    location_version  VARCHAR(64) NOT NULL,
    payload_json      TEXT NOT NULL,
    created_at        TIMESTAMP NOT NULL,
    expires_at        TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_transits_cache_lookup
    ON daily_transits_cache(user_id, transit_date, timezone, location_version);
CREATE INDEX IF NOT EXISTS idx_daily_transits_cache_expires
    ON daily_transits_cache(expires_at);

-- ──────────────────────────────────────────────────────────────
-- lucky_dates_results
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lucky_dates_results (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT,
    goal_category         VARCHAR(255),
    lucky_dates_json      TEXT,
    hook_text             TEXT,
    ai_interpretation     TEXT,
    interpretation_status VARCHAR(255),
    correlation_id        UUID,
    created_at            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lucky_dates_user_id ON lucky_dates_results(user_id);

-- ──────────────────────────────────────────────────────────────
-- daily_actions
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_actions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    action_date DATE NOT NULL,
    action_id   VARCHAR(120) NOT NULL,
    is_done     BOOLEAN NOT NULL DEFAULT FALSE,
    done_at     TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_actions_user_date ON daily_actions(user_id, action_date);
CREATE INDEX IF NOT EXISTS idx_daily_actions_done ON daily_actions(is_done);

-- ──────────────────────────────────────────────────────────────
-- daily_swot
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_swot (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    sun_sign        VARCHAR(20),
    swot_date       DATE NOT NULL,
    strengths       TEXT,
    weaknesses      TEXT,
    opportunities   TEXT,
    threats         TEXT,
    mystical_advice TEXT,
    created_at      TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_swot_user_date ON daily_swot(user_id, swot_date);

-- ──────────────────────────────────────────────────────────────
-- feedback  (entity class: UserFeedback)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    feedback_date DATE NOT NULL,
    item_type     VARCHAR(24) NOT NULL,
    item_id       VARCHAR(120) NOT NULL,
    sentiment     VARCHAR(16) NOT NULL,
    note          TEXT,
    created_at    TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_date ON feedback(user_id, feedback_date);
CREATE INDEX IF NOT EXISTS idx_feedback_item ON feedback(item_type, item_id);

-- ──────────────────────────────────────────────────────────────
-- monthly_dream_stories
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_dream_stories (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL,
    year_month            VARCHAR(7) NOT NULL,
    story                 TEXT,
    dream_count           INTEGER,
    dominant_symbols_json TEXT,
    status                VARCHAR(20),
    correlation_id        UUID,
    created_at            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monthly_story_user_id ON monthly_dream_stories(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_story_user_period ON monthly_dream_stories(user_id, year_month);

-- ──────────────────────────────────────────────────────────────
-- dream_push_tokens
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dream_push_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    token      VARCHAR(512) NOT NULL,
    platform   VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON dream_push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON dream_push_tokens(token);
