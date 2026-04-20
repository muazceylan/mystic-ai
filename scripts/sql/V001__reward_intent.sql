-- ============================================================
-- Migration: V001 — reward_intent table
-- Service:   notification-service (mystic_notification DB)
-- Purpose:   Tracks web rewarded-ad sessions for Guru Token grants.
--            Short-lived rows; TTL enforced by application scheduler.
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_intent (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id          BIGINT       NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    source           VARCHAR(30)  NOT NULL DEFAULT 'WEB_REWARDED_AD',
    reward_amount    INT          NOT NULL,
    reward_type      VARCHAR(50)  NOT NULL DEFAULT 'GURU_TOKEN',
    ad_unit_path     VARCHAR(256),
    placement_key    VARCHAR(128),
    ad_session_id    VARCHAR(256),
    page_context     VARCHAR(512),
    user_agent_hash  VARCHAR(64),
    ip_hash          VARCHAR(64),
    idempotency_key  VARCHAR(256) NOT NULL,
    granted_at       TIMESTAMPTZ,
    claimed_at       TIMESTAMPTZ,
    failure_reason   TEXT,
    granted_payload_json TEXT,
    claim_attempts   INT          NOT NULL DEFAULT 0,
    expires_at       TIMESTAMPTZ  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0,

    CONSTRAINT pk_reward_intent       PRIMARY KEY (id),
    CONSTRAINT uq_reward_intent_idempotency UNIQUE (idempotency_key),
    CONSTRAINT chk_reward_intent_status CHECK (
        status IN (
            'PENDING','AD_READY','AD_SHOWN','GRANTED',
            'CLAIMED','CLOSED','CANCELLED','FAILED','EXPIRED'
        )
    ),
    CONSTRAINT chk_reward_amount_positive CHECK (reward_amount > 0),
    CONSTRAINT chk_claim_attempts_nonneg  CHECK (claim_attempts >= 0)
);

-- User + status composite: used by countActiveIntents and fraud guard.
CREATE INDEX IF NOT EXISTS idx_ri_user_status
    ON reward_intent (user_id, status);

-- User + created_at: used for time-window queries (daily/hourly cap).
CREATE INDEX IF NOT EXISTS idx_ri_user_created
    ON reward_intent (user_id, created_at DESC);

-- User + claimed_at: used for daily/hourly cap queries.
CREATE INDEX IF NOT EXISTS idx_ri_user_claimed
    ON reward_intent (user_id, claimed_at DESC)
    WHERE claimed_at IS NOT NULL;

-- Expiry sweep: scheduler marks stale rows EXPIRED.
CREATE INDEX IF NOT EXISTS idx_ri_expires
    ON reward_intent (expires_at)
    WHERE status IN ('PENDING','AD_READY','AD_SHOWN','GRANTED');

-- IP fraud analysis: find claimed rows by hashed IP.
CREATE INDEX IF NOT EXISTS idx_ri_ip_hash_status
    ON reward_intent (ip_hash, status, claimed_at)
    WHERE ip_hash IS NOT NULL AND status = 'CLAIMED';

-- Ad session replay prevention.
CREATE INDEX IF NOT EXISTS idx_ri_ad_session
    ON reward_intent (user_id, ad_session_id, status)
    WHERE ad_session_id IS NOT NULL;

-- ── Automatic updated_at trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reward_intent_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reward_intent_updated_at ON reward_intent;
CREATE TRIGGER trg_reward_intent_updated_at
    BEFORE UPDATE ON reward_intent
    FOR EACH ROW EXECUTE FUNCTION reward_intent_set_updated_at();

COMMENT ON TABLE  reward_intent IS 'Tracks web rewarded-ad sessions for Guru Token grants. Rows expire after intent-ttl-seconds.';
COMMENT ON COLUMN reward_intent.idempotency_key IS 'Mirrors GuruLedger.idempotency_key. Format: web_rewarded_ad_{id}_{userId}.';
COMMENT ON COLUMN reward_intent.user_agent_hash IS 'SHA-256 of User-Agent. PII-safe; used for anomaly detection only.';
COMMENT ON COLUMN reward_intent.ip_hash         IS 'SHA-256 of client IP. PII-safe; used for rate/fraud analysis only.';
COMMENT ON COLUMN reward_intent.claim_attempts  IS 'Incremented on every POST /claim. Values > 1 trigger fraud audit.';
