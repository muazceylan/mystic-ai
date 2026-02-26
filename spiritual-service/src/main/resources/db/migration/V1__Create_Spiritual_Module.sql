CREATE TABLE IF NOT EXISTS prayers (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(64) NOT NULL,
    source_label VARCHAR(32) NOT NULL,
    source_note TEXT,
    arabic_text TEXT,
    transliteration_tr TEXT NOT NULL,
    meaning_tr TEXT NOT NULL,
    translations_jsonb JSONB,
    recommended_repeat_count INTEGER NOT NULL DEFAULT 1,
    estimated_read_seconds INTEGER NOT NULL,
    is_favoritable BOOLEAN NOT NULL DEFAULT TRUE,
    disclaimer_text TEXT,
    difficulty_level SMALLINT DEFAULT 1,
    theme_tags TEXT[],
    active BOOLEAN NOT NULL DEFAULT TRUE,
    content_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prayers_category_active ON prayers(category, active);
CREATE INDEX IF NOT EXISTS idx_prayers_active ON prayers(active);

CREATE TABLE IF NOT EXISTS prayer_sets (
    id BIGSERIAL PRIMARY KEY,
    set_date DATE NOT NULL,
    locale VARCHAR(8) NOT NULL DEFAULT 'tr',
    selection_scope VARCHAR(16) NOT NULL,
    user_id BIGINT NULL,
    algo_version VARCHAR(32) NOT NULL,
    seed_hash VARCHAR(64) NOT NULL,
    set_size SMALLINT NOT NULL,
    ab_variant VARCHAR(16),
    generated_by VARCHAR(16) NOT NULL DEFAULT 'SYSTEM',
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prayer_sets_user_date ON prayer_sets(user_id, set_date DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_sets_date ON prayer_sets(set_date DESC);

CREATE TABLE IF NOT EXISTS prayer_set_items (
    id BIGSERIAL PRIMARY KEY,
    prayer_set_id BIGINT NOT NULL REFERENCES prayer_sets(id) ON DELETE CASCADE,
    prayer_id BIGINT NOT NULL REFERENCES prayers(id),
    display_order SMALLINT NOT NULL,
    target_repeat_count INTEGER,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    reason_code VARCHAR(64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_prayer_set_items_order ON prayer_set_items(prayer_set_id, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS uq_prayer_set_items_prayer ON prayer_set_items(prayer_set_id, prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_set_items_prayer ON prayer_set_items(prayer_id);

CREATE TABLE IF NOT EXISTS asmaul_husna (
    id BIGSERIAL PRIMARY KEY,
    order_no SMALLINT UNIQUE NOT NULL,
    arabic_name VARCHAR(128) NOT NULL,
    transliteration_tr VARCHAR(128) NOT NULL,
    meaning_tr VARCHAR(256) NOT NULL,
    reflection_text_tr TEXT NOT NULL,
    theme VARCHAR(64),
    source_note TEXT,
    recommended_dhikr_count INTEGER,
    translations_jsonb JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asma_theme ON asmaul_husna(theme);
CREATE INDEX IF NOT EXISTS idx_asma_active ON asmaul_husna(active);

CREATE TABLE IF NOT EXISTS asma_daily (
    id BIGSERIAL PRIMARY KEY,
    daily_date DATE NOT NULL,
    locale VARCHAR(8) NOT NULL DEFAULT 'tr',
    selection_scope VARCHAR(16) NOT NULL,
    user_id BIGINT NULL,
    asma_id BIGINT NOT NULL REFERENCES asmaul_husna(id),
    algo_version VARCHAR(32) NOT NULL,
    seed_hash VARCHAR(64) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asma_daily_user_date ON asma_daily(user_id, daily_date DESC);

CREATE TABLE IF NOT EXISTS meditation_exercises (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) UNIQUE,
    title VARCHAR(160) NOT NULL,
    type VARCHAR(24) NOT NULL,
    focus_theme VARCHAR(64) NOT NULL,
    duration_sec INTEGER NOT NULL,
    steps_json TEXT NOT NULL,
    breathing_pattern_json TEXT,
    animation_mode VARCHAR(32),
    background_audio_url VARCHAR(500),
    background_audio_enabled_by_default BOOLEAN NOT NULL DEFAULT FALSE,
    disclaimer_text TEXT,
    difficulty_level SMALLINT DEFAULT 1,
    translations_jsonb JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meditation_exercises_type_active ON meditation_exercises(type, active);
CREATE INDEX IF NOT EXISTS idx_meditation_exercises_focus ON meditation_exercises(focus_theme);

CREATE TABLE IF NOT EXISTS meditation_daily (
    id BIGSERIAL PRIMARY KEY,
    daily_date DATE NOT NULL,
    locale VARCHAR(8) NOT NULL DEFAULT 'tr',
    selection_scope VARCHAR(16) NOT NULL,
    user_id BIGINT NULL,
    exercise_id BIGINT NOT NULL REFERENCES meditation_exercises(id),
    algo_version VARCHAR(32) NOT NULL,
    seed_hash VARCHAR(64) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meditation_daily_user_date ON meditation_daily(user_id, daily_date DESC);

CREATE TABLE IF NOT EXISTS dhikr_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(16) NOT NULL,
    prayer_id BIGINT NULL REFERENCES prayers(id),
    asma_id BIGINT NULL REFERENCES asmaul_husna(id),
    total_repeat_count INTEGER NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 1,
    mood VARCHAR(32),
    note TEXT,
    source VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    client_session_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dhikr_entries_type_ref CHECK (
        (entry_type = 'PRAYER' AND prayer_id IS NOT NULL AND asma_id IS NULL) OR
        (entry_type = 'ASMA' AND asma_id IS NOT NULL AND prayer_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_dhikr_entries_user_date ON dhikr_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_dhikr_entries_user_type_date ON dhikr_entries(user_id, entry_type, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_dhikr_entries_prayer ON dhikr_entries(prayer_id);
CREATE INDEX IF NOT EXISTS idx_dhikr_entries_asma ON dhikr_entries(asma_id);

CREATE TABLE IF NOT EXISTS meditation_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_date DATE NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    exercise_id BIGINT NOT NULL REFERENCES meditation_exercises(id),
    target_duration_sec INTEGER NOT NULL,
    actual_duration_sec INTEGER NOT NULL,
    completed_cycles INTEGER,
    mood_before VARCHAR(32),
    mood_after VARCHAR(32),
    note TEXT,
    status VARCHAR(16) NOT NULL,
    client_session_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_date ON meditation_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_exercise ON meditation_sessions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_started ON meditation_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    content_language VARCHAR(8) NOT NULL DEFAULT 'tr',
    font_scale NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    reading_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    keep_screen_awake BOOLEAN NOT NULL DEFAULT FALSE,
    tts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    tts_default_lang VARCHAR(8),
    tts_voice_id VARCHAR(120),
    prayer_counter_haptic BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_schedule_json JSONB,
    short_prayers_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    privacy_export_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ab_overrides_json JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_reminder_enabled ON user_preferences(reminder_enabled);

CREATE TABLE IF NOT EXISTS content_reports (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content_type VARCHAR(32) NOT NULL,
    content_id BIGINT NOT NULL,
    reason VARCHAR(64) NOT NULL,
    note TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);

