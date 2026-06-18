\set ON_ERROR_STOP on

-- psql rollback script for the Apple review account and related demo data.
\if :{?auth_db}
\else
\set auth_db mystic_auth
\endif
\if :{?astrology_db}
\else
\set astrology_db mystic_astrology
\endif
\if :{?notification_db}
\else
\set notification_db mystic_notification
\endif
\if :{?review_email}
\else
\set review_email review@astroguru.app
\endif

\echo 'Resolving Apple review user id from auth database...'
\connect :auth_db
SELECT COALESCE((
    SELECT id
      FROM users
     WHERE lower(email) = lower(:'review_email')
        OR lower(username) = lower(:'review_email')
     ORDER BY id
     LIMIT 1
), 0) AS review_user_id;
\gset
\echo 'Resolved auth user id:' :review_user_id

\echo 'Removing astrology demo data...'
\connect :astrology_db
BEGIN;

DROP TABLE IF EXISTS apple_review_seed_context;
CREATE TEMP TABLE apple_review_seed_context (
    user_id BIGINT NOT NULL
) ON COMMIT DROP;
INSERT INTO apple_review_seed_context (user_id) VALUES (:review_user_id);

DELETE FROM synastries s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id
   OR (s.person_a_type = 'USER' AND s.person_a_id = c.user_id);

DELETE FROM star_mate_score_cache s
USING apple_review_seed_context c
WHERE s.viewer_user_id = c.user_id
   OR s.candidate_user_id = c.user_id;

DELETE FROM star_mate_matches s
USING apple_review_seed_context c
WHERE s.user_a_id = c.user_id
   OR s.user_b_id = c.user_id;

DELETE FROM star_mate_likes s
USING apple_review_seed_context c
WHERE s.liker_id = c.user_id
   OR s.liked_id = c.user_id;

DELETE FROM saved_persons s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM star_mate_profiles s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM star_mate_preferences s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM dream_push_tokens s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM monthly_dream_stories s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM dream_symbols s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM dream_entries s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM daily_actions s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM daily_swot s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM daily_transits_cache s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM lucky_dates_results s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM feedback s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id;

DELETE FROM natal_charts s
USING apple_review_seed_context c
WHERE s.user_id = c.user_id::TEXT;

COMMIT;

\echo 'Removing premium access and notification-side rows if tables exist...'
\connect :notification_db
BEGIN;

DROP TABLE IF EXISTS apple_review_seed_context;
CREATE TEMP TABLE apple_review_seed_context (
    user_id BIGINT NOT NULL
) ON COMMIT DROP;
INSERT INTO apple_review_seed_context (user_id) VALUES (:review_user_id);

DO $$
DECLARE
    review_user_id BIGINT;
BEGIN
    SELECT user_id
      INTO review_user_id
      FROM apple_review_seed_context
     LIMIT 1;

    IF to_regclass('public.subscription_entitlement') IS NOT NULL THEN
        EXECUTE 'DELETE FROM subscription_entitlement WHERE user_id = $1'
        USING review_user_id;
    END IF;

    IF to_regclass('public.guru_ledger') IS NOT NULL THEN
        EXECUTE $sql$
            DELETE FROM guru_ledger
             WHERE user_id = $1
               AND (
                    idempotency_key = 'apple_review:manual_guru_grant'
                    OR source_key = 'apple_review'
               )
        $sql$ USING review_user_id;
    END IF;

    IF to_regclass('public.guru_wallet') IS NOT NULL THEN
        EXECUTE 'DELETE FROM guru_wallet WHERE user_id = $1'
        USING review_user_id;
    END IF;

    IF to_regclass('public.notification_preferences') IS NOT NULL THEN
        EXECUTE 'DELETE FROM notification_preferences WHERE user_id = $1'
        USING review_user_id;
    END IF;
END
$$;

COMMIT;

\echo 'Removing auth user and auth tokens...'
\connect :auth_db
BEGIN;

DELETE FROM link_account_otp
WHERE user_id = :review_user_id;

DELETE FROM password_reset_tokens
WHERE user_id = :review_user_id;

DELETE FROM email_verification_tokens
WHERE user_id = :review_user_id;

DELETE FROM user_roles
WHERE user_id = :review_user_id;

DELETE FROM users
WHERE id = :review_user_id
  AND (
      lower(email) = lower(:'review_email')
      OR lower(username) = lower(:'review_email')
  );

COMMIT;
\echo 'Apple review account rollback completed.'
