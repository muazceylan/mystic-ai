ALTER TABLE parsed_name_candidates
    ALTER COLUMN origin TYPE VARCHAR(255);

ALTER TABLE names
    ALTER COLUMN origin TYPE VARCHAR(255);
