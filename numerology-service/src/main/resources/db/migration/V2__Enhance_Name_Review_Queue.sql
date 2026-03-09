ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS has_conflict BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE name_merge_queue
SET has_conflict = CASE
    WHEN conflicting_fields IS NULL OR trim(conflicting_fields) = '' OR trim(conflicting_fields) = '[]' THEN FALSE
    ELSE TRUE
END;

CREATE INDEX IF NOT EXISTS idx_name_merge_queue_has_conflict
    ON name_merge_queue (has_conflict);

CREATE INDEX IF NOT EXISTS idx_name_merge_queue_updated_at
    ON name_merge_queue (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_name_merge_queue_status_updated
    ON name_merge_queue (review_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_norm_mismatch
    ON parsed_name_candidates (normalized_name, mismatch_flag);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_norm_duplicate
    ON parsed_name_candidates (normalized_name, duplicate_content_flag);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_norm_quality
    ON parsed_name_candidates (normalized_name, content_quality);

CREATE TABLE IF NOT EXISTS name_merge_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    queue_id BIGINT,
    canonical_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(24) NOT NULL,
    previous_status VARCHAR(24),
    new_status VARCHAR(24) NOT NULL,
    selected_candidate_id BIGINT,
    selected_source VARCHAR(64),
    selected_field_sources TEXT,
    review_note TEXT,
    action_payload TEXT,
    acted_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_name_merge_audit_queue
        FOREIGN KEY (queue_id) REFERENCES name_merge_queue (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_name_merge_audit_queue_id
    ON name_merge_audit_logs (queue_id);

CREATE INDEX IF NOT EXISTS idx_name_merge_audit_canonical_name
    ON name_merge_audit_logs (canonical_name);

CREATE INDEX IF NOT EXISTS idx_name_merge_audit_created_at
    ON name_merge_audit_logs (created_at DESC);
