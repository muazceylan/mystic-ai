ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_bonus_sync_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUESTED';

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_bonus_registration_source VARCHAR(64);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_bonus_retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_bonus_last_attempt_at TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_bonus_next_retry_at TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_bonus_granted_at TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_bonus_last_error VARCHAR(512);

UPDATE users
SET signup_bonus_sync_status = 'NOT_REQUESTED'
WHERE signup_bonus_sync_status IS NULL;

UPDATE users
SET signup_bonus_retry_count = 0
WHERE signup_bonus_retry_count IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_signup_bonus_retry
    ON users (signup_bonus_sync_status, signup_bonus_next_retry_at);
