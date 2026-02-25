CREATE TABLE IF NOT EXISTS star_mate_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    bio TEXT,
    photos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    gender VARCHAR(30),
    interested_in VARCHAR(30) NOT NULL DEFAULT 'EVERYONE',
    birth_date DATE NOT NULL,
    location_label VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    min_compatibility_age INTEGER NOT NULL DEFAULT 18,
    max_compatibility_age INTEGER NOT NULL DEFAULT 99,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_star_mate_profile_age_range CHECK (min_compatibility_age <= max_compatibility_age)
);

CREATE INDEX IF NOT EXISTS idx_star_mate_profiles_active ON star_mate_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_star_mate_profiles_birth_date ON star_mate_profiles(birth_date);
CREATE INDEX IF NOT EXISTS idx_star_mate_profiles_lat_lng ON star_mate_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_star_mate_profiles_gender_interest ON star_mate_profiles(gender, interested_in);

CREATE TABLE IF NOT EXISTS star_mate_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    max_distance_km INTEGER NOT NULL DEFAULT 100,
    min_age INTEGER NOT NULL DEFAULT 18,
    max_age INTEGER NOT NULL DEFAULT 99,
    min_compatibility_score INTEGER NOT NULL DEFAULT 50,
    show_me VARCHAR(30) NOT NULL DEFAULT 'EVERYONE',
    strict_distance BOOLEAN NOT NULL DEFAULT FALSE,
    strict_age BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_star_mate_pref_age_range CHECK (min_age <= max_age),
    CONSTRAINT chk_star_mate_pref_score CHECK (min_compatibility_score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_star_mate_preferences_show_me ON star_mate_preferences(show_me);

CREATE TABLE IF NOT EXISTS star_mate_likes (
    id BIGSERIAL PRIMARY KEY,
    liker_id BIGINT NOT NULL,
    liked_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_star_mate_like_pair UNIQUE (liker_id, liked_id),
    CONSTRAINT chk_star_mate_like_not_self CHECK (liker_id <> liked_id)
);

CREATE INDEX IF NOT EXISTS idx_star_mate_likes_liker ON star_mate_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_star_mate_likes_liked ON star_mate_likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_star_mate_likes_type ON star_mate_likes(type);

CREATE TABLE IF NOT EXISTS star_mate_matches (
    id BIGSERIAL PRIMARY KEY,
    user_a_id BIGINT NOT NULL,
    user_b_id BIGINT NOT NULL,
    compatibility_score INTEGER NOT NULL,
    compatibility_summary TEXT,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_star_mate_match_pair UNIQUE (user_a_id, user_b_id),
    CONSTRAINT chk_star_mate_match_order CHECK (user_a_id < user_b_id),
    CONSTRAINT chk_star_mate_match_not_self CHECK (user_a_id <> user_b_id),
    CONSTRAINT chk_star_mate_match_score CHECK (compatibility_score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_star_mate_matches_user_a ON star_mate_matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_star_mate_matches_user_b ON star_mate_matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_star_mate_matches_blocked ON star_mate_matches(is_blocked);

CREATE TABLE IF NOT EXISTS star_mate_score_cache (
    id BIGSERIAL PRIMARY KEY,
    viewer_user_id BIGINT NOT NULL,
    candidate_user_id BIGINT NOT NULL,
    relationship_type VARCHAR(20) NOT NULL DEFAULT 'LOVE',
    compatibility_score INTEGER,
    compatibility_summary TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    calculated_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_star_mate_score_cache UNIQUE (viewer_user_id, candidate_user_id, relationship_type),
    CONSTRAINT chk_star_mate_score_cache_not_self CHECK (viewer_user_id <> candidate_user_id)
);

CREATE INDEX IF NOT EXISTS idx_star_mate_score_cache_viewer_status ON star_mate_score_cache(viewer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_star_mate_score_cache_candidate ON star_mate_score_cache(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_star_mate_score_cache_score ON star_mate_score_cache(compatibility_score DESC);
