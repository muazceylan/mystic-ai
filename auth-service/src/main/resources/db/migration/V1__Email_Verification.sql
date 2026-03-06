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

        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

        UPDATE users
           SET account_status = 'ACTIVE'
         WHERE account_status IS NULL;

        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP NULL,
            revoked_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_email_verification_tokens_user
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user
            ON email_verification_tokens(user_id);

        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires
            ON email_verification_tokens(expires_at);
    END IF;
END $$;
