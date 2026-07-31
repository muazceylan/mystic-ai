-- Hardens daily_personal_plans for production:
--   * the plan is keyed on the user's LOCAL calendar day, not the server/UTC day;
--   * exactly one ACTIVE plan per (user, local_date, locale), enforced by a partial index;
--   * REPLACED rows are retained so the duplicate-suppression window stays intact;
--   * indexes covering the history query, the feedback lookup and the retention job.
--
-- Idempotent and backward-compatible: V9 shipped `plan_date`/`plan_version`, so this migration
-- renames rather than drops, and existing rows keep their content.

-- ── local_date (was plan_date) ──────────────────────────────────────────────
ALTER TABLE daily_personal_plans RENAME COLUMN plan_date TO local_date;
ALTER TABLE daily_personal_plans RENAME COLUMN plan_version TO algorithm_version;

-- ── new identity / lifecycle columns ────────────────────────────────────────
ALTER TABLE daily_personal_plans
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);
ALTER TABLE daily_personal_plans
    ADD COLUMN IF NOT EXISTS generation_number INTEGER;
ALTER TABLE daily_personal_plans
    ADD COLUMN IF NOT EXISTS status VARCHAR(16);
ALTER TABLE daily_personal_plans
    ADD COLUMN IF NOT EXISTS regeneration_request_key VARCHAR(128);
ALTER TABLE daily_personal_plans
    ADD COLUMN IF NOT EXISTS version BIGINT;

-- Backfill before tightening: existing rows are the active plan for their day, generation 1.
UPDATE daily_personal_plans SET timezone = 'Europe/Istanbul' WHERE timezone IS NULL;
UPDATE daily_personal_plans
   SET generation_number = GREATEST(1, COALESCE(regeneration_count, 0) + 1)
 WHERE generation_number IS NULL;
UPDATE daily_personal_plans SET status = 'ACTIVE' WHERE status IS NULL;
UPDATE daily_personal_plans SET version = 0 WHERE version IS NULL;

ALTER TABLE daily_personal_plans ALTER COLUMN timezone SET NOT NULL;
ALTER TABLE daily_personal_plans ALTER COLUMN generation_number SET NOT NULL;
ALTER TABLE daily_personal_plans ALTER COLUMN status SET NOT NULL;

-- regeneration_count is superseded by generation_number.
ALTER TABLE daily_personal_plans DROP COLUMN IF EXISTS regeneration_count;

-- Fingerprints now hold both `sk:` (semantic key) and `ai:` (area+intent) entries.
ALTER TABLE daily_personal_plans ALTER COLUMN fingerprints TYPE VARCHAR(2048);

-- ── constraints ─────────────────────────────────────────────────────────────
-- The old constraint allowed one row per (user, date, locale); regeneration needs several,
-- with only one ACTIVE. A partial unique index expresses exactly that.
ALTER TABLE daily_personal_plans
    DROP CONSTRAINT IF EXISTS uk_daily_personal_plan_user_date_locale;

CREATE UNIQUE INDEX IF NOT EXISTS uk_daily_personal_plan_active
    ON daily_personal_plans (user_id, local_date, locale)
    WHERE status = 'ACTIVE';

-- Idempotency for repeated feedback submissions.
CREATE UNIQUE INDEX IF NOT EXISTS uk_daily_personal_plan_regen_request
    ON daily_personal_plans (user_id, local_date, locale, regeneration_request_key)
    WHERE regeneration_request_key IS NOT NULL;

-- ── indexes ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_daily_personal_plan_user_date;

CREATE INDEX IF NOT EXISTS idx_daily_personal_plan_user_local_date
    ON daily_personal_plans (user_id, local_date);

-- Covers the 7-day history window query (user + locale + date range + status).
CREATE INDEX IF NOT EXISTS idx_daily_personal_plan_history
    ON daily_personal_plans (user_id, locale, local_date, status);

-- Supports the retention job.
CREATE INDEX IF NOT EXISTS idx_daily_personal_plan_created_at
    ON daily_personal_plans (created_at);
