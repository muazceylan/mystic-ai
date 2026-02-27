-- Prayer: shortBenefitTr, tagsJson, relatedAyahRef
ALTER TABLE prayers ADD COLUMN IF NOT EXISTS short_benefit_tr TEXT;
ALTER TABLE prayers ADD COLUMN IF NOT EXISTS tags_json TEXT;
ALTER TABLE prayers ADD COLUMN IF NOT EXISTS related_ayah_ref VARCHAR(32);

-- AsmaulHusna: nameTr, shortBenefitTr, tagsJson, sourceProvider
ALTER TABLE asmaul_husna ADD COLUMN IF NOT EXISTS name_tr VARCHAR(128);
ALTER TABLE asmaul_husna ADD COLUMN IF NOT EXISTS short_benefit_tr TEXT;
ALTER TABLE asmaul_husna ADD COLUMN IF NOT EXISTS tags_json TEXT;
ALTER TABLE asmaul_husna ADD COLUMN IF NOT EXISTS source_provider VARCHAR(64);

-- MeditationExercise: titleTr, description, benefitsJson, difficulty, icon
ALTER TABLE meditation_exercises ADD COLUMN IF NOT EXISTS title_tr VARCHAR(160);
ALTER TABLE meditation_exercises ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE meditation_exercises ADD COLUMN IF NOT EXISTS benefits_json TEXT;
ALTER TABLE meditation_exercises ADD COLUMN IF NOT EXISTS difficulty VARCHAR(24);
ALTER TABLE meditation_exercises ADD COLUMN IF NOT EXISTS icon VARCHAR(64);
