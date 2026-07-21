ALTER TABLE users
    ADD COLUMN IF NOT EXISTS registration_platform VARCHAR(20);
