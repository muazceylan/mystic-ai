-- ============================================================
-- Migration: V002 — Rewarded Ads Hardening
-- Service:   notification-service (mystic_notification DB)
-- Purpose:
--   1. Add claim_fingerprint column to reward_intent.
--      Fingerprint = SHA-256(intentId|adSessionId|clientEventId).
--      Used to distinguish safe idempotent retries (same fingerprint → 200)
--      from suspicious replays (different fingerprint → 409).
--   2. Add unique index on claim_fingerprint (non-null values only).
--      Prevents concurrent claims from storing two different fingerprints.
--   3. Add reward_intent_id FK column to guru_ledger for audit linkage.
--   4. Verify / add any missing indexes from V001.
--
-- NOTE: All changes are additive (ALTER ADD COLUMN / CREATE INDEX IF NOT EXISTS).
--       Existing data is preserved. Downtime is not required.
-- ============================================================

-- ── 1. claim_fingerprint on reward_intent ──────────────────────────────────

ALTER TABLE reward_intent
    ADD COLUMN IF NOT EXISTS claim_fingerprint VARCHAR(64);

-- Unique index: only one fingerprint per distinct value (NULL values excluded).
-- Prevents a race condition where two concurrent claim requests both pass the
-- "not yet claimed" check and try to store different fingerprints.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ri_claim_fingerprint
    ON reward_intent (claim_fingerprint)
    WHERE claim_fingerprint IS NOT NULL;

-- ── 2. reward_intent_id on guru_ledger (audit linkage) ────────────────────

-- Nullable FK — existing ledger rows predate this migration.
-- Populated on new claims; allows JOINing ledger entries back to their
-- originating reward intent for fraud investigation and audit queries.
ALTER TABLE guru_ledger
    ADD COLUMN IF NOT EXISTS reward_intent_id UUID REFERENCES reward_intent(id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gl_reward_intent_id
    ON guru_ledger (reward_intent_id)
    WHERE reward_intent_id IS NOT NULL;

-- ── 3. Verify / add V001 indexes that may not have been applied ───────────

-- These are idempotent (IF NOT EXISTS). Safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ri_idempotency
    ON reward_intent (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_ri_user_status
    ON reward_intent (user_id, status);

CREATE INDEX IF NOT EXISTS idx_ri_user_created
    ON reward_intent (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ri_user_claimed
    ON reward_intent (user_id, claimed_at DESC)
    WHERE claimed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ri_expires
    ON reward_intent (expires_at)
    WHERE status IN ('PENDING','AD_READY','AD_SHOWN','GRANTED');

CREATE INDEX IF NOT EXISTS idx_ri_ip_hash_status
    ON reward_intent (ip_hash, status, claimed_at)
    WHERE ip_hash IS NOT NULL AND status = 'CLAIMED';

CREATE INDEX IF NOT EXISTS idx_ri_ad_session
    ON reward_intent (user_id, ad_session_id, status)
    WHERE ad_session_id IS NOT NULL;

-- ── 4. Constraint comment updates ─────────────────────────────────────────

COMMENT ON COLUMN reward_intent.claim_fingerprint IS
    'SHA-256(intentId|adSessionId|clientEventId). Same fingerprint = safe idempotent retry (200). '
    'Different fingerprint on claimed intent = SESSION_CONFLICT (409).';

COMMENT ON COLUMN guru_ledger.reward_intent_id IS
    'FK to reward_intent. Populated for WEB_REWARDED_AD source. Null for other ledger entry types.';
