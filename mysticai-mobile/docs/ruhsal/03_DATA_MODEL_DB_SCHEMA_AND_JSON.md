# Ruhsal Pratikler Modulu - Veri Modeli, DB Semasi ve Ornek JSON

Bu belge `Spring Boot + PostgreSQL + Redis` backend icin veri modelini tanimlar. Tablo isimleri kullanici istegindeki kapsama gore hazirlanmistir.

## Notlar

- `users` genellikle `auth-service` tarafinda bulunur; burada referans olarak dusunulur.
- `*_daily` ve `prayer_sets` snapshot tablolari deterministik secimlerin denetlenebilir olmasini saglar.
- Dini metin ornekleri placeholder'dir.

## A) Veri Modeli ve Veritabani Semasi

### 1. `users` (referans tablo / auth kaynagi)

Alanlar:
- `id BIGINT PK`
- `email VARCHAR(255) UNIQUE`
- `status VARCHAR(32)`
- `locale VARCHAR(8)`
- `timezone VARCHAR(64)`
- `created_at TIMESTAMP`

Indexler:
- `uq_users_email`
- `idx_users_status`

### 2. `prayers`

Amaç: Dua icerik katalogu

Alanlar:
- `id BIGSERIAL PK`
- `slug VARCHAR(120) UNIQUE NOT NULL`
- `title VARCHAR(200) NOT NULL`
- `category VARCHAR(64) NOT NULL`
- `source_label VARCHAR(32) NOT NULL` (`KURAN`, `HADIS`, `GELENEKSEL`)
- `source_note TEXT`
- `arabic_text TEXT NULL`
- `transliteration_tr TEXT NOT NULL`
- `meaning_tr TEXT NOT NULL`
- `translations_jsonb JSONB NULL` (future EN/AR)
- `recommended_repeat_count INTEGER NOT NULL DEFAULT 1`
- `estimated_read_seconds INTEGER NOT NULL`
- `is_favoritable BOOLEAN NOT NULL DEFAULT TRUE`
- `disclaimer_text TEXT`
- `difficulty_level SMALLINT DEFAULT 1`
- `theme_tags TEXT[]`
- `active BOOLEAN NOT NULL DEFAULT TRUE`
- `content_version INTEGER NOT NULL DEFAULT 1`
- `created_at TIMESTAMP`
- `updated_at TIMESTAMP`

Indexler:
- `idx_prayers_category_active(category, active)`
- `idx_prayers_active(active)`
- `idx_prayers_theme_tags_gin` (`GIN(theme_tags)`, opsiyonel)
- `idx_prayers_title_search` (`pg_trgm`, opsiyonel)

### 3. `prayer_sets`

Amaç: Gunun dua seti snapshot'i

Alanlar:
- `id BIGSERIAL PK`
- `set_date DATE NOT NULL`
- `locale VARCHAR(8) NOT NULL DEFAULT 'tr'`
- `selection_scope VARCHAR(16) NOT NULL` (`GLOBAL`, `PER_USER`)
- `user_id BIGINT NULL`
- `algo_version VARCHAR(32) NOT NULL`
- `seed_hash VARCHAR(64) NOT NULL`
- `set_size SMALLINT NOT NULL`
- `ab_variant VARCHAR(16) NULL` (`3_DUA`, `5_DUA`)
- `generated_by VARCHAR(16) NOT NULL DEFAULT 'SYSTEM'`
- `generated_at TIMESTAMP NOT NULL`
- `expires_at TIMESTAMP NULL`

Indexler/constraint:
- `uq_prayer_sets_scope_date_user` (global/per_user kombinasyonu)
- `idx_prayer_sets_user_date(user_id, set_date DESC)`
- `idx_prayer_sets_date(set_date DESC)`

### 4. `prayer_set_items`

Amaç: Gunluk dua seti siralamasi ve item metadata

Alanlar:
- `id BIGSERIAL PK`
- `prayer_set_id BIGINT NOT NULL FK -> prayer_sets.id`
- `prayer_id BIGINT NOT NULL FK -> prayers.id`
- `display_order SMALLINT NOT NULL`
- `target_repeat_count INTEGER NULL` (set override)
- `is_mandatory BOOLEAN DEFAULT FALSE`
- `reason_code VARCHAR(64) NULL`

Indexler/constraint:
- `uq_prayer_set_item_order(prayer_set_id, display_order)`
- `uq_prayer_set_item_prayer(prayer_set_id, prayer_id)`
- `idx_prayer_set_items_prayer(prayer_id)`

### 5. `dhikr_entries`

Amaç: Dua ve Esma/zikir loglari (tek tabloda)

Alanlar:
- `id BIGSERIAL PK`
- `user_id BIGINT NOT NULL`
- `entry_date DATE NOT NULL`
- `entry_type VARCHAR(16) NOT NULL` (`PRAYER`, `ASMA`)
- `prayer_id BIGINT NULL FK -> prayers.id`
- `asma_id BIGINT NULL FK -> asmaul_husna.id`
- `total_repeat_count INTEGER NOT NULL`
- `session_count INTEGER NOT NULL DEFAULT 1`
- `mood VARCHAR(32) NULL`
- `note TEXT NULL`
- `source VARCHAR(16) NOT NULL DEFAULT 'MANUAL'`
- `client_session_id UUID NULL`
- `created_at TIMESTAMP`
- `updated_at TIMESTAMP`

Check constraint (onerilen):
- `entry_type='PRAYER'` ise `prayer_id` dolu, `asma_id` null
- `entry_type='ASMA'` ise `asma_id` dolu, `prayer_id` null

Indexler:
- `idx_dhikr_entries_user_date(user_id, entry_date DESC)`
- `idx_dhikr_entries_user_type_date(user_id, entry_type, entry_date DESC)`
- `idx_dhikr_entries_prayer(prayer_id)`
- `idx_dhikr_entries_asma(asma_id)`

### 6. `asmaul_husna`

Amaç: Esma katalogu

Alanlar:
- `id BIGSERIAL PK`
- `order_no SMALLINT UNIQUE NOT NULL`
- `arabic_name VARCHAR(128) NOT NULL`
- `transliteration_tr VARCHAR(128) NOT NULL`
- `meaning_tr VARCHAR(256) NOT NULL`
- `reflection_text_tr TEXT NOT NULL`
- `theme VARCHAR(64) NULL` (`RAHMET`, `RIZIK`, `KORUMA`, ...)
- `source_note TEXT`
- `recommended_dhikr_count INTEGER NULL`
- `translations_jsonb JSONB NULL`
- `active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMP`
- `updated_at TIMESTAMP`

Indexler:
- `idx_asma_theme(theme)`
- `idx_asma_active(active)`
- `idx_asma_search` (`pg_trgm`, opsiyonel)

### 7. `asma_daily`

Amaç: Gunun esmasi snapshot'i

Alanlar:
- `id BIGSERIAL PK`
- `daily_date DATE NOT NULL`
- `locale VARCHAR(8) NOT NULL DEFAULT 'tr'`
- `selection_scope VARCHAR(16) NOT NULL`
- `user_id BIGINT NULL`
- `asma_id BIGINT NOT NULL FK -> asmaul_husna.id`
- `algo_version VARCHAR(32) NOT NULL`
- `seed_hash VARCHAR(64) NOT NULL`
- `generated_at TIMESTAMP NOT NULL`

Indexler/constraint:
- `uq_asma_daily_scope_date_user`
- `idx_asma_daily_user_date(user_id, daily_date DESC)`

### 8. `meditation_exercises`

Amaç: Nefes/farkindalik egzersizi katalogu

Alanlar:
- `id BIGSERIAL PK`
- `slug VARCHAR(120) UNIQUE`
- `title VARCHAR(160) NOT NULL`
- `type VARCHAR(24) NOT NULL` (`BREATHING`, `MEDITATION`, `BODY_SCAN`)
- `focus_theme VARCHAR(64) NOT NULL` (`SUKUR`, `NIYET`, `SAKINLESME`, `ODAK`)
- `duration_sec INTEGER NOT NULL`
- `steps_json JSONB NOT NULL`
- `breathing_pattern_json JSONB NULL`
- `animation_mode VARCHAR(32) NULL`
- `background_audio_url VARCHAR(500) NULL`
- `background_audio_enabled_by_default BOOLEAN NOT NULL DEFAULT FALSE`
- `disclaimer_text TEXT`
- `difficulty_level SMALLINT DEFAULT 1`
- `translations_jsonb JSONB NULL`
- `active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMP`
- `updated_at TIMESTAMP`

Indexler:
- `idx_meditation_exercises_type_active(type, active)`
- `idx_meditation_exercises_focus(focus_theme)`

### 9. `meditation_daily`

Amaç: Gunun egzersizi snapshot'i

Alanlar:
- `id BIGSERIAL PK`
- `daily_date DATE NOT NULL`
- `locale VARCHAR(8) NOT NULL DEFAULT 'tr'`
- `selection_scope VARCHAR(16) NOT NULL`
- `user_id BIGINT NULL`
- `exercise_id BIGINT NOT NULL FK -> meditation_exercises.id`
- `algo_version VARCHAR(32) NOT NULL`
- `seed_hash VARCHAR(64) NOT NULL`
- `generated_at TIMESTAMP NOT NULL`

Indexler/constraint:
- `uq_meditation_daily_scope_date_user`
- `idx_meditation_daily_user_date(user_id, daily_date DESC)`

### 10. `meditation_sessions`

Amaç: Nefes/farkindalik seans loglari

Alanlar:
- `id BIGSERIAL PK`
- `user_id BIGINT NOT NULL`
- `session_date DATE NOT NULL`
- `started_at TIMESTAMP NOT NULL`
- `ended_at TIMESTAMP NULL`
- `exercise_id BIGINT NOT NULL FK -> meditation_exercises.id`
- `target_duration_sec INTEGER NOT NULL`
- `actual_duration_sec INTEGER NOT NULL`
- `completed_cycles INTEGER NULL`
- `mood_before VARCHAR(32) NULL`
- `mood_after VARCHAR(32) NULL`
- `note TEXT NULL`
- `status VARCHAR(16) NOT NULL` (`COMPLETED`, `ABORTED`, `PAUSED_END`)
- `client_session_id UUID NULL`
- `created_at TIMESTAMP`

Indexler:
- `idx_meditation_sessions_user_date(user_id, session_date DESC)`
- `idx_meditation_sessions_exercise(exercise_id)`
- `idx_meditation_sessions_user_started(user_id, started_at DESC)`

### 11. `user_preferences`

Amaç: Kullanici ayarlari ve reminder tercihleri

Alanlar:
- `id BIGSERIAL PK`
- `user_id BIGINT NOT NULL UNIQUE`
- `content_language VARCHAR(8) NOT NULL DEFAULT 'tr'`
- `font_scale NUMERIC(3,2) NOT NULL DEFAULT 1.00`
- `reading_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE`
- `keep_screen_awake BOOLEAN NOT NULL DEFAULT FALSE`
- `tts_enabled BOOLEAN NOT NULL DEFAULT FALSE`
- `tts_default_lang VARCHAR(8) NULL`
- `tts_voice_id VARCHAR(120) NULL`
- `prayer_counter_haptic BOOLEAN NOT NULL DEFAULT TRUE`
- `reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE`
- `reminder_schedule_json JSONB NULL`
- `short_prayers_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `privacy_export_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `ab_overrides_json JSONB NULL`
- `created_at TIMESTAMP`
- `updated_at TIMESTAMP`

Indexler:
- `uq_user_preferences_user_id`
- `idx_user_preferences_reminder_enabled(reminder_enabled)`

## Onerilen Ek Tablolar (guclu tavsiye)

- `user_prayer_favorites (user_id, prayer_id, created_at)`
- `content_reports (id, user_id, content_type, content_id, reason, note, status, created_at)`
- `experiment_assignments (user_id, experiment_key, variant, assigned_at)`
- `content_publish_versions (content_type, version, checksum, published_at)`

## Iliskiler (Ozet)

- `prayer_sets` 1-N `prayer_set_items`
- `prayers` 1-N `prayer_set_items`
- `prayers` 1-N `dhikr_entries` (`entry_type=PRAYER`)
- `asmaul_husna` 1-N `dhikr_entries` (`entry_type=ASMA`)
- `asmaul_husna` 1-N `asma_daily`
- `meditation_exercises` 1-N `meditation_daily`
- `meditation_exercises` 1-N `meditation_sessions`
- `users` 1-1 `user_preferences` (mantiksal)

## E) Icerik Ornekleri (SADECE TEMPLATE / PLACEHOLDER)

### Prayer (ornek)

```json
{
  "id": 101,
  "slug": "sabah-huzur-kisa-01",
  "title": "Sabah Huzur Duasi (Kisa)",
  "category": "SABAH_AKSAM",
  "sourceLabel": "GELENEKSEL",
  "sourceNote": "Kaynak notu: Editoryal dogrulama bekliyor.",
  "arabicText": "<ARAPCA_METIN_PLACEHOLDER>",
  "transliterationTr": "<TURKCE_OKUNUS_PLACEHOLDER>",
  "meaningTr": "<TURKCE_MEAL_PLACEHOLDER>",
  "recommendedRepeatCount": 33,
  "estimatedReadSeconds": 25,
  "isFavoritable": true,
  "disclaimerText": "Bu icerik bilgilendirme amaclidir.",
  "difficultyLevel": 1,
  "themeTags": ["huzur", "sabah"]
}
```

### Asma (ornek)

```json
{
  "id": 12,
  "orderNo": 12,
  "arabicName": "<ARAPCA_ESMA_PLACEHOLDER>",
  "transliterationTr": "<ESMA_OKUNUS_PLACEHOLDER>",
  "meaningTr": "<KISA_ANLAM_PLACEHOLDER>",
  "reflectionTextTr": "<TEFEKKUR_NIYET_CUMLESI_PLACEHOLDER>",
  "theme": "RAHMET",
  "recommendedDhikrCount": 33,
  "sourceNote": "Kaynak notu: Yazim varyantlari olabilir."
}
```

### Meditation Exercise (ornek)

```json
{
  "id": 7,
  "slug": "box-breathing-4-4-4-4-2min",
  "title": "Kutusal Nefes 4-4-4-4",
  "type": "BREATHING",
  "focusTheme": "SAKINLESME",
  "durationSec": 120,
  "steps": [
    {"order": 1, "text": "Dik otur, omuzlarini gevset."},
    {"order": 2, "text": "4 sn nefes al."},
    {"order": 3, "text": "4 sn tut."},
    {"order": 4, "text": "4 sn ver."},
    {"order": 5, "text": "4 sn bekle."}
  ],
  "breathingPattern": {"inhale": 4, "hold1": 4, "exhale": 4, "hold2": 4},
  "animationMode": "BOX",
  "backgroundAudioEnabledByDefault": false,
  "disclaimerText": "Bu egzersiz nefes ve farkindalik amaclidir; tibbi tavsiye degildir."
}
```

### Daily Prayers Response (ornek)

```json
{
  "date": "2026-02-25",
  "scope": "GLOBAL",
  "setId": 845,
  "variant": "5_DUA",
  "items": [
    {
      "order": 1,
      "prayerId": 101,
      "title": "Sabah Huzur Duasi (Kisa)",
      "category": "SABAH_AKSAM",
      "recommendedRepeatCount": 33,
      "estimatedReadSeconds": 25,
      "userProgressCount": 0,
      "isCompletedToday": false
    }
  ]
}
```

