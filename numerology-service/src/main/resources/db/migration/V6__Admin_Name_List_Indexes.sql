CREATE INDEX IF NOT EXISTS idx_names_status_updated_at
    ON names (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_names_gender
    ON names (gender);

CREATE INDEX IF NOT EXISTS idx_names_origin
    ON names (origin);

CREATE INDEX IF NOT EXISTS idx_names_created_at
    ON names (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_names_name_lower
    ON names ((lower(name)));

CREATE INDEX IF NOT EXISTS idx_names_normalized_name_lower
    ON names ((lower(normalized_name)));
