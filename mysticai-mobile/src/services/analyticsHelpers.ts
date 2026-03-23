/**
 * Typed convenience helpers for common analytics events.
 *
 * All helpers delegate to `trackEvent` — never call Firebase/Amplitude directly.
 * Import these in screens/features for a safer, auto-completable API.
 *
 * Usage:
 *   import { trackFeatureOpened, trackPaywallViewed } from '../services/analyticsHelpers';
 *   trackFeatureOpened('numerology', 'home_shortcut');
 */

import {
  trackEvent,
  logLogin,
  logSignUp,
  logSearch,
  logShare,
  logTutorialBegin,
  logTutorialComplete,
  logBeginCheckout,
  logPurchase,
  type AnalyticsParams,
} from './analytics';
import {
  AuthEvents,
  ContentEvents,
  AstrologyEvents,
  NumerologyEvents,
  CompatibilityEvents,
  DreamEvents,
  PremiumEvents,
  AdEvents,
  EngagementEvents,
} from './analyticsEvents';

// ── Auth & Onboarding ───────────────────────────────────────────────

export function trackSignUpStarted(method: 'email' | 'google' | 'apple' | 'facebook'): void {
  trackEvent(AuthEvents.SIGN_UP_STARTED, { method });
}

export function trackSignUpCompleted(method: 'email' | 'google' | 'apple' | 'facebook'): void {
  trackEvent(AuthEvents.SIGN_UP_COMPLETED, { method });
  logSignUp(method); // GA4 recommended event
}

export function trackLoginCompleted(method: 'email' | 'google' | 'apple' | 'facebook' | 'guest'): void {
  trackEvent(AuthEvents.LOGIN_COMPLETED, { method });
  logLogin(method); // GA4 recommended event
}

export function trackOnboardingStarted(): void {
  trackEvent(AuthEvents.ONBOARDING_STARTED);
  logTutorialBegin(); // GA4 recommended: maps onboarding → tutorial_begin
}

export function trackOnboardingCompleted(): void {
  trackEvent(AuthEvents.ONBOARDING_COMPLETED);
  logTutorialComplete(); // GA4 recommended: maps onboarding → tutorial_complete
}

export function trackBirthChartProfileCompleted(): void {
  trackEvent(AuthEvents.BIRTH_CHART_PROFILE_COMPLETED);
}

// ── Content & Feature Discovery ─────────────────────────────────────

export function trackHomeCardClicked(cardId: string, placement?: string): void {
  trackEvent(ContentEvents.HOME_CARD_CLICKED, { content_id: cardId, placement });
}

export function trackFeatureOpened(featureName: string, source?: string): void {
  trackEvent(ContentEvents.FEATURE_OPENED, { feature_name: featureName, source });
}

export function trackSearchPerformed(query: string, resultCount?: number): void {
  trackEvent(ContentEvents.SEARCH_PERFORMED, {
    search_term: query.slice(0, 100),
    result_count: resultCount,
  });
  logSearch(query); // GA4 recommended event
}

export function trackContentShared(contentType: string, contentId?: string, method?: string): void {
  trackEvent(ContentEvents.CONTENT_SHARED, { content_type: contentType, content_id: contentId, method });
  logShare(contentType, contentId, method); // GA4 recommended event
}

// ── Astrology Core ──────────────────────────────────────────────────

export function trackBirthChartViewed(source?: string): void {
  trackEvent(AstrologyEvents.BIRTH_CHART_VIEWED, { source });
}

export function trackDailyTransitViewed(params?: AnalyticsParams): void {
  trackEvent(AstrologyEvents.DAILY_TRANSIT_VIEWED, params);
}

export function trackTransitDetailOpened(transitId?: string): void {
  trackEvent(AstrologyEvents.TRANSIT_DETAIL_OPENED, { content_id: transitId });
}

export function trackPlannerDayOpened(date?: string): void {
  trackEvent(AstrologyEvents.PLANNER_DAY_OPENED, { date });
}

export function trackPlannerReminderCreated(): void {
  trackEvent(AstrologyEvents.PLANNER_REMINDER_CREATED);
}

export function trackDecisionCompassStarted(source?: string): void {
  trackEvent(AstrologyEvents.DECISION_COMPASS_STARTED, { source });
}

export function trackDecisionCompassResultViewed(): void {
  trackEvent(AstrologyEvents.DECISION_COMPASS_RESULT_VIEWED);
}

// ── Numerology ──────────────────────────────────────────────────────

export function trackNumerologyHomeViewed(entryPoint?: string): void {
  trackEvent(NumerologyEvents.HOME_VIEWED, { entry_point: entryPoint });
}

export function trackNumerologyReportViewed(params?: AnalyticsParams): void {
  trackEvent(NumerologyEvents.REPORT_VIEWED, params);
}

export function trackNumerologyDetailExpanded(sectionId: string): void {
  trackEvent(NumerologyEvents.DETAIL_EXPANDED, { content_id: sectionId });
}

export function trackNameAnalysisStarted(source?: string): void {
  trackEvent(NumerologyEvents.NAME_ANALYSIS_STARTED, { source });
}

export function trackNameAnalysisCompleted(): void {
  trackEvent(NumerologyEvents.NAME_ANALYSIS_COMPLETED);
}

// ── Compatibility ───────────────────────────────────────────────────

export function trackCompatibilityStarted(source?: string): void {
  trackEvent(CompatibilityEvents.STARTED, { source });
}

export function trackCompatibilityResultViewed(): void {
  trackEvent(CompatibilityEvents.RESULT_VIEWED);
}

export function trackCompatibilityShareClicked(method?: string): void {
  trackEvent(CompatibilityEvents.SHARE_CLICKED, { method });
}

// ── Dreams ──────────────────────────────────────────────────────────

export function trackDreamInterpretationStarted(method?: 'text' | 'voice'): void {
  trackEvent(DreamEvents.INTERPRETATION_STARTED, { method });
}

export function trackDreamInterpretationCompleted(): void {
  trackEvent(DreamEvents.INTERPRETATION_COMPLETED);
}

export function trackDreamHistoryOpened(): void {
  trackEvent(DreamEvents.HISTORY_OPENED);
}

// ── Premium / Monetization ──────────────────────────────────────────

export function trackPaywallViewed(source: string, featureName?: string): void {
  trackEvent(PremiumEvents.PAYWALL_VIEWED, { source, feature_name: featureName });
}

export function trackPaywallCtaClicked(ctaName: string, planType?: string): void {
  trackEvent(PremiumEvents.PAYWALL_CTA_CLICKED, { cta_name: ctaName, plan_type: planType });
}

export function trackSubscriptionCheckoutStarted(planType: string): void {
  trackEvent(PremiumEvents.SUBSCRIPTION_CHECKOUT_STARTED, { plan_type: planType });
  logBeginCheckout(); // GA4 recommended event
}

export function trackSubscriptionPurchaseCompleted(
  planType: string,
  currency?: string,
  value?: number,
): void {
  trackEvent(PremiumEvents.SUBSCRIPTION_PURCHASE_COMPLETED, {
    plan_type: planType,
    currency,
    value,
  });
  logPurchase(value, currency); // GA4 recommended event
}

export function trackSubscriptionRestoreClicked(): void {
  trackEvent(PremiumEvents.SUBSCRIPTION_RESTORE_CLICKED);
}

export function trackPremiumFeatureBlocked(featureName: string, source?: string): void {
  trackEvent(PremiumEvents.PREMIUM_FEATURE_BLOCKED, { feature_name: featureName, source });
}

export function trackPremiumFeatureUnlocked(featureName: string, method?: string): void {
  trackEvent(PremiumEvents.PREMIUM_FEATURE_UNLOCKED, { feature_name: featureName, method });
}

// ── Ads ─────────────────────────────────────────────────────────────

export function trackRewardedAdOfferShown(moduleName: string, placement?: string): void {
  trackEvent(AdEvents.REWARDED_AD_OFFER_SHOWN, { module_name: moduleName, placement });
}

export function trackRewardedAdStarted(moduleName: string): void {
  trackEvent(AdEvents.REWARDED_AD_STARTED, { module_name: moduleName });
}

export function trackRewardedAdCompleted(moduleName: string, rewardValue?: number): void {
  trackEvent(AdEvents.REWARDED_AD_COMPLETED, { module_name: moduleName, reward_value: rewardValue });
}

export function trackRewardedAdRewardGranted(
  moduleName: string,
  rewardType: string,
  rewardValue?: number,
): void {
  trackEvent(AdEvents.REWARDED_AD_REWARD_GRANTED, {
    module_name: moduleName,
    reward_type: rewardType,
    reward_value: rewardValue,
  });
}

export function trackRewardedAdFailed(moduleName: string, errorCode?: string): void {
  trackEvent(AdEvents.REWARDED_AD_FAILED, { module_name: moduleName, error_code: errorCode });
}

export function trackAdToFeatureUnlockCompleted(
  moduleName: string,
  featureName: string,
): void {
  trackEvent(AdEvents.AD_TO_FEATURE_UNLOCK_COMPLETED, {
    module_name: moduleName,
    feature_name: featureName,
  });
}

// ── Engagement ──────────────────────────────────────────────────────

export function trackPushPermissionPromptShown(): void {
  trackEvent(EngagementEvents.PUSH_PERMISSION_PROMPT_SHOWN);
}

export function trackPushPermissionGranted(): void {
  trackEvent(EngagementEvents.PUSH_PERMISSION_GRANTED);
}

export function trackPushPermissionDenied(): void {
  trackEvent(EngagementEvents.PUSH_PERMISSION_DENIED);
}
