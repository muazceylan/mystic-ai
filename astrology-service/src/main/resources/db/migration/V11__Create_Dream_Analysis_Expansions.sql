CREATE TABLE IF NOT EXISTS dream_analysis_expansions (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL,
    dream_id BIGINT NOT NULL REFERENCES dream_entries(id) ON DELETE CASCADE,
    expansion_type VARCHAR(48) NOT NULL,
    target_hash VARCHAR(64) NOT NULL,
    result_json TEXT,
    reservation_id UUID,
    token_transaction_id UUID,
    token_cost INTEGER NOT NULL DEFAULT 0,
    prompt_version VARCHAR(64),
    schema_version VARCHAR(32),
    status VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(180) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dae_idempotency
    ON dream_analysis_expansions (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_dae_user_dream
    ON dream_analysis_expansions (user_id, dream_id);
CREATE INDEX IF NOT EXISTS idx_dae_lookup
    ON dream_analysis_expansions (user_id, dream_id, expansion_type, target_hash, status);
