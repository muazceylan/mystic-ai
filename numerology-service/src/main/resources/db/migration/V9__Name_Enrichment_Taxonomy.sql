CREATE TABLE IF NOT EXISTS name_tag_taxonomy (
    tag_group VARCHAR(32) NOT NULL,
    tag_value VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tag_group, tag_value)
);

INSERT INTO name_tag_taxonomy (tag_group, tag_value)
VALUES
    ('STYLE', 'modern'),
    ('STYLE', 'classic'),
    ('STYLE', 'timeless'),
    ('STYLE', 'minimalist'),
    ('VIBE', 'strong'),
    ('VIBE', 'soft'),
    ('VIBE', 'elegant'),
    ('VIBE', 'charismatic'),
    ('VIBE', 'spiritual'),
    ('THEME', 'light'),
    ('THEME', 'moon'),
    ('THEME', 'water'),
    ('THEME', 'power'),
    ('THEME', 'love'),
    ('THEME', 'wisdom'),
    ('THEME', 'nature'),
    ('CULTURE', 'turkish'),
    ('CULTURE', 'arabic'),
    ('CULTURE', 'persian'),
    ('CULTURE', 'mixed_usage'),
    ('RELIGION', 'islamic'),
    ('RELIGION', 'quranic'),
    ('RELIGION', 'neutral'),
    ('USAGE', 'popular'),
    ('USAGE', 'balanced'),
    ('USAGE', 'niche')
ON CONFLICT DO NOTHING;

ALTER TABLE name_tags
    ADD COLUMN IF NOT EXISTS tag_group VARCHAR(32);

ALTER TABLE name_tags
    ADD COLUMN IF NOT EXISTS evidence TEXT;

ALTER TABLE name_tags
    ADD COLUMN IF NOT EXISTS enrichment_version INTEGER;

CREATE INDEX IF NOT EXISTS idx_name_tags_tag_group
    ON name_tags (tag_group);

CREATE INDEX IF NOT EXISTS idx_name_tags_source
    ON name_tags (source);

CREATE INDEX IF NOT EXISTS idx_name_tags_name_id_tag_group
    ON name_tags (name_id, tag_group);

UPDATE name_tags nt
SET tag_group = tax.tag_group
FROM name_tag_taxonomy tax
WHERE nt.tag_group IS NULL
  AND lower(nt.tag) = tax.tag_value;

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'name_tags'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%source%'
    LOOP
        EXECUTE format('ALTER TABLE name_tags DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

ALTER TABLE name_tags
    ADD CONSTRAINT chk_name_tags_source
        CHECK (source IN ('MANUAL', 'AUTO', 'RULE', 'AI'));

ALTER TABLE name_tags
    DROP CONSTRAINT IF EXISTS fk_name_tags_taxonomy;

ALTER TABLE name_tags
    ADD CONSTRAINT fk_name_tags_taxonomy
        FOREIGN KEY (tag_group, tag)
            REFERENCES name_tag_taxonomy (tag_group, tag_value)
            ON UPDATE CASCADE;

ALTER TABLE name_tags
    DROP CONSTRAINT IF EXISTS chk_name_tags_rule_ai_require_taxonomy;

ALTER TABLE name_tags
    ADD CONSTRAINT chk_name_tags_rule_ai_require_taxonomy
        CHECK (
            (source IN ('RULE', 'AI') AND tag_group IS NOT NULL)
            OR source IN ('MANUAL', 'AUTO')
        );

CREATE TABLE IF NOT EXISTS name_enrichment_runs (
    id BIGSERIAL PRIMARY KEY,
    trigger_type VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL,
    enrichment_version VARCHAR(32) NOT NULL,
    processed_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    low_confidence_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    error_summary TEXT,
    triggered_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_name_enrichment_runs_started_at
    ON name_enrichment_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_name_enrichment_runs_status
    ON name_enrichment_runs (status);

CREATE INDEX IF NOT EXISTS idx_name_enrichment_runs_trigger_type
    ON name_enrichment_runs (trigger_type);
