# Numerology Analytics Event Schema (MVP)

## Provider
- Mobile analytics abstraction: `mysticai-mobile/src/services/analytics.ts`
- Active provider: `Amplitude HTTP API` (when `EXPO_PUBLIC_ANALYTICS_PROVIDER=amplitude` and API key is set)
- Debug validation/logging: enabled in `__DEV__` or when `EXPO_PUBLIC_ANALYTICS_DEBUG=true`

## Global Event Rules
- Event names must be `snake_case`.
- Common numerology properties should be attached where applicable:
  - `source_surface`
  - `entry_point`
  - `has_birth_date`
  - `has_name`
  - `is_premium_user`
  - `locked_sections` (`none` when all sections are effectively unlocked)
  - `personal_year`
  - `dominant_number`
  - `response_version`
  - `guidance_period`
  - `cache_status`
  - `snapshot_exists`
  - `locale`
  - `checked_in_today`
  - `weekly_checkin_count`

## Core Numerology Events
- `numerology_screen_viewed`
- `numerology_loaded`
- `numerology_stale_cache_seen`
- `numerology_empty_state_viewed`
- `numerology_profile_cta_clicked`
- `numerology_section_expanded`
- `numerology_guidance_period_changed`
- `numerology_concept_opened`
- `numerology_checkin_card_viewed`
- `numerology_checkin_clicked`
- `numerology_checkin_completed`
- `numerology_weekly_return_clicked`
- `numerology_advanced_opened`
- `numerology_trust_opened`
- `numerology_push_entry_opened`
- `numerology_name_analysis_clicked`
- `numerology_share_clicked`
- `numerology_save_snapshot_clicked`
- `numerology_retry_clicked`
- `numerology_widget_viewed`
- `numerology_widget_clicked`

## Recommended Event-Specific Properties
- `numerology_loaded`
  - `load_time_ms`
  - `is_partial`
  - `generated_at`
- `numerology_empty_state_viewed`
  - `empty_variant`
  - `missing_fields`
- `numerology_stale_cache_seen`
  - `generated_at`
- `numerology_section_expanded`
  - `section_id`
  - `is_locked`
- `numerology_guidance_period_changed`
  - `next_guidance_period` (`day`, `week`)
- `numerology_concept_opened`
  - `concept_key` (`personalYear`, `universalYear`, `cycleProgress`)
- `numerology_checkin_card_viewed`
  - `checked_in_today`
  - `weekly_checkin_count`
- `numerology_checkin_clicked`
  - `checked_in_today`
- `numerology_checkin_completed`
  - `checked_in_today`
  - `weekly_checkin_count`
- `numerology_advanced_opened`
  - common numerology properties only
- `numerology_trust_opened`
  - common numerology properties only
- `numerology_share_clicked`
  - `share_format` (`story_vertical`, `standard_square`)
  - `share_channel` (`system`, `instagram_story`, `gallery`)
  - `payload_version`
- `numerology_save_snapshot_clicked`
  - `snapshot_scope`
  - `snapshot_year`
- `numerology_retry_clicked`
  - `error_type`

## Home Widget Tracking
- Widget impression: `numerology_widget_viewed`
- Widget click: `numerology_widget_clicked`
- Both should include:
  - `source_surface=home_widget`
  - `entry_point=home_widget`
  - `widget_state` (`ready`, `name_missing`, `birth_date_missing`, `both_missing`)

## Premium-Ready Note
- Schema keeps premium-related properties (`is_premium_user`, `locked_sections`) for future activation.
- Current runtime behavior keeps all numerology sections effectively unlocked.

## Dashboard Template
- Amplitude dashboard kurulumu için: `docs/analytics/numerology-amplitude-dashboard-template.md`
