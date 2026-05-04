-- Runs before Hibernate validation so legacy notification-service databases can
-- be safely extended without depending on ApplicationRunner timing.
-- Use plain PostgreSQL DDL because Spring's SQL initializer splits on ';' and
-- does not safely handle anonymous DO $$ ... $$ blocks here.

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id BIGINT NOT NULL,
    daily_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    intraday_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    planner_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    prayer_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    meditation_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    dream_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    evening_checkin_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    product_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    frequency_level VARCHAR(255) DEFAULT 'BALANCED',
    preferred_time_slot VARCHAR(255) DEFAULT 'MORNING',
    quiet_hours_start TIME DEFAULT '22:30:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timezone VARCHAR(255) DEFAULT 'Europe/Istanbul',
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_notification_preferences PRIMARY KEY (user_id)
);

ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS daily_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS intraday_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS weekly_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS planner_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS prayer_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS meditation_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS dream_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS evening_checkin_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS product_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS frequency_level VARCHAR(255) DEFAULT 'BALANCED';
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS preferred_time_slot VARCHAR(255) DEFAULT 'MORNING';
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:30:00';
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00:00';
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS timezone VARCHAR(255) DEFAULT 'Europe/Istanbul';
ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;

UPDATE notification_preferences SET frequency_level = 'BALANCED' WHERE frequency_level IS NULL;
UPDATE notification_preferences SET preferred_time_slot = 'MORNING' WHERE preferred_time_slot IS NULL;
UPDATE notification_preferences SET quiet_hours_start = '22:30:00' WHERE quiet_hours_start IS NULL;
UPDATE notification_preferences SET quiet_hours_end = '08:00:00' WHERE quiet_hours_end IS NULL;
UPDATE notification_preferences SET timezone = 'Europe/Istanbul' WHERE timezone IS NULL OR btrim(timezone) = '';
UPDATE notification_preferences SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

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

-- ─── Premium / Trial / Billing foundation (Phase 1 + Phase 2) ────────────
-- Defaults preserve the existing rewarded-ad + token gate behaviour: every
-- premium / trial flag is OFF until an admin explicitly turns it on.

ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS premium_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS default_trial_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS token_purchase_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS revenue_cat_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS revenue_cat_ios_api_key VARCHAR(255);
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS revenue_cat_android_api_key VARCHAR(255);
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS revenue_cat_environment VARCHAR(40);
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS hide_ads_for_premium_users BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS monetization_settings ADD COLUMN IF NOT EXISTS allow_premium_and_token_together BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE IF EXISTS module_monetization_rules ADD COLUMN IF NOT EXISTS premium_behavior VARCHAR(60) NOT NULL DEFAULT 'NO_CHANGE';
ALTER TABLE IF EXISTS module_monetization_rules ADD COLUMN IF NOT EXISTS premium_token_cost INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS module_monetization_rules ADD COLUMN IF NOT EXISTS premium_ad_free BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS module_monetization_rules ADD COLUMN IF NOT EXISTS trial_unlock_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS guru_product_catalog ADD COLUMN IF NOT EXISTS revenue_cat_product_id VARCHAR(255);
ALTER TABLE IF EXISTS guru_product_catalog ADD COLUMN IF NOT EXISTS entitlement_key VARCHAR(120);
ALTER TABLE IF EXISTS guru_product_catalog ADD COLUMN IF NOT EXISTS trial_duration_days INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS subscription_entitlement (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    entitlement_key VARCHAR(120) NOT NULL,
    provider VARCHAR(40) NOT NULL DEFAULT 'REVENUECAT',
    store VARCHAR(40),
    product_id VARCHAR(255),
    revenue_cat_customer_id VARCHAR(255),
    original_transaction_id VARCHAR(255),
    transaction_id VARCHAR(255),
    purchase_token TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'EXPIRED',
    trial_start_at TIMESTAMP(6),
    trial_end_at TIMESTAMP(6),
    current_period_start_at TIMESTAMP(6),
    current_period_end_at TIMESTAMP(6),
    auto_renew_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMP(6),
    expired_at TIMESTAMP(6),
    last_event_at TIMESTAMP(6),
    raw_payload TEXT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6),
    version BIGINT
);

CREATE INDEX IF NOT EXISTS idx_subent_user ON subscription_entitlement (user_id);
CREATE INDEX IF NOT EXISTS idx_subent_user_entitlement ON subscription_entitlement (user_id, entitlement_key);
CREATE INDEX IF NOT EXISTS idx_subent_status ON subscription_entitlement (status);
CREATE INDEX IF NOT EXISTS idx_subent_period_end ON subscription_entitlement (current_period_end_at);
CREATE INDEX IF NOT EXISTS idx_subent_original_tx ON subscription_entitlement (original_transaction_id);

CREATE TABLE IF NOT EXISTS purchase_event (
    id UUID PRIMARY KEY,
    user_id BIGINT,
    provider VARCHAR(40) NOT NULL,
    store VARCHAR(40),
    event_id VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(255),
    original_transaction_id VARCHAR(255),
    purchase_token TEXT,
    product_id VARCHAR(255),
    product_type VARCHAR(60),
    event_type VARCHAR(60) NOT NULL,
    token_amount_granted INTEGER,
    ledger_entry_id VARCHAR(255),
    entitlement_id BIGINT,
    processed_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    failure_reason TEXT,
    raw_payload TEXT,
    created_at TIMESTAMP(6) NOT NULL,
    processed_at TIMESTAMP(6),
    CONSTRAINT uk_pe_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_pe_user ON purchase_event (user_id);
CREATE INDEX IF NOT EXISTS idx_pe_provider ON purchase_event (provider);
CREATE INDEX IF NOT EXISTS idx_pe_event_type ON purchase_event (event_type);
CREATE INDEX IF NOT EXISTS idx_pe_processed ON purchase_event (processed_status);
CREATE INDEX IF NOT EXISTS idx_pe_product ON purchase_event (product_id);
CREATE INDEX IF NOT EXISTS idx_pe_original_tx ON purchase_event (original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pe_user_created ON purchase_event (user_id, created_at DESC);
