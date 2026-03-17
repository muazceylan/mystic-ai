-- V6: Add user type fields for guest/quick-start session support
-- user_type distinguishes GUEST (anonymous) from REGISTERED (full account) users
ALTER TABLE users
    ADD COLUMN user_type      VARCHAR(20)  NOT NULL DEFAULT 'REGISTERED',
    ADD COLUMN is_anonymous   BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN is_account_linked BOOLEAN   NOT NULL DEFAULT FALSE;

-- Ensure all existing users are correctly marked as REGISTERED
UPDATE users SET user_type = 'REGISTERED', is_anonymous = FALSE, is_account_linked = FALSE
WHERE user_type IS NULL OR user_type = '';
