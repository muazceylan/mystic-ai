DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'users'
    ) THEN
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';

        UPDATE users
           SET account_status = 'ACTIVE'
         WHERE account_status IS NULL;
    END IF;
END $$;
