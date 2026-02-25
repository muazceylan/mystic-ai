CREATE TABLE IF NOT EXISTS poster_share_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    poster_type VARCHAR(64) NOT NULL,
    user_id VARCHAR(255),
    variant VARCHAR(64),
    payload_json TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poster_share_tokens_expires_at ON poster_share_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_poster_share_tokens_poster_type ON poster_share_tokens(poster_type);

