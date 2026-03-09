CREATE TABLE IF NOT EXISTS name_tags (
    id BIGSERIAL PRIMARY KEY,
    name_id BIGINT NOT NULL,
    tag VARCHAR(120) NOT NULL,
    normalized_tag VARCHAR(120) NOT NULL,
    source VARCHAR(24) NOT NULL,
    confidence NUMERIC(5, 3) NOT NULL DEFAULT 1.000,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_name_tags_name_id
        FOREIGN KEY (name_id) REFERENCES names (id) ON DELETE CASCADE,
    CONSTRAINT uq_name_tags_name_id_normalized_tag
        UNIQUE (name_id, normalized_tag)
);

CREATE INDEX IF NOT EXISTS idx_name_tags_name_id
    ON name_tags (name_id);

CREATE INDEX IF NOT EXISTS idx_name_tags_normalized_tag
    ON name_tags (normalized_tag);

CREATE TABLE IF NOT EXISTS name_admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    name_id BIGINT NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    actor_email VARCHAR(255),
    old_value_json TEXT,
    new_value_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_name_admin_audit_name_id
        FOREIGN KEY (name_id) REFERENCES names (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_name_admin_audit_name_id
    ON name_admin_audit_logs (name_id);

CREATE INDEX IF NOT EXISTS idx_name_admin_audit_created_at
    ON name_admin_audit_logs (created_at DESC);

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'names'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE names DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

ALTER TABLE names
    ADD CONSTRAINT chk_names_status
        CHECK (status IN ('PENDING_REVIEW', 'ACTIVE', 'HIDDEN', 'REJECTED'));
