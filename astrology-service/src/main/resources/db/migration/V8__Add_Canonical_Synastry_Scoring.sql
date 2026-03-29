ALTER TABLE synastries
    ADD COLUMN IF NOT EXISTS base_harmony_score INTEGER,
    ADD COLUMN IF NOT EXISTS score_snapshot_json TEXT,
    ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(64);
