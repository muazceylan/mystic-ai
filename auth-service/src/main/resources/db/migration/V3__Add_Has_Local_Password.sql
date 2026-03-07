ALTER TABLE users ADD COLUMN IF NOT EXISTS has_local_password BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET has_local_password = TRUE WHERE provider IS NULL;
