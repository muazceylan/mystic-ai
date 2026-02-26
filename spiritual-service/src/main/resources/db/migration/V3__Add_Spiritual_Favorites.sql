CREATE TABLE IF NOT EXISTS user_prayer_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    prayer_id BIGINT NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_prayer_favorites_user_prayer
    ON user_prayer_favorites(user_id, prayer_id);

CREATE INDEX IF NOT EXISTS idx_user_prayer_favorites_user
    ON user_prayer_favorites(user_id, created_at DESC);

