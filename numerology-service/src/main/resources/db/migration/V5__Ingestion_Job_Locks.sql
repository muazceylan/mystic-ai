CREATE TABLE IF NOT EXISTS name_ingestion_job_locks (
    id BIGSERIAL PRIMARY KEY,
    source_name VARCHAR(64) NOT NULL,
    lock_key VARCHAR(128),
    status VARCHAR(24) NOT NULL,
    owner_instance_id VARCHAR(255),
    trigger_type VARCHAR(24),
    job_run_id BIGINT,
    started_at TIMESTAMP,
    heartbeat_at TIMESTAMP,
    released_at TIMESTAMP,
    release_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_name_ingestion_job_locks_source_name UNIQUE (source_name),
    CONSTRAINT fk_name_ingestion_job_locks_run_id
        FOREIGN KEY (job_run_id) REFERENCES name_ingestion_runs (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_name_ingestion_job_locks_status
    ON name_ingestion_job_locks (status);

CREATE INDEX IF NOT EXISTS idx_name_ingestion_job_locks_source_status
    ON name_ingestion_job_locks (source_name, status);

CREATE INDEX IF NOT EXISTS idx_name_ingestion_job_locks_heartbeat
    ON name_ingestion_job_locks (heartbeat_at);
