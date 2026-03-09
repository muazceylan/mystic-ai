CREATE TABLE IF NOT EXISTS raw_name_source_entries (
    id BIGSERIAL PRIMARY KEY,
    source_name VARCHAR(64) NOT NULL,
    source_url TEXT NOT NULL,
    external_name VARCHAR(255),
    raw_title TEXT,
    raw_html TEXT,
    raw_text TEXT,
    fetched_at TIMESTAMP NOT NULL,
    http_status INTEGER,
    parse_status VARCHAR(32) NOT NULL DEFAULT 'FETCHED',
    checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_name_source_entries_dedupe
    ON raw_name_source_entries (source_name, source_url, checksum);

CREATE INDEX IF NOT EXISTS idx_raw_name_source_entries_source_name
    ON raw_name_source_entries (source_name);

CREATE INDEX IF NOT EXISTS idx_raw_name_source_entries_parse_status
    ON raw_name_source_entries (parse_status);

CREATE TABLE IF NOT EXISTS parsed_name_candidates (
    id BIGSERIAL PRIMARY KEY,
    raw_entry_id BIGINT NOT NULL UNIQUE REFERENCES raw_name_source_entries (id) ON DELETE CASCADE,
    normalized_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    gender VARCHAR(24),
    meaning_short TEXT,
    meaning_long TEXT,
    origin VARCHAR(120),
    character_traits_text TEXT,
    letter_analysis_text TEXT,
    quran_flag BOOLEAN,
    source_confidence NUMERIC(5, 3) NOT NULL DEFAULT 0,
    mismatch_flag BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_content_flag BOOLEAN NOT NULL DEFAULT FALSE,
    content_quality VARCHAR(16) NOT NULL DEFAULT 'LOW',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_normalized_name
    ON parsed_name_candidates (normalized_name);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_content_quality
    ON parsed_name_candidates (content_quality);

CREATE INDEX IF NOT EXISTS idx_parsed_name_candidates_duplicate_content
    ON parsed_name_candidates (duplicate_content_flag);

CREATE TABLE IF NOT EXISTS name_merge_queue (
    id BIGSERIAL PRIMARY KEY,
    canonical_name VARCHAR(255) NOT NULL,
    candidate_ids TEXT NOT NULL DEFAULT '[]',
    conflicting_fields TEXT NOT NULL DEFAULT '[]',
    chosen_source VARCHAR(64),
    review_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    review_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_name_merge_queue_canonical_name
    ON name_merge_queue (canonical_name);

CREATE INDEX IF NOT EXISTS idx_name_merge_queue_review_status
    ON name_merge_queue (review_status);

CREATE TABLE IF NOT EXISTS names (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    gender VARCHAR(24),
    meaning_short TEXT,
    meaning_long TEXT,
    origin VARCHAR(120),
    character_traits_text TEXT,
    letter_analysis_text TEXT,
    quran_flag BOOLEAN,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_names_normalized_name
    ON names (normalized_name);
