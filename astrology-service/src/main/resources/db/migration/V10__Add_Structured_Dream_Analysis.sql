ALTER TABLE dream_entries
    ADD COLUMN IF NOT EXISTS analysis_json TEXT,
    ADD COLUMN IF NOT EXISTS input_quality VARCHAR(20),
    ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(40),
    ADD COLUMN IF NOT EXISTS use_astrology BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS dream_memory_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_dream_entries_user_quality
    ON dream_entries(user_id, input_quality);
