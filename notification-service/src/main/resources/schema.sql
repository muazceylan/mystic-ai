-- Runs before Hibernate validation so legacy notification-service databases can
-- be safely extended without depending on ApplicationRunner timing.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'monetization_actions'
    ) THEN
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS dialog_title VARCHAR(255);
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS dialog_description TEXT;
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS primary_cta_label VARCHAR(255);
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS secondary_cta_label VARCHAR(255);
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS analytics_key VARCHAR(255);
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS is_reward_fallback_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS weekly_limit INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'monetization_settings'
    ) THEN
        ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_token_amount INTEGER NOT NULL DEFAULT 10;
        ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_ledger_reason VARCHAR(255);
        ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_one_time_only BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_registration_source VARCHAR(255);
        ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_helper_text TEXT;
    END IF;
END $$;
