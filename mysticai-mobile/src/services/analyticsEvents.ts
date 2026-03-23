/**
 * Centralized analytics event taxonomy for Astro Guru.
 *
 * All event names are snake_case and feature-prefixed.
 * GA4 recommended event names are used where applicable.
 *
 * Usage:
 *   import { AnalyticsEvent } from '../services/analyticsEvents';
 *   trackEvent(AnalyticsEvent.AUTH.SIGN_UP_COMPLETED, { method: 'email' });
 */

// ── Auth & Onboarding ───────────────────────────────────────────────

export const AuthEvents = {
  SIGN_UP_STARTED: 'sign_up_started',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  LOGIN_COMPLETED: 'login_completed',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  BIRTH_CHART_PROFILE_COMPLETED: 'birth_chart_profile_completed',
} as const;

// ── Content & Feature Discovery ─────────────────────────────────────

export const ContentEvents = {
  HOME_CARD_CLICKED: 'home_card_clicked',
  FEATURE_OPENED: 'feature_opened',
  SEARCH_PERFORMED: 'search_performed',
  CONTENT_SHARED: 'content_shared',
  NOTIFICATION_OPENED: 'notification_opened',
} as const;

// ── Astrology Core ──────────────────────────────────────────────────

export const AstrologyEvents = {
  BIRTH_CHART_VIEWED: 'birth_chart_viewed',
  DAILY_TRANSIT_VIEWED: 'daily_transit_viewed',
  TRANSIT_DETAIL_OPENED: 'transit_detail_opened',
  PLANNER_DAY_OPENED: 'planner_day_opened',
  PLANNER_REMINDER_CREATED: 'planner_reminder_created',
  DECISION_COMPASS_STARTED: 'decision_compass_started',
  DECISION_COMPASS_RESULT_VIEWED: 'decision_compass_result_viewed',
} as const;

// ── Numerology ──────────────────────────────────────────────────────

export const NumerologyEvents = {
  HOME_VIEWED: 'numerology_home_viewed',
  REPORT_VIEWED: 'numerology_report_viewed',
  DETAIL_EXPANDED: 'numerology_detail_expanded',
  NAME_ANALYSIS_STARTED: 'name_analysis_started',
  NAME_ANALYSIS_COMPLETED: 'name_analysis_completed',
} as const;

// ── Compatibility ───────────────────────────────────────────────────

export const CompatibilityEvents = {
  STARTED: 'compatibility_started',
  RESULT_VIEWED: 'compatibility_result_viewed',
  SHARE_CLICKED: 'compatibility_share_clicked',
} as const;

// ── Dreams ──────────────────────────────────────────────────────────

export const DreamEvents = {
  INTERPRETATION_STARTED: 'dream_interpretation_started',
  INTERPRETATION_COMPLETED: 'dream_interpretation_completed',
  HISTORY_OPENED: 'dream_history_opened',
} as const;

// ── Premium / Monetization ──────────────────────────────────────────

export const PremiumEvents = {
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_CTA_CLICKED: 'paywall_cta_clicked',
  SUBSCRIPTION_CHECKOUT_STARTED: 'subscription_checkout_started',
  SUBSCRIPTION_PURCHASE_COMPLETED: 'subscription_purchase_completed',
  SUBSCRIPTION_RESTORE_CLICKED: 'subscription_restore_clicked',
  PREMIUM_FEATURE_BLOCKED: 'premium_feature_blocked',
  PREMIUM_FEATURE_UNLOCKED: 'premium_feature_unlocked',
} as const;

// ── Ads ─────────────────────────────────────────────────────────────

export const AdEvents = {
  REWARDED_AD_OFFER_SHOWN: 'rewarded_ad_offer_shown',
  REWARDED_AD_STARTED: 'rewarded_ad_started',
  REWARDED_AD_COMPLETED: 'rewarded_ad_completed',
  REWARDED_AD_REWARD_GRANTED: 'rewarded_ad_reward_granted',
  REWARDED_AD_FAILED: 'rewarded_ad_failed',
  AD_TO_FEATURE_UNLOCK_COMPLETED: 'ad_to_feature_unlock_completed',
} as const;

// ── Engagement ──────────────────────────────────────────────────────

export const EngagementEvents = {
  TUTORIAL_STARTED: 'tutorial_started',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  PUSH_PERMISSION_PROMPT_SHOWN: 'push_permission_prompt_shown',
  PUSH_PERMISSION_GRANTED: 'push_permission_granted',
  PUSH_PERMISSION_DENIED: 'push_permission_denied',
} as const;

// ── Aggregate namespace ─────────────────────────────────────────────

export const AnalyticsEvent = {
  AUTH: AuthEvents,
  CONTENT: ContentEvents,
  ASTROLOGY: AstrologyEvents,
  NUMEROLOGY: NumerologyEvents,
  COMPATIBILITY: CompatibilityEvents,
  DREAMS: DreamEvents,
  PREMIUM: PremiumEvents,
  ADS: AdEvents,
  ENGAGEMENT: EngagementEvents,
} as const;

// ── Common parameter keys (documentation / auto-complete aid) ───────

export const AnalyticsParam = {
  SCREEN_NAME: 'screen_name',
  FEATURE_NAME: 'feature_name',
  MODULE_NAME: 'module_name',
  CONTENT_ID: 'content_id',
  CONTENT_TYPE: 'content_type',
  SOURCE: 'source',
  CTA_NAME: 'cta_name',
  PLACEMENT: 'placement',
  PLAN_TYPE: 'plan_type',
  CURRENCY: 'currency',
  VALUE: 'value',
  METHOD: 'method',
  RESULT_STATUS: 'result_status',
  ERROR_CODE: 'error_code',
  AD_TYPE: 'ad_type',
  REWARD_TYPE: 'reward_type',
  REWARD_VALUE: 'reward_value',
  ENTRY_POINT: 'entry_point',
  LOCALE: 'locale',
} as const;
