\set ON_ERROR_STOP on

-- psql script. Defaults match local service configuration.
-- Override with -v auth_db=... -v astrology_db=... -v notification_db=...
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
\if :{?review_entitlement_days}
\else
\set review_entitlement_days 90
\endif

\if :{?review_password_hash}
\else
\echo 'ERROR: review_password_hash is required. Generate it with ops/apple-review/GenerateReviewPasswordHash.java.'
\quit 1
\endif

SELECT CASE
           WHEN :'review_password_hash' ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
               THEN 'true'
           ELSE 'false'
       END AS review_hash_ok;
\gset
\if :review_hash_ok
\else
\echo 'ERROR: review_password_hash must be a BCrypt hash, not a plaintext password.'
\quit 1
\endif

\echo 'Seeding Apple review user in auth database...'
\connect :auth_db
BEGIN;

WITH target AS (
    SELECT id
    FROM users
    WHERE lower(email) = lower(:'review_email')
       OR lower(username) = lower(:'review_email')
    ORDER BY id
    LIMIT 1
),
updated AS (
    UPDATE users
       SET username = lower(:'review_email'),
           email = lower(:'review_email'),
           password = :'review_password_hash',
           provider = NULL,
           social_id = NULL,
           first_name = 'Apple',
           last_name = 'Reviewer',
           name = 'Apple Reviewer',
           birth_date = DATE '1994-06-15',
           birth_time = '10:30',
           birth_location = 'Istanbul, Turkey',
           birth_country = 'TR',
           birth_city = 'Istanbul',
           birth_latitude = 41.0082,
           birth_longitude = 28.9784,
           birth_time_unknown = FALSE,
           timezone = 'Europe/Istanbul',
           gender = 'WOMAN',
           marital_status = 'SINGLE',
           zodiac_sign = 'Gemini',
           preferred_language = 'tr',
           enabled = TRUE,
           account_status = 'ACTIVE',
           email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
           has_local_password = TRUE,
           user_type = 'REGISTERED',
           is_anonymous = FALSE,
           is_account_linked = FALSE,
           signup_bonus_sync_status = 'SKIPPED',
           signup_bonus_registration_source = NULL,
           signup_bonus_retry_count = 0,
           signup_bonus_last_attempt_at = NULL,
           signup_bonus_next_retry_at = NULL,
           signup_bonus_granted_at = NULL,
           signup_bonus_last_error = NULL,
           created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
     WHERE id = (SELECT id FROM target)
     RETURNING id
),
inserted AS (
    INSERT INTO users (
        username,
        email,
        password,
        provider,
        social_id,
        first_name,
        last_name,
        name,
        birth_date,
        birth_time,
        birth_location,
        birth_country,
        birth_city,
        birth_latitude,
        birth_longitude,
        birth_time_unknown,
        timezone,
        gender,
        marital_status,
        zodiac_sign,
        preferred_language,
        enabled,
        account_status,
        email_verified_at,
        has_local_password,
        user_type,
        is_anonymous,
        is_account_linked,
        signup_bonus_sync_status,
        signup_bonus_retry_count,
        created_at,
        updated_at
    )
    SELECT lower(:'review_email'),
           lower(:'review_email'),
           :'review_password_hash',
           NULL,
           NULL,
           'Apple',
           'Reviewer',
           'Apple Reviewer',
           DATE '1994-06-15',
           '10:30',
           'Istanbul, Turkey',
           'TR',
           'Istanbul',
           41.0082,
           28.9784,
           FALSE,
           'Europe/Istanbul',
           'WOMAN',
           'SINGLE',
           'Gemini',
           'tr',
           TRUE,
           'ACTIVE',
           CURRENT_TIMESTAMP,
           TRUE,
           'REGISTERED',
           FALSE,
           FALSE,
           'SKIPPED',
           0,
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM updated)
    ON CONFLICT (email) DO UPDATE
       SET username = EXCLUDED.username,
           password = EXCLUDED.password,
           provider = NULL,
           social_id = NULL,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           name = EXCLUDED.name,
           birth_date = EXCLUDED.birth_date,
           birth_time = EXCLUDED.birth_time,
           birth_location = EXCLUDED.birth_location,
           birth_country = EXCLUDED.birth_country,
           birth_city = EXCLUDED.birth_city,
           birth_latitude = EXCLUDED.birth_latitude,
           birth_longitude = EXCLUDED.birth_longitude,
           birth_time_unknown = EXCLUDED.birth_time_unknown,
           timezone = EXCLUDED.timezone,
           gender = EXCLUDED.gender,
           marital_status = EXCLUDED.marital_status,
           zodiac_sign = EXCLUDED.zodiac_sign,
           preferred_language = EXCLUDED.preferred_language,
           enabled = TRUE,
           account_status = 'ACTIVE',
           email_verified_at = COALESCE(users.email_verified_at, CURRENT_TIMESTAMP),
           has_local_password = TRUE,
           user_type = 'REGISTERED',
           is_anonymous = FALSE,
           is_account_linked = FALSE,
           signup_bonus_sync_status = 'SKIPPED',
           signup_bonus_registration_source = NULL,
           signup_bonus_retry_count = 0,
           signup_bonus_last_attempt_at = NULL,
           signup_bonus_next_retry_at = NULL,
           signup_bonus_granted_at = NULL,
           signup_bonus_last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
     RETURNING id
),
resolved AS (
    SELECT id FROM updated
    UNION ALL
    SELECT id FROM inserted
)
SELECT id AS review_user_id
FROM resolved
LIMIT 1;
\gset

INSERT INTO user_roles (user_id, role)
VALUES (:review_user_id, 'USER')
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM email_verification_tokens
WHERE user_id = :review_user_id;

DELETE FROM password_reset_tokens
WHERE user_id = :review_user_id;

COMMIT;
\echo 'Auth user id:' :review_user_id

\echo 'Seeding astrology demo data...'
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

INSERT INTO natal_charts (
    user_id,
    name,
    birth_date,
    birth_time,
    birth_location,
    latitude,
    longitude,
    sun_sign,
    moon_sign,
    rising_sign,
    ascendant_degree,
    mc_degree,
    utc_offset,
    planet_positions_json,
    house_placements_json,
    aspects_json,
    ai_interpretation,
    interpretation_status,
    requested_locale,
    calculated_at
)
SELECT c.user_id::TEXT,
       'Apple Reviewer',
       DATE '1994-06-15',
       TIME '10:30:00',
       'Istanbul, Turkey',
       41.0082,
       28.9784,
       'Gemini',
       'Virgo',
       'Virgo',
       12.4,
       91.2,
       3.0,
       $$[
         {"planet":"Sun","sign":"Gemini","degree":24.1,"minutes":6,"seconds":0,"retrograde":false,"house":10,"absoluteLongitude":84.1},
         {"planet":"Moon","sign":"Virgo","degree":12.3,"minutes":18,"seconds":0,"retrograde":false,"house":1,"absoluteLongitude":162.3},
         {"planet":"Mercury","sign":"Cancer","degree":2.7,"minutes":42,"seconds":0,"retrograde":false,"house":10,"absoluteLongitude":92.7},
         {"planet":"Venus","sign":"Leo","degree":6.5,"minutes":30,"seconds":0,"retrograde":false,"house":11,"absoluteLongitude":126.5},
         {"planet":"Mars","sign":"Taurus","degree":19.4,"minutes":24,"seconds":0,"retrograde":false,"house":9,"absoluteLongitude":49.4},
         {"planet":"Jupiter","sign":"Scorpio","degree":5.8,"minutes":48,"seconds":0,"retrograde":true,"house":3,"absoluteLongitude":215.8},
         {"planet":"Saturn","sign":"Pisces","degree":12.6,"minutes":36,"seconds":0,"retrograde":false,"house":6,"absoluteLongitude":342.6},
         {"planet":"Uranus","sign":"Capricorn","degree":25.2,"minutes":12,"seconds":0,"retrograde":true,"house":5,"absoluteLongitude":295.2},
         {"planet":"Neptune","sign":"Capricorn","degree":22.7,"minutes":42,"seconds":0,"retrograde":true,"house":5,"absoluteLongitude":292.7},
         {"planet":"Pluto","sign":"Scorpio","degree":25.4,"minutes":24,"seconds":0,"retrograde":true,"house":3,"absoluteLongitude":235.4}
       ]$$,
       $$[
         {"houseNumber":1,"sign":"Virgo","degree":12.4,"ruler":"Mercury"},
         {"houseNumber":2,"sign":"Libra","degree":8.2,"ruler":"Venus"},
         {"houseNumber":3,"sign":"Scorpio","degree":6.8,"ruler":"Pluto"},
         {"houseNumber":4,"sign":"Sagittarius","degree":1.2,"ruler":"Jupiter"},
         {"houseNumber":5,"sign":"Capricorn","degree":3.5,"ruler":"Saturn"},
         {"houseNumber":6,"sign":"Aquarius","degree":8.1,"ruler":"Uranus"},
         {"houseNumber":7,"sign":"Pisces","degree":12.4,"ruler":"Neptune"},
         {"houseNumber":8,"sign":"Aries","degree":8.2,"ruler":"Mars"},
         {"houseNumber":9,"sign":"Taurus","degree":6.8,"ruler":"Venus"},
         {"houseNumber":10,"sign":"Gemini","degree":1.2,"ruler":"Mercury"},
         {"houseNumber":11,"sign":"Cancer","degree":3.5,"ruler":"Moon"},
         {"houseNumber":12,"sign":"Leo","degree":8.1,"ruler":"Sun"}
       ]$$,
       $$[
         {"planet1":"Sun","planet2":"Moon","type":"SQUARE","angle":90.0,"orb":3.2},
         {"planet1":"Mercury","planet2":"Saturn","type":"TRINE","angle":120.0,"orb":2.1},
         {"planet1":"Venus","planet2":"Mars","type":"SQUARE","angle":90.0,"orb":4.4},
         {"planet1":"Jupiter","planet2":"Pluto","type":"CONJUNCTION","angle":0.0,"orb":5.0}
       ]$$,
       'Apple Review demo haritasi: zihinsel merak, pratik analiz ve iliski dinamiklerini test etmek icin hazirlanmis aktif natal chart kaydi.',
       'COMPLETED',
       'tr',
       CURRENT_TIMESTAMP
FROM apple_review_seed_context c;

WITH inserted_person AS (
    INSERT INTO saved_persons (
        user_id,
        name,
        birth_date,
        birth_time,
        birth_location,
        latitude,
        longitude,
        timezone,
        gender,
        relationship_category,
        sun_sign,
        moon_sign,
        rising_sign,
        ascendant_degree,
        mc_degree,
        planet_positions_json,
        house_placements_json,
        aspects_json,
        created_at,
        updated_at
    )
    SELECT c.user_id,
           'Demo Partner',
           DATE '1992-11-03',
           TIME '21:15:00',
           'Izmir, Turkey',
           38.4237,
           27.1428,
           'Europe/Istanbul',
           'MAN',
           'LOVE',
           'Scorpio',
           'Cancer',
           'Gemini',
           19.8,
           84.4,
           $$[
             {"planet":"Sun","sign":"Scorpio","degree":11.2,"minutes":12,"seconds":0,"retrograde":false,"house":5,"absoluteLongitude":221.2},
             {"planet":"Moon","sign":"Cancer","degree":18.0,"minutes":0,"seconds":0,"retrograde":false,"house":2,"absoluteLongitude":108.0},
             {"planet":"Venus","sign":"Libra","degree":27.5,"minutes":30,"seconds":0,"retrograde":false,"house":4,"absoluteLongitude":207.5},
             {"planet":"Mars","sign":"Leo","degree":7.1,"minutes":6,"seconds":0,"retrograde":false,"house":3,"absoluteLongitude":127.1}
           ]$$,
           $$[
             {"houseNumber":1,"sign":"Gemini","degree":19.8,"ruler":"Mercury"},
             {"houseNumber":2,"sign":"Cancer","degree":14.1,"ruler":"Moon"},
             {"houseNumber":3,"sign":"Leo","degree":10.0,"ruler":"Sun"},
             {"houseNumber":4,"sign":"Virgo","degree":8.4,"ruler":"Mercury"},
             {"houseNumber":5,"sign":"Libra","degree":11.5,"ruler":"Venus"},
             {"houseNumber":6,"sign":"Scorpio","degree":17.2,"ruler":"Pluto"}
           ]$$,
           $$[
             {"planet1":"Sun","planet2":"Venus","type":"SEXTILE","angle":60.0,"orb":2.6},
             {"planet1":"Moon","planet2":"Mars","type":"TRINE","angle":120.0,"orb":3.3}
           ]$$,
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP
    FROM apple_review_seed_context c
    RETURNING id, user_id
)
INSERT INTO synastries (
    user_id,
    saved_person_id,
    person_a_id,
    person_b_id,
    person_a_type,
    person_b_type,
    relationship_type,
    harmony_score,
    base_harmony_score,
    cross_aspects_json,
    score_snapshot_json,
    scoring_version,
    harmony_insight,
    strengths_json,
    challenges_json,
    key_warning,
    cosmic_advice,
    status,
    correlation_id,
    calculated_at
)
SELECT p.user_id,
       p.id,
       p.user_id,
       p.id,
       'USER',
       'SAVED_PERSON',
       'LOVE',
       82,
       82,
       $$[
         {"userPlanet":"Sun","partnerPlanet":"Moon","type":"SEXTILE","orb":2.4,"score":14},
         {"userPlanet":"Venus","partnerPlanet":"Mars","type":"TRINE","orb":3.1,"score":18},
         {"userPlanet":"Mercury","partnerPlanet":"Venus","type":"TRINE","orb":1.8,"score":16}
       ]$$,
       $${"overallScore":82,"communication":86,"chemistry":79,"emotionalFlow":84,"dailyLifeHint":"Kisa ve net check-in ritmi uyumu guclendirir.","version":"apple-review-demo-v1"}$$,
       'apple-review-demo-v1',
       'Bu demo uyum kaydi Apple Review sirasinda iliski uyumu ekraninin sonuc, guclu yonler ve dikkat alanlarini gostermesi icin hazirlandi.',
       $$["Konusma ritmi akici","Duygusal destek hissi yuksek","Birlikte plan yapma motivasyonu guclu"]$$,
       $$["Fazla analiz bazen karar almayi yavaslatabilir","Kisisel alan ihtiyaci acik konusulmali"]$$,
       'Varsayim yapmak yerine beklentileri kisa ve net ifade etmek iliski kalitesini artirir.',
       'Bugun ortak hedefi tek cumleyle netlestirmek ve gun sonunda kisa bir duygu kontrolu yapmak uyumu destekler.',
       'COMPLETED',
       UUID '00000000-0000-0000-0000-000000000821',
       CURRENT_TIMESTAMP
FROM inserted_person p;

INSERT INTO daily_swot (
    user_id,
    sun_sign,
    swot_date,
    strengths,
    weaknesses,
    opportunities,
    threats,
    mystical_advice,
    created_at
)
SELECT c.user_id,
       'Gemini',
       CURRENT_DATE,
       'Bugun iletisim, hizli kavrayis ve esnek planlama one cikiyor.',
       'Ayni anda cok fazla konuya bolunmek zihinsel yorgunluk yaratabilir.',
       'Kisa notlar, net sorular ve sade bir plan gunun verimini artirir.',
       'Belirsiz mesajlari hemen yorumlamak yerine teyit etmek daha saglikli olur.',
       'Nefesini yavaslat, tek bir niyet sec ve gunun geri kalanini o niyetle sade tut.',
       CURRENT_TIMESTAMP
FROM apple_review_seed_context c;

INSERT INTO daily_actions (user_id, action_date, action_id, is_done, done_at, updated_at)
SELECT c.user_id, CURRENT_DATE, action_id, is_done, done_at, CURRENT_TIMESTAMP
FROM apple_review_seed_context c
CROSS JOIN (
    VALUES
        ('apple_review_grounding_breath', TRUE, CURRENT_TIMESTAMP),
        ('apple_review_write_three_priorities', FALSE, NULL::TIMESTAMP),
        ('apple_review_evening_reflection', FALSE, NULL::TIMESTAMP)
) AS actions(action_id, is_done, done_at);

INSERT INTO dream_entries (
    user_id,
    title,
    dream_text,
    dream_date,
    interpretation,
    warnings_json,
    opportunities_json,
    recurring_symbols_json,
    extracted_symbols_json,
    correlation_id,
    interpretation_status,
    created_at
)
SELECT c.user_id,
       'Kopru ve ay isiginda yolculuk',
       'Ay isiginda eski bir kopruden geciyor, suyun uzerinde parlayan anahtari takip ediyordum.',
       CURRENT_DATE - 1,
       'Kopru gecisi yeni bir farkindalik esigini, su ve ay sembolleri ise duygusal sezginin guclendigini anlatir. Anahtar sembolu, cevap aranan konunun aslinda kullanicinin kendi icinde netlesmeye basladigini gosterir.',
       $$["Karari aceleye getirmeden once duygusal tepkiyi ayristir.","Eski bir aliskanligi tekrar etmeye dikkat et."]$$,
       $$["Yarim kalan bir konusmayi tamamlamak icin uygun bir gun.","Sezgisel notlar yeni bir cozum yolu acabilir."]$$,
       $$["kopru","ay"]$$,
       $$["kopru","ay","su","anahtar"]$$,
       UUID '00000000-0000-0000-0000-000000000311',
       'COMPLETED',
       CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM apple_review_seed_context c;

INSERT INTO dream_symbols (user_id, symbol_name, count, last_seen_date)
SELECT c.user_id, symbol_name, symbol_count, CURRENT_DATE - 1
FROM apple_review_seed_context c
CROSS JOIN (
    VALUES
        ('kopru', 2),
        ('ay', 2),
        ('su', 1),
        ('anahtar', 1)
) AS symbols(symbol_name, symbol_count)
ON CONFLICT (user_id, symbol_name) DO UPDATE
   SET count = EXCLUDED.count,
       last_seen_date = EXCLUDED.last_seen_date;

INSERT INTO monthly_dream_stories (
    user_id,
    year_month,
    story,
    dream_count,
    dominant_symbols_json,
    status,
    correlation_id,
    created_at
)
SELECT c.user_id,
       to_char(CURRENT_DATE, 'YYYY-MM'),
       'Bu ayin ruyalari gecis, sezgi ve yeni anahtarlar temasinda toplaniyor.',
       1,
       $$["kopru","ay","anahtar"]$$,
       'COMPLETED',
       UUID '00000000-0000-0000-0000-000000000312',
       CURRENT_TIMESTAMP
FROM apple_review_seed_context c
ON CONFLICT (user_id, year_month) DO UPDATE
   SET story = EXCLUDED.story,
       dream_count = EXCLUDED.dream_count,
       dominant_symbols_json = EXCLUDED.dominant_symbols_json,
       status = EXCLUDED.status,
       correlation_id = EXCLUDED.correlation_id,
       created_at = EXCLUDED.created_at;

INSERT INTO star_mate_profiles (
    user_id,
    bio,
    photos_json,
    gender,
    interested_in,
    birth_date,
    location_label,
    latitude,
    longitude,
    min_compatibility_age,
    max_compatibility_age,
    is_active,
    created_at,
    updated_at
)
SELECT c.user_id,
       'Apple Review demo profili',
       '[]'::jsonb,
       'WOMAN',
       'EVERYONE',
       DATE '1994-06-15',
       'Istanbul, Turkey',
       41.0082,
       28.9784,
       18,
       99,
       TRUE,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM apple_review_seed_context c
ON CONFLICT (user_id) DO UPDATE
   SET bio = EXCLUDED.bio,
       photos_json = EXCLUDED.photos_json,
       gender = EXCLUDED.gender,
       interested_in = EXCLUDED.interested_in,
       birth_date = EXCLUDED.birth_date,
       location_label = EXCLUDED.location_label,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       is_active = TRUE,
       updated_at = CURRENT_TIMESTAMP;

INSERT INTO star_mate_preferences (
    user_id,
    max_distance_km,
    min_age,
    max_age,
    min_compatibility_score,
    show_me,
    strict_distance,
    strict_age,
    updated_at
)
SELECT c.user_id, 250, 18, 99, 50, 'EVERYONE', FALSE, TRUE, CURRENT_TIMESTAMP
FROM apple_review_seed_context c
ON CONFLICT (user_id) DO UPDATE
   SET max_distance_km = EXCLUDED.max_distance_km,
       min_age = EXCLUDED.min_age,
       max_age = EXCLUDED.max_age,
       min_compatibility_score = EXCLUDED.min_compatibility_score,
       show_me = EXCLUDED.show_me,
       strict_distance = EXCLUDED.strict_distance,
       strict_age = EXCLUDED.strict_age,
       updated_at = CURRENT_TIMESTAMP;

COMMIT;

\echo 'Granting review premium access and Guru wallet balance if monetization tables exist...'
\connect :notification_db
BEGIN;

DROP TABLE IF EXISTS apple_review_seed_context;
CREATE TEMP TABLE apple_review_seed_context (
    user_id BIGINT NOT NULL,
    entitlement_days INTEGER NOT NULL
) ON COMMIT DROP;
INSERT INTO apple_review_seed_context (user_id, entitlement_days)
VALUES (:review_user_id, :review_entitlement_days);

DO $$
DECLARE
    review_user_id BIGINT;
    entitlement_days INTEGER;
    entitlement_expires_at TIMESTAMP;
    affected_rows INTEGER;
BEGIN
    SELECT user_id, entitlement_days
      INTO review_user_id, entitlement_days
      FROM apple_review_seed_context
     LIMIT 1;

    entitlement_expires_at := CURRENT_TIMESTAMP + make_interval(days => entitlement_days);

    IF to_regclass('public.subscription_entitlement') IS NOT NULL THEN
        EXECUTE $sql$
            UPDATE subscription_entitlement
               SET provider = 'ADMIN_GRANT',
                   store = 'ADMIN',
                   product_id = 'apple_review_manual_grant',
                   revenue_cat_customer_id = 'apple_review_' || $1,
                   original_transaction_id = 'apple_review_manual_' || $1,
                   transaction_id = 'apple_review_manual_' || $1 || '_latest',
                   purchase_token = NULL,
                   status = 'ACTIVE',
                   trial_start_at = NULL,
                   trial_end_at = NULL,
                   current_period_start_at = CURRENT_TIMESTAMP,
                   current_period_end_at = $2,
                   auto_renew_enabled = FALSE,
                   cancelled_at = NULL,
                   expired_at = NULL,
                   last_event_at = CURRENT_TIMESTAMP,
                   raw_payload = '{"source":"apple_review_seed","provider":"manual_review"}',
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = (
                   SELECT id
                     FROM subscription_entitlement
                    WHERE user_id = $1
                      AND entitlement_key = 'Astro Guru Pro'
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                    LIMIT 1
             )
        $sql$ USING review_user_id, entitlement_expires_at;

        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        IF affected_rows = 0 THEN
            EXECUTE $sql$
                INSERT INTO subscription_entitlement (
                    user_id,
                    entitlement_key,
                    provider,
                    store,
                    product_id,
                    revenue_cat_customer_id,
                    original_transaction_id,
                    transaction_id,
                    purchase_token,
                    status,
                    trial_start_at,
                    trial_end_at,
                    current_period_start_at,
                    current_period_end_at,
                    auto_renew_enabled,
                    cancelled_at,
                    expired_at,
                    last_event_at,
                    raw_payload,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    $1,
                    'Astro Guru Pro',
                    'ADMIN_GRANT',
                    'ADMIN',
                    'apple_review_manual_grant',
                    'apple_review_' || $1,
                    'apple_review_manual_' || $1,
                    'apple_review_manual_' || $1 || '_latest',
                    NULL,
                    'ACTIVE',
                    NULL,
                    NULL,
                    CURRENT_TIMESTAMP,
                    $2,
                    FALSE,
                    NULL,
                    NULL,
                    CURRENT_TIMESTAMP,
                    '{"source":"apple_review_seed","provider":"manual_review"}',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                )
            $sql$ USING review_user_id, entitlement_expires_at;
        END IF;
    END IF;

    IF to_regclass('public.guru_wallet') IS NOT NULL THEN
        EXECUTE $sql$
            UPDATE guru_wallet
               SET current_balance = 250,
                   lifetime_earned = GREATEST(COALESCE(lifetime_earned, 0), 250),
                   lifetime_spent = COALESCE(lifetime_spent, 0),
                   lifetime_purchased = COALESCE(lifetime_purchased, 0),
                   last_earned_at = CURRENT_TIMESTAMP,
                   status = 'ACTIVE',
                   updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
        $sql$ USING review_user_id;

        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        IF affected_rows = 0 THEN
            EXECUTE $sql$
                INSERT INTO guru_wallet (
                    user_id,
                    current_balance,
                    lifetime_earned,
                    lifetime_spent,
                    lifetime_purchased,
                    last_earned_at,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES ($1, 250, 250, 0, 0, CURRENT_TIMESTAMP, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
            $sql$ USING review_user_id;
        END IF;
    END IF;

    IF to_regclass('public.guru_ledger') IS NOT NULL THEN
        EXECUTE $sql$
            DELETE FROM guru_ledger
             WHERE user_id = $1
               AND idempotency_key = 'apple_review:manual_guru_grant'
        $sql$ USING review_user_id;

        EXECUTE $sql$
            INSERT INTO guru_ledger (
                id,
                user_id,
                transaction_type,
                source_type,
                source_key,
                module_key,
                action_key,
                amount,
                balance_before,
                balance_after,
                platform,
                locale,
                metadata_json,
                idempotency_key,
                created_at
            )
            VALUES (
                ('00000000-0000-0000-0000-' || lpad(($1 % 1000000000000)::TEXT, 12, '0'))::UUID,
                $1,
                'ADMIN_GRANT',
                'ADMIN',
                'apple_review',
                NULL,
                NULL,
                250,
                0,
                250,
                'ios',
                'tr',
                '{"reason":"Apple App Review temporary access","source":"manual_review"}',
                'apple_review:manual_guru_grant',
                CURRENT_TIMESTAMP
            )
        $sql$ USING review_user_id;
    END IF;

    IF to_regclass('public.notification_preferences') IS NOT NULL THEN
        EXECUTE $sql$
            INSERT INTO notification_preferences (
                user_id,
                daily_enabled,
                intraday_enabled,
                weekly_enabled,
                planner_reminder_enabled,
                prayer_reminder_enabled,
                meditation_reminder_enabled,
                dream_reminder_enabled,
                evening_checkin_enabled,
                product_updates_enabled,
                frequency_level,
                preferred_time_slot,
                quiet_hours_start,
                quiet_hours_end,
                push_enabled,
                timezone,
                updated_at
            )
            VALUES (
                $1,
                TRUE,
                FALSE,
                TRUE,
                FALSE,
                FALSE,
                FALSE,
                FALSE,
                FALSE,
                TRUE,
                'BALANCED',
                'MORNING',
                TIME '22:30:00',
                TIME '08:00:00',
                TRUE,
                'Europe/Istanbul',
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id) DO UPDATE
               SET daily_enabled = EXCLUDED.daily_enabled,
                   weekly_enabled = EXCLUDED.weekly_enabled,
                   product_updates_enabled = EXCLUDED.product_updates_enabled,
                   frequency_level = EXCLUDED.frequency_level,
                   preferred_time_slot = EXCLUDED.preferred_time_slot,
                   timezone = EXCLUDED.timezone,
                   updated_at = CURRENT_TIMESTAMP
        $sql$ USING review_user_id;
    END IF;
END
$$;

COMMIT;
\echo 'Apple review account seed completed.'
