CREATE TABLE IF NOT EXISTS name_source_controls (
    source_name VARCHAR(64) PRIMARY KEY,
    enabled BOOLEAN NOT NULL,
    updated_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_name_source_controls_enabled
    ON name_source_controls (enabled);

CREATE TABLE IF NOT EXISTS name_ingestion_runs (
    id BIGSERIAL PRIMARY KEY,
    source_name VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    duration_ms BIGINT,
    discovered_count INTEGER NOT NULL DEFAULT 0,
    fetched_count INTEGER NOT NULL DEFAULT 0,
    parse_success_count INTEGER NOT NULL DEFAULT 0,
    parse_failure_count INTEGER NOT NULL DEFAULT 0,
    conflict_count INTEGER NOT NULL DEFAULT 0,
    mismatch_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    low_quality_count INTEGER NOT NULL DEFAULT 0,
    review_backlog_count_snapshot INTEGER NOT NULL DEFAULT 0,
    approved_write_count INTEGER NOT NULL DEFAULT 0,
    canonical_resolved_count INTEGER NOT NULL DEFAULT 0,
    origin_filled_count INTEGER NOT NULL DEFAULT 0,
    meaning_short_filled_count INTEGER NOT NULL DEFAULT 0,
    meaning_long_filled_count INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT,
    triggered_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_name_ingestion_runs_source_started
    ON name_ingestion_runs (source_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_name_ingestion_runs_source_finished
    ON name_ingestion_runs (source_name, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_name_ingestion_runs_status
    ON name_ingestion_runs (status);

CREATE INDEX IF NOT EXISTS idx_name_ingestion_runs_trigger_type
    ON name_ingestion_runs (trigger_type);
