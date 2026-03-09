ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS merge_recommendation_status VARCHAR(32);

ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS recommended_canonical_name_id BIGINT;

ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS recommended_canonical_name VARCHAR(255);

ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS recommended_field_sources TEXT;

ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS auto_merge_eligible BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS auto_merge_reason_summary TEXT;

ALTER TABLE name_merge_queue
    ADD COLUMN IF NOT EXISTS merge_confidence NUMERIC(5, 3);

UPDATE name_merge_queue
SET merge_recommendation_status = COALESCE(merge_recommendation_status, 'MANUAL_REVIEW_REQUIRED');

ALTER TABLE name_merge_queue
    ALTER COLUMN merge_recommendation_status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_name_merge_queue_recommended_canonical'
          AND table_name = 'name_merge_queue'
    ) THEN
        ALTER TABLE name_merge_queue
            ADD CONSTRAINT fk_name_merge_queue_recommended_canonical
                FOREIGN KEY (recommended_canonical_name_id) REFERENCES names (id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'name_merge_queue'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%merge_recommendation_status%'
    LOOP
        EXECUTE format('ALTER TABLE name_merge_queue DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

ALTER TABLE name_merge_queue
    ADD CONSTRAINT chk_name_merge_queue_recommendation_status
        CHECK (merge_recommendation_status IN ('AUTO_MERGE_ELIGIBLE', 'MERGE_SUGGESTED', 'MANUAL_REVIEW_REQUIRED'));

CREATE INDEX IF NOT EXISTS idx_name_merge_queue_auto_merge_eligible
    ON name_merge_queue (auto_merge_eligible, review_status, updated_at DESC);
