-- Baseline schema for fresh databases. V1/V2 only alter users when the table already existed (legacy Hibernate);
-- without this migration, Flyway runs V1–V2 as no-ops and V3 fails with "relation users does not exist".

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

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
