-- ===========================================
-- Mystic AI - Database Schemas Initialization
-- ===========================================

-- ==========================================
-- ENABLE PGVECTOR EXTENSION (for RAG)
-- ==========================================
\c mystic_auth;
CREATE EXTENSION IF NOT EXISTS vector;

\c mystic_tarot;
CREATE EXTENSION IF NOT EXISTS vector;

\c mystic_astrology;
CREATE EXTENSION IF NOT EXISTS vector;

\c mystic_vision;
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- AUTH SERVICE DATABASE
-- ==========================================
\c mystic_auth;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ==========================================
-- TAROT SERVICE DATABASE
-- ==========================================
\c mystic_tarot;

CREATE TABLE IF NOT EXISTS tarot_cards (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    arcana VARCHAR(10) NOT NULL,
    suit VARCHAR(20),
    card_number INTEGER,
    upright_keywords TEXT,
    reversed_keywords TEXT,
    image_url VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS tarot_readings (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    spread_type VARCHAR(50) NOT NULL,
    past_card_id BIGINT REFERENCES tarot_cards(id),
    past_reversed BOOLEAN,
    present_card_id BIGINT REFERENCES tarot_cards(id),
    present_reversed BOOLEAN,
    future_card_id BIGINT REFERENCES tarot_cards(id),
    future_reversed BOOLEAN,
    interpretation TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tarot_readings_user_id ON tarot_readings(user_id);
CREATE INDEX idx_tarot_readings_status ON tarot_readings(status);
CREATE INDEX idx_tarot_cards_arcana ON tarot_cards(arcana);

-- ==========================================
-- ASTROLOGY SERVICE DATABASE
-- ==========================================
\c mystic_astrology;

CREATE TABLE IF NOT EXISTS zodiac_signs (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    symbol VARCHAR(10),
    element VARCHAR(20),
    modality VARCHAR(20),
    ruling_planet VARCHAR(50),
    date_start VARCHAR(10),
    date_end VARCHAR(10),
    keywords TEXT
);

CREATE TABLE IF NOT EXISTS natal_charts (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    birth_time TIME,
    birth_place VARCHAR(200),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    sun_sign VARCHAR(50),
    moon_sign VARCHAR(50),
    rising_sign VARCHAR(50),
    chart_data JSONB,
    interpretation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS horoscopes (
    id BIGSERIAL PRIMARY KEY,
    zodiac_sign VARCHAR(50) NOT NULL,
    horoscope_date DATE NOT NULL,
    horoscope_type VARCHAR(20) DEFAULT 'DAILY',
    content TEXT,
    lucky_number INTEGER,
    lucky_color VARCHAR(50),
    mood VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(zodiac_sign, horoscope_date, horoscope_type)
);

CREATE INDEX idx_natal_charts_user_id ON natal_charts(user_id);
CREATE INDEX idx_horoscopes_date ON horoscopes(horoscope_date);

-- ==========================================
-- VISION SERVICE DATABASE
-- ==========================================
\c mystic_vision;

CREATE TABLE IF NOT EXISTS image_analyses (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    image_url VARCHAR(1000),
    image_type VARCHAR(50),
    analysis_type VARCHAR(50) NOT NULL,
    analysis_result JSONB,
    interpretation TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS palm_readings (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    image_url VARCHAR(1000),
    hand_type VARCHAR(20),
    life_line TEXT,
    heart_line TEXT,
    head_line TEXT,
    fate_line TEXT,
    interpretation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aura_readings (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    image_url VARCHAR(1000),
    dominant_color VARCHAR(50),
    secondary_colors JSONB,
    aura_analysis JSONB,
    interpretation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_image_analyses_user_id ON image_analyses(user_id);
CREATE INDEX idx_palm_readings_user_id ON palm_readings(user_id);
CREATE INDEX idx_aura_readings_user_id ON aura_readings(user_id);

-- ==========================================
-- Grant permissions
-- ==========================================
\c mystic_auth;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mystic;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mystic;

\c mystic_tarot;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mystic;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mystic;

\c mystic_astrology;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mystic;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mystic;

\c mystic_vision;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mystic;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mystic;
