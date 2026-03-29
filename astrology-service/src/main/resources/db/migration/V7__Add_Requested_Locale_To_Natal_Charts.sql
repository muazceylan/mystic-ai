ALTER TABLE natal_charts
ADD COLUMN IF NOT EXISTS requested_locale VARCHAR(10);

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
ON natal_charts(user_id, birth_date, birth_time, calculated_at DESC, id DESC);
