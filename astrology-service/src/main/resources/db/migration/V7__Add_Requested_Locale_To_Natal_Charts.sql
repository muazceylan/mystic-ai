-- requested_locale + heuristic backfill.
-- Legacy mystic_astrology DBs may predate full V1 DDL — align natal_charts columns before indexes / updates.

ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS birth_time TIME;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS birth_location VARCHAR(255);
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS sun_sign VARCHAR(255);
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS moon_sign VARCHAR(255);
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS rising_sign VARCHAR(255);
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS ascendant_degree DOUBLE PRECISION;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS mc_degree DOUBLE PRECISION;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS utc_offset DOUBLE PRECISION;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS planet_positions_json TEXT;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS house_placements_json TEXT;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS aspects_json TEXT;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS ai_interpretation TEXT;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS interpretation_status VARCHAR(255);
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP;
ALTER TABLE natal_charts
    ADD COLUMN IF NOT EXISTS requested_locale VARCHAR(10);

-- Older Hibernate used "interpretation" instead of "ai_interpretation"
DO
$$
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'natal_charts'
              AND column_name = 'interpretation'
        ) THEN
            UPDATE natal_charts
            SET ai_interpretation = interpretation
            WHERE ai_interpretation IS NULL
              AND interpretation IS NOT NULL;
        END IF;
    END
$$;

UPDATE natal_charts
SET requested_locale = 'tr'
WHERE requested_locale IS NULL
  AND ai_interpretation IS NOT NULL
  AND (
    ai_interpretation ~* '[çğıöşüİ]'
    OR lower(ai_interpretation) LIKE '%harita%'
    OR lower(ai_interpretation) LIKE '%yükselen%'
    OR lower(ai_interpretation) LIKE '%gezegen%'
    OR lower(ai_interpretation) LIKE '%duygusal%'
    );

UPDATE natal_charts
SET requested_locale = 'en'
WHERE requested_locale IS NULL
  AND ai_interpretation IS NOT NULL
  AND (
    lower(ai_interpretation) LIKE '%your %'
    OR lower(ai_interpretation) LIKE '%birth chart%'
    OR lower(ai_interpretation) LIKE '%rising sign%'
    OR lower(ai_interpretation) LIKE '%emotional%'
    OR lower(ai_interpretation) LIKE '%planet%'
    );

CREATE INDEX IF NOT EXISTS idx_natal_charts_user_signature
    ON natal_charts (user_id, birth_date, birth_time, calculated_at DESC, id DESC);
