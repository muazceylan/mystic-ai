-- Runs before Hibernate validation so legacy notification-service databases can
-- be safely extended without depending on ApplicationRunner timing.
-- Use plain PostgreSQL DDL because Spring's SQL initializer splits on ';' and
-- does not safely handle anonymous DO $$ ... $$ blocks here.

CREATE TABLE IF NOT EXISTS reward_intent (
    id UUID NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    source VARCHAR(30) NOT NULL DEFAULT 'WEB_REWARDED_AD',
    reward_amount INTEGER NOT NULL,
    reward_type VARCHAR(255) NOT NULL,
    ad_unit_path VARCHAR(255),
    placement_key VARCHAR(255),
    ad_session_id VARCHAR(255),
    page_context VARCHAR(255),
    user_agent_hash VARCHAR(255),
    ip_hash VARCHAR(255),
    idempotency_key VARCHAR(255) NOT NULL,
    granted_at TIMESTAMP(6),
    claimed_at TIMESTAMP(6),
    failure_reason TEXT,
    granted_payload_json TEXT,
    claim_attempts INTEGER NOT NULL DEFAULT 0,
    claim_fingerprint VARCHAR(64),
    expires_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6),
    version BIGINT,
    CONSTRAINT pk_reward_intent PRIMARY KEY (id),
    CONSTRAINT uq_reward_intent_idempotency UNIQUE (idempotency_key)
);

ALTER TABLE IF EXISTS reward_intent ADD COLUMN IF NOT EXISTS claim_fingerprint VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ri_claim_fingerprint
    ON reward_intent (claim_fingerprint)
    WHERE claim_fingerprint IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ri_idempotency ON reward_intent (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ri_user_status ON reward_intent (user_id, status);
CREATE INDEX IF NOT EXISTS idx_ri_user_created ON reward_intent (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ri_user_claimed
    ON reward_intent (user_id, claimed_at DESC)
    WHERE claimed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ri_expires ON reward_intent (expires_at);
CREATE INDEX IF NOT EXISTS idx_ri_ip_hash_status
    ON reward_intent (ip_hash, status, claimed_at)
    WHERE ip_hash IS NOT NULL AND status = 'CLAIMED';
CREATE INDEX IF NOT EXISTS idx_ri_ad_session
    ON reward_intent (user_id, ad_session_id, status)
    WHERE ad_session_id IS NOT NULL;

ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS dialog_title VARCHAR(255);
ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS dialog_description TEXT;
ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS primary_cta_label VARCHAR(255);
ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS secondary_cta_label VARCHAR(255);
ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS analytics_key VARCHAR(255);
ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS is_reward_fallback_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS monetization_actions ADD COLUMN IF NOT EXISTS weekly_limit INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_token_amount INTEGER NOT NULL DEFAULT 10;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_ledger_reason VARCHAR(255);
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_one_time_only BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_registration_source VARCHAR(255);
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_helper_text TEXT;
