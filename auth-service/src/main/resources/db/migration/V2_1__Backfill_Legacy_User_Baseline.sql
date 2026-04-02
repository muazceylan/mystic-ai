-- Some local databases were baselined at version 1 before V0 existed, so they skipped
-- the baseline DDL entirely. Re-apply the baseline schema in an idempotent way before V3.
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    provider VARCHAR(20),
    social_id VARCHAR(255),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    name VARCHAR(100),
    birth_date DATE,
    birth_time VARCHAR(10),
    birth_location VARCHAR(200),
    birth_country VARCHAR(10),
    birth_city VARCHAR(100),
    birth_time_unknown BOOLEAN,
    timezone VARCHAR(50),
    gender VARCHAR(30),
    marital_status VARCHAR(30),
    zodiac_sign VARCHAR(50),
    preferred_language VARCHAR(5) DEFAULT 'tr',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uq_users_provider_social UNIQUE (provider, social_id)
);

ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS provider VARCHAR(20);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS social_id VARCHAR(255);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birth_time VARCHAR(10);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birth_location VARCHAR(200);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birth_country VARCHAR(10);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birth_city VARCHAR(100);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birth_time_unknown BOOLEAN;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS gender VARCHAR(30);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS zodiac_sign VARCHAR(50);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5);

ALTER TABLE IF EXISTS users
    ALTER COLUMN preferred_language SET DEFAULT 'tr';

UPDATE users
   SET preferred_language = 'tr'
 WHERE preferred_language IS NULL OR preferred_language = '';

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
